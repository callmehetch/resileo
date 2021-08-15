import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MaterialModule } from '../material'
import { FlexLayoutModule } from '@angular/flex-layout';
import { MapRoutingModule } from './map-routing.module';
import { MapComponent, MapAddeditDialog } from './map.component';
import { HeaderModule } from '../header/header.module';
import { FileUploadModule,} from 'ng2-file-upload';


@NgModule({
  imports: [
    CommonModule,
    FormsModule, 
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    MapRoutingModule,
    HeaderModule,
    FileUploadModule,
  ],
  declarations: [
    MapComponent,
    MapAddeditDialog
  ],
  entryComponents: [
    MapAddeditDialog
  ],

})
export class MapModule { }

