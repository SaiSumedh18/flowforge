import {
    pool,
} from "../config/db.js";

import {
    executeJobRun,
} from "./jobExecution.service.js";


const SCHEDULER_POLL_MS =
    2_000;

let schedulerStarted =
    false;

let tickInProgress =
    false;


async function runSchedulerTick() {
    if (tickInProgress) {
        return;
    }

    tickInProgress =
        true;

    try {
        const jobs =
            await pool.query(
                `
          SELECT
            j.id,
            j.command
          FROM jobs j
          WHERE
            j.schedule_type = 'INTERVAL'
            AND j.is_active = TRUE
            AND j.interval_seconds IS NOT NULL

            AND NOT EXISTS (
              SELECT 1
              FROM job_runs active_run
              WHERE
                active_run.job_id = j.id
                AND active_run.status IN (
                  'PENDING',
                  'RUNNING'
                )
            )

            AND (
              NOT EXISTS (
                SELECT 1
                FROM job_runs any_run
                WHERE any_run.job_id = j.id
              )

              OR

              (
                SELECT MAX(previous_run.created_at)
                FROM job_runs previous_run
                WHERE previous_run.job_id = j.id
              )
              <=
              NOW() -
              (
                j.interval_seconds *
                INTERVAL '1 second'
              )
            )
        `
            );

        for (
            const job of
            jobs.rows
        ) {
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
            RETURNING id
          `,
                    [
                        job.id,
                    ]
                );

            const runId =
                runResult.rows[0].id;

            console.log(
                `Scheduler starting job ${job.id}, run ${runId}`
            );

            setImmediate(
                () => {
                    void executeJobRun(
                        runId,
                        job.command
                    );
                }
            );
        }
    } catch (error) {
        console.error(
            "Scheduler error:",
            error
        );
    } finally {
        tickInProgress =
            false;
    }
}


export function startScheduler() {
    if (schedulerStarted) {
        return;
    }

    schedulerStarted =
        true;

    console.log(
        "FlowForge scheduler started"
    );

    void runSchedulerTick();

    setInterval(
        () => {
            void runSchedulerTick();
        },
        SCHEDULER_POLL_MS
    );
}