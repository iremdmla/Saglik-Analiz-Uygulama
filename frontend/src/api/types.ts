export type Role = "ADMIN" | "USER";
export type Status = "normal" | "low" | "high" | "unknown";

export interface User {
  id: number;
  email: string;
  username: string | null;
  full_name: string;
  role: Role;
  is_active: boolean;
  is_demo: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface Profile {
  birth_date: string | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  blood_type: string | null;
  chronic_conditions: string | null;
  medications: string | null;
  allergies: string | null;
  activity_level: string | null;
  notes: string | null;
  bmi: number | null;
  bmi_category: string | null;
  age: number | null;
}

export interface MeasurementType {
  id: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  ref_min: number | null;
  ref_max: number | null;
  description: string | null;
}

export interface Measurement {
  id: number;
  record_id: number | null;
  type_id: number;
  type_code: string;
  type_name: string;
  category: string;
  value: number;
  unit: string;
  measured_at: string;
  ref_min: number | null;
  ref_max: number | null;
  source: string;
  note: string | null;
  is_demo: boolean;
  status: Status;
}

export interface MeasurementInput {
  type_id: number;
  value: number;
  unit?: string | null;
  measured_at: string;
  ref_min?: number | null;
  ref_max?: number | null;
  source?: string;
  note?: string | null;
}

export interface HealthRecord {
  id: number;
  title: string;
  category: string;
  record_date: string;
  source: string;
  notes: string | null;
  document_id: number | null;
  is_demo: boolean;
  created_at: string;
  measurements: Measurement[];
  abnormal_count: number;
}

export interface AnalysisItem {
  type_id: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  latest_value: number;
  latest_date: string;
  previous_value: number | null;
  change: number | null;
  change_pct: number | null;
  trend: "up" | "down" | "stable" | "insufficient";
  slope_per_30_days: number | null;
  ref_min: number | null;
  ref_max: number | null;
  status: Status;
  count: number;
  notes: string[];
}

export interface AnalysisResult {
  generated_at: string;
  total_types: number;
  normal_count: number;
  abnormal_count: number;
  unknown_count: number;
  bmi: number | null;
  bmi_category: string | null;
  items: AnalysisItem[];
  insights: string[];
  disclaimer: string;
}

export interface Overview extends AnalysisResult {
  recent_measurements: Measurement[];
  record_count: number;
  measurement_count: number;
  recent_documents: { id: number; title: string; status: string; uploaded_at: string; is_demo: boolean }[];
}

export interface ExtractionItem {
  type_id: number | null;
  type_name: string | null;
  label: string;
  value: number;
  unit: string | null;
  ref_min: number | null;
  ref_max: number | null;
}

export interface DocumentItem {
  id: number;
  title: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  status: "uploaded" | "extracted" | "imported" | "failed";
  is_demo: boolean;
  uploaded_at: string;
  extraction: {
    method: string;
    raw_text: string | null;
    items: ExtractionItem[];
    message: string | null;
    confirmed_at: string | null;
  } | null;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  actor: string | null;
  action: string;
  description: string;
  entity_type: string | null;
  entity_id: number | null;
  success: boolean;
  ip_address: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}
