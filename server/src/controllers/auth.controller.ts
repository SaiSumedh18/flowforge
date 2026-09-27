import bcrypt from "bcrypt";
import type {
    Request,
    Response,
} from "express";
import {
    z,
} from "zod";

import {
    pool,
} from "../config/db.js";

import {
    signToken,
} from "../utils/jwt.js";

const registerSchema =
    z.object({
        name:
            z.string()
                .trim()
                .min(
                    2,
                    "Name must contain at least 2 characters"
                )
                .max(
                    100,
                    "Name is too long"
                ),

        email:
            z.string()
                .trim()
                .email(
                    "Enter a valid email address"
                )
                .max(
                    255,
                    "Email is too long"
                ),

        password:
            z.string()
                .min(
                    8,
                    "Password must contain at least 8 characters"
                )
                .max(
                    100,
                    "Password is too long"
                ),
    });

const loginSchema =
    z.object({
        email:
            z.string()
                .trim()
                .email(
                    "Enter a valid email address"
                ),

        password:
            z.string()
                .min(
                    1,
                    "Password is required"
                ),
    });

export async function register(
    req: Request,
    res: Response
) {
    const parsed =
        registerSchema.safeParse(
            req.body
        );

    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message:
                parsed.error.issues[0]
                    ?.message ??
                "Invalid registration data",
        });
    }

    const {
        name,
        email,
        password,
    } =
        parsed.data;

    const normalizedEmail =
        email.toLowerCase();

    try {
        const existingUser =
            await pool.query(
                `
          SELECT id
          FROM users
          WHERE LOWER(email) = LOWER($1)
        `,
                [
                    normalizedEmail,
                ]
            );

        if (
            existingUser.rowCount &&
            existingUser.rowCount > 0
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "An account with this email already exists",
            });
        }

        const passwordHash =
            await bcrypt.hash(
                password,
                12
            );

        const result =
            await pool.query(
                `
          INSERT INTO users (
            name,
            email,
            password_hash
          )
          VALUES (
            $1,
            $2,
            $3
          )
          RETURNING
            id,
            name,
            email,
            created_at
        `,
                [
                    name,
                    normalizedEmail,
                    passwordHash,
                ]
            );

        const user =
            result.rows[0];

        const token =
            signToken(user.id);

        return res.status(201).json({
            success: true,
            message:
                "Account created successfully",
            user,
            token,
        });
    } catch (error) {
        console.error(
            "Registration error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to create account",
        });
    }
}

export async function login(
    req: Request,
    res: Response
) {
    const parsed =
        loginSchema.safeParse(
            req.body
        );

    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message:
                parsed.error.issues[0]
                    ?.message ??
                "Invalid login data",
        });
    }

    const {
        email,
        password,
    } =
        parsed.data;

    try {
        const result =
            await pool.query(
                `
          SELECT
            id,
            name,
            email,
            password_hash,
            created_at
          FROM users
          WHERE LOWER(email) = LOWER($1)
        `,
                [
                    email.toLowerCase(),
                ]
            );

        if (
            !result.rowCount ||
            result.rowCount === 0
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid email or password",
            });
        }

        const user =
            result.rows[0];

        const passwordMatches =
            await bcrypt.compare(
                password,
                user.password_hash
            );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid email or password",
            });
        }

        const token =
            signToken(user.id);

        return res.status(200).json({
            success: true,
            message:
                "Login successful",

            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                created_at:
                    user.created_at,
            },

            token,
        });
    } catch (error) {
        console.error(
            "Login error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to log in",
        });
    }
}

export async function getMe(
    req: Request,
    res: Response
) {
    if (!req.userId) {
        return res.status(401).json({
            success: false,
            message:
                "Authentication required",
        });
    }

    try {
        const result =
            await pool.query(
                `
          SELECT
            id,
            name,
            email,
            created_at
          FROM users
          WHERE id = $1
        `,
                [
                    req.userId,
                ]
            );

        if (
            !result.rowCount ||
            result.rowCount === 0
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            user:
                result.rows[0],
        });
    } catch (error) {
        console.error(
            "Get current user error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load user",
        });
    }
}