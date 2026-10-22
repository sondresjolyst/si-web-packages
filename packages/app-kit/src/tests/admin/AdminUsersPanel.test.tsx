import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminUsersPanel, defaultAdminUsersPanelStrings as en, type AdminUsersPanelProps } from "../../admin";
import { request } from "../../api";
import type { AdminUser } from "../../api/services";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("../../toast", () => ({ toast }));

const kari: AdminUser = { id: "u1", userName: "kari", createdAt: "2026-01-01", email: "kari@example.no", firstName: "Kari", lastName: "Nordmann", roles: ["Admin"], isDeleted: false };
const ola: AdminUser = { id: "u2", userName: "ola", createdAt: "2026-01-01", email: "ola@example.no", firstName: "Ola", lastName: "", roles: [], isDeleted: false };
const gone: AdminUser = { id: "u3", userName: "", createdAt: "2026-01-01", email: "", firstName: "", lastName: "", roles: [], isDeleted: true };

const service = {
  getUsers: vi.fn(),
  addRole: vi.fn(),
  removeRole: vi.fn(),
  deleteUser: vi.fn(),
  invite: vi.fn(),
  roles: vi.fn(),
};
const getRoles = vi.fn();

// The Error that `request` throws for an ASP.NET validation problem.
const validationError = (errors: Record<string, string[]>) =>
  request(
    () =>
      Promise.reject(
        Object.assign(new Error("Request failed with status code 400"), {
          isAxiosError: true,
          response: { status: 400, data: { title: "One or more validation errors occurred.", errors } },
        }),
      ),
    "Failed",
  ).catch((e: unknown) => e);

// The Error that `request` throws for an API answer with a code for the whole call.
const codeError = (status: number, message: string, code: string) =>
  request(
    () => Promise.reject(Object.assign(new Error(`status ${status}`), { isAxiosError: true, response: { status, data: { message, code } } })),
    "Failed",
  ).catch((e: unknown) => e);

// The Error that `request` throws for an ASP.NET validation problem with codes and limits.
const codedProblem = (errors: Record<string, string[]>, codes: Record<string, string[]>, limits: Record<string, number | null> = {}) =>
  request(
    () =>
      Promise.reject(
        Object.assign(new Error("status 400"), { isAxiosError: true, response: { status: 400, data: { title: "One or more validation errors occurred.", errors, codes, limits } } }),
      ),
    "Failed",
  ).catch((e: unknown) => e);

const fillInvite = async () => {
  await userEvent.type(screen.getByLabelText(/^First name/), "Per");
  await userEvent.type(screen.getByLabelText(/^Last name/), "Hansen");
  await userEvent.type(screen.getByLabelText(/^Email/), "per@example.no");
};

const panel = (props: Pick<AdminUsersPanelProps, "defaultInviteRole" | "strings"> = {}) =>
  render(<AdminUsersPanel service={service} getRoles={getRoles} {...props} />);

// A row by the user's email, which is unique on the page.
const row = (email: string) => screen.getByText(email).closest("li") as HTMLElement;

// A button in the open confirm dialog.
const inDialog = (name: string) => userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name }));

beforeEach(() => {
  service.getUsers.mockReset().mockImplementation((deleted: boolean) => Promise.resolve(deleted ? [kari, ola, gone] : [kari, ola]));
  service.addRole.mockReset().mockResolvedValue(undefined);
  service.removeRole.mockReset().mockResolvedValue(undefined);
  service.deleteUser.mockReset().mockResolvedValue(undefined);
  service.invite.mockReset().mockResolvedValue(undefined);
  getRoles.mockReset().mockResolvedValue(["Admin", "Editor"]);
  service.roles.mockReset().mockResolvedValue(["Default", "Admin"]);
  toast.success.mockReset();
  toast.error.mockReset();
});

afterEach(() => vi.restoreAllMocks());

describe("AdminUsersPanel", () => {
  it("shows loading, then each user with their roles", async () => {
    panel();

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(await screen.findByText("kari@example.no")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(service.getUsers).toHaveBeenCalledWith(false);
    expect(within(row("kari@example.no")).getByText("Admin")).toBeInTheDocument();
    expect(within(row("ola@example.no")).getByText("No roles")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Users");
  });

  it("loads deleted users when the toggle is on, without a delete button or add role for them", async () => {
    panel();
    await screen.findByText("kari@example.no");

    await userEvent.click(screen.getByRole("switch", { name: "Show deleted" }));

    expect(await screen.findByText("(deleted)")).toBeInTheDocument();
    expect(service.getUsers).toHaveBeenLastCalledWith(true);
    const deletedRow = screen.getByText("(deleted)").closest("li") as HTMLElement;
    expect(within(deletedRow).queryByTitle("Delete")).not.toBeInTheDocument();
    expect(within(deletedRow).queryByRole("button", { name: /Add role/ })).not.toBeInTheDocument();
    expect(deletedRow.firstElementChild?.firstElementChild).toHaveClass("text-gray-400");
  });

  it("ignores a slow answer to an earlier toggle", async () => {
    let answerFirst: (users: AdminUser[]) => void = () => {};
    service.getUsers.mockImplementationOnce(() => new Promise((resolve) => (answerFirst = resolve)));
    panel();

    await userEvent.click(screen.getByRole("switch", { name: "Show deleted" }));
    expect(await screen.findByText("(deleted)")).toBeInTheDocument();

    await act(async () => answerFirst([ola]));

    expect(screen.getByText("kari@example.no")).toBeInTheDocument();
    expect(screen.getByText("(deleted)")).toBeInTheDocument();
  });

  it("keeps loading while a newer request runs, even when the older one answers first", async () => {
    let answerFirst: (users: AdminUser[]) => void = () => {};
    let answerSecond: (users: AdminUser[]) => void = () => {};
    service.getUsers
      .mockImplementationOnce(() => new Promise((resolve) => (answerFirst = resolve)))
      .mockImplementationOnce(() => new Promise((resolve) => (answerSecond = resolve)));
    panel();

    await userEvent.click(screen.getByRole("switch", { name: "Show deleted" }));
    await act(async () => answerFirst([ola]));

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    await act(async () => answerSecond([kari, ola, gone]));
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(screen.getByText("(deleted)")).toBeInTheDocument();
  });

  it("shows loading again while the list reloads after the toggle", async () => {
    panel();
    await screen.findByText("kari@example.no");
    service.getUsers.mockImplementationOnce(() => new Promise(() => {}));

    await userEvent.click(screen.getByRole("switch", { name: "Show deleted" }));

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("kari@example.no")).not.toBeInTheDocument();
  });

  it("shows why the users could not load, or the fallback text", async () => {
    service.getUsers.mockRejectedValueOnce(new Error("Server down"));
    panel();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Server down"));
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();

    toast.error.mockReset();
    service.getUsers.mockRejectedValueOnce("nope");
    await userEvent.click(screen.getByRole("switch", { name: "Show deleted" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to load users"));
  });

  it("says when the roles could not load", async () => {
    getRoles.mockRejectedValue(new Error("x"));
    panel();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to load roles"));
  });

  it("loads the roles from the service when the app passes no getRoles", async () => {
    render(<AdminUsersPanel service={service} />);
    await screen.findByText("ola@example.no");

    await waitFor(() => expect(screen.getByLabelText("Role")).toHaveTextContent("DefaultAdmin"));
    expect(service.roles).toHaveBeenCalledTimes(1);
    expect(getRoles).not.toHaveBeenCalled();
    await userEvent.click(within(row("ola@example.no")).getByRole("button", { name: /Add role/ }));
    expect(within(within(row("ola@example.no")).getByRole("combobox", { name: "Add role" })).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Default",
      "Admin",
    ]);
  });

  it("prefers getRoles over the service's roles, and needs no roles on the service with it", async () => {
    const withoutRoles: Omit<typeof service, "roles"> = { getUsers: service.getUsers, addRole: service.addRole, removeRole: service.removeRole, deleteUser: service.deleteUser, invite: service.invite };
    // @ts-expect-error A service without roles needs getRoles.
    expect(<AdminUsersPanel service={withoutRoles} />).toBeTruthy();
    render(<AdminUsersPanel service={withoutRoles} getRoles={getRoles} />);

    await waitFor(() => expect(screen.getByLabelText("Role")).toHaveTextContent("AdminEditor"));
    expect(service.roles).not.toHaveBeenCalled();
  });

  it("says when the service's roles could not load", async () => {
    service.roles.mockRejectedValue(new Error("x"));
    render(<AdminUsersPanel service={service} />);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to load roles"));
  });

  it("loads the service's roles once, even when the service is inline", async () => {
    const view = render(<AdminUsersPanel service={{ ...service }} />);
    await screen.findByText("kari@example.no");
    view.rerender(<AdminUsersPanel service={{ ...service }} />);
    await screen.findByText("kari@example.no");

    expect(service.roles).toHaveBeenCalledTimes(1);
  });

  it("does not fetch again when the service and getRoles are inline", async () => {
    const view = render(<AdminUsersPanel service={{ ...service }} getRoles={() => getRoles()} />);
    await screen.findByText("kari@example.no");
    view.rerender(<AdminUsersPanel service={{ ...service }} getRoles={() => getRoles()} />);
    await screen.findByText("kari@example.no");

    expect(service.getUsers).toHaveBeenCalledTimes(1);
    expect(getRoles).toHaveBeenCalledTimes(1);
  });

  it("adds a role the user lacks and names it", async () => {
    panel();
    await screen.findByText("ola@example.no");

    await userEvent.click(within(row("ola@example.no")).getByRole("button", { name: /Add role/ }));
    const select = within(row("ola@example.no")).getByRole("combobox", { name: "Add role" });
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["Admin", "Editor"]);
    await userEvent.selectOptions(select, "Editor");
    await userEvent.click(within(row("ola@example.no")).getByRole("button", { name: "Add" }));

    expect(service.addRole).toHaveBeenCalledWith("u2", "Editor");
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Added Editor to Ola"));
    expect(within(row("ola@example.no")).getByText("Editor")).toBeInTheDocument();
    expect(within(row("ola@example.no")).queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("offers only the missing roles and hides add role when none are left", async () => {
    getRoles.mockResolvedValue(["Admin"]);
    panel();
    await screen.findByText("kari@example.no");
    await waitFor(() => expect(within(row("ola@example.no")).getByRole("button", { name: /Add role/ })).toBeInTheDocument());

    expect(within(row("kari@example.no")).queryByRole("button", { name: /Add role/ })).not.toBeInTheDocument();
  });

  it("keeps the picker open and explains when adding fails, and cancel closes it", async () => {
    service.addRole.mockRejectedValue(new Error("Role does not exist"));
    panel();
    await screen.findByText("ola@example.no");

    await userEvent.click(within(row("ola@example.no")).getByRole("button", { name: /Add role/ }));
    await userEvent.click(within(row("ola@example.no")).getByRole("button", { name: "Add" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Role does not exist"));
    expect(service.addRole).toHaveBeenCalledWith("u2", "Admin");
    expect(within(row("ola@example.no")).getByRole("button", { name: "Add" })).toBeEnabled();

    await userEvent.click(within(row("ola@example.no")).getByRole("button", { name: "Cancel" }));
    expect(within(row("ola@example.no")).queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("disables the add button while the role is saved", async () => {
    let finish: () => void = () => {};
    service.addRole.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    panel();
    await screen.findByText("ola@example.no");

    await userEvent.click(within(row("ola@example.no")).getByRole("button", { name: /Add role/ }));
    await userEvent.click(within(row("ola@example.no")).getByRole("button", { name: "Add" }));

    expect(within(row("ola@example.no")).getByRole("button", { name: "…" })).toBeDisabled();
    await act(async () => finish());
  });

  it("removes a role and names it, or explains why not", async () => {
    panel();
    await screen.findByText("kari@example.no");

    await userEvent.click(within(row("kari@example.no")).getByTitle("Remove Admin"));

    expect(service.removeRole).toHaveBeenCalledWith("u1", "Admin");
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Removed Admin from Kari"));
    expect(within(row("kari@example.no")).getByText("No roles")).toBeInTheDocument();

    service.removeRole.mockRejectedValue("nope");
    await userEvent.click(within(row("kari@example.no")).getByRole("button", { name: /Add role/ }));
    await userEvent.click(within(row("kari@example.no")).getByRole("button", { name: "Add" }));
    await userEvent.click(within(row("kari@example.no")).getByTitle("Remove Admin"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to remove role"));
  });

  it("deletes a user after the confirm names them, and loads the list again", async () => {
    panel();
    await screen.findByText("kari@example.no");

    await userEvent.click(within(row("kari@example.no")).getByTitle("Delete"));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Delete Kari Nordmann? Their name, email and password are removed, and they cannot sign in again.");
    expect(service.deleteUser).not.toHaveBeenCalled();
    await inDialog("Delete");
    expect(service.deleteUser).toHaveBeenCalledWith("u1");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("User deleted"));
    await waitFor(() => expect(service.getUsers).toHaveBeenCalledTimes(2));
  });

  it("shows loading while the list reloads after a delete", async () => {
    panel();
    await screen.findByText("kari@example.no");
    service.getUsers.mockImplementationOnce(() => new Promise(() => {}));

    await userEvent.click(within(row("kari@example.no")).getByTitle("Delete"));
    await inDialog("Delete");

    expect(await screen.findByText("Loading…")).toBeInTheDocument();
  });

  it("uses the latest service after the prop changes", async () => {
    const view = panel();
    await screen.findByText("kari@example.no");
    const next = { ...service, deleteUser: vi.fn().mockResolvedValue(undefined) };
    view.rerender(<AdminUsersPanel service={next} getRoles={getRoles} />);

    await userEvent.click(within(row("kari@example.no")).getByTitle("Delete"));
    await inDialog("Delete");

    expect(next.deleteUser).toHaveBeenCalledWith("u1");
    expect(service.deleteUser).not.toHaveBeenCalled();
  });

  it("names a user by email in the confirm when they have no name, and deletes nobody on cancel", async () => {
    service.getUsers.mockResolvedValue([{ ...ola, firstName: "", email: "anon@example.no" }]);
    panel();
    await screen.findByText("anon@example.no");

    await userEvent.click(screen.getByTitle("Delete"));

    expect(screen.getByRole("dialog")).toHaveTextContent(/Delete anon@example\.no\?/);
    await inDialog("Cancel");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(service.deleteUser).not.toHaveBeenCalled();
  });

  it("keeps both dialog buttons off while the delete runs", async () => {
    let finish: () => void = () => {};
    service.deleteUser.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    panel();
    await screen.findByText("kari@example.no");

    await userEvent.click(within(row("kari@example.no")).getByTitle("Delete"));
    await inDialog("Delete");

    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("explains a failed delete", async () => {
    service.deleteUser.mockRejectedValue(new Error("Last admin"));
    panel();
    await screen.findByText("kari@example.no");

    await userEvent.click(within(row("kari@example.no")).getByTitle("Delete"));
    await inDialog("Delete");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Last admin"));
    expect(service.getUsers).toHaveBeenCalledTimes(1);
  });

  it("refuses an invite without name and email", async () => {
    panel();
    await screen.findByText("kari@example.no");

    await userEvent.type(screen.getByLabelText(/^First name/), "Per");
    await userEvent.type(screen.getByLabelText(/^Email/), "per@example.no");
    await userEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    expect(toast.error).toHaveBeenCalledWith("Fill in the name and email");
    expect(service.invite).not.toHaveBeenCalled();
  });

  it("refuses an invite without an email", async () => {
    panel();
    await screen.findByText("kari@example.no");

    await userEvent.type(screen.getByLabelText(/^First name/), "Per");
    await userEvent.type(screen.getByLabelText(/^Last name/), "Hansen");
    await userEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    expect(toast.error).toHaveBeenCalledWith("Fill in the name and email");
    expect(service.invite).not.toHaveBeenCalled();
  });

  it("sends a trimmed invite with the chosen role, clears the form and keeps the role", async () => {
    panel();
    await screen.findByText("kari@example.no");
    await waitFor(() => expect(screen.getByRole("option", { name: "Editor" })).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText(/^First name/), " Per ");
    await userEvent.type(screen.getByLabelText(/^Last name/), " Hansen ");
    await userEvent.type(screen.getByLabelText(/^Email/), " per@example.no ");
    await userEvent.selectOptions(screen.getByLabelText("Role"), "Editor");
    await userEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    expect(service.invite).toHaveBeenCalledWith({ email: "per@example.no", firstName: "Per", lastName: "Hansen", role: "Editor" });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Invitation sent. The user gets a code to set a password."));
    expect(screen.getByLabelText(/^First name/)).toHaveValue("");
    expect(screen.getByLabelText(/^Last name/)).toHaveValue("");
    expect(screen.getByLabelText(/^Email/)).toHaveValue("");
    expect(screen.getByLabelText("Role")).toHaveValue("Editor");
    await waitFor(() => expect(service.getUsers).toHaveBeenCalledTimes(2));
  });

  it("starts the invite on defaultInviteRole and shows sending while it goes", async () => {
    let finish: () => void = () => {};
    service.invite.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    panel({ defaultInviteRole: "Editor" });
    await screen.findByText("kari@example.no");
    await waitFor(() => expect(screen.getByLabelText("Role")).toHaveValue("Editor"));

    await userEvent.type(screen.getByLabelText(/^First name/), "Per");
    await userEvent.type(screen.getByLabelText(/^Last name/), "Hansen");
    await userEvent.type(screen.getByLabelText(/^Email/), "per@example.no");
    await userEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
    await act(async () => finish());
    expect(screen.getByRole("button", { name: "Send invitation" })).toBeEnabled();
  });

  it("explains a failed invite and keeps what was typed", async () => {
    service.invite.mockRejectedValue("nope");
    panel();
    await screen.findByText("kari@example.no");

    await userEvent.type(screen.getByLabelText(/^First name/), "Per");
    await userEvent.type(screen.getByLabelText(/^Last name/), "Hansen");
    await userEvent.type(screen.getByLabelText(/^Email/), "per@example.no");
    await userEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to send the invitation"));
    expect(screen.getByLabelText(/^First name/)).toHaveValue("Per");
    expect(service.getUsers).toHaveBeenCalledTimes(1);
  });

  it("shows the API's invite errors under their fields and clears them once an invite works", async () => {
    service.invite.mockRejectedValueOnce(await validationError({ Email: ["Not a valid email address."], LastName: ["Required, at most 50 characters."] }));
    panel();
    await screen.findByText("kari@example.no");

    await userEvent.type(screen.getByLabelText(/^First name/), "Per");
    await userEvent.type(screen.getByLabelText(/^Last name/), "Hansen");
    await userEvent.type(screen.getByLabelText(/^Email/), "per@example");
    await userEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Not a valid email address."));
    expect(screen.getByLabelText(/^Email/)).toHaveAccessibleDescription("Not a valid email address.");
    expect(screen.getByLabelText(/^Last name/)).toHaveAccessibleDescription("Required, at most 50 characters.");
    expect(screen.getByLabelText(/^First name/)).not.toHaveAttribute("aria-invalid");

    await userEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(screen.queryByText("Not a valid email address.")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Last name/)).not.toHaveAttribute("aria-invalid");
  });

  it("uses the English API texts by default", () => {
    expect(en.validation).toEqual({
      required: "Required.",
      tooLong: "At most {max} characters.",
      invalidEmail: "Not a valid email address.",
      unknownRole: "Unknown role.",
      emailTaken: "That email already has an account.",
    });
    expect(en.errors).toEqual({
      unknownRole: "Unknown role.",
      ownAdminRole: "You cannot remove your own admin role.",
      lastAdmin: "The last admin keeps the admin role. Give someone else the role first.",
      roleAssignFailed: "Failed to assign role.",
      roleRemoveFailed: "Failed to remove role.",
      emailTaken: "That email already has an account.",
    });
    expect(en.deleteErrors).toEqual({
      lastAdmin: "The last admin account cannot be deleted. Give someone else the admin role first.",
      accountChangeConflict: "Another change to the accounts happened at the same time. Try again.",
    });
  });

  it("shows the app's text for a refused role change, and the API's message for a code it has no text for", async () => {
    service.addRole.mockRejectedValueOnce(await codeError(400, "Unknown role.", "unknownRole"));
    service.addRole.mockRejectedValueOnce(await codeError(400, "Something new.", "somethingNew"));
    service.removeRole.mockRejectedValueOnce(await codeError(400, "You cannot remove your own admin role.", "ownAdminRole"));
    service.removeRole.mockRejectedValueOnce(await codeError(409, "The last admin keeps the admin role. Give someone else the role first.", "lastAdmin"));
    panel({ strings: { errors: { unknownRole: "Rollen finnes ikke.", ownAdminRole: "Du kan ikke fjerne din egen administratorrolle." } } });
    await screen.findByText("ola@example.no");

    await userEvent.click(within(row("ola@example.no")).getByRole("button", { name: /Add role/ }));
    await userEvent.click(within(row("ola@example.no")).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(toast.error).toHaveBeenLastCalledWith("Rollen finnes ikke."));
    await userEvent.click(within(row("ola@example.no")).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(toast.error).toHaveBeenLastCalledWith("Something new."));

    await userEvent.click(within(row("kari@example.no")).getByTitle("Remove Admin"));
    await waitFor(() => expect(toast.error).toHaveBeenLastCalledWith("Du kan ikke fjerne din egen administratorrolle."));
    await userEvent.click(within(row("kari@example.no")).getByTitle("Remove Admin"));
    await waitFor(() => expect(toast.error).toHaveBeenLastCalledWith("The last admin keeps the admin role. Give someone else the role first."));
    expect(toast.error).toHaveBeenCalledTimes(4);
  });

  it("shows the app's delete text for a refused delete, apart from the role text with the same code", async () => {
    service.deleteUser.mockRejectedValueOnce(await codeError(409, "The last admin account cannot be deleted. Give someone else the admin role first.", "lastAdmin"));
    service.deleteUser.mockRejectedValueOnce(await codeError(409, "Another change to the accounts happened at the same time. Try again.", "accountChangeConflict"));
    panel({ strings: { errors: { lastAdmin: "Role text." }, deleteErrors: { lastAdmin: "Den siste administratoren kan ikke slettes." } } });
    await screen.findByText("kari@example.no");

    await userEvent.click(within(row("kari@example.no")).getByTitle("Delete"));
    await inDialog("Delete");
    await waitFor(() => expect(toast.error).toHaveBeenLastCalledWith("Den siste administratoren kan ikke slettes."));
    await userEvent.click(within(row("kari@example.no")).getByTitle("Delete"));
    await inDialog("Delete");
    await waitFor(() => expect(toast.error).toHaveBeenLastCalledWith("Another change to the accounts happened at the same time. Try again."));
  });

  it("shows the app's text for a refused invite", async () => {
    service.invite.mockRejectedValueOnce(await codeError(409, "That email already has an account.", "emailTaken"));
    panel({ strings: { errors: { emailTaken: "E-postadressen har allerede en konto." } } });
    await screen.findByText("kari@example.no");

    await fillInvite();
    await userEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("E-postadressen har allerede en konto."));
  });

  it("shows the invite field errors under their fields in the app's language, with the limit filled in", async () => {
    service.invite.mockRejectedValueOnce(
      await codedProblem(
        { FirstName: ["At most 50 characters."], Email: ["Email 'per@example.no' is already taken."], Role: ["Unknown role."], LastName: ["Something new."] },
        { FirstName: ["tooLong"], Email: ["emailTaken"], Role: ["unknownRole"], LastName: ["somethingNew"] },
        { FirstName: 50, Email: null, Role: null, LastName: null },
      ),
    );
    panel({ strings: { validation: { tooLong: "Bruk {max} tegn eller færre.", unknownRole: "Velg en rolle fra listen." } } });
    await screen.findByText("kari@example.no");

    await fillInvite();
    await userEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Bruk 50 tegn eller færre."));
    expect(screen.getByLabelText(/^First name/)).toHaveAccessibleDescription("Bruk 50 tegn eller færre.");
    expect(screen.getByLabelText(/^Email/)).toHaveAccessibleDescription("That email already has an account.");
    expect(screen.getByLabelText(/^Last name/)).toHaveAccessibleDescription("Something new.");
    expect(screen.getByLabelText("Role")).toHaveAccessibleDescription("Velg en rolle fra listen.");
    expect(screen.getByLabelText("Role")).toHaveAttribute("aria-invalid", "true");
  });

  it("names an invite field error the form cannot show in the toast, and marks no field for it", async () => {
    service.invite.mockRejectedValueOnce(await codedProblem({ Email: ["Required."], Phone: ["Odd."] }, { Email: ["required"], Phone: ["odd"] }));
    panel();
    await screen.findByText("kari@example.no");

    await fillInvite();
    await userEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Odd."));
    expect(screen.getByLabelText(/^Email/)).toHaveAccessibleDescription("Required.");
    expect(screen.getByLabelText("Role")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Role")).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText("Odd.")).not.toBeInTheDocument();
  });

  it("uses the app's strings, with the placeholders filled", async () => {
    panel({
      strings: {
        users: "Brukere",
        showDeleted: "Vis slettede",
        sendInvite: "Send invitasjon",
        delete: "Slett",
        remove: "Fjern",
        roleRemoved: "Fjernet {role} fra {name}",
        cancel: "Avbryt",
        confirmDelete: "Slette {name}?",
      },
    });
    await screen.findByText("kari@example.no");

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Brukere");
    expect(screen.getByRole("switch", { name: "Vis slettede" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send invitasjon" })).toHaveClass("rounded-button", "bg-button-primary-bg", "text-button-primary-text");
    expect(screen.getByText("Invite user")).toBeInTheDocument();

    await userEvent.click(within(row("kari@example.no")).getByTitle("Slett"));
    expect(screen.getByRole("dialog")).toHaveTextContent("Slette Kari Nordmann?");
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Avbryt" })).toBeInTheDocument();
    await inDialog("Avbryt");

    await userEvent.click(within(row("kari@example.no")).getByTitle("Fjern Admin"));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Fjernet Admin fra Kari"));
  });

  it.each([
    ["an active user", false],
    ["a deleted user", true],
  ])("wraps a long name and email for %s, and lets the text shrink beside the delete button", async (_, isDeleted) => {
    const long = "Supercalifragilistic".repeat(4);
    const email = `${long}@example.no`;
    service.getUsers.mockResolvedValue([{ ...kari, firstName: long, lastName: long, email, isDeleted }]);
    panel();

    const text = (await screen.findByText(email)).parentElement;
    expect(text).toHaveClass("min-w-0", "wrap-anywhere");
    expect(text).toHaveTextContent(`${long} ${long}`);
    expect(text?.parentElement).toBe(row(email).firstElementChild);
  });
});
