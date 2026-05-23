import { UserPaymentModel } from "../models/user-payment.model";

export class UserRO {
    key: string;
    username: string;
    displayName: string;
    phone?: string;
    payment?: UserPaymentModel[];
    fcmToken?: string;
}
