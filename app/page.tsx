"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Download,
  Globe2,
  HandCoins,
  Languages,
  LineChart,
  Palette,
  Receipt,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  TrendingUp,
  Wallet,
  WalletCards,
  Zap,
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
    plannerLabel: "Cash-flow planner",
    createAccount: "Create account",
    seeHow: "See how it works",
    heroBadge: "Built for workers with variable income",
    heroTitle: "Stop guessing if you can pay your bills.",
    heroSubtitle:
      "DailyBills helps gig workers, drivers, cleaners, servers, delivery workers, and hourly workers track bills, earnings, tips, work days, and cash flow in one place.",
    heroTrust: "Made for drivers, cleaners, servers, delivery workers, and hourly workers.",
    heroPoint1: "No spreadsheets",
    heroPoint2: "English, Portuguese, and Spanish",
    heroPoint3: "Mobile-first planning",
    safeToSpend: "Safe to spend",
    needToEarn: "Need to earn",
    upcomingBills: "Upcoming bills",
    workLog: "Work Log",
    monthlySummary: "Monthly summary",
    netThisWeek: "net this week",
    cashFlow: "Cash flow",
    rent: "Rent",
    carInsurance: "Car insurance",
    phone: "Phone",
    billsLabel: "Bills",
    incomeLabel: "Income",
    tips: "Tips",
    expenses: "Expenses",
    safeToday: "Safe today",
    needToday: "Need today",
    mockDateShort: "Jun 3",
    mockRentDate: "Jun 1",
    mockCarInsuranceDate: "Jun 3",
    mockPhoneDate: "Jun 7",
    painBadge: "Real money problems",
    painTitle: "Working hard but still unsure where your money went?",
    painSubtitle:
      "Variable income makes money feel blurry. DailyBills turns scattered notes, due dates, gas, tips, and weekly work into one simple plan.",
    painCards: [
      ["Bills arrive without a clear warning", "See what is due and what money needs to stay reserved."],
      ["Income changes every week", "Plan around real work days, tips, and confirmed payments."],
      ["Gas and extra expenses get forgotten", "Track costs before they quietly eat your profit."],
      ["Spreadsheets are hard to keep updated", "Use a phone-first flow that takes minutes, not hours."]
    ],
    painBridge: "DailyBills puts all of it into one simple view.",
    whoTitle: "Made for real working people",
    whoSubtitle:
      "DailyBills is not only for drivers. It helps workers with recurring bills and changing income stay organized in the US.",
    audiences: [
      ["App drivers", "Plan rideshare income, gas, mileage, and bill deadlines."],
      ["Delivery workers", "Track app earnings, tips, fuel, and weekly profit."],
      ["Cleaners", "Organize jobs, tips, expenses, and irregular paydays."],
      ["Restaurant workers", "Keep wages, tips, and monthly bills in one view."],
      ["Servers / waiters", "Make cash tips and card tips easier to plan."],
      ["Hourly workers", "Stay ready when hours or shifts change."],
      ["Immigrants managing US bills", "Understand rent, car, insurance, and phone payments clearly."]
    ],
    featuresTitle: "Everything you need to plan the next bill",
    featuresSubtitle: "Short, practical tools for daily money decisions.",
    features: [
      ["Bills by month", "Focus on the bills that matter for the selected month."],
      ["Recurring bill planning", "Handle rent, car payments, insurance, loans, and installments."],
      ["Daily earnings", "Record actual income, confirmed payments, and extra gig income."],
      ["Work Log", "Track hours, tips, gas, stops, expenses, and weekly totals."],
      ["Cash-flow projection", "See what is safe to spend after bills are reserved."],
      ["Tips and net profit", "Separate gross income from real take-home money."],
      ["Three languages", "Use DailyBills in English, Portuguese, or Spanish."],
      ["Light, soft light, and dark themes", "Choose a comfortable view for any time of day."],
      ["Export your records", "Download CSV, Excel, or Google Sheets-compatible files."]
    ],
    howTitle: "How DailyBills works",
    steps: [
      ["Add your bills", "Enter due dates, amounts, categories, and recurring rules."],
      ["Track earnings and work days", "Log income, tips, hours, miles, gas, and extra expenses."],
      ["See your safe-to-spend number", "DailyBills projects bills and income for the period you choose."],
      ["Stay ahead of the next bill", "Know what to earn, save, or hold back before money leaves."]
    ],
    previewTitle: "Your bills, income, and work days in one simple view.",
    previewSubtitle: "A product preview designed around the questions workers ask every day.",
    benefitsTitle: "Less guessing. More control.",
    benefitsSubtitle: "Know what is safe today, what is due next, and whether your work is actually profitable.",
    benefits: [
      "Know what you can safely spend today",
      "Stop guessing if upcoming bills are covered",
      "See income, expenses, tips, and profit clearly",
      "Stay organized with weekly or monthly planning"
    ],
    pricingTitle: "Start free. Upgrade later.",
    pricingSubtitle: "Get organized first. Payments and advanced limits can come later.",
    freePlan: "Free",
    proPlan: "Pro",
    mostPopular: "Most popular",
    freePrice: "$0",
    proPrice: "$7.99/mo",
    freePoint1: "Basic safe-to-spend planning",
    freePoint2: "Bills and income tracking",
    freePoint3: "English, Portuguese, and Spanish",
    proPoint1: "Custom projection periods",
    proPoint2: "Unlimited bills and work logs",
    proPoint3: "Weekly settlement, exports, and advanced tracking",
    upgradeLater: "Upgrade later",
    finalTitle: "Organize your bills before the next Friday.",
    finalSubtitle: "Create your free account and build your first cash-flow plan in a few minutes.",
    footerBody: "A simple money planner for workers with changing income.",
    home: "Home"
  },
  pt: {
    navFeatures: "Recursos",
    navHow: "Como funciona",
    navPricing: "Preços",
    login: "Entrar",
    startFree: "Começar grátis",
    plannerLabel: "Planejador de fluxo",
    createAccount: "Criar conta",
    seeHow: "Ver como funciona",
    heroBadge: "Feito para trabalhadores com renda variável",
    heroTitle: "Pare de adivinhar se vai conseguir pagar as contas.",
    heroSubtitle:
      "O DailyBills ajuda trabalhadores de apps, motoristas, cleaners, garçons, entregadores e horistas a organizar contas, ganhos, gorjetas, dias de trabalho e fluxo de caixa em um só lugar.",
    heroTrust: "Feito para motoristas, cleaners, garçons, entregadores e trabalhadores por hora.",
    heroPoint1: "Sem planilhas",
    heroPoint2: "Inglês, português e espanhol",
    heroPoint3: "Planejamento pelo celular",
    safeToSpend: "Seguro para gastar",
    needToEarn: "Precisa ganhar",
    upcomingBills: "Próximas contas",
    workLog: "Registro",
    monthlySummary: "Resumo mensal",
    netThisWeek: "líquido na semana",
    cashFlow: "Fluxo de caixa",
    rent: "Aluguel",
    carInsurance: "Seguro do carro",
    phone: "Celular",
    billsLabel: "Contas",
    incomeLabel: "Ganhos",
    tips: "Gorjetas",
    expenses: "Gastos",
    safeToday: "Seguro hoje",
    needToday: "Precisa hoje",
    mockDateShort: "3 de jun",
    mockRentDate: "1 de jun",
    mockCarInsuranceDate: "3 de jun",
    mockPhoneDate: "7 de jun",
    painBadge: "Problemas reais de dinheiro",
    painTitle: "Trabalha muito, mas ainda não sabe para onde o dinheiro foi?",
    painSubtitle:
      "Renda variável deixa o dinheiro confuso. O DailyBills transforma notas soltas, vencimentos, gasolina, gorjetas e trabalho semanal em um plano simples.",
    painCards: [
      ["Contas chegando sem aviso claro", "Veja o que vence e quanto precisa ficar reservado."],
      ["Ganhos variando toda semana", "Planeje com dias reais de trabalho, gorjetas e pagamentos confirmados."],
      ["Gasolina e gastos extras esquecidos", "Registre custos antes que eles comam seu lucro em silêncio."],
      ["Planilhas difíceis de manter", "Use um fluxo feito para celular que leva minutos, não horas."]
    ],
    painBridge: "O DailyBills coloca tudo isso em uma visão simples.",
    whoTitle: "Feito para pessoas que trabalham de verdade",
    whoSubtitle:
      "O DailyBills não é só para motoristas. Ele ajuda trabalhadores com contas recorrentes e renda variável a se organizarem nos EUA.",
    audiences: [
      ["Motoristas de app", "Planeje ganhos, gasolina, milhas e vencimentos."],
      ["Entregadores", "Registre ganhos de apps, gorjetas, combustível e lucro semanal."],
      ["Cleaners / limpeza", "Organize jobs, gorjetas, gastos e pagamentos irregulares."],
      ["Restaurantes", "Mantenha salário, gorjetas e contas mensais em uma visão."],
      ["Garçons / garçonetes", "Planeje melhor gorjetas em dinheiro e no cartão."],
      ["Trabalhadores por hora", "Fique pronto quando horas e turnos mudarem."],
      ["Imigrantes nos EUA", "Entenda aluguel, carro, seguro e telefone com clareza."]
    ],
    featuresTitle: "Tudo para planejar a próxima conta",
    featuresSubtitle: "Ferramentas curtas e práticas para decisões de dinheiro no dia a dia.",
    features: [
      ["Contas por mês", "Foque nas contas importantes do mês selecionado."],
      ["Contas recorrentes", "Organize aluguel, carro, seguro, empréstimos e parcelas."],
      ["Ganhos diários", "Registre ganhos reais, pagamentos confirmados e renda extra."],
      ["Registro de trabalho", "Registre horas, gorjetas, gasolina, stops, gastos e totais semanais."],
      ["Fluxo de caixa", "Veja o que é seguro gastar depois de reservar contas."],
      ["Gorjetas e lucro líquido", "Separe ganho bruto do dinheiro que realmente sobra."],
      ["Três idiomas", "Use o DailyBills em inglês, português ou espanhol."],
      ["Temas claro, claro suave e escuro", "Escolha uma visualização confortável para qualquer hora."],
      ["Exporte seus registros", "Baixe CSV, Excel ou arquivos compatíveis com Google Sheets."]
    ],
    howTitle: "Como o DailyBills funciona",
    steps: [
      ["Adicione suas contas", "Informe vencimentos, valores, categorias e recorrências."],
      ["Registre ganhos e dias de trabalho", "Registre ganhos, gorjetas, horas, milhas, gasolina e gastos extras."],
      ["Veja quanto pode gastar com segurança", "O DailyBills projeta contas e ganhos para o período escolhido."],
      ["Fique à frente da próxima conta", "Saiba quanto ganhar, guardar ou segurar antes do dinheiro sair."]
    ],
    previewTitle: "Seu dinheiro, suas contas e seus dias de trabalho em uma visão simples.",
    previewSubtitle: "Uma prévia do produto pensada nas perguntas que trabalhadores fazem todos os dias.",
    benefitsTitle: "Menos adivinhação. Mais controle.",
    benefitsSubtitle: "Saiba o que é seguro hoje, o que vence depois e se seu trabalho está dando lucro de verdade.",
    benefits: [
      "Saiba o que pode gastar com segurança hoje",
      "Pare de adivinhar se as próximas contas estão cobertas",
      "Veja ganhos, gastos, gorjetas e lucro com clareza",
      "Organize sua semana e seu mês com facilidade"
    ],
    pricingTitle: "Comece grátis. Faça upgrade depois.",
    pricingSubtitle: "Organize-se primeiro. Pagamentos e limites avançados podem vir depois.",
    freePlan: "Gratuito",
    proPlan: "Pro",
    mostPopular: "Mais popular",
    freePrice: "$0",
    proPrice: "$7.99/mês",
    freePoint1: "Planejamento básico de seguro para gastar",
    freePoint2: "Registro de contas e ganhos",
    freePoint3: "Inglês, português e espanhol",
    proPoint1: "Períodos de projeção personalizados",
    proPoint2: "Contas e registros de trabalho ilimitados",
    proPoint3: "Fechamento semanal, exportações e rastreamento avançado",
    upgradeLater: "Fazer upgrade depois",
    finalTitle: "Organize suas contas antes da próxima sexta-feira.",
    finalSubtitle: "Crie sua conta grátis e monte seu primeiro plano em poucos minutos.",
    footerBody: "Um planejador simples para trabalhadores com renda variável.",
    home: "Início"
  },
  es: {
    navFeatures: "Funciones",
    navHow: "Cómo funciona",
    navPricing: "Precios",
    login: "Iniciar sesión",
    startFree: "Empezar gratis",
    plannerLabel: "Planificador de flujo",
    createAccount: "Crear cuenta",
    seeHow: "Ver cómo funciona",
    heroBadge: "Hecho para trabajadores con ingresos variables",
    heroTitle: "Deja de adivinar si podrás pagar tus cuentas.",
    heroSubtitle:
      "DailyBills ayuda a trabajadores de apps, conductores, cleaners, meseros, repartidores y trabajadores por hora a organizar cuentas, ingresos, propinas, días de trabajo y flujo de efectivo en un solo lugar.",
    heroTrust: "Hecho para conductores, cleaners, meseros, repartidores y trabajadores por hora.",
    heroPoint1: "Sin hojas de cálculo",
    heroPoint2: "Inglés, portugués y español",
    heroPoint3: "Planificación móvil",
    safeToSpend: "Seguro para gastar",
    needToEarn: "Necesitas ganar",
    upcomingBills: "Próximas cuentas",
    workLog: "Registro",
    monthlySummary: "Resumen mensual",
    netThisWeek: "neto esta semana",
    cashFlow: "Flujo de efectivo",
    rent: "Renta",
    carInsurance: "Seguro del carro",
    phone: "Celular",
    billsLabel: "Cuentas",
    incomeLabel: "Ingresos",
    tips: "Propinas",
    expenses: "Gastos",
    safeToday: "Seguro hoy",
    needToday: "Necesitas hoy",
    mockDateShort: "3 de jun",
    mockRentDate: "1 de jun",
    mockCarInsuranceDate: "3 de jun",
    mockPhoneDate: "7 de jun",
    painBadge: "Problemas reales de dinero",
    painTitle: "¿Trabajas mucho pero aún no sabes a dónde se fue tu dinero?",
    painSubtitle:
      "Los ingresos variables hacen que el dinero se vuelva confuso. DailyBills convierte notas sueltas, vencimientos, gasolina, propinas y trabajo semanal en un plan simple.",
    painCards: [
      ["Cuentas que llegan sin aviso claro", "Ve qué vence y cuánto dinero debe quedar reservado."],
      ["Ingresos que cambian cada semana", "Planifica con días reales de trabajo, propinas y pagos confirmados."],
      ["Gasolina y gastos extras olvidados", "Registra costos antes de que reduzcan tu ganancia en silencio."],
      ["Hojas de cálculo difíciles de mantener", "Usa un flujo móvil que toma minutos, no horas."]
    ],
    painBridge: "DailyBills pone todo eso en una vista simple.",
    whoTitle: "Hecho para personas que trabajan de verdad",
    whoSubtitle:
      "DailyBills no es solo para conductores. Ayuda a trabajadores con cuentas recurrentes e ingresos variables a organizarse en EE. UU.",
    audiences: [
      ["Conductores de apps", "Planifica ingresos, gasolina, millas y vencimientos."],
      ["Repartidores", "Registra ingresos de apps, propinas, combustible y ganancia semanal."],
      ["Cleaners / limpieza", "Organiza trabajos, propinas, gastos y pagos irregulares."],
      ["Restaurantes", "Mantén salario, propinas y cuentas mensuales en una vista."],
      ["Meseros / meseras", "Planifica mejor propinas en efectivo y tarjeta."],
      ["Trabajadores por hora", "Prepárate cuando cambien las horas o turnos."],
      ["Inmigrantes en EE. UU.", "Entiende renta, auto, seguro y teléfono con claridad."]
    ],
    featuresTitle: "Todo para planear la próxima cuenta",
    featuresSubtitle: "Herramientas cortas y prácticas para decisiones diarias de dinero.",
    features: [
      ["Cuentas por mes", "Enfócate en las cuentas importantes del mes seleccionado."],
      ["Cuentas recurrentes", "Organiza renta, auto, seguro, préstamos y pagos."],
      ["Ingresos diarios", "Registra ingresos reales, pagos confirmados e ingresos extras."],
      ["Registro de trabajo", "Registra horas, propinas, gasolina, paradas, gastos y totales semanales."],
      ["Flujo de efectivo", "Ve qué es seguro gastar después de reservar cuentas."],
      ["Propinas y ganancia neta", "Separa ingreso bruto del dinero que realmente queda."],
      ["Tres idiomas", "Usa DailyBills en inglés, portugués o español."],
      ["Temas claro, claro suave y oscuro", "Elige una vista cómoda para cualquier momento."],
      ["Exporta tus registros", "Descarga CSV, Excel o archivos compatibles con Google Sheets."]
    ],
    howTitle: "Cómo funciona DailyBills",
    steps: [
      ["Agrega tus cuentas", "Ingresa fechas, montos, categorías y reglas recurrentes."],
      ["Registra ingresos y días de trabajo", "Registra ingresos, propinas, horas, millas, gasolina y gastos extras."],
      ["Ve cuánto puedes gastar con seguridad", "DailyBills proyecta cuentas e ingresos para el período elegido."],
      ["Mantente adelante de la próxima cuenta", "Sabe cuánto ganar, guardar o separar antes de que salga el dinero."]
    ],
    previewTitle: "Tus cuentas, ingresos y días de trabajo en una vista simple.",
    previewSubtitle: "Una vista previa del producto diseñada alrededor de preguntas reales de trabajadores.",
    benefitsTitle: "Menos adivinar. Más control.",
    benefitsSubtitle: "Sabe qué es seguro hoy, qué vence después y si tu trabajo realmente deja ganancia.",
    benefits: [
      "Sabe qué puedes gastar con seguridad hoy",
      "Deja de adivinar si las próximas cuentas están cubiertas",
      "Ve ingresos, gastos, propinas y ganancia con claridad",
      "Organiza tu semana y tu mes con facilidad"
    ],
    pricingTitle: "Empieza gratis. Actualiza después.",
    pricingSubtitle: "Organízate primero. Los pagos y límites avanzados pueden venir después.",
    freePlan: "Gratis",
    proPlan: "Pro",
    mostPopular: "Más popular",
    freePrice: "$0",
    proPrice: "$7.99/mes",
    freePoint1: "Plan básico de seguro para gastar",
    freePoint2: "Registro de cuentas e ingresos",
    freePoint3: "Inglés, portugués y español",
    proPoint1: "Períodos de proyección personalizados",
    proPoint2: "Cuentas y registros de trabajo ilimitados",
    proPoint3: "Cierre semanal, exportaciones y seguimiento avanzado",
    upgradeLater: "Actualizar después",
    finalTitle: "Organiza tus cuentas antes del próximo viernes.",
    finalSubtitle: "Crea tu cuenta gratis y arma tu primer plan en pocos minutos.",
    footerBody: "Un planificador simple para trabajadores con ingresos variables.",
    home: "Inicio"
  }
} as const;

const languageOptions: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
  { value: "es", label: "Español" }
];

const audienceIcons: LucideIcon[] = [WalletCards, Zap, Sparkles, BriefcaseBusiness, HandCoins, Timer, Globe2];
const featureIcons: LucideIcon[] = [CalendarDays, Receipt, DollarSign, ClipboardList, LineChart, HandCoins, Languages, Palette, Download];
const stepIcons: LucideIcon[] = [Receipt, ClipboardList, ShieldCheck, TrendingUp];
const accentClasses = [
  "from-emerald-500 to-cyan-400",
  "from-cyan-500 to-blue-500",
  "from-violet-500 to-fuchsia-500",
  "from-amber-400 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-lime-500 to-emerald-500",
  "from-sky-500 to-violet-500",
  "from-teal-500 to-cyan-500",
  "from-slate-700 to-emerald-500"
];

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

  if (loading || user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef3ec] px-4 text-slate-950">
        <div className="rounded-[2rem] border border-emerald-100 bg-white/90 p-7 text-center shadow-2xl shadow-emerald-900/10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-400 text-slate-950 shadow-lg shadow-emerald-500/25">
            <Wallet size={26} aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.22em] text-emerald-700">DailyBills</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#eef3ec] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-[#f7faf4]/82 backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link className="group flex items-center gap-3 text-slate-950" href="/">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition group-hover:scale-105">
              <Wallet size={22} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-black leading-none">DailyBills</span>
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700 sm:block">
                {c.plannerLabel}
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-6 text-sm font-black text-slate-600 md:flex">
            <a className="hover:text-emerald-700" href="#features">{c.navFeatures}</a>
            <a className="hover:text-emerald-700" href="#how">{c.navHow}</a>
            <a className="hover:text-emerald-700" href="#pricing">{c.navPricing}</a>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="sr-only" htmlFor="landing-language">Language</label>
            <select
              id="landing-language"
              className="min-h-11 rounded-2xl border border-emerald-100 bg-white/85 px-3 text-sm font-bold text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <Link className="hidden min-h-11 items-center rounded-2xl border border-slate-200 bg-white/75 px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700 sm:inline-flex" href="/login">
              {c.login}
            </Link>
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 px-4 text-sm font-black text-slate-950 shadow-xl shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:shadow-emerald-500/35" href="/signup">
              {c.startFree}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </nav>
      </header>

      <section
        className="relative px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20"
        style={{
          background:
            "radial-gradient(circle at 18% 12%, rgba(34,197,94,0.28), transparent 28rem), radial-gradient(circle at 82% 14%, rgba(6,182,212,0.24), transparent 30rem), linear-gradient(180deg, #f7faf4 0%, #eef3ec 100%)"
        }}
      >
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-sm font-black text-emerald-800 shadow-sm">
              <Sparkles size={17} aria-hidden="true" />
              {c.heroBadge}
            </span>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-normal text-slate-950 sm:text-6xl lg:text-7xl">
              {c.heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-slate-600 sm:text-xl">
              {c.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 px-7 text-base font-black text-slate-950 shadow-2xl shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:shadow-emerald-500/35" href="/signup">
                {c.startFree}
                <ArrowRight size={20} aria-hidden="true" />
              </Link>
              <a className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-7 text-base font-black text-slate-700 shadow-lg shadow-slate-900/5 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:text-cyan-700" href="#how">
                {c.seeHow}
                <ChevronRight size={20} aria-hidden="true" />
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {[c.heroPoint1, c.heroPoint2, c.heroPoint3].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-2 text-xs font-black text-slate-600 shadow-sm">
                  <CheckCircle2 size={15} className="text-emerald-600" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-5 max-w-xl text-sm font-bold leading-6 text-slate-500">{c.heroTrust}</p>
          </div>

          <HeroMockup copy={c} />
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2.25rem] border border-white/80 bg-slate-950 p-5 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/12 px-4 py-2 text-sm font-black text-emerald-300">
                <Activity size={17} aria-hidden="true" />
                {c.painBadge}
              </span>
              <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">{c.painTitle}</h2>
              <p className="mt-4 text-lg leading-8 text-slate-300">{c.painSubtitle}</p>
              <p className="mt-5 font-black text-emerald-300">{c.painBridge}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {c.painCards.map(([title, body], index) => (
                <article key={title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accentClasses[index]} text-white shadow-lg`}>
                    <Zap size={24} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionIntro title={c.whoTitle} subtitle={c.whoSubtitle} />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.audiences.map(([title, body], index) => {
              const Icon = audienceIcons[index];
              return (
                <article key={title} className="group rounded-[1.75rem] border border-white/80 bg-white/82 p-5 shadow-xl shadow-emerald-950/5 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-900/10">
                  <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${accentClasses[index]} text-white shadow-lg transition group-hover:scale-105`}>
                    <Icon size={28} aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionIntro title={c.featuresTitle} subtitle={c.featuresSubtitle} />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.features.map(([title, body], index) => {
              const Icon = featureIcons[index];
              return <FeatureCard key={title} icon={Icon} title={title} body={body} accent={accentClasses[index]} />;
            })}
          </div>
        </div>
      </section>

      <section id="how" className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionIntro title={c.howTitle} />
          <div className="relative mt-8 grid gap-4 lg:grid-cols-4">
            <div className="pointer-events-none absolute left-8 right-8 top-12 hidden h-px bg-gradient-to-r from-emerald-300 via-cyan-300 to-violet-300 lg:block" />
            {c.steps.map(([title, body], index) => {
              const Icon = stepIcons[index];
              return (
                <article key={title} className="relative rounded-[1.75rem] border border-white/80 bg-white/86 p-6 shadow-xl shadow-emerald-950/5">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${accentClasses[index]} text-white shadow-lg`}>
                      <Icon size={27} aria-hidden="true" />
                    </span>
                    <span className="text-5xl font-black leading-none text-slate-100">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[2.25rem] border border-white/80 bg-white/82 p-5 shadow-2xl shadow-emerald-950/8 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <SectionIntro title={c.previewTitle} subtitle={c.previewSubtitle} />
            <div className="mt-7 grid gap-3">
              {c.benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3">
                  <CheckCircle2 size={20} className="shrink-0 text-emerald-600" aria-hidden="true" />
                  <span className="font-bold text-slate-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          <ProductPreview copy={c} />
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{c.benefitsTitle}</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">{c.benefitsSubtitle}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {c.benefits.map((benefit, index) => (
              <div key={benefit} className="rounded-[1.5rem] border border-white/80 bg-white/82 p-5 shadow-lg shadow-emerald-950/5">
                <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accentClasses[index]} text-white`}>
                  <Star size={21} aria-hidden="true" />
                </span>
                <p className="font-black text-slate-800">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionIntro title={c.pricingTitle} subtitle={c.pricingSubtitle} />
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <PricingCard
              name={c.freePlan}
              price={c.freePrice}
              points={[c.freePoint1, c.freePoint2, c.freePoint3]}
              cta={c.startFree}
              href="/signup"
            />
            <PricingCard
              name={c.proPlan}
              price={c.proPrice}
              points={[c.proPoint1, c.proPoint2, c.proPoint3]}
              cta={c.upgradeLater}
              href="/signup"
              badge={c.mostPopular}
              highlighted
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-slate-950 p-6 text-center text-white shadow-2xl shadow-slate-900/25 sm:p-10">
          <div
            className="rounded-[2rem] border border-white/10 px-5 py-10 sm:px-10"
            style={{
              background:
                "radial-gradient(circle at 20% 0%, rgba(34,197,94,0.24), transparent 28rem), radial-gradient(circle at 80% 18%, rgba(6,182,212,0.22), transparent 28rem)"
            }}
          >
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-cyan-400 text-slate-950 shadow-xl shadow-emerald-500/25">
              <Wallet size={30} aria-hidden="true" />
            </span>
            <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">{c.finalTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-300">{c.finalSubtitle}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 px-7 text-base font-black text-slate-950 shadow-xl shadow-emerald-500/25 transition hover:-translate-y-0.5" href="/signup">
                {c.startFree}
                <ArrowRight size={20} aria-hidden="true" />
              </Link>
              <Link className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/8 px-7 text-base font-black text-white transition hover:bg-white/12" href="/login">
                {c.login}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-emerald-900/10 bg-[#f7faf4]/70 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-black text-slate-950">DailyBills</p>
            <p className="mt-1 text-sm font-medium text-slate-600">{c.footerBody}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-black text-slate-600">
            <a className="hover:text-emerald-700" href="#top">{c.home}</a>
            <a className="hover:text-emerald-700" href="#features">{c.navFeatures}</a>
            <a className="hover:text-emerald-700" href="#pricing">{c.navPricing}</a>
            <Link className="hover:text-emerald-700" href="/login">{c.login}</Link>
            <Link className="hover:text-emerald-700" href="/signup">{c.startFree}</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function SectionIntro({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="max-w-3xl">
      <h2 className="text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-lg font-medium leading-8 text-slate-600">{subtitle}</p> : null}
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  accent
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  accent: string;
}) {
  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/86 shadow-xl shadow-emerald-950/5 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-900/10">
      <div className={`h-1.5 bg-gradient-to-r ${accent}`} />
      <div className="p-6">
        <span className={`flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br ${accent} text-white shadow-lg transition group-hover:scale-105`}>
          <Icon size={31} aria-hidden="true" />
        </span>
        <h3 className="mt-5 text-xl font-black text-slate-950">{title}</h3>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{body}</p>
      </div>
    </article>
  );
}

function HeroMockup({ copy }: { copy: (typeof landingCopy)[Language] }) {
  return (
    <div className="relative">
      <div className="mx-auto max-w-2xl rounded-[2.4rem] border border-white/80 bg-white/76 p-3 shadow-2xl shadow-emerald-950/15 backdrop-blur">
        <div className="rounded-[2rem] border border-slate-100 bg-slate-950 p-4 text-white shadow-2xl shadow-slate-900/20 sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">DailyBills</p>
              <p className="mt-1 text-2xl font-black">{copy.safeToSpend}</p>
            </div>
            <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-400 text-slate-950 shadow-lg shadow-emerald-500/25">
              <ShieldCheck size={28} aria-hidden="true" />
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MockMetric icon={Wallet} label={copy.safeToSpend} value="$215.00" accent="from-emerald-400 to-cyan-300" />
            <MockMetric icon={TrendingUp} label={copy.needToEarn} value="$45.00" accent="from-amber-300 to-orange-400" />
          </div>

          <div className="mt-3 rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-black">{copy.upcomingBills}</p>
              <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-black text-amber-200">{copy.mockDateShort}</span>
            </div>
            <div className="mt-4 space-y-3">
              <BillRow name={copy.rent} amount="$1,275.00" percent="82%" color="bg-emerald-400" />
              <BillRow name={copy.carInsurance} amount="$274.16" percent="46%" color="bg-cyan-300" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-[1.5rem] border border-emerald-300/20 bg-emerald-400/10 p-4">
              <ClipboardList size={24} className="text-emerald-300" aria-hidden="true" />
              <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-300">{copy.workLog}</p>
              <p className="mt-1 text-2xl font-black">$428</p>
              <p className="text-xs font-bold text-emerald-300">{copy.netThisWeek}</p>
            </div>
            <div className="rounded-[1.5rem] border border-cyan-300/20 bg-cyan-400/10 p-4">
              <BarChart3 size={24} className="text-cyan-200" aria-hidden="true" />
              <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-300">{copy.monthlySummary}</p>
              <p className="mt-1 text-2xl font-black">$2,940</p>
              <p className="text-xs font-bold text-cyan-200">{copy.cashFlow}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockMetric({
  icon: Icon,
  label,
  value,
  accent
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-300">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-slate-950`}>
          <Icon size={21} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}

function BillRow({ name, amount, percent, color }: { name: string; amount: string; percent: string; color: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-bold text-slate-200">{name}</span>
        <span className="font-black">{amount}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: percent }} />
      </div>
    </div>
  );
}

function ProductPreview({ copy }: { copy: (typeof landingCopy)[Language] }) {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-[#f8fbf4] p-4 shadow-2xl shadow-slate-900/10">
      <div className="grid gap-4 sm:grid-cols-3">
        <PreviewTile icon={ShieldCheck} label={copy.safeToSpend} value="$215.00" accent="from-emerald-500 to-cyan-400" />
        <PreviewTile icon={TrendingUp} label={copy.needToEarn} value="$45.00" accent="from-amber-400 to-orange-500" />
        <PreviewTile icon={LineChart} label={copy.monthlySummary} value="$2,940" accent="from-violet-500 to-fuchsia-500" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-black text-slate-950">{copy.upcomingBills}</h3>
            <Receipt size={22} className="text-emerald-600" aria-hidden="true" />
          </div>
          <BillRowLight name={copy.rent} amount="$1,275.00" due={copy.mockRentDate} />
          <BillRowLight name={copy.carInsurance} amount="$274.16" due={copy.mockCarInsuranceDate} />
          <BillRowLight name={copy.phone} amount="$86.00" due={copy.mockPhoneDate} />
        </div>
        <div className="rounded-[1.5rem] border border-slate-100 bg-slate-950 p-4 text-white">
          <ClipboardList size={25} className="text-emerald-300" aria-hidden="true" />
          <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-300">{copy.workLog}</p>
          <p className="mt-1 text-4xl font-black">$428</p>
          <p className="text-sm font-bold text-emerald-300">{copy.netThisWeek}</p>
          <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
            <span className="rounded-2xl bg-white/8 p-3 font-bold">18h 30min</span>
            <span className="rounded-2xl bg-white/8 p-3 font-bold">142 mi</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewTile({
  icon: Icon,
  label,
  value,
  accent
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4">
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white`}>
        <Icon size={22} aria-hidden="true" />
      </span>
      <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function BillRowLight({ name, amount, due }: { name: string; amount: string; due: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div>
        <p className="font-black text-slate-800">{name}</p>
        <p className="text-xs font-bold text-slate-500">{due}</p>
      </div>
      <p className="font-black text-slate-950">{amount}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  points,
  cta,
  href,
  badge,
  highlighted = false
}: {
  name: string;
  price: string;
  points: string[];
  cta: string;
  href: string;
  badge?: string;
  highlighted?: boolean;
}) {
  return (
    <article className={`relative overflow-hidden rounded-[2rem] border bg-white/88 p-6 shadow-2xl shadow-emerald-950/7 ${highlighted ? "border-emerald-300" : "border-white/80"}`}>
      {highlighted ? <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-emerald-500 to-cyan-400" /> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {badge ? <span className="mb-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">{badge}</span> : null}
          <h3 className="text-2xl font-black text-slate-950">{name}</h3>
          <p className="mt-2 text-4xl font-black text-slate-950">{price}</p>
        </div>
        <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${highlighted ? "bg-gradient-to-br from-emerald-500 to-cyan-400 text-white" : "bg-emerald-50 text-emerald-700"}`}>
          <Wallet size={27} aria-hidden="true" />
        </span>
      </div>
      <ul className="mt-6 space-y-3">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-3 text-sm font-bold leading-6 text-slate-600">
            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} aria-hidden="true" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <Link
        className={highlighted
          ? "mt-7 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 px-5 font-black text-slate-950 shadow-xl shadow-emerald-500/25 transition hover:-translate-y-0.5"
          : "mt-7 inline-flex min-h-13 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 font-black text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
        }
        href={href}
      >
        {cta}
        {highlighted ? <ArrowRight size={18} aria-hidden="true" /> : null}
      </Link>
    </article>
  );
}
