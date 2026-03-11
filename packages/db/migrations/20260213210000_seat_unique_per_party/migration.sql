-- Enforce unique seat positions per party.
CREATE UNIQUE INDEX "Seat_partyId_seatIndex_key" ON "Seat"("partyId", "seatIndex");

