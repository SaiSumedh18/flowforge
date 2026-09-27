import { useCallback, useEffect, useState } from "react";
import { errorMessage, listJobs } from "../api/jobs";
import type { Job } from "../types/jobs";

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => {
    setLoading(true);
    setError("");
    setRevision(value => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    listJobs(controller.signal)
      .then(setJobs)
      .catch(error => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  return { jobs, setJobs, loading, error, refresh };
}
