import type {
  Bill,
  BillOccurrenceStatus,
  DailyIncomeEntry,
  DriverLog,
  GasStation,
  PaySchedule,
  Profile,
  Vehicle
} from "@/types/app";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Omit<Profile, "id" | "created_at" | "updated_at">> & { user_id: string };
        Update: Partial<Omit<Profile, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      pay_schedules: {
        Row: PaySchedule;
        Insert: Partial<Omit<PaySchedule, "id" | "created_at" | "updated_at">> & { user_id: string };
        Update: Partial<Omit<PaySchedule, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      bills: {
        Row: Bill;
        Insert: Partial<Omit<Bill, "id" | "created_at" | "updated_at">> & { user_id: string; name: string; amount: number; due_date: string };
        Update: Partial<Omit<Bill, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      bill_occurrences: {
        Row: BillOccurrenceStatus;
        Insert: Partial<Omit<BillOccurrenceStatus, "id" | "created_at" | "updated_at">> & {
          user_id: string;
          bill_id: string;
          occurrence_date: string;
        };
        Update: Partial<Omit<BillOccurrenceStatus, "id" | "user_id" | "bill_id" | "occurrence_date" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      gas_stations: {
        Row: GasStation;
        Insert: Partial<Omit<GasStation, "id" | "created_at" | "updated_at">> & { user_id: string; name: string };
        Update: Partial<Omit<GasStation, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      vehicles: {
        Row: Vehicle;
        Insert: Partial<Omit<Vehicle, "id" | "created_at" | "updated_at">> & { user_id: string; nickname: string };
        Update: Partial<Omit<Vehicle, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      daily_income_entries: {
        Row: DailyIncomeEntry;
        Insert: Partial<Omit<DailyIncomeEntry, "id" | "created_at" | "updated_at">> & { user_id: string; date: string; platform: string };
        Update: Partial<Omit<DailyIncomeEntry, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      driver_logs: {
        Row: DriverLog;
        Insert: Partial<Omit<DriverLog, "id" | "created_at" | "updated_at">> & { user_id: string; date: string; platform: string };
        Update: Partial<Omit<DriverLog, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
