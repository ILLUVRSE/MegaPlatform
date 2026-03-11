/**
 * Party host control page with seat locking and playback controls.
 * Request/response: renders PartyRoom with host-enabled controls.
 * Guard: server APIs enforce host guard via authenticated session.
 */
import PartyRoom from "../../components/PartyRoom";
import HostPlaylistPanel from "../../components/HostPlaylistPanel";

export default function PartyHostPage({ params }: { params: { code: string } }) {
  return (
    <div className="space-y-6">
      <PartyRoom code={params.code} isHost={true} />
      <HostPlaylistPanel code={params.code} />
    </div>
  );
}
