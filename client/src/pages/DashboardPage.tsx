import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage, listJobs, listRuns } from "../api/jobs";
import { useAuth } from "../context/AuthContext";
import type { Job, JobRun } from "../types/jobs";

interface Snapshot { jobs: Job[]; runs: JobRun[]; loadedAt: Date }

export function DashboardPage() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const jobs = await listJobs(controller.signal);
        const runs: JobRun[] = [];
        // Bound concurrency because the existing API exposes history per job.
        for (let offset = 0; offset < jobs.length; offset += 5) {
          const batches = await Promise.all(jobs.slice(offset, offset + 5).map(job => listRuns(job.id, controller.signal)));
          runs.push(...batches.flat());
        }
        if (!controller.signal.aborted) setSnapshot({ jobs, runs, loadedAt: new Date() });
      } catch (error) {
        if (!controller.signal.aborted) setError(errorMessage(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [revision]);

  function refresh() {
    setLoading(true);
    setError("");
    setRevision(value => value + 1);
  }

  const jobs = snapshot?.jobs ?? [];
  const runs = snapshot?.runs ?? [];
  const success = runs.filter(run => run.status === "SUCCESS").length;
  const failed = runs.filter(run => run.status === "FAILED").length;
  const inProgress = runs.filter(run => run.status === "RUNNING" || run.status === "PENDING").length;
  const recent = [...runs].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 6);
  const ready = snapshot !== null && !loading && !error;
  const stats = [
    { label: "Total jobs", value: jobs.length, detail: `${jobs.filter(job => job.is_active).length} active jobs` },
    { label: "Successful runs", value: success, detail: "Completed successfully" },
    { label: "Failed runs", value: failed, detail: "Finished with an error" },
    { label: "In progress", value: inProgress, detail: "Pending or running" },
  ];

  return (
    <>
      <header className="dashboard-header">
        <div><p className="eyebrow">WORKSPACE / OVERVIEW</p><h1>Welcome back, {user?.name}</h1><p className="muted-text">A clear view of your jobs and execution activity.</p></div>
        <div className="button-row"><button className="action-button" disabled={loading} onClick={refresh}>{loading ? "Refreshing…" : "Refresh"}</button><Link className="action-button primary-action" to="/jobs">Manage jobs →</Link></div>
      </header>
      {error && <p role="alert" className="error-message">{error} Statistics are unavailable until all job histories load. Use Refresh to try again.</p>}
      {loading && <p className="muted-text" role="status">Loading dashboard statistics…</p>}
      <section className="stats-grid overview-stats" aria-label="Dashboard statistics" aria-busy={loading}>
        {stats.map(stat => <article className="stat-card" key={stat.label}><p>{stat.label}</p><strong>{ready ? stat.value : "—"}</strong><span>{ready ? stat.detail : "Awaiting data"}</span></article>)}
      </section>
      {ready && <>
        <p className="field-help">All recorded runs for your current jobs · Updated {snapshot.loadedAt.toLocaleTimeString()} · Refresh to see new activity.</p>
        <section className="content-card">
          <div className="section-toolbar"><h2>Recent activity</h2><span className="muted-text">{runs.length} total runs</span></div>
          {jobs.length === 0 ? <div className="empty-state"><h3>Build your first workflow</h3><p>Create a job to start tracking your work here.</p><Link className="action-button primary-action" to="/jobs">Go to Jobs</Link></div> : recent.length === 0 ? <div className="empty-state"><h3>No executions yet</h3><p>Your jobs are ready. Run history will appear here after an execution.</p></div> : <div className="table-scroll"><table>
            <thead><tr><th scope="col">Job</th><th scope="col">Run</th><th scope="col">Status</th><th scope="col">Created</th></tr></thead>
            <tbody>{recent.map(run => <tr key={run.id}><td><Link to="/jobs">{jobs.find(job => job.id === run.job_id)?.name ?? `Job ${run.job_id}`}</Link></td><td>#{run.id}</td><td><span className={`status-badge status-${run.status.toLowerCase()}`}>{run.status}</span></td><td>{new Date(run.created_at).toLocaleString()}</td></tr>)}</tbody>
          </table></div>}
        </section>
      </>}
    </>
  );
}
