import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MaterialModule } from '../material'
import { FlexLayoutModule } from '@angular/flex-layout';
import { ContactsRoutingModule } from './contacts-routing.module';
import { ContactsComponent, ContactAddeditDialog, ContactUpdateDialog, ContactHistoryDialog } from './contacts.component';
import { HeaderModule } from '../header/header.module';
import { FileUploadModule,} from 'ng2-file-upload';


@NgModule({
  imports: [
    CommonModule,
    FormsModule, 
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    ContactsRoutingModule,
    HeaderModule,
    FileUploadModule,
  ],
  declarations: [
    ContactsComponent,
    ContactAddeditDialog,
    ContactUpdateDialog,
    ContactHistoryDialog
  ],
  entryComponents: [
    ContactAddeditDialog,
    ContactUpdateDialog,
    ContactHistoryDialog
  ],
})
export class ContactsModule { }

