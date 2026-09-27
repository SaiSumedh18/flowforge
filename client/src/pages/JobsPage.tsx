import { useState } from "react";
import { deleteJob, errorMessage } from "../api/jobs";
import { JobForm } from "../components/JobForm";
import { useJobs } from "../hooks/useJobs";
import type { Job } from "../types/jobs";

export function JobsPage() {
  const { jobs, setJobs, loading, error, refresh } = useJobs();
  const [editor, setEditor] = useState<Job | "new" | null>(null);
  const [deleting, setDeleting] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const visibleJobs = jobs.filter(job => `${job.name} ${job.description ?? ""} ${job.command}`.toLowerCase().includes(search.toLowerCase()));

  function saved(job: Job) {
    setJobs(current => editor === "new" ? [job, ...current] : current.map(item => item.id === job.id ? job : item));
    setNotice(editor === "new" ? "Job created." : "Job updated.");
    setEditor(null);
  }

  async function confirmDelete() {
    if (!deleting || busy) return;
    setBusy(true);
    setActionError("");
    try {
      await deleteJob(deleting.id);
      setJobs(current => current.filter(job => job.id !== deleting.id));
      setDeleting(null);
      setNotice("Job deleted.");
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="dashboard-header">
        <div><p className="eyebrow">WORKSPACE / JOBS</p><h1>Jobs</h1><p className="muted-text">Create and manage the work that keeps things moving.</p></div>
        <button className="action-button primary-action" disabled={editor !== null || deleting !== null || loading || !!error} onClick={() => { setEditor("new"); setNotice(""); }}>+ Create job</button>
      </header>
      {notice && <p className="success-message" role="status">{notice}</p>}
      {editor !== null && <JobForm key={editor === "new" ? "new" : editor.id} job={editor === "new" ? null : editor} onSaved={saved} onCancel={() => setEditor(null)} />}
      {deleting && <section className="content-card delete-card" aria-labelledby="delete-title">
        <h2 id="delete-title">Delete “{deleting.name}”?</h2>
        <p>This permanently deletes this job, its execution history, and saved AI analyses.</p>
        {actionError && <p className="error-message" role="alert">{actionError}</p>}
        <div className="button-row">
          <button autoFocus className="action-button" disabled={busy} onClick={() => setDeleting(null)}>Keep job</button>
          <button className="action-button danger-action" disabled={busy} onClick={() => void confirmDelete()}>{busy ? "Deleting…" : "Delete permanently"}</button>
        </div>
      </section>}
      <section className="content-card" aria-label="Your jobs" aria-busy={loading}>
        <div className="section-toolbar">
          <h2>Your jobs <span className="count-badge">{loading || error ? "—" : jobs.length}</span></h2>
          <div className="button-row"><input aria-label="Search jobs" type="search" placeholder="Search jobs…" value={search} onChange={e => setSearch(e.target.value)} />
            <button className="action-button" disabled={loading || editor !== null || deleting !== null} onClick={refresh}>Refresh</button></div>
        </div>
        {loading ? <p role="status" className="empty-state">Loading jobs…</p> : error ? <p role="alert" className="error-message">{error}</p> : jobs.length === 0 ? <div className="empty-state"><h3>Your first job starts here</h3><p>Create a job with a command and choose when it should run.</p></div> : visibleJobs.length === 0 ? <p className="empty-state">No jobs match your search.</p> : <div className="table-scroll"><table>
          <thead><tr><th scope="col">Job</th><th scope="col">Schedule</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
          <tbody>{visibleJobs.map(job => <tr key={job.id}>
            <td><strong>{job.name}</strong>{job.description && <p className="job-description">{job.description}</p>}<code className="job-command">{job.command}</code></td>
            <td>{job.schedule_type === "MANUAL" ? "Manual" : `Every ${job.interval_seconds} seconds`}</td>
            <td><span className={`status-badge ${job.is_active ? "status-success" : "status-inactive"}`}>{job.is_active ? "Active" : "Inactive"}</span></td>
            <td><div className="button-row">
              <button className="action-button" aria-label={`Edit ${job.name}`} disabled={editor !== null || deleting !== null} onClick={() => { setEditor(job); setNotice(""); }}>Edit</button>
              <button className="action-button danger-text" aria-label={`Delete ${job.name}`} disabled={editor !== null || deleting !== null} onClick={() => { setDeleting(job); setActionError(""); setNotice(""); }}>Delete</button>
            </div></td>
          </tr>)}</tbody>
        </table></div>}
      </section>
    </>
  );
}
