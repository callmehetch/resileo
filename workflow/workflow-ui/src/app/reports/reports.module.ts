import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MaterialModule } from '../material'
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReportsRoutingModule } from './reports-routing.module';
import { ReportsComponent, ReportsInputsDialog } from './reports.component';
import { HeaderModule } from '../header/header.module';
import { FileUploadModule} from 'ng2-file-upload';
import { MatTableExporterModule } from 'mat-table-exporter';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    ReportsRoutingModule,
    HeaderModule,
    FileUploadModule,
    MatTableExporterModule,
  ],
  declarations: [
    ReportsComponent,
    ReportsInputsDialog,
  ],
  entryComponents: [
    ReportsInputsDialog,
  ],

})
export class ReportsModule { }

