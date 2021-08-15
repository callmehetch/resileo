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

export interface SettingsClass {
  settings_code: string,
  settings_name: string,
  description: string,
  department_id: number,
  department_name: string,
  start_date: Date,
  end_date:Date,
  settings_type_id: number,
  settings_type_name: string,
}

export interface SettingsUpdateClass {
  settings_code: string,
  settings_name: string,
}

export interface SettingsHistoryClass {
  settings_code: string,
  settings_name: string,
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {

  @ViewChild(CdkScrollable, { static: true }) virtualScroll: CdkScrollable;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  
  private screenChangeEvent = new Subject();
  private filterEventSub = new Subject();

  settings : SettingsClass; 
  settingsColl = new MatTableDataSource([]);
  settingsUpdate: SettingsUpdateClass;
  settingsHistory: SettingsHistoryClass;
  screenParam: {height:number, width:number};
  isFetched = false;1
  isLoading = false;
  cardTitle:string;
  
  tableWidth: number;
  settingsSummary: {total:number; active:number; completed:number; beyondDue:number};
  setIntervalId;
  screenSubscribe;
  currentDate = new Date(new Date().toDateString()).getTime();

  offset:number = 0;
  limit:number = 20;
  handleScroll = (scrolled: boolean, filterVal) => {
    if (scrolled) {
      this.offset += this.limit; 
//      this.getSettings(filterVal, this.offset, this.limit);
    }
  }

  constructor(
    private router: Router,
    private authService: AuthServiceService,
    private reusable: ReusableComponent,
    private scrollDispatcher: ScrollDispatcher,
    private cd: ChangeDetectorRef,
    public dialog: MatDialog,
  ) { }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    if (event != undefined)
      this.screenChangeEvent.next(event);
  }

  ngOnDestroy(){
    clearInterval(this.setIntervalId);
    this.screenSubscribe.unsubscribe();
  }

  ngOnInit(): void {
/*    this.screenSubscribe = this.authService.screenChange.subscribe(screen => {
      this.screenParam = {height:screen["height"], width:screen["width"]};
      let { width, height } = this.getSettingsGridWidth();
      this.tableWidth = width-60-35;
    });
    this.screenChangeEvent
      .pipe(debounceTime(1000))
      .subscribe(e => {
        let { width, height } = this.getSettingsGridWidth();
        this.tableWidth = width-60-35;
      })
    
    this.scrollDispatcher.scrolled(500)
      .pipe(filter(event => this.virtualScroll.measureScrollOffset('bottom') === 0))
      .subscribe(ele =>{
        // if(this.hasMore())
        //   this.handleScroll(true, null);
      });
  
    this.filterEventSub.pipe(debounceTime(1000))
      .subscribe(e => {
        if (this.settingsColl['_renderData'].value.length < this.limit && this.isFetched){
          this.handleScroll(this.isFetched, e);
        }
      })
*/
    this.cardTitle = "Settings Management";
//    this.getSettings(null);
    // this.setIntervalId = setInterval(()=>{this.cd.detectChanges();},2000);  
  }

/*
  applyFilter(filterValue) {
    this.settingsColl.filter = filterValue.trim().toLowerCase();
    this.filterEventSub.next(filterValue);
  }

  private getSettingsGridWidth() {
    let element = document.getElementById("settings-grid");
    let positionInfo = element.getBoundingClientRect();
    let height = positionInfo.height;
    let width = positionInfo.width;
    return { width, height };
  }


  displayedColumns = ['edit','delete',"history","settings_name", "department_name", "start_date", "end_date", "settings_type_name","created_on"];
  async getSettings(filterValue:any, offset?:number, limit?:number){
    this.isLoading = true;
    
    let reset = false;
    if (offset == undefined) {offset = this.offset = 0; reset = true; } 
    if (limit == undefined) limit = this.limit;
    let param = {
      offset: offset,
      limit: limit
    }
    let resp = {} //await this.authService.getSettings(param);
    this.isLoading = false;
    let decryptedRows;
    if (resp.success && resp.rowCount > 0){
      this.isFetched = true;
      decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
      if(this.settingsColl.data.length == 0 || reset){
        this.settingsColl = new MatTableDataSource(decryptedRows);
      } else {
        let newData = this.settingsColl.data.concat(decryptedRows);
        this.settingsColl = new MatTableDataSource(newData);
        if(filterValue != undefined){
          this.applyFilter(filterValue);
        }
      }
      this.settingsColl.sort = this.sort;
    } else if (resp.rowCount == 0){
      if (reset){
        this.reusable.openAlertMsg("No rows found","info");
        this.settingsColl.data = [];
      }
      this.isFetched = false;
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  async deleteSettings(element){
    let msg = "Please confirm the deletion of Settings "+element.settings_name;
    let confirmMessage = confirm(msg);
    if (!confirmMessage) return;
    let param = {
      settings_code: element.settings_code
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = {} //await this.authService.delSettings({param:encrypted});
    if (resp.success){
      this.reusable.openAlertMsg(resp.message,"info");
      this.getSettings(null);
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }
*/

  goBack(){
    this.router.navigate(['home']);
  }
}

/*
export interface ChangePasswordClass {
  current_password: string;
  new_password: string;
  confirm_password: string;
}


/** Project ADD/Edit Dialog * /
@Component({
  selector: 'change-password-dialog',
  templateUrl: 'change-password-dialog.html',
  styleUrls: ['./settings.component.scss']
})
export class ChangePasswordDialog implements OnInit {
  form: FormGroup;
  titleIcon: string;
  title: string;
  
  btnDisable = false;
  isLoading: boolean;
  loadCounter = 0;
  
  current_password: string;
  new_password: string;
  confirm_password: string;
  hide: boolean;

  constructor(
    public dialogRef: MatDialogRef<ChangePasswordDialog>,
    @Inject(MAT_DIALOG_DATA) public data: ChangePasswordClass,
    private authService: AuthServiceService,
    private reusable: ReusableComponent,
    private formBuilder: FormBuilder,
  ) {}
  
  ngAfterViewInit() {
    
  }
  
  ngOnInit(){
    
    this.createForm();
  }

  createForm(){
    this.form = this.formBuilder.group({
      FormCurrentPassword: [{},
		Validators.compose([
          Validators.required
        ])
	  ],
      FormNewPassword: [{},
	    Validators.compose([
          Validators.required
        ])
	  ],
      FormConfirmPassword: [{},
	    Validators.compose([
          Validators.required
        ])
	  ],
    });
  }

  getErrorMessage(control, controlName) {
    let msg ='';
    msg += control.hasError('required') ? 'You must enter a value ' :'';
    if (controlName =='CP') {msg += (control.errors != undefined && (control.errors.min || control.errors.max)) ? 'Between 0 & 100 Allowed ': ''}
    msg += control.hasError('validateInt') ? 'Only numeric value is allowed ' :'';
    msg += control.hasError('whitespace') ? 'Name cannot be empty or white spaces only' : '';
    return msg;
  }

  stopLoader() {
    this.loadCounter--;
    
    if( this.loadCounter === 0 ) {
      this.isLoading = false;
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  closeWithReturn(): void {
    this.dialogRef.close(this.data);
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
        this.closeWithReturn();
      } else {
        this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
        this.onClose();
      }
    } else {
      this.reusable.openAlertMsg('Please enter all required fields.',"error");
    }
  }
}
*/