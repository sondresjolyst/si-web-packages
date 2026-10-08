// The next-auth declarations from the README. With them loaded, the package typechecks the way an
// app compiles it.
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: { id: string; name: string; email: string; roles: string[] };
    accessToken: string;
    error?: string | undefined;
    absoluteExpiresAt?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    refreshAt?: number;
    loginAt?: number;
    user?: { id: string; name: string; email: string; roles: string[] };
    error?: string | undefined;
  }
}
