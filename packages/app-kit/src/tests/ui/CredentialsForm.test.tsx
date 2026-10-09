import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CredentialsForm, SignInRejected, defaultCredentialsFormStrings as text } from "../../ui";

const signIn = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signIn(...args),
}));

const passwordField = () => screen.getByLabelText(new RegExp(`^${text.password}`));

async function submit(password = "pw", name = text.signIn) {
  await userEvent.type(screen.getByLabelText(/^(Password|Passord)/), password);
  await userEvent.click(screen.getByRole("button", { name }));
}

async function submitWith(error: string) {
  signIn.mockResolvedValue({ error });
  render(<CredentialsForm initialEmail="a@b.no" onSignedIn={() => {}} />);
  await submit();
}

describe("CredentialsForm", () => {
  beforeEach(() => {
    signIn.mockReset();
  });

  describe("on a failed sign-in", () => {
    it("says the API is unavailable when it is", async () => {
      await submitWith("SignInUnavailable");

      expect(await screen.findByText(text.signInUnavailable)).toBeInTheDocument();
    });

    it("says the credentials are wrong for any other failure", async () => {
      await submitWith("InvalidCredentials");

      expect(await screen.findByText(text.invalidCredentials)).toBeInTheDocument();
    });
  });

  it("signs in with the typed credentials and no redirect", async () => {
    signIn.mockResolvedValue({ error: null, ok: true });
    const onSignedIn = vi.fn();
    render(<CredentialsForm initialEmail="a@b.no" onSignedIn={onSignedIn} />);

    await submit("Password1");

    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "a@b.no",
      password: "Password1",
      redirect: false,
    });
    expect(onSignedIn).toHaveBeenCalledTimes(1);
  });

  it("clears the password after a successful sign-in", async () => {
    signIn.mockResolvedValue({ error: null, ok: true });
    render(<CredentialsForm initialEmail="a@b.no" onSignedIn={() => {}} />);

    await submit("Password1");

    await waitFor(() => expect(passwordField()).toHaveValue(""));
  });

  it("shows the message of a SignInRejected thrown from onSignedIn", async () => {
    signIn.mockResolvedValue({ error: null, ok: true });
    render(
      <CredentialsForm
        initialEmail="a@b.no"
        onSignedIn={() => {
          throw new SignInRejected("Wrong account.");
        }}
      />,
    );

    await submit();

    expect(await screen.findByText("Wrong account.")).toBeInTheDocument();
  });

  it("shows the generic message for any other thrown error", async () => {
    signIn.mockResolvedValue({ error: null, ok: true });
    render(
      <CredentialsForm
        initialEmail="a@b.no"
        onSignedIn={() => {
          throw new Error("Failed to fetch");
        }}
      />,
    );

    await submit();

    // A raw error is not written for the user and may not be in their language.
    expect(await screen.findByText(text.somethingWentWrong)).toBeInTheDocument();
    expect(screen.queryByText("Failed to fetch")).not.toBeInTheDocument();
  });

  it("shows the generic message when signIn itself throws", async () => {
    signIn.mockImplementation(async () => {
      throw new Error("Network down");
    });
    render(<CredentialsForm initialEmail="a@b.no" onSignedIn={() => {}} />);

    await submit();

    expect(await screen.findByText(text.somethingWentWrong)).toBeInTheDocument();
  });

  it("disables the button and shows signingIn while the sign-in is pending", async () => {
    let finish: (value: { error: null; ok: boolean }) => void = () => {};
    signIn.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<CredentialsForm initialEmail="a@b.no" onSignedIn={() => {}} />);

    await submit();

    const button = screen.getByRole("button", { name: text.signingIn });
    expect(button).toBeDisabled();

    finish({ error: null, ok: true });

    expect(await screen.findByRole("button", { name: text.signIn })).toBeEnabled();
  });

  it("uses the strings it is given", async () => {
    signIn.mockResolvedValue({ error: "InvalidCredentials" });
    render(
      <CredentialsForm
        initialEmail="a@b.no"
        onSignedIn={() => {}}
        strings={{
          email: "E-post",
          password: "Passord",
          signIn: "Logg inn",
          invalidCredentials: "Feil e-post eller passord.",
          showPassword: "Vis passord",
        }}
      />,
    );

    expect(screen.getByLabelText(/^E-post/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vis passord" })).toBeInTheDocument();
    await submit("pw", "Logg inn");

    expect(await screen.findByText("Feil e-post eller passord.")).toBeInTheDocument();
  });

  it("renders extra buttons next to the submit button", () => {
    render(
      <CredentialsForm initialEmail="a@b.no" onSignedIn={() => {}}>
        <button type="button">Close</button>
      </CredentialsForm>,
    );

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("does not treat a refused request without an error as a sign-in", async () => {
    signIn.mockResolvedValue({ error: null, ok: false, status: 500, url: null });
    const onSignedIn = vi.fn();
    render(<CredentialsForm initialEmail="a@b.no" onSignedIn={onSignedIn} />);

    await userEvent.type(screen.getByLabelText(/^Password/), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText(text.somethingWentWrong)).toBeInTheDocument();
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it("does not treat a stale CSRF token as a sign-in, though next-auth reports it as ok", async () => {
    signIn.mockResolvedValue({ error: null, ok: true, status: 200, url: "http://localhost:3000/api/auth/signin?csrf=true" });
    const onSignedIn = vi.fn();
    render(<CredentialsForm initialEmail="a@b.no" onSignedIn={onSignedIn} />);

    await userEvent.type(screen.getByLabelText(/^Password/), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText(text.somethingWentWrong)).toBeInTheDocument();
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it("accepts a sign-in on a page whose own address has csrf=true", async () => {
    signIn.mockResolvedValue({ error: null, ok: true, status: 200, url: "http://localhost:3000/login?csrf=true" });
    const onSignedIn = vi.fn();
    render(<CredentialsForm initialEmail="a@b.no" onSignedIn={onSignedIn} />);

    await userEvent.type(screen.getByLabelText(/^Password/), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await vi.waitFor(() => expect(onSignedIn).toHaveBeenCalled());
  });

  it("reports when a sign-in starts and ends", async () => {
    signIn.mockResolvedValue({ error: null, ok: true });
    const onPendingChange = vi.fn();
    render(<CredentialsForm initialEmail="a@b.no" onSignedIn={() => {}} onPendingChange={onPendingChange} />);

    await userEvent.type(screen.getByLabelText(/^Password/), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await vi.waitFor(() => expect(onPendingChange.mock.calls).toEqual([[true], [false]]));
  });
});
