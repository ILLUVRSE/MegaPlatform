import EmbeddedPlatformApp from "@/src/domains/platform-core/components/EmbeddedPlatformApp";
import { getExternalPlatformAppConfig } from "@/lib/platformApps";

export default function NewsPlatformPage() {
  return <EmbeddedPlatformApp app={getExternalPlatformAppConfig("news")} />;
}
