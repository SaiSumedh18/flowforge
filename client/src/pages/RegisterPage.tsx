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


export function RegisterPage() {
    const {
        register,
        user,
    } =
        useAuth();

    const navigate =
        useNavigate();

    const [
        name,
        setName,
    ] =
        useState("");

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
            await register(
                name,
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
                    "Unable to create account"
                );
            } else {
                setError(
                    "Unable to create account"
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
                    FLOWFORGE
                </p>

                <h1>
                    Automate work.
                    <br />
                    Debug smarter.
                </h1>

                <p className="brand-copy">
                    Build and monitor scheduled
                    jobs with execution tracking
                    and AI-assisted failure
                    analysis.
                </p>
            </section>

            <section className="auth-form-panel">
                <div className="auth-card">
                    <div className="mobile-brand">
                        FlowForge
                    </div>

                    <p className="eyebrow">
                        GET STARTED
                    </p>

                    <h2>
                        Create your account
                    </h2>

                    <p className="muted-text">
                        Start building your job
                        workflows.
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
                            Name
                        </label>

                        <input
                            type="text"
                            value={name}
                            onChange={
                                (event) =>
                                    setName(
                                        event.target.value
                                    )
                            }
                            placeholder="Your name"
                            required
                        />

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
                            placeholder="At least 8 characters"
                            minLength={8}
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
                                ? "Creating account..."
                                : "Create account"}
                        </button>
                    </form>

                    <p className="auth-switch">
                        Already have an
                        account?{" "}
                        <Link to="/login">
                            Sign in
                        </Link>
                    </p>
                </div>
            </section>
        </div>
    );
}