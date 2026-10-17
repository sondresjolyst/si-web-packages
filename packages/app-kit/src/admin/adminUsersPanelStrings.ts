// Plain values, with no "use client", so a server component can import them.

/**
 * The panel's text for each field error code of SjolystInnovation.AppKit.Auth's invite endpoint,
 * shown under the field. `{max}` in `tooLong` becomes the field's character limit. The panel shows
 * the API's own message for a code that is not here.
 */
export interface AdminUsersValidationStrings {
  required: string;
  tooLong: string;
  invalidEmail: string;
  /** The chosen role is not one the API lets an admin give. */
  unknownRole: string;
  /** Another account took the email while the invite was sent. */
  emailTaken: string;
}

/**
 * The panel's text for each code of SjolystInnovation.AppKit.Auth's role and invite endpoints that
 * is not about one field. The panel shows the API's own message for a code that is not here.
 */
export interface AdminUsersErrorStrings {
  unknownRole: string;
  /** An admin tried to take away their own admin role. */
  ownAdminRole: string;
  /** Taking the admin role from the last active admin. */
  lastAdmin: string;
  roleAssignFailed: string;
  roleRemoveFailed: string;
  /** The invited email already has an account. */
  emailTaken: string;
}

/**
 * The panel's text for each code SjolystInnovation.AppKit.Auth gives when deleting an account. The
 * panel shows the API's own message for a code that is not here.
 */
export interface AdminUsersDeleteErrorStrings {
  /** Deleting the last active admin. */
  lastAdmin: string;
  /** Another account change happened at the same time. Trying again may work. */
  accountChangeConflict: string;
}

/**
 * The users panel's text. Pass the app's own language. The defaults are English. The panel fills in
 * `{name}` and `{role}` where a text names them.
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
  /** The text before the role name on the button that takes a role away. */
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
  /** The invite field error texts, by code. Any code left out keeps its default. */
  validation: AdminUsersValidationStrings;
  /** The role and invite refusal texts, by code. Any code left out keeps its default. */
  errors: AdminUsersErrorStrings;
  /** The delete refusal texts, by code. Any code left out keeps its default. */
  deleteErrors: AdminUsersDeleteErrorStrings;
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
  validation: {
    required: "Required.",
    tooLong: "At most {max} characters.",
    invalidEmail: "Not a valid email address.",
    unknownRole: "Unknown role.",
    emailTaken: "That email already has an account.",
  },
  errors: {
    unknownRole: "Unknown role.",
    ownAdminRole: "You cannot remove your own admin role.",
    lastAdmin: "The last admin keeps the admin role. Give someone else the role first.",
    roleAssignFailed: "Failed to assign role.",
    roleRemoveFailed: "Failed to remove role.",
    emailTaken: "That email already has an account.",
  },
  deleteErrors: {
    lastAdmin: "The last admin account cannot be deleted. Give someone else the admin role first.",
    accountChangeConflict: "Another change to the accounts happened at the same time. Try again.",
  },
};
