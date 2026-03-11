import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import OpsTaskBoard from "@/app/studio/ops/components/OpsTaskBoard";

const tasks = [
  {
    id: "task-1",
    title: "Fix flaky test suite",
    agent: "Quality/Analytics",
    priority: 1,
    status: "pending",
    created_at: "2026-02-28T10:00:00.000Z",
    updated_at: "2026-02-28T10:00:00.000Z",
    context: "Shipcheck quick has failures",
    acceptance_criteria: ["Run shipcheck quick", "Document failing stages"],
    steps_log: ["Task created by Director"],
    artifacts: [],
    risk_level: "medium",
    rollback_notes: "Revert unstable test harness tweaks"
  },
  {
    id: "task-2",
    title: "Unblock stale queue items",
    agent: "Ops/SRE",
    priority: 2,
    status: "blocked",
    created_at: "2026-02-28T09:00:00.000Z",
    updated_at: "2026-02-28T09:30:00.000Z",
    context: "Blocked tasks older than threshold",
    acceptance_criteria: ["Review blocked tasks"],
    steps_log: ["Waiting on infra owner"],
    artifacts: ["docs/ops_brain/runbooks/stuck-tasks.md"],
    risk_level: "low",
    rollback_notes: "No rollback required"
  }
];

describe("studio ops task board", () => {
  it("renders seeded task list and details", async () => {
    render(<OpsTaskBoard tasks={tasks} />);

    expect(screen.getByText("Task Queue")).toBeTruthy();
    expect(screen.getByTestId("task-row-task-1")).toBeTruthy();
    expect(screen.getByTestId("task-row-task-2")).toBeTruthy();

    fireEvent.click(screen.getByTestId("task-row-task-2"));
    const detailText = screen.getByTestId("task-details").textContent ?? "";
    expect(detailText.includes("Unblock stale queue items")).toBe(true);
    expect(detailText.includes("docs/ops_brain/runbooks/stuck-tasks.md")).toBe(true);
  });
});
