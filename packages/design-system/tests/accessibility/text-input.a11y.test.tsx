import * as React from "react";
import { TextInput } from "../../src/text-input";
import { expectAccessible } from "./helpers.a11y";

describe("TextInput accessibility", () => {
  it("passes axe checks with hint and validation state", async () => {
    await expectAccessible(
      <TextInput
        error="Email is required."
        hint="Use the email tied to your workspace account."
        label="Email address"
        name="email"
      />
    );
  });
});
