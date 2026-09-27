import request from "supertest";

import {
    afterAll,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import {
    app,
} from "../src/app.js";

import {
    pool,
} from "../src/config/db.js";

import type {
    JobRun,
} from "../src/types/test.types.js";


const TEST_PASSWORD =
    "FlowForgeTest123!";


async function registerUser(
    email: string,
    name = "FlowForge Test User"
) {
    const response =
        await request(app)
            .post("/api/auth/register")
            .send({
                name,
                email,
                password:
                    TEST_PASSWORD,
            });

    expect(
        response.status
    ).toBe(201);

    expect(
        response.body.token
    ).toBeTruthy();

    return response.body.token as string;
}


async function createManualJob(
    token: string,
    overrides?: {
        name?: string;
        command?: string;
    }
) {
    const response =
        await request(app)
            .post("/api/jobs")
            .set(
                "Authorization",
                `Bearer ${token}`
            )
            .send({
                name:
                    overrides?.name ??
                    "Integration Test Job",

                description:
                    "Created by the FlowForge integration test suite",

                command:
                    overrides?.command ??
                    "echo FlowForge test",

                schedule_type:
                    "MANUAL",

                interval_seconds:
                    null,
            });

    expect(
        response.status
    ).toBe(201);

    return response.body.job;
}


async function waitForTerminalRun(
    token: string,
    jobId: number,
    runId: number
): Promise<JobRun> {
    for (
        let attempt = 0;
        attempt < 50;
        attempt += 1
    ) {
        const response =
            await request(app)
                .get(
                    `/api/jobs/${jobId}/runs/${runId}`
                )
                .set(
                    "Authorization",
                    `Bearer ${token}`
                );

        expect(
            response.status
        ).toBe(200);

        const run =
            response.body.run as JobRun;

        if (
            run.status === "SUCCESS" ||
            run.status === "FAILED"
        ) {
            return run;
        }

        await new Promise(
            (resolve) =>
                setTimeout(
                    resolve,
                    100
                )
        );
    }

    throw new Error(
        `Run ${runId} did not finish within the test timeout`
    );
}


beforeEach(
    async () => {
        await pool.query(`
      TRUNCATE TABLE
        job_run_analyses,
        job_runs,
        jobs,
        users
      RESTART IDENTITY
      CASCADE
    `);
    }
);


afterAll(
    async () => {
        await pool.end();
    }
);


describe(
    "FlowForge API integration tests",
    () => {
        it(
            "returns a healthy API response",
            async () => {
                const response =
                    await request(app)
                        .get("/api/health");

                expect(
                    response.status
                ).toBe(200);

                expect(
                    response.body
                ).toEqual({
                    success: true,
                    message:
                        "FlowForge API is running",
                });
            }
        );


        it(
            "registers a user and loads the authenticated profile",
            async () => {
                const token =
                    await registerUser(
                        "auth-test@flowforge.dev"
                    );

                const response =
                    await request(app)
                        .get("/api/auth/me")
                        .set(
                            "Authorization",
                            `Bearer ${token}`
                        );

                expect(
                    response.status
                ).toBe(200);

                expect(
                    response.body.user.email
                ).toBe(
                    "auth-test@flowforge.dev"
                );

                expect(
                    response.body.user.name
                ).toBe(
                    "FlowForge Test User"
                );

                expect(
                    response.body.user.password_hash
                ).toBeUndefined();
            }
        );


        it(
            "keeps one user's jobs private from another user",
            async () => {
                const ownerToken =
                    await registerUser(
                        "owner@flowforge.dev",
                        "Owner"
                    );

                const otherToken =
                    await registerUser(
                        "other@flowforge.dev",
                        "Other User"
                    );

                const job =
                    await createManualJob(
                        ownerToken
                    );

                const response =
                    await request(app)
                        .get(
                            `/api/jobs/${job.id}`
                        )
                        .set(
                            "Authorization",
                            `Bearer ${otherToken}`
                        );

                expect(
                    response.status
                ).toBe(404);
            }
        );


        it(
            "creates, updates, lists, and deletes a job",
            async () => {
                const token =
                    await registerUser(
                        "crud@flowforge.dev"
                    );

                const job =
                    await createManualJob(
                        token
                    );

                expect(
                    job.name
                ).toBe(
                    "Integration Test Job"
                );


                const listResponse =
                    await request(app)
                        .get("/api/jobs")
                        .set(
                            "Authorization",
                            `Bearer ${token}`
                        );

                expect(
                    listResponse.status
                ).toBe(200);

                expect(
                    listResponse.body.jobs
                ).toHaveLength(1);


                const updateResponse =
                    await request(app)
                        .put(
                            `/api/jobs/${job.id}`
                        )
                        .set(
                            "Authorization",
                            `Bearer ${token}`
                        )
                        .send({
                            name:
                                "Updated Integration Job",

                            description:
                                "Updated by automated tests",

                            command:
                                "echo Updated FlowForge test",

                            schedule_type:
                                "MANUAL",

                            interval_seconds:
                                null,

                            is_active:
                                true,
                        });

                expect(
                    updateResponse.status
                ).toBe(200);

                expect(
                    updateResponse.body.job.name
                ).toBe(
                    "Updated Integration Job"
                );


                const deleteResponse =
                    await request(app)
                        .delete(
                            `/api/jobs/${job.id}`
                        )
                        .set(
                            "Authorization",
                            `Bearer ${token}`
                        );

                expect(
                    [200, 204]
                ).toContain(
                    deleteResponse.status
                );


                const finalList =
                    await request(app)
                        .get("/api/jobs")
                        .set(
                            "Authorization",
                            `Bearer ${token}`
                        );

                expect(
                    finalList.body.jobs
                ).toHaveLength(0);
            }
        );


        it(
            "rejects an interval job without an interval",
            async () => {
                const token =
                    await registerUser(
                        "schedule@flowforge.dev"
                    );

                const response =
                    await request(app)
                        .post("/api/jobs")
                        .set(
                            "Authorization",
                            `Bearer ${token}`
                        )
                        .send({
                            name:
                                "Invalid Interval Job",

                            description:
                                "Missing interval",

                            command:
                                "echo invalid",

                            schedule_type:
                                "INTERVAL",

                            interval_seconds:
                                null,
                        });

                expect(
                    response.status
                ).toBe(400);
            }
        );


        it(
            "runs a job and stores successful execution details",
            async () => {
                const token =
                    await registerUser(
                        "success-run@flowforge.dev"
                    );

                const job =
                    await createManualJob(
                        token,
                        {
                            name:
                                "Successful Test Job",

                            command:
                                "echo FlowForge integration success",
                        }
                    );


                const startResponse =
                    await request(app)
                        .post(
                            `/api/jobs/${job.id}/run`
                        )
                        .set(
                            "Authorization",
                            `Bearer ${token}`
                        );

                expect(
                    startResponse.status
                ).toBe(202);


                const run =
                    await waitForTerminalRun(
                        token,
                        job.id,
                        startResponse.body.run.id
                    );


                expect(
                    run.status
                ).toBe("SUCCESS");

                expect(
                    run.exit_code
                ).toBe(0);

                expect(
                    run.logs
                ).toContain(
                    "FlowForge integration success"
                );

                expect(
                    run.duration_ms
                ).not.toBeNull();
            }
        );


        it(
            "records failures and retries a failed execution",
            async () => {
                const token =
                    await registerUser(
                        "failure-run@flowforge.dev"
                    );

                const job =
                    await createManualJob(
                        token,
                        {
                            name:
                                "Failure Test Job",

                            command:
                                "false",
                        }
                    );


                const startResponse =
                    await request(app)
                        .post(
                            `/api/jobs/${job.id}/run`
                        )
                        .set(
                            "Authorization",
                            `Bearer ${token}`
                        );

                expect(
                    startResponse.status
                ).toBe(202);


                const originalRun =
                    await waitForTerminalRun(
                        token,
                        job.id,
                        startResponse.body.run.id
                    );


                expect(
                    originalRun.status
                ).toBe("FAILED");

                expect(
                    originalRun.exit_code
                ).toBe(1);


                const retryResponse =
                    await request(app)
                        .post(
                            `/api/jobs/${job.id}/runs/${originalRun.id}/retry`
                        )
                        .set(
                            "Authorization",
                            `Bearer ${token}`
                        );

                expect(
                    retryResponse.status
                ).toBe(202);


                const retriedRun =
                    await waitForTerminalRun(
                        token,
                        job.id,
                        retryResponse.body.run.id
                    );


                expect(
                    retriedRun.status
                ).toBe("FAILED");

                expect(
                    retriedRun.retry_of_run_id
                ).toBe(
                    originalRun.id
                );
            }
        );
    }
);