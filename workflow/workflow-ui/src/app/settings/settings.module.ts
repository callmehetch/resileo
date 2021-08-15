import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MaterialModule } from '../material'
import { FlexLayoutModule } from '@angular/flex-layout';
import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings.component';
import { HeaderModule } from '../header/header.module';
import { FileUploadModule} from 'ng2-file-upload';


@NgModule({
  imports: [
    CommonModule,
    FormsModule, 
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    SettingsRoutingModule,
    HeaderModule,
    FileUploadModule,
  ],
  declarations: [
    SettingsComponent,
  ],
  entryComponents: [
//    SettingsAddEditDialog,
//    SettingsUpdateDialog,
//    SettingsHistoryDialog
  ],
})
export class SettingsModule { }
