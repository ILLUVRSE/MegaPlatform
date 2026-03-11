/**
 * Interactive seat grid for party seating selection.
 * Request/response: emits seat reserve/release events via callbacks.
 * Guard: client component; relies on browser events.
 */
"use client";

import clsx from "clsx";
import { chunkSeats } from "../lib/seatMap";

export type SeatSnapshot = {
  state: "available" | "reserved" | "locked" | "occupied";
  userId?: string | null;
};

type SeatGridProps = {
  seatCount: number;
  currentUserId: string;
  seatStates: Record<string, SeatSnapshot>;
  onReserve: (seatIndex: number) => void;
  onRelease: (seatIndex: number) => void;
};

const STATUS_LABELS: Record<SeatSnapshot["state"], string> = {
  available: "Available",
  reserved: "Reserved",
  locked: "Locked",
  occupied: "Occupied"
};

export default function SeatGrid({
  seatCount,
  currentUserId,
  seatStates,
  onReserve,
  onRelease
}: SeatGridProps) {
  const rows = chunkSeats(seatCount, 4);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-illuvrse-muted">
        {Object.entries(STATUS_LABELS).map(([state, label]) => (
          <span key={state} className="flex items-center gap-2">
            <span
              className={clsx("inline-block h-3 w-3 rounded-full border", {
                "border-illuvrse-border bg-white": state === "available",
                "border-illuvrse-accent bg-illuvrse-accent bg-opacity-40": state === "reserved",
                "border-illuvrse-danger bg-illuvrse-danger bg-opacity-40": state === "locked",
                "border-illuvrse-primary bg-illuvrse-primary bg-opacity-40": state === "occupied"
              })}
            />
            {label}
          </span>
        ))}
      </div>
      <div className="space-y-3">
        {rows.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex flex-wrap gap-3">
            {row.map((seat) => {
              const snapshot = seatStates[String(seat.index)] ?? { state: "available" };
              const isMine = snapshot.userId === currentUserId && snapshot.state === "reserved";
              const effectiveState = isMine ? "occupied" : snapshot.state;
              const disabled = snapshot.state === "locked" || (!isMine && snapshot.state === "reserved");

              return (
                <button
                  key={seat.index}
                  className={clsx("party-seat", {
                    "party-seat-available": effectiveState === "available",
                    "party-seat-reserved": effectiveState === "reserved",
                    "party-seat-locked": effectiveState === "locked",
                    "party-seat-occupied": effectiveState === "occupied"
                  })}
                  type="button"
                  data-testid={`seat-${seat.index}`}
                  data-seat-index={seat.index}
                  data-seat-state={effectiveState}
                  disabled={disabled && !isMine}
                  onClick={() => {
                    if (snapshot.state === "available") {
                      onReserve(seat.index);
                    } else if (isMine) {
                      onRelease(seat.index);
                    }
                  }}
                >
                  {seat.index}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
