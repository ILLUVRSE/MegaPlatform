import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/rbac";
import { getMediaCorpDashboardData } from "@/lib/media-corp/service";
import MediaCorpDashboard from "./MediaCorpDashboard";

export default async function AdminMediaCorpPage() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    redirect("/auth/signin");
  }

  const data = await getMediaCorpDashboardData();

  return <MediaCorpDashboard initialWorldState={data.worldState} initialMemory={data.memory} />;
}
