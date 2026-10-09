import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { AppSessionProvider } from "../../session/react";

const providerProps = vi.fn();
vi.mock("next-auth/react", () => ({
  SessionProvider: (props: { refetchInterval?: number; children: ReactNode }) => {
    providerProps(props);
    return <>{props.children}</>;
  },
}));

describe("AppSessionProvider", () => {
  it("reads the session every four minutes, so an open tab renews its token before a save", () => {
    render(
      <AppSessionProvider>
        <p>page</p>
      </AppSessionProvider>,
    );

    expect(screen.getByText("page")).toBeInTheDocument();
    expect(providerProps).toHaveBeenLastCalledWith(expect.objectContaining({ refetchInterval: 240 }));
  });

  it("uses the interval it is given", () => {
    render(<AppSessionProvider refetchInterval={60}>{null}</AppSessionProvider>);

    expect(providerProps).toHaveBeenLastCalledWith(expect.objectContaining({ refetchInterval: 60 }));
  });
});
