import type {
    Request,
    Response,
} from "express";

import {
    pool,
} from "../config/db.js";

import {
    executeJobRun,
} from "../services/jobExecution.service.js";


function parsePositiveId(
    value:
        | string
        | string[]
        | undefined
) {
    if (
        typeof value !==
        "string"
    ) {
        return null;
    }

    const id =
        Number(value);

    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {
        return null;
    }

    return id;
}


export async function runJob(
    req: Request,
    res: Response
) {
    const userId =
        req.userId;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message:
                "Authentication required",
        });
    }

    const jobId =
        parsePositiveId(
            req.params.id
        );

    if (!jobId) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid job ID",
        });
    }

    try {
        const jobResult =
            await pool.query(
                `
          SELECT
            id,
            command,
            is_active
          FROM jobs
          WHERE id = $1
            AND user_id = $2
        `,
                [
                    jobId,
                    userId,
                ]
            );

        if (
            !jobResult.rowCount ||
            jobResult.rowCount === 0
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Job not found",
            });
        }

        const job =
            jobResult.rows[0];

        if (!job.is_active) {
            return res.status(400).json({
                success: false,
                message:
                    "Inactive jobs cannot be run",
            });
        }

        const runResult =
            await pool.query(
                `
          INSERT INTO job_runs (
            job_id,
            status
          )
          VALUES (
            $1,
            'PENDING'
          )
          RETURNING *
        `,
                [
                    jobId,
                ]
            );

        const run =
            runResult.rows[0];

        setImmediate(
            () => {
                void executeJobRun(
                    run.id,
                    job.command
                );
            }
        );

        return res.status(202).json({
            success: true,
            message:
                "Job execution started",
            run,
        });
    } catch (error) {
        console.error(
            "Run job error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to start job",
        });
    }
}


export async function listJobRuns(
    req: Request,
    res: Response
) {
    const userId =
        req.userId;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message:
                "Authentication required",
        });
    }

    const jobId =
        parsePositiveId(
            req.params.id
        );

    if (!jobId) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid job ID",
        });
    }

    try {
        const jobResult =
            await pool.query(
                `
          SELECT id
          FROM jobs
          WHERE id = $1
            AND user_id = $2
        `,
                [
                    jobId,
                    userId,
                ]
            );

        if (
            !jobResult.rowCount ||
            jobResult.rowCount === 0
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Job not found",
            });
        }

        const runs =
            await pool.query(
                `
          SELECT
            id,
            job_id,
            status,
            started_at,
            finished_at,
            duration_ms,
            exit_code,
            logs,
            error_message,
            retry_of_run_id,
            created_at
          FROM job_runs
          WHERE job_id = $1
          ORDER BY created_at DESC
        `,
                [
                    jobId,
                ]
            );

        return res.status(200).json({
            success: true,
            runs:
                runs.rows,
        });
    } catch (error) {
        console.error(
            "List job runs error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load execution history",
        });
    }
}


export async function getJobRun(
    req: Request,
    res: Response
) {
    const userId =
        req.userId;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message:
                "Authentication required",
        });
    }

    const jobId =
        parsePositiveId(
            req.params.id
        );

    const runId =
        parsePositiveId(
            req.params.runId
        );

    if (
        !jobId ||
        !runId
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid job or run ID",
        });
    }

    try {
        const result =
            await pool.query(
                `
          SELECT
            jr.id,
            jr.job_id,
            jr.status,
            jr.started_at,
            jr.finished_at,
            jr.duration_ms,
            jr.exit_code,
            jr.logs,
            jr.error_message,
            jr.retry_of_run_id,
            jr.created_at
          FROM job_runs jr
          INNER JOIN jobs j
            ON j.id =
               jr.job_id
          WHERE jr.id = $1
            AND jr.job_id = $2
            AND j.user_id = $3
        `,
                [
                    runId,
                    jobId,
                    userId,
                ]
            );

        if (
            !result.rowCount ||
            result.rowCount === 0
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Job run not found",
            });
        }

        return res.status(200).json({
            success: true,
            run:
                result.rows[0],
        });
    } catch (error) {
        console.error(
            "Get job run error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load job run",
        });
    }
}


export async function retryJobRun(
    req: Request,
    res: Response
) {
    const userId =
        req.userId;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message:
                "Authentication required",
        });
    }

    const jobId =
        parsePositiveId(
            req.params.id
        );

    const runId =
        parsePositiveId(
            req.params.runId
        );

    if (
        !jobId ||
        !runId
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid job or run ID",
        });
    }

    try {
        const result =
            await pool.query(
                `
          SELECT
            jr.id AS run_id,
            jr.status,
            j.id AS job_id,
            j.command,
            j.is_active
          FROM job_runs jr
          INNER JOIN jobs j
            ON j.id = jr.job_id
          WHERE jr.id = $1
            AND jr.job_id = $2
            AND j.user_id = $3
        `,
                [
                    runId,
                    jobId,
                    userId,
                ]
            );

        if (
            !result.rowCount ||
            result.rowCount === 0
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Job run not found",
            });
        }

        const originalRun =
            result.rows[0];

        if (
            originalRun.status !==
            "FAILED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Only failed job runs can be retried",
            });
        }

        if (
            !originalRun.is_active
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Inactive jobs cannot be retried",
            });
        }

        const retryResult =
            await pool.query(
                `
          INSERT INTO job_runs (
            job_id,
            status,
            retry_of_run_id
          )
          VALUES (
            $1,
            'PENDING',
            $2
          )
          RETURNING *
        `,
                [
                    jobId,
                    runId,
                ]
            );

        const retryRun =
            retryResult.rows[0];

        setImmediate(
            () => {
                void executeJobRun(
                    retryRun.id,
                    originalRun.command
                );
            }
        );

        return res.status(202).json({
            success: true,
            message:
                "Retry started",
            run:
                retryRun,
        });
    } catch (error) {
        console.error(
            "Retry job run error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to retry job run",
        });
    }
}