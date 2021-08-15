import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MaterialModule } from '../material'
import { FlexLayoutModule } from '@angular/flex-layout';
import { ListRoutingModule } from './list-routing.module';
import { ListComponent, ListAddeditDialog } from './list.component';
import { HeaderModule } from '../header/header.module';


@NgModule({
  imports: [
    CommonModule,
    FormsModule, 
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    ListRoutingModule,
    HeaderModule,
  ],
  declarations: [
    ListComponent,
    ListAddeditDialog
  ],
  entryComponents: [
    ListAddeditDialog
  ],
})
export class ListModule { }

