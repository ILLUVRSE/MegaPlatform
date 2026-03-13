import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { Button } from "../src/button";
import { ThemeProvider, ThemeToggleButton } from "../src/tokens";

const meta = {
  title: "Components/Button",
  component: Button,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ display: "grid", gap: "1rem", padding: "1.5rem" }}>
          <div className="ds-theme-row">
            <span>Runtime theme switch</span>
            <ThemeToggleButton />
          </div>
          <Story />
        </div>
      </ThemeProvider>
    )
  ]
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: "Continue"
  }
};

export const Secondary: Story = {
  args: {
    children: "Cancel",
    variant: "secondary"
  }
};
