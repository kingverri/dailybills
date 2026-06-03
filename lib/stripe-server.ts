import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

export type PaidPlanId = "pro_monthly" | "pro_yearly";

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  return secretKey;
}

export function getStripeWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET.");
  }

  return webhookSecret;
}

export function getPriceIdForPlan(plan: PaidPlanId) {
  const priceIdByPlan: Record<PaidPlanId, string | undefined> = {
    pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID
  };

  return priceIdByPlan[plan];
}

export async function createStripeFormRequest<T>(path: string, params: URLSearchParams) {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });

  const data = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Stripe request failed.");
  }

  return data;
}

export function verifyStripeSignature(payload: string, signatureHeader: string | null, webhookSecret: string) {
  if (!signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split(",").reduce<Record<string, string[]>>((acc, item) => {
    const [key, value] = item.split("=");

    if (!key || !value) {
      return acc;
    }

    acc[key] = [...(acc[key] ?? []), value];
    return acc;
  }, {});
  const timestamp = parts.t?.[0];
  const signatures = parts.v1 ?? [];

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = createHmac("sha256", webhookSecret).update(signedPayload, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  return signatures.some((signature) => {
    const actualBuffer = Buffer.from(signature, "hex");
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  });
}
