import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { OrgSettingsRoutingModule } from './org-settings-routing.module';
import { OrgSettingsComponent} from './org-settings.component';
import { MaterialModule } from '../material';
import { FlexLayoutModule } from '@angular/flex-layout';
import { LoginHeaderModule } from '../login-header/login-header.module';

@NgModule({
  imports: [
    CommonModule,
    OrgSettingsRoutingModule,
    FormsModule, 
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    LoginHeaderModule
  ],
  declarations: [
    OrgSettingsComponent,
  ],
})

export class OrgSettingsModule { }