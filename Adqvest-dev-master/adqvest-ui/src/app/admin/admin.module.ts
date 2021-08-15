import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent, ConfigColumnDialog} from './admin.component';
import { MaterialModule } from '../material';
import { FlexLayoutModule } from '@angular/flex-layout';
import { LoginHeaderModule } from '../login-header/login-header.module';
import { LoginHeaderComponent } from '../login-header/login-header.component';
import { D3ChartsModule } from '../d3Directive/d3Directive.module';


@NgModule({
  imports: [
    CommonModule,
    AdminRoutingModule,
    FormsModule, 
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    LoginHeaderModule,
    D3ChartsModule
  ],
  declarations: [
    AdminComponent,
    ConfigColumnDialog
  ],
  providers:[
    LoginHeaderComponent
  ]
})

export class AdminModule { }