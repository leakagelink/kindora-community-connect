import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "openai/gpt-6-astra";

export type AiTool = "logo_maker" | "resume_builder" | "website_starter";

type AiInput = { tool: AiTool; input: Record<string, string> };

const FLAG_BY_TOOL: Record<AiTool, string> = {
  logo_maker: "ai_logo_maker",
  resume_builder: "ai_resume_builder",
  website_starter: "ai_website_starter",
};

const BANNED = /\b(weapon|gun|ammo|explosive|cocaine|heroin|meth|prescription drug|child porn|nude|escort)\b/i;

function promptFor(tool: AiTool, input: Record<string, string>) {
  const clean = (value: string | undefined) => (value ?? "").slice(0, 600);
  if (tool === "logo_maker") {
    return {
      system:
        "You are a logo designer. Return ONLY valid JSON: {\"concepts\":[{\"name\":string,\"idea\":string,\"svg\":string}]} with exactly 3 concepts. Each svg must be a complete, self-contained <svg viewBox=\"0 0 240 240\"> using simple geometric shapes and at most one text element. No external fonts, images or scripts.",
      user: `Brand name: ${clean(input['name'])}\nIndustry: ${clean(input['industry'])}\nStyle: ${clean(input['style'])}\nPrimary colour: ${clean(input['color'])}`,
    };
  }
  if (tool === "resume_builder") {
    return {
      system:
        "You are a resume writer. Return ONLY valid JSON: {\"summary\":string,\"sections\":[{\"heading\":string,\"items\":[string]}]}. Use concise, factual, achievement-oriented wording. Never invent employers, dates, degrees or certifications that were not provided.",
      user: `Full name: ${clean(input['fullName'])}\nHeadline: ${clean(input['headline'])}\nContact (non-sensitive): ${clean(input['contact'])}\nEducation: ${clean(input['education'])}\nExperience: ${clean(input['experience'])}\nSkills: ${clean(input['skills'])}\nProjects: ${clean(input['projects'])}\nTemplate tone: ${clean(input['template'])}`,
    };
  }
  return {
    system:
      "You build simple landing pages. Return ONLY valid JSON: {\"html\":string,\"notes\":string}. html must be a complete, single-file, responsive, accessible HTML document with inline <style> only. No external requests, no scripts, no tracking, no invented statistics, testimonials or certifications.",
    user: `Site name: ${clean(input['name'])}\nIndustry: ${clean(input['industry'])}\nDescription: ${clean(input['description'])}\nSections: ${clean(input['sections'])}\nStyle: ${clean(input['style'])}`,
  };
}

function parseJson(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return JSON.parse(start >= 0 ? raw.slice(start, end + 1) : raw) as Record<string, unknown>;
}

export const runAiTool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: AiInput) => {
    if (!["logo_maker", "resume_builder", "website_starter"].includes(data.tool)) throw new Error("Unknown tool");
    const joined = Object.values(data.input ?? {}).join(" ");
    if (joined.trim().length < 3) throw new Error("Please fill in the form before generating.");
    if (joined.length > 6000) throw new Error("That input is too long. Please shorten it.");
    if (BANNED.test(joined)) throw new Error("This request looks like it breaks our content rules.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: flag } = await supabase
      .from("feature_flags")
      .select("is_enabled")
      .eq("key", FLAG_BY_TOOL[data.tool])
      .maybeSingle();
    if (flag && flag.is_enabled === false) throw new Error("This tool is currently turned off.");

    const { data: limitRow } = await supabase
      .from("ai_usage_limits")
      .select("daily_limit, is_enabled")
      .eq("tool", data.tool)
      .maybeSingle();
    if (limitRow && !limitRow.is_enabled) throw new Error("This tool is currently turned off.");
    const dailyLimit = limitRow?.daily_limit ?? 3;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("ai_generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("tool", data.tool)
      .gte("created_at", since);
    const used = count ?? 0;
    if (used >= dailyLimit) {
      throw new Error(`Daily free limit reached (${dailyLimit} per day). Please try again tomorrow.`);
    }

    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) throw new Error("AI tools are not configured yet.");

    const { system, user } = promptFor(data.tool, data.input ?? {});

    let output: Record<string, unknown> | null = null;
    let errorMessage: string | null = null;
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (response.status === 429) throw new Error("The AI service is busy right now. Please try again in a minute.");
      if (!response.ok) throw new Error("The AI service could not complete this request.");
      const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const text = payload.choices?.[0]?.message?.content ?? "";
      output = parseJson(text);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Generation failed";
    }

    await supabase.from("ai_generations").insert({
      user_id: userId,
      tool: data.tool,
      input: data.input ?? {},
      output: (output ?? null) as never,
      model: MODEL,
      status: errorMessage ? "failed" : "succeeded",
      error_message: errorMessage,
    });

    if (errorMessage) throw new Error(errorMessage);

    return { outputJson: JSON.stringify(output), remaining: Math.max(0, dailyLimit - used - 1), dailyLimit };
  });
