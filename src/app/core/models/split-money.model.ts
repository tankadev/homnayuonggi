export class SplitMoneyDeliveryModel {
  type: number; // 0: chia deu, 1: chia theo %, 2: tai tro 100%
  sponsorUserId: string;
}

export class SplitMoneyModel {
  type: number;
  content: string;
  disable: boolean;
}
