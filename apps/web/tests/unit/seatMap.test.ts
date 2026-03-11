/**
 * Unit tests for seat map utilities.
 * Request/response: validates seat layout generation helpers.
 * Guard: none; pure functions.
 */
import { describe, expect, it } from "vitest";
import { buildSeatGrid, chunkSeats } from "@/app/party/lib/seatMap";

describe("seatMap", () => {
  it("builds a sequential seat grid", () => {
    const grid = buildSeatGrid(6, 3);
    expect(grid).toHaveLength(6);
    expect(grid[0]).toEqual({ index: 1, row: 0, col: 0 });
    expect(grid[3]).toEqual({ index: 4, row: 1, col: 0 });
  });

  it("chunks seats into rows", () => {
    const rows = chunkSeats(8, 4);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveLength(4);
    expect(rows[1][3].index).toBe(8);
  });
});
