"use client";

import { Check, Sparkles, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/auth-provider";
import { plans, type PlanConfig, type PlanId } from "@/lib/plans";
import { t } from "@/lib/i18n";
import { getCurrentPlan } from "@/lib/planLimits";

export default function PricingPage() {
  const router = useRouter();
  const { profile, user, refreshProfile } = useAuth();
  const language = profile?.language ?? "en";
  const [message, setMessage] = useState("");
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const currentPlan = getCurrentPlan(profile);
  const isPaidPlan = currentPlan === "pro_monthly" || currentPlan === "pro_yearly";

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const checkoutStatus = searchParams.get("checkout");

    if (checkoutStatus === "success") {
      setMessage(t(language, "paymentSuccessful"));
      refreshProfile().catch(console.error);
    }

    if (checkoutStatus === "cancelled") {
      setMessage(t(language, "paymentCancelled"));
    }
  }, [language, refreshProfile]);

  async function openBillingPortal(plan: PlanId) {
    setMessage("");
    setLoadingPlan(plan);

    try {
      const response = await fetch("/api/stripe/create-portal-session", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? t(language, "somethingWentWrong"));
      }

      window.location.assign(data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t(language, "somethingWentWrong"));
      setLoadingPlan(null);
    }
  }

  async function choosePlan(plan: PlanId) {
    setMessage("");

    if (user && currentPlan === plan) {
      return;
    }

    if (plan === "free") {
      if (!user) {
        router.push("/signup");
        return;
      }

      if (isPaidPlan) {
        if (!profile?.stripe_customer_id) {
          setMessage(t(language, "billingDataIncomplete"));
          return;
        }

        await openBillingPortal(plan);
        return;
      }

      setMessage(t(language, "currentPlanFree"));
      return;
    }

    if (!user) {
      setMessage(t(language, "loginAgain"));
      return;
    }

    if (isPaidPlan) {
      if (!profile?.stripe_customer_id) {
        setMessage(t(language, "billingDataIncomplete"));
        return;
      }

      await openBillingPortal(plan);
      return;
    }

    setLoadingPlan(plan);

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ plan })
      });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? t(language, "somethingWentWrong"));
      }

      window.location.assign(data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t(language, "somethingWentWrong"));
      setLoadingPlan(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={t(language, "pricing")}
        title={t(language, "chooseYourPlan")}
        subtitle={t(language, "pricingSubtitle")}
        showBackToDashboard={Boolean(user)}
        backToDashboardLabel={t(language, "backToDashboard")}
      />

      {message ? <p className="mb-4 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">{message}</p> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            language={language}
            currentPlan={currentPlan}
            isCurrentPlan={Boolean(user) && currentPlan === plan.id}
            loading={loadingPlan === plan.id}
            onChoose={() => choosePlan(plan.id)}
          />
        ))}
      </section>
    </>
  );
}

function PlanCard({
  plan,
  language,
  currentPlan,
  isCurrentPlan,
  loading,
  onChoose
}: {
  plan: PlanConfig;
  language: string;
  currentPlan: PlanId;
  isCurrentPlan: boolean;
  loading: boolean;
  onChoose: () => void;
}) {
  const isFree = plan.id === "free";
  const buttonLabel = loading ? t(language, "redirectingToCheckout") : getPlanButtonLabel(language, currentPlan, plan.id, isCurrentPlan);

  return (
    <article
      className={`card relative flex flex-col p-6 transition hover:-translate-y-1 ${
        plan.isBestValue ? "border-brand-200 shadow-glow" : ""
      } ${isCurrentPlan ? "ring-2 ring-brand-200" : ""}`}
    >
      <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-2">
        {isCurrentPlan ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/60 bg-sky-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-600">
            {t(language, "currentPlan")}
          </span>
        ) : null}
        {plan.isBestValue ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700">
            <Sparkles size={14} aria-hidden="true" />
            {t(language, "bestValue")}
          </span>
        ) : null}
      </div>

      <div className="pr-24">
        <span className={plan.isBestValue ? "icon-chip" : "icon-chip-sm"}>
          <Wallet size={plan.isBestValue ? 25 : 20} aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-black text-ink">{t(language, plan.nameKey)}</h2>
        <p className="mt-2 text-sm font-medium leading-6 text-neutral-600">{t(language, plan.descriptionKey)}</p>
      </div>

      <div className="mt-6">
        <span className="text-5xl font-black text-ink">{plan.price}</span>
        {plan.interval !== "none" ? <span className="ml-1 text-sm font-semibold text-neutral-500">/{plan.interval}</span> : null}
      </div>

      <ul className="mt-6 flex-1 space-y-3 text-sm font-medium text-neutral-600">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check className="mt-0.5 shrink-0 text-brand-700" size={16} aria-hidden="true" />
            <span>{t(language, feature)}</span>
          </li>
        ))}
      </ul>

      <button
        className={isFree ? "btn-secondary mt-6 w-full" : "btn-primary mt-6 w-full"}
        type="button"
        disabled={loading || isCurrentPlan}
        onClick={onChoose}
      >
        {buttonLabel}
      </button>
    </article>
  );
}

function getPlanButtonLabel(language: string, currentPlan: PlanId, planId: PlanId, isCurrentPlan: boolean) {
  if (isCurrentPlan) {
    return t(language, "currentPlan");
  }

  if (currentPlan === "pro_monthly") {
    if (planId === "free") {
      return t(language, "downgradeToFree");
    }

    if (planId === "pro_yearly") {
      return t(language, "upgradeToProYearly");
    }
  }

  if (currentPlan === "pro_yearly") {
    if (planId === "free") {
      return t(language, "downgradeToFree");
    }

    if (planId === "pro_monthly") {
      return t(language, "switchToMonthly");
    }
  }

  if (planId === "free") {
    return t(language, "startFree");
  }

  return planId === "pro_monthly" ? t(language, "upgradeToProMonthly") : t(language, "getBestValue");
}
