import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { OrgProfileRoutingModule } from './org-profile-routing.module';
import { OrgProfileComponent} from './org-profile.component';
import { MaterialModule } from '../material';
import { FlexLayoutModule } from '@angular/flex-layout';
import { LoginHeaderModule } from '../login-header/login-header.module';
import { LoginHeaderComponent } from '../login-header/login-header.component';

@NgModule({
  imports: [
    CommonModule,
    OrgProfileRoutingModule,
    FormsModule, 
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    LoginHeaderModule
  ],
  declarations: [
    OrgProfileComponent,
  ],
  providers:[
    LoginHeaderComponent
  ]
})

export class OrgProfileModule { }