import cors from "cors";
import express from "express";
import helmet from "helmet";

import authRoutes from "./routes/auth.routes.js";
import jobRoutes from "./routes/job.routes.js";

export const app =
    express();

const allowedOrigins = [
    "http://localhost:5176",
    process.env.CLIENT_URL,
].filter(
    (
        origin
    ): origin is string =>
        Boolean(origin)
);

app.use(
    helmet()
);

app.use(
    cors({
        origin:
            allowedOrigins,

        credentials:
            true,
    })
);

app.use(
    express.json()
);

app.get(
    "/api/health",
    (_req, res) => {
        res.status(200).json({
            success: true,
            message:
                "FlowForge API is running",
        });
    }
);

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/jobs",
    jobRoutes
);