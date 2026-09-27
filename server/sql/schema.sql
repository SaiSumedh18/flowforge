CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    command TEXT NOT NULL,

    schedule_type VARCHAR(20) NOT NULL
        DEFAULT 'MANUAL'
        CHECK (
            schedule_type IN (
                'MANUAL',
                'INTERVAL'
            )
        ),

    interval_seconds INTEGER
        CHECK (
            interval_seconds IS NULL
            OR interval_seconds > 0
        ),

    is_active BOOLEAN NOT NULL
        DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    CHECK (
        (
            schedule_type = 'MANUAL'
            AND interval_seconds IS NULL
        )
        OR
        (
            schedule_type = 'INTERVAL'
            AND interval_seconds IS NOT NULL
        )
    )
);


CREATE TABLE IF NOT EXISTS job_runs (
    id SERIAL PRIMARY KEY,

    job_id INTEGER NOT NULL
        REFERENCES jobs(id)
        ON DELETE CASCADE,

    status VARCHAR(20) NOT NULL
        DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'RUNNING',
                'SUCCESS',
                'FAILED'
            )
        ),

    started_at TIMESTAMPTZ,

    finished_at TIMESTAMPTZ,

    duration_ms INTEGER
        CHECK (
            duration_ms IS NULL
            OR duration_ms >= 0
        ),

    exit_code INTEGER,

    logs TEXT,

    error_message TEXT,

    retry_of_run_id INTEGER
        REFERENCES job_runs(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS job_run_analyses (
    id SERIAL PRIMARY KEY,

    run_id INTEGER NOT NULL UNIQUE
        REFERENCES job_runs(id)
        ON DELETE CASCADE,

    model VARCHAR(100) NOT NULL,

    summary TEXT NOT NULL,

    likely_cause TEXT NOT NULL,

    explanation TEXT NOT NULL,

    suggested_fixes JSONB NOT NULL,

    retry_recommendation VARCHAR(30) NOT NULL
        CHECK (
            retry_recommendation IN (
                'SAFE_TO_RETRY',
                'RETRY_AFTER_FIX',
                'DO_NOT_RETRY_YET'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_jobs_user_id
    ON jobs(user_id);


CREATE INDEX IF NOT EXISTS idx_jobs_active
    ON jobs(is_active);


CREATE INDEX IF NOT EXISTS idx_job_runs_job_id
    ON job_runs(job_id);


CREATE INDEX IF NOT EXISTS idx_job_runs_status
    ON job_runs(status);


CREATE INDEX IF NOT EXISTS idx_job_runs_created_at
    ON job_runs(created_at DESC);