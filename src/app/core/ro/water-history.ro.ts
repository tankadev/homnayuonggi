import { WaterWinner } from '../dto/water-history.dto';

export class WaterHistoryRO {
  key: string;
  roomKey: string;
  deliveryId: string;
  spinnerId: string;
  winners: WaterWinner[];
  spinCount: number;
  createAt: string;
}
