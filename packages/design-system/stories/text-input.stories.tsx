import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { TextInput } from "../src/text-input";
import { ThemeProvider, ThemeToggleButton } from "../src/tokens";

const meta = {
  title: "Components/TextInput",
  component: TextInput,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ display: "grid", gap: "1rem", maxWidth: "28rem", padding: "1.5rem" }}>
          <ThemeToggleButton />
          <Story />
        </div>
      </ThemeProvider>
    )
  ]
} satisfies Meta<typeof TextInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    hint: "Use a team inbox for shared alerts.",
    label: "Notification email"
  }
};
