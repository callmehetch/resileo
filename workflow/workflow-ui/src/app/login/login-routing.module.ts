import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthGuard } from '../_guards/index';
const routes: Routes = [
  {
    path: '',
    component: LoginComponent
  },
  { path: 'home', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../suggestion/suggestion.module').then(m => m.SuggestionModule)
  },
  { path: 'user', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../user/user.module').then(m => m.UserModule)
  },
  {
    path: 'projects', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../projects/projects.module').then(m => m.ProjectsModule)
  },
  { path: 'list', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../list/list.module').then(m => m.ListModule)
  },
  { path: 'reports', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../reports/reports.module').then(m => m.ReportsModule)
  },
  { path: 'facts', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../facts/facts.module').then(m => m.FactsModule)
  },
  { path: 'tasks', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../tasks/tasks.module').then(m => m.TasksModule)
  },
  { path: 'map', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../map/map.module').then(m => m.MapModule)
  },
  { path: 'contacts', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../contacts/contacts.module').then(m => m.ContactsModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LoginRoutingModule { }

