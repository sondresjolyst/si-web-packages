"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { errorText, fieldErrorTexts } from "../api/fieldErrorText";
import { passwordProblems, type PasswordStrings } from "../validation/passwordRules";
import { Alert } from "./Alert";
import { authLinkClassName, authPageClassName, authTitleClassName } from "./authClasses";
import { PasswordInput } from "./PasswordInput";
import {
  defaultResetPasswordFlowStrings,
  type ResetPasswordErrorStrings,
  type ResetPasswordFlowStrings,
  type ResetPasswordValidationStrings,
} from "./resetPasswordFlowStrings";
import { TextInput } from "./TextInput";
import { withDefaults, type TextOverrides } from "./withDefaults";

/** Props for `ResetPasswordFlow`. */
export interface ResetPasswordFlowProps {
  /** A function that asks the API to email a reset code, such as `createUserService`'s `requestPasswordReset`. */
  requestReset: (data: { email: string }) => Promise<unknown>;
  /** A function that sets the new password with the code, such as `createUserService`'s `resetPassword`. */
  reset: (data: { email: string; code: string; newPassword: string }) => Promise<{ message?: string } | unknown>;
  /** The path the sign-in links go to. */
  loginHref: string;
  /** The email from the emailed link. */
  initialEmail?: string | undefined;
  /** The code from the emailed link. A code opens the flow on its last step. */
  initialCode?: string | undefined;
  /** The flow's text. `validation` and `errors` may name only some codes, the rest keep their defaults. */
  strings?:
    | (TextOverrides<Omit<ResetPasswordFlowStrings, "validation" | "errors">> & {
        validation?: TextOverrides<ResetPasswordValidationStrings> | undefined;
        errors?: TextOverrides<ResetPasswordErrorStrings> | undefined;
      })
    | undefined;
  /** The classes that replace the page's outer spacing, such as when the flow sits inside the app's own card. */
  className?: string | undefined;
  /** The password rule messages, for the app's own language. */
  passwordStrings?: TextOverrides<PasswordStrings> | undefined;
}

// The fields each step shows. A field error for any other field goes in the message above the form.
const STEP_FIELDS = { 1: ["email"], 2: ["email", "code", "newPassword"] } as const;

const button =
  "w-full rounded-button bg-button-primary-bg text-button-primary-text font-semibold py-2.5 hover:brightness-95 disabled:opacity-60 transition";

/**
 * Renders password reset in two steps: the email asks for a code, then the code and a new password
 * set it. The flow checks the new password against the API's rules before it sends it. A link with
 * the email and code, such as an invite, opens on the second step. The API's refusals show in the
 * app's language through `validation` and `errors`, each field's under its field.
 */
export function ResetPasswordFlow({
  requestReset,
  reset,
  loginHref,
  initialEmail = "",
  initialCode = "",
  strings,
  className = authPageClassName,
  passwordStrings,
}: ResetPasswordFlowProps) {
  const { validation: validationOverrides, errors: errorOverrides, ...textOverrides } = strings ?? {};
  const text = withDefaults(defaultResetPasswordFlowStrings, textOverrides);
  const validation = withDefaults(defaultResetPasswordFlowStrings.validation, validationOverrides);
  const errors = withDefaults(defaultResetPasswordFlowStrings.errors, errorOverrides);
  const [step, setStep] = useState<1 | 2>(initialCode ? 2 : 1);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(initialCode);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // The texts for the fields the last attempt got wrong, keyed by field name.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Field errors go under the fields this step shows, and the message holds the rest.
  const fail = (err: unknown, shown: readonly string[]) => {
    const texts = Object.entries(fieldErrorTexts(err, validation));
    if (texts.length === 0) {
      setError(errorText(err, errors, text.somethingWentWrong));
      return;
    }
    // Only the fields this step shows render their errors.
    setFieldErrors(Object.fromEntries(texts));
    // Empty when every field error has its field, which shows no message.
    setError(texts.filter(([field]) => !shown.includes(field)).flatMap(([, list]) => list).join(" "));
  };

  const fieldError = (field: string) => fieldErrors[field]?.join(" ");

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      await requestReset({ email });
      setStep(2);
    } catch (err) {
      fail(err, STEP_FIELDS[1]);
    } finally {
      setLoading(false);
    }
  };

  const setPassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    const problems = passwordProblems(newPassword, passwordStrings);
    if (problems.length > 0) {
      setFieldErrors({ newPassword: text.passwordInvalid === null ? problems : [text.passwordInvalid] });
      return;
    }
    setLoading(true);
    try {
      const result = await reset({ email, code, newPassword });
      const message = (result as { message?: unknown } | null | undefined)?.message;
      setDone(text.done ?? (typeof message === "string" ? message : ""));
    } catch (err) {
      fail(err, STEP_FIELDS[2]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <h1 className={`${authTitleClassName} mb-1`}>{text.title}</h1>
      <p className="text-sm text-auth-text mb-6">
        {text.signInPrompt && <>{text.signInPrompt} </>}
        <Link href={loginHref} className={authLinkClassName}>{text.signIn}</Link>
      </p>

      {done !== null ? (
        <Alert variant="success">
          {done}
          <Link href={loginHref} className={`block mt-3 ${authLinkClassName}`}>{text.backToSignIn}</Link>
        </Alert>
      ) : step === 1 ? (
        <form onSubmit={sendCode} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          {text.intro && <p className="text-sm text-auth-text">{text.intro}</p>}
          <TextInput label={text.email} name="email" type="email" error={fieldError("email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" disabled={loading} className={button}>
            {loading ? text.requestingCode : text.requestCode}
          </button>
        </form>
      ) : (
        <form onSubmit={setPassword} className="space-y-4">
          {text.codeSent && <p className="text-sm text-auth-note">{text.codeSent}</p>}
          {error && <Alert variant="error">{error}</Alert>}
          <TextInput label={text.email} name="email" type="email" error={fieldError("email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <TextInput label={text.code} name="code" error={fieldError("code")} value={code} onChange={(e) => setCode(e.target.value)} required />
          <PasswordInput
            label={text.newPassword}
            name="newPassword"
            error={fieldError("newPassword")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          {text.passwordHint && <p className="text-xs text-auth-hint">{text.passwordHint}</p>}
          <button type="submit" disabled={loading} className={button}>
            {loading ? text.settingPassword : text.setPassword}
          </button>
        </form>
      )}
    </div>
  );
}
