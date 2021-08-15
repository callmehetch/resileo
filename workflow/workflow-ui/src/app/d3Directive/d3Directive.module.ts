import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { FormsModule, ReactiveFormsModule } from '@angular/forms'
// import { MaterialModule } from '../material'
// import { FlexLayoutModule } from '@angular/flex-layout';
import { D3chartsv3Directive } from '../d3Directive/d3chartsv3.directive';

@NgModule({
  imports: [
    CommonModule,
    // FormsModule, 
    // ReactiveFormsModule,
    // MaterialModule,
    // FlexLayoutModule,
  ],
  declarations: [D3chartsv3Directive],
  exports: [D3chartsv3Directive]
})

export class D3ChartsModule {}

