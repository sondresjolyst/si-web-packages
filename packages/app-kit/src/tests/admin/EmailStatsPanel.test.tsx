import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailStatsPanel, defaultEmailStatsPanelStrings as en } from "../../admin";
import type { EmailStats } from "../../api";
import { nbEmailStatsPanelStrings } from "../../locales/nb";

const stats: EmailStats = { days: 30, requests: 120, delivered: 110, hardBounces: 2, softBounces: 3, spamReports: 1, blocked: 4, invalid: 5 };

const service = { get: vi.fn() };

// The value next to a label, read through the description list's pairs.
const valueOf = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

beforeEach(() => {
  service.get.mockReset().mockResolvedValue(stats);
});

describe("EmailStatsPanel", () => {
  it("says it is loading, then shows sent, delivered, bounces, and blocked with spam", async () => {
    render(<EmailStatsPanel service={service} />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(await screen.findByText("Sent")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(service.get).toHaveBeenCalledWith(30);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Email (last 30 days)");
    expect(valueOf("Sent")).toBe("120");
    expect(valueOf("Delivered")).toBe("110");
    expect(valueOf("Bounces")).toBe("5");
    expect(valueOf("Blocked / spam")).toBe("5");
    expect(screen.getAllByRole("term").map((t) => t.textContent)).toEqual(["Sent", "Delivered", "Bounces", "Blocked / spam"]);
  });

  it("asks for the days it is given and names the days the API answered for", async () => {
    service.get.mockResolvedValue({ ...stats, days: 6 });
    render(<EmailStatsPanel service={service} days={7} />);

    expect(screen.getByRole("heading")).toHaveTextContent("Email (last 7 days)");
    await waitFor(() => expect(screen.getByRole("heading")).toHaveTextContent("Email (last 6 days)"));
    expect(service.get).toHaveBeenCalledWith(7);
  });

  it("says the stats are unavailable when they cannot load", async () => {
    service.get.mockRejectedValue(new Error("Failed to fetch email stats from Brevo."));
    render(<EmailStatsPanel service={service} />);

    expect(await screen.findByText("Unavailable.")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(screen.queryByText("Sent")).not.toBeInTheDocument();
  });

  it("loads again when the days change, and ignores a slow answer for the earlier days", async () => {
    let answerFirst: (s: EmailStats) => void = () => {};
    service.get.mockImplementationOnce(() => new Promise((resolve) => (answerFirst = resolve)));
    service.get.mockResolvedValueOnce({ ...stats, days: 7, requests: 9 });
    const view = render(<EmailStatsPanel service={service} days={30} />);

    view.rerender(<EmailStatsPanel service={service} days={7} />);
    await waitFor(() => expect(valueOf("Sent")).toBe("9"));
    await act(async () => answerFirst(stats));

    expect(valueOf("Sent")).toBe("9");
    expect(screen.getByRole("heading")).toHaveTextContent("Email (last 7 days)");
    expect(service.get.mock.calls).toEqual([[30], [7]]);
  });

  it("ignores a failure for the earlier days", async () => {
    let failFirst: (e: Error) => void = () => {};
    service.get.mockImplementationOnce(() => new Promise((_, reject) => (failFirst = reject)));
    const view = render(<EmailStatsPanel service={service} days={30} />);

    view.rerender(<EmailStatsPanel service={service} days={7} />);
    await screen.findByText("Sent");
    await act(async () => failFirst(new Error("late")));

    expect(screen.queryByText("Unavailable.")).not.toBeInTheDocument();
  });

  it("does not load again when the service is inline, and uses the latest one for new days", async () => {
    const next = { get: vi.fn().mockResolvedValue({ ...stats, days: 7 }) };
    const view = render(<EmailStatsPanel service={{ ...service }} />);
    await screen.findByText("Sent");
    view.rerender(<EmailStatsPanel service={{ ...service }} />);
    view.rerender(<EmailStatsPanel service={next} days={7} />);

    await waitFor(() => expect(next.get).toHaveBeenCalledWith(7));
    expect(service.get).toHaveBeenCalledTimes(1);
  });

  it("uses the app's strings, with the days filled in everywhere the title names them", async () => {
    render(
      <EmailStatsPanel
        service={service}
        strings={{ title: "E-post ({days} dager, siste {days})", sent: "Sendt", delivered: "Levert", bounces: "Returnert", blocked: "Blokkert", loading: "Laster" }}
      />,
    );

    expect(screen.getByText("Laster")).toBeInTheDocument();
    expect(await screen.findByText("Sendt")).toBeInTheDocument();
    expect(screen.getByRole("heading")).toHaveTextContent("E-post (30 dager, siste 30)");
    expect(screen.getByText("Levert")).toBeInTheDocument();
    expect(screen.getByText("Returnert")).toBeInTheDocument();
    expect(screen.getByText("Blokkert")).toBeInTheDocument();
  });

  it("shows the app's unavailable text", async () => {
    service.get.mockRejectedValue(new Error("x"));
    render(<EmailStatsPanel service={service} strings={{ unavailable: "Ikke tilgjengelig." }} />);

    expect(await screen.findByText("Ikke tilgjengelig.")).toBeInTheDocument();
  });

  it("has English defaults", () => {
    expect(en).toEqual({
      title: "Email (last {days} days)",
      sent: "Sent",
      delivered: "Delivered",
      bounces: "Bounces",
      blocked: "Blocked / spam",
      hardBounces: "Hard bounces",
      softBounces: "Soft bounces",
      blockedOnly: "Blocked",
      spamReports: "Spam reports",
      invalid: "Invalid",
      period: "Period",
      periodOption: "{days} days",
      loading: "Loading…",
      unavailable: "Unavailable.",
    });
  });

  it("shows the stats for the days asked for only, and says it is loading while new days load", async () => {
    let answerSeven: (s: EmailStats) => void = () => {};
    service.get.mockResolvedValueOnce(stats).mockImplementationOnce(() => new Promise((resolve) => (answerSeven = resolve)));
    const view = render(<EmailStatsPanel service={service} days={30} />);
    await screen.findByText("Sent");

    view.rerender(<EmailStatsPanel service={service} days={7} />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Sent")).not.toBeInTheDocument();
    expect(screen.getByRole("heading")).toHaveTextContent("Email (last 7 days)");
    await act(async () => answerSeven({ ...stats, days: 7, requests: 9 }));
    expect(valueOf("Sent")).toBe("9");
  });
});

describe("EmailStatsPanel default layout", () => {
  it.each([undefined, []])("has no picker with periods %j and keeps the title as the card's first line", async (periods) => {
    const { container } = render(<EmailStatsPanel service={service} periods={periods} />);
    await screen.findByText("Sent");

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.firstElementChild?.firstElementChild).toBe(screen.getByRole("heading"));
    expect(screen.getByRole("heading")).toHaveClass("mb-3");
  });
});

describe("EmailStatsPanel period picker", () => {
  const periods = [7, 30, 90];

  it("offers each period, with the days it starts on pressed", async () => {
    render(<EmailStatsPanel service={service} periods={periods} />);
    await screen.findByText("Sent");

    const picker = screen.getByRole("group", { name: "Period" });
    expect(within(picker).getAllByRole("button").map((b) => b.textContent)).toEqual(["7 days", "30 days", "90 days"]);
    expect(within(picker).getByRole("button", { name: "30 days" })).toHaveAttribute("aria-pressed", "true");
    expect(within(picker).getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "false");
    expect(within(picker).getByRole("button", { name: "7 days" })).toHaveAttribute("type", "button");
    expect(screen.getByRole("heading")).not.toHaveClass("mb-3");
    expect(service.get.mock.calls).toEqual([[30]]);
  });

  it("loads the period an admin picks on its own", async () => {
    service.get.mockResolvedValueOnce(stats).mockResolvedValueOnce({ ...stats, days: 7, requests: 9 });
    render(<EmailStatsPanel service={service} periods={periods} />);
    await screen.findByText("Sent");

    fireEvent.click(screen.getByRole("button", { name: "7 days" }));

    expect(screen.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "30 days" })).toHaveAttribute("aria-pressed", "false");
    await waitFor(() => expect(valueOf("Sent")).toBe("9"));
    expect(screen.getByRole("heading")).toHaveTextContent("Email (last 7 days)");
    expect(service.get.mock.calls).toEqual([[30], [7]]);
  });

  it("starts on the days it is given, and follows new days from the app", async () => {
    const view = render(<EmailStatsPanel service={service} periods={periods} days={90} />);
    await screen.findByText("Sent");
    expect(screen.getByRole("button", { name: "90 days" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "7 days" }));
    view.rerender(<EmailStatsPanel service={service} periods={periods} days={30} />);

    expect(screen.getByRole("button", { name: "30 days" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(service.get.mock.calls).toEqual([[90], [7], [30]]));
  });

  it("leaves the choice to the app when it controls the days", async () => {
    const onDaysChange = vi.fn();
    const view = render(<EmailStatsPanel service={service} periods={periods} days={30} onDaysChange={onDaysChange} />);
    await screen.findByText("Sent");

    fireEvent.click(screen.getByRole("button", { name: "90 days" }));

    expect(onDaysChange).toHaveBeenCalledWith(90);
    expect(screen.getByRole("button", { name: "30 days" })).toHaveAttribute("aria-pressed", "true");
    expect(service.get.mock.calls).toEqual([[30]]);

    view.rerender(<EmailStatsPanel service={service} periods={periods} days={90} onDaysChange={onDaysChange} />);
    expect(screen.getByRole("button", { name: "90 days" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(service.get.mock.calls).toEqual([[30], [90]]));
  });

  it("draws the picked period from the button tokens and the others from the tab tokens", async () => {
    render(<EmailStatsPanel service={service} periods={periods} />);
    await screen.findByText("Sent");

    expect(screen.getByRole("button", { name: "30 days" })).toHaveClass("rounded-button", "bg-button-primary-bg", "text-button-primary-text");
    expect(screen.getByRole("button", { name: "7 days" })).toHaveClass("rounded-button", "text-admin-tab", "hover:text-admin-tab-hover");
    expect(screen.getByRole("button", { name: "7 days" })).not.toHaveClass("bg-button-primary-bg");
  });
});

describe("EmailStatsPanel separate counts", () => {
  it("shows each count on its own row", async () => {
    render(<EmailStatsPanel service={service} separateCounts />);
    await screen.findByText("Sent");

    expect(screen.getAllByRole("term").map((t) => t.textContent)).toEqual([
      "Sent",
      "Delivered",
      "Hard bounces",
      "Soft bounces",
      "Blocked",
      "Spam reports",
      "Invalid",
    ]);
    expect(screen.getAllByRole("definition").map((d) => d.textContent)).toEqual(["120", "110", "2", "3", "4", "1", "5"]);
  });

  it("reads in Norwegian with the picker", async () => {
    render(<EmailStatsPanel service={service} separateCounts periods={[7, 30]} strings={nbEmailStatsPanelStrings} />);
    await screen.findByText("Sendt");

    expect(screen.getByRole("group", { name: "Periode" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30 dager" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading")).toHaveTextContent("E-post (siste 30 dager)");
    expect(valueOf("Returnert, permanent feil")).toBe("2");
    expect(valueOf("Ugyldig adresse")).toBe("5");
  });
});

describe("EmailStatsPanel theming", () => {
  it("draws the card, title, labels, and values from theme tokens", async () => {
    const { container } = render(<EmailStatsPanel service={service} />);
    await screen.findByText("Sent");

    expect(container.firstElementChild).toHaveClass("rounded-2xl", "border", "border-admin-border", "p-5");
    expect(screen.getByRole("heading")).toHaveClass("text-admin-title");
    expect(screen.getByText("Sent")).toHaveClass("text-admin-stat-label");
    expect(screen.getByText("120")).toHaveClass("tabular-nums", "text-admin-stat-value");
  });

  it("takes the app's outer classes and themes the waiting text", () => {
    service.get.mockReturnValue(new Promise(() => {}));
    const { container } = render(<EmailStatsPanel service={service} className="card" />);

    expect(container.firstElementChild).toHaveClass("card");
    expect(container.firstElementChild).not.toHaveClass("border-admin-border");
    expect(screen.getByText("Loading…")).toHaveClass("text-admin-stat-label");
  });
});
