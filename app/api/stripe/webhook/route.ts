import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { getStripeRequest, getStripeWebhookSecret, verifyStripeSignature, type PaidPlanId } from "@/lib/stripe-server";
import type { UserPlan } from "@/types/app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StripeEntity = string | { id?: string } | null | undefined;

type StripeEvent = {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

type StripeSubscription = {
  id?: string;
  status?: string;
  customer?: StripeEntity;
  metadata?: Record<string, unknown> | null;
};

type ProfileStripeUpdate = {
  plan?: UserPlan;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
};

function getStripeId(value: StripeEntity) {
  if (typeof value === "string") {
    return value;
  }

  return value?.id ?? null;
}

function isPaidPlan(plan: unknown): plan is PaidPlanId {
  return plan === "pro_monthly" || plan === "pro_yearly";
}

function shouldDowngradeSubscription(status: unknown) {
  return status === "canceled" || status === "incomplete_expired";
}

async function updateProfileByUserId(
  userId: string,
  payload: ProfileStripeUpdate
) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("profiles").update(payload).eq("user_id", userId);

  if (error) {
    throw error;
  }
}

async function updateProfileBySubscriptionId(
  subscriptionId: string,
  payload: ProfileStripeUpdate
) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("profiles").update(payload).eq("stripe_subscription_id", subscriptionId);

  if (error) {
    throw error;
  }
}

async function updateProfileByCustomerId(customerId: string, payload: ProfileStripeUpdate) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("profiles").update(payload).eq("stripe_customer_id", customerId);

  if (error) {
    throw error;
  }
}

async function retrieveSubscription(subscriptionId: string) {
  try {
    return await getStripeRequest<StripeSubscription>(`/subscriptions/${subscriptionId}`);
  } catch (error) {
    console.error("Could not retrieve Stripe subscription:", error);
    return null;
  }
}

async function updateProfileFromSubscription(subscription: StripeSubscription) {
  const subscriptionId = getStripeId(subscription.id as StripeEntity);
  const customerId = getStripeId(subscription.customer);
  const status = typeof subscription.status === "string" ? subscription.status : null;
  const metadata = subscription.metadata ?? {};
  const userId = typeof metadata.user_id === "string" ? metadata.user_id : null;
  const plan = isPaidPlan(metadata.plan) ? metadata.plan : undefined;
  const updatePayload: ProfileStripeUpdate = {
    ...(plan ? { plan } : {}),
    ...(customerId ? { stripe_customer_id: customerId } : {}),
    ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
    ...(status ? { subscription_status: status } : {})
  };

  if (shouldDowngradeSubscription(status)) {
    updatePayload.plan = "free";
  }

  if (userId) {
    await updateProfileByUserId(userId, updatePayload);
    return;
  }

  if (subscriptionId) {
    await updateProfileBySubscriptionId(subscriptionId, updatePayload);
    return;
  }

  if (customerId) {
    await updateProfileByCustomerId(customerId, updatePayload);
  }
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!verifyStripeSignature(payload, signature, getStripeWebhookSecret())) {
    console.error("Stripe webhook signature verification failed.");
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let event: StripeEvent;

  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch (error) {
    console.error("Stripe webhook JSON parse failed:", error);
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  try {
    const object = event.data.object;

    if (event.type === "checkout.session.completed") {
      const metadata = (object.metadata ?? {}) as Record<string, unknown>;
      const userId = typeof metadata.user_id === "string" ? metadata.user_id : (object.client_reference_id as string | undefined);
      const plan = metadata.plan;
      const customerId = getStripeId(object.customer as StripeEntity);
      const subscriptionId = getStripeId(object.subscription as StripeEntity);
      const paymentStatus = typeof object.payment_status === "string" ? object.payment_status : null;

      if (!userId || !isPaidPlan(plan) || !customerId) {
        console.error("Stripe checkout webhook missing required fields.", { userId, plan, customerId, subscriptionId });
        return NextResponse.json({ received: true });
      }

      const subscription = subscriptionId ? await retrieveSubscription(subscriptionId) : null;
      const subscriptionStatus =
        subscription?.status ?? (paymentStatus === "paid" || subscriptionId ? "active" : "incomplete");

      await updateProfileByUserId(userId, {
        plan,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_status: subscriptionStatus
      });
    }

    if (event.type === "customer.subscription.created") {
      await updateProfileFromSubscription(object as StripeSubscription);
    }

    if (event.type === "customer.subscription.updated") {
      const subscriptionId = getStripeId(object.id as StripeEntity);
      const status = typeof object.status === "string" ? object.status : null;
      const metadata = (object.metadata ?? {}) as Record<string, unknown>;
      const plan = isPaidPlan(metadata.plan) ? metadata.plan : undefined;

      if (!subscriptionId || !status) {
        console.error("Stripe subscription.updated webhook missing required fields.", { subscriptionId, status });
        return NextResponse.json({ received: true });
      }

      await updateProfileBySubscriptionId(subscriptionId, {
        ...(plan && !shouldDowngradeSubscription(status) ? { plan } : {}),
        ...(shouldDowngradeSubscription(status) ? { plan: "free" as UserPlan } : {}),
        subscription_status: status
      });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscriptionId = getStripeId(object.id as StripeEntity);

      if (!subscriptionId) {
        console.error("Stripe subscription.deleted webhook missing subscription id.");
        return NextResponse.json({ received: true });
      }

      await updateProfileBySubscriptionId(subscriptionId, {
        plan: "free",
        subscription_status: "canceled"
      });
    }

    if (event.type === "invoice.payment_failed") {
      const subscriptionId = getStripeId(object.subscription as StripeEntity);
      const customerId = getStripeId(object.customer as StripeEntity);

      if (!subscriptionId && !customerId) {
        console.error("Stripe invoice.payment_failed webhook missing subscription/customer id.");
        return NextResponse.json({ received: true });
      }

      if (subscriptionId) {
        await updateProfileBySubscriptionId(subscriptionId, { subscription_status: "past_due" });
      } else if (customerId) {
        await updateProfileByCustomerId(customerId, { subscription_status: "past_due" });
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      const subscriptionId = getStripeId(object.subscription as StripeEntity);
      const customerId = getStripeId(object.customer as StripeEntity);

      if (!subscriptionId && !customerId) {
        console.error("Stripe invoice.payment_succeeded webhook missing subscription/customer id.");
        return NextResponse.json({ received: true });
      }

      if (subscriptionId) {
        await updateProfileBySubscriptionId(subscriptionId, { subscription_status: "active" });
      } else if (customerId) {
        await updateProfileByCustomerId(customerId, { subscription_status: "active" });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handling failed:", error);
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }
}
