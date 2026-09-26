import { createHmac } from "node:crypto";

export interface OtpProvider {
  send(phone: string, code: string): Promise<void>;
}

export class DevelopmentOtpProvider implements OtpProvider {
  async send(phone: string, code: string) {
    console.info(`[Selection House demo OTP] ${phone}: ${code}`);
  }
}

export class WebhookOtpProvider implements OtpProvider {
  async send(phone: string, code: string) {
    const endpoint = process.env.OTP_WEBHOOK_URL;
    const token = process.env.OTP_WEBHOOK_TOKEN;
    if (!endpoint || !token) throw new Error("OTP webhook credentials are not configured.");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone, code, message: `Your Selection House verification code is ${code}.` }),
    });
    if (!response.ok) throw new Error(`OTP provider returned ${response.status}.`);
  }
}

export function otpProvider(): OtpProvider {
  return process.env.OTP_WEBHOOK_URL ? new WebhookOtpProvider() : new DevelopmentOtpProvider();
}

export function hashOtp(phone: string, code: string) {
  return createHmac("sha256", process.env.SESSION_SECRET || "local-only-selection-house-session-secret").update(`${phone}:${code}`).digest("hex");
}
