import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { createStripeFormRequest, getAppUrl, getPriceIdForPlan, type PaidPlanId } from "@/lib/stripe-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutSessionResponse = {
  url?: string;
};

function isPaidPlan(plan: unknown): plan is PaidPlanId {
  return plan === "pro_monthly" || plan === "pro_yearly";
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { plan?: unknown };

    if (!isPaidPlan(body.plan)) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const priceId = getPriceIdForPlan(body.plan);

    if (!priceId) {
      return NextResponse.json({ error: "Stripe price ID is not configured." }, { status: 500 });
    }

    const appUrl = getAppUrl();
    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("client_reference_id", user.id);
    params.set("metadata[user_id]", user.id);
    params.set("metadata[plan]", body.plan);
    params.set("success_url", `${appUrl}/settings?checkout=success`);
    params.set("cancel_url", `${appUrl}/pricing?checkout=cancelled`);

    if (user.email) {
      params.set("customer_email", user.email);
    }

    const session = await createStripeFormRequest<CheckoutSessionResponse>("/checkout/sessions", params);

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session error:", error);
    return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 });
  }
}
