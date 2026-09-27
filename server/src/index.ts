import "dotenv/config";

import {
    app,
} from "./app.js";

import {
    pool,
} from "./config/db.js";

import {
    startScheduler,
} from "./services/scheduler.service.js";


const PORT =
    Number(
        process.env.PORT
    ) || 4200;


async function startServer() {
    try {
        await pool.query(
            "SELECT 1"
        );

        console.log(
            "PostgreSQL connected successfully"
        );

        app.listen(
            PORT,
            "0.0.0.0",
            () => {
                console.log(
                    `FlowForge API running on http://localhost:${PORT}`
                );

                startScheduler();
            }
        );
    } catch (error) {
        console.error(
            "Unable to start FlowForge:",
            error
        );

        process.exit(1);
    }
}


startServer();