import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { OrgProfileComponent } from './org-profile.component';
const routes: Routes = [
  {
    path: '',
    component: OrgProfileComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrgProfileRoutingModule { }

