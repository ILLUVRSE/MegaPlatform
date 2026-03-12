"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPlatformEvent } from "@/lib/platformTelemetry";

export default function PlatformPageLoadTelemetry() {
  const pathname = usePathname();

  useEffect(() => {
    void trackPlatformEvent({
      event: "platform.page_load",
      module: "ILLUVRSE",
      href: pathname || "/",
      surface: "platform_shell"
    });
  }, [pathname]);

  return null;
}
