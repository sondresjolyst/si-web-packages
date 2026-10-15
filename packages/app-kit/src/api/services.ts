import axios, { type AxiosInstance } from "axios";
import { getSession } from "next-auth/react";
import type { Branding } from "../branding/types";
import { request } from "./request";

/**
 * An axios instance for the API's anonymous endpoints, without the session's token. Like
 * `createApiClient`, it only sends requests to `baseURL`.
 */
export function createPublicClient(baseURL: string): AxiosInstance {
  if (!baseURL) {
    throw new Error("createPublicClient needs the API base URL, and baseURL is empty.");
  }
  return axios.create({ baseURL, allowAbsoluteUrls: false });
}

/** Runs after an admin change saves, such as to purge the pages that show it. */
export type OnSaved = () => Promise<void> | void;

async function currentUserId(): Promise<string> {
  const session = await getSession();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) throw new Error("Not signed in.");
  return id;
}

/** The signed-in user's account, as SjolystInnovation.AppKit.Auth's account endpoints return it. */
export interface UserProfile {
  id: string;
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

/**
 * Password reset and the signed-in user's account, on the auth and account endpoints of
 * SjolystInnovation.AppKit.Auth. `api` carries the session, `publicApi` does not.
 */
export function createUserService(api: AxiosInstance, publicApi: AxiosInstance) {
  return {
    requestPasswordReset: (data: { email: string }) =>
      request(() => publicApi.post<{ message: string }>("/auth/request-password-reset", data), "Failed to request password reset code"),

    resetPassword: (data: { email: string; code: string; newPassword: string }) =>
      request(() => publicApi.post<{ message: string }>("/auth/reset-password", data), "Failed to reset password"),

    async changePassword(data: { currentPassword: string; newPassword: string }) {
      const id = await currentUserId();
      return request(() => api.put<{ message: string }>(`/users/${encodeURIComponent(id)}/password`, data), "Failed to change password");
    },

    async getProfile() {
      const id = await currentUserId();
      return request(() => api.get<UserProfile>(`/users/${encodeURIComponent(id)}/profile`), "Failed to load profile");
    },

    async updateProfile(data: { firstName: string; lastName: string }) {
      const id = await currentUserId();
      return request(() => api.put<UserProfile>(`/users/${encodeURIComponent(id)}/profile`, data), "Failed to update profile");
    },

    async exportData() {
      const id = await currentUserId();
      return request(() => api.get<unknown>(`/users/${encodeURIComponent(id)}/export`), "Failed to export data");
    },

    async deleteAccount() {
      const id = await currentUserId();
      await request(() => api.delete(`/users/${encodeURIComponent(id)}/account`), "Failed to delete account");
    },
  };
}

/** The company settings, as SjolystInnovation.AppKit.SiteSettings's `/settings` endpoint holds them. */
export interface SiteSettings {
  contactRecipientEmail: string;
  companyName: string;
  companyLegalName: string;
  orgNumber: string;
  vatRegistered: boolean;
  streetAddress: string;
  postalCode: string;
  addressLocality: string;
  addressRegion: string;
  publicEmail: string;
  publicPhone: string;
}

/** The admin's company settings on SjolystInnovation.AppKit.SiteSettings. */
export function createSettingsService(api: AxiosInstance, options: { onSaved?: OnSaved } = {}) {
  return {
    get: () => request(() => api.get<SiteSettings>("/settings"), "Failed to load settings"),

    async update(data: SiteSettings) {
      const saved = await request(() => api.put<SiteSettings>("/settings", data), "Failed to update settings");
      await options.onSaved?.();
      return saved;
    },
  };
}

/**
 * The logo and favicon on SjolystInnovation.AppKit.SiteSettings. Reading is anonymous and answers
 * no branding when the API cannot be reached, so a page still renders.
 */
export function createBrandingService(api: AxiosInstance, publicApi: AxiosInstance, options: { onSaved?: OnSaved } = {}) {
  return {
    async get(): Promise<Branding> {
      try {
        return (await publicApi.get<Branding>("/branding")).data;
      } catch {
        return {};
      }
    },

    /** Sends the form `BrandingManager` builds: `logo`, `icon`, `removeLogo` and `removeIcon`. */
    async update(form: FormData): Promise<Branding> {
      const saved = await request(() => api.put<Branding>("/branding", form), "Failed to save branding");
      await options.onSaved?.();
      return saved;
    },
  };
}

/** A legal page, as SjolystInnovation.AppKit.SiteSettings's legal endpoints return it. */
export interface LegalPage<Key extends string = string> {
  key: Key;
  locale: string;
  title: string;
  bodyMarkdown: string;
  updatedAt: string;
}

/**
 * The terms, privacy and cookie pages on SjolystInnovation.AppKit.SiteSettings. Reading is anonymous
 * and answers null for a page that is missing or cannot be read, so a page shows its fallback.
 */
export function createLegalService<Key extends string = "terms" | "privacy" | "cookies">(
  api: AxiosInstance,
  publicApi: AxiosInstance,
  options: { onSaved?: OnSaved } = {},
) {
  return {
    async get(key: Key, locale: string): Promise<LegalPage<Key> | null> {
      try {
        return (await publicApi.get<LegalPage<Key>>(`/content/legal/${encodeURIComponent(key)}`, { params: { locale } })).data;
      } catch {
        return null;
      }
    },

    listAll: () => request(() => api.get<LegalPage<Key>[]>("/content/legal"), "Failed to load legal pages"),

    async save(key: Key, locale: string, title: string, bodyMarkdown: string) {
      const page = await request(
        () => api.put<LegalPage<Key>>(`/content/legal/${encodeURIComponent(key)}/${encodeURIComponent(locale)}`, { title, bodyMarkdown }),
        "Failed to save legal page",
      );
      await options.onSaved?.();
      return page;
    },
  };
}

/** A user in the admin list, as SjolystInnovation.AppKit.Auth's user admin endpoints return it. */
export interface AdminUser {
  id: string;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  isDeleted: boolean;
  roles: string[];
}

/** User administration on SjolystInnovation.AppKit.Auth: the list, roles, invites and deletion. */
export function createAdminUsersService(api: AxiosInstance) {
  return {
    getUsers: (includeDeleted = false) =>
      request(() => api.get<AdminUser[]>("/users", { params: { includeDeleted } }), "Failed to load users"),

    addRole: (userId: string, role: string) =>
      request(() => api.post(`/users/${encodeURIComponent(userId)}/roles`, { role }), "Failed to assign role"),

    removeRole: (userId: string, role: string) =>
      request(() => api.delete(`/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(role)}`), "Failed to remove role"),

    deleteUser: (userId: string) =>
      request(() => api.delete(`/users/${encodeURIComponent(userId)}/account`), "Failed to delete user"),

    invite: (email: string, firstName: string, lastName: string, role: string) =>
      request(() => api.post("/users/invite", { email, firstName, lastName, role }), "Failed to send invitation"),
  };
}
