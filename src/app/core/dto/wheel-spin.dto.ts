/** One spin of the lucky wheel — appended per spin (incl. re-spins) as an anti-cheat log. */
export class WheelSpinDTO {
  roomKey: string;
  deliveryId: string;
  spinnerId: string; // → /users key (must be the orderer)
  winnerId: string; // → /users key picked by this spin
  winnerName: string; // denormalised for display
  candidateCount: number; // how many people were on the wheel for this spin
  createAt: string; // ISO
}
