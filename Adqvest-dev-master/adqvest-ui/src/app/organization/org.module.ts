import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { OrgRoutingModule } from './org-routing.module';
import { OrgComponent,AddOrgDialog } from './org.component';
import { MaterialModule } from '../material';
import { FlexLayoutModule } from '@angular/flex-layout';
import { LoginHeaderModule } from '../login-header/login-header.module';

@NgModule({
  imports: [
    CommonModule,
    OrgRoutingModule,
    FormsModule, 
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    LoginHeaderModule
  ],
  declarations: [
    OrgComponent,
    AddOrgDialog
  ],
})

export class OrgModule { }