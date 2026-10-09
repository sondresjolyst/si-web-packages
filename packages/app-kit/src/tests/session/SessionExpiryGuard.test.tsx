import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "next-auth";
import { closeSessionPrompt, getSessionPromptOpen, openSessionPrompt } from "../../session";
import { SessionExpiryGuard, defaultSessionExpiryGuardStrings as text } from "../../session/react";
import { defaultCredentialsFormStrings as formText } from "../../ui";

const signIn = vi.fn();
const signOut = vi.fn();
const getSession = vi.fn();
const onRestored = vi.fn();
const assign = vi.fn();
let sessionState: { data: Session | null; status: "loading" | "authenticated" | "unauthenticated" };

vi.mock("next-auth/react", () => ({
  useSession: () => sessionState,
  signIn: (...args: unknown[]) => signIn(...args),
  signOut: (...args: unknown[]) => signOut(...args),
  getSession: (...args: unknown[]) => getSession(...args),
}));

const session = (overrides: Partial<Session> = {}): Session => ({
  user: { id: "1", name: "admin", email: "a@b.no", roles: ["Admin"] },
  accessToken: "token",
  expires: "",
  ...overrides,
});

const otherUser = (): Session => ({
  user: { id: "2", name: "other", email: "c@d.no", roles: ["Admin"] },
  accessToken: "token",
  expires: "",
});

// The banner shows its text, and the live region holds the same text when it was just announced.
const expectBanner = (bannerText: string) => expect(screen.getAllByText(bannerText)).toHaveLength(2);

const guard = () => <SessionExpiryGuard loginHref="/login" onRestored={onRestored} />;

const signInWith = async (password: string) => {
  await userEvent.type(screen.getByLabelText(new RegExp(`^${formText.password}`)), password);
  await userEvent.click(screen.getByRole("button", { name: formText.signIn }));
};

describe("SessionExpiryGuard", () => {
  beforeEach(() => {
    signIn.mockReset();
    signOut.mockReset();
    getSession.mockReset();
    onRestored.mockReset();
    assign.mockReset();
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, assign } as Location);
    sessionState = { data: session(), status: "authenticated" };
    closeSessionPrompt();
  });

  afterEach(() => {
    closeSessionPrompt();
    vi.restoreAllMocks();
  });

  it("shows nothing while the session is healthy and nothing has failed", () => {
    render(guard());

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(text.expiredBody)).not.toBeInTheDocument();
  });

  it("opens the prompt when a request finds a dead session", () => {
    render(guard());

    act(() => openSessionPrompt());

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: text.expiredTitle })).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(`^${formText.email}`))).toHaveValue("a@b.no");
  });

  it("signs in without navigating away from the form", async () => {
    signIn.mockResolvedValue({ error: null, ok: true });
    getSession.mockResolvedValue(session());
    render(guard());
    act(() => openSessionPrompt());

    await signInWith("Password1");

    // A redirecting sign-in would unmount the form and lose what the user typed.
    expect(signIn).toHaveBeenCalledWith("credentials", expect.objectContaining({ redirect: false }));
    expect(getSessionPromptOpen()).toBe(false);
    expect(onRestored).toHaveBeenCalledTimes(1);
  });

  it("keeps the prompt open when the password is wrong", async () => {
    signIn.mockResolvedValue({ error: "CredentialsSignin" });
    render(guard());
    act(() => openSessionPrompt());

    await signInWith("wrong");

    // A typo must not cost the user their work either.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(formText.invalidCredentials)).toBeInTheDocument();
    expect(onRestored).not.toHaveBeenCalled();
  });

  it("does not claim success when the new session still cannot save", async () => {
    signIn.mockResolvedValue({ error: null, ok: true });
    getSession.mockResolvedValue(session({ error: "RefreshTokenRejected" }));
    render(guard());
    act(() => openSessionPrompt());

    await signInWith("Password1");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(text.notRestored)).toBeInTheDocument();
    expect(onRestored).not.toHaveBeenCalled();
  });

  it("warns before the absolute cap, with the minutes left", () => {
    sessionState = { data: session({ absoluteExpiresAt: Date.now() + 12 * 60 * 1000 }), status: "authenticated" };

    render(guard());

    expectBanner(text.expiringSoon.replace("{minutes}", "12"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not warn while the cap is still far away", () => {
    sessionState = {
      data: session({ absoluteExpiresAt: Date.now() + 6 * 60 * 60 * 1000 }),
      status: "authenticated",
    };

    render(guard());

    expect(screen.queryByText(/expires in|{minutes}/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: text.reSignIn })).not.toBeInTheDocument();
  });

  it("offers the prompt from the banner once the session is dead", async () => {
    sessionState = { data: session({ error: "AbsoluteSessionExpired" }), status: "authenticated" };
    render(guard());

    expectBanner(text.expiredBody);
    await userEvent.click(screen.getByRole("button", { name: text.reSignIn }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("refuses to hand the page to a different account", async () => {
    signIn.mockResolvedValue({ error: null, ok: true });
    getSession.mockResolvedValue(otherUser());
    render(guard());
    act(() => openSessionPrompt());

    await signInWith("Password1");

    // signIn has already swapped the session, so the mismatch has to end it, not only report it.
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(assign).toHaveBeenCalledWith("/login");
    expect(screen.getByText(text.wrongUser)).toBeInTheDocument();
    expect(getSessionPromptOpen()).toBe(true);
    expect(onRestored).not.toHaveBeenCalled();
  });

  it("shows the generic message for a failure that is not about credentials", async () => {
    signIn.mockResolvedValue({ error: null, ok: true });
    getSession.mockRejectedValue(new Error("Failed to fetch"));
    render(guard());
    act(() => openSessionPrompt());

    await signInWith("Password1");

    // A raw fetch error is not written for the user and may not be in their language.
    expect(screen.getByText(formText.somethingWentWrong)).toBeInTheDocument();
    expect(screen.queryByText("Failed to fetch")).not.toBeInTheDocument();
  });

  it("closes the prompt when it unmounts, so the gate can redirect again", () => {
    const view = render(guard());
    act(() => openSessionPrompt());
    expect(getSessionPromptOpen()).toBe(true);

    view.unmount();

    expect(getSessionPromptOpen()).toBe(false);
  });

  it("reports an expired session rather than zero minutes left", () => {
    sessionState = { data: session({ absoluteExpiresAt: Date.now() - 1000 }), status: "authenticated" };

    render(guard());

    expectBanner(text.expiredBody);
    expect(screen.queryByText(text.expiringSoon.replace("{minutes}", "0"))).not.toBeInTheDocument();
  });

  it("puts the cursor in the password field when it opens", () => {
    render(guard());

    act(() => openSessionPrompt());

    expect(screen.getByLabelText(new RegExp(`^${formText.password}`))).toHaveFocus();
  });

  it("closes on Escape", async () => {
    render(guard());
    act(() => openSessionPrompt());

    await userEvent.keyboard("{Escape}");

    expect(getSessionPromptOpen()).toBe(false);
  });

  it("closes from the close button", async () => {
    render(guard());
    act(() => openSessionPrompt());

    await userEvent.click(screen.getByRole("button", { name: text.close }));

    expect(getSessionPromptOpen()).toBe(false);
  });

  it("keeps Tab inside the dialog", async () => {
    render(
      <>
        <input aria-label="behind the overlay" />
        {guard()}
      </>,
    );
    act(() => openSessionPrompt());

    // Tab from the last control must wrap to the first. The form behind the overlay is hidden
    // from the user and must not be edited.
    const controls = screen.getByRole("dialog").querySelectorAll("input, button");
    (controls[controls.length - 1] as HTMLElement).focus();
    await userEvent.tab();

    expect(screen.getByLabelText("behind the overlay")).not.toHaveFocus();
    expect(controls[0]).toHaveFocus();
  });

  it("wraps backwards too", async () => {
    render(guard());
    act(() => openSessionPrompt());

    const controls = screen.getByRole("dialog").querySelectorAll("input, button");
    (controls[0] as HTMLElement).focus();
    await userEvent.tab({ shift: true });

    expect(controls[controls.length - 1]).toHaveFocus();
  });

  it("gives focus back where it was when it closes", async () => {
    render(
      <>
        <button type="button">save</button>
        {guard()}
      </>,
    );
    const save = screen.getByRole("button", { name: "save" });
    save.focus();

    act(() => openSessionPrompt());
    await userEvent.keyboard("{Escape}");

    expect(save).toHaveFocus();
  });

  it("still refuses another account after the cookie is gone", async () => {
    const view = render(guard());

    // The cookie is lost, so useSession reports nobody. The owner is latched from the first
    // render, so there is still someone to compare against.
    sessionState = { data: null, status: "unauthenticated" };
    view.rerender(guard());
    act(() => openSessionPrompt());

    signIn.mockResolvedValue({ error: null, ok: true });
    getSession.mockResolvedValue(otherUser());
    await signInWith("Password1");

    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(assign).toHaveBeenCalledWith("/login");
    expect(screen.getByText(text.wrongUser)).toBeInTheDocument();
  });

  it("offers the owner email back after the cookie is gone", () => {
    const view = render(guard());

    sessionState = { data: null, status: "unauthenticated" };
    view.rerender(guard());
    act(() => openSessionPrompt());

    expect(screen.getByLabelText(new RegExp(`^${formText.email}`))).toHaveValue("a@b.no");
  });

  it("uses the guard strings it is given", async () => {
    sessionState = { data: session({ absoluteExpiresAt: Date.now() + 12 * 60 * 1000 }), status: "authenticated" };
    signIn.mockResolvedValue({ error: null, ok: true });
    getSession.mockResolvedValue(session({ error: "RefreshTokenRejected" }));
    render(
      <SessionExpiryGuard
        loginHref="/login"
        strings={{
          expiredTitle: "Økten er utløpt",
          expiredBody: "Logg inn igjen for å lagre.",
          expiringSoon: "Expires in {minutes} min",
          reSignIn: "Logg inn igjen",
          notRestored: "Kunne ikke fornye økten.",
          close: "Lukk",
        }}
      />,
    );

    expectBanner("Expires in 12 min");
    await userEvent.click(screen.getByRole("button", { name: "Logg inn igjen" }));

    // Opened from the countdown, the prompt keeps the countdown wording.
    const dialog = screen.getByRole("dialog");
    expect(screen.getByRole("heading", { name: "Logg inn igjen" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Expires in 12 min");
    expect(screen.getByRole("button", { name: "Lukk" })).toBeInTheDocument();

    await signInWith("Password1");

    expect(screen.getByText("Kunne ikke fornye økten.")).toBeInTheDocument();
  });

  it("passes the form strings through to the form", async () => {
    signIn.mockResolvedValue({ error: "InvalidCredentials" });
    render(
      <SessionExpiryGuard
        loginHref="/login"
        formStrings={{ email: "E-post", password: "Passord", signIn: "Logg inn", invalidCredentials: "Feil passord." }}
      />,
    );
    act(() => openSessionPrompt());

    expect(screen.getByLabelText(/^E-post/)).toHaveValue("a@b.no");
    await userEvent.type(screen.getByLabelText(/^Passord/), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Logg inn" }));

    expect(screen.getByText("Feil passord.")).toBeInTheDocument();
  });

  it("shows 1 min, not 0, in the last half minute", () => {
    sessionState = { data: session({ absoluteExpiresAt: Date.now() + 25_000 }), status: "authenticated" };

    render(guard());

    expectBanner(text.expiringSoon.replaceAll("{minutes}", "1"));
  });

  it("counts down and switches to the expired banner on time", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      sessionState = { data: session({ absoluteExpiresAt: Date.now() + 90_000 }), status: "authenticated" };
      render(guard());
      expectBanner(text.expiringSoon.replaceAll("{minutes}", "2"));

      act(() => vi.advanceTimersByTime(31_000));
      expectBanner(text.expiringSoon.replaceAll("{minutes}", "1"));

      act(() => vi.advanceTimersByTime(60_000));
      expectBanner(text.expiredBody);
    } finally {
      vi.useRealTimers();
    }
  });

  it("starts the warning when the last half hour begins", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      sessionState = { data: session({ absoluteExpiresAt: Date.now() + 31 * 60 * 1000 }), status: "authenticated" };
      render(guard());
      expect(screen.queryByRole("button", { name: text.reSignIn })).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(60_000));
      expectBanner(text.expiringSoon.replaceAll("{minutes}", "30"));
    } finally {
      vi.useRealTimers();
    }
  });

  it("replaces every {minutes} in a custom warning", () => {
    sessionState = { data: session({ absoluteExpiresAt: Date.now() + 12 * 60 * 1000 }), status: "authenticated" };

    render(<SessionExpiryGuard loginHref="/login" strings={{ expiringSoon: "{minutes} min, {minutes} min" }} />);

    expectBanner("12 min, 12 min");
  });

  it("keeps the default text for a string passed as undefined", () => {
    sessionState = { data: session({ error: "AbsoluteSessionExpired" }), status: "authenticated" };
    const strings = { reSignIn: undefined } as unknown as { reSignIn: string };

    render(<SessionExpiryGuard loginHref="/login" strings={strings} />);

    expect(screen.getByRole("button", { name: text.reSignIn })).toBeInTheDocument();
  });

  it("brings Tab back into the dialog when focus has left it", async () => {
    render(
      <>
        <input aria-label="behind the overlay" />
        <SessionExpiryGuard loginHref="/login" />
      </>,
    );
    act(() => openSessionPrompt());
    // A click on the dialog padding or the backdrop moves focus to the body.
    (document.activeElement as HTMLElement).blur();

    await userEvent.tab();

    const controls = screen.getByRole("dialog").querySelectorAll("input, button");
    expect(controls[0]).toHaveFocus();
  });

  it("reads the clock again when the tab comes back, so a sleep does not hide the warning", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      sessionState = { data: session({ absoluteExpiresAt: Date.now() + 2 * 60 * 60 * 1000 }), status: "authenticated" };
      render(guard());
      expect(screen.queryByRole("button", { name: text.reSignIn })).not.toBeInTheDocument();

      // The computer slept: the wall clock moved on, the timers did not fire.
      vi.setSystemTime(Date.now() + (2 * 60 - 10) * 60 * 1000);
      act(() => document.dispatchEvent(new Event("visibilitychange")));

      expectBanner(text.expiringSoon.replaceAll("{minutes}", "10"));
    } finally {
      vi.useRealTimers();
    }
  });

  it("never waits more than five minutes before reading the clock again", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      sessionState = { data: session({ absoluteExpiresAt: Date.now() + 40 * 60 * 1000 }), status: "authenticated" };
      render(guard());

      // A sleep moves the wall clock six minutes while the timer counts five. The timer still fires
      // within five minutes of waking, and the warning shows then.
      vi.setSystemTime(Date.now() + 6 * 60 * 1000);
      act(() => vi.advanceTimersByTime(5 * 60 * 1000));

      expectBanner(text.expiringSoon.replaceAll("{minutes}", "29"));
    } finally {
      vi.useRealTimers();
    }
  });

  it("leaves the page for the login page when signing out the other account fails", async () => {
    signIn.mockResolvedValue({ error: null, ok: true });
    getSession.mockResolvedValue(otherUser());
    signOut.mockRejectedValue(new Error("Failed to fetch"));
    render(guard());
    act(() => openSessionPrompt());

    await signInWith("Password1");

    expect(assign).toHaveBeenCalledWith("/login");
  });

  it("does not call a session that still works expired when the banner opens the prompt", async () => {
    sessionState = { data: session({ absoluteExpiresAt: Date.now() + 12 * 60 * 1000 }), status: "authenticated" };
    render(guard());

    await userEvent.click(screen.getByRole("button", { name: text.reSignIn }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(text.expiringSoon.replaceAll("{minutes}", "12"));
    expect(dialog).not.toHaveTextContent(text.expiredTitle);
  });

  it("does not try to focus a control that is gone when the prompt closes", async () => {
    sessionState = { data: session({ absoluteExpiresAt: Date.now() + 12 * 60 * 1000 }), status: "authenticated" };
    const view = render(guard());
    const opener = screen.getByRole("button", { name: text.reSignIn });
    await userEvent.click(opener);
    const focus = vi.spyOn(opener, "focus");

    // The banner button that opened the prompt unmounts once the session is renewed.
    sessionState = { data: session({ absoluteExpiresAt: Date.now() + 6 * 60 * 60 * 1000 }), status: "authenticated" };
    view.rerender(guard());
    await userEvent.keyboard("{Escape}");

    expect(opener.isConnected).toBe(false);
    expect(getSessionPromptOpen()).toBe(false);
    expect(focus).not.toHaveBeenCalled();
  });

  it("uses the custom expired wording when the session is dead", () => {
    sessionState = { data: session({ error: "AbsoluteSessionExpired" }), status: "authenticated" };
    render(<SessionExpiryGuard loginHref="/login" strings={{ expiredTitle: "Økten er utløpt", expiredBody: "Logg inn igjen for å lagre." }} />);

    act(() => openSessionPrompt());

    expect(screen.getByRole("heading", { name: "Økten er utløpt" })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("Logg inn igjen for å lagre.");
  });

  it("uses the expired wording when a failed request opens the prompt during the countdown", () => {
    sessionState = { data: session({ absoluteExpiresAt: Date.now() + 12 * 60 * 1000 }), status: "authenticated" };
    render(guard());

    act(() => openSessionPrompt());

    expect(screen.getByRole("heading", { name: text.expiredTitle })).toBeInTheDocument();
  });

  it("forgets the banner opening once the prompt closes", async () => {
    sessionState = { data: session({ absoluteExpiresAt: Date.now() + 12 * 60 * 1000 }), status: "authenticated" };
    render(guard());
    await userEvent.click(screen.getByRole("button", { name: text.reSignIn }));
    await userEvent.keyboard("{Escape}");

    act(() => openSessionPrompt());

    expect(screen.getByRole("heading", { name: text.expiredTitle })).toBeInTheDocument();
  });

  it("keeps the countdown wording while a renewal signs in", async () => {
    sessionState = { data: session({ absoluteExpiresAt: Date.now() + 12 * 60 * 1000 }), status: "authenticated" };
    const view = render(guard());
    await userEvent.click(screen.getByRole("button", { name: text.reSignIn }));

    // The sign-in renewed the session, so the countdown is gone from the session.
    sessionState = { data: session({ absoluteExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }), status: "authenticated" };
    view.rerender(guard());

    expect(screen.getByRole("heading", { name: text.reSignIn })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent(text.expiringSoon.replaceAll("{minutes}", "12"));
  });

  it("does not close while a sign-in is in flight", async () => {
    let finish: (value: { error: null; ok: boolean }) => void = () => {};
    signIn.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    getSession.mockResolvedValue(session());
    render(guard());
    act(() => openSessionPrompt());

    await userEvent.type(screen.getByLabelText(new RegExp(`^${formText.password}`)), "pw");
    await userEvent.click(screen.getByRole("button", { name: formText.signIn }));
    await userEvent.keyboard("{Escape}");

    expect(getSessionPromptOpen()).toBe(true);
    expect(screen.getByRole("button", { name: text.close })).toBeDisabled();
    await act(async () => finish({ error: null, ok: true }));
  });

  it("fills in the email once the session reports who the user is", () => {
    sessionState = { data: null, status: "loading" };
    const view = render(guard());
    act(() => openSessionPrompt());
    expect(screen.getByLabelText(new RegExp(`^${formText.email}`))).toHaveValue("");

    sessionState = { data: session(), status: "authenticated" };
    view.rerender(guard());

    expect(screen.getByLabelText(new RegExp(`^${formText.email}`))).toHaveValue("a@b.no");
  });

  it("signs out again when a session read in flight puts the other account back", async () => {
    signIn.mockResolvedValue({ error: null, ok: true });
    // The sign-in reads the new session first. The check after the first sign-out still finds it,
    // the check after the second finds nothing.
    getSession.mockResolvedValueOnce(otherUser()).mockResolvedValueOnce(otherUser()).mockResolvedValueOnce(null);
    render(guard());
    act(() => openSessionPrompt());

    await signInWith("Password1");

    expect(signOut).toHaveBeenCalledTimes(2);
    expect(assign).toHaveBeenCalledWith("/login");
    expect(screen.getByText(text.wrongUser)).toBeInTheDocument();
  });

  it("keeps the opener's email while the session switches under an open prompt", () => {
    const view = render(guard());
    act(() => openSessionPrompt());

    // The sign-in has already replaced the session when the guard re-renders.
    sessionState = { data: otherUser(), status: "authenticated" };
    view.rerender(guard());

    expect(screen.getByLabelText(new RegExp(`^${formText.email}`))).toHaveValue("a@b.no");
  });

  it("signs out another account even when the read-back after the sign-in fails", async () => {
    signIn.mockResolvedValue({ error: null, ok: true });
    getSession.mockResolvedValueOnce(null).mockResolvedValue(null);
    const view = render(guard());
    act(() => openSessionPrompt());
    // signIn has already put the other account in the session.
    sessionState = { data: otherUser(), status: "authenticated" };
    view.rerender(guard());

    await signInWith("Password1");

    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(assign).toHaveBeenCalledWith("/login");
    expect(screen.getByText(text.wrongUser)).toBeInTheDocument();
  });

  it("does not sign out the owner when the read-back after their own sign-in fails", async () => {
    signIn.mockResolvedValue({ error: null, ok: true });
    getSession.mockResolvedValue(null);
    render(guard());
    act(() => openSessionPrompt());

    await signInWith("Password1");

    expect(signOut).not.toHaveBeenCalled();
    expect(screen.getByText(text.notRestored)).toBeInTheDocument();
  });

  it("announces the countdown and the expiry through regions that were there from the start", () => {
    const view = render(guard());
    const status = screen.getByRole("status");
    const alert = screen.getByRole("alert");
    expect(status).toBeEmptyDOMElement();

    sessionState = { data: session({ absoluteExpiresAt: Date.now() + 11.5 * 60 * 1000 }), status: "authenticated" };
    view.rerender(guard());
    expect(status).toHaveTextContent(text.expiringSoon.replaceAll("{minutes}", "12"));

    sessionState = { data: session({ error: "AbsoluteSessionExpired" }), status: "authenticated" };
    view.rerender(guard());
    expect(alert).toHaveTextContent(text.expiredBody);
    expect(status).toBeEmptyDOMElement();
  });

  it("announces the countdown when it starts and then only at 10, 5 and 1 min", () => {
    const at = (minutes: number) => {
      sessionState = { data: session({ absoluteExpiresAt: Date.now() + minutes * 60 * 1000 }), status: "authenticated" };
    };
    at(11.5);
    const view = render(guard());
    const status = screen.getByRole("status");
    const says = (minutes: number) => text.expiringSoon.replaceAll("{minutes}", String(minutes));
    expect(status).toHaveTextContent(says(12));

    at(10.5);
    view.rerender(guard());
    expect(status).toHaveTextContent(says(12));
    expect(screen.getAllByText(says(11))).toHaveLength(1);

    at(9.5);
    view.rerender(guard());
    expect(status).toHaveTextContent(says(10));

    // A sleep past several marks announces once, with the current minutes.
    at(0.5);
    view.rerender(guard());
    expect(status).toHaveTextContent(says(1));
  });

  it("reads the session again when the read-back finds nobody and no user is known", async () => {
    sessionState = { data: null, status: "unauthenticated" };
    signIn.mockResolvedValue({ error: null, ok: true });
    getSession.mockResolvedValueOnce(null).mockResolvedValueOnce(otherUser()).mockResolvedValue(null);
    const view = render(guard());
    sessionState = { data: session(), status: "authenticated" };
    view.rerender(guard());
    sessionState = { data: null, status: "unauthenticated" };
    view.rerender(guard());
    act(() => openSessionPrompt());

    await signInWith("Password1");

    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(screen.getByText(text.wrongUser)).toBeInTheDocument();
  });
});
