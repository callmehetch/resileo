import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FactsComponent } from './facts.component';
import { AuthGuard } from '../_guards/index';

const routes: Routes = [
  {
    path: '',
    component: FactsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FactsRoutingModule { }

