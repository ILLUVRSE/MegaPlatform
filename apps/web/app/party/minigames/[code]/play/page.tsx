/**
 * Minigame party player view.
 */
import MinigamePartyRoom from "../../components/MinigamePartyRoom";

export default function PartyMinigamePlayPage({ params }: { params: { code: string } }) {
  return <MinigamePartyRoom code={params.code} isHost={false} />;
}
