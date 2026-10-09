import axios, { type AxiosInstance } from "axios";
import jwt from "jsonwebtoken";
import type { NextAuthOptions, Session, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import { resolveJwtSecret, type SessionConfig } from "../config";
import { ABSOLUTE_SESSION_MAX_AGE, SESSION_ERRORS, SIGN_IN_ERRORS, isTerminalSessionError } from "../session/expiry";

/** The signed-in user, as the session carries it. */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

interface TokenPair {
  token: string;
  refreshToken: string;
}

interface ApiClaims {
  sub: string;
  unique_name: string;
  role?: string | string[];
  exp: number;
  iat: number;
}

// The fields this module stores in next-auth's JWT. An intersection still compiles when the app
// declares the same fields itself.
type AppToken = JWT & {
  accessToken?: string;
  refreshToken?: string;
  refreshAt?: number;
  loginAt?: number;
  user?: SessionUser;
  error?: string;
};

interface AuthorizedUser extends User {
  roles: string[];
  accessToken: string;
  refreshToken: string;
}

export type AuthOptionsSettings = {
  /** The server environment, usually `process.env`. It holds the API JWT secret. */
  env: Record<string, string | undefined>;
} & (
  | {
      /** Base URL of the API, such as `https://api.example.com/api`. */
      apiUrl: string;
      http?: never;
    }
  | {
      /** An HTTP client with its own base URL, for tests. */
      http: AxiosInstance;
      apiUrl?: never;
    }
);

// Refresh ahead of expiry, so the token is still fresh when the user saves.
const MAX_REFRESH_SKEW_MS = 5 * 60 * 1000;

// The soonest a refresh can be due. The floor stops a short-lived token from refreshing on every
// session read.
const MIN_REFRESH_GAP_MS = 30 * 1000;

// How long a refresh result is remembered. It is also the wait before a failed refresh is retried.
const REMEMBER_ROTATION_MS = 60 * 1000;

// How far this server's clock may differ from the API's when a token's times are checked.
const CLOCK_TOLERANCE_S = 60;

// Sign-in and session reads wait for the API, so a hung connection must not hold them forever.
const API_TIMEOUT_MS = 10_000;

function rolesOf(claims: ApiClaims): string[] {
  const raw = claims.role;
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}

// The skew is capped at a quarter of the token's lifetime, so a short-lived token is not refreshed
// on every read. A token without a lifetime gets the floor.
function nextRefreshAt(claims: ApiClaims): number {
  const expiresAt = claims.exp * 1000;
  const lifetimeMs = Math.max(0, (claims.exp - claims.iat) * 1000);
  const refreshAt = expiresAt - Math.min(MAX_REFRESH_SKEW_MS, lifetimeMs / 4);
  if (!Number.isFinite(refreshAt)) return Date.now() + MIN_REFRESH_GAP_MS;
  return Math.max(Date.now() + MIN_REFRESH_GAP_MS, refreshAt);
}

// No answer, or a gateway that could not reach the API. A plain 500 is left out, because the API
// may fail after it has checked the password.
function apiUnavailable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === undefined || status === 502 || status === 503 || status === 504;
}

// What a log line may contain. The error itself carries the request, which holds the password or
// tokens.
function failureShape(error: unknown) {
  return {
    status: axios.isAxiosError(error) ? error.response?.status : undefined,
    code: axios.isAxiosError(error) ? error.code : undefined,
    message: error instanceof Error ? error.message : String(error),
  };
}

/**
 * next-auth options for email and password sign-in against the API. The API issues a short-lived
 * access token and a refresh token that changes on every refresh. The session refreshes ahead of
 * expiry, rides out temporary API failures, and ends seven days after sign-in.
 */
export function createAuthOptions(config: SessionConfig, settings: AuthOptionsSettings): NextAuthOptions {
  const { env } = settings;
  if (settings.http === undefined && !settings.apiUrl) {
    throw new Error("createAuthOptions needs the API base URL, and apiUrl is empty.");
  }
  const http = settings.http ?? axios.create({ baseURL: settings.apiUrl, allowAbsoluteUrls: false });

  const readClaims = (token: string) =>
    jwt.verify(token, resolveJwtSecret(config, env), {
      clockTolerance: CLOCK_TOLERANCE_S,
    }) as unknown as ApiClaims;

  async function postTokens(path: string, body: object): Promise<TokenPair> {
    const response = await http.post<TokenPair>(path, body, { timeout: API_TIMEOUT_MS });
    return response.data;
  }

  // Parallel session reads carry the same refresh token. The API accepts each refresh token once.
  // It treats a second use as replay and revokes every session the user has. So all reads of one
  // token share one refresh. The result is kept for a while, because a slow read can arrive with
  // the old token after the refresh is done.
  //
  // The map lives in one server process. Replicas do not share it.
  const inFlight = new Map<string, Promise<AppToken>>();

  function refreshOnce(token: AppToken): Promise<AppToken> {
    const key = token.refreshToken as string;
    const existing = inFlight.get(key);
    if (existing) return existing;

    const pending = rotate(token);
    inFlight.set(key, pending);
    // The minute counts from the answer, so a slow refresh is remembered as long as a fast one.
    void pending.then(() => {
      // unref, so the timer cannot keep a serverless invocation alive.
      const expiry = setTimeout(() => inFlight.delete(key), REMEMBER_ROTATION_MS) as unknown as {
        unref?: () => void;
      };
      expiry.unref?.();
    });
    return pending;
  }

  async function rotate(token: AppToken): Promise<AppToken> {
    let refreshed: TokenPair;
    try {
      refreshed = await postTokens(
        "/auth/refresh-token",
        { token: token.accessToken, refreshToken: token.refreshToken },
      );
    } catch (error) {
      // The API refused the token pair: a bad access token, or a refresh token that is unknown,
      // expired or already used. Only this ends the session.
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 400 || status === 401) {
        return { ...token, error: SESSION_ERRORS.refreshRejected };
      }
      // A network error or an API restart keeps the session. A later read tries again.
      console.error("Refresh token request failed, keeping the session", failureShape(error));
      return { ...token, refreshAt: Date.now() + REMEMBER_ROTATION_MS };
    }

    // A success without tokens is treated as a temporary failure, and the session keeps its own.
    if (!refreshed?.token || !refreshed.refreshToken) {
      console.error("Refresh token response had no tokens, keeping the session");
      return { ...token, refreshAt: Date.now() + REMEMBER_ROTATION_MS };
    }

    // The API has already replaced the old tokens. Keep the new ones whatever happens below,
    // because the old refresh token now counts as replay.
    const next: AppToken = {
      ...token,
      accessToken: refreshed.token,
      refreshToken: refreshed.refreshToken,
    };
    delete next.error;

    try {
      const claims = readClaims(refreshed.token);
      next.refreshAt = nextRefreshAt(claims);
      next.user = { ...(token.user as SessionUser), roles: rolesOf(claims) };
    } catch (error) {
      // The token is unreadable, for example after a secret change. Retry soon with the new
      // refresh token.
      console.error("Could not read the refreshed access token, retrying shortly", failureShape(error));
      next.refreshAt = Date.now() + REMEMBER_ROTATION_MS;
    }

    return next;
  }

  return {
    providers: [
      CredentialsProvider({
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials) {
            throw new Error("Credentials are missing");
          }
          try {
            const tokens = await postTokens(
              "/auth/login",
              { email: credentials.email, password: credentials.password },
            );
            if (!tokens?.token || !tokens.refreshToken) {
              throw new Error("Login response had no tokens");
            }
            const claims = readClaims(tokens.token);
            const user: AuthorizedUser = {
              id: claims.sub,
              name: claims.unique_name,
              email: credentials.email,
              roles: rolesOf(claims),
              accessToken: tokens.token,
              refreshToken: tokens.refreshToken,
            };
            return user;
          } catch (error) {
            console.error("Sign-in failed", failureShape(error));
            // No cause: next-auth logs this error, and the cause carries the password.
            // eslint-disable-next-line preserve-caught-error
            throw new Error(
              apiUnavailable(error) ? SIGN_IN_ERRORS.unavailable : SIGN_IN_ERRORS.invalidCredentials,
            );
          }
        },
      }),
    ],
    pages: {
      signIn: config.loginRoute,
    },
    session: {
      maxAge: ABSOLUTE_SESSION_MAX_AGE / 1000,
    },
    callbacks: {
      async jwt({ token: current, user }) {
        let token = current as AppToken;
        if (user) {
          const signedIn = user as AuthorizedUser;
          const claims = readClaims(signedIn.accessToken);
          token = {
            ...token,
            accessToken: signedIn.accessToken,
            refreshToken: signedIn.refreshToken,
            refreshAt: nextRefreshAt(claims),
            loginAt: Date.now(),
            user: {
              id: signedIn.id,
              name: signedIn.name ?? "",
              email: signedIn.email ?? "",
              roles: signedIn.roles,
            },
          };
          delete token.error;
        }

        // A session without a sign-in time counts as expired.
        if (token.loginAt === undefined || Date.now() - token.loginAt > ABSOLUTE_SESSION_MAX_AGE) {
          return { ...token, error: SESSION_ERRORS.absoluteExpiry };
        }

        // Only a new sign-in recovers a terminal session, so the API is not asked again.
        if (isTerminalSessionError(token.error)) {
          return token;
        }

        if (token.refreshAt && Date.now() < token.refreshAt) {
          return token;
        }

        if (!token.refreshToken) {
          return { ...token, error: SESSION_ERRORS.noRefreshToken };
        }

        return refreshOnce(token);
      },
      async session({ session, token: current }) {
        const token = current as AppToken;
        // Cast, so it compiles against the app's own Session declaration.
        return {
          ...session,
          user: token.user,
          accessToken: token.accessToken,
          error: token.error,
          // Lets the UI warn before the seven days run out.
          absoluteExpiresAt: token.loginAt ? token.loginAt + ABSOLUTE_SESSION_MAX_AGE : undefined,
        } as Session;
      },
    },
  };
}
