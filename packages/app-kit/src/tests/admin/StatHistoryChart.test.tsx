import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { STAT_SERIES_COLORS, StatHistoryChart } from "../../admin";

interface Day {
  date: string;
  users: number;
  drafts?: number;
}

const days: Day[] = [
  { date: "2026-10-01", users: 2, drafts: 10 },
  { date: "2026-10-02", users: 4, drafts: 0 },
  { date: "2026-10-03", users: 6 },
];
const series = [
  { key: "users" as const, label: "Users" },
  { key: "drafts" as const, label: "Drafts", color: "#ff0000" },
];

const paths = (container: HTMLElement) => [...container.querySelectorAll("path")];
const tickLabels = (container: HTMLElement) => [...container.querySelectorAll("g text")].map(t => t.textContent);

describe("StatHistoryChart", () => {
  it("says there is no history yet when there are no days", () => {
    render(<StatHistoryChart data={[]} series={series} strings={{ empty: "Ingen historikk" }} />);

    expect(screen.getByText("Ingen historikk")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("draws a line per series in its colour, named for screen readers", () => {
    const { container } = render(<StatHistoryChart data={days} series={series} />);

    expect(screen.getByRole("img", { name: "Stats over time" })).toBeInTheDocument();
    expect(paths(container).map(p => p.getAttribute("stroke"))).toEqual([STAT_SERIES_COLORS[0], "#ff0000"]);
    expect(paths(container)[0]?.getAttribute("d")).toBe("M 32.0 172.8 L 368.0 133.6 L 704.0 94.4");
  });

  it("scales from zero to the highest value, counting a missing value as zero", () => {
    const { container } = render(<StatHistoryChart data={days} series={series} />);

    expect(tickLabels(container)).toEqual(["0", "5", "10"]);
    expect(paths(container)[1]?.getAttribute("d")).toMatch(/L 704\.0 212\.0$/);
    expect(container.querySelector("line")).toHaveClass("stroke-chart-grid");
  });

  it("labels the first, middle and last day by month and day", () => {
    const { container } = render(<StatHistoryChart data={days} series={series} />);

    const dayLabels = [...container.querySelectorAll("svg > text")].map(t => t.textContent);
    expect(dayLabels).toEqual(["10-01", "10-02", "10-03"]);
  });

  it("puts a single day in the middle with a scale of at least one", () => {
    const { container } = render(<StatHistoryChart data={[{ date: "2026-10-01", users: 0 }]} series={[series[0]!]} />);

    expect(paths(container)[0]?.getAttribute("d")).toBe("M 368.0 212.0");
    expect(tickLabels(container)).toEqual(["0", "1"]);
  });

  it("hides a line from its legend button and rescales to what is shown", async () => {
    const { container } = render(<StatHistoryChart data={days} series={series} />);
    const drafts = screen.getByRole("button", { name: "Drafts" });
    expect(drafts).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(drafts);

    expect(drafts).toHaveAttribute("aria-pressed", "false");
    expect(paths(container)).toHaveLength(1);
    expect(tickLabels(container)).toEqual(["0", "3", "6"]);

    await userEvent.click(drafts);
    expect(paths(container)).toHaveLength(2);
  });

  it("takes the app's name for the chart", () => {
    render(<StatHistoryChart data={days} series={series} strings={{ chart: "Over tid" }} />);

    expect(screen.getByRole("img", { name: "Over tid" })).toBeInTheDocument();
  });
});
