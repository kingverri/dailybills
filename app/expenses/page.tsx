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
import type { Expense, ExpenseCategory } from "@/types/app";

type ExpenseFilter = ExpenseCategory | "all";

function currentMonthValue() {
  return toDateInputValue().slice(0, 7);
}

export default function ExpensesPage() {
  const { user, profile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState<ExpenseFormValues>(() => createExpenseForm());
  const [editingId, setEditingId] = useState<string | null>(null);
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
    setForm(createExpenseForm());
    setEditingId(null);
    setError("");
  }

  function editExpense(expense: Expense) {
    setEditingId(expense.id);
    setForm(createExpenseForm(expense));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        title={t(language, "dailyExpenses")}
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
            onCancel={editingId ? resetForm : undefined}
            onSubmit={saveExpense}
          />
        </AppActionPanel>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AppMetricCard icon={Receipt} label={t(language, "monthlyTotal")} value={formatCurrency(monthlyTotal, currency)} tone="amber" />
          <AppMetricCard label={t(language, "selectedMonth")} value={formatMonthYear(`${selectedMonth}-01`, language)} />
          {totalsByCategory.slice(0, 2).map((item) => (
            <AppMetricCard
              key={item.category}
              label={expenseCategoryLabel(language, item.category)}
              value={formatCurrency(item.total, currency)}
              compact
            />
          ))}
        </div>

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
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-ink">{expense.merchant || expenseCategoryLabel(language, expense.category)}</p>
                    <p className="text-sm font-medium text-neutral-600">{formatDate(expense.date, language)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="badge badge-muted">{expenseCategoryLabel(language, expense.category)}</span>
                    </div>
                    {expense.notes ? <p className="mt-2 text-sm text-neutral-600">{expense.notes}</p> : null}
                  </div>
                  <p className="text-xl font-black text-ink">{formatCurrency(expense.amount, currency)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-secondary" type="button" onClick={() => editExpense(expense)}>
                    <Pencil size={17} aria-hidden="true" />
                    {t(language, "edit")}
                  </button>
                  <button className="btn-danger" type="button" onClick={() => deleteExpense(expense.id)}>
                    <Trash2 size={17} aria-hidden="true" />
                    {t(language, "delete")}
                  </button>
                </div>
              </AppListCard>
            ))
          )}
        </section>
      </div>
    </>
  );
}
