import axios from "axios";

import {
  api,
} from "./client";

import type {
  AIAnalysis,
  Job,
  JobInput,
  JobRun,
} from "../types/jobs";


export async function listJobs(
  signal?: AbortSignal
): Promise<Job[]> {
  const response =
    await api.get<{
      jobs: Job[];
    }>(
      "/jobs",
      {
        signal,
      }
    );

  return response.data.jobs;
}


export async function listRuns(
  jobId: number,
  signal?: AbortSignal
): Promise<JobRun[]> {
  const response =
    await api.get<{
      runs: JobRun[];
    }>(
      `/jobs/${jobId}/runs`,
      {
        signal,
      }
    );

  return response.data.runs;
}


export async function getRun(
  jobId: number,
  runId: number
): Promise<JobRun> {
  const response =
    await api.get<{
      run: JobRun;
    }>(
      `/jobs/${jobId}/runs/${runId}`
    );

  return response.data.run;
}


export async function createJob(
  input: JobInput
): Promise<Job> {
  const response =
    await api.post<{
      job: Job;
    }>(
      "/jobs",
      input
    );

  return response.data.job;
}


export async function updateJob(
  id: number,
  input:
    JobInput & {
      is_active: boolean;
    }
): Promise<Job> {
  const response =
    await api.put<{
      job: Job;
    }>(
      `/jobs/${id}`,
      input
    );

  return response.data.job;
}


export async function deleteJob(
  id: number
): Promise<void> {
  await api.delete(
    `/jobs/${id}`
  );
}


export async function runJob(
  jobId: number
): Promise<JobRun> {
  const response =
    await api.post<{
      run: JobRun;
    }>(
      `/jobs/${jobId}/run`
    );

  return response.data.run;
}


export async function retryRun(
  jobId: number,
  runId: number
): Promise<JobRun> {
  const response =
    await api.post<{
      run: JobRun;
    }>(
      `/jobs/${jobId}/runs/${runId}/retry`
    );

  return response.data.run;
}


export async function analyzeRun(
  jobId: number,
  runId: number
): Promise<AIAnalysis> {
  const response =
    await api.post<{
      analysis: AIAnalysis;
    }>(
      `/jobs/${jobId}/runs/${runId}/analyze`
    );

  return response.data.analysis;
}


export async function getRunAnalysis(
  jobId: number,
  runId: number
): Promise<
  AIAnalysis | null
> {
  try {
    const response =
      await api.get<{
        analysis:
        AIAnalysis;
      }>(
        `/jobs/${jobId}/runs/${runId}/analysis`
      );

    return response.data.analysis;
  } catch (error) {
    if (
      axios.isAxiosError(
        error
      ) &&
      error.response
        ?.status === 404
    ) {
      return null;
    }

    throw error;
  }
}


export function errorMessage(
  error: unknown
): string {
  if (
    axios.isAxiosError(
      error
    )
  ) {
    if (
      error.response
        ?.status === 401
    ) {
      return "Your session expired. Sign out and sign in again.";
    }

    const message =
      error.response
        ?.data?.message;

    if (
      typeof message ===
      "string"
    ) {
      return message;
    }

    if (!error.response) {
      return "Cannot reach the server. Check that the backend is running, then try again.";
    }
  }

  return "Something went wrong. Please try again.";
}