import {
    useState,
    type FormEvent,
} from "react";

import axios from "axios";

import {
    Link,
    Navigate,
    useNavigate,
} from "react-router-dom";

import {
    useAuth,
} from "../context/AuthContext";


export function LoginPage() {
    const {
        login,
        user,
    } =
        useAuth();

    const navigate =
        useNavigate();

    const [
        email,
        setEmail,
    ] =
        useState("");

    const [
        password,
        setPassword,
    ] =
        useState("");

    const [
        error,
        setError,
    ] =
        useState("");

    const [
        submitting,
        setSubmitting,
    ] =
        useState(false);


    if (user) {
        return (
            <Navigate
                to="/"
                replace
            />
        );
    }


    async function handleSubmit(
        event: FormEvent
    ) {
        event.preventDefault();

        setError("");
        setSubmitting(true);

        try {
            await login(
                email,
                password
            );

            navigate("/");
        } catch (requestError) {
            if (
                axios.isAxiosError(
                    requestError
                )
            ) {
                setError(
                    requestError.response
                        ?.data?.message ??
                    "Unable to log in"
                );
            } else {
                setError(
                    "Unable to log in"
                );
            }
        } finally {
            setSubmitting(false);
        }
    }


    return (
        <div className="auth-page">
            <section className="auth-brand-panel">
                <div className="brand-mark">
                    FF
                </div>

                <p className="eyebrow">
                    JOB ORCHESTRATION
                </p>

                <h1>
                    Run jobs.
                    <br />
                    Understand failures.
                </h1>

                <p className="brand-copy">
                    Schedule, execute, monitor,
                    retry, and analyze background
                    jobs from one dashboard.
                </p>

                <div className="feature-list">
                    <span>
                        ✓ Automated scheduling
                    </span>

                    <span>
                        ✓ Execution history
                    </span>

                    <span>
                        ✓ AI failure analysis
                    </span>
                </div>
            </section>

            <section className="auth-form-panel">
                <div className="auth-card">
                    <div className="mobile-brand">
                        FlowForge
                    </div>

                    <p className="eyebrow">
                        WELCOME BACK
                    </p>

                    <h2>
                        Sign in to FlowForge
                    </h2>

                    <p className="muted-text">
                        Continue managing your
                        scheduled jobs.
                    </p>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <form
                        onSubmit={
                            handleSubmit
                        }
                    >
                        <label>
                            Email
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={
                                (event) =>
                                    setEmail(
                                        event.target.value
                                    )
                            }
                            placeholder="you@example.com"
                            required
                        />

                        <label>
                            Password
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={
                                (event) =>
                                    setPassword(
                                        event.target.value
                                    )
                            }
                            placeholder="Enter your password"
                            required
                        />

                        <button
                            className="primary-button"
                            type="submit"
                            disabled={
                                submitting
                            }
                        >
                            {submitting
                                ? "Signing in..."
                                : "Sign in"}
                        </button>
                    </form>

                    <p className="auth-switch">
                        New to FlowForge?{" "}
                        <Link to="/register">
                            Create an account
                        </Link>
                    </p>
                </div>
            </section>
        </div>
    );
}