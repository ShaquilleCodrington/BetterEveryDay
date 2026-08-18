import { SignInAuthScreen } from "@firebase-oss/ui-react";

interface LoginScreenProps {
    onGuest: () => void;
}

export default function LoginScreen({
    onGuest,
}: LoginScreenProps) {
    return (
        <div className="firebase-login">
            <SignInAuthScreen />

            <button
                type="button"
                onClick={onGuest}
            >
                Continue as Guest
            </button>
        </div>
    );
}