import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    analyzeRun,
    errorMessage,
    getRunAnalysis,
    listJobs,
    listRuns,
    retryRun,
    runJob,
} from "../api/jobs";

import type {
    AIAnalysis,
    Job,
    JobRun,
} from "../types/jobs";

import "./ExecutionsPage.css";


interface ExecutionRow {
    job: Job;
    run: JobRun;
}


function formatDate(
    value:
        | string
        | null
) {
    if (!value) {
        return "—";
    }

    return new Date(
        value
    ).toLocaleString();
}


function formatDuration(
    value:
        | number
        | null
) {
    if (
        value === null
    ) {
        return "—";
    }

    if (value < 1000) {
        return `${value} ms`;
    }

    return `${(
        value / 1000
    ).toFixed(2)} s`;
}


function recommendationLabel(
    value:
        AIAnalysis[
        "retry_recommendation"
        ]
) {
    switch (value) {
        case "SAFE_TO_RETRY":
            return "Safe to retry";

        case "RETRY_AFTER_FIX":
            return "Fix before retrying";

        case "DO_NOT_RETRY_YET":
            return "Do not retry yet";
    }
}


export function ExecutionsPage() {
    const [
        jobs,
        setJobs,
    ] =
        useState<Job[]>([]);

    const [
        executions,
        setExecutions,
    ] =
        useState<
            ExecutionRow[]
        >([]);

    const [
        selected,
        setSelected,
    ] =
        useState<
            ExecutionRow | null
        >(null);

    const [
        analysis,
        setAnalysis,
    ] =
        useState<
            AIAnalysis | null
        >(null);

    const [
        runJobId,
        setRunJobId,
    ] =
        useState("");

    const [
        statusFilter,
        setStatusFilter,
    ] =
        useState("ALL");

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        actionLoading,
        setActionLoading,
    ] =
        useState(false);

    const [
        error,
        setError,
    ] =
        useState("");

    const [
        notice,
        setNotice,
    ] =
        useState("");


    async function refresh() {
        setLoading(true);
        setError("");

        try {
            const loadedJobs =
                await listJobs();

            setJobs(
                loadedJobs
            );

            const runGroups =
                await Promise.all(
                    loadedJobs.map(
                        async (
                            job
                        ) => ({
                            job,
                            runs:
                                await listRuns(
                                    job.id
                                ),
                        })
                    )
                );

            const merged =
                runGroups
                    .flatMap(
                        ({
                            job,
                            runs,
                        }) =>
                            runs.map(
                                (
                                    run
                                ) => ({
                                    job,
                                    run,
                                })
                            )
                    )
                    .sort(
                        (
                            left,
                            right
                        ) =>
                            new Date(
                                right.run
                                    .created_at
                            ).getTime() -
                            new Date(
                                left.run
                                    .created_at
                            ).getTime()
                    );

            setExecutions(
                merged
            );

            if (
                !runJobId
            ) {
                const firstActive =
                    loadedJobs.find(
                        (
                            job
                        ) =>
                            job.is_active
                    );

                if (
                    firstActive
                ) {
                    setRunJobId(
                        String(
                            firstActive.id
                        )
                    );
                }
            }

            if (selected) {
                const updated =
                    merged.find(
                        (
                            row
                        ) =>
                            row.run.id ===
                            selected.run.id &&
                            row.job.id ===
                            selected.job.id
                    );

                if (updated) {
                    setSelected(
                        updated
                    );
                }
            }
        } catch (
        requestError
        ) {
            setError(
                errorMessage(
                    requestError
                )
            );
        } finally {
            setLoading(false);
        }
    }


    useEffect(
        () => {
            void refresh();
        },
        []
    );


    async function openExecution(
        row: ExecutionRow
    ) {
        setSelected(row);
        setAnalysis(null);
        setError("");

        if (
            row.run.status !==
            "FAILED"
        ) {
            return;
        }

        try {
            const saved =
                await getRunAnalysis(
                    row.job.id,
                    row.run.id
                );

            setAnalysis(
                saved
            );
        } catch (
        requestError
        ) {
            setError(
                errorMessage(
                    requestError
                )
            );
        }
    }


    async function handleRunNow() {
        const jobId =
            Number(runJobId);

        if (
            !Number.isInteger(
                jobId
            )
        ) {
            return;
        }

        setActionLoading(true);
        setError("");
        setNotice("");

        try {
            await runJob(
                jobId
            );

            setNotice(
                "Job started successfully."
            );

            await new Promise(
                (
                    resolve
                ) =>
                    setTimeout(
                        resolve,
                        800
                    )
            );

            await refresh();
        } catch (
        requestError
        ) {
            setError(
                errorMessage(
                    requestError
                )
            );
        } finally {
            setActionLoading(
                false
            );
        }
    }


    async function handleRetry() {
        if (!selected) {
            return;
        }

        setActionLoading(true);
        setError("");
        setNotice("");

        try {
            await retryRun(
                selected.job.id,
                selected.run.id
            );

            setNotice(
                `Retry started for run #${selected.run.id}.`
            );

            await new Promise(
                (
                    resolve
                ) =>
                    setTimeout(
                        resolve,
                        800
                    )
            );

            await refresh();
        } catch (
        requestError
        ) {
            setError(
                errorMessage(
                    requestError
                )
            );
        } finally {
            setActionLoading(
                false
            );
        }
    }


    async function handleAnalyze() {
        if (!selected) {
            return;
        }

        setActionLoading(true);
        setError("");
        setNotice("");

        try {
            const result =
                await analyzeRun(
                    selected.job.id,
                    selected.run.id
                );

            setAnalysis(
                result
            );

            setNotice(
                "AI failure analysis generated and saved."
            );
        } catch (
        requestError
        ) {
            setError(
                errorMessage(
                    requestError
                )
            );
        } finally {
            setActionLoading(
                false
            );
        }
    }


    const filtered =
        useMemo(
            () => {
                if (
                    statusFilter ===
                    "ALL"
                ) {
                    return executions;
                }

                return executions.filter(
                    (
                        row
                    ) =>
                        row.run.status ===
                        statusFilter
                );
            },
            [
                executions,
                statusFilter,
            ]
        );


    const counts =
        useMemo(
            () => ({
                total:
                    executions.length,

                success:
                    executions.filter(
                        (
                            row
                        ) =>
                            row.run
                                .status ===
                            "SUCCESS"
                    ).length,

                failed:
                    executions.filter(
                        (
                            row
                        ) =>
                            row.run
                                .status ===
                            "FAILED"
                    ).length,

                running:
                    executions.filter(
                        (
                            row
                        ) =>
                            row.run
                                .status ===
                            "RUNNING" ||
                            row.run
                                .status ===
                            "PENDING"
                    ).length,
            }),
            [
                executions,
            ]
        );


    const activeJobs =
        jobs.filter(
            (
                job
            ) =>
                job.is_active
        );


    return (
        <div className="exec-page">
            <div className="exec-heading">
                <div>
                    <p className="eyebrow">
                        WORKSPACE / EXECUTIONS
                    </p>

                    <h1>
                        Executions
                    </h1>

                    <p className="muted-text">
                        Run jobs, inspect
                        execution history,
                        retry failures, and
                        use AI-assisted
                        diagnostics.
                    </p>
                </div>

                <button
                    className="exec-button"
                    onClick={
                        () =>
                            void refresh()
                    }
                    disabled={
                        loading
                    }
                >
                    {loading
                        ? "Refreshing…"
                        : "Refresh"}
                </button>
            </div>


            {error && (
                <div className="exec-alert error">
                    {error}
                </div>
            )}

            {notice && (
                <div className="exec-alert success">
                    {notice}
                </div>
            )}


            <section className="exec-run-card">
                <div>
                    <h2>
                        Run a job now
                    </h2>

                    <p>
                        Start any active
                        FlowForge job manually.
                    </p>
                </div>

                <div className="exec-run-controls">
                    <select
                        value={
                            runJobId
                        }
                        onChange={
                            (
                                event
                            ) =>
                                setRunJobId(
                                    event.target
                                        .value
                                )
                        }
                    >
                        {activeJobs.map(
                            (
                                job
                            ) => (
                                <option
                                    key={
                                        job.id
                                    }
                                    value={
                                        job.id
                                    }
                                >
                                    {job.name}
                                </option>
                            )
                        )}
                    </select>

                    <button
                        className="exec-button primary"
                        onClick={
                            () =>
                                void handleRunNow()
                        }
                        disabled={
                            actionLoading ||
                            activeJobs.length ===
                            0
                        }
                    >
                        {actionLoading
                            ? "Working…"
                            : "Run now"}
                    </button>
                </div>
            </section>


            <section className="exec-stats">
                <article>
                    <span>
                        Total runs
                    </span>

                    <strong>
                        {counts.total}
                    </strong>
                </article>

                <article>
                    <span>
                        Successful
                    </span>

                    <strong>
                        {counts.success}
                    </strong>
                </article>

                <article>
                    <span>
                        Failed
                    </span>

                    <strong>
                        {counts.failed}
                    </strong>
                </article>

                <article>
                    <span>
                        Pending / running
                    </span>

                    <strong>
                        {counts.running}
                    </strong>
                </article>
            </section>


            <section className="exec-history-card">
                <div className="exec-section-toolbar">
                    <div>
                        <h2>
                            Execution history
                        </h2>

                        <p>
                            Showing the most
                            recent runs across
                            your jobs.
                        </p>
                    </div>

                    <select
                        value={
                            statusFilter
                        }
                        onChange={
                            (
                                event
                            ) =>
                                setStatusFilter(
                                    event.target
                                        .value
                                )
                        }
                    >
                        <option value="ALL">
                            All statuses
                        </option>

                        <option value="SUCCESS">
                            Success
                        </option>

                        <option value="FAILED">
                            Failed
                        </option>

                        <option value="RUNNING">
                            Running
                        </option>

                        <option value="PENDING">
                            Pending
                        </option>
                    </select>
                </div>


                {loading ? (
                    <div className="exec-empty">
                        Loading executions…
                    </div>
                ) : filtered.length ===
                    0 ? (
                    <div className="exec-empty">
                        No executions match
                        this filter.
                    </div>
                ) : (
                    <div className="exec-table-scroll">
                        <table className="exec-table">
                            <thead>
                                <tr>
                                    <th>
                                        Run
                                    </th>

                                    <th>
                                        Job
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Duration
                                    </th>

                                    <th>
                                        Exit
                                    </th>

                                    <th>
                                        Created
                                    </th>

                                    <th />
                                </tr>
                            </thead>

                            <tbody>
                                {filtered
                                    .slice(
                                        0,
                                        100
                                    )
                                    .map(
                                        (
                                            row
                                        ) => (
                                            <tr
                                                key={
                                                    row.run
                                                        .id
                                                }
                                            >
                                                <td>
                                                    #
                                                    {
                                                        row.run
                                                            .id
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        row.job
                                                            .name
                                                    }
                                                </td>

                                                <td>
                                                    <span
                                                        className={`exec-status ${row.run.status.toLowerCase()}`}
                                                    >
                                                        {
                                                            row.run
                                                                .status
                                                        }
                                                    </span>
                                                </td>

                                                <td>
                                                    {formatDuration(
                                                        row.run
                                                            .duration_ms
                                                    )}
                                                </td>

                                                <td>
                                                    {row.run
                                                        .exit_code ??
                                                        "—"}
                                                </td>

                                                <td>
                                                    {formatDate(
                                                        row.run
                                                            .created_at
                                                    )}
                                                </td>

                                                <td>
                                                    <button
                                                        className="exec-link-button"
                                                        onClick={
                                                            () =>
                                                                void openExecution(
                                                                    row
                                                                )
                                                        }
                                                    >
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>


            {selected && (
                <section className="exec-detail-card">
                    <div className="exec-detail-heading">
                        <div>
                            <p className="eyebrow">
                                RUN #
                                {
                                    selected.run
                                        .id
                                }
                            </p>

                            <h2>
                                {
                                    selected.job
                                        .name
                                }
                            </h2>
                        </div>

                        <button
                            className="exec-close-button"
                            onClick={
                                () => {
                                    setSelected(
                                        null
                                    );

                                    setAnalysis(
                                        null
                                    );
                                }
                            }
                        >
                            Close
                        </button>
                    </div>


                    <div className="exec-detail-grid">
                        <div>
                            <span>
                                Status
                            </span>

                            <strong>
                                {
                                    selected.run
                                        .status
                                }
                            </strong>
                        </div>

                        <div>
                            <span>
                                Duration
                            </span>

                            <strong>
                                {formatDuration(
                                    selected.run
                                        .duration_ms
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Exit code
                            </span>

                            <strong>
                                {selected.run
                                    .exit_code ??
                                    "—"}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Retry of
                            </span>

                            <strong>
                                {selected.run
                                    .retry_of_run_id
                                    ? `#${selected.run.retry_of_run_id}`
                                    : "—"}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Started
                            </span>

                            <strong>
                                {formatDate(
                                    selected.run
                                        .started_at
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Finished
                            </span>

                            <strong>
                                {formatDate(
                                    selected.run
                                        .finished_at
                                )}
                            </strong>
                        </div>
                    </div>


                    <div className="exec-log-section">
                        <h3>
                            Execution logs
                        </h3>

                        <pre>
                            {selected.run
                                .logs ||
                                "No execution output was captured."}
                        </pre>
                    </div>


                    {selected.run
                        .error_message && (
                            <div className="exec-error-section">
                                <h3>
                                    Error
                                </h3>

                                <p>
                                    {
                                        selected.run
                                            .error_message
                                    }
                                </p>
                            </div>
                        )}


                    {selected.run
                        .status ===
                        "FAILED" && (
                            <>
                                <div className="exec-actions">
                                    <button
                                        className="exec-button"
                                        disabled={
                                            actionLoading
                                        }
                                        onClick={
                                            () =>
                                                void handleRetry()
                                        }
                                    >
                                        Retry run
                                    </button>

                                    <button
                                        className="exec-button ai"
                                        disabled={
                                            actionLoading
                                        }
                                        onClick={
                                            () =>
                                                void handleAnalyze()
                                        }
                                    >
                                        {analysis
                                            ? "Regenerate AI analysis"
                                            : "Analyze failure with AI"}
                                    </button>
                                </div>


                                {analysis && (
                                    <div className="exec-ai-card">
                                        <div className="exec-ai-heading">
                                            <div>
                                                <p className="eyebrow">
                                                    AI FAILURE ASSISTANT
                                                </p>

                                                <h3>
                                                    {
                                                        analysis.summary
                                                    }
                                                </h3>
                                            </div>

                                            <span className="exec-ai-model">
                                                {
                                                    analysis.model
                                                }
                                            </span>
                                        </div>


                                        <div className="exec-ai-section">
                                            <h4>
                                                Likely cause
                                            </h4>

                                            <p>
                                                {
                                                    analysis.likely_cause
                                                }
                                            </p>
                                        </div>


                                        <div className="exec-ai-section">
                                            <h4>
                                                Explanation
                                            </h4>

                                            <p>
                                                {
                                                    analysis.explanation
                                                }
                                            </p>
                                        </div>


                                        <div className="exec-ai-section">
                                            <h4>
                                                Suggested fixes
                                            </h4>

                                            <ol>
                                                {analysis.suggested_fixes.map(
                                                    (
                                                        fix,
                                                        index
                                                    ) => (
                                                        <li
                                                            key={`${index}-${fix}`}
                                                        >
                                                            {fix}
                                                        </li>
                                                    )
                                                )}
                                            </ol>
                                        </div>


                                        <div className="exec-ai-recommendation">
                                            <span>
                                                Retry recommendation
                                            </span>

                                            <strong>
                                                {recommendationLabel(
                                                    analysis.retry_recommendation
                                                )}
                                            </strong>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                </section>
            )}
        </div>
    );
}