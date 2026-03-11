import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import SurfaceCard from "@/components/ui/SurfaceCard";
import SectionHeader from "@/components/ui/SectionHeader";

describe("surface grammar", () => {
  it("renders shared surface card tones", () => {
    const { container } = render(<SurfaceCard tone="muted">Item</SurfaceCard>);
    expect(container.firstChild).toBeTruthy();
    expect(container.firstChild?.textContent).toBe("Item");
  });

  it("renders shared section header structure", () => {
    const { container } = render(<SectionHeader eyebrow="Feed" title="For You" description="Top picks" />);
    const heading = container.querySelector("h2");
    expect(heading?.textContent).toBe("For You");
  });
});
