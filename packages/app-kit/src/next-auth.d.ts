// The session fields this package's auth options put on next-auth's session and token. An app loads
// them with `import "@sjolystinnovation/app-kit/next-auth";` in one of its own .d.ts files.
import "next-auth";
import "next-auth/jwt";
import type { SessionUser } from "./auth/createAuthOptions";
import type { SessionError } from "./session/expiry";

declare module "next-auth" {
  interface Session {
    user: SessionUser;
    accessToken: string;
    error?: SessionError | undefined;
    absoluteExpiresAt?: number | undefined;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string | undefined;
    refreshToken?: string | undefined;
    refreshAt?: number | undefined;
    loginAt?: number | undefined;
    user?: SessionUser | undefined;
    error?: SessionError | undefined;
  }
}
