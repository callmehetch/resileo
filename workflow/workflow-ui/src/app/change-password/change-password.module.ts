import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MaterialModule } from '../material'
import { FlexLayoutModule } from '@angular/flex-layout';
import { ChangePasswordRoutingModule } from './change-password-routing.module';
import { ChangePasswordComponent } from './change-password.component';
import { HeaderModule } from '../header/header.module';
import { FileUploadModule} from 'ng2-file-upload';


@NgModule({
  imports: [
    CommonModule,
    FormsModule, 
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    ChangePasswordRoutingModule,
    HeaderModule,
    FileUploadModule,
  ],
  declarations: [
	ChangePasswordComponent,
  ],
  entryComponents: [
//    SettingsAddEditDialog,
//    SettingsUpdateDialog,
//    SettingsHistoryDialog
  ],
})
export class ChangePasswordModule { }
