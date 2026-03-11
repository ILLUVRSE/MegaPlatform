import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import AppHeader from "@/components/AppHeader";

vi.mock("next/navigation", () => ({
  usePathname: () => "/apps"
}));

describe("app header", () => {
  it("highlights the active route", () => {
    const { container } = render(<AppHeader isAdmin={false} />);

    const activeLink = container.querySelector('nav a[href="/apps"]');
    const inactiveLink = container.querySelector('nav a[href="/news"]');

    expect(activeLink).toBeTruthy();
    expect(activeLink?.className.includes("bg-illuvrse-primary")).toBe(true);
    expect(inactiveLink?.className.includes("bg-illuvrse-primary")).toBe(false);
  });
});
