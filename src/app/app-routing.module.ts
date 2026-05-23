import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Phase 1: no real routing — AppComponent uses state-flag switching.
const routes: Routes = [];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
