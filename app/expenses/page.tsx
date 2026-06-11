"use client";

import { Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppActionPanel, AppFilterBar, AppListCard, AppMetricCard } from "@/components/app-ui";
import { EmptyState } from "@/components/empty-state";
import { ExpenseForm, buildExpensePayload, createExpenseForm, validateExpenseForm, type ExpenseFormValues } from "@/components/expense-form";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/auth-provider";
import { expenseCategories } from "@/lib/constants";
import { formatCurrency, formatDate, formatMonthYear, toDateInputValue } from "@/lib/format";
import { expenseCategoryLabel, t } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";
import { usePersistentDraft } from "@/hooks/use-persistent-draft";
import type { Expense, ExpenseCategory } from "@/types/app";

type ExpenseFilter = ExpenseCategory | "all";

function currentMonthValue() {
  return toDateInputValue().slice(0, 7);
}

export default function ExpensesPage() {
  const { user, profile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm, clearExpenseDraft] = usePersistentDraft<ExpenseFormValues>({
    key: user && !editingId ? `dailybills:draft:${user.id}:expense` : null,
    initialValue: () => createExpenseForm(),
    enabled: Boolean(user && !editingId),
    resetWhenDisabled: false
  });
  const [showForm, setShowForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue());
  const [categoryFilter, setCategoryFilter] = useState<ExpenseFilter>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const language = profile?.language ?? "en";
  const currency = profile?.currency ?? "USD";
  const filteredExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => expense.date.startsWith(selectedMonth))
        .filter((expense) => categoryFilter === "all" || expense.category === categoryFilter)
        .sort((first, second) => second.date.localeCompare(first.date)),
    [categoryFilter, expenses, selectedMonth]
  );
  const monthlyExpenses = useMemo(
    () => expenses.filter((expense) => expense.date.startsWith(selectedMonth)),
    [expenses, selectedMonth]
  );
  const monthlyTotal = monthlyExpenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
  const totalsByCategory = expenseCategories
    .map((category) => ({
      category,
      total: monthlyExpenses
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0)
    }))
    .filter((item) => item.total > 0);
  const biggestCategory = [...totalsByCategory].sort((first, second) => second.total - first.total)[0];
  const biggestExpense = [...monthlyExpenses].sort((first, second) => Number(second.amount ?? 0) - Number(first.amount ?? 0))[0];
  const [selectedYear, selectedMonthNumber] = selectedMonth.split("-").map(Number);
  const daysInSelectedMonth = new Date(selectedYear, selectedMonthNumber, 0).getDate();
  const today = new Date();
  const currentMonth = currentMonthValue();
  const elapsedDays = selectedMonth === currentMonth ? today.getDate() : daysInSelectedMonth;
  const dailyAverage = monthlyTotal / Math.max(1, elapsedDays);

  async function loadExpenses() {
    if (!user) {
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    const { data, error: loadError } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    setLoading(false);

    if (loadError) {
      setError(loadError.message);
      return;
    }

    setExpenses(data ?? []);
  }

  useEffect(() => {
    loadExpenses().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function resetForm() {
    clearExpenseDraft(createExpenseForm());
    setEditingId(null);
    setError("");
  }

  function editExpense(expense: Expense) {
    setEditingId(expense.id);
    setForm(createExpenseForm(expense));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyPreset(merchant: string, category: ExpenseCategory) {
    setForm({ ...form, merchant, category });
    setShowForm(true);
  }

  async function saveExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!user) {
      setError(t(language, "loginAgain"));
      return;
    }

    if (!validateExpenseForm(form)) {
      setError(t(language, "expenseRequiredError"));
      return;
    }

    setSaving(true);
    const supabase = getSupabaseClient();
    const payload = buildExpensePayload(form);
    const result = editingId
      ? await supabase.from("expenses").update(payload).eq("id", editingId)
      : await supabase.from("expenses").insert({ ...payload, user_id: user.id });
    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    resetForm();
    setShowForm(false);
    await loadExpenses();
    setMessage(t(language, "expenseSaved"));
  }

  async function deleteExpense(id: string) {
    const supabase = getSupabaseClient();
    const { error: deleteError } = await supabase.from("expenses").delete().eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setExpenses((items) => items.filter((item) => item.id !== id));
  }

  return (
    <>
      <PageHeader
        eyebrow={t(language, "expenses").toUpperCase()}
        title={t(language, "expenses")}
        subtitle={t(language, "expensesSubtitle")}
        showBackToDashboard
        backToDashboardLabel={t(language, "backToDashboard")}
      >
        <button className="btn-primary" type="button" onClick={() => setShowForm(true)}>
          <Plus size={18} aria-hidden="true" />
          {t(language, "addExpense")}
        </button>
      </PageHeader>

      {message ? <p className="mb-4 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">{message}</p> : null}
      {error ? <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="space-y-5">
        <AppActionPanel
          icon={Plus}
          title={editingId ? t(language, "edit") : t(language, "addExpense")}
          subtitle={t(language, "expensesSubtitle")}
          expanded={showForm}
          onToggle={() => setShowForm((value) => !value)}
        >
          <ExpenseForm
            form={form}
            language={language}
            saving={saving}
            setForm={setForm}
            submitLabel={t(language, "addExpense")}
            onCancel={resetForm}
            onSubmit={saveExpense}
          />
        </AppActionPanel>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AppMetricCard icon={Receipt} label={t(language, "monthlyExpenses")} value={formatCurrency(monthlyTotal, currency)} tone="amber" />
          <AppMetricCard label={t(language, "selectedMonth")} value={formatMonthYear(`${selectedMonth}-01`, language)} />
          <AppMetricCard
            label={t(language, "biggestCategory")}
            value={biggestCategory ? `${expenseCategoryLabel(language, biggestCategory.category)} ${formatCurrency(biggestCategory.total, currency)}` : "-"}
            compact
          />
          <AppMetricCard
            label={t(language, "dailyAverage")}
            value={formatCurrency(dailyAverage, currency)}
            compact
          />
          <AppMetricCard
            label={t(language, "biggestExpense")}
            value={biggestExpense ? `${biggestExpense.merchant || expenseCategoryLabel(language, biggestExpense.category)} ${formatCurrency(biggestExpense.amount, currency)}` : "-"}
            compact
          />
        </div>

        <AppFilterBar>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button className="filter-pill" type="button" onClick={() => applyPreset("Walmart", "groceries")}>Walmart</button>
            <button className="filter-pill" type="button" onClick={() => applyPreset("Amazon", "amazon_online")}>Amazon</button>
            <button className="filter-pill" type="button" onClick={() => applyPreset(t(language, "fastFoodPreset"), "restaurant_fast_food")}>
              {t(language, "fastFoodPreset")}
            </button>
            <button className="filter-pill" type="button" onClick={() => applyPreset(t(language, "gasPreset"), "gas")}>
              {t(language, "gasPreset")}
            </button>
            <button className="filter-pill" type="button" onClick={() => applyPreset(t(language, "groceriesCategory"), "groceries")}>
              {t(language, "groceriesCategory")}
            </button>
            <button className="filter-pill" type="button" onClick={() => applyPreset(t(language, "otherCategory"), "other")}>
              {t(language, "otherCategory")}
            </button>
          </div>
        </AppFilterBar>

        {totalsByCategory.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {totalsByCategory.map((item) => (
              <button
                key={item.category}
                className={`filter-pill shrink-0 ${categoryFilter === item.category ? "filter-pill-active" : ""}`}
                type="button"
                onClick={() => setCategoryFilter(item.category)}
              >
                {expenseCategoryLabel(language, item.category)} {formatCurrency(item.total, currency)}
              </button>
            ))}
          </div>
        ) : null}

        <AppFilterBar>
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <label className="block space-y-2">
              <span className="field-label">{t(language, "selectedMonth")}</span>
              <input className="field" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
            </label>
            <label className="block space-y-2">
              <span className="field-label">{t(language, "category")}</span>
              <select className="field" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as ExpenseFilter)}>
                <option value="all">{t(language, "allCategories")}</option>
                {expenseCategories.map((category) => (
                  <option key={category} value={category}>
                    {expenseCategoryLabel(language, category)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </AppFilterBar>

        <section className="space-y-3">
          {loading ? (
            <div className="card p-5 text-sm text-neutral-600">{t(language, "loading")}</div>
          ) : filteredExpenses.length === 0 ? (
            <EmptyState icon={Receipt} title={t(language, "noExpensesYet")} body={t(language, "noExpensesHelper")}>
              <button className="btn-primary" type="button" onClick={() => setShowForm(true)}>
                <Plus size={17} aria-hidden="true" />
                {t(language, "addExpense")}
              </button>
            </EmptyState>
          ) : (
            filteredExpenses.map((expense) => (
              <AppListCard key={expense.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="icon-chip-sm">
                      <Receipt size={18} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-ink">{expense.merchant || expenseCategoryLabel(language, expense.category)}</p>
                      <p className="text-sm font-medium text-neutral-600">
                        {formatDate(expense.date, language)} • {expenseCategoryLabel(language, expense.category)}
                      </p>
                      {expense.notes ? <p className="mt-1 truncate text-sm text-neutral-600">{expense.notes}</p> : null}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <p className="text-lg font-black text-ink">{formatCurrency(expense.amount, currency)}</p>
                    <div className="flex gap-1.5">
                      <button className="btn-secondary min-h-9 px-2.5" type="button" onClick={() => editExpense(expense)}>
                        <Pencil size={15} aria-hidden="true" />
                        {t(language, "edit")}
                      </button>
                      <button className="btn-danger min-h-9 px-2.5" type="button" onClick={() => deleteExpense(expense.id)}>
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </AppListCard>
            ))
          )}
        </section>
      </div>
    </>
  );
}
