import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "../../api";
import { nbPasswordStrings, nbResetPasswordFlowStrings as nb } from "../../locales/nb";
import { ResetPasswordFlow, defaultResetPasswordFlowStrings as en } from "../../ui";

const requestReset = vi.fn();
const reset = vi.fn();

// The Error that `request` throws for an API answer with this status and body.
const apiError = (status: number, data: unknown) =>
  request(() => Promise.reject(Object.assign(new Error(`status ${status}`), { isAxiosError: true, response: { status, data } })), "Failed").catch(
    (e: unknown) => e,
  );

const problem = (errors: Record<string, string[]>, codes: Record<string, string[]>, limits: Record<string, number | null> = {}) =>
  apiError(400, { title: "One or more validation errors occurred.", status: 400, errors, codes, limits });

const setPasswordWith = async (password = "Password1") => {
  await userEvent.type(screen.getByLabelText(/^New password/), password);
  await userEvent.click(screen.getByRole("button", { name: "Reset password" }));
};

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

  it("says a weak password does not meet the rules under the field by default, and sends nothing", async () => {
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD" });
    await setPasswordWith("short");

    expect(screen.getByLabelText(/^New password/)).toHaveAccessibleDescription(`The password does not meet the requirements. Use at least 8 characters, with at least one lowercase and one uppercase letter from A to Z and one digit from 0 to 9.`);
    expect(reset).not.toHaveBeenCalled();
  });

  it("describes the new password with the hint until an error takes its place", async () => {
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD" });
    const password = screen.getByLabelText(/^New password/);
    expect(password).toHaveAccessibleDescription(en.passwordHint!);

    await setPasswordWith("short");
    expect(password).toHaveAccessibleDescription(en.passwordInvalid!);
    expect(screen.queryByText(en.passwordHint!)).not.toBeInTheDocument();
    expect(document.querySelector("form")!.textContent!.split(en.passwordHint!)).toHaveLength(2);

    reset.mockReturnValue(new Promise(() => {}));
    await userEvent.clear(password);
    await setPasswordWith("Password1");
    expect(password).toHaveAccessibleDescription(en.passwordHint!);
    expect(screen.getByText(en.passwordHint!)).toHaveClass("text-auth-hint");
  });

  it("shows the Norwegian rules once after a weak password", async () => {
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD", strings: nb, passwordStrings: nbPasswordStrings });
    await userEvent.type(screen.getByLabelText(/^Nytt passord/), "short");
    await userEvent.click(screen.getByRole("button", { name: nb.setPassword }));

    expect(screen.getByLabelText(/^Nytt passord/)).toHaveAccessibleDescription(nb.passwordInvalid!);
    expect(screen.queryByText(nb.passwordHint!)).not.toBeInTheDocument();
    expect(document.querySelector("form")!.textContent!.split(nb.passwordHint!)).toHaveLength(2);
  });

  it("hides the hint while the API refuses the new password", async () => {
    reset.mockRejectedValue(await problem({ NewPassword: ["Passwords must be fun."] }, { NewPassword: ["weakPassword"] }));
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD" });
    await setPasswordWith();

    await waitFor(() => expect(screen.getByLabelText(/^New password/)).toHaveAccessibleDescription("Passwords must be fun."));
    expect(screen.queryByText(en.passwordHint!)).not.toBeInTheDocument();
  });

  it("keeps the hint when only another field is refused", async () => {
    reset.mockRejectedValue(await problem({ Code: ["Required."] }, { Code: ["required"] }));
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD" });
    await setPasswordWith();

    await waitFor(() => expect(screen.getByLabelText(/^Reset code/)).toHaveAccessibleDescription("Required."));
    expect(screen.getByLabelText(/^New password/)).toHaveAccessibleDescription(en.passwordHint!);
  });

  it("keeps the hint when the refusal is about the code", async () => {
    reset.mockRejectedValue(new Error("Invalid or expired reset code."));
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD" });
    await setPasswordWith();

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid or expired reset code.");
    expect(screen.getByLabelText(/^New password/)).toHaveAccessibleDescription(en.passwordHint!);
  });

  it("gives the new password no description without a hint or an error", () => {
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD", strings: { passwordHint: null } });

    expect(screen.getByLabelText(/^New password/)).not.toHaveAttribute("aria-describedby");
  });

  it("names every rule a weak password breaks when passwordInvalid is null", async () => {
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD", strings: { passwordInvalid: null } });
    await setPasswordWith("short");

    expect(screen.getByLabelText(/^New password/)).toHaveAccessibleDescription(
      "Use at least 8 characters. Include an uppercase letter from A to Z. Include a digit from 0 to 9.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
  });

  it("shows one message for a weak password when the app gives one, in the rules' language", async () => {
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD", strings: { passwordInvalid: "Passordet følger ikke reglene." } });
    await setPasswordWith("short");

    expect(screen.getByLabelText(/^New password/)).toHaveAccessibleDescription("Passordet følger ikke reglene.");
  });

  it("uses the app's own rule messages", async () => {
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD", strings: { passwordInvalid: null }, passwordStrings: { digit: "Ta med et siffer." } });
    await setPasswordWith("Passwordx");

    expect(screen.getByLabelText(/^New password/)).toHaveAccessibleDescription("Ta med et siffer.");
  });

  it("clears the rule messages once the password passes", async () => {
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD" });
    await setPasswordWith("short");
    reset.mockReturnValue(new Promise(() => {}));
    await userEvent.clear(screen.getByLabelText(/^New password/));
    await setPasswordWith("Password1");

    expect(screen.getByLabelText(/^New password/)).not.toHaveAttribute("aria-invalid");
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("sets the password and shows the done text with a link back to sign-in", async () => {
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD" });
    await userEvent.type(screen.getByLabelText(/^New password/), "Password1");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(reset).toHaveBeenCalledWith({ email: "kari@example.no", code: "AB12CD", newPassword: "Password1" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/^Your password has been changed\. You can sign in now\.Back to sign in →$/);
    expect(screen.getByRole("link", { name: "Back to sign in →" })).toHaveAttribute("href", "/login");
    expect(screen.queryByLabelText(/^New password/)).not.toBeInTheDocument();
  });

  it("shows the API's message when done is null", async () => {
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD", strings: { done: null } });
    await setPasswordWith();

    expect(await screen.findByRole("alert")).toHaveTextContent(/^Password reset successfully\.Back to sign in →$/);
  });

  it("shows the app's own done text when it gives one, and only the link when done is null and the API sends no message", async () => {
    reset.mockResolvedValue(undefined);
    const { unmount } = flow({ initialEmail: "kari@example.no", initialCode: "AB12CD", strings: { done: "Passordet er endret." } });
    await userEvent.type(screen.getByLabelText(/^New password/), "Password1");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));
    expect(await screen.findByText("Passordet er endret.")).toBeInTheDocument();
    unmount();

    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD", strings: { done: null } });
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

  it("shows the app's text for a refused code, and the API's message for a code it has no text for", async () => {
    reset.mockRejectedValueOnce(await apiError(400, { message: "Invalid or expired reset code.", code: "invalidResetCode" }));
    reset.mockRejectedValueOnce(await apiError(429, { message: "Too many attempts. Request a new reset code.", code: "tooManyResetAttempts" }));
    reset.mockRejectedValueOnce(await apiError(400, { message: "Something new.", code: "somethingNew" }));
    flow({
      initialEmail: "kari@example.no",
      initialCode: "AB12CD",
      strings: { errors: { invalidResetCode: "Koden er feil eller utløpt. Be om en ny kode." } },
    });

    await setPasswordWith();
    expect(await screen.findByRole("alert")).toHaveTextContent(/^Koden er feil eller utløpt\. Be om en ny kode\.$/);

    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/^Too many attempts\. Request a new reset code\.$/));

    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/^Something new\.$/));
  });

  it("uses the English API texts by default", () => {
    expect(en.errors).toEqual({
      invalidResetCode: "Invalid or expired reset code.",
      tooManyResetAttempts: "Too many attempts. Request a new reset code.",
    });
    expect(en.validation).toEqual({
      required: "Required.",
      invalidEmail: "Not a valid email address.",
      passwordTooShort: "Passwords must be at least {max} characters.",
      passwordRequiresDigit: "Passwords must have at least one digit ('0'-'9').",
      passwordRequiresLower: "Passwords must have at least one lowercase ('a'-'z').",
      passwordRequiresUpper: "Passwords must have at least one uppercase ('A'-'Z').",
      passwordRequiresNonAlphanumeric: "Passwords must have at least one non alphanumeric character.",
    });
  });

  it("shows the API's field errors under their fields in the app's language, with the limit filled in", async () => {
    reset.mockRejectedValue(
      await problem(
        {
          Email: ["Not a valid email address."],
          Code: ["Required."],
          NewPassword: ["Passwords must be at least 10 characters.", "Passwords must have at least one digit ('0'-'9').", "Passwords must be fun."],
        },
        { Email: ["invalidEmail"], Code: ["required"], NewPassword: ["passwordTooShort", "passwordRequiresDigit", "weakPassword"] },
        { Email: null, Code: null, NewPassword: 10 },
      ),
    );
    flow({
      initialEmail: "kari@example.no",
      initialCode: "AB12CD",
      strings: { validation: { invalidEmail: "E-postadressen er ikke gyldig.", passwordTooShort: "Bruk minst {max} tegn." } },
    });

    await setPasswordWith();

    await waitFor(() => expect(screen.getByLabelText(/^Email/)).toHaveAccessibleDescription("E-postadressen er ikke gyldig."));
    expect(screen.getByLabelText(/^Reset code/)).toHaveAccessibleDescription("Required.");
    expect(screen.getByLabelText(/^New password/)).toHaveAccessibleDescription(
      "Bruk minst 10 tegn. Passwords must have at least one digit ('0'-'9'). Passwords must be fun.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("puts a field error for a field the step does not show in the message, and clears the field errors on the next try", async () => {
    requestReset.mockRejectedValueOnce(await problem({ Email: ["Required."], Code: ["Nope."] }, { Email: ["required"], Code: ["nope"] }));
    flow({ initialEmail: "kari@example.no", strings: { validation: { required: "Du må fylle ut e-post." } } });

    await userEvent.click(screen.getByRole("button", { name: "Send reset code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/^Nope\.$/);
    expect(screen.getByLabelText(/^Email/)).toHaveAccessibleDescription("Du må fylle ut e-post.");

    await userEvent.click(screen.getByRole("button", { name: "Send reset code" }));
    expect(await screen.findByLabelText(/^Reset code/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clears an earlier message when the next answer has only field errors", async () => {
    reset.mockRejectedValueOnce(await apiError(400, { message: "Invalid or expired reset code.", code: "invalidResetCode" }));
    reset.mockRejectedValueOnce(await problem({ Code: ["Required."] }, { Code: ["required"] }));
    flow({ initialEmail: "kari@example.no", initialCode: "AB12CD" });

    await setPasswordWith();
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid or expired reset code.");

    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));
    await waitFor(() => expect(screen.getByLabelText(/^Reset code/)).toHaveAccessibleDescription("Required."));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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
    expect(await screen.findByText(en.done!)).toBeInTheDocument();
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

  it("shows the intro and the password rules by default", async () => {
    flow();
    expect(screen.getByText("Enter your email address and we will send you a code.")).toHaveClass("text-auth-text");

    await userEvent.type(screen.getByLabelText(/^Email/), "kari@example.no");
    await userEvent.click(screen.getByRole("button", { name: "Send reset code" }));
    expect(await screen.findByText("Use at least 8 characters, with at least one lowercase and one uppercase letter from A to Z and one digit from 0 to 9.")).toHaveClass("text-auth-hint");
  });

  it("leaves the intro and hint out when they are null", async () => {
    flow({ initialEmail: "kari@example.no", strings: { intro: null, passwordHint: null } });
    expect(screen.queryByText(en.intro!)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Send reset code" }));
    expect(await screen.findByLabelText(/^Reset code/)).toBeInTheDocument();
    expect(document.querySelectorAll("p.text-xs")).toHaveLength(0);
  });

  it("gives every English text a value, as the Norwegian set does", () => {
    expect(Object.entries(en).filter(([, text]) => text === null)).toEqual([]);
    expect(en.passwordInvalid).toBe(`The password does not meet the requirements. ${en.passwordHint}`);
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
