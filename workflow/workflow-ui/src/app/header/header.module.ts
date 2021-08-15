import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MaterialModule } from '../material'
import { FlexLayoutModule } from '@angular/flex-layout';
import { HeaderComponent } from './header.component';
import { HeaderRoutingModule } from './header-routing.module'

@NgModule({
  imports: [
    CommonModule,
    FormsModule, 
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    HeaderRoutingModule
  ],
  declarations: [HeaderComponent],
  exports: [HeaderComponent]
})
export class HeaderModule { }

