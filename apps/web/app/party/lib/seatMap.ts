/**
 * Seat map utilities for party seating grids.
 * Request/response: pure helpers returning seat layout arrays.
 * Guard: none; safe for client and server usage.
 */
export type SeatCell = {
  index: number;
  row: number;
  col: number;
};

export function buildSeatGrid(seatCount: number, columns = 4): SeatCell[] {
  const safeCount = Math.max(1, seatCount);
  const safeColumns = Math.max(1, columns);
  return Array.from({ length: safeCount }, (_, idx) => {
    const index = idx + 1;
    const row = Math.floor(idx / safeColumns);
    const col = idx % safeColumns;
    return { index, row, col };
  });
}

export function chunkSeats(seatCount: number, columns = 4) {
  const grid = buildSeatGrid(seatCount, columns);
  const rows: SeatCell[][] = [];
  grid.forEach((seat) => {
    rows[seat.row] = rows[seat.row] ?? [];
    rows[seat.row].push(seat);
  });
  return rows;
}
