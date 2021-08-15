import { Component, OnInit, ViewChild, Inject, HostListener, EventEmitter,ChangeDetectorRef } from '@angular/core';
//ChangeDetectorRef is added for CDK scrolling to render the changes. It is not recognizing the changes by default
import { ReusableComponent } from '../reusable/reusable.component';
import { Router } from '@angular/router';
import { AuthServiceService} from '../auth-service.service';
import { ScrollDispatcher, CdkScrollable } from '@angular/cdk/scrolling';
import { MatTableDataSource, MatTable } from '@angular/material/table';
import { Sort, MatSort } from '@angular/material/sort';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import * as _moment from 'moment';
// tslint:disable-next-line:no-duplicate-imports -- 
//for default as to work, need to add "allowSyntheticDefaultImports": true, under tsconfig.json compiler option element.
import {default as _rollupMoment} from 'moment';
import { saveAs } from 'file-saver';

const moment = _rollupMoment || _moment;

export interface ChangePasswordClass {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

@Component({
  selector: 'change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent implements OnInit {

  @ViewChild(CdkScrollable, { static: true }) virtualScroll: CdkScrollable;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  
  private screenChangeEvent = new Subject();
  private filterEventSub = new Subject();

  //changePassword : ChangePasswordClass; 
  screenParam: {height:number, width:number};

  btnDisable = false;
  isLoading: boolean;
  loadCounter = 0;

  current_password: string;
  new_password: string;
  confirm_password: string;
  hide: boolean = true;
  
  tableWidth: number;
  screenSubscribe;
  titleIcon: string;
  cardTitle: string;
  title: string;
  currentDate = new Date(new Date().toDateString()).getTime();
  
  form: FormGroup;

  constructor(
    private router: Router,
    private authService: AuthServiceService,
    private reusable: ReusableComponent,
    private scrollDispatcher: ScrollDispatcher,
    private cd: ChangeDetectorRef,
    public dialog: MatDialog,
	private formBuilder: FormBuilder,
  ) { }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    if (event != undefined)
      this.screenChangeEvent.next(event);
  }

  ngOnDestroy(){
    this.screenSubscribe.unsubscribe();
  }

  ngOnInit(): void {
    this.screenSubscribe = this.authService.screenChange.subscribe(screen => {
      this.screenParam = {height:screen["height"], width:screen["width"]};
      let { width, height } = this.getChangePasswordGridWidth();
      this.tableWidth = width-60-35;
    });
    this.screenChangeEvent
      .pipe(debounceTime(1000))
      .subscribe(e => {
        let { width, height } = this.getChangePasswordGridWidth();
        this.tableWidth = width-60-35;
      })
    
    this.createForm();
	
    this.cardTitle = "Change Password";
  }

  private getChangePasswordGridWidth() {
    let element = document.getElementById("change-password-form");
    let positionInfo = element.getBoundingClientRect();
    let height = positionInfo.height;
    let width = positionInfo.width;
    return { width, height };
  }

  createForm(){
    this.form = this.formBuilder.group({
      FormCurrentPassword: [{value:"", disabled: false},
		Validators.compose([
          Validators.required
        ])
	  ],
      FormNewPassword: [{value:"", disabled: false},
	    Validators.compose([
          Validators.required
        ])
	  ],
      FormConfirmPassword: [{value:"", disabled: false},
	    Validators.compose([
          Validators.required
        ])
	  ],
    },
    {validator: this.matchingPasswords('FormNewPassword', 'FormConfirmPassword')}
	);
  }

  matchingPasswords(pass,conf){
    return (group: FormGroup) => {
      if( group.controls[pass].value.length > 0 && group.controls[conf].value.length > 0 ){
        if( group.controls[pass].value === group.controls[conf].value ) {
          return null;
        } else {
          return {'matchingPasswords' : true};
        }
      }
    }
  }

  getErrorMessage(control, controlName) {
    let msg ='';
    msg += control.hasError('required') ? 'You must enter a value' :'';
    if (controlName =='form') {msg += control.hasError('matchingPasswords') ? 'Password & Confirm-Password must be same' :''}
    return msg;
  }

  async changePassword(){ 
    let param = {};
    if (this.form.valid){
      this.isLoading = true;
      
      param = {
        current_password: this.form.get('FormCurrentPassword').value,
        new_password: this.form.get('FormNewPassword').value,
        confirm_password: this.form.get('FormConfirmPassword').value
      }
      let encrypted = this.authService.encrypt(JSON.stringify(param));
      let resp = await this.authService.changePassword({param:encrypted});
      this.isLoading = false;
      if (resp.success) {
        this.reusable.openAlertMsg(resp.message, "info");
      } else {
        this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
      }
    } else {
      this.reusable.openAlertMsg('Please enter all required fields.',"error");
    }
  }

  reset() {
	this.form.get('FormCurrentPassword').setValue("");
	this.form.get('FormNewPassword').setValue("");
	this.form.get('FormConfirmPassword').setValue("");
  }

  goBack(){
    this.router.navigate(['home']);
  }
}
