import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { OrgSettingsComponent } from './org-settings.component';
const routes: Routes = [
  {
    path: '',
    component: OrgSettingsComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrgSettingsRoutingModule { }

