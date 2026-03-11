import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppHeader from "@/components/AppHeader";
import FeedCard from "@/app/home/components/FeedCard";

vi.mock("next/navigation", () => ({
  usePathname: () => "/"
}));

describe("accessibility baseline", () => {
  it("renders labeled global nav landmark", () => {
    const { container } = render(<AppHeader isAdmin={false} />);
    expect(container.querySelector('nav[aria-label="Global navigation"]')).toBeTruthy();
    expect(container.querySelector('nav[aria-label="Global navigation mobile"]')).toBeTruthy();
  });

  it("exposes feed action menu semantics", async () => {
    render(
      <FeedCard
        post={{
          id: "post-1",
          type: "TEXT",
          authorProfile: "Creator",
          createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
          caption: "caption",
          likeCount: 0,
          commentCount: 0,
          shareCount: 0,
          viewerLiked: false,
          isPinned: false,
          isHidden: false,
          isShadowbanned: false,
          isFeatured: false,
          linkUrl: null,
          shortPost: null,
          shareOf: null
        } as never}
        onComment={() => {}}
        onShare={() => {}}
        onReport={() => {}}
      />
    );

    const trigger = screen.getByRole("button", { name: "Open feed post actions" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
  });
});
