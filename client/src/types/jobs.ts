export interface Job {
  id: number;
  name: string;
  description: string | null;
  command: string;
  schedule_type:
  | "MANUAL"
  | "INTERVAL";
  interval_seconds:
  | number
  | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type JobInput =
  Pick<
    Job,
    | "name"
    | "description"
    | "command"
    | "schedule_type"
    | "interval_seconds"
  >;

export interface JobRun {
  id: number;
  job_id: number;

  status:
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED";

  started_at:
  | string
  | null;

  finished_at:
  | string
  | null;

  duration_ms:
  | number
  | null;

  exit_code:
  | number
  | null;

  logs:
  | string
  | null;

  error_message:
  | string
  | null;

  retry_of_run_id:
  | number
  | null;

  created_at: string;
}

export interface AIAnalysis {
  id: number;
  run_id: number;
  model: string;
  summary: string;
  likely_cause: string;
  explanation: string;
  suggested_fixes: string[];

  retry_recommendation:
  | "SAFE_TO_RETRY"
  | "RETRY_AFTER_FIX"
  | "DO_NOT_RETRY_YET";

  created_at: string;
}