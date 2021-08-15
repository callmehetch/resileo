import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MaterialModule } from '../material'
import { FlexLayoutModule } from '@angular/flex-layout';
import { FactsRoutingModule } from './facts-routing.module';
import { FactsComponent, FactAddeditDialog } from './facts.component';
import { HeaderModule } from '../header/header.module';
import { FileUploadModule,} from 'ng2-file-upload';


@NgModule({
  imports: [
    CommonModule,
    FormsModule, 
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    FactsRoutingModule,
    HeaderModule,
    FileUploadModule,
  ],
  declarations: [
    FactsComponent,
    FactAddeditDialog
  ],
  entryComponents: [
    FactAddeditDialog
  ],

})
export class FactsModule { }

