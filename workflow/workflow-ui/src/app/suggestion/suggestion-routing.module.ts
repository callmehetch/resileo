import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SuggestionComponent } from './suggestion.component';
import { AuthGuard } from '../_guards/index';

const routes: Routes = [
  {
    path: '',
    component: SuggestionComponent
  },
  {
    path: 'facts', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../facts/facts.module').then(m => m.FactsModule)
  },
  {
    path: 'tasks', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../tasks/tasks.module').then(m => m.TasksModule)
  },
  {
    path: 'map', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../map/map.module').then(m => m.MapModule)
  },
  {
    path: 'contacts', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../contacts/contacts.module').then(m => m.ContactsModule)
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SuggestionRoutingModule { }

