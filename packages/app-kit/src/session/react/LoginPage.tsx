"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authLinkClassName, authPageClassName, authTitleClassName } from "../../ui/authClasses";
import { CredentialsForm } from "./CredentialsForm";
import type { CredentialsFormStrings } from "./credentialsFormStrings";
import { defaultLoginPageStrings, type LoginPageStrings } from "./loginPageStrings";
import { withDefaults, type TextOverrides } from "../../ui/withDefaults";

/** Props for `LoginPage`. */
export interface LoginPageProps {
  /** The path a signed-in user goes to. */
  redirectTo: string;
  /** The password reset page's path. */
  resetHref: string;
  /** The sign-up page's path. Without it, the page has no register link. */
  registerHref?: string | undefined;
  strings?: TextOverrides<LoginPageStrings> | undefined;
  /** The form's own text, passed to `CredentialsForm`. */
  formStrings?: TextOverrides<CredentialsFormStrings> | undefined;
  /** The classes that replace the page's outer spacing, such as when the page sits inside the app's own card. */
  className?: string | undefined;
}

/**
 * The sign-in page: a title, `CredentialsForm`, and links to reset the password and, when the app has
 * one, to sign up. A sign-in goes to `redirectTo` and refreshes the page's server data.
 */
export function LoginPage({ redirectTo, resetHref, registerHref, strings, formStrings, className = authPageClassName }: LoginPageProps) {
  const text = withDefaults(defaultLoginPageStrings, strings);
  const router = useRouter();

  return (
    <div className={className}>
      <h1 className={`${authTitleClassName} mb-6`}>{text.title}</h1>
      <CredentialsForm
        strings={formStrings}
        onSignedIn={() => {
          router.push(redirectTo);
          router.refresh();
        }}
      />
      <p className="mt-6 text-sm text-auth-text">
        <Link href={resetHref} className={authLinkClassName}>{text.forgotPassword}</Link>
      </p>
      {registerHref && (
        <p className="mt-2 text-sm text-auth-text">
          {text.registerPrompt && <>{text.registerPrompt} </>}
          <Link href={registerHref} className={authLinkClassName}>{text.register}</Link>
        </p>
      )}
    </div>
  );
}
