import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiInputSchema, AI_SAFETY_INSTRUCTIONS, validateAiOutput } from "@/lib/ai-safety";

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
  const clean = (value: string | undefined) => value ?? "";
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
    data = aiInputSchema.parse(data);
    if (!["logo_maker", "resume_builder", "website_starter"].includes(data.tool)) throw new Error("Unknown tool");
    const joined = Object.values(data.input ?? {}).join(" ");
    if (joined.trim().length < 3) throw new Error("Please fill in the form before generating.");
    if (joined.length > 6000) throw new Error("That input is too long. Please shorten it.");
    if (BANNED.test(joined)) throw new Error("This request looks like it breaks our content rules.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) throw new Error("AI tools are not configured yet.");
    const reservation = await (supabase as SupabaseClient).rpc("reserve_ai_generation", { p_tool: data.tool, p_input: data.input });
    if (reservation.error) {
      if (reservation.error.code === "PGRST202") throw new Error("AI tools are awaiting a safety update. Please try again later.");
      throw new Error(reservation.error.message);
    }
    const reserved = z.object({ id: z.string().uuid(), remaining: z.number(), dailyLimit: z.number() }).parse(reservation.data);

    const { system, user } = promptFor(data.tool, data.input ?? {});

    let output: Record<string, unknown> | null = null;
    let errorMessage: string | null = null;
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: `${AI_SAFETY_INSTRUCTIONS}\n${system}` },
            { role: "user", content: user },
          ],
        }),
      });
      if (response.status === 429) throw new Error("The AI service is busy right now. Please try again in a minute.");
      if (!response.ok) {
        const failure = await response.json().catch(() => null) as { message?: string; error?: { message?: string } } | null;
        throw new Error(failure?.message ?? failure?.error?.message ?? "The AI service could not complete this request.");
      }
      const payload = (await response.json()) as { choices?: { message?: { content?: string; refusal?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
      if (payload.choices?.[0]?.message?.refusal) throw new Error(payload.choices[0].message.refusal);
      const text = payload.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) throw new Error("The AI provider returned no result.");
      if (text.length > 120000) throw new Error("The generated result was too large. Please try a shorter request.");
      output = validateAiOutput(data.tool, parseJson(text));
      inputTokens = payload.usage?.prompt_tokens ?? null;
      outputTokens = payload.usage?.completion_tokens ?? null;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Generation failed";
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const finalized = await (supabaseAdmin as SupabaseClient).rpc("finish_ai_generation", {
      p_id: reserved.id, p_user: userId, p_output: output, p_error: errorMessage,
      p_input_tokens: inputTokens, p_output_tokens: outputTokens,
    });
    if (finalized.error) throw new Error("The result could not be saved. Your usage reservation remains recorded.");

    if (errorMessage) throw new Error(errorMessage);

    return { generationId: reserved.id, outputJson: JSON.stringify(output), remaining: reserved.remaining, dailyLimit: reserved.dailyLimit };
  });
