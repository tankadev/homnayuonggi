/** A confirmed "who fetches the drinks" result, kept per room (max 20 records). */
export class WaterHistoryDTO {
  roomKey: string;
  deliveryId: string;
  spinnerId: string; // → /users key (the orderer who confirmed)
  winners: WaterWinner[]; // people chosen to fetch drinks
  spinCount: number; // how many spins it took before confirming — anti-cheat signal
  createAt: string; // ISO
}

export interface WaterWinner {
  userId: string;
  name: string;
}
