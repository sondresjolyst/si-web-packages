// The session fields this package's auth options put on next-auth's session and token. An app loads
// them with `import "@sjolystinnovation/app-kit/next-auth";` in one of its own .d.ts files.
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
