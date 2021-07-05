import { UserPaymentModel } from "../models/user-payment.model";

export class UserDTO {
    username: string;
    displayName: string;
    phone?: string;
    payment?: UserPaymentModel[];
    fcmToken?: string;
}
