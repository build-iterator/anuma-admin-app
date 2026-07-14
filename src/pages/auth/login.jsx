import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { MorseA, MorseSpinner } from "@/components/brand/morse";
import {
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useGoogleLoginMutation,
} from "@/api/services/auth";
import { setAccessToken } from "@/api/slices/authSlice";
import { resetAllApiState } from "@/api/resetApiState";
import pkg from "../../../package.json";

const VERSION = `v${pkg.version.split(".").slice(0, 2).join(".")}`;

const RESEND_SECONDS = 30;

const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const maskEmail = (e) => {
  const [user, domain] = e.split("@");
  return `${user.slice(0, 2)}···@${domain}`;
};

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

const pillButton =
  "flex h-11 w-full items-center justify-center gap-2.5 rounded-full text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-60";
const darkPill = cn(pillButton, "bg-[#1a1a1a] text-white hover:bg-[#333]");
const ringPill = cn(pillButton, "bg-white text-[#1a1a1a] ring-1 ring-[#e4e4e7] hover:bg-[#fafafa]");

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function SignInFlow({ recoverSignal = 0 }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [requestOtp] = useRequestOtpMutation();
  const [verifyOtp] = useVerifyOtpMutation();
  const [googleLogin] = useGoogleLoginMutation();
  const googleBtnRef = useRef(null);
  const [step, setStep] = useState("method"); // method | code | recover
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [ssoNote, setSsoNote] = useState("");
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);

  // "Can't sign in?" lives on the frame (bottom center); it signals up here.
  // State adjusted during render (not an effect) per React's derived-state
  // guidance, so the lint rule stays happy.
  const [seenSignal, setSeenSignal] = useState(recoverSignal);
  if (recoverSignal !== seenSignal) {
    setSeenSignal(recoverSignal);
    setStep("recover");
  }

  const destination = useMemo(() => maskEmail(email || "you@iterator.in"), [email]);

  useEffect(() => {
    if (step !== "code" || resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, resendIn]);

  // Render Sign in with Google via GIS (loaded from index.html). We wait on
  // window.google to appear, then swap our styled placeholder for Google's
  // rendered button so accessibility + PKCE flow stay official.
  useEffect(() => {
    if (step !== "method" || !GOOGLE_CLIENT_ID) return undefined;
    let cancelled = false;
    const init = () => {
      if (cancelled) return true;
      const gsi = window.google?.accounts?.id;
      if (!gsi || !googleBtnRef.current) return false;
      gsi.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          try {
            const { token } = await googleLogin({ credential }).unwrap();
            resetAllApiState(dispatch);
            dispatch(setAccessToken(token));
            navigate("/", { replace: true });
          } catch (err) {
            const detail = err?.data?.error;
            setSsoNote(detail || "Google sign-in failed. Try email instead.");
          }
        },
      });
      gsi.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "left",
        width: 320,
      });
      return true;
    };
    if (init()) return () => { cancelled = true; };
    const iv = setInterval(() => { if (init()) clearInterval(iv); }, 200);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [step, dispatch, googleLogin, navigate]);

  const requestCode = async () => {
    setFieldError("");
    if (!validEmail(email)) {
      setFieldError("Enter a valid work email.");
      return;
    }
    setSending(true);
    try {
      await requestOtp({ email }).unwrap();
      setCode("");
      setCodeError(false);
      setResendIn(RESEND_SECONDS);
      setStep("code");
    } catch {
      setFieldError("Couldn't send the code. Try again.");
    } finally {
      setSending(false);
    }
  };

  const verify = async (value) => {
    setVerifying(true);
    try {
      const { token } = await verifyOtp({ email, code: value }).unwrap();
      resetAllApiState(dispatch);
      dispatch(setAccessToken(token));
      navigate("/", { replace: true });
    } catch {
      setVerifying(false);
      setCodeError(true);
      setCode("");
    }
  };

  /* ---------------- recover ---------------- */
  if (step === "recover") {
    return (
      <div className="flex flex-col gap-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-[22px] font-semibold leading-tight text-[#1a1a1a]">Can’t sign in?</h1>
          <p className="text-sm text-[#8a8f98]">
            Admin access is invite-only — a teammate with access can re-issue yours.
          </p>
        </div>
        <a className={ringPill} href="mailto:build@iterator.in?subject=Anuma%20Admin%20sign-in%20help">
          Write to build@iterator.in
        </a>
        <button
          type="button"
          onClick={() => setStep("method")}
          className="inline-flex items-center gap-1.5 self-start text-sm text-[#8a8f98] underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-3.5" /> Back
        </button>
      </div>
    );
  }

  /* ---------------- code ---------------- */
  if (step === "code") {
    return (
      <div className="flex flex-col gap-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-[22px] font-semibold leading-tight text-[#1a1a1a]">Enter the code</h1>
          <p className="text-sm text-[#8a8f98]">
            Sent to <span className="text-[#1a1a1a]">{destination}</span>
          </p>
        </div>

        <div className={cn(codeError && "animate-shake")}>
          <input
            autoFocus
            value={code}
            disabled={verifying}
            inputMode="numeric"
            maxLength={6}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              setCode(v);
              setCodeError(false);
              if (v.length === 6) verify(v);
            }}
            placeholder="······"
            className="h-12 w-full rounded-[10px] border border-[#e4e4e7] bg-white text-center font-mono text-lg tracking-[0.6em] outline-none placeholder:text-[#d5d7db] focus:ring-1 focus:ring-[#1a1a1a]/30"
          />
          {codeError && <p className="mt-2 text-sm text-red-600">That code didn’t match. Try again.</p>}
        </div>

        <div className="flex items-center justify-between text-sm">
          {resendIn > 0 ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8a8f98]">
              RESEND IN 0:{String(resendIn).padStart(2, "0")}
            </span>
          ) : (
            <button
              type="button"
              className="underline-offset-4 hover:underline"
              onClick={() => setResendIn(RESEND_SECONDS)}
            >
              Resend code
            </button>
          )}
          {verifying && <MorseSpinner className="text-[#8a8f98]" />}
        </div>

        <button
          type="button"
          onClick={() => setStep("method")}
          className="inline-flex items-center gap-1.5 self-start text-sm text-[#8a8f98] underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-3.5" /> Use another method
        </button>
      </div>
    );
  }

  /* ---------------- method ---------------- */
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-[22px] font-semibold leading-tight text-[#1a1a1a]">Sign in</h1>
        <p className="text-sm text-[#8a8f98]">The business control center. Team only.</p>
      </div>

      <div className="grid gap-2.5">
        {GOOGLE_CLIENT_ID ? (
          <div ref={googleBtnRef} className="flex justify-center" />
        ) : (
          <button
            type="button"
            className={ringPill}
            onClick={() => setSsoNote("Google SSO client not configured.")}
          >
            <GoogleMark /> Continue with Google
          </button>
        )}
        {ssoNote && <p className="text-center text-xs text-[#8a8f98]">{ssoNote}</p>}
      </div>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[#ececec]" />
        <span className="text-xs text-[#8a8f98]">or</span>
        <span className="h-px flex-1 bg-[#ececec]" />
      </div>

      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium text-[#1a1a1a]">
          Work email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@iterator.in"
          value={email}
          onChange={(e) => setEmail(e.target.value.trim())}
          onKeyDown={(e) => e.key === "Enter" && requestCode()}
          className="h-11 w-full rounded-[10px] border border-[#e4e4e7] bg-white px-3 text-sm outline-none placeholder:text-[#b0b3ba] focus:ring-1 focus:ring-[#1a1a1a]/30"
        />
        {fieldError && <p className="text-sm text-red-600">{fieldError}</p>}
      </div>

      <button type="button" className={darkPill} onClick={requestCode} disabled={sending}>
        {sending && <MorseSpinner />}
        Send code
      </button>
    </div>
  );
}

export default function LoginPage() {
  const [recoverSignal, setRecoverSignal] = useState(0);

  return (
    <div
      className="relative flex min-h-svh flex-col items-center justify-center bg-[#1b1b1b] p-6 font-['Inter',ui-sans-serif,sans-serif]"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 900px 620px at 50% 42%, rgba(255,255,255,0.04), transparent 72%)," +
          "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
        backgroundSize: "auto, 16px 16px",
      }}
    >
      <div className="mb-7 flex items-center gap-3 text-white">
        <MorseA u={6} gap={5} />
        <span className="font-serif text-[22px] font-normal lowercase leading-none">anuma</span>
        <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-300 ring-1 ring-amber-300/30">
          Admin
        </span>
      </div>

      <div className="w-full max-w-[400px] rounded-[16px] bg-white p-8 shadow-[0_1px_2px_rgba(16,17,20,0.06)] ring-1 ring-white/10">
        <SignInFlow recoverSignal={recoverSignal} />
      </div>

      <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-baseline gap-3">
        <button
          type="button"
          onClick={() => setRecoverSignal((n) => n + 1)}
          className="text-sm text-white/50 underline-offset-4 transition-colors hover:text-white/80 hover:underline"
        >
          Can’t sign in?
        </button>
        <span className="font-mono text-[10px] tracking-[0.18em] text-white/30">{VERSION}</span>
      </div>
    </div>
  );
}
