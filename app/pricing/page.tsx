"use client";

import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/auth-provider";
import { plans, type PlanConfig } from "@/lib/plans";
import { t } from "@/lib/i18n";

export default function PricingPage() {
  const { profile } = useAuth();
  const language = profile?.language ?? "en";
  const [message, setMessage] = useState("");

  return (
    <>
      <PageHeader
        eyebrow={t(language, "pricing")}
        title={t(language, "chooseYourPlan")}
        subtitle={t(language, "pricingSubtitle")}
        showBackToDashboard
        backToDashboardLabel={t(language, "backToDashboard")}
      />

      {message ? <p className="mb-4 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">{message}</p> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} language={language} onPlaceholder={() => setMessage(t(language, "paymentsComingSoon"))} />
        ))}
      </section>
    </>
  );
}

function PlanCard({
  plan,
  language,
  onPlaceholder
}: {
  plan: PlanConfig;
  language: string;
  onPlaceholder: () => void;
}) {
  const isFree = plan.id === "free";

  return (
    <article className={`card relative flex flex-col p-5 ${plan.isBestValue ? "border-brand-200 shadow-glow" : ""}`}>
      {plan.isBestValue ? (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700">
          <Sparkles size={14} aria-hidden="true" />
          {t(language, "bestValue")}
        </span>
      ) : null}

      <div className="pr-24">
        <h2 className="text-xl font-black text-ink">{t(language, plan.nameKey)}</h2>
        <p className="mt-2 text-sm text-neutral-600">{t(language, plan.descriptionKey)}</p>
      </div>

      <div className="mt-6">
        <span className="text-4xl font-black text-ink">{plan.price}</span>
        {plan.interval !== "none" ? <span className="ml-1 text-sm font-semibold text-neutral-500">/{plan.interval}</span> : null}
      </div>

      <ul className="mt-6 flex-1 space-y-3 text-sm text-neutral-600">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check className="mt-0.5 shrink-0 text-brand-700" size={16} aria-hidden="true" />
            <span>{t(language, feature)}</span>
          </li>
        ))}
      </ul>

      <button className={isFree ? "btn-secondary mt-6 w-full" : "btn-primary mt-6 w-full"} type="button" onClick={onPlaceholder}>
        {isFree ? t(language, "currentPlan") : t(language, plan.ctaKey)}
      </button>
    </article>
  );
}
