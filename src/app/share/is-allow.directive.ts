import { Directive, Input, OnDestroy, TemplateRef, ViewContainerRef } from '@angular/core';

import { Subject } from 'rxjs';

import { LocalStorageService } from './../services/localstorage.service';

@Directive({
  selector: '[isAllow]'
})
export class IsAllowDirective implements OnDestroy {

  private destroy$ = new Subject<void>();

  private isVisible = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private storage: LocalStorageService
  ) { }

  @Input() set isAllow(userId: string) {
    console.log(userId);
    const isAllowed: boolean = this.storage.getUserInfo().key === userId;
    if (isAllowed && !this.isVisible) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.isVisible = true;
    } else if (!isAllowed && this.isVisible) {
      this.viewContainer.clear();
      this.isVisible = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
