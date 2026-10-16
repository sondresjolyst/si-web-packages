import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "../../session/react";

const { signIn, push, refresh } = vi.hoisted(() => ({ signIn: vi.fn(), push: vi.fn(), refresh: vi.fn() }));

vi.mock("next-auth/react", () => ({ signIn: (...args: unknown[]) => signIn(...args) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

beforeEach(() => {
  signIn.mockReset().mockResolvedValue({ ok: true, url: "/" });
  push.mockReset();
  refresh.mockReset();
});

async function signInAs(email = "kari@example.no") {
  await userEvent.type(screen.getByLabelText(/^Email/), email);
  await userEvent.type(screen.getByLabelText(/^Password/), "Password1");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginPage", () => {
  it("shows the title, the form and a link to reset the password", () => {
    render(<LoginPage redirectTo="/" resetHref="/reset-password" />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sign in");
    expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forgot your password?" })).toHaveAttribute("href", "/reset-password");
    expect(screen.queryByText(/No account\?/)).not.toBeInTheDocument();
  });

  it("goes to redirectTo and refreshes after signing in", async () => {
    render(<LoginPage redirectTo="/admin" resetHref="/reset-password" />);
    await signInAs();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin"));
    expect(refresh).toHaveBeenCalledOnce();
    expect(signIn).toHaveBeenCalledWith("credentials", { email: "kari@example.no", password: "Password1", redirect: false });
  });

  it("stays on the page when the sign-in is refused", async () => {
    signIn.mockResolvedValue({ error: "CredentialsSignin" });
    render(<LoginPage redirectTo="/admin" resetHref="/reset-password" />);
    await signInAs();

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
    expect(push).not.toHaveBeenCalled();
  });

  it("links to sign-up with its prompt when the app has one", () => {
    render(<LoginPage redirectTo="/" resetHref="/reset-password" registerHref="/register" />);

    const link = screen.getByRole("link", { name: "Create one" });
    expect(link).toHaveAttribute("href", "/register");
    expect(link.parentElement?.textContent).toBe("No account? Create one");
  });

  it("takes the app's text for the page and for the form, and leaves out a null prompt", () => {
    render(
      <LoginPage
        redirectTo="/no/admin"
        resetHref="/no/reset-password"
        registerHref="/no/register"
        strings={{ title: "Logg inn", forgotPassword: "Glemt passord?", registerPrompt: null, register: "Lag konto" }}
        formStrings={{ email: "E-post", signIn: "Logg inn" }}
      />,
    );

    expect(screen.getByRole("heading")).toHaveTextContent("Logg inn");
    expect(screen.getByLabelText(/^E-post/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logg inn" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Glemt passord?" })).toHaveAttribute("href", "/no/reset-password");
    expect(screen.getByRole("link", { name: "Lag konto" }).parentElement?.textContent).toBe("Lag konto");
  });

  it("draws from the auth tokens and takes the app's outer classes", () => {
    const { container, unmount } = render(<LoginPage redirectTo="/" resetHref="/r" registerHref="/reg" className="card" />);

    expect(container.firstElementChild).toHaveClass("card");
    expect(container.firstElementChild).not.toHaveClass("max-w-md");
    expect(screen.getByRole("heading")).toHaveClass("text-auth-title", "font-auth-title", "text-auth-heading", "mb-6");
    expect(screen.getByRole("link", { name: "Forgot your password?" })).toHaveClass("font-auth-link", "text-auth-link");
    expect(screen.getByRole("link", { name: "Forgot your password?" }).parentElement).toHaveClass("mt-6", "text-auth-text");
    expect(screen.getByRole("link", { name: "Create one" }).parentElement).toHaveClass("mt-2", "text-auth-text");
    unmount();

    const page = render(<LoginPage redirectTo="/" resetHref="/r" />);
    expect(page.container.firstElementChild).toHaveClass("max-w-md", "mx-auto", "px-4", "py-16");
  });
});
