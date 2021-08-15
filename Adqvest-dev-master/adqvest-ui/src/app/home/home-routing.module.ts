import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home.component';
const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'home',
    component: HomeComponent
  },
  // { 
  //   path: 'company', 
  //   loadChildren: () => import('../company/company-module').then(m => m.CompanyModule)
  // },
  // { 
  //   path: 'org1', 
  //   loadChildren: () => import('../organization/org.module').then(m => m.OrgModule)
  // },
  // { 
  //   path: 'orgsettings', 
  //   loadChildren: () => import('../org-settings/org-settings.module').then(m => m.OrgSettingsModule)
  // },
  { 
    path: 'orgprofile', 
    loadChildren: () => import('../org-profile/org-profile.module').then(m => m.OrgProfileModule)
  },
  { 
    path: 'admin', 
    loadChildren: () => import('../admin/admin.module').then(m => m.AdminModule)
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomeRoutingModule { }

