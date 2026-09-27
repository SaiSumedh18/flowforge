import type {
    Request,
    Response,
} from "express";

import {
    z,
} from "zod";

import {
    pool,
} from "../config/db.js";


const createJobSchema =
    z.object({
        name:
            z.string()
                .trim()
                .min(
                    2,
                    "Job name must contain at least 2 characters"
                )
                .max(
                    150,
                    "Job name is too long"
                ),

        description:
            z.string()
                .trim()
                .max(
                    1000,
                    "Description is too long"
                )
                .optional()
                .nullable(),

        command:
            z.string()
                .trim()
                .min(
                    1,
                    "Command is required"
                )
                .max(
                    2000,
                    "Command is too long"
                ),

        schedule_type:
            z.enum([
                "MANUAL",
                "INTERVAL",
            ])
                .default(
                    "MANUAL"
                ),

        interval_seconds:
            z.number()
                .int()
                .positive()
                .optional()
                .nullable(),
    });


const updateJobSchema =
    z.object({
        name:
            z.string()
                .trim()
                .min(2)
                .max(150)
                .optional(),

        description:
            z.string()
                .trim()
                .max(1000)
                .nullable()
                .optional(),

        command:
            z.string()
                .trim()
                .min(1)
                .max(2000)
                .optional(),

        schedule_type:
            z.enum([
                "MANUAL",
                "INTERVAL",
            ])
                .optional(),

        interval_seconds:
            z.number()
                .int()
                .positive()
                .nullable()
                .optional(),

        is_active:
            z.boolean()
                .optional(),
    });


function getUserId(
    req: Request
) {
    return req.userId;
}


function getJobId(
    req: Request
) {
    const jobId =
        Number(
            req.params.id
        );

    if (
        !Number.isInteger(jobId) ||
        jobId <= 0
    ) {
        return null;
    }

    return jobId;
}


export async function createJob(
    req: Request,
    res: Response
) {
    const userId =
        getUserId(req);

    if (!userId) {
        return res.status(401).json({
            success: false,
            message:
                "Authentication required",
        });
    }

    const parsed =
        createJobSchema.safeParse(
            req.body
        );

    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message:
                parsed.error.issues[0]
                    ?.message ??
                "Invalid job data",
        });
    }

    const {
        name,
        description,
        command,
        schedule_type,
        interval_seconds,
    } =
        parsed.data;

    if (
        schedule_type ===
        "INTERVAL" &&
        !interval_seconds
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Interval jobs require interval_seconds",
        });
    }

    const finalInterval =
        schedule_type ===
            "MANUAL"
            ? null
            : interval_seconds;

    try {
        const result =
            await pool.query(
                `
          INSERT INTO jobs (
            user_id,
            name,
            description,
            command,
            schedule_type,
            interval_seconds
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
          RETURNING *
        `,
                [
                    userId,
                    name,
                    description ?? null,
                    command,
                    schedule_type,
                    finalInterval,
                ]
            );

        return res.status(201).json({
            success: true,
            message:
                "Job created successfully",
            job:
                result.rows[0],
        });
    } catch (error) {
        console.error(
            "Create job error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to create job",
        });
    }
}


export async function listJobs(
    req: Request,
    res: Response
) {
    const userId =
        getUserId(req);

    if (!userId) {
        return res.status(401).json({
            success: false,
            message:
                "Authentication required",
        });
    }

    try {
        const result =
            await pool.query(
                `
          SELECT
            id,
            name,
            description,
            command,
            schedule_type,
            interval_seconds,
            is_active,
            created_at,
            updated_at
          FROM jobs
          WHERE user_id = $1
          ORDER BY created_at DESC
        `,
                [
                    userId,
                ]
            );

        return res.status(200).json({
            success: true,
            jobs:
                result.rows,
        });
    } catch (error) {
        console.error(
            "List jobs error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load jobs",
        });
    }
}


export async function getJob(
    req: Request,
    res: Response
) {
    const userId =
        getUserId(req);

    if (!userId) {
        return res.status(401).json({
            success: false,
            message:
                "Authentication required",
        });
    }

    const jobId =
        getJobId(req);

    if (!jobId) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid job ID",
        });
    }

    try {
        const result =
            await pool.query(
                `
          SELECT *
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
            !result.rowCount ||
            result.rowCount === 0
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Job not found",
            });
        }

        return res.status(200).json({
            success: true,
            job:
                result.rows[0],
        });
    } catch (error) {
        console.error(
            "Get job error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load job",
        });
    }
}


export async function updateJob(
    req: Request,
    res: Response
) {
    const userId =
        getUserId(req);

    if (!userId) {
        return res.status(401).json({
            success: false,
            message:
                "Authentication required",
        });
    }

    const jobId =
        getJobId(req);

    if (!jobId) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid job ID",
        });
    }

    const parsed =
        updateJobSchema.safeParse(
            req.body
        );

    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message:
                parsed.error.issues[0]
                    ?.message ??
                "Invalid job data",
        });
    }

    if (
        Object.keys(
            parsed.data
        ).length === 0
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Provide at least one field to update",
        });
    }

    try {
        const existingResult =
            await pool.query(
                `
          SELECT *
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
            !existingResult.rowCount ||
            existingResult.rowCount === 0
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Job not found",
            });
        }

        const existing =
            existingResult.rows[0];

        const updatedName =
            parsed.data.name ??
            existing.name;

        const updatedDescription =
            parsed.data.description !==
                undefined
                ? parsed.data.description
                : existing.description;

        const updatedCommand =
            parsed.data.command ??
            existing.command;

        const updatedScheduleType =
            parsed.data.schedule_type ??
            existing.schedule_type;

        let updatedInterval =
            parsed.data.interval_seconds !==
                undefined
                ? parsed.data.interval_seconds
                : existing.interval_seconds;

        const updatedIsActive =
            parsed.data.is_active ??
            existing.is_active;

        if (
            updatedScheduleType ===
            "MANUAL"
        ) {
            updatedInterval =
                null;
        }

        if (
            updatedScheduleType ===
            "INTERVAL" &&
            !updatedInterval
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Interval jobs require interval_seconds",
            });
        }

        const result =
            await pool.query(
                `
          UPDATE jobs
          SET
            name = $1,
            description = $2,
            command = $3,
            schedule_type = $4,
            interval_seconds = $5,
            is_active = $6,
            updated_at = NOW()
          WHERE id = $7
            AND user_id = $8
          RETURNING *
        `,
                [
                    updatedName,
                    updatedDescription,
                    updatedCommand,
                    updatedScheduleType,
                    updatedInterval,
                    updatedIsActive,
                    jobId,
                    userId,
                ]
            );

        return res.status(200).json({
            success: true,
            message:
                "Job updated successfully",
            job:
                result.rows[0],
        });
    } catch (error) {
        console.error(
            "Update job error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update job",
        });
    }
}


export async function deleteJob(
    req: Request,
    res: Response
) {
    const userId =
        getUserId(req);

    if (!userId) {
        return res.status(401).json({
            success: false,
            message:
                "Authentication required",
        });
    }

    const jobId =
        getJobId(req);

    if (!jobId) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid job ID",
        });
    }

    try {
        const result =
            await pool.query(
                `
          DELETE FROM jobs
          WHERE id = $1
            AND user_id = $2
          RETURNING id
        `,
                [
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
                    "Job not found",
            });
        }

        return res.status(200).json({
            success: true,
            message:
                "Job deleted successfully",
        });
    } catch (error) {
        console.error(
            "Delete job error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to delete job",
        });
    }
}