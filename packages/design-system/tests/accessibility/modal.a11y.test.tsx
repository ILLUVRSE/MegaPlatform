import * as React from "react";
import { Modal } from "../../src/modal";
import { expectAccessible } from "./helpers.a11y";

describe("Modal accessibility", () => {
  it("passes axe checks for dialog semantics", async () => {
    await expectAccessible(
      <Modal
        description="System settings affect every user in the workspace."
        isOpen
        onClose={() => undefined}
        title="Review settings"
      >
        <p>Confirm the updated defaults before publishing.</p>
      </Modal>
    );
  });
});
