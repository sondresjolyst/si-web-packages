import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { getToken, type JWT } from "next-auth/jwt";
import { ABSOLUTE_SESSION_MAX_AGE, CLOCK_TOLERANCE_S, isTerminalSessionError } from "../session/expiry";

export interface RevalidateRouteOptions {
  /**
   * Each target the client may send, with the page paths it purges. A path with a dynamic segment,
   * such as `/builds/[slug]`, purges every page of that route. The target name is also purged as a
   * cache tag, so tag fetches with it.
   */
  targets: Record<string, readonly string[]>;
  /** The role allowed to purge, as it appears in the session user's roles. */
  role: string;
}

type Token = JWT | null;

const rolesOf = (token: Token): string[] => (token?.user as { roles?: string[] } | undefined)?.roles ?? [];

// getToken only decrypts the cookie, without the jwt callback. So the checks that callback makes are
// made here: a refused refresh still carries its roles, and the cookie outlives the seven days. The
// roles must also come from an access token that has not expired, so a copied cookie of a user who
// lost the role stops working within the token's lifetime.
function isLive(token: Token): boolean {
  if (!token || isTerminalSessionError(token.error as string | undefined)) return false;
  const loginAt = token.loginAt;
  if (typeof loginAt !== "number" || Date.now() - loginAt > ABSOLUTE_SESSION_MAX_AGE) return false;
  return accessTokenValid(token.accessToken);
}

// The cookie is encrypted and authenticated with NEXTAUTH_SECRET, so the access token in it is the
// one the API issued, and its expiry can be read without verifying the signature again.
function accessTokenValid(accessToken: unknown): boolean {
  if (typeof accessToken !== "string") return false;
  const claims = jwt.decode(accessToken);
  const exp = claims && typeof claims === "object" ? claims.exp : undefined;
  return typeof exp === "number" && exp * 1000 + CLOCK_TOLERANCE_S * 1000 > Date.now();
}

/**
 * A `POST` route handler that purges cached pages after an edit, for `app/api/revalidate/route.ts`.
 * It answers 403 unless the caller has a live session with `role`, 415 unless the body is JSON, and
 * 400 for a target it does not know.
 */
export function createRevalidateRoute({ targets, role }: RevalidateRouteOptions) {
  return async function POST(req: NextRequest): Promise<NextResponse> {
    // getToken reads NEXTAUTH_SECRET itself, the same way next-auth does. It is asked for both cookie
    // names, because behind a TLS proxy next-auth can sign in with the secure cookie while getToken
    // would look for the plain one.
    const token = (await getToken({ req, secureCookie: true })) ?? (await getToken({ req, secureCookie: false }));
    if (!isLive(token) || !rolesOf(token).includes(role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // JSON only, so a plain form on a sibling subdomain cannot post here with the session cookie.
    if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return NextResponse.json({ message: "Expected JSON" }, { status: 415 });
    }

    const body: unknown = await req.json().catch(() => null);
    const target = (body as { target?: unknown } | null)?.target;
    if (typeof target !== "string" || !Object.hasOwn(targets, target)) {
      return NextResponse.json({ message: "Unknown target" }, { status: 400 });
    }

    for (const path of targets[target] ?? []) {
      if (path.includes("[")) revalidatePath(path, "page");
      else revalidatePath(path);
    }
    // By tag as well, because a path purge misses fetches that another route rendered. expire 0
    // makes them stale at once.
    revalidateTag(target, { expire: 0 });
    return NextResponse.json({ revalidated: true, target });
  };
}
