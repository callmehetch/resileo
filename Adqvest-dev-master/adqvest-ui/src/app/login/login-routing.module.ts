import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './login.component';
const routes: Routes = [
  {
    path: '',
    component: LoginComponent,
  },
  {
    path: 'login',
    component: LoginComponent
  },
  { 
    path: 'register', 
    loadChildren: () => import('../register/register.module').then(m => m.RegisterModule)
  },
  { 
    path: 'home', 
    loadChildren: () => import('../home/home.module').then(m => m.HomeModule)
  },
  { 
    path: 'forgotpassword', 
    loadChildren: () => import('../forgot-password/forgot-password.module').then(m => m.ForgotPasswordModule)
  },
  { 
    path: 'changepassword', 
    loadChildren: () => import('../change-password/change-password.module').then(m => m.ChangePasswordModule)
  },
  { 
    path: 'updateprofile', 
    loadChildren: () => import('../update-profile/update-profile.module').then(m => m.UpdateProfileModule)
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LoginRoutingModule { }

