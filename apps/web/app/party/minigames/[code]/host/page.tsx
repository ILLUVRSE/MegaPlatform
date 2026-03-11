/**
 * Minigame party host view.
 */
import MinigamePartyRoom from "../../components/MinigamePartyRoom";

export default function PartyMinigameHostPage({ params }: { params: { code: string } }) {
  return <MinigamePartyRoom code={params.code} isHost />;
}
