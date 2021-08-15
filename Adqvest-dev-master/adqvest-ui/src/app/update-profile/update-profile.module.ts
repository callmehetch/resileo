import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { UpdateProfileRoutingModule } from './update-profile-routing.module';
import { UpdateProfileComponent } from './update-profile.component';
import { MaterialModule } from '../material';
import { FlexLayoutModule } from '@angular/flex-layout';
import { LoginHeaderModule } from '../login-header/login-header.module';

@NgModule({
  imports: [
    CommonModule,
    UpdateProfileRoutingModule,
    FormsModule, 
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    LoginHeaderModule
  ],
  declarations: [
    UpdateProfileComponent,
  ],
})

export class UpdateProfileModule { }