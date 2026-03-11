import { getServerSession } from "next-auth";
import HomeWall from "./home/components/HomeWall";
import { authOptions } from "@/lib/auth";
import { getHomePlatformOverview } from "@/lib/platformHome";

export default async function HomePage() {
  const [session, overview] = await Promise.all([
    getServerSession(authOptions).catch(() => null),
    getHomePlatformOverview()
  ]);
  const isAdmin = session?.user?.role === "admin";

  return <HomeWall isAdmin={isAdmin} overview={overview} />;
}
