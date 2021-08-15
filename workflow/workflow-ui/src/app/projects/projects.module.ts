import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MaterialModule } from '../material'
import { FlexLayoutModule } from '@angular/flex-layout';
import { ProjectsRoutingModule } from './projects-routing.module';
import { ProjectsComponent, ProjectAddEditDialog /*, ProjectUpdateDialog, ProjectHistoryDialog */} from './projects.component';
import { HeaderModule } from '../header/header.module';
import { FileUploadModule} from 'ng2-file-upload';


@NgModule({
  imports: [
    CommonModule,
    FormsModule, 
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    ProjectsRoutingModule,
    HeaderModule,
    FileUploadModule,
  ],
  declarations: [
    ProjectsComponent,
    ProjectAddEditDialog,
//    ProjectUpdateDialog,
//    ProjectHistoryDialog
  ],
  entryComponents: [
    ProjectAddEditDialog,
//    ProjectUpdateDialog,
//    ProjectHistoryDialog
  ],
})
export class ProjectsModule { }

