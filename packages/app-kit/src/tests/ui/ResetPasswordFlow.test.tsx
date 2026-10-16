import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordFlow, defaultResetPasswordFlowStrings as en } from "../../ui";

const requestReset = vi.fn();
const reset = vi.fn();

const flow = (props: Partial<Parameters<typeof ResetPasswordFlow>[0]> = {}) =>
  render(<ResetPasswordFlow requestReset={requestReset} reset={reset} loginHref="/login" {...props} />);

beforeEach(() => {
  requestReset.mockReset().mockResolvedValue({ message: "Sent." });
  reset.mockReset().mockResolvedValue({ message: "Password reset successfully." });
});

describe("ResetPasswordFlow", () => {
  it("asks for the email first, with a link back to sign-in", () => {
    flow();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Reset password");
    expect(screen.getByText(/Remembered it\?/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByLabelText(/^Email/)).toHaveValue("");
    expect(screen.queryByLabelText(/^Reset code/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send reset code" })).toBeInTheDocument();
  });

  it("sends the email and moves on to the code, keeping the email", async () => {
    flow();
    await userEvent.type(screen.getByLabelText(/^Email/), "kari@example.no");
    await userEvent.click(screen.getByRole("button", { name: "Send reset code" }));

    expect(requestReset).toHaveBeenCalledWith({ email: "kari@example.no" });
    expect(await screen.findByLabelText(/^Reset code/)).toHaveValue("");
    expect(screen.getByLabelText(/^Email/)).toHaveValue("kari@example.no");
    expect(screen.getByText("Check your email for the reset code.")).toBeInTheDocument();
  });

  it("shows why a code could not be sent and stays on the first step", async () => {
    requestReset.mockRejectedValue(new Error("Too many requests. Wait a moment."));
    flow({ initialEmail: "kari@example.no" });

    await userEvent.click(screen.getByRole("button", { name: "Send reset code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests. Wait a moment.");
    expect(screen.queryByLabelText(/^Reset code/)).not.toBeInTheDocument();
  });

  it("opens on the last step with the email and code from a link", () => {
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD" });

    expect(screen.getByLabelText(/^Email/)).toHaveValue("kari@example.no");
    expect(screen.getByLabelText(/^Reset code/)).toHaveValue("AB12CD");
    expect(screen.getByRole("button", { name: "Reset password" })).toBeInTheDocument();
  });

  it("names every rule a weak password breaks and sends nothing", async () => {
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD" });
    await userEvent.type(screen.getByLabelText(/^New password/), "short");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Use at least 8 characters.");
    expect(alert).toHaveTextContent("Include an uppercase letter from A to Z.");
    expect(alert).toHaveTextContent("Include a digit from 0 to 9.");
    expect(reset).not.toHaveBeenCalled();
  });

  it("shows one message for a weak password when the app gives one, in the rules' language", async () => {
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD", strings: { passwordInvalid: "Passordet følger ikke reglene." } });
    await userEvent.type(screen.getByLabelText(/^New password/), "short");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/^Passordet følger ikke reglene\.$/);
  });

  it("uses the app's own rule messages", async () => {
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD", passwordStrings: { digit: "Ta med et siffer." } });
    await userEvent.type(screen.getByLabelText(/^New password/), "Passwordx");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ta med et siffer.");
  });

  it("sets the password and shows the API's message with a link back to sign-in", async () => {
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD" });
    await userEvent.type(screen.getByLabelText(/^New password/), "Password1");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(reset).toHaveBeenCalledWith({ email: "kari@example.no", code: "AB12CD", newPassword: "Password1" });
    expect(await screen.findByText("Password reset successfully.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to sign in →" })).toHaveAttribute("href", "/login");
    expect(screen.queryByLabelText(/^New password/)).not.toBeInTheDocument();
  });

  it("shows the app's own done text when it gives one, and only the link when the API sends no message", async () => {
    reset.mockResolvedValue(undefined);
    const { unmount } = flow({ initialEmail: "kari@example.no", initialCode: "AB12CD", strings: { done: "Passordet er endret." } });
    await userEvent.type(screen.getByLabelText(/^New password/), "Password1");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));
    expect(await screen.findByText("Passordet er endret.")).toBeInTheDocument();
    unmount();

    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD" });
    await userEvent.type(screen.getByLabelText(/^New password/), "Password1");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));
    expect(await screen.findByRole("link", { name: "Back to sign in →" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/^Back to sign in →$/);
    expect(screen.queryByLabelText(/^New password/)).not.toBeInTheDocument();
  });

  it("shows why the code was refused and keeps the form", async () => {
    reset.mockRejectedValue(new Error("The code is wrong or has expired."));
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD" });
    await userEvent.type(screen.getByLabelText(/^New password/), "Password1");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The code is wrong or has expired.");
    expect(screen.getByLabelText(/^New password/)).toBeInTheDocument();
  });

  it("falls back to its own text for a failure without a message", async () => {
    reset.mockRejectedValue("nope");
    requestReset.mockRejectedValue(new Error(""));
    flow({ initialEmail: "kari@example.no", strings: { somethingWentWrong: "Noe gikk galt" } });

    await userEvent.click(screen.getByRole("button", { name: "Send reset code" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Noe gikk galt");
  });

  it("shows the busy text while a request runs", async () => {
    let finish: (v: unknown) => void = () => {};
    requestReset.mockReturnValue(new Promise((r) => (finish = r)));
    flow({ initialEmail: "kari@example.no" });

    await userEvent.click(screen.getByRole("button", { name: "Send reset code" }));
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
    finish({});
    await waitFor(() => expect(screen.getByRole("button", { name: "Reset password" })).toBeEnabled());

    let done: (v: unknown) => void = () => {};
    reset.mockReturnValue(new Promise((r) => (done = r)));
    await userEvent.type(screen.getByLabelText(/^Reset code/), "AB12CD");
    await userEvent.type(screen.getByLabelText(/^New password/), "Password1");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));
    expect(screen.getByRole("button", { name: "Resetting…" })).toBeDisabled();
    done({ message: "Done." });
    expect(await screen.findByText("Done.")).toBeInTheDocument();
  });

  it("takes the app's text, leaving out the parts it sets to null and adding its intro and hint", async () => {
    flow({
      initialEmail: "kari@example.no",
      strings: {
        title: "Tilbakestill passord",
        signInPrompt: null,
        signIn: "Logg inn",
        intro: "Skriv inn e-posten din, så sender vi en kode.",
        codeSent: null,
        email: "E-post",
        code: "Kode",
        newPassword: "Nytt passord",
        passwordHint: "Minst 8 tegn med stor og liten bokstav og et siffer.",
        requestCode: "Send kode",
        setPassword: "Sett passord",
      },
    });

    expect(screen.getByRole("heading")).toHaveTextContent("Tilbakestill passord");
    expect(screen.queryByText(/Remembered it\?/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Logg inn" }).parentElement?.textContent).toBe("Logg inn");
    expect(screen.getByText("Skriv inn e-posten din, så sender vi en kode.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Send kode" }));
    expect(await screen.findByLabelText(/^Kode/)).toBeInTheDocument();
    expect(screen.queryByText(en.codeSent!)).not.toBeInTheDocument();
    expect(screen.getByText("Minst 8 tegn med stor og liten bokstav og et siffer.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sett passord" })).toBeInTheDocument();
  });

  it("keeps the intro and hint out by default", async () => {
    flow({ initialCode: "AB12CD" });

    expect(en.intro).toBeNull();
    expect(en.passwordHint).toBeNull();
    expect(document.querySelectorAll("p.text-xs")).toHaveLength(0);
  });
});

describe("ResetPasswordFlow theming", () => {
  it("draws its colours and title from theme tokens and takes the app's outer classes", () => {
    const { container } = render(
      <ResetPasswordFlow requestReset={requestReset} reset={reset} loginHref="/login" initialEmail="a@b.no" initialCode="X" className="card" strings={{ passwordHint: "Hint." }} />,
    );

    expect(container.firstElementChild).toHaveClass("card");
    expect(container.firstElementChild).not.toHaveClass("max-w-md");
    expect(screen.getByRole("heading")).toHaveClass("text-auth-title", "font-auth-title", "text-auth-heading");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveClass("font-auth-link", "text-auth-link", "hover:text-auth-link-hover");
    expect(screen.getByText("Check your email for the reset code.")).toHaveClass("text-auth-note");
    expect(screen.getByText("Hint.")).toHaveClass("text-auth-hint");
    expect(screen.getByRole("button", { name: "Reset password" })).toHaveClass("rounded-button", "bg-button-primary-bg", "text-button-primary-text");
  });

  it("keeps the default outer spacing", () => {
    const { container } = render(<ResetPasswordFlow requestReset={requestReset} reset={reset} loginHref="/login" strings={{ intro: "Intro." }} />);

    expect(container.firstElementChild).toHaveClass("max-w-md", "mx-auto", "px-4", "py-16");
    expect(screen.getByText(/Remembered it\?/)).toHaveClass("text-auth-text");
    expect(screen.getByText("Intro.")).toHaveClass("text-auth-text");
  });
});
