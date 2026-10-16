// Plain values, with no "use client", so a server component can import them.

/**
 * The users panel's text. Pass the app's own language. The defaults are English. `{name}` and `{role}`
 * are filled in where a text names them.
 */
export interface AdminUsersPanelStrings {
  users: string;
  showDeleted: string;
  inviteUser: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  sendInvite: string;
  sending: string;
  inviteHint: string;
  loading: string;
  /** The tag after a deleted user's name. */
  deleted: string;
  delete: string;
  /** Before the role name on the button that takes a role away. */
  remove: string;
  noRoles: string;
  addRole: string;
  add: string;
  cancel: string;
  usersLoadFailed: string;
  rolesLoadFailed: string;
  roleAssigned: string;
  roleAssignFailed: string;
  roleRemoved: string;
  roleRemoveFailed: string;
  confirmDelete: string;
  userDeleted: string;
  userDeleteFailed: string;
  inviteIncomplete: string;
  inviteSent: string;
  inviteFailed: string;
}

export const defaultAdminUsersPanelStrings: AdminUsersPanelStrings = {
  users: "Users",
  showDeleted: "Show deleted",
  inviteUser: "Invite user",
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  role: "Role",
  sendInvite: "Send invitation",
  sending: "Sending…",
  inviteHint: "The user gets an email with a code and sets a password on the forgotten password page.",
  loading: "Loading…",
  deleted: "deleted",
  delete: "Delete",
  remove: "Remove",
  noRoles: "No roles",
  addRole: "Add role",
  add: "Add",
  cancel: "Cancel",
  usersLoadFailed: "Failed to load users",
  rolesLoadFailed: "Failed to load roles",
  roleAssigned: "Added {role} to {name}",
  roleAssignFailed: "Failed to assign role",
  roleRemoved: "Removed {role} from {name}",
  roleRemoveFailed: "Failed to remove role",
  confirmDelete: "Delete {name}? Their name, email and password are removed, and they cannot sign in again.",
  userDeleted: "User deleted",
  userDeleteFailed: "Failed to delete user",
  inviteIncomplete: "Fill in the name and email",
  inviteSent: "Invitation sent. The user gets a code to set a password.",
  inviteFailed: "Failed to send the invitation",
};
