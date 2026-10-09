"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useSessionGate } from "./useSessionGate";

interface RoleGateBase {
  /** The role the page needs, as it appears in `session.user.roles`. */
  role: string;
  /** What shows while the session or its roles are not known yet. */
  fallback?: ReactNode | undefined;
  children: ReactNode;
}

/** Shows `denied` to a signed-in user without the role. */
interface RoleGateWithDenied extends RoleGateBase {
  denied: ReactNode;
  deniedHref?: never;
}

/** Sends a signed-in user without the role to `deniedHref`. */
interface RoleGateWithDeniedHref extends RoleGateBase {
  deniedHref: string;
  denied?: never;
}

export type RoleGateProps = RoleGateWithDenied | RoleGateWithDeniedHref;

/**
 * Renders its children only for a user with `role`. Place it inside `ProtectedGate`, which decides
 * whether the session may render at all.
 *
 * While the re-sign-in prompt recovers a signed-out session there is no user, so the roles are
 * unknown. The page stays up only on the path where the session last had the role.
 */
export function RoleGate(props: RoleGateProps) {
  const { role, fallback = null, children } = props;
  const { session, recovering, mayRender } = useSessionGate();
  const pathname = usePathname();
  const router = useRouter();

  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  const hasRole = roles.includes(role);
  const rolesKnown = session?.user != null;

  // The path where the session last had the role. A user without it clears the pass. Set during
  // render, the same way useSessionGate tracks the path it last passed. It starts as undefined, not
  // null, because usePathname can return null.
  const [roleAt, setRoleAt] = useState<string | null | undefined>(undefined);
  if (hasRole && roleAt !== pathname) setRoleAt(pathname);
  if (rolesKnown && !hasRole && roleAt !== undefined) setRoleAt(undefined);
  const keepThroughRecovery = recovering && roleAt === pathname;

  const allowed = hasRole || keepThroughRecovery;
  const denied = mayRender && rolesKnown && !allowed;
  const deniedHref = "deniedHref" in props ? props.deniedHref : undefined;

  useEffect(() => {
    // replace, so Back does not return to a page that only redirects again.
    if (denied && deniedHref != null) router.replace(deniedHref);
  }, [denied, deniedHref, router]);

  if (mayRender && allowed) return children;
  if (denied && "denied" in props) return props.denied;
  return fallback;
}
