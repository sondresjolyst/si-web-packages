import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getToken, type JWT } from "next-auth/jwt";
import { ABSOLUTE_SESSION_MAX_AGE, isTerminalSessionError } from "../session/expiry";

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

// getToken only decodes the cookie, without the jwt callback. So the checks that callback makes are
// made here: a refused refresh still carries its roles, and the cookie outlives the seven days.
function isLive(token: Token): boolean {
  if (!token || isTerminalSessionError(token.error as string | undefined)) return false;
  const loginAt = token.loginAt;
  return typeof loginAt === "number" && Date.now() - loginAt <= ABSOLUTE_SESSION_MAX_AGE;
}

/**
 * A `POST` route handler that purges cached pages after an edit, for `app/api/revalidate/route.ts`.
 * It answers 403 unless the caller has a live session with `role`, and 400 for a target it does not
 * know.
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
