export class PaymentPaidDTO {
  roomId: string;
  orderDate: string;
  userOrderId: string;
  deliveryId: string;
  deliveryName: string;
  deliveryAddress: string;
  totalBill: number;
  usersPaid: PaymentPaidDetailDTO[];
}

export class PaymentPaidDetailDTO {
  userId: string;
  moneyPaid: number;
  isPaid: boolean;
}
