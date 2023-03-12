export class PaymentPaidRO {
  key: string;
  deliveryId: string;
  roomId: string;
  orderDate: string;
  userOrderId: string;
  userOrderName: string;
  deliveryName: string;
  deliveryAddress: string;
  totalBill: number;
  usersPaid: PaymentPaidDetailRO[];
}

export class PaymentPaidDetailRO {
  userId: string;
  userName: string;
  moneyPaid: number;
  isPaid: boolean;
}
