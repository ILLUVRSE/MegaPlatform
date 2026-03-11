/**
 * Party join page for participants.
 * Request/response: renders PartyRoom and listens for SSE updates.
 * Guard: none; public join view.
 */
import PartyRoom from "../components/PartyRoom";

export default function PartyJoinPage({ params }: { params: { code: string } }) {
  return <PartyRoom code={params.code} isHost={false} />;
}
