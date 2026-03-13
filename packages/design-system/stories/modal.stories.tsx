import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { Button } from "../src/button";
import { Modal } from "../src/modal";
import { ThemeProvider, ThemeToggleButton } from "../src/tokens";

function ModalStory() {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <ThemeProvider>
      <div style={{ display: "grid", gap: "1rem", minHeight: "20rem", padding: "1.5rem" }}>
        <div className="ds-theme-row">
          <ThemeToggleButton />
          <Button variant="secondary" onClick={() => setIsOpen(true)}>
            Reopen dialog
          </Button>
        </div>
        <Modal
          description="Confirm that your accessibility review is complete before publish."
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Publish design tokens"
        >
          <p>Dark and light themes will ship together.</p>
        </Modal>
      </div>
    </ThemeProvider>
  );
}

const meta = {
  title: "Components/Modal",
  component: ModalStory
} satisfies Meta<typeof ModalStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
