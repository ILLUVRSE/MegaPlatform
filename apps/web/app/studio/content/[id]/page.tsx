import { redirect } from "next/navigation";

export default async function StudioContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/studio/content?contentId=${id}`);
}
