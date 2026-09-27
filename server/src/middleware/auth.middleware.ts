import type {
    NextFunction,
    Request,
    Response,
} from "express";

import {
    verifyToken,
} from "../utils/jwt.js";

export function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const authorization =
        req.headers.authorization;

    if (!authorization) {
        return res.status(401).json({
            success: false,
            message:
                "Authorization token is required",
        });
    }

    const [
        scheme,
        token,
    ] =
        authorization.split(" ");

    if (
        scheme !== "Bearer" ||
        !token
    ) {
        return res.status(401).json({
            success: false,
            message:
                "Invalid authorization format",
        });
    }

    try {
        const payload =
            verifyToken(token);

        req.userId =
            payload.userId;

        next();
    } catch {
        return res.status(401).json({
            success: false,
            message:
                "Invalid or expired token",
        });
    }
}