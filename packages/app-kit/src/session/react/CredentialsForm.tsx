"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { SIGN_IN_ERRORS } from "../expiry";
import { Alert } from "../../ui/Alert";
import { PasswordInput } from "../../ui/PasswordInput";
import {
  SignInRejected,
  defaultCredentialsFormStrings,
  type CredentialsFormStrings,
} from "./credentialsFormStrings";
import { TextInput } from "../../ui/TextInput";
import { withDefaults, type TextOverrides } from "../../ui/withDefaults";
import { refusedForCsrf, signInWithCredentials } from "./signInWithCredentials";


/** Props for `CredentialsForm`. */
export interface CredentialsFormProps {
  initialEmail?: string | undefined;
  /** A function that runs after next-auth accepts the credentials. If it throws, the form shows its generic error. */
  onSignedIn: () => void | Promise<void>;
  /** The extra buttons next to the submit button, such as a close button. */
  children?: ReactNode;
  strings?: TextOverrides<CredentialsFormStrings> | undefined;
  /** A function that runs when a sign-in starts and when it ends, such as to stop a dialog closing mid-request. */
  onPendingChange?: ((pending: boolean) => void) | undefined;
}

// The form's text for each sign-in error. Any other error reads as wrong credentials.
function signInErrorText(error: string, text: CredentialsFormStrings): string {
  if (error === SIGN_IN_ERRORS.unavailable) return text.signInUnavailable;
  return error === SIGN_IN_ERRORS.lockedOut ? text.lockedOut : text.invalidCredentials;
}

/** Renders email and password sign-in through next-auth's credentials provider. */
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
      const result = await signInWithCredentials({ email, password });
      if (result?.error) {
        setError(signInErrorText(result.error, text));
        return;
      }
      // next-auth reports a stale CSRF token as a success. The sign-in was already sent again once.
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
