"use client";

import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useId, useRef, useState } from "react";
import { errorText, fieldErrorTexts } from "../api/fieldErrorText";
import type { AdminUser, createAdminUsersService } from "../api/services";
import { toast } from "../toast";
import { FieldError } from "../ui/field";
import { TextInput } from "../ui/TextInput";
import { Toggle } from "../ui/Toggle";
import { withDefaults, type TextOverrides } from "../ui/withDefaults";
import {
  defaultAdminUsersPanelStrings,
  type AdminUsersDeleteErrorStrings,
  type AdminUsersErrorStrings,
  type AdminUsersPanelStrings,
  type AdminUsersValidationStrings,
} from "./adminUsersPanelStrings";

type AdminUsersService = ReturnType<typeof createAdminUsersService>;

/**
 * Props for `AdminUsersPanel`. The roles come from the service's `roles`, or from `getRoles` when the
 * app passes it, so a service without `roles` needs `getRoles`.
 */
export type AdminUsersPanelProps = {
  /** The role a new invite starts with. Defaults to `Admin`. */
  defaultInviteRole?: string | undefined;
  /** The panel's text. `validation`, `errors` and `deleteErrors` may name only some codes, the rest keep their defaults. */
  strings?:
    | (TextOverrides<Omit<AdminUsersPanelStrings, "validation" | "errors" | "deleteErrors">> & {
        validation?: TextOverrides<AdminUsersValidationStrings> | undefined;
        errors?: TextOverrides<AdminUsersErrorStrings> | undefined;
        deleteErrors?: TextOverrides<AdminUsersDeleteErrorStrings> | undefined;
      })
    | undefined;
} & (
  | {
      /** The user admin calls, such as `createAdminUsersService(api)`. */
      service: AdminUsersService;
      /** The roles an admin may give. Defaults to the service's `roles`. */
      getRoles?: (() => Promise<string[]>) | undefined;
    }
  | {
      service: Omit<AdminUsersService, "roles">;
      getRoles: () => Promise<string[]>;
    }
);

// The invite fields the form shows, so a field error for any other field goes in the toast.
const INVITE_FIELDS = ["firstName", "lastName", "email", "role"];

const fill = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);

const reason = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

/**
 * The admin users page: every user with their roles, a toggle for deleted users, giving and taking
 * roles, deleting an account after a confirm, and inviting a user by email. The API's refusals show
 * in the app's language through `validation`, `errors` and `deleteErrors`.
 */
export function AdminUsersPanel({ service, getRoles, defaultInviteRole = "Admin", strings }: AdminUsersPanelProps) {
  const { validation: validationOverrides, errors: errorOverrides, deleteErrors: deleteOverrides, ...textOverrides } = strings ?? {};
  const text = withDefaults(defaultAdminUsersPanelStrings, textOverrides);
  const validation = withDefaults(defaultAdminUsersPanelStrings.validation, validationOverrides);
  const errors = withDefaults(defaultAdminUsersPanelStrings.errors, errorOverrides);
  const deleteErrors = withDefaults(defaultAdminUsersPanelStrings.deleteErrors, deleteOverrides);
  const roleErrorId = `${useId()}-role-error`;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [allRoles, setAllRoles] = useState<string[]>([]);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addRoleFor, setAddRoleFor] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [roleLoading, setRoleLoading] = useState(false);
  const [invite, setInvite] = useState({ email: "", firstName: "", lastName: "", role: defaultInviteRole });
  const [inviting, setInviting] = useState(false);
  // The per-field texts from the last failed invite, keyed by field name.
  const [inviteErrors, setInviteErrors] = useState<Record<string, string[]>>({});
  // Bumping it fetches the list again after a change, through the same effect as every other load.
  const [reloads, setReloads] = useState(0);
  // The latest service, so an inline one does not fetch the list again on every render. The roles
  // load once, so the first getRoles is enough.
  const serviceRef = useRef(service);
  useEffect(() => {
    serviceRef.current = service;
  }, [service]);
  const getRolesRef = useRef(getRoles);

  // Callers set `loading` before changing what to fetch, so the effect only sets state once the
  // request settles. A request replaced by a newer one is ignored, so a slow answer to an earlier
  // toggle cannot overwrite the list the toggle now shows.
  useEffect(() => {
    let replaced = false;
    serviceRef.current
      .getUsers(includeDeleted)
      .then((list) => {
        if (!replaced) setUsers(list);
      })
      .catch((err: unknown) => {
        if (!replaced) toast.error(reason(err, text.usersLoadFailed));
      })
      .finally(() => {
        if (!replaced) setLoading(false);
      });
    return () => {
      replaced = true;
    };
  }, [includeDeleted, reloads, text.usersLoadFailed]);

  useEffect(() => {
    // Without getRoles the props carry a service with roles.
    const roles = getRolesRef.current ?? (() => (serviceRef.current as AdminUsersService).roles());
    roles()
      .then(setAllRoles)
      .catch(() => toast.error(text.rolesLoadFailed));
  }, [text.rolesLoadFailed]);

  const reload = () => {
    setLoading(true);
    setReloads((n) => n + 1);
  };

  const toggleDeleted = (deleted: boolean) => {
    setLoading(true);
    setIncludeDeleted(deleted);
  };

  const setRoles = (id: string, roles: string[]) => setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, roles } : u)));

  const assignRole = async (user: AdminUser) => {
    if (!selectedRole) return;
    setRoleLoading(true);
    try {
      await serviceRef.current.addRole(user.id, selectedRole);
      setRoles(user.id, [...user.roles, selectedRole]);
      toast.success(fill(text.roleAssigned, { name: user.firstName, role: selectedRole }));
      setAddRoleFor(null);
      setSelectedRole("");
    } catch (err) {
      toast.error(errorText(err, errors, text.roleAssignFailed));
    } finally {
      setRoleLoading(false);
    }
  };

  const removeRole = async (user: AdminUser, role: string) => {
    try {
      await serviceRef.current.removeRole(user.id, role);
      setRoles(user.id, user.roles.filter((r) => r !== role));
      toast.success(fill(text.roleRemoved, { name: user.firstName, role }));
    } catch (err) {
      toast.error(errorText(err, errors, text.roleRemoveFailed));
    }
  };

  const deleteUser = async (user: AdminUser) => {
    const label = `${user.firstName} ${user.lastName}`.trim() || user.email;
    if (!window.confirm(fill(text.confirmDelete, { name: label }))) return;
    try {
      await serviceRef.current.deleteUser(user.id);
      toast.success(text.userDeleted);
      reload();
    } catch (err) {
      toast.error(errorText(err, deleteErrors, text.userDeleteFailed));
    }
  };

  const sendInvite = async () => {
    if (!invite.email.trim() || !invite.firstName.trim() || !invite.lastName.trim()) {
      toast.error(text.inviteIncomplete);
      return;
    }
    setInviting(true);
    try {
      await serviceRef.current.invite({
        email: invite.email.trim(),
        firstName: invite.firstName.trim(),
        lastName: invite.lastName.trim(),
        role: invite.role,
      });
      setInviteErrors({});
      toast.success(text.inviteSent);
      setInvite({ email: "", firstName: "", lastName: "", role: invite.role });
      reload();
    } catch (err) {
      const texts = Object.entries(fieldErrorTexts(err, validation));
      // Only the fields the form shows render their errors.
      setInviteErrors(Object.fromEntries(texts));
      // The toast names a field error the form cannot show first, then the first one it shows.
      const first = (texts.find(([field]) => !INVITE_FIELDS.includes(field)) ?? texts[0])?.[1][0];
      toast.error(first ?? errorText(err, errors, text.inviteFailed));
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">{text.users}</h2>
        <Toggle label={text.showDeleted} checked={includeDeleted} onChange={toggleDeleted} />
      </div>

      <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">{text.inviteUser}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-40">
            <TextInput label={text.firstName} error={inviteErrors.firstName?.join(" ")} value={invite.firstName} onChange={(e) => setInvite({ ...invite, firstName: e.target.value })} />
          </div>
          <div className="w-40">
            <TextInput label={text.lastName} error={inviteErrors.lastName?.join(" ")} value={invite.lastName} onChange={(e) => setInvite({ ...invite, lastName: e.target.value })} />
          </div>
          <div className="flex-1 min-w-[14rem]">
            <TextInput label={text.email} error={inviteErrors.email?.join(" ")} type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-600">
              {text.role}
              <select
                value={invite.role}
                onChange={(e) => setInvite({ ...invite, role: e.target.value })}
                aria-invalid={inviteErrors.role ? true : undefined}
                aria-describedby={inviteErrors.role ? roleErrorId : undefined}
                className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {allRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <FieldError id={roleErrorId} error={inviteErrors.role?.join(" ")} />
          </div>
          <button
            onClick={sendInvite}
            disabled={inviting}
            className="rounded-button bg-button-primary-bg text-button-primary-text font-semibold px-4 py-2 text-sm hover:brightness-95 disabled:opacity-60 transition"
          >
            {inviting ? text.sending : text.sendInvite}
          </button>
        </div>
        <p className="text-xs text-gray-500">{text.inviteHint}</p>
      </div>

      {loading ? (
        <p className="text-gray-500">{text.loading}</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
          {users.map((user) => {
            const isAddingRole = addRoleFor === user.id;
            const available = allRoles.filter((r) => !user.roles.includes(r));
            return (
              <li key={user.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className={user.isDeleted ? "text-gray-400" : "text-gray-800"}>
                    <span className="font-medium">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">{user.email}</span>
                    {user.isDeleted && <span className="ml-2 text-xs text-gray-400">({text.deleted})</span>}
                  </div>
                  {!user.isDeleted && (
                    <button
                      onClick={() => deleteUser(user)}
                      title={text.delete}
                      className="shrink-0 p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {user.roles.map((role) => (
                    <span key={role} className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-700">
                      {role}
                      <button onClick={() => removeRole(user, role)} className="hover:text-red-600 transition-colors" title={`${text.remove} ${role}`}>
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {user.roles.length === 0 && <span className="text-xs text-gray-400">{text.noRoles}</span>}
                  {!isAddingRole && !user.isDeleted && available.length > 0 && (
                    <button
                      onClick={() => {
                        setAddRoleFor(user.id);
                        setSelectedRole(available[0] ?? "");
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-500 hover:text-gray-800 transition"
                    >
                      <PlusIcon className="h-3 w-3" /> {text.addRole}
                    </button>
                  )}
                </div>

                {isAddingRole && (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      aria-label={text.addRole}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                    >
                      {available.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => assignRole(user)}
                      disabled={roleLoading}
                      className="rounded-lg bg-gray-900 text-white text-xs px-3 py-1.5 hover:bg-gray-800 disabled:opacity-50 transition"
                    >
                      {roleLoading ? "…" : text.add}
                    </button>
                    <button onClick={() => setAddRoleFor(null)} className="rounded-lg border border-gray-300 text-gray-700 text-xs px-3 py-1.5 hover:bg-gray-50 transition">
                      {text.cancel}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
