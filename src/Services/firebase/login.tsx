// 2026-10-17: only useState is imported from React now. No event type needed.
import { useState } from "react";
import { createAccount, resetPassword, signIn } from "./auth";


interface LoginScreenProps {
    onGuest: () => void;
}

// 2026-10-17: Turns Firebase error codes into plain-language messages.
function friendlyError(error: unknown): string {
    const code = (error as { code?: string })?.code ?? "";

    switch (code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
            return "That email and password don't match. Please try again.";
        case "auth/invalid-email":
            return "That doesn't look like a valid email address.";
        case "auth/email-already-in-use":
            return "An account with that email already exists. Try signing in instead.";
        case "auth/weak-password":
            return "Please choose a password with at least 6 characters.";
        case "auth/too-many-requests":
            return "Too many attempts. Please wait a moment and try again.";
        case "auth/network-request-failed":
            return "Couldn't reach the server. Check your connection and try again.";
        default:
            return "Something went wrong. Please try again.";
    }
}

export default function LoginScreen({
    onGuest,
}: LoginScreenProps) {
    const [mode, setMode] = useState<"signin" | "create">("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const isCreate = mode === "create";

    // 2026-10-17: CHANGED. No event parameter and no event type.
    // preventDefault now happens in the form's onSubmit below.
    // No navigation here: when sign-in succeeds, useAuthConnector sets
    // currentUser and AuthGate renders the app.
    async function handleSubmit() {
        setError("");
        setNotice("");

        if (!email.trim()) {
            setError("Please enter your email address.");
            return;
        }
        if (!password) {
            setError("Please enter your password.");
            return;
        }

        setBusy(true);
        try {
            if (isCreate) {
                await createAccount(email.trim(), password);
            } else {
                await signIn(email.trim(), password);
            }
        } catch (err) {
            setError(friendlyError(err));
        } finally {
            setBusy(false);
        }
    }

    // Forgot password uses the email already typed in.
    async function handleForgot() {
        setError("");
        setNotice("");

        if (!email.trim()) {
            setError("Enter your email above, then select Forgot password.");
            return;
        }

        try {
            await resetPassword(email.trim());
            setNotice("If an account exists for that email, a reset link is on its way.");
        } catch (err) {
            setError(friendlyError(err));
        }
    }

    // Switching modes clears messages but keeps the typed email.
    function switchMode(next: "signin" | "create") {
        setMode(next);
        setError("");
        setNotice("");
    }

    return (
        <div className="firebase-login">
            <div className="login-page">

                {/* Logo is unchanged. On desktop it sits over the open left half. */}
                <div className="login-logo-container">
                    <img
                        src={`${import.meta.env.BASE_URL}BetterEveryDayLogo.png`}
                        alt="BetterEveryDay"
                        className="login-logo"
                    />
                </div>

                {/* Right half of the screen. The left half stays empty so the existing background shows. */}
                <div className="login-half">

                    <div className="login-content">

                        <h1>{isCreate ? "Let's get you started." : "Welcome back."}</h1>
                        <p className="login-form-subtitle">
                            {isCreate
                                ? "Create your account and begin your journey."
                                : "Pick up where you left off. Sign in to continue your journey."}
                        </p>

                        {/* 2026-10-17: CHANGED. The handler is written inline, so TypeScript works out
                            the event type from the <form> itself. preventDefault stops the browser from
                            reloading the page. */}
                        <form
                            className="login-form"
                            onSubmit={(e) => {
                                e.preventDefault();
                                void handleSubmit();
                            }}
                            noValidate
                        >

                            <div className="login-form-field">
                                <label htmlFor="login-email">Email address</label>
                                <input
                                    id="login-email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={busy}
                                    aria-invalid={!!error}
                                    aria-describedby={error ? "login-error" : undefined}
                                />
                            </div>

                            <div className="login-form-field">
                                <div className="login-form-label-row">
                                    <label htmlFor="login-password">Password</label>

                                    {!isCreate && (
                                        <button
                                            type="button"
                                            className="login-form-link"
                                            onClick={handleForgot}
                                            disabled={busy}
                                        >
                                            Forgot password?
                                        </button>
                                    )}
                                </div>

                                <div className="login-form-password">
                                    <input
                                        id="login-password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete={isCreate ? "new-password" : "current-password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={busy}
                                        aria-invalid={!!error}
                                        aria-describedby={error ? "login-error" : undefined}
                                    />
                                    <button
                                        type="button"
                                        className="login-form-toggle"
                                        onClick={() => setShowPassword((v) => !v)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        aria-pressed={showPassword}
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <p id="login-error" className="login-form-message login-form-error" role="alert">
                                    Error: {error}
                                </p>
                            )}
                            {notice && (
                                <p className="login-form-message" role="status">
                                    {notice}
                                </p>
                            )}

                            <button
                                type="submit"
                                className="btn-primary login-form-submit"
                                disabled={busy}
                            >
                                {busy
                                    ? isCreate ? "Creating account…" : "Signing in…"
                                    : isCreate ? "Create account" : "Sign in"}
                            </button>
                        </form>

                        <div className="login-form-section">
                            <span>
                                {isCreate ? "Already have an account?" : "New to Better Every Day?"}
                            </span>
                            <button
                                type="button"
                                className="login-form-link"
                                onClick={() => switchMode(isCreate ? "signin" : "create")}
                                disabled={busy}
                            >
                                {isCreate ? "Sign in" : "Create an account"}
                            </button>
                        </div>

                        <hr className="login-form-divider" />

                        {/* Guest section. Uses the existing onGuest flow from App.tsx. */}
                        <div className="login-form-guest">
                            <h2>Just looking around?</h2>
                            <p>Jump in and explore. You can get started with a guest account in one click.</p>
                            <button
                                type="button"
                                className="login-form-guest-btn"
                                onClick={onGuest}
                                disabled={busy}
                            >
                                Continue as guest
                            </button>
                        </div>

                    </div>

                </div>

            </div>
        </div>
    );
}