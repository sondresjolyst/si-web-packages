"use client";

import { signIn } from "next-auth/react";
import { useState, type FormEvent, type ReactNode } from "react";
import { SIGN_IN_ERRORS } from "../session/expiry";
import { Alert } from "./Alert";
import { PasswordInput } from "./PasswordInput";
import {
  SignInRejected,
  defaultCredentialsFormStrings,
  type CredentialsFormStrings,
} from "./credentialsFormStrings";
import { TextInput } from "./TextInput";
import { withDefaults, type TextOverrides } from "./withDefaults";


export interface CredentialsFormProps {
  initialEmail?: string | undefined;
  /** Runs after next-auth accepts the credentials. Throw `SignInRejected` to refuse with a reason. */
  onSignedIn: () => void | Promise<void>;
  /** Extra buttons next to the submit button, such as a close button. */
  children?: ReactNode;
  strings?: TextOverrides<CredentialsFormStrings> | undefined;
  /** Runs when a sign-in starts and when it ends, such as to stop a dialog closing mid-request. */
  onPendingChange?: ((pending: boolean) => void) | undefined;
}

// next-auth answers a stale CSRF token with its own sign-in page and ?csrf=true.
function refusedForCsrf(url: string | null | undefined): boolean {
  if (!url) return false;
  const parsed = new URL(url, window.location.origin);
  return parsed.pathname.endsWith("/signin") && parsed.searchParams.get("csrf") === "true";
}

/** Email and password sign-in through next-auth's credentials provider. */
export function CredentialsForm({
  initialEmail = "",
  onSignedIn,
  children,
  strings,
  onPendingChange,
}: CredentialsFormProps) {
  const text = withDefaults(defaultCredentialsFormStrings, strings);
  const [email, setEmail] = useState(initialEmail);
  // Follows initialEmail until the user types, so an email learned after mount still fills in.
  const [emailTyped, setEmailTyped] = useState(false);
  if (!emailTyped && email !== initialEmail) setEmail(initialEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    onPendingChange?.(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError(result.error === SIGN_IN_ERRORS.unavailable ? text.signInUnavailable : text.invalidCredentials);
        return;
      }
      // next-auth reports a stale CSRF token as a success, see refusedForCsrf.
      if (!result?.ok || refusedForCsrf(result.url)) {
        setError(text.somethingWentWrong);
        return;
      }
      await onSignedIn();
      setPassword("");
    } catch (caught) {
      setError(caught instanceof SignInRejected ? caught.message : text.somethingWentWrong);
    } finally {
      setSubmitting(false);
      onPendingChange?.(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      <TextInput
        label={text.email}
        name="email"
        type="email"
        value={email}
        onChange={(e) => {
          setEmailTyped(true);
          setEmail(e.target.value);
        }}
        required
      />
      <PasswordInput
        label={text.password}
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        showPasswordLabel={text.showPassword}
        hidePasswordLabel={text.hidePassword}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-button bg-button-primary-bg text-button-primary-text font-semibold py-2.5 hover:brightness-95 disabled:opacity-60 transition"
        >
          {submitting ? text.signingIn : text.signIn}
        </button>
        {children}
      </div>
    </form>
  );
}
