export class PaymentPaidDTO {
  roomId: string;
  orderDate: string;
  userOrderId: string;
  deliveryId: string;
  deliveryName: string;
  deliveryAddress: string;
  /** Snapshot of the shop photo at finalize time (so history still shows it after delivery is removed). */
  deliveryPhoto?: string;
  /** Snapshot of the room name at finalize time. */
  roomName?: string;
  totalBill: number;
  usersPaid: PaymentPaidDetailDTO[];
}

export class PaymentPaidDetailDTO {
  userId: string;
  moneyPaid: number;
  isPaid: boolean;
}
