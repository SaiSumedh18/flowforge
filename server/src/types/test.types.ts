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