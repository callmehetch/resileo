import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MaterialModule } from '../material'
import { FlexLayoutModule } from '@angular/flex-layout';
import { SuggestionRoutingModule } from './suggestion-routing.module';
import { SuggestionComponent,SuggestionAddeditDialog } from './suggestion.component';
import { HeaderModule } from '../header/header.module';
import { FileUploadModule } from 'ng2-file-upload';
import { FactsModule } from '../facts/facts.module';
import { TasksModule } from '../tasks/tasks.module';
import { MapModule } from '../map/map.module';
import { ContactsModule } from '../contacts/contacts.module';


@NgModule({
  imports: [
    CommonModule,
    FormsModule, 
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    SuggestionRoutingModule,
    HeaderModule,
    FileUploadModule,
    FactsModule,
    TasksModule,
    MapModule,
    ContactsModule
  ],
  declarations: [
    SuggestionComponent,
    SuggestionAddeditDialog
  ],
  entryComponents: [
    SuggestionAddeditDialog
  ],

})
export class SuggestionModule { }

