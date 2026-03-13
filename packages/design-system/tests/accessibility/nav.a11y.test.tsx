import * as React from "react";
import { Nav } from "../../src/nav";
import { expectAccessible } from "./helpers.a11y";

describe("Nav accessibility", () => {
  it("passes axe checks for landmark and current-page state", async () => {
    await expectAccessible(
      <Nav
        items={[
          { current: true, href: "/overview", label: "Overview" },
          { href: "/projects", label: "Projects" },
          { href: "/settings", label: "Settings" }
        ]}
        label="Workspace"
      />
    );
  });
});
