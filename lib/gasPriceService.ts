"use client";

import { getSupabaseClient } from "@/lib/supabase";

export type GasPriceResult = {
  stationId: string;
  price: number;
  lastUpdated: string | null;
  source: "manual" | "external-api-placeholder";
};

export async function getLatestGasPrice(stationId: string): Promise<GasPriceResult> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("gas_stations")
    .select("id,current_price,last_updated")
    .eq("id", stationId)
    .single();

  if (error) {
    throw error;
  }

  return {
    stationId,
    price: Number(data.current_price ?? 0),
    lastUpdated: data.last_updated,
    source: "manual"
  };
}

export async function updateManualGasPrice(stationId: string, price: number) {
  const supabase = getSupabaseClient();
  const lastUpdated = new Date().toISOString();

  const { error } = await supabase
    .from("gas_stations")
    .update({ current_price: price, last_updated: lastUpdated })
    .eq("id", stationId);

  if (error) {
    throw error;
  }

  return { price, lastUpdated };
}
