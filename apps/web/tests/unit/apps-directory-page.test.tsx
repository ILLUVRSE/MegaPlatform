import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AppsDirectoryPage from "@/app/apps/page";

describe("apps directory page", () => {
  it("renders platform directory and launch actions", () => {
    const { container } = render(<AppsDirectoryPage />);

    expect(screen.getByTestId("apps-directory")).toBeTruthy();
    expect(screen.getByText("All ILLUVRSE Apps")).toBeTruthy();

    const openInPlatform = container.querySelectorAll('a[href^="/"]');
    expect(openInPlatform.length).toBeGreaterThan(5);
    expect(container.querySelector('a[href="/news"]')).toBeTruthy();
    expect(container.querySelector('a[href="/watch"]')).toBeTruthy();
  });
});
