export class PaymentPaidRO {
  key: string;
  deliveryId: string;
  roomId: string;
  orderDate: string;
  userOrderId: string;
  deliveryName: string;
  deliveryAddress: string;
  totalBill: number;
  usersPaid: PaymentPaidDetailRO[];
}

export class PaymentPaidDetailRO {
  userId: string;
  moneyPaid: number;
  isPaid: boolean;
}
