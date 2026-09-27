import {
    Router,
} from "express";

import {
    analyzeJobRun,
    getJobRunAnalysis,
} from "../controllers/ai.controller.js";

import {
    createJob,
    deleteJob,
    getJob,
    listJobs,
    updateJob,
} from "../controllers/job.controller.js";

import {
    getJobRun,
    listJobRuns,
    retryJobRun,
    runJob,
} from "../controllers/jobRun.controller.js";

import {
    requireAuth,
} from "../middleware/auth.middleware.js";


const router =
    Router();


router.use(
    requireAuth
);


router.post(
    "/",
    createJob
);


router.get(
    "/",
    listJobs
);


router.post(
    "/:id/run",
    runJob
);


router.get(
    "/:id/runs",
    listJobRuns
);


router.get(
    "/:id/runs/:runId",
    getJobRun
);


router.post(
    "/:id/runs/:runId/retry",
    retryJobRun
);


router.post(
    "/:id/runs/:runId/analyze",
    analyzeJobRun
);


router.get(
    "/:id/runs/:runId/analysis",
    getJobRunAnalysis
);


router.get(
    "/:id",
    getJob
);


router.put(
    "/:id",
    updateJob
);


router.delete(
    "/:id",
    deleteJob
);


export default router;