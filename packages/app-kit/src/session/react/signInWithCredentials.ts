import { signIn, type SignInResponse } from "next-auth/react";

/**
 * Tells whether next-auth refused a sign-in for a stale CSRF token. next-auth answers that with its
 * own sign-in page and ?csrf=true, and reports it as ok.
 */
export function refusedForCsrf(url: string | null | undefined): boolean {
  if (!url) return false;
  const parsed = new URL(url, window.location.origin);
  return parsed.pathname.endsWith("/signin") && parsed.searchParams.get("csrf") === "true";
}

/**
 * Signs in through next-auth's credentials provider with `redirect: false`. A sign-in that next-auth
 * refused for CSRF is sent once more, since next-auth then fetches a token that matches the cookie it
 * set in the meantime. next-auth checks the token before it calls `authorize`, so the API sees the
 * credentials only once. The caller still checks the result with `refusedForCsrf`.
 */
export async function signInWithCredentials(
  credentials: Record<string, string>,
): Promise<SignInResponse | undefined> {
  const options = { ...credentials, redirect: false as const };
  const result = await signIn("credentials", options);
  if (!result?.ok || !refusedForCsrf(result.url)) return result;
  return signIn("credentials", options);
}
