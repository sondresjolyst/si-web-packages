import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeSessionPrompt, openSessionPrompt } from "../session";

const sonner = vi.hoisted(() => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
vi.mock("sonner", () => sonner);

import { toast } from "../toast";

describe("toast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    closeSessionPrompt();
  });

  afterEach(() => closeSessionPrompt());

  it("shows error toasts while the session prompt is closed", () => {
    toast.error("Not authorized.");

    expect(sonner.toast.error).toHaveBeenCalledWith("Not authorized.");
  });

  it("keeps error toasts quiet while the session prompt is open", () => {
    openSessionPrompt();
    toast.error("Not authorized.");

    expect(sonner.toast.error).not.toHaveBeenCalled();
  });

  it("passes every other toast through while the prompt is open", () => {
    openSessionPrompt();
    toast.success("You are signed in again.");
    toast("Saved");

    expect(sonner.toast.success).toHaveBeenCalledWith("You are signed in again.");
    expect(sonner.toast).toHaveBeenCalledWith("Saved");
  });
});
