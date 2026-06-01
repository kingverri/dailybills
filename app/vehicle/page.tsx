"use client";

import { Car, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { fuelTypes } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";
import type { FuelType, Vehicle } from "@/types/app";

type VehicleForm = {
  nickname: string;
  make: string;
  model: string;
  year: string;
  mpg: string;
  fuel_type: FuelType;
  monthly_maintenance_estimate: string;
};

const initialForm: VehicleForm = {
  nickname: "",
  make: "",
  model: "",
  year: String(new Date().getFullYear()),
  mpg: "",
  fuel_type: "Regular",
  monthly_maintenance_estimate: ""
};

export default function VehiclePage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<VehicleForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const language = profile?.language ?? "en";

  async function loadVehicles() {
    if (!user) {
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    const { data, error: loadError } = await supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
    } else {
      setVehicles(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadVehicles().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setError("");
  }

  function editVehicle(vehicle: Vehicle) {
    setEditingId(vehicle.id);
    setForm({
      nickname: vehicle.nickname,
      make: vehicle.make,
      model: vehicle.model,
      year: String(vehicle.year),
      mpg: String(vehicle.mpg),
      fuel_type: vehicle.fuel_type,
      monthly_maintenance_estimate: vehicle.monthly_maintenance_estimate
        ? String(vehicle.monthly_maintenance_estimate)
        : ""
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!user) {
      setError(t(language, "loginAgain"));
      return;
    }

    const year = Number(form.year);
    const mpg = Number(form.mpg);
    const maintenance = Number(form.monthly_maintenance_estimate || 0);

    if (!form.nickname.trim() || !Number.isFinite(year) || !Number.isFinite(mpg) || mpg < 0) {
      setError(t(language, "vehicleRequiredError"));
      return;
    }

    setSaving(true);
    const supabase = getSupabaseClient();
    const payload = {
      nickname: form.nickname.trim(),
      make: form.make.trim(),
      model: form.model.trim(),
      year,
      mpg,
      fuel_type: form.fuel_type,
      monthly_maintenance_estimate: Number.isFinite(maintenance) ? maintenance : 0
    };

    const result = editingId
      ? await supabase.from("vehicles").update(payload).eq("id", editingId)
      : await supabase.from("vehicles").insert({ ...payload, user_id: user.id });

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (editingId) {
      resetForm();
      await loadVehicles();
      return;
    }

    router.push("/dashboard");
  }

  async function deleteVehicle(id: string) {
    const supabase = getSupabaseClient();
    const { error: deleteError } = await supabase.from("vehicles").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setVehicles((items) => items.filter((item) => item.id !== id));
  }

  return (
    <>
      <PageHeader
        eyebrow={t(language, "vehicle")}
        title={t(language, "vehicleTitle")}
        subtitle={t(language, "vehicleSubtitle")}
        showBackToDashboard
        backToDashboardLabel={t(language, "backToDashboard")}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_1fr]">
        <form className="card space-y-4 p-4" onSubmit={handleSubmit}>
          <h2 className="text-lg font-semibold text-ink">
            {editingId ? t(language, "editVehicle") : t(language, "addVehicle")}
          </h2>

          <label className="block space-y-2">
            <span className="field-label">{t(language, "vehicleNickname")}</span>
            <input className="field" placeholder="Work car" value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="field-label">{t(language, "make")}</span>
              <input className="field" value={form.make} onChange={(event) => setForm({ ...form, make: event.target.value })} />
            </label>
            <label className="block space-y-2">
              <span className="field-label">{t(language, "model")}</span>
              <input className="field" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="field-label">{t(language, "year")}</span>
              <input className="field" inputMode="numeric" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} />
            </label>
            <label className="block space-y-2">
              <span className="field-label">{t(language, "averageMpg")}</span>
              <input className="field" inputMode="decimal" value={form.mpg} onChange={(event) => setForm({ ...form, mpg: event.target.value })} />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="field-label">{t(language, "fuelType")}</span>
            <select className="field" value={form.fuel_type} onChange={(event) => setForm({ ...form, fuel_type: event.target.value as FuelType })}>
              {fuelTypes.map((fuel) => (
                <option key={fuel}>{fuel}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="field-label">{t(language, "monthlyMaintenanceEstimate")}</span>
            <input className="field" inputMode="decimal" value={form.monthly_maintenance_estimate} onChange={(event) => setForm({ ...form, monthly_maintenance_estimate: event.target.value })} />
          </label>

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button className="btn-primary flex-1" type="submit" disabled={saving}>
              <Plus size={18} aria-hidden="true" />
              {saving ? t(language, "saving") : editingId ? t(language, "saveVehicle") : t(language, "addVehicle")}
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

        <section className="space-y-3">
          {loading ? (
            <div className="card p-5 text-sm text-neutral-600">{t(language, "loadingVehicles")}</div>
          ) : vehicles.length === 0 ? (
            <EmptyState icon={Car} title={t(language, "noVehicleYet")} body={t(language, "noVehicleHelper")}>
              <button className="btn-primary" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                <Plus size={17} aria-hidden="true" />
                {t(language, "addVehicle")}
              </button>
            </EmptyState>
          ) : (
            vehicles.map((vehicle) => (
              <article key={vehicle.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{vehicle.nickname}</p>
                    <p className="text-sm text-neutral-600">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-ink">{vehicle.mpg} MPG</p>
                </div>
                <p className="mt-3 text-sm text-neutral-600">
                  {vehicle.fuel_type} {t(language, "fuel")} · {t(language, "maintenance")}{" "}
                  {formatCurrency(vehicle.monthly_maintenance_estimate ?? 0, profile?.currency ?? "USD")}/mo
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn-secondary" type="button" onClick={() => editVehicle(vehicle)}>
                    <Pencil size={17} aria-hidden="true" />
                    {t(language, "edit")}
                  </button>
                  <button className="btn-danger" type="button" onClick={() => deleteVehicle(vehicle.id)}>
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
