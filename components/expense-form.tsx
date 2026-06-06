"use client";

import { Plus } from "lucide-react";
import { expenseCategories } from "@/lib/constants";
import { toDateInputValue } from "@/lib/format";
import { expenseCategoryLabel, t } from "@/lib/i18n";
import type { Expense, ExpenseCategory } from "@/types/app";

export type ExpenseFormValues = {
  date: string;
  amount: string;
  merchant: string;
  category: ExpenseCategory;
  notes: string;
};

export function createExpenseForm(expense?: Expense | null): ExpenseFormValues {
  return {
    date: expense?.date ?? toDateInputValue(),
    amount: expense ? String(expense.amount) : "",
    merchant: expense?.merchant ?? "",
    category: expense?.category ?? "other",
    notes: expense?.notes ?? ""
  };
}

export function validateExpenseForm(form: ExpenseFormValues) {
  const amount = Number(form.amount);
  return Boolean(form.date && Number.isFinite(amount) && amount > 0);
}

export function buildExpensePayload(form: ExpenseFormValues) {
  return {
    date: form.date,
    amount: Number(form.amount || 0),
    merchant: form.merchant.trim() || null,
    category: form.category,
    notes: form.notes.trim() || null
  };
}

export function ExpenseForm({
  form,
  setForm,
  language,
  saving,
  submitLabel,
  onSubmit,
  onCancel
}: {
  form: ExpenseFormValues;
  setForm: (form: ExpenseFormValues) => void;
  language: string;
  saving?: boolean;
  submitLabel: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="field-label">{t(language, "date")}</span>
          <input className="field" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
        </label>
        <label className="block space-y-2">
          <span className="field-label">{t(language, "amount")}</span>
          <input className="field" inputMode="decimal" placeholder="85.42" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="field-label">{t(language, "merchant")}</span>
        <input className="field" placeholder="Walmart" value={form.merchant} onChange={(event) => setForm({ ...form, merchant: event.target.value })} />
      </label>

      <label className="block space-y-2">
        <span className="field-label">{t(language, "category")}</span>
        <select className="field" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ExpenseCategory })}>
          {expenseCategories.map((category) => (
            <option key={category} value={category}>
              {expenseCategoryLabel(language, category)}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="field-label">{t(language, "notes")}</span>
        <textarea className="field min-h-24" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      </label>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary flex-1" type="submit" disabled={saving}>
          <Plus size={18} aria-hidden="true" />
          {saving ? t(language, "saving") : submitLabel}
        </button>
        {onCancel ? (
          <button className="btn-secondary flex-1" type="button" onClick={onCancel}>
            {t(language, "cancel")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
