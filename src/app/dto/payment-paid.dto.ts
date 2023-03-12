export class PaymentPaidDTO {
  roomId: string;
  deliveryId: string;
  orderDate: string;
  userOrderId: string;
  userOrderName: string;
  deliveryName: string;
  deliveryAddress: string;
  totalBill: number;
  usersPaid: PaymentPaidDetailDTO[];
}

export class PaymentPaidDetailDTO {
  userId: string;
  userName: string;
  moneyPaid: number;
  isPaid: boolean;
}
