import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { createStripeFormRequest, getAppUrl } from "@/lib/stripe-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PortalSessionResponse = {
  url?: string;
};

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer found for this account." }, { status: 400 });
    }

    const params = new URLSearchParams();
    params.set("customer", profile.stripe_customer_id);
    params.set("return_url", `${getAppUrl()}/settings`);

    const portal = await createStripeFormRequest<PortalSessionResponse>("/billing_portal/sessions", params);

    if (!portal.url) {
      return NextResponse.json({ error: "Stripe did not return a portal URL." }, { status: 500 });
    }

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error("Stripe portal session error:", error);
    return NextResponse.json({ error: "Could not create billing portal session." }, { status: 500 });
  }
}
