import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import TextInput from "../../components/forms/TextInput";
import { getDefaultLandingPath, login } from "../../features/reos/services/reosAuthService";

const brandGradient = "linear-gradient(135deg, #0B2A52 0%, #1E5AA8 55%, #2E73C7 100%)";

const featureHighlights = [
  "Multi-branch payout orchestration",
  "Real-time liquidity visibility",
  "Bank-grade session security",
];

function UserIcon() {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} viewBox="0 0 24 24">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} viewBox="0 0 24 24">
      <rect height="9" rx="2" width="16" x="4" y="11" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Chrome (and other browsers) can inject an autofilled value directly into the input's
  // DOM node without going through React's onChange - autoComplete="off" is not reliably
  // honored for username/password fields by design, so React's own state can genuinely be
  // "" while the field visibly shows a stale saved credential. Explicitly wipe both state
  // and the raw DOM value on mount, and again after a short delay - autofill sometimes
  // injects a beat after the initial paint, not synchronously with it.
  useEffect(() => {
    const clearFields = () => {
      setUsername("");
      setPassword("");

      if (usernameRef.current) {
        usernameRef.current.value = "";
      }

      if (passwordRef.current) {
        passwordRef.current.value = "";
      }
    };

    clearFields();
    const timeoutId = setTimeout(clearFields, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  async function handleLogin() {
    setError(null);
    setSubmitting(true);

    try {
      const session = await login(username, password);
      navigate(session.forcePasswordChange ? "/reos/change-password" : getDefaultLandingPath(session), { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* Branded backdrop - desktop only. Purely decorative/informational, no interactive
          or credential-bearing content, so it carries none of the security requirements
          below. */}
      <div
        className="relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between"
        style={{ background: brandGradient, padding: 48 }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-lg font-bold text-white ring-1 ring-white/20 backdrop-blur-sm">
            RE
          </span>
          <span className="text-lg font-semibold tracking-wide text-white">REMIT EXCHANGE</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-semibold leading-tight text-white">Enterprise remittance operations, unified.</h2>
          <p className="mt-4 text-sm text-blue-100/90">
            Manage branch payouts, liquidity, and operational workflows from a single secure operations portal.
          </p>

          <ul className="mt-8 space-y-4">
            {featureHighlights.map((highlight) => (
              <li className="flex items-center gap-3 text-sm text-blue-50" key={highlight}>
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                  <CheckIcon />
                </span>
                {highlight}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-blue-100/70">© {new Date().getFullYear()} Remit Exchange. All rights reserved.</p>
      </div>

      {/* Sign-in panel */}
      <div className="flex w-full flex-col items-center justify-center bg-slate-50 px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 text-center lg:hidden">
            <span
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white"
              style={{ background: "#1E5AA8" }}
            >
              RE
            </span>
            <h1 className="text-2xl font-bold" style={{ color: "#1E5AA8" }}>
              REMIT EXCHANGE
            </h1>
            <p className="mt-1 text-sm text-slate-500">Operations Portal</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/60">
            <div className="mb-7 hidden lg:block">
              <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
              <p className="mt-1 text-sm text-slate-500">Sign in to continue to your operations dashboard.</p>
            </div>

            <TextInput
              autoComplete="off"
              icon={<UserIcon />}
              label="Username"
              name="reos-username"
              ref={usernameRef}
              value={username}
              onChange={setUsername}
              placeholder="Enter your username"
            />

            <TextInput
              autoComplete="new-password"
              icon={<LockIcon />}
              label="Password"
              name="reos-password"
              ref={passwordRef}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Enter password"
            />

            {error ? (
              <div className="mb-1 mt-1 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertIcon />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="mt-6">
              <Button disabled={submitting} fullWidth onClick={() => void handleLogin()}>
                {submitting ? "Signing In..." : "Sign In"}
              </Button>
            </div>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <ShieldCheckIcon />
              Secured session · auto sign-out after 15 minutes idle
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">Powered by REOS v1.0</p>
        </div>
      </div>
    </div>
  );
}
