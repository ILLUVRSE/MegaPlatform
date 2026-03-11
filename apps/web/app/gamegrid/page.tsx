import EmbeddedPlatformApp from "@/src/domains/platform-core/components/EmbeddedPlatformApp";
import { getExternalPlatformAppConfig } from "@/lib/platformApps";

export default function GameGridPlatformPage() {
  return <EmbeddedPlatformApp app={getExternalPlatformAppConfig("gamegrid")} />;
}
