import { render, screen } from "@testing-library/react";
import { getSession, signIn, signOut, SessionProvider, useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast as sonnerToast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleGate } from "../../session/react";
import { toast } from "../../toast";
import { auth, axiosInstanceMock, axiosSpies, makeSession, navigation, resetTestMocks, setSession, toastSpies } from "../../testing";

// The way an app uses them: the factory imports the helpers, so the hoisted mock never runs before them.
vi.mock("next-auth/react", async () => (await import("../../testing")).nextAuthMock());
vi.mock("next/navigation", async () => (await import("../../testing")).nextNavigationMock());
vi.mock("sonner", async () => (await import("../../testing")).toastMock());
vi.mock("../../toast", async () => (await import("../../testing")).toastMock());

beforeEach(resetTestMocks);

describe("testing helpers", () => {
  it("sign in, out and keep a session loading for useSession", () => {
    expect(useSession()).toMatchObject({ data: null, status: "unauthenticated" });

    const session = makeSession({ roles: ["Editor"] });
    setSession(session);
    expect(useSession()).toMatchObject({ data: session, status: "authenticated" });
    expect(session.user).toEqual({ id: "1", name: "admin", email: "a@b.no", roles: ["Editor"] });
    expect(makeSession().user.roles).toEqual(["Admin"]);
    expect(makeSession({ accessToken: "other" }).accessToken).toBe("other");

    setSession("loading");
    expect(useSession()).toMatchObject({ data: null, status: "loading" });
  });

  it("drive a real gate", () => {
    navigation.pathname = "/no/admin";
    setSession(makeSession({ roles: [] }));
    render(
      <RoleGate role="Admin" deniedHref="/no">
        <p>admin work</p>
      </RoleGate>,
    );

    expect(screen.queryByText("admin work")).not.toBeInTheDocument();
    expect(navigation.router.replace).toHaveBeenCalledWith("/no");
  });

  it("forward the next-auth calls to spies the test sets up", async () => {
    auth.signIn.mockResolvedValue({ ok: true });
    auth.update.mockResolvedValue(makeSession({ roles: [] }));
    expect(await useSession().update({ name: "x" })).toMatchObject({ user: { roles: [] } });
    expect(auth.update).toHaveBeenCalledWith({ name: "x" });
    auth.getSession.mockResolvedValue(makeSession());

    expect(await signIn("credentials", { redirect: false })).toEqual({ ok: true });
    await signOut();
    expect(await getSession()).toMatchObject({ accessToken: "token" });
    expect(auth.signIn).toHaveBeenCalledWith("credentials", { redirect: false });
    expect(auth.signOut).toHaveBeenCalled();
    render(<SessionProvider session={null}><p>inside</p></SessionProvider>);
    expect(screen.getByText("inside")).toBeInTheDocument();
  });

  it("give the router, path and query the test sets", () => {
    navigation.pathname = "/no/builds";
    navigation.searchParams = new URLSearchParams("email=a%40b.no");

    useRouter().push("/x");
    expect(usePathname()).toBe("/no/builds");
    expect(useSearchParams().get("email")).toBe("a@b.no");
    expect(navigation.router.push).toHaveBeenCalledWith("/x");
  });

  it("record toasts from sonner and from app-kit's toast", () => {
    sonnerToast.success("Saved");
    toast.error("Failed");
    sonnerToast("Plain");
    toast.info("Note");
    toast.warning("Careful");
    sonnerToast.loading("Working");
    sonnerToast.promise(Promise.resolve(), { success: "Done" });
    sonnerToast.dismiss("id");

    expect(toastSpies.success).toHaveBeenCalledWith("Saved");
    expect(toastSpies.error).toHaveBeenCalledWith("Failed");
    expect(toastSpies.message).toHaveBeenCalledWith("Plain");
    expect(toastSpies.info).toHaveBeenCalledWith("Note");
    expect(toastSpies.warning).toHaveBeenCalledWith("Careful");
    expect(toastSpies.loading).toHaveBeenCalledWith("Working");
    expect(toastSpies.promise).toHaveBeenCalledWith(expect.any(Promise), { success: "Done" });
    expect(toastSpies.dismiss).toHaveBeenCalledWith("id");
  });

  it("stand in for an app's axios instance", async () => {
    axiosSpies.get.mockResolvedValue({ data: [1] });
    const api = axiosInstanceMock().default;

    expect(await api.get("/users")).toEqual({ data: [1] });
    expect(axiosSpies.get).toHaveBeenCalledWith("/users");
  });

  it("start every test signed out at / with no calls or answers left", () => {
    setSession(makeSession());
    navigation.pathname = "/x";
    navigation.searchParams = new URLSearchParams("a=1");
    auth.signIn.mockResolvedValue(1);
    navigation.router.push("/y");
    toastSpies.error("e");
    axiosSpies.post.mockResolvedValue(2);

    resetTestMocks();

    expect(useSession().status).toBe("unauthenticated");
    expect(navigation.pathname).toBe("/");
    expect(navigation.searchParams.toString()).toBe("");
    expect(auth.signIn()).toBeUndefined();
    expect(navigation.router.push).not.toHaveBeenCalled();
    expect(toastSpies.error).not.toHaveBeenCalled();
    expect(axiosSpies.post()).toBeUndefined();
  });
});
