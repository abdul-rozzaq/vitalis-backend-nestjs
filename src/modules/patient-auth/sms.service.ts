import { Injectable, Logger } from "@nestjs/common";

const ESKIZ_BASE_URL = "https://notify.eskiz.uz/api";

// shortcut: in-memory token cache only (no Redis in this stack) — fine for a
// single backend instance; if this ever runs multi-instance, move to a shared cache.
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private cachedToken: string | null = null;

  async send(phone: string, message: string): Promise<void> {
    const email = process.env.ESKIZ_EMAIL;
    const password = process.env.ESKIZ_PASSWORD;

    if (!email || !password) {
      this.logger.warn(`ESKIZ_EMAIL/ESKIZ_PASSWORD not set — logging SMS instead of sending. To: ${phone}, Message: ${message}`);
      return;
    }

    const token = await this.getToken(email, password);
    const mobilePhone = phone.replace("+", "");

    const response = await fetch(`${ESKIZ_BASE_URL}/message/sms/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobile_phone: mobilePhone,
        message,
        from: process.env.ESKIZ_FROM || "4546",
      }),
    });

    if (response.status === 401) {
      // Cached token expired/invalid — refresh once and retry.
      this.cachedToken = null;
      const freshToken = await this.getToken(email, password);
      const retry = await fetch(`${ESKIZ_BASE_URL}/message/sms/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${freshToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mobile_phone: mobilePhone, message, from: process.env.ESKIZ_FROM || "4546" }),
      });
      if (!retry.ok) {
        throw new Error(`Eskiz SMS send failed: ${retry.status} ${await retry.text()}`);
      }
      return;
    }

    if (!response.ok) {
      throw new Error(`Eskiz SMS send failed: ${response.status} ${await response.text()}`);
    }
  }

  private async getToken(email: string, password: string): Promise<string> {
    if (this.cachedToken) return this.cachedToken;

    const response = await fetch(`${ESKIZ_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(`Eskiz auth failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as { data: { token: string } };
    this.cachedToken = data.data.token;
    return this.cachedToken;
  }
}
