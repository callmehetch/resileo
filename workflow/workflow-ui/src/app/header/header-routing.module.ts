import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HeaderComponent } from './header.component';
import { AuthGuard } from '../_guards/index';

const routes: Routes = [
  {
    path: '',
    component: HeaderComponent,
  },
  {
    path: 'home', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../suggestion/suggestion.module').then(m => m.SuggestionModule)
  },
  {
    path: 'projects', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../projects/projects.module').then(m => m.ProjectsModule)
  },
  {
    path: 'user', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../user/user.module').then(m => m.UserModule)
  },
  {
    path: 'teams', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../teams/teams.module').then(m => m.TeamsModule)
  },
  {
    path: 'list', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../list/list.module').then(m => m.ListModule)
  },
  {
    path: 'reports', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../reports/reports.module').then(m => m.ReportsModule)
  },
  {
    path: 'change-password', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../change-password/change-password.module').then(m => m.ChangePasswordModule)
  },/*
  {
    path: 'settings', 
    canActivate:[AuthGuard], 
    loadChildren: () => import('../settings/settings.module').then(m => m.ChangePasswordModule)
  },*/
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})

export class HeaderRoutingModule { }

