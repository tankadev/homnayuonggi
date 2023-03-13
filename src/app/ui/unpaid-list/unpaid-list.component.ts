import { Component, Input, OnInit } from '@angular/core';
import { NzTabPosition } from 'ng-zorro-antd/tabs';
import { map } from 'rxjs/operators';
import { PaymentPaidRO } from 'src/app/ro/payment-paid.ro';
import { UserRO } from 'src/app/ro/user.ro';
import { PaymentPaidService } from 'src/app/services/payment-paid.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'unpaid-list',
  templateUrl: './unpaid-list.component.html',
  styleUrls: ['./unpaid-list.component.scss']
})
export class UnpaidListComponent implements OnInit {

  @Input() unpaidList: PaymentPaidRO[];

  nzTabPosition: NzTabPosition = 'top';
  selectedIndex = 0;
  userList: UserRO[] = [];

  constructor(
    private userService: UserService,
    private paymentPaidService: PaymentPaidService,
  ) { }

  ngOnInit(): void {
    this.onListenUsersChangesFromFirebaseDB();
  }

  public onTabChange(args: any): void {
    console.log(args);
  }

  log(args: any[]): void {
    console.log(args);
  }

  public trackByIndex = (index: number): number => {
    return index;
  }

  public onPaid(value: boolean, userId: string, paymentsPaidInfo: PaymentPaidRO): void {
    const paymentsPaid = paymentsPaidInfo;
    const findUserPaidIndex = paymentsPaid.usersPaid.findIndex(i => i.userId == userId);
    if (findUserPaidIndex != -1) {
      const paidUser = paymentsPaid.usersPaid;
      paidUser[findUserPaidIndex].isPaid = value;
      this.paymentPaidService.update(paymentsPaid.key, paymentsPaid);
    }

    const findIndex = paymentsPaid.usersPaid.findIndex(i => i.isPaid == false);
    if (findIndex == -1) {
      this.paymentPaidService.remove(paymentsPaid.key);
    }
  }

  private onListenUsersChangesFromFirebaseDB(): void {
    this.userService.getAll().snapshotChanges().pipe(
      map(changes =>
        changes.map(c =>
          ({ key: c.payload.key, ...c.payload.val() })
        )
      )
    ).subscribe(data => {
      if (data.length > 0) {
        this.userList = data;
      }
    });
  }

}
