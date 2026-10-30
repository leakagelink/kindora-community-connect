import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { normalizeIndianMobile, phoneAuthEmail } from "./phone-auth";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function secretPepper() {
  const key = process.env["APITXT_AUTH_KEY"];
  if (!key) throw new Error("Mobile login is not configured yet.");
  return key;
}

const phoneInput = z.object({ phone: z.string().min(10).max(16) });

export const sendPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => phoneInput.parse(input))
  .handler(async ({ data }) => {
    const mobile = normalizeIndianMobile(data.phone);
    if (!mobile) throw new Error("Enter a valid 10-digit Indian mobile number.");
    const pepper = secretPepper();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phoneHash = await sha256(`phone:${mobile}:${pepper}`);
    const now = Date.now();

    const { data: recent, error: recentError } = await supabaseAdmin
      .from("phone_otp_codes")
      .select("created_at")
      .eq("phone_hash", phoneHash)
      .gte("created_at", new Date(now - 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(5);
    if (recentError) throw new Error("Could not send the code. Please try again.");
    if (recent && recent.length >= 5) throw new Error("Too many codes requested. Try again in an hour.");
    if (recent?.[0] && now - new Date(recent[0].created_at).getTime() < 60_000) {
      throw new Error("Please wait a minute before requesting another code.");
    }
    const { count } = await supabaseAdmin
      .from("phone_otp_codes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(now - 60 * 60 * 1000).toISOString());
    if ((count ?? 0) >= 300) throw new Error("Mobile login is busy right now. Please try again later.");

    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const code = String(random[0]! % 1_000_000).padStart(6, "0");

    const { error: insertError } = await supabaseAdmin.from("phone_otp_codes").insert({
      phone_hash: phoneHash,
      code_hash: await sha256(`code:${mobile}:${code}:${pepper}`),
      expires_at: new Date(now + OTP_TTL_MS).toISOString(),
    });
    if (insertError) throw new Error("Could not send the code. Please try again.");

    const body = new URLSearchParams({ authkey: pepper, mobile, otp: code, channel: "sms" });
    const res = await fetch("https://apitxt.com/api/sendOTP", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const text = await res.text();
    if (!res.ok || !/success/i.test(text)) {
      console.error("apitxt sendOTP failed", res.status, text.slice(0, 300));
      throw new Error("SMS could not be sent. Please try again shortly.");
    }
    return { ok: true };
  });

const verifyInput = z.object({
  phone: z.string().min(10).max(16),
  code: z.string().regex(/^\d{6}$/),
  displayName: z.string().max(60).optional(),
});

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => verifyInput.parse(input))
  .handler(async ({ data }) => {
    const mobile = normalizeIndianMobile(data.phone);
    if (!mobile) throw new Error("Enter a valid 10-digit Indian mobile number.");
    const pepper = secretPepper();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phoneHash = await sha256(`phone:${mobile}:${pepper}`);

    const { data: row } = await supabaseAdmin
      .from("phone_otp_codes")
      .select("id, code_hash, attempts, expires_at, consumed_at")
      .eq("phone_hash", phoneHash)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row || row.consumed_at || new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("This code has expired. Request a new one.");
    }
    if (row.attempts >= MAX_ATTEMPTS) throw new Error("Too many wrong attempts. Request a new code.");

    const matches = row.code_hash === (await sha256(`code:${mobile}:${data.code}:${pepper}`));
    if (!matches) {
      await supabaseAdmin.from("phone_otp_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      throw new Error("Wrong code. Please check and try again.");
    }
    const { data: consumed } = await supabaseAdmin
      .from("phone_otp_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("consumed_at", null)
      .select("id");
    if (!consumed?.length) throw new Error("This code was already used. Request a new one.");

    const email = phoneAuthEmail(mobile);
    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: data.displayName?.trim() || `Member ${mobile.slice(-4)}`, signup_method: "phone" },
    });
    if (created.error && !/already|registered|exists/i.test(created.error.message)) {
      throw new Error("Could not create your account. Please try again.");
    }
    const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = link.data?.properties?.hashed_token;
    if (link.error || !tokenHash) throw new Error("Could not log you in. Please try again.");
    return { tokenHash };
  });
