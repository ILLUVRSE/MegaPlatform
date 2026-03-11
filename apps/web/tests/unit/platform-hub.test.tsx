import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PlatformHub from "@/app/home/components/PlatformHub";

describe("platform hub", () => {
  it("renders module launch links", () => {
    const { container } = render(<PlatformHub />);

    expect(screen.getByTestId("platform-hub")).toBeTruthy();

    const links = ["/news", "/gamegrid", "/pixelbrawl", "/watch", "/party", "/studio"].map((href) =>
      container.querySelector(`a[href="${href}"]`)
    );

    links.forEach((link) => expect(link).toBeTruthy());
  });
});
