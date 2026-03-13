import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import HeroCarousel from "@/app/watch/components/HeroCarousel";
import PosterCard from "@/app/watch/components/PosterCard";
import JoinPartyForm from "@/app/party/components/JoinPartyForm";
import StudioCreatorFlow from "@/app/studio/components/StudioCreatorFlow";
import MinigameGenerator from "@/app/games/components/MinigameGenerator";
import PartyMode from "@/app/games/components/PartyMode";
import { renderAndExpectAccessible } from "./helpers.a11y";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement("a", { href, ...props }, children)
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  }),
  usePathname: () => "/studio",
  useSearchParams: () => new URLSearchParams()
}));

vi.mock("@/lib/studioApi", () => ({
  StudioApiError: class extends Error {},
  createJob: vi.fn(),
  createProject: vi.fn(),
  getProject: vi.fn(),
  publishProject: vi.fn()
}));

vi.mock("@/lib/jobPolling", () => ({
  pollJob: vi.fn()
}));

describe("top flow accessibility", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps watch hero and cards accessible", async () => {
    await renderAndExpectAccessible(
      React.createElement("div", undefined,
        React.createElement(HeroCarousel, {
          items: [
            {
              id: "show-1",
              title: "Nebula Nights",
              slug: "nebula-nights",
              description: "Late-night sci-fi anthology",
              featuredEpisodeId: "episode-1"
            }
          ]
        }),
        React.createElement(PosterCard, {
          title: "Nebula Nights",
          subtitle: "Episode 1",
          href: "/watch/show/nebula-nights",
          showId: "show-1",
          canSave: true,
          initialSaved: false
        })
      )
    );

    const card = screen.getByTestId("poster-card");
    expect(card.querySelector("button")).toBeNull();
    expect(screen.getByRole("button", { name: "Save show to My List" })).toBeTruthy();
  });

  it("keeps party entry controls labeled", async () => {
    await renderAndExpectAccessible(React.createElement(JoinPartyForm));
    expect(screen.getByLabelText("Party code")).toBeTruthy();
    expect(screen.getByRole("form", { name: "Join a party by code" })).toBeTruthy();
  });

  it("keeps studio creator flow labeled and keyboard friendly", async () => {
    await renderAndExpectAccessible(React.createElement(StudioCreatorFlow));
    expect(screen.getByLabelText("Your short idea")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publish" })).toBeTruthy();
  });

  it("keeps play generator accessible before first seed", async () => {
    await renderAndExpectAccessible(React.createElement(MinigameGenerator));
    expect(screen.getByRole("button", { name: /generate random minigame/i })).toBeTruthy();
  });

  it("keeps party mode lobby labels accessible", async () => {
    await renderAndExpectAccessible(React.createElement(PartyMode));
    expect(screen.getByLabelText("Player 1 name")).toBeTruthy();
    expect(screen.getByLabelText("New player name")).toBeTruthy();
    expect(screen.getByLabelText("Seed")).toBeTruthy();
  });
});
