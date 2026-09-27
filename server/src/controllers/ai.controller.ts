import type {
    Request,
    Response,
} from "express";

import {
    pool,
} from "../config/db.js";

import {
    AI_FAILURE_MODEL,
    analyzeFailure,
} from "../services/aiFailure.service.js";


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


export async function analyzeJobRun(
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
            j.id AS job_id,
            j.name AS job_name,
            j.command,

            jr.id AS run_id,
            jr.status,
            jr.exit_code,
            jr.duration_ms,
            jr.logs,
            jr.error_message

          FROM jobs j

          INNER JOIN job_runs jr
            ON jr.job_id = j.id

          WHERE
            j.id = $1
            AND jr.id = $2
            AND j.user_id = $3
        `,
                [
                    jobId,
                    runId,
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


        const run =
            result.rows[0];


        if (
            run.status !==
            "FAILED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Only failed job runs can be analyzed",
            });
        }


        const analysis =
            await analyzeFailure({
                jobName:
                    run.job_name,

                command:
                    run.command,

                exitCode:
                    run.exit_code,

                durationMs:
                    run.duration_ms,

                logs:
                    run.logs,

                errorMessage:
                    run.error_message,
            });


        const savedResult =
            await pool.query(
                `
          INSERT INTO job_run_analyses (
            run_id,
            model,
            summary,
            likely_cause,
            explanation,
            suggested_fixes,
            retry_recommendation
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6::jsonb,
            $7
          )

          ON CONFLICT (run_id)
          DO UPDATE SET
            model =
              EXCLUDED.model,

            summary =
              EXCLUDED.summary,

            likely_cause =
              EXCLUDED.likely_cause,

            explanation =
              EXCLUDED.explanation,

            suggested_fixes =
              EXCLUDED.suggested_fixes,

            retry_recommendation =
              EXCLUDED.retry_recommendation

          RETURNING
            id,
            run_id,
            model,
            summary,
            likely_cause,
            explanation,
            suggested_fixes,
            retry_recommendation,
            created_at
        `,
                [
                    runId,
                    AI_FAILURE_MODEL,
                    analysis.summary,
                    analysis.likely_cause,
                    analysis.explanation,
                    JSON.stringify(
                        analysis.suggested_fixes
                    ),
                    analysis.retry_recommendation,
                ]
            );


        return res.status(200).json({
            success: true,

            message:
                "AI failure analysis generated",

            analysis:
                savedResult.rows[0],
        });
    } catch (error) {
        console.error(
            "AI failure analysis error:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Unable to generate or save AI failure analysis",
        });
    }
}


export async function getJobRunAnalysis(
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
            a.id,
            a.run_id,
            a.model,
            a.summary,
            a.likely_cause,
            a.explanation,
            a.suggested_fixes,
            a.retry_recommendation,
            a.created_at

          FROM job_run_analyses a

          INNER JOIN job_runs jr
            ON jr.id =
               a.run_id

          INNER JOIN jobs j
            ON j.id =
               jr.job_id

          WHERE
            a.run_id = $1
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
                    "AI analysis not found",
            });
        }


        return res.status(200).json({
            success: true,
            analysis:
                result.rows[0],
        });
    } catch (error) {
        console.error(
            "Get AI analysis error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load AI analysis",
        });
    }
}