import { Component, OnInit, Inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AlertComponent } from '../_directives/alert.component';

@Component({
  selector: 'app-reusable',
  templateUrl: './reusable.component.html',
  styleUrls: ['./reusable.component.scss']
})

export class ReusableComponent implements OnInit {

  constructor(
    private _snackBar: MatSnackBar,
  ) { }

  ngOnInit() {
  }

  public openAlertMsg(msg,type){
    this._snackBar.openFromComponent(AlertComponent,{data: {message:msg, type:type}});
  }

  debounce(delay: number = 300): MethodDecorator {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const timeoutKey = Symbol();
  
      const original = descriptor.value;
  
      descriptor.value = function (...args) {
        clearTimeout(this[timeoutKey]);
        this[timeoutKey] = setTimeout(() => original.apply(this, args), delay);
      };
  
      return descriptor;
    };
  }
}

