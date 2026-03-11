import EmbeddedPlatformApp from "@/src/domains/platform-core/components/EmbeddedPlatformApp";
import { getExternalPlatformAppConfig } from "@/lib/platformApps";

export default function PixelBrawlPlatformPage() {
  return <EmbeddedPlatformApp app={getExternalPlatformAppConfig("pixelbrawl")} />;
}
