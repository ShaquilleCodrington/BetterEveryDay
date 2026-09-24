import { useState } from "react";
import { SignInAuthScreen } from "@firebase-oss/ui-react";


interface LoginScreenProps {
    onGuest: () => void;
}

export default function LoginScreen({
    onGuest,
}: LoginScreenProps) {
    const [showCreateAccount, setShowCreateAccount] = useState(false);


if (showCreateAccount) {
    return (
        <div className="firebase-login">
            <div className="login-page">

                <div className="login-logo-container">
                    <img
                        src={`${import.meta.env.BASE_URL}BetterEveryDayLogo.png`}
                        alt="BetterEveryDay"
                        className="login-logo"
                    />
                </div>

                <div className="login-content">
                    <h1>Create Account</h1>

                    <SignInAuthScreen />

                    <div className="login-actions">
                        <button
                            type="button"
                            onClick={() => setShowCreateAccount(false)}
                        >
                            Back to Login
                        </button>

                        <button
                            type="button"
                            onClick={onGuest}
                        >
                            Continue as Guest
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

    return (
        <div className="firebase-login">
             <div className="login-page">
                <div className="login-logo-container">
    <img
        src={`${import.meta.env.BASE_URL}BetterEveryDayLogo.png`}
        alt="BetterEveryDay"
        className="login-logo"
    />
</div>

<div className="login-content">
    <h1>Login</h1>

    <SignInAuthScreen />

    <div className="login-actions">
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
</div>
</div>
</div>
    );
}