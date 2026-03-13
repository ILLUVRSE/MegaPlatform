import * as React from "react";
import { Button } from "../../src/button";
import { expectAccessible } from "./helpers.a11y";

describe("Button accessibility", () => {
  it("passes axe checks for primary buttons", async () => {
    await expectAccessible(<Button>Save changes</Button>);
  });

  it("passes axe checks for secondary buttons", async () => {
    await expectAccessible(
      <Button aria-describedby="button-help" variant="secondary">
        Cancel
      </Button>
    );
  });
});
