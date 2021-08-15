import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AdminComponent } from './admin.component';
const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
  },
  { 
    path: 'qrybuilder', 
    loadChildren: () => import('../query-builder/query-builder.module').then(m => m.QueryBuilderModule)
  },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }

