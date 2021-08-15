import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MaterialModule } from '../material'
import { FlexLayoutModule } from '@angular/flex-layout';
import { TasksRoutingModule } from './tasks-routing.module';
import { TasksComponent, TaskAddeditDialog, TaskUpdateDialog, TaskHistoryDialog } from './tasks.component';
import { HeaderModule } from '../header/header.module';
import { FileUploadModule} from 'ng2-file-upload';


@NgModule({
  imports: [
    CommonModule,
    FormsModule, 
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    TasksRoutingModule,
    HeaderModule,
    FileUploadModule,
  ],
  declarations: [
    TasksComponent,
    TaskAddeditDialog,
    TaskUpdateDialog,
    TaskHistoryDialog
  ],
  entryComponents: [
    TaskAddeditDialog,
    TaskUpdateDialog,
    TaskHistoryDialog
  ],
})
export class TasksModule { }

