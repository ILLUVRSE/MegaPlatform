import ChannelManager from "./pageClient";

export default async function AdminLiveChannelDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChannelManager channelId={id} />;
}
