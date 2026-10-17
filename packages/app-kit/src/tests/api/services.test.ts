import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  createAdminUsersService,
  createBrandingService,
  createEmailStatsService,
  createLegalService,
  createPublicClient,
  createSettingsService,
  createUserService,
} from "../../api";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("next-auth/react", () => ({ getSession }));

interface Sent {
  method: string;
  url: string;
  params?: unknown;
  data?: unknown;
  client: string;
}

/** An axios instance that records each request and answers with `reply`, or fails with `status`. */
function fakeClient(name: string, sent: Sent[], reply: () => unknown = () => ({}), status = 200) {
  const client = axios.create({ baseURL: "https://api.example.no/api", allowAbsoluteUrls: false });
  client.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    sent.push({
      method: config.method!,
      url: config.url!,
      params: config.params,
      data: typeof config.data === "string" ? JSON.parse(config.data) : config.data,
      client: name,
    });
    const response = { data: reply(), status, statusText: "", headers: {}, config };
    if (status >= 400) {
      throw Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response, config });
    }
    return response;
  };
  return client;
}

let sent: Sent[];
beforeEach(() => {
  sent = [];
  getSession.mockReset().mockResolvedValue({ user: { id: "u/1" } });
});

describe("createPublicClient", () => {
  it("refuses an empty base URL", () => {
    expect(() => createPublicClient("")).toThrow("createPublicClient needs the API base URL");
  });

  it("sends requests only to the API and without a token", async () => {
    const client = createPublicClient("https://api.example.no/api");
    let config: AxiosRequestConfig | undefined;
    client.defaults.adapter = async (c) => {
      config = c;
      return { data: {}, status: 200, statusText: "", headers: {}, config: c };
    };

    await client.get("/branding");

    expect(client.defaults.allowAbsoluteUrls).toBe(false);
    expect(config?.baseURL).toBe("https://api.example.no/api");
    expect(config?.headers?.Authorization).toBeUndefined();
    expect(getSession).not.toHaveBeenCalled();
  });
});

describe("createUserService", () => {
  const service = (reply?: () => unknown, status?: number) =>
    createUserService(fakeClient("api", sent, reply, status), fakeClient("public", sent, reply, status));

  it("asks for and uses a reset code on the anonymous client", async () => {
    const users = service(() => ({ message: "Sent." }));

    await expect(users.requestPasswordReset({ email: "kari@example.no" })).resolves.toEqual({ message: "Sent." });
    await users.resetPassword({ email: "kari@example.no", code: "AB12CD", newPassword: "Password1" });

    expect(sent).toEqual([
      { method: "post", url: "/auth/request-password-reset", data: { email: "kari@example.no" }, client: "public", params: undefined },
      { method: "post", url: "/auth/reset-password", data: { email: "kari@example.no", code: "AB12CD", newPassword: "Password1" }, client: "public", params: undefined },
    ]);
  });

  it("acts on the signed-in user's own account, with the id encoded", async () => {
    const users = service(() => ({ id: "u/1" }));

    await users.getProfile();
    await users.updateProfile({ firstName: "Kari", lastName: "N" });
    await users.changePassword({ currentPassword: "a", newPassword: "b" });
    await users.exportData();
    await users.deleteAccount();

    expect(sent.map((s) => `${s.client} ${s.method} ${s.url}`)).toEqual([
      "api get /users/u%2F1/profile",
      "api put /users/u%2F1/profile",
      "api put /users/u%2F1/password",
      "api get /users/u%2F1/export",
      "api delete /users/u%2F1/account",
    ]);
    expect(sent[1].data).toEqual({ firstName: "Kari", lastName: "N" });
    expect(sent[2].data).toEqual({ currentPassword: "a", newPassword: "b" });
  });

  it("refuses account calls without a signed-in user and sends nothing", async () => {
    getSession.mockResolvedValue(null);
    const users = service();

    await expect(users.getProfile()).rejects.toThrow("Not signed in.");
    await expect(users.deleteAccount()).rejects.toThrow("Not signed in.");
    expect(sent).toEqual([]);
  });

  it("turns a refusal into the API's message", async () => {
    const users = service(() => ({ message: "The code is wrong or has expired." }), 400);

    await expect(users.resetPassword({ email: "a@b.no", code: "x", newPassword: "y" })).rejects.toThrow("The code is wrong or has expired.");
  });

  it("falls back to its own message when the API gives none", async () => {
    const users = service(() => "", 500);

    await expect(users.requestPasswordReset({ email: "a@b.no" })).rejects.toThrow("Failed to request password reset code");
    await expect(users.getProfile()).rejects.toThrow("Failed to load profile");
  });
});

describe("createSettingsService", () => {
  const settings = {
    contactRecipientEmail: "inbox@x.no", companyName: "X", companyLegalName: "", orgNumber: "", vatRegistered: false,
    streetAddress: "Gata 1", postalCode: "", addressLocality: "", addressRegion: "", publicEmail: "post@x.no", publicPhone: "1",
  };

  it("reads and saves the settings, then runs onSaved", async () => {
    const onSaved = vi.fn();
    const service = createSettingsService(fakeClient("api", sent, () => settings), { onSaved });

    await expect(service.get()).resolves.toEqual(settings);
    await expect(service.update(settings)).resolves.toEqual(settings);

    expect(sent.map((s) => `${s.method} ${s.url}`)).toEqual(["get /settings", "put /settings"]);
    expect(sent[1].data).toEqual(settings);
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it("shows the first field error and does not run onSaved when the save is refused", async () => {
    const onSaved = vi.fn();
    const service = createSettingsService(fakeClient("api", sent, () => ({ errors: { OrgNumber: ["Not a valid organisation number."] } }), 400), { onSaved });

    await expect(service.update(settings)).rejects.toThrow("Not a valid organisation number.");
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe("createBrandingService", () => {
  it("reads branding anonymously and saves it signed in, then runs onSaved", async () => {
    const onSaved = vi.fn();
    const branding = { logoData: "AAAA", logoContentType: "image/png" };
    const service = createBrandingService(fakeClient("api", sent, () => branding), fakeClient("public", sent, () => branding), { onSaved });
    const form = new FormData();
    form.append("removeIcon", "true");

    await expect(service.get()).resolves.toEqual(branding);
    await expect(service.update(form)).resolves.toEqual(branding);

    expect(sent.map((s) => `${s.client} ${s.method} ${s.url}`)).toEqual(["public get /branding", "api put /branding"]);
    expect(sent[1].data).toBe(form);
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it("answers no branding when the API cannot be read, so the page still renders", async () => {
    const service = createBrandingService(fakeClient("api", sent), fakeClient("public", sent, () => "", 503));

    await expect(service.get()).resolves.toEqual({});
  });

  it("shows why an image was refused", async () => {
    const onSaved = vi.fn();
    const refusal = { errors: { Logo: ["The image must be a PNG, JPEG, WebP, GIF or ICO file of at most 2 MB."] } };
    const service = createBrandingService(fakeClient("api", sent, () => refusal, 400), fakeClient("public", sent), { onSaved });

    await expect(service.update(new FormData())).rejects.toThrow("The image must be a PNG, JPEG, WebP, GIF or ICO file of at most 2 MB.");
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe("createLegalService", () => {
  const page = { key: "terms", locale: "no", title: "Vilkår", bodyMarkdown: "## Vilkår", updatedAt: "2026-10-15T12:00:00Z" };

  it("reads a page in a language anonymously", async () => {
    const service = createLegalService(fakeClient("api", sent), fakeClient("public", sent, () => page));

    await expect(service.get("privacy", "nb-NO")).resolves.toEqual(page);

    expect(sent).toEqual([{ client: "public", method: "get", url: "/content/legal/privacy", params: { locale: "nb-NO" }, data: undefined }]);
  });

  it("answers null for a page that is missing", async () => {
    const service = createLegalService(fakeClient("api", sent), fakeClient("public", sent, () => "", 404));

    await expect(service.get("cookies", "no")).resolves.toBeNull();
  });

  it("lists and saves pages signed in, then runs onSaved", async () => {
    const onSaved = vi.fn();
    const service = createLegalService<"terms" | "refunds">(fakeClient("api", sent, () => page), fakeClient("public", sent), { onSaved });

    await service.listAll();
    await service.save({ key: "refunds", locale: "no", title: "Retur", bodyMarkdown: "## Retur" });

    expect(sent.map((s) => `${s.client} ${s.method} ${s.url}`)).toEqual(["api get /content/legal", "api put /content/legal/refunds/no"]);
    expect(sent[1].data).toEqual({ title: "Retur", bodyMarkdown: "## Retur" });
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it("does not run onSaved when the save is refused", async () => {
    const onSaved = vi.fn();
    const service = createLegalService(fakeClient("api", sent, () => ({ detail: "Unsupported locale." }), 400), fakeClient("public", sent), { onSaved });

    await expect(service.save({ key: "terms", locale: "de", title: "x", bodyMarkdown: "y" })).rejects.toThrow("Unsupported locale.");
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("holds the default pages when the app picks none", () => {
    const service = createLegalService(fakeClient("api", sent), fakeClient("public", sent));

    expect(service.keys).toEqual(["terms", "privacy", "cookies"]);
    expectTypeOf(service.get).parameter(0).toEqualTypeOf<"terms" | "privacy" | "cookies">();
  });

  it("takes the app's own pages, as the API's Keys option names them, and types its calls by them", async () => {
    const service = createLegalService(fakeClient("api", sent, () => page), fakeClient("public", sent, () => page), { keys: ["terms", "refunds"] });

    expect(service.keys).toEqual(["terms", "refunds"]);
    expectTypeOf(service.get).parameter(0).toEqualTypeOf<"terms" | "refunds">();
    expectTypeOf(service.keys).toEqualTypeOf<readonly ("terms" | "refunds")[]>();
    await service.get("refunds", "no");
    expect(sent[0]?.url).toBe("/content/legal/refunds");
  });
});

describe("createEmailStatsService", () => {
  it("asks for the last 30 days by default, or the days it is given, with the session", async () => {
    const reply = { days: 30, requests: 120, delivered: 110, hardBounces: 2, softBounces: 3, spamReports: 1, blocked: 4, invalid: 5 };
    const emailStats = createEmailStatsService(fakeClient("api", sent, () => reply));

    await expect(emailStats.get()).resolves.toEqual(reply);
    await emailStats.get(7);

    expect(sent.map((s) => `${s.client} ${s.method} ${s.url}`)).toEqual(["api get /admin/email-stats", "api get /admin/email-stats"]);
    expect(sent[0].params).toEqual({ days: 30 });
    expect(sent[1].params).toEqual({ days: 7 });
  });

  it("shows the API's reason, or its own text when there is none", async () => {
    const refused = createEmailStatsService(fakeClient("api", sent, () => ({ errors: { days: ["Must be at least 1."] } }), 400));
    await expect(refused.get(0)).rejects.toThrow("Must be at least 1.");

    const down = createEmailStatsService(fakeClient("api", sent, () => "", 502));
    await expect(down.get()).rejects.toThrow("Failed to load email stats");
  });
});

describe("createAdminUsersService", () => {
  it("calls the user admin endpoints with every id and role encoded", async () => {
    const users = createAdminUsersService(fakeClient("api", sent, () => []));

    await users.getUsers();
    await users.getUsers(true);
    await users.addRole("u/1", "Editor");
    await users.removeRole("u/1", "Sensor Admin");
    await users.deleteUser("u/1");
    await users.invite({ email: "kari@example.no", firstName: "Kari", lastName: "N", role: "Default" });

    expect(sent.map((s) => `${s.method} ${s.url}`)).toEqual([
      "get /users",
      "get /users",
      "post /users/u%2F1/roles",
      "delete /users/u%2F1/roles/Sensor%20Admin",
      "delete /users/u%2F1/account",
      "post /users/invite",
    ]);
    expect(sent[0].params).toEqual({ includeDeleted: false });
    expect(sent[1].params).toEqual({ includeDeleted: true });
    expect(sent[2].data).toEqual({ role: "Editor" });
    expect(sent[5].data).toEqual({ email: "kari@example.no", firstName: "Kari", lastName: "N", role: "Default" });
  });

  it("shows why the API refused a role change", async () => {
    const users = createAdminUsersService(fakeClient("api", sent, () => ({ message: "You cannot remove your own admin role." }), 400));

    await expect(users.removeRole("me", "Admin")).rejects.toThrow("You cannot remove your own admin role.");
  });
});
