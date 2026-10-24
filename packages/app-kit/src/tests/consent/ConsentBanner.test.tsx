import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { CONSENT_STORAGE_KEY, ConsentBanner, ConsentSettingsLink, getConsent, openConsentSettings, setConsent } from "../../consent";
import { resetConsentStore } from "../../consent/consentStore";
import { nbConsentBannerStrings, nbConsentSettingsLinkStrings } from "../../locales/nb";

const banner = () => screen.queryByRole("region", { name: "Cookies for marketing" });

function Page({ enabled = true }: { enabled?: boolean }) {
  return (
    <>
      <button type="button">Page action</button>
      <ConsentBanner enabled={enabled} cookiesHref="/cookies" />
      <footer>
        <ConsentSettingsLink enabled={enabled} />
      </footer>
    </>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  resetConsentStore();
});

describe("ConsentBanner", () => {
  it("asks when there is no choice, names the purpose, and links to the cookie page", () => {
    render(<Page />);

    const region = banner();
    expect(region).toBeInTheDocument();
    expect(region).toHaveAccessibleDescription(/Meta Pixel to measure our ads/);
    expect(screen.getByRole("link", { name: "Read about cookies" })).toHaveAttribute("href", "/cookies");
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("gives Accept and Reject the same markup, apart from the text", () => {
    render(<Page />);

    const accept = screen.getByRole("button", { name: "Accept" });
    const reject = screen.getByRole("button", { name: "Reject" });
    const markup = (el: HTMLElement) => el.outerHTML.replace(el.textContent ?? "", "");
    expect(markup(accept)).toBe(markup(reject));
    expect(accept.className).not.toBe("");
    expect(accept.parentElement).toBe(reject.parentElement);
  });

  it.each([
    ["Accept", true],
    ["Reject", false],
  ])("hides after %s and stores the choice", async (name, marketing) => {
    render(<Page />);

    await userEvent.click(screen.getByRole("button", { name }));
    expect(banner()).not.toBeInTheDocument();
    expect(getConsent().marketing).toBe(marketing);
    expect(JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY)!)).toMatchObject({ marketing });
  });

  it("stays hidden once there is a choice, and the settings link reopens it with focus", async () => {
    setConsent({ marketing: true });
    render(<Page />);
    expect(banner()).not.toBeInTheDocument();

    const settings = screen.getByRole("button", { name: "Cookie settings" });
    await userEvent.click(settings);
    expect(banner()).toBeInTheDocument();
    expect(banner()).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(banner()).not.toBeInTheDocument();
    expect(getConsent().marketing).toBe(false);
    expect(settings).toHaveFocus();
  });

  it("closes when reopened over a choice, by the button or Escape, and keeps the choice", async () => {
    setConsent({ marketing: true });
    const before = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    render(<Page />);
    const settings = screen.getByRole("button", { name: "Cookie settings" });

    await userEvent.click(settings);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(banner()).not.toBeInTheDocument();
    expect(settings).toHaveFocus();

    await userEvent.click(settings);
    await userEvent.keyboard("{Escape}");
    expect(banner()).not.toBeInTheDocument();
    expect(getConsent()).toMatchObject({ marketing: true, reopened: false });
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe(before);
  });

  it("cannot be closed without a choice on the first ask, even when reopened", async () => {
    render(<Page />);
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(banner()).toBeInTheDocument();

    act(() => openConsentSettings());
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(banner()).toBeInTheDocument();
  });

  it("asks again for a new notice version and stores it with the choice", async () => {
    setConsent({ marketing: false, noticeVersion: "1" });
    const { rerender } = render(<ConsentBanner enabled cookiesHref="/cookies" noticeVersion="1" />);
    expect(banner()).not.toBeInTheDocument();

    rerender(<ConsentBanner enabled cookiesHref="/cookies" noticeVersion="2" />);
    expect(banner()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY)!)).toMatchObject({ marketing: false, noticeVersion: "2" });
    expect(banner()).not.toBeInTheDocument();
  });

  it("does not take focus on its own the first time it shows", () => {
    render(<Page />);
    expect(banner()).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it("is reachable by keyboard and leaves the page usable", async () => {
    render(<Page />);
    const region = banner()!;

    expect(region).not.toHaveAttribute("aria-modal");
    expect(region.tagName).toBe("SECTION");
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Page action" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Read about cookies" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Reject" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Accept" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(banner()).not.toBeInTheDocument();
    expect(getConsent().marketing).toBe(true);
  });

  it("renders nothing, and no settings link, when the app has no marketing tool", () => {
    const { container } = render(<Page enabled={false} />);
    expect(banner()).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cookie settings" })).not.toBeInTheDocument();
    expect(container.querySelector("footer")).toBeEmptyDOMElement();
  });

  it("renders nothing on the server", () => {
    expect(renderToString(<ConsentBanner enabled cookiesHref="/cookies" />)).toBe("");
  });

  it("takes the Norwegian text", async () => {
    setConsent({ marketing: false });
    render(
      <>
        <ConsentBanner enabled cookiesHref="/informasjonskapsler" strings={nbConsentBannerStrings} />
        <ConsentSettingsLink strings={nbConsentSettingsLinkStrings} className="footer-link" />
      </>,
    );

    const settings = screen.getByRole("button", { name: "Innstillinger for informasjonskapsler" });
    expect(settings).toHaveClass("footer-link");
    await userEvent.click(settings);
    expect(screen.getByRole("region", { name: "Informasjonskapsler for markedsføring" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Godta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Avvis" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lukk" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Les om informasjonskapsler" })).toHaveAttribute("href", "/informasjonskapsler");
  });

  it("hides when another part of the page records the choice", () => {
    render(<Page />);
    act(() => setConsent({ marketing: false }));
    expect(banner()).not.toBeInTheDocument();
  });
});
