import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { QueryBuilderRoutingModule } from './query-builder-routing.module';
import { QueryBuilderComponent, ConfigColumnDialog, ViewChartDialog} from './query-builder.component';
import { MaterialModule } from '../material';
import { FlexLayoutModule } from '@angular/flex-layout';
import { LoginHeaderModule } from '../login-header/login-header.module';
import { LoginHeaderComponent } from '../login-header/login-header.component';
import { D3ChartsModule } from '../d3Directive/d3Directive.module';


@NgModule({
  imports: [
    CommonModule,
    QueryBuilderRoutingModule,
    FormsModule, 
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    LoginHeaderModule,
    D3ChartsModule
  ],
  declarations: [
    QueryBuilderComponent,
    ConfigColumnDialog,
    ViewChartDialog
  ],
  providers:[
    LoginHeaderComponent
  ]
})

export class QueryBuilderModule { }