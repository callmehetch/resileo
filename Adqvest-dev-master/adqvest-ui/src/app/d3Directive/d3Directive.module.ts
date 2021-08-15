import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { D3chartsv3Directive } from '../d3Directive/d3chartsv3.directive';

@NgModule({
  imports: [
    CommonModule,
  ],
  declarations: [D3chartsv3Directive],
  exports: [D3chartsv3Directive]
})

export class D3ChartsModule {}

