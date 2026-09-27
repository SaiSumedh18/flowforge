import { useState, type FormEvent } from "react";
import { createJob, errorMessage, updateJob } from "../api/jobs";
import type { Job, JobInput } from "../types/jobs";

interface Props {
  job: Job | null;
  onSaved: (job: Job) => void;
  onCancel: () => void;
}

export function JobForm({ job, onSaved, onCancel }: Props) {
  const [name, setName] = useState(job?.name ?? "");
  const [description, setDescription] = useState(job?.description ?? "");
  const [command, setCommand] = useState(job?.command ?? "");
  const [schedule, setSchedule] = useState<Job["schedule_type"]>(job?.schedule_type ?? "MANUAL");
  const [interval, setInterval] = useState(String(job?.interval_seconds ?? 60));
  const [active, setActive] = useState(job?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    if (name.trim().length < 2 || !command.trim()) {
      setError("Enter a name with at least 2 characters and a non-empty command.");
      return;
    }
    const seconds = Number(interval);
    if (schedule === "INTERVAL" && (!Number.isInteger(seconds) || seconds < 1 || seconds > 2147483647)) {
      setError("Interval must be a whole number between 1 and 2147483647 seconds.");
      return;
    }
    const input: JobInput = {
      name: name.trim(), description: description.trim() || null, command: command.trim(),
      schedule_type: schedule, interval_seconds: schedule === "INTERVAL" ? seconds : null,
    };
    setSaving(true);
    try {
      const saved = job ? await updateJob(job.id, { ...input, is_active: active }) : await createJob(input);
      onSaved(saved);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="content-card editor-card" aria-labelledby="job-form-title">
      <p className="eyebrow">JOB DETAILS</p>
      <h2 id="job-form-title">{job ? "Edit job" : "Create a job"}</h2>
      <form onSubmit={submit} className="job-form">
        <fieldset disabled={saving}>
          <label htmlFor="job-name">Name</label>
          <input autoFocus id="job-name" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={150} placeholder="Daily report" />
          <label htmlFor="job-description">Description <span className="muted-text">(optional)</span></label>
          <textarea id="job-description" value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} rows={2} />
          <label htmlFor="job-command">Command</label>
          <textarea id="job-command" className="command-input" value={command} onChange={e => setCommand(e.target.value)} required maxLength={2000} rows={3} placeholder="echo Hello FlowForge" />
          <label htmlFor="job-schedule">Schedule</label>
          <select id="job-schedule" value={schedule} onChange={e => setSchedule(e.target.value as Job["schedule_type"])}>
            <option value="MANUAL">Manual</option><option value="INTERVAL">Interval</option>
          </select>
          {schedule === "INTERVAL" && <>
            <label htmlFor="job-interval">Interval in seconds</label>
            <input id="job-interval" type="number" min={1} max={2147483647} step={1} required value={interval} onChange={e => setInterval(e.target.value)} />
            <p className="field-help">Active interval jobs run automatically and can start immediately after saving.</p>
          </>}
          {job && <label className="checkbox-label"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />Active</label>}
        </fieldset>
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="button-row">
          <button type="submit" className="action-button primary-action" disabled={saving}>{saving ? "Saving…" : job ? "Save changes" : "Create job"}</button>
          <button type="button" className="action-button" disabled={saving} onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
