import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { OrgComponent } from './org.component';
const routes: Routes = [
  {
    path: '',
    component: OrgComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrgRoutingModule { }

