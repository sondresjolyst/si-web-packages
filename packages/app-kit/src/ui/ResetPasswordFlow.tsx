"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { passwordProblems, type PasswordStrings } from "../validation/passwordRules";
import { Alert } from "./Alert";
import { PasswordInput } from "./PasswordInput";
import { defaultResetPasswordFlowStrings, type ResetPasswordFlowStrings } from "./resetPasswordFlowStrings";
import { TextInput } from "./TextInput";
import { withDefaults, type TextOverrides } from "./withDefaults";

export interface ResetPasswordFlowProps {
  /** Asks the API to email a reset code, such as `createUserService`'s `requestPasswordReset`. */
  requestReset: (data: { email: string }) => Promise<unknown>;
  /** Sets the new password with the code, such as `createUserService`'s `resetPassword`. */
  reset: (data: { email: string; code: string; newPassword: string }) => Promise<{ message?: string } | unknown>;
  /** Where the sign-in links go. */
  loginHref: string;
  /** From the emailed link. A code opens the flow on its last step. */
  initialEmail?: string | undefined;
  initialCode?: string | undefined;
  strings?: TextOverrides<ResetPasswordFlowStrings> | undefined;
  /** Replaces the page's outer spacing, such as when the flow sits inside the app's own card. */
  className?: string | undefined;
  /** The password rule messages, for the app's own language. */
  passwordStrings?: TextOverrides<PasswordStrings> | undefined;
}

const button =
  "w-full rounded-button bg-button-primary-bg text-button-primary-text font-semibold py-2.5 hover:brightness-95 disabled:opacity-60 transition";
const link = "font-auth-link text-auth-link hover:text-auth-link-hover transition-colors";

/**
 * Password reset in two steps: the email asks for a code, then the code and a new password set it. The
 * new password is checked against the API's rules before it is sent. A link with the email and code,
 * such as an invite, opens on the second step.
 */
export function ResetPasswordFlow({
  requestReset,
  reset,
  loginHref,
  initialEmail = "",
  initialCode = "",
  strings,
  className = "max-w-md mx-auto px-4 py-16",
  passwordStrings,
}: ResetPasswordFlowProps) {
  const text = withDefaults(defaultResetPasswordFlowStrings, strings);
  const [step, setStep] = useState<1 | 2>(initialCode ? 2 : 1);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(initialCode);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const failure = (err: unknown) => (err instanceof Error && err.message ? err.message : text.somethingWentWrong);

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestReset({ email });
      setStep(2);
    } catch (err) {
      setError(failure(err));
    } finally {
      setLoading(false);
    }
  };

  const setPassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const problems = passwordProblems(newPassword, passwordStrings);
    if (problems.length > 0) {
      setError(text.passwordInvalid ?? problems.join(" "));
      return;
    }
    setLoading(true);
    try {
      const result = await reset({ email, code, newPassword });
      const message = (result as { message?: unknown } | null | undefined)?.message;
      setDone(text.done ?? (typeof message === "string" ? message : ""));
    } catch (err) {
      setError(failure(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <h1 className="text-auth-title font-auth-title text-auth-heading mb-1">{text.title}</h1>
      <p className="text-sm text-auth-text mb-6">
        {text.signInPrompt && <>{text.signInPrompt} </>}
        <Link href={loginHref} className={link}>{text.signIn}</Link>
      </p>

      {done !== null ? (
        <Alert variant="success">
          {done}
          <Link href={loginHref} className={`block mt-3 ${link}`}>{text.backToSignIn}</Link>
        </Alert>
      ) : step === 1 ? (
        <form onSubmit={sendCode} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          {text.intro && <p className="text-sm text-auth-text">{text.intro}</p>}
          <TextInput label={text.email} name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" disabled={loading} className={button}>
            {loading ? text.requestingCode : text.requestCode}
          </button>
        </form>
      ) : (
        <form onSubmit={setPassword} className="space-y-4">
          {text.codeSent && <p className="text-sm text-auth-note">{text.codeSent}</p>}
          {error && <Alert variant="error">{error}</Alert>}
          <TextInput label={text.email} name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <TextInput label={text.code} name="code" value={code} onChange={(e) => setCode(e.target.value)} required />
          <PasswordInput label={text.newPassword} name="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          {text.passwordHint && <p className="text-xs text-auth-hint">{text.passwordHint}</p>}
          <button type="submit" disabled={loading} className={button}>
            {loading ? text.settingPassword : text.setPassword}
          </button>
        </form>
      )}
    </div>
  );
}
