import {
    exec,
} from "node:child_process";

import {
    pool,
} from "../config/db.js";


const EXECUTION_TIMEOUT_MS =
    15_000;

const MAX_OUTPUT_BYTES =
    1024 * 1024;


function combineOutput(
    stdout: string,
    stderr: string
) {
    const sections:
        string[] = [];

    if (stdout.trim()) {
        sections.push(
            `STDOUT:\n${stdout.trimEnd()}`
        );
    }

    if (stderr.trim()) {
        sections.push(
            `STDERR:\n${stderr.trimEnd()}`
        );
    }

    if (
        sections.length === 0
    ) {
        return null;
    }

    return sections.join(
        "\n\n"
    );
}


export async function executeJobRun(
    runId: number,
    command: string
) {
    const startedAt =
        Date.now();

    try {
        await pool.query(
            `
        UPDATE job_runs
        SET
          status = 'RUNNING',
          started_at = NOW()
        WHERE id = $1
      `,
            [
                runId,
            ]
        );

        exec(
            command,
            {
                timeout:
                    EXECUTION_TIMEOUT_MS,

                maxBuffer:
                    MAX_OUTPUT_BYTES,
            },

            async (
                error,
                stdout,
                stderr
            ) => {
                const durationMs =
                    Date.now() -
                    startedAt;

                const logs =
                    combineOutput(
                        stdout,
                        stderr
                    );

                try {
                    if (error) {
                        const exitCode =
                            typeof error.code ===
                                "number"
                                ? error.code
                                : null;

                        const errorMessage =
                            error.killed
                                ? `Job exceeded the ${EXECUTION_TIMEOUT_MS /
                                1000
                                } second execution limit`
                                : error.message;

                        await pool.query(
                            `
                UPDATE job_runs
                SET
                  status = 'FAILED',
                  finished_at = NOW(),
                  duration_ms = $1,
                  exit_code = $2,
                  logs = $3,
                  error_message = $4
                WHERE id = $5
              `,
                            [
                                durationMs,
                                exitCode,
                                logs,
                                errorMessage,
                                runId,
                            ]
                        );

                        return;
                    }

                    await pool.query(
                        `
              UPDATE job_runs
              SET
                status = 'SUCCESS',
                finished_at = NOW(),
                duration_ms = $1,
                exit_code = 0,
                logs = $2,
                error_message = NULL
              WHERE id = $3
            `,
                        [
                            durationMs,
                            logs,
                            runId,
                        ]
                    );
                } catch (
                databaseError
                ) {
                    console.error(
                        "Unable to save job execution result:",
                        databaseError
                    );
                }
            }
        );
    } catch (error) {
        console.error(
            "Unable to start job execution:",
            error
        );
    }
}