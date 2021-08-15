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

export interface UserClass {
  id: number,
  login_name: string,
  user_name: string,
  mobile: string,
  email: string,
  is_deleted: string,
  created_on: Date,
}

export interface ResetPasswordClass {
  id: number,
  user_name: string,
}

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit {
  @ViewChild(CdkScrollable, { static: true }) virtualScroll: CdkScrollable;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  
  private screenChangeEvent = new Subject();
  private filterEventSub = new Subject();

  user : UserClass; 
  userColl = new MatTableDataSource([]);
  screenParam: {height:number, width:number};
  isLoading = false;
  cardTitle:string;
  offset:number = 0;
  limit:number = 20;
  isFetched:boolean = false;
  attachmentList = [];
  loggedInUserId:number;
  tableWidth: number;
  setIntervalId;
  screenSubscribe;

  handleScroll = (scrolled: boolean, filterVal) => {
    if (scrolled) {
      this.offset += this.limit; 
      this.getUsers(filterVal, this.offset, this.limit);
    }
  }

  hasMore(){
    return this.isFetched;
  }

  constructor(
    private router: Router,
    private authService: AuthServiceService,
		private reusable: ReusableComponent,
    private scrollDispatcher: ScrollDispatcher,
    public dialog: MatDialog,
    private cd: ChangeDetectorRef,
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
    this.loggedInUserId = JSON.parse(sessionStorage.getItem("loginUserDetails")).user_id;
    this.screenSubscribe = this.authService.screenChange.subscribe(screen => {
      this.screenParam = {height:screen["height"], width:screen["width"]};
      let { width, height } = this.getUserGridWidth();
      this.tableWidth = width-60-35;
    });

    this.screenChangeEvent
    .pipe(debounceTime(1000))
    .subscribe(e => {
      let { width, height } = this.getUserGridWidth();
      this.tableWidth = width-60-35;
    })
    
    this.scrollDispatcher.scrolled(500)
    .pipe(filter(event => this.virtualScroll.measureScrollOffset('bottom') === 0))
    .subscribe(ele =>{
      console.log("scrollDispatcher", this.isFetched);
      if(this.hasMore())
        this.handleScroll(true, null);
      });
  
    this.filterEventSub.pipe(debounceTime(1000))
    .subscribe(e => {
      if (this.userColl['_renderData'].value.length < this.limit && this.isFetched){
        this.handleScroll(this.isFetched, e);
      }
    })
    this.cardTitle = "Login User Master";
    this.getUsers(null);
    this.setIntervalId = setInterval(()=>{this.cd.detectChanges();},2000);  
  }

  applyFilter(filterValue) {
    this.userColl.filter = filterValue.trim().toLowerCase();
    this.filterEventSub.next(filterValue);
  }

  private getUserGridWidth() {
    let element = document.getElementById("user-grid");
    let positionInfo = element.getBoundingClientRect();
    let height = positionInfo.height;
    let width = positionInfo.width;
    return { width, height };
  }

  openModuleEdit(row){
    this.user = {id: row.id, login_name: row.login_name, user_name: row.user_name, mobile: row.mobile, email: row.email, is_deleted: row.is_deleted, created_on: row.created_on};
    this.openModuleDialog(this.user);
  }

  openModuleAdd(){
    this.user = {id: null, login_name: null, user_name: null, mobile: null, email: null, is_deleted: null, created_on: null};
    this.openModuleDialog(this.user);
  }

  openModuleDialog(data:any): void {
    const dialogRef = this.dialog.open(UserAddeditDialog, {
      width: '50%',
      data: data
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result != undefined) {
        this.getUsers(null);
      }
    });
  }

  resetPassword(element){
    let resetPass:ResetPasswordClass;
    resetPass = {id:element.id,user_name:element.user_name};
    this.openResetPass(resetPass);
  }

  openResetPass(data:any):void {
    const dialogRef = this.dialog.open(ResetPasswordDialog, {
      width: '40%',
      data: data
    });
  }

  displayedColumns = ["edit","delete","change_pass","login_name", "user_name", "mobile", "email","created_on"];
  async getUsers(filterValue:any, offset?:number, limit?:number){
    this.isLoading = true;
    let reset = false;
    if (offset == undefined) {offset = this.offset = 0; reset = true; } 
    if (limit == undefined) limit = this.limit;
    let param = {
      offset: offset,
      limit: limit
    };
    let resp = await this.authService.getUsers(param);
    this.isLoading = false;
    let decryptedRows;
    if (resp.success && resp.rowCount > 0){
      this.isFetched = true;
      decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
      if(this.userColl.data.length == 0 || reset){
        this.userColl = new MatTableDataSource(decryptedRows);
      } else {
        let newData = this.userColl.data.concat(decryptedRows);
        this.userColl = new MatTableDataSource(newData);
        if(filterValue != undefined){
          this.applyFilter(filterValue);
        }
      }
      this.userColl.sort = this.sort;
    } else if (resp.rowCount == 0){
      if (reset){
        this.reusable.openAlertMsg("No rows found","info");
        this.userColl.data = [];
      }
      this.isFetched = false;
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  async delUndeluser(element, isDel){
    let msg = "Please confirm the "+isDel+" of User "+element.user_name+" (id:"+element.id+")";
    let confirmMessage = confirm(msg);
    if (!confirmMessage) return;
    let param = {
      id: element.id,
      is_deleted: isDel=="undelete" ? false : true
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.delUndelUser({param:encrypted});
    if (resp.success){
      this.reusable.openAlertMsg(resp.message,"info");
      this.getUsers(null);
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }
}

/** Reset Password Dialog */
@Component({
  selector: 'reset-password-dialog',
  templateUrl: 'reset-password-dialog.html',
})
export class ResetPasswordDialog implements OnInit {
  hide = true;
  isLoading: boolean = false;
  form: FormGroup;
  password: string;
  confirm: string;
  titleIcon: string;
  title: string;

  constructor(
    public dialogRef: MatDialogRef<ResetPasswordClass>,
    @Inject(MAT_DIALOG_DATA) public data: UserClass,
    private authService: AuthServiceService,
    private reusable: ReusableComponent,
    private formBuilder: FormBuilder,
  ) {}
    
  ngOnInit(){
    this.titleIcon = "vpn_key"
    this.title = "Reset Password for "+ this.data.user_name +"("+this.data.id+")";
    this.password = "";
    this.confirm = "";
    this.createForm();
  }

  createForm(){
    this.form = this.formBuilder.group({
      Password:[this.password,Validators.compose([
        Validators.required,
      ])],
      Confirm:[this.confirm,Validators.required],
      },
        {validator: this.matchingPasswords('Password', 'Confirm')}
      );	
  }

  matchingPasswords(pass,conf){
	return (group: FormGroup) => {
		if(group.controls[pass].value === group.controls[conf].value){
			return null;
		} else {
			return {'matchingPasswords' : true};
		}
	}
  }

  getErrorMessage(control, controlName) {
    let msg ='';
    msg += control.hasError('required') ? 'You must enter a value' :'';
    if (controlName =='form') {msg += control.hasError('matchingPasswords') ? 'Password, Confirm password must be same' :''}
    return msg;
  }

  onClose(): void {
    this.dialogRef.close();
  }

  closeWithReturn(): void {
    this.dialogRef.close(this.data);
  }

  async resetPassword(){
    let param = {};
    if (this.form.valid){
      this.isLoading = true;
      param = {
        id: this.data.id,
        password: this.form.get('Password').value
      }
      let encrypted = this.authService.encrypt(JSON.stringify(param));
      let resp = await this.authService.resetPassword({param:encrypted});
      this.isLoading = false;
      if (resp.success) {
        this.reusable.openAlertMsg(resp.message, "info");
      } else {
        this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
      }
      this.onClose();
    } else {
      this.reusable.openAlertMsg('Please enter all required fields.',"error");
    }
  }
}
/** User ADD/Edit Dialog */
@Component({
  selector: 'user-addedit-dialog',
  templateUrl: 'user-addedit-dialog.html',
})
export class UserAddeditDialog implements OnInit {
  btnDisable = false;
  isLoading: boolean;
  form: FormGroup;
  loginName: string;
  userName: string;
  mobile: string;
  email: string;
  password: string;
  confirm: string;
  titleIcon: string;
  title: string;
  userId: number;
  hide = true;
  constructor(
    public dialogRef: MatDialogRef<UserAddeditDialog>,
    @Inject(MAT_DIALOG_DATA) public data: UserClass,
    private authService: AuthServiceService,
    private reusable: ReusableComponent,
    private formBuilder: FormBuilder,
  ) {}
    
  ngOnInit(){
    if (this.data.id == undefined) {
      this.titleIcon = "people"
      this.title = "Add User";
      this.password = "";
      this.confirm = "";
    } else {
      this.titleIcon = "edit"
      this.title = "Edit User ("+ this.data.id +")";
      this.password = "dummypasswordforedit";
      this.confirm = "dummypasswordforedit";
    }
    this.loginName = this.data.login_name;
    this.userName = this.data.user_name;
    this.mobile = this.data.mobile;
    this.email = this.data.email;

    this.createForm();
  }

  createForm(){
    this.form = this.formBuilder.group({
      LoginName:[this.loginName, Validators.compose([
        Validators.required,
        this.validateLogin
      ])],
      UserName:[this.userName, Validators.compose([
        Validators.required,
      ])],
      Mobile:[this.mobile,Validators.compose([
        Validators.required,
        Validators.minLength(12),
        Validators.maxLength(15),
        this.validateMobile
      ])],
      Email: [this.email, Validators.compose([Validators.email])],
      Password:[this.password,Validators.compose([
        Validators.required,
      ])],
      Confirm:[this.confirm,Validators.required],
      },
        {validator: this.matchingPasswords('Password', 'Confirm')}
      );
  }
  trimField(element) {
	element.setValue(element.value.trim());
  }
  validateLogin(controls){
		const reqExp = new RegExp(/^[0-9a-zA-z]*$/);
		if (reqExp.test(controls.value)){
			return null;
		} else{
			return { 'validateLogin' : true};
		}
	}

  matchingPasswords(pass,conf){
		return (group: FormGroup) => {
			if(group.controls[pass].value === group.controls[conf].value){
				return null;
			} else{
				return {'matchingPasswords' : true};
			}
		}
	}

  validateMobile(controls){
		const reqExp = new RegExp(/^[0-9]*$/);
		if (reqExp.test(controls.value)){
			return null;
		} else{
			return { 'validateMobile' : true};
		}
	}

  getErrorMessage(control, controlName) {
    let msg ='';
    msg += control.hasError('required') ? ' You must enter a value.' :'';
    if (controlName =='Email') {msg += control.hasError('email') ? ' Not a valid email.' :''}
    if (controlName =='Mobile') {msg += (control.errors.minlength || control.errors.maxlength) ? ' Must be between 12 & 15 length includes country code.': ''}
    if (controlName =='LoginName') {msg += control.hasError('validateLogin') ? ' Only Alpha Numeric Fields Allowed.' :''}
    if (controlName =='Mobile') {msg += control.hasError('validateMobile') ? ' Only Numeric Fields Allowed.' :''}
    if (controlName =='form') {msg += control.hasError('matchingPasswords') ? ' Password, Confirm password must be same.' :''}
    return msg;
	}

  onClose(): void {
    this.dialogRef.close();
  }

  closeWithReturn(): void {
    this.dialogRef.close(this.data);
  }
  
  async addUpdateUser(){ 
    let param = {};
    if (this.form.valid){
      this.isLoading = true;
      param = {
        id: this.data.id,
        login_name: this.form.get('LoginName').value.trim(),
        user_name: this.form.get('UserName').value.trim(),
        mobile: this.form.get('Mobile').value,
        email: this.form.get('Email').value,
        password: this.form.get('Password').value
      }
      let encrypted = this.authService.encrypt(JSON.stringify(param));
      let resp;
      if (this.data.id == undefined){
        resp = await this.authService.addUser({param:encrypted});
      } else {
        resp = await this.authService.updUser({param:encrypted});
      }
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

