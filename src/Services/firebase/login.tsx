import { useState } from "react";
import { SignInAuthScreen } from "@firebase-oss/ui-react";
import { createAccount } from "./auth";

interface LoginScreenProps {
    onGuest: () => void;
}

export default function LoginScreen({
    onGuest,
}: LoginScreenProps) {
    const [showCreateAccount, setShowCreateAccount] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    async function handleCreateAccount() {
        setError("");

        if (!email.trim()) {
            setError("Please enter an email address.");
            return;
        }

        if (!password) {
            setError("Please enter a password.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setCreating(true);

            // 2026-08-22:
            // Account creation is delegated to the centralized
            // Firebase authentication layer.
            //
            // Firebase automatically signs the newly created
            // account in. The resulting User then propagates
            // through the centralized authentication state.
            await createAccount(email.trim(), password);

            // Do NOT manually set currentUser here.
            // Firebase authentication state handles that.
        } catch (err) {
            console.error("Account creation failed:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to create account."
            );
        } finally {
            setCreating(false);
        }
    }

    if (showCreateAccount) {
        return (
            <div className="firebase-login">
                <div className="glass-panel">
                    <h1>Create Account</h1>

                    <p>
                        Create your BetterEveryDay account.
                    </p>

                    <div className="form-field">
                        <label htmlFor="create-email">
                            Email
                        </label>

                        <input
                            id="create-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="create-password">
                            Password
                        </label>

                        <input
                            id="create-password"
                            name="new-password"
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="confirm-password">
                            Confirm Password
                        </label>

                        <input
                            id="confirm-password"
                            name="confirm-password"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) =>
                                setConfirmPassword(e.target.value)
                            }
                        />
                    </div>

                    {error && (
                        <p
                            role="alert"
                            style={{
                                color: "rgba(255,120,120,0.9)",
                            }}
                        >
                            {error}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={handleCreateAccount}
                        disabled={creating}
                    >
                        {creating
                            ? "Creating Account..."
                            : "Create Account"}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setError("");
                            setShowCreateAccount(false);
                        }}
                        disabled={creating}
                    >
                        Back to Login
                    </button>

                    <button
                        type="button"
                        onClick={onGuest}
                        disabled={creating}
                    >
                        Continue as Guest
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="firebase-login">
            <SignInAuthScreen />

            <button
                type="button"
                onClick={() => setShowCreateAccount(true)}
            >
                Create Account
            </button>

            <button
                type="button"
                onClick={onGuest}
            >
                Continue as Guest
            </button>
        </div>
    );
}