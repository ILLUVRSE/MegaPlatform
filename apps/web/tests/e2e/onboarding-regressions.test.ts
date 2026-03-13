import { createElement, type AnchorHTMLAttributes } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "@/app/onboarding/page";
import OnboardingPrompt from "@/app/home/components/OnboardingPrompt";

const pushMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock })
}));

vi.mock("next/link", () => ({
  default: ({ children, href, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    createElement(
      "a",
      {
        href,
        onClick: (event: MouseEvent) => {
          event.preventDefault();
          onClick?.(event as never);
        },
        ...props
      },
      children
    )
}));

describe("onboarding regressions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    window.localStorage.clear();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn(() => true)
    });
  });

  it("blocks finishing onboarding until a step is chosen, then completes successfully", async () => {
    render(createElement(OnboardingPage));

    const finishButton = screen.getByRole("button", { name: "Finish onboarding" });
    expect((finishButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(finishButton);
    expect(pushMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("link", { name: "Open Pick something to watch" }));

    await waitFor(() => {
      expect((finishButton as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(finishButton);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/home");
    });
    expect(window.localStorage.getItem("illuvrse:onboarding-completed")).toBe("1");
  });

  it("suppresses the home onboarding prompt after skip-for-now dismissal", async () => {
    render(createElement(OnboardingPage));

    fireEvent.click(screen.getByRole("link", { name: "Skip for now" }));
    expect(window.localStorage.getItem("illuvrse:onboarding-dismissed")).toBe("1");

    render(createElement(OnboardingPrompt));

    await waitFor(() => {
      expect(screen.queryByText("New here? Take the 2-minute onboarding tour.")).toBeNull();
    });
  });
});
