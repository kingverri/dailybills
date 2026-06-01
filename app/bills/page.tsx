"use client";

import { CheckCircle2, ChevronDown, ChevronUp, CircleDollarSign, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { billCategories, billRecurrences, billStatuses } from "@/lib/constants";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { billRecurrenceLabel, t } from "@/lib/i18n";
import { canAddBill, getCurrentPlan } from "@/lib/planLimits";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import type { Bill, BillCategory, BillRecurrence, BillStatus } from "@/types/app";

type BillForm = {
  name: string;
  amount: string;
  due_date: string;
  recurrence: BillRecurrence;
  category: BillCategory;
  status: BillStatus;
  notes: string;
};

type BillFilter = "all" | "unpaid" | "paid" | "due_soon";
type BillSort = "due_date" | "amount";

const initialForm: BillForm = {
  name: "",
  amount: "",
  due_date: toDateInputValue(),
  recurrence: "monthly",
  category: "Rent",
  status: "unpaid",
  notes: ""
};

export default function BillsPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [form, setForm] = useState<BillForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<BillFilter>("all");
  const [sortBy, setSortBy] = useState<BillSort>("due_date");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currency = profile?.currency ?? "USD";
  const language = profile?.language ?? "en";
  const currentPlan = getCurrentPlan(profile);
  const canCreateBill = canAddBill(currentPlan, bills.length);
  const sortedBills = useMemo(() => {
    const today = toDateInputValue(new Date());
    const dueSoonEnd = new Date();
    dueSoonEnd.setDate(dueSoonEnd.getDate() + 7);
    const dueSoonEndValue = toDateInputValue(dueSoonEnd);

    return bills
      .filter((bill) => {
        if (filter === "unpaid") {
          return bill.status === "unpaid";
        }
        if (filter === "paid") {
          return bill.status === "paid";
        }
        if (filter === "due_soon") {
          return bill.status === "unpaid" && bill.due_date >= today && bill.due_date <= dueSoonEndValue;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "amount") {
          return Number(b.amount) - Number(a.amount);
        }
        return a.due_date.localeCompare(b.due_date);
      });
  }, [bills, filter, sortBy]);

  async function loadBills() {
    if (!user) {
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    const { data, error: loadError } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });

    if (loadError) {
      setError(loadError.message);
    } else {
      setBills(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadBills().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setError("");
  }

  function editBill(bill: Bill) {
    setEditingId(bill.id);
    setShowForm(true);
    setForm({
      name: bill.name,
      amount: String(bill.amount),
      due_date: bill.due_date,
      recurrence: bill.recurrence,
      category: bill.category,
      status: bill.status,
      notes: bill.notes ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!user) {
      setError(t(language, "loginAgain"));
      return;
    }

    if (!editingId && !canCreateBill) {
      setError(t(language, "freeBillLimitMessage"));
      return;
    }

    const amount = Number(form.amount);
    if (!form.name.trim() || !form.due_date || !Number.isFinite(amount) || amount < 0) {
      setError(t(language, "billRequiredError"));
      return;
    }

    setSaving(true);
    const supabase = getSupabaseClient();
    const payload = {
      name: form.name.trim(),
      amount,
      due_date: form.due_date,
      recurrence: form.recurrence,
      category: form.category,
      status: form.status,
      notes: form.notes.trim() || null
    };

    const result = editingId
      ? await supabase.from("bills").update(payload).eq("id", editingId)
      : await supabase.from("bills").insert({ ...payload, user_id: user.id });

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (editingId) {
      resetForm();
      setShowForm(false);
      await loadBills();
      return;
    }

    router.push("/dashboard");
  }

  async function deleteBill(id: string) {
    const supabase = getSupabaseClient();
    const { error: deleteError } = await supabase.from("bills").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setBills((items) => items.filter((item) => item.id !== id));
  }

  async function toggleStatus(bill: Bill) {
    const nextStatus: BillStatus = bill.status === "paid" ? "unpaid" : "paid";
    const supabase = getSupabaseClient();
    const { error: updateError } = await supabase.from("bills").update({ status: nextStatus }).eq("id", bill.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setBills((items) => items.map((item) => (item.id === bill.id ? { ...item, status: nextStatus } : item)));
  }

  return (
    <>
      <PageHeader
        eyebrow={t(language, "bills")}
        title={t(language, "upcomingObligations")}
        subtitle={t(language, "billsSubtitle")}
        showBackToDashboard
        backToDashboardLabel={t(language, "backToDashboard")}
      />

      <div className="space-y-5">
        <section className="card p-4">
          <button
            className="flex w-full items-center justify-between gap-3 text-left"
            type="button"
            onClick={() => setShowForm((value) => !value)}
          >
            <span className="text-lg font-semibold text-ink">{editingId ? t(language, "editBill") : t(language, "addBillForm")}</span>
            {showForm ? <ChevronUp className="text-brand-700" size={20} aria-hidden="true" /> : <ChevronDown className="text-brand-700" size={20} aria-hidden="true" />}
          </button>

          {showForm ? (
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>

          <label className="block space-y-2">
            <span className="field-label">{t(language, "billName")}</span>
            <input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="field-label">{t(language, "amount")}</span>
              <input className="field" inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
            </label>
            <label className="block space-y-2">
              <span className="field-label">{t(language, "dueDate")}</span>
              <input className="field" type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="field-label">{t(language, "recurrence")}</span>
              <select className="field" value={form.recurrence} onChange={(event) => setForm({ ...form, recurrence: event.target.value as BillRecurrence })}>
                {billRecurrences.map((value) => (
                  <option key={value} value={value}>
                    {billRecurrenceLabel(language, value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="field-label">{t(language, "category")}</span>
              <select className="field" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as BillCategory })}>
                {billCategories.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-2">
            <span className="field-label">{t(language, "status")}</span>
            <select className="field" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as BillStatus })}>
              {billStatuses.map((value) => (
                <option key={value} value={value}>
                  {value === "paid" ? t(language, "paid") : t(language, "unpaid")}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="field-label">{t(language, "notes")}</span>
            <textarea className="field min-h-24" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {!editingId && !canCreateBill ? (
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
              <p>{t(language, "freeBillLimitMessage")}</p>
              <Link className="btn-primary mt-3" href="/pricing">
                {t(language, "upgrade")}
              </Link>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button className="btn-primary flex-1" type="submit" disabled={saving || (!editingId && !canCreateBill)}>
              <Plus size={18} aria-hidden="true" />
              {saving ? t(language, "saving") : editingId ? t(language, "saveBill") : t(language, "addBill")}
            </button>
            {editingId ? (
              <button className="btn-secondary" type="button" onClick={resetForm}>
                {t(language, "cancel")}
              </button>
            ) : null}
            <Link className="btn-secondary flex-1" href="/dashboard">
              {t(language, "backToDashboard")}
            </Link>
          </div>
            </form>
          ) : null}
        </section>

        <section className="space-y-3">
          <div className="card space-y-3 p-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(["all", "unpaid", "paid", "due_soon"] as BillFilter[]).map((value) => (
                <button
                  key={value}
                  className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    filter === value ? "bg-brand-50 text-brand-700" : "bg-neutral-50 text-neutral-600 hover:text-ink"
                  }`}
                  type="button"
                  onClick={() => setFilter(value)}
                >
                  {value === "all"
                    ? t(language, "all")
                    : value === "due_soon"
                      ? t(language, "dueSoon")
                      : value === "paid"
                        ? t(language, "paid")
                        : t(language, "unpaid")}
                </button>
              ))}
            </div>
            <select className="field py-2 text-sm sm:max-w-48" value={sortBy} onChange={(event) => setSortBy(event.target.value as BillSort)}>
              <option value="due_date">{t(language, "dueDate")}</option>
              <option value="amount">{t(language, "amount")}</option>
            </select>
          </div>
          {loading ? (
            <div className="card p-5 text-sm text-neutral-600">{t(language, "loadingBills")}</div>
          ) : sortedBills.length === 0 ? (
            <EmptyState icon={CircleDollarSign} title={t(language, "noBillsYet")} body={t(language, "noBillsHelper")}>
              <button className="btn-primary" type="button" onClick={() => setShowForm(true)}>
                <Plus size={17} aria-hidden="true" />
                {t(language, "addBill")}
              </button>
            </EmptyState>
          ) : (
            sortedBills.map((bill) => (
              <article key={bill.id} className="card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{bill.name}</p>
                    <p className="text-sm text-neutral-600">
                      {t(language, "due")} {formatDate(bill.due_date, language)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-neutral-50 px-2 py-1 text-neutral-600">
                        {bill.status === "paid" ? t(language, "paid") : t(language, "unpaid")}
                      </span>
                      <span className="rounded-full bg-neutral-50 px-2 py-1 text-neutral-600">
                        {billRecurrenceLabel(language, bill.recurrence)}
                      </span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-ink">{formatCurrency(bill.amount, currency)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-secondary" type="button" onClick={() => toggleStatus(bill)}>
                    <CheckCircle2 size={17} aria-hidden="true" />
                    {bill.status === "paid" ? t(language, "markUnpaid") : t(language, "markPaid")}
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => editBill(bill)}>
                    <Pencil size={17} aria-hidden="true" />
                    {t(language, "edit")}
                  </button>
                  <button className="btn-danger" type="button" onClick={() => deleteBill(bill.id)}>
                    <Trash2 size={17} aria-hidden="true" />
                    {t(language, "delete")}
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </>
  );
}
