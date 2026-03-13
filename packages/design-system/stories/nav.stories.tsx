import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { Nav } from "../src/nav";
import { ThemeProvider, ThemeToggleButton } from "../src/tokens";

const meta = {
  title: "Components/Nav",
  component: Nav,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ display: "grid", gap: "1rem", padding: "1.5rem" }}>
          <ThemeToggleButton />
          <Story />
        </div>
      </ThemeProvider>
    )
  ]
} satisfies Meta<typeof Nav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WorkspaceNav: Story = {
  args: {
    items: [
      { current: true, href: "/overview", label: "Overview" },
      { href: "/activity", label: "Activity" },
      { href: "/settings", label: "Settings" }
    ],
    label: "Workspace sections"
  }
};
