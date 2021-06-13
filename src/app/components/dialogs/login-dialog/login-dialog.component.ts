import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { LocalStorage } from 'src/app/const/local-storage';
import { UserRO } from 'src/app/ro/user.ro';

import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-login-dialog',
  templateUrl: './login-dialog.component.html',
  styleUrls: ['./login-dialog.component.scss']
})
export class LoginDialogComponent implements OnInit {

  loginForm: FormGroup;

  constructor(
    private modal: NzModalRef,
    private userService: UserService,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: [null, [Validators.required]],
      displayName: [null, [Validators.required]]
    });
  }

  public submitLoginForm(): void {
    if (this.loginForm.valid) {
      const { username, displayName } = this.loginForm.value;
      const usersList: UserRO[] = JSON.parse(localStorage.getItem(LocalStorage.USER_LIST));
      if (usersList) {
        const findUser = usersList.find(user => user.username === username);
        if (findUser) {
          this.modal.destroy({ username });
        } else {
          this.userService.create({ username, displayName });
          this.modal.destroy({ username });
        }
      } else {
        this.userService.create({ username, displayName });
        this.modal.destroy({ username });
      }
    } else {
      for (const i in this.loginForm.controls) {
        this.loginForm.controls[i].markAsDirty();
        this.loginForm.controls[i].updateValueAndValidity();
      }
    }
  }

}
