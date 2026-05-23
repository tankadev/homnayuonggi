export class PaymentPaidRO {
  key: string;
  deliveryId: string;
  roomId: string;
  orderDate: string;
  userOrderId: string;
  deliveryName: string;
  deliveryAddress: string;
  /** Snapshot of the shop photo at finalize time. */
  deliveryPhoto?: string;
  /** Snapshot of the room name at finalize time. */
  roomName?: string;
  totalBill: number;
  usersPaid: PaymentPaidDetailRO[];
}

export class PaymentPaidDetailRO {
  userId: string;
  moneyPaid: number;
  isPaid: boolean;
}
