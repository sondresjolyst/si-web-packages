import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminUsersPanel } from "../../admin";
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
};
const getRoles = vi.fn();

const panel = (props: Partial<Parameters<typeof AdminUsersPanel>[0]> = {}) =>
  render(<AdminUsersPanel service={service} getRoles={getRoles} {...props} />);

// A row by the user's email, which is unique on the page.
const row = (email: string) => screen.getByText(email).closest("li") as HTMLElement;

beforeEach(() => {
  service.getUsers.mockReset().mockImplementation((deleted: boolean) => Promise.resolve(deleted ? [kari, ola, gone] : [kari, ola]));
  service.addRole.mockReset().mockResolvedValue(undefined);
  service.removeRole.mockReset().mockResolvedValue(undefined);
  service.deleteUser.mockReset().mockResolvedValue(undefined);
  service.invite.mockReset().mockResolvedValue(undefined);
  getRoles.mockReset().mockResolvedValue(["Admin", "Editor"]);
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
    const select = within(row("ola@example.no")).getByRole("combobox");
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
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    panel();
    await screen.findByText("kari@example.no");

    await userEvent.click(within(row("kari@example.no")).getByTitle("Delete"));

    expect(confirm).toHaveBeenCalledWith("Delete Kari Nordmann? Their name, email and password are removed, and they cannot sign in again.");
    expect(service.deleteUser).toHaveBeenCalledWith("u1");
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("User deleted"));
    await waitFor(() => expect(service.getUsers).toHaveBeenCalledTimes(2));
  });

  it("shows loading while the list reloads after a delete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    panel();
    await screen.findByText("kari@example.no");
    service.getUsers.mockImplementationOnce(() => new Promise(() => {}));

    await userEvent.click(within(row("kari@example.no")).getByTitle("Delete"));

    expect(await screen.findByText("Loading…")).toBeInTheDocument();
  });

  it("uses the latest service after the prop changes", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const view = panel();
    await screen.findByText("kari@example.no");
    const next = { ...service, deleteUser: vi.fn().mockResolvedValue(undefined) };
    view.rerender(<AdminUsersPanel service={next} getRoles={getRoles} />);

    await userEvent.click(within(row("kari@example.no")).getByTitle("Delete"));

    expect(next.deleteUser).toHaveBeenCalledWith("u1");
    expect(service.deleteUser).not.toHaveBeenCalled();
  });

  it("names a user by email in the confirm when they have no name", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    service.getUsers.mockResolvedValue([{ ...ola, firstName: "", email: "anon@example.no" }]);
    panel();
    await screen.findByText("anon@example.no");

    await userEvent.click(screen.getByTitle("Delete"));

    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/^Delete anon@example\.no\?/));
    expect(service.deleteUser).not.toHaveBeenCalled();
  });

  it("explains a failed delete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    service.deleteUser.mockRejectedValue(new Error("Last admin"));
    panel();
    await screen.findByText("kari@example.no");

    await userEvent.click(within(row("kari@example.no")).getByTitle("Delete"));

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

    expect(service.invite).toHaveBeenCalledWith("per@example.no", "Per", "Hansen", "Editor");
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

  it("uses the app's strings, with the placeholders filled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    panel({
      strings: {
        users: "Brukere",
        showDeleted: "Vis slettede",
        sendInvite: "Send invitasjon",
        delete: "Slett",
        remove: "Fjern",
        roleRemoved: "Fjernet {role} fra {name}",
        confirmDelete: "Slette {name}?",
      },
    });
    await screen.findByText("kari@example.no");

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Brukere");
    expect(screen.getByRole("switch", { name: "Vis slettede" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send invitasjon" })).toHaveClass("rounded-button", "bg-button-primary-bg", "text-button-primary-text");
    expect(screen.getByText("Invite user")).toBeInTheDocument();

    await userEvent.click(within(row("kari@example.no")).getByTitle("Slett"));
    expect(window.confirm).toHaveBeenCalledWith("Slette Kari Nordmann?");

    await userEvent.click(within(row("kari@example.no")).getByTitle("Fjern Admin"));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Fjernet Admin fra Kari"));
  });
});
