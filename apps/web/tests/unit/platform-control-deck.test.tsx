import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PlatformControlDeck from "@/app/home/components/PlatformControlDeck";

describe("platform control deck", () => {
  it("renders orchestrated home sections", () => {
    render(
      <PlatformControlDeck
        overview={{
          sessionGraph: {
            currentModule: "home",
            activeTask: "resume",
            trail: [{ module: "watch", href: "/watch", at: "2026-03-11T00:00:00.000Z", action: "continue" }]
          },
          inbox: [{ id: "notif-1", title: "Resume session", body: "Go back in.", href: "/", status: "UNREAD", actionLabel: "Resume" }],
          squad: { name: "Brian's Squad", memberCount: 3, inviteCount: 1 },
          economy: { balance: 1600, entitlements: [{ key: "watch:premium-preview", status: "ACTIVE" }] },
          recommendations: {
            continueWatching: [{ id: "show-1", title: "Watch Heroes", href: "/show/watch-heroes" }],
            forYourSquad: [{ id: "party-now", title: "Start a Party room", href: "/party" }],
            creatorNext: [{ id: "template-1", title: "Hero Short", href: "/studio?template=template-1" }]
          }
        }}
      />
    );

    expect(screen.getByTestId("platform-control-deck")).toBeTruthy();
    expect(screen.getByText("Cross-app session graph")).toBeTruthy();
    expect(screen.getByText("Tasks and notifications")).toBeTruthy();
    expect(screen.getByText("Wallet and entitlements")).toBeTruthy();
  });
});
