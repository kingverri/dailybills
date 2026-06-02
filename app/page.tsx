"use client";

import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  Globe2,
  HandCoins,
  Languages,
  Moon,
  PiggyBank,
  Receipt,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  WalletCards,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { normalizeLanguage } from "@/lib/i18n";
import type { Language } from "@/types/app";

const landingCopy = {
  en: {
    navFeatures: "Features",
    navHow: "How it works",
    navPricing: "Pricing",
    login: "Log in",
    startFree: "Start free",
    createAccount: "Create account",
    heroBadge: "Built for workers with variable income",
    heroTitle: "Stay ahead of bills without losing track of your income",
    heroSubtitle:
      "DailyBills helps gig workers, hourly workers, cleaners, servers, delivery workers, and drivers organize bills, work days, tips, income, and cash flow in one place.",
    heroTrust: "No spreadsheets needed. English, Portuguese, and Spanish included.",
    dashboardCta: "Go to dashboard",
    whoTitle: "Made for real working people",
    whoSubtitle:
      "DailyBills is not only for drivers. It helps workers with recurring bills and changing income stay organized in the US.",
    drivers: "App drivers",
    delivery: "Delivery workers",
    cleaners: "Cleaners",
    restaurants: "Restaurant workers",
    servers: "Waiters / servers",
    hourly: "Hourly workers",
    immigrants: "Immigrants managing US bills",
    featuresTitle: "Everything you need to plan the next bill",
    featuresSubtitle: "Simple tools for bills, income, work logs, cash flow, exports, and day-to-day decisions.",
    featureBillsTitle: "Track bills by month",
    featureBillsBody: "See only the bills that matter for the month you selected.",
    featureRecurringTitle: "Recurring bill planning",
    featureRecurringBody: "Plan rent, car payments, insurance, loans, and installments without duplicate rows.",
    featureIncomeTitle: "Daily income tracking",
    featureIncomeBody: "Record actual income, confirmed payments, and extra gig income.",
    featureWorkTitle: "Work Log weekly summary",
    featureWorkBody: "Track hours, tips, gas, stops, expenses, and net profit by week.",
    featureCashTitle: "Cash-flow projection",
    featureCashBody: "Know what is safe to spend after upcoming bills are reserved.",
    featureTipsTitle: "Tips and profit",
    featureTipsBody: "Include tips and expenses so your net earnings are clearer.",
    featureLanguageTitle: "Three languages",
    featureLanguageBody: "Use DailyBills in English, Portuguese, or Spanish.",
    featureThemeTitle: "Light and dark themes",
    featureThemeBody: "Choose dark, soft light, or bright light for any time of day.",
    featureExportTitle: "Export your records",
    featureExportBody: "Download CSV, Excel, or Google Sheets-compatible files.",
    howTitle: "How DailyBills works",
    step1Title: "Add your bills",
    step1Body: "Enter due dates, amounts, categories, and recurring rules.",
    step2Title: "Track income or work days",
    step2Body: "Log earnings, hours, tips, miles, gas, and extra expenses.",
    step3Title: "See safe-to-spend",
    step3Body: "DailyBills projects bills and income for the period you choose.",
    step4Title: "Stay ahead",
    step4Body: "Know what to earn, save, or hold back before the next bill.",
    benefitsTitle: "Less guessing. More control.",
    benefitsSubtitle:
      "Replace messy notes and spreadsheets with a simple plan you can check from your phone.",
    benefit1: "Know what you can safely spend today",
    benefit2: "Stop guessing if upcoming bills are covered",
    benefit3: "See income, expenses, tips, and profit clearly",
    benefit4: "Stay organized with weekly or monthly planning",
    previewTitle: "A command center for your bills and work income",
    previewSubtitle: "A quick look at the DailyBills dashboard experience.",
    safeToSpend: "Safe to spend",
    needToEarn: "Need to earn",
    upcomingBills: "Upcoming bills",
    workLog: "Work Log",
    monthlySummary: "Monthly summary",
    pricingTitle: "Start free. Upgrade when you need more.",
    pricingSubtitle: "No payment setup here. DailyBills is ready for a simple free-to-pro path.",
    freePlan: "Free",
    freePrice: "$0",
    freePoint1: "Basic safe-to-spend planning",
    freePoint2: "Bills and income tracking",
    freePoint3: "English, Portuguese, and Spanish",
    proPlan: "Pro",
    proPrice: "$7.99/mo",
    proPoint1: "Custom projection periods",
    proPoint2: "Unlimited bills and work logs",
    proPoint3: "Weekly settlement, exports, and advanced tracking",
    finalTitle: "Take control of bills and work income today",
    finalSubtitle: "Create your DailyBills account and build your first cash-flow plan in minutes.",
    footerBody: "A simple money planner for workers with changing income.",
    home: "Home"
  },
  pt: {
    navFeatures: "Recursos",
    navHow: "Como funciona",
    navPricing: "Preços",
    login: "Entrar",
    startFree: "Começar grátis",
    createAccount: "Criar conta",
    heroBadge: "Feito para trabalhadores com renda variável",
    heroTitle: "Fique em dia com as contas sem perder o controle dos ganhos",
    heroSubtitle:
      "O DailyBills ajuda trabalhadores de apps, diaristas, cleaners, garçons, entregadores, motoristas e horistas a organizar contas, dias de trabalho, gorjetas, ganhos e fluxo de caixa em um só lugar.",
    heroTrust: "Sem planilhas. Inglês, português e espanhol incluídos.",
    dashboardCta: "Ir para o painel",
    whoTitle: "Feito para pessoas que trabalham de verdade",
    whoSubtitle:
      "O DailyBills não é só para motoristas. Ele ajuda trabalhadores com contas recorrentes e renda variável a se organizarem nos EUA.",
    drivers: "Motoristas de app",
    delivery: "Entregadores",
    cleaners: "Cleaner / limpeza",
    restaurants: "Trabalhadores de restaurante",
    servers: "Garçons / garçonetes",
    hourly: "Trabalhadores por hora",
    immigrants: "Imigrantes organizando contas nos EUA",
    featuresTitle: "Tudo para planejar a próxima conta",
    featuresSubtitle: "Ferramentas simples para contas, ganhos, registro de trabalho, fluxo de caixa, exportação e decisões do dia a dia.",
    featureBillsTitle: "Contas por mês",
    featureBillsBody: "Veja apenas as contas do mês selecionado.",
    featureRecurringTitle: "Planejamento de contas recorrentes",
    featureRecurringBody: "Planeje aluguel, carro, seguro, empréstimos e parcelas sem duplicar registros.",
    featureIncomeTitle: "Registro diário de ganhos",
    featureIncomeBody: "Registre ganhos reais, pagamentos confirmados e renda extra.",
    featureWorkTitle: "Resumo semanal de trabalho",
    featureWorkBody: "Registre horas, gorjetas, gasolina, stops, gastos e lucro líquido por semana.",
    featureCashTitle: "Projeção de fluxo de caixa",
    featureCashBody: "Saiba o que é seguro gastar depois de reservar dinheiro para próximas contas.",
    featureTipsTitle: "Gorjetas e lucro",
    featureTipsBody: "Inclua gorjetas e gastos para enxergar melhor o ganho líquido.",
    featureLanguageTitle: "Três idiomas",
    featureLanguageBody: "Use o DailyBills em inglês, português ou espanhol.",
    featureThemeTitle: "Temas claro e escuro",
    featureThemeBody: "Escolha escuro, claro suave ou claro para qualquer hora do dia.",
    featureExportTitle: "Exporte seus registros",
    featureExportBody: "Baixe CSV, Excel ou arquivos compatíveis com Google Sheets.",
    howTitle: "Como o DailyBills funciona",
    step1Title: "Adicione suas contas",
    step1Body: "Informe vencimentos, valores, categorias e recorrências.",
    step2Title: "Registre ganhos ou dias de trabalho",
    step2Body: "Registre ganhos, horas, gorjetas, milhas, gasolina e gastos extras.",
    step3Title: "Veja o seguro para gastar",
    step3Body: "O DailyBills projeta contas e ganhos para o período escolhido.",
    step4Title: "Fique à frente",
    step4Body: "Saiba quanto ganhar, guardar ou segurar antes da próxima conta.",
    benefitsTitle: "Menos adivinhação. Mais controle.",
    benefitsSubtitle:
      "Troque notas bagunçadas e planilhas por um plano simples no celular.",
    benefit1: "Saiba o que pode gastar com segurança hoje",
    benefit2: "Pare de adivinhar se as próximas contas estão cobertas",
    benefit3: "Veja ganhos, gastos, gorjetas e lucro com clareza",
    benefit4: "Organize sua semana e seu mês com facilidade",
    previewTitle: "Um centro de controle para contas e trabalho",
    previewSubtitle: "Uma prévia rápida da experiência do painel DailyBills.",
    safeToSpend: "Seguro para gastar",
    needToEarn: "Precisa ganhar",
    upcomingBills: "Próximas contas",
    workLog: "Registro de trabalho",
    monthlySummary: "Resumo mensal",
    pricingTitle: "Comece grátis. Faça upgrade quando precisar.",
    pricingSubtitle: "Sem pagamento aqui. O DailyBills já está preparado para um caminho simples do gratuito ao Pro.",
    freePlan: "Gratuito",
    freePrice: "$0",
    freePoint1: "Planejamento básico de seguro para gastar",
    freePoint2: "Registro de contas e ganhos",
    freePoint3: "Inglês, português e espanhol",
    proPlan: "Pro",
    proPrice: "$7.99/mês",
    proPoint1: "Períodos de projeção personalizados",
    proPoint2: "Contas e registros de trabalho ilimitados",
    proPoint3: "Fechamento semanal, exportações e rastreamento avançado",
    finalTitle: "Controle suas contas e ganhos hoje",
    finalSubtitle: "Crie sua conta DailyBills e monte seu primeiro plano de fluxo de caixa em minutos.",
    footerBody: "Um planejador simples para trabalhadores com renda variável.",
    home: "Início"
  },
  es: {
    navFeatures: "Funciones",
    navHow: "Cómo funciona",
    navPricing: "Precios",
    login: "Iniciar sesión",
    startFree: "Empezar gratis",
    createAccount: "Crear cuenta",
    heroBadge: "Hecho para trabajadores con ingresos variables",
    heroTitle: "Mantente al día con tus cuentas sin perder el control de tus ingresos",
    heroSubtitle:
      "DailyBills ayuda a trabajadores de apps, cleaners, meseros, repartidores, conductores y trabajadores por hora a organizar cuentas, días de trabajo, propinas, ingresos y flujo de efectivo en un solo lugar.",
    heroTrust: "Sin hojas de cálculo. Inglés, portugués y español incluidos.",
    dashboardCta: "Ir al panel",
    whoTitle: "Hecho para personas que trabajan de verdad",
    whoSubtitle:
      "DailyBills no es solo para conductores. Ayuda a trabajadores con cuentas recurrentes e ingresos variables a organizarse en EE. UU.",
    drivers: "Conductores de apps",
    delivery: "Repartidores",
    cleaners: "Limpieza",
    restaurants: "Trabajadores de restaurante",
    servers: "Meseros / meseras",
    hourly: "Trabajadores por hora",
    immigrants: "Inmigrantes organizando cuentas en EE. UU.",
    featuresTitle: "Todo para planear la próxima cuenta",
    featuresSubtitle: "Herramientas simples para cuentas, ingresos, registro de trabajo, flujo de efectivo, exportaciones y decisiones diarias.",
    featureBillsTitle: "Cuentas por mes",
    featureBillsBody: "Ve solo las cuentas del mes seleccionado.",
    featureRecurringTitle: "Plan de cuentas recurrentes",
    featureRecurringBody: "Planea renta, auto, seguro, préstamos y pagos sin duplicar registros.",
    featureIncomeTitle: "Registro diario de ingresos",
    featureIncomeBody: "Registra ingresos reales, pagos confirmados e ingresos extra.",
    featureWorkTitle: "Resumen semanal de trabajo",
    featureWorkBody: "Registra horas, propinas, gasolina, paradas, gastos y ganancia neta por semana.",
    featureCashTitle: "Proyección de flujo de efectivo",
    featureCashBody: "Sabe qué es seguro gastar después de reservar dinero para próximas cuentas.",
    featureTipsTitle: "Propinas y ganancia",
    featureTipsBody: "Incluye propinas y gastos para ver mejor tu ingreso neto.",
    featureLanguageTitle: "Tres idiomas",
    featureLanguageBody: "Usa DailyBills en inglés, portugués o español.",
    featureThemeTitle: "Temas claro y oscuro",
    featureThemeBody: "Elige oscuro, claro suave o claro para cualquier momento del día.",
    featureExportTitle: "Exporta tus registros",
    featureExportBody: "Descarga CSV, Excel o archivos compatibles con Google Sheets.",
    howTitle: "Cómo funciona DailyBills",
    step1Title: "Agrega tus cuentas",
    step1Body: "Ingresa fechas, montos, categorías y reglas recurrentes.",
    step2Title: "Registra ingresos o días de trabajo",
    step2Body: "Registra ingresos, horas, propinas, millas, gasolina y gastos extras.",
    step3Title: "Ve lo seguro para gastar",
    step3Body: "DailyBills proyecta cuentas e ingresos para el período elegido.",
    step4Title: "Mantente adelante",
    step4Body: "Sabe cuánto ganar, guardar o separar antes de la próxima cuenta.",
    benefitsTitle: "Menos adivinar. Más control.",
    benefitsSubtitle:
      "Cambia notas desordenadas y hojas de cálculo por un plan simple en tu teléfono.",
    benefit1: "Sabe qué puedes gastar con seguridad hoy",
    benefit2: "Deja de adivinar si las próximas cuentas están cubiertas",
    benefit3: "Ve ingresos, gastos, propinas y ganancia con claridad",
    benefit4: "Organiza tu semana y tu mes con facilidad",
    previewTitle: "Un centro de control para cuentas e ingresos",
    previewSubtitle: "Una vista rápida de la experiencia del panel DailyBills.",
    safeToSpend: "Seguro para gastar",
    needToEarn: "Necesitas ganar",
    upcomingBills: "Próximas cuentas",
    workLog: "Registro de trabajo",
    monthlySummary: "Resumen mensual",
    pricingTitle: "Empieza gratis. Actualiza cuando lo necesites.",
    pricingSubtitle: "Sin pagos aquí. DailyBills está listo para un camino simple de gratis a Pro.",
    freePlan: "Gratis",
    freePrice: "$0",
    freePoint1: "Plan básico de seguro para gastar",
    freePoint2: "Registro de cuentas e ingresos",
    freePoint3: "Inglés, portugués y español",
    proPlan: "Pro",
    proPrice: "$7.99/mes",
    proPoint1: "Períodos de proyección personalizados",
    proPoint2: "Cuentas y registros de trabajo ilimitados",
    proPoint3: "Cierre semanal, exportaciones y seguimiento avanzado",
    finalTitle: "Controla tus cuentas e ingresos hoy",
    finalSubtitle: "Crea tu cuenta DailyBills y arma tu primer plan de flujo de efectivo en minutos.",
    footerBody: "Un planificador simple para trabajadores con ingresos variables.",
    home: "Inicio"
  }
} as const;

const languageOptions: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
  { value: "es", label: "Español" }
];

const audienceIcons: LucideIcon[] = [WalletCards, BriefcaseBusiness, Sparkles, BriefcaseBusiness, HandCoins, CalendarDays, Globe2];
const featureIcons: LucideIcon[] = [CalendarDays, Receipt, Wallet, ClipboardList, BarChart3, HandCoins, Languages, Moon, Download];
const stepIcons: LucideIcon[] = [Receipt, ClipboardList, PiggyBank, ShieldCheck];

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem("dailybills-public-language");
    const browserLanguage = navigator.language?.toLowerCase().startsWith("pt")
      ? "pt"
      : navigator.language?.toLowerCase().startsWith("es")
        ? "es"
        : "en";

    setLanguage(normalizeLanguage(profile?.language ?? storedLanguage ?? browserLanguage));
  }, [profile?.language]);

  useEffect(() => {
    window.localStorage.setItem("dailybills-public-language", language);
  }, [language]);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  const c = landingCopy[language];
  const audience = [
    c.drivers,
    c.delivery,
    c.cleaners,
    c.restaurants,
    c.servers,
    c.hourly,
    c.immigrants
  ];
  const features = [
    [c.featureBillsTitle, c.featureBillsBody],
    [c.featureRecurringTitle, c.featureRecurringBody],
    [c.featureIncomeTitle, c.featureIncomeBody],
    [c.featureWorkTitle, c.featureWorkBody],
    [c.featureCashTitle, c.featureCashBody],
    [c.featureTipsTitle, c.featureTipsBody],
    [c.featureLanguageTitle, c.featureLanguageBody],
    [c.featureThemeTitle, c.featureThemeBody],
    [c.featureExportTitle, c.featureExportBody]
  ];
  const steps = [
    [c.step1Title, c.step1Body],
    [c.step2Title, c.step2Body],
    [c.step3Title, c.step3Body],
    [c.step4Title, c.step4Body]
  ];

  if (loading || user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-sm p-6 text-center">
          <span className="icon-chip mx-auto">
            <Wallet size={22} aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold text-neutral-600">DailyBills</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-2 text-ink" href="/">
            <span className="icon-chip-sm bg-brand-50 text-brand-700">
              <Wallet size={17} aria-hidden="true" />
            </span>
            <span className="text-base font-black">DailyBills</span>
          </Link>
          <div className="hidden items-center gap-5 text-sm font-semibold text-neutral-600 md:flex">
            <a className="hover:text-brand-700" href="#features">{c.navFeatures}</a>
            <a className="hover:text-brand-700" href="#how">{c.navHow}</a>
            <a className="hover:text-brand-700" href="#pricing">{c.navPricing}</a>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="sr-only" htmlFor="landing-language">
              Language
            </label>
            <select
              id="landing-language"
              className="field min-h-10 w-auto py-2 text-sm"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Link className="btn-secondary min-h-10 px-3" href="/login">{c.login}</Link>
            <Link className="btn-primary min-h-10 px-3" href="/signup">{c.startFree}</Link>
          </div>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-20 lg:pt-20">
        <div className="flex flex-col justify-center">
          <span className="badge badge-good w-fit">
            <Sparkles size={14} aria-hidden="true" />
            {c.heroBadge}
          </span>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-normal text-ink sm:text-5xl lg:text-6xl">
            {c.heroTitle}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-600">{c.heroSubtitle}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link className="btn-primary" href="/signup">
              {c.createAccount}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="btn-secondary" href="/login">{c.login}</Link>
          </div>
          <p className="mt-4 text-sm font-semibold text-neutral-500">{c.heroTrust}</p>
        </div>

        <div className="relative">
          <div className="card mx-auto max-w-md p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">DailyBills</p>
                <p className="text-lg font-bold text-ink">{c.dashboardCta}</p>
              </div>
              <span className="icon-chip">
                <Wallet size={22} aria-hidden="true" />
              </span>
            </div>
            <div className="grid gap-3">
              <PreviewMetric icon={Wallet} label={c.safeToSpend} value="$215.00" tone="good" />
              <PreviewMetric icon={TrendingUp} label={c.needToEarn} value="$45.00" tone="warn" />
              <div className="rounded-2xl border border-line bg-neutral-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold text-ink">{c.upcomingBills}</p>
                  <span className="badge badge-warn">Jun 3</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Rent</span>
                    <strong className="text-ink">$1,275.00</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Car insurance</span>
                    <strong className="text-ink">$274.16</strong>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <PreviewMini icon={ClipboardList} label={c.workLog} value="$428 net" />
                <PreviewMini icon={BarChart3} label={c.monthlySummary} value="$2,940" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="card p-5 sm:p-7">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black text-ink">{c.whoTitle}</h2>
            <p className="mt-2 text-neutral-600">{c.whoSubtitle}</p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {audience.map((item, index) => {
              const Icon = audienceIcons[index];
              return (
                <div key={item} className="metric-card flex items-center gap-3">
                  <span className="icon-chip-sm">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <span className="font-semibold text-ink">{item}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionIntro title={c.featuresTitle} subtitle={c.featuresSubtitle} />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([title, body], index) => {
            const Icon = featureIcons[index];
            return <FeatureCard key={title} icon={Icon} title={title} body={body} />;
          })}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionIntro title={c.howTitle} />
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {steps.map(([title, body], index) => {
            const Icon = stepIcons[index];
            return (
              <div key={title} className="card p-5">
                <span className="icon-chip">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <p className="mt-4 text-sm font-bold uppercase tracking-wide text-brand-700">0{index + 1}</p>
                <h3 className="mt-1 text-lg font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <h2 className="text-3xl font-black text-ink">{c.benefitsTitle}</h2>
          <p className="mt-3 text-lg text-neutral-600">{c.benefitsSubtitle}</p>
        </div>
        <div className="grid gap-3">
          {[c.benefit1, c.benefit2, c.benefit3, c.benefit4].map((benefit) => (
            <div key={benefit} className="metric-card flex items-center gap-3">
              <span className="icon-chip-sm text-brand-700">
                <CheckCircle2 size={17} aria-hidden="true" />
              </span>
              <span className="font-semibold text-ink">{benefit}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="card overflow-hidden p-5 sm:p-8">
          <SectionIntro title={c.previewTitle} subtitle={c.previewSubtitle} />
          <div className="mt-8 grid gap-4 lg:grid-cols-5">
            <div className="metric-card lg:col-span-2">
              <p className="text-sm font-semibold text-neutral-600">{c.safeToSpend}</p>
              <p className="mt-2 text-4xl font-black text-ink">$215.00</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full w-3/4 rounded-full bg-brand-500" />
              </div>
            </div>
            <div className="metric-card lg:col-span-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-ink">{c.upcomingBills}</p>
                <span className="badge badge-warn">$1,549.16</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <PreviewMini icon={Receipt} label="Rent" value="$1,275" />
                <PreviewMini icon={CalendarDays} label="Insurance" value="$274" />
                <PreviewMini icon={ClipboardList} label={c.workLog} value="18h 30min" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionIntro title={c.pricingTitle} subtitle={c.pricingSubtitle} />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <PricingCard name={c.freePlan} price={c.freePrice} points={[c.freePoint1, c.freePoint2, c.freePoint3]} cta={c.startFree} href="/signup" />
          <PricingCard name={c.proPlan} price={c.proPrice} points={[c.proPoint1, c.proPoint2, c.proPoint3]} cta={c.createAccount} href="/signup" highlighted />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 lg:px-8">
        <div className="card p-8 sm:p-10">
          <h2 className="text-3xl font-black text-ink sm:text-4xl">{c.finalTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-neutral-600">{c.finalSubtitle}</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className="btn-primary" href="/signup">
              {c.createAccount}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="btn-secondary" href="/login">{c.login}</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-ink">DailyBills</p>
            <p className="mt-1 text-sm text-neutral-600">{c.footerBody}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-neutral-600">
            <a href="#top">{c.home}</a>
            <a href="#features">{c.navFeatures}</a>
            <a href="#pricing">{c.navPricing}</a>
            <Link href="/login">{c.login}</Link>
            <Link href="/signup">{c.startFree}</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function SectionIntro({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="max-w-3xl">
      <h2 className="text-3xl font-black text-ink sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-lg leading-8 text-neutral-600">{subtitle}</p> : null}
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <article className="card p-5">
      <span className="icon-chip">
        <Icon size={21} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{body}</p>
    </article>
  );
}

function PreviewMetric({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "good" | "warn";
}) {
  return (
    <div className={`rounded-2xl border bg-neutral-50 p-4 ${tone === "good" ? "border-brand-200" : "border-amber-200"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-neutral-600">{label}</p>
        <span className={`icon-chip-sm ${tone === "good" ? "text-brand-700" : "text-amber-700"}`}>
          <Icon size={17} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-black text-ink">{value}</p>
    </div>
  );
}

function PreviewMini({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-neutral-50 p-3">
      <span className="icon-chip-sm">
        <Icon size={16} aria-hidden="true" />
      </span>
      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 font-bold text-ink">{value}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  points,
  cta,
  href,
  highlighted = false
}: {
  name: string;
  price: string;
  points: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
}) {
  return (
    <article className={`card p-6 ${highlighted ? "border-brand-200 shadow-glow" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-ink">{name}</h3>
          <p className="mt-2 text-3xl font-black text-ink">{price}</p>
        </div>
        <span className="icon-chip">
          <Wallet size={21} aria-hidden="true" />
        </span>
      </div>
      <ul className="mt-5 space-y-3">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2 text-sm text-neutral-600">
            <CheckCircle2 className="mt-0.5 shrink-0 text-brand-700" size={16} aria-hidden="true" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <Link className={highlighted ? "btn-primary mt-6 w-full" : "btn-secondary mt-6 w-full"} href={href}>
        {cta}
      </Link>
    </article>
  );
}
