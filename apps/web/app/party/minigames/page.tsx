/**
 * Party minigames landing page.
 * Request/response: entry point for host/join flows.
 * Guard: none; public view.
 */
import CreateMinigamePartyForm from "./components/CreateMinigamePartyForm";
import JoinMinigamePartyForm from "./components/JoinMinigamePartyForm";

export default function PartyMinigamesPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="party-card space-y-4">
        <h2 className="text-3xl font-semibold">Party Minigames</h2>
        <p className="text-illuvrse-muted">
          Host a Mario Party-style Party Night. Everyone gets the same 30-second challenge,
          ready up between rounds, and watch the scoreboard climb to the final podium.
        </p>
        <CreateMinigamePartyForm />
      </section>
      <section className="party-card space-y-4">
        <h3 className="text-lg font-semibold">Join a room</h3>
        <JoinMinigamePartyForm />
      </section>
    </div>
  );
}
