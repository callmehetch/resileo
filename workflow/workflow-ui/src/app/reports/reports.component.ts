import { Component, OnInit, ViewChild, Inject, HostListener, EventEmitter,ChangeDetectorRef } from '@angular/core';
//ChangeDetectorRef is added for CDK scrolling to render the changes. It is not recognizing the changes by default
import { ReusableComponent } from '../reusable/reusable.component';
import { Router } from '@angular/router';
import { AuthServiceService} from '../auth-service.service';
import { ScrollDispatcher, CdkScrollable } from '@angular/cdk/scrolling';
import { MatTableDataSource, MatTable } from '@angular/material/table';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Sort, MatSort } from '@angular/material/sort';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import * as _moment from 'moment';
import {default as _rollupMoment} from 'moment';
const moment = _rollupMoment || _moment;

export interface ReportParamClass {
  project_code: string,
  project_name: string,
  start_date: Date,
  end_date:Date,
  assigned_to_id: number,
  assigned_to_name: number,
  report_name: string,
  suggestion_id: any,
  suggestion_name: string,
  show_project: boolean,
  show_assigned_to: boolean,
  show_start_date: boolean,
  show_end_date: boolean,
  show_project_list: boolean,
  show_key_list: boolean
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  @ViewChild(CdkScrollable, { static: false }) virtualScroll: CdkScrollable;
  @ViewChild(MatSort, { static: false }) sort: MatSort;
  
  private screenChangeEvent = new Subject();
  private filterEventSub = new Subject();

  pendingTaskColl = new MatTableDataSource([]);
  actualEffortTasksReportColl = new MatTableDataSource([]);
  screenParam: {height:number, width:number};
  scrollLoadInitialized = false;
  isLoading = false;
  cardTitle:string;
  offset:number = 0;
  limit:number = 20;
  isFetched:boolean = false;
  attachmentList = [];
  visibleTab = 'reports_index';
  displayedColumns = [];
  usersAllColl = [];
  form: FormGroup;
  reportParam: ReportParamClass;
  loginUser: any;

  tableWidth: number;
  setIntervalId;
  screenSubscribe;
  callback_function;
  whereFilter;
  currentDate = new Date(new Date().toDateString()).getTime();

  handleScroll = (scrolled: boolean, filterVal) => {
    if (scrolled) {
      this.offset += this.limit; 
      this[this.callback_function](filterVal, this.reportParam, this.offset, this.limit);
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
    private formBuilder: FormBuilder,
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
    this.loginUser = JSON.parse(sessionStorage.getItem("loginUserDetails"));
    this.screenSubscribe = this.authService.screenChange.subscribe(screen => {
      this.screenParam = {height:screen["height"], width:screen["width"]};
      this.adjustScreenWidth();
    });
    
    this.screenChangeEvent
      .pipe(debounceTime(1000))
      .subscribe(e => this.adjustScreenWidth())
    
    this.scrollDispatcher.scrolled(500)
      .pipe(filter(event => this.virtualScroll.measureScrollOffset('bottom') === 0))
      .subscribe(ele => {
        if(this.hasMore())
          this.handleScroll(true, null);
      });
    
    this.filterEventSub.pipe(debounceTime(1000))
    .subscribe(e => {
      if (this.pendingTaskColl['_renderData'].value.length < this.limit && this.isFetched){
        this.handleScroll(this.isFetched, e);
      }
    })
    
    this.showTab(this.visibleTab)
    
    this.setIntervalId = setInterval(()=>{this.cd.detectChanges();},2000);
  }

  applyFilter(filterValue) {
    this.pendingTaskColl.filter = filterValue.trim().toLowerCase();
    this.filterEventSub.next(filterValue);
  }

  private adjustScreenWidth() {
      let { width, height } = this.getReportGridWidth();
      this.tableWidth = width-60-35;
  }

  private getReportGridWidth() {
    let width = 1000, height = 600;
    if( this.visibleTab !== 'reports_index' ) {
      let element = document.getElementById(this.visibleTab);
      let positionInfo = element.getBoundingClientRect();
      height = positionInfo.height;
      width = positionInfo.width;
    }
    
    return { width, height };
  }

  getReportParamsSize() {
    let element = document.getElementById('reportsParamGrid');
    let positionInfo = element.getBoundingClientRect();
    let height = positionInfo.height;
    let width = positionInfo.width;
    
    return { width: width, height: height};
  }

  showTab(tabName) {
    this.visibleTab = tabName;
    
    switch (tabName) {
        case "pendingtask-grid" :
            this.offset = 0;
            this.limit = 40;
            this.cardTitle = "Pending Task Details";
            this.displayedColumns = ["suggestion_name", "task_name", "assigned_to_user", "department", "delay_by", "end_date", "cp"];
            this.callback_function = 'getPendingTasks'
            this.getPendingTasks(null,null,null,null);
        break
        case "user-actualEffort-grid":
        case "actualEffort-grid":
            this.offset = 0;
            this.limit = 100;
            this.cardTitle = "Actual Effort Details";
            this.displayedColumns = ["created_on", "task_name", "remarks", "cp", "hs", "suggestion_name"];
            this.callback_function = 'getTaskActualEfforts'
        break
        case "reports_index" :
        default:
            this.cardTitle = "Reports";
            this.displayedColumns = [];
        break
    }
  }
  
  showReportsIndex() {
    this.clearReports();
    this.showTab('reports_index')
  }

  showInputs(tabName) {
    switch (tabName) {
        case "user-actualEffort-grid":
            this.reportParam = {
              project_code: "",
              project_name: "",
              start_date: null,
              end_date: null,
              suggestion_id: null,
              assigned_to_id: null,
              assigned_to_name: null,
              suggestion_name: null,
              report_name: tabName,
              show_project: false,
              show_assigned_to: false,
              show_start_date: true,
              show_end_date: true,
              show_project_list: true,
              show_key_list: true,
            }
            break
        case "actualEffort-grid" :
            this.reportParam = {
              project_code: "",
              project_name: "",
              start_date: null,
              end_date: null,
              suggestion_name: null,
              suggestion_id: null,
              assigned_to_id: null,
              assigned_to_name: null,
              report_name: tabName,
              show_project: false,
              show_assigned_to: true,
              show_start_date: true,
              show_end_date: true,
              show_project_list: true,
              show_key_list: true
            }
        break
    }
    const dialogRef = this.dialog.open(ReportsInputsDialog, {
      width: '60%',
      data: this.reportParam
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result != undefined) {
        // params
        this.reportParam.project_code = result.project_code;
        this.reportParam.project_name = result.project_name;
        this.reportParam.suggestion_id = result.suggestion_id;
        this.reportParam.suggestion_name = result.suggestion_name;
        this.reportParam.start_date = result.start_date;
        this.reportParam.end_date = result.end_date;
        this.reportParam.assigned_to_id = result.assigned_to_id;
        this.reportParam.assigned_to_name = result.assigned_to_name;
        
        this.showTab(tabName);
        
        this[this.callback_function](null,this.reportParam,this.offset,this.limit);
      }
    });
  }

  clearReports() {
    this.pendingTaskColl.data = [];
    this.actualEffortTasksReportColl.data = [];
    
  }

  async getPendingTasks(filterValue:any, params?:string, offset?:number, limit?:number){
    this.isLoading = true;
    let reset = false;
    if (offset == undefined) {offset = this.offset = 0; reset = true; } 
    if (limit == undefined) limit = this.limit;
    let param = {
      whereFilter: this.whereFilter,
      offset: offset,
      limit: limit
    }
    let resp = await this.authService.getPendingTaskStatus(param);
    this.isLoading = false;
    let decryptedRows;
    if (resp.success && resp.rowCount > 0) {
      this.isFetched = true;
      decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
      if(this.pendingTaskColl.data.length == 0 || reset){
        this.pendingTaskColl = new MatTableDataSource(decryptedRows);
      } else {
        let newData = this.pendingTaskColl.data.concat(decryptedRows);
        this.pendingTaskColl = new MatTableDataSource(newData);
        if(filterValue != undefined){
          this.applyFilter(filterValue);
        }
      }
      this.pendingTaskColl.sort = this.sort;
    } else if (resp.rowCount == 0){
      if (reset){
        this.reusable.openAlertMsg("No Pending task found as of today","info");
        this.pendingTaskColl.data = [];
      }
      this.isFetched = false;
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
    
    this.adjustScreenWidth();
  }

  async getTaskActualEfforts(filterValue:any, params:any, offset?:number, limit?:number){
    this.isLoading = true;
    let reset = false;
    if (offset == undefined) {offset = this.offset = 0; reset = true; } 
    if (limit == undefined) limit = this.limit;
    let param = {
      whereFilter: this.whereFilter,
      project_code: params.project_code?params.project_code:null,
      suggestion_id: params.suggestion_id?params.suggestion_id:null,
      start_date: params.start_date,
      end_date: params.end_date,
      assigned_to: params.assigned_to_id?params.assigned_to_id:null,
      offset: offset,
      limit: limit
    }
    let resp = await this.authService.getTaskActualEfforts(param);
    this.isLoading = false;
    let decryptedRows;
    if (resp.success && resp.rowCount > 0){
      this.isFetched = true;
      decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
      if(this.actualEffortTasksReportColl.data.length == 0 || reset){
        this.actualEffortTasksReportColl = new MatTableDataSource(decryptedRows);
      } else {
        let newData = this.actualEffortTasksReportColl.data.concat(decryptedRows);
        this.actualEffortTasksReportColl = new MatTableDataSource(newData);
        if(filterValue != undefined){
          this.applyFilter(filterValue);
        }
      }
      this.actualEffortTasksReportColl.sort = this.sort;
    } else if (resp.rowCount == 0){
      if (reset){
        this.reusable.openAlertMsg("No records found","info");
        this.actualEffortTasksReportColl.data = [];
      }
      this.isFetched = false;
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
    
    this.adjustScreenWidth();
  }
}


/** Reports Inputs Dialog */
@Component({
  selector: 'reports-inputs-dialog',
  templateUrl: 'reports-inputs.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsInputsDialog implements OnInit {
  btnDisable = false;
  isLoading: boolean;
  isDisabled: boolean;
  loadCounter = 0;
  pro_val: string;
  form: FormGroup;
  titleIcon: string;
  title: string;
  show_project_list: boolean;
  show_key_list: boolean;
  show_assigned_to: boolean;

  project_listColl = [];
  key_resultsColl = [];
  assignedToUsersColl = [];
  assigned_to_id: number;
  start_date = moment();
  end_date = moment();

  constructor(
    public dialogRef: MatDialogRef<ReportsInputsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: ReportParamClass,
    private authService: AuthServiceService,
    private reusable: ReusableComponent,
    private formBuilder: FormBuilder,
  ) {}

  ngAfterViewInit() {
    
  }

  ngOnInit(){
    this.title = "";
    this.isDisabled = false;
    this.pro_val = "";

    this.isLoading = true;
    this.loadCounter = 1;
    this.show_key_list = false;

    if(this.data.show_project_list){
      this.getProjectList();
    }
    if(this.data.show_key_list){
      this.getKeyResultsList();
    }
    if(this.data.show_assigned_to){
      this.getAssignedToList();
    }
    this.assignShowElements();

    let dt = new Date();

    this.start_date = moment(new Date(dt.getFullYear(),dt.getMonth(), dt.getDate()-7));
    this.end_date = moment(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()));
    
    this.createForm();

    /*if(this.form.get('FormProjectList').value != null){
        this.show_key_list = this.data.show_key_list;
    }*/
  }

  async assignShowElements(){
    this.show_assigned_to = this.data.show_assigned_to;
    this.show_project_list = this.data.show_project_list;
    this.show_key_list = this.data.show_key_list;
    //this.form.get('FormKeyList').disabled = true;
  }

  async getProjectList(){
    let param = {
      //list_group: 'Project Type'
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.getUserProjects({param:encrypted});
    if (resp.success){
      if (resp.rowCount > 0){
        let decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
        decryptedRows.unshift(JSON.parse('{"project_code": null, "project_name": "-- All --"}'));
        this.project_listColl = decryptedRows;
      }
    }
  }

  async getKeyResultsList(){
    if(this.pro_val == null){
      this.key_resultsColl.push(JSON.parse('{"project_code": null, "suggestion_name": "-- All --"}'));
    }
    else{
      let param = { }
      let encrypted = this.authService.encrypt(JSON.stringify(param));
      let resp = await this.authService.getSuggestionsList({param:encrypted});
      if (resp.success){
        if (resp.rowCount > 0){
          let decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
          for(let i=0; i<decryptedRows.length; i++){
             if(decryptedRows[i].project_code == this.pro_val){
                this.key_resultsColl.push(decryptedRows[i]);
             }
          }
        }
     }
    }
    this.stopLoader();
  }

  async getAssignedToList(){
    if(this.pro_val == null){
      let param = { }
      let encrypted = this.authService.encrypt(JSON.stringify(param));
      let resp = await this.authService.getUsers({param:encrypted});
      if(resp.success && resp.rowCount >0){
        let decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
        decryptedRows.unshift(JSON.parse('{"user_name": "-- All --"}'));
        this.assignedToUsersColl = decryptedRows;        
      }
    }
    else{
      let param = {
        project_code: this.pro_val
      }
      let encrypted = this.authService.encrypt(JSON.stringify(param));
      let resp = await this.authService.getProjectUsers({param:encrypted});
      if (resp.success){
        if (resp.rowCount > 0){
          let decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
          decryptedRows.unshift(JSON.parse('{"user_name": "-- All --"}'));
          this.assignedToUsersColl = decryptedRows;
        }
      }
      }
    this.stopLoader();
  }

  createForm(){
    this.form = this.formBuilder.group({
      FormProjectCode:[{value: null, disabled: ! this.data.show_project}],
      FormStartDate: [{value: this.start_date, disabled: ! this.data.show_start_date}],
      FormEndDate: [{value: this.end_date, disabled: ! this.data.show_end_date}],
      FormProjectList: [{value: null, disabled: ! this.data.show_project_list}],
      FormKeyList: [{value: null, disabled: this.isDisabled}],
      FormAssignedTo: [{value: null, disabled: ! this.data.show_assigned_to}]
    });
  }

  resetProjectHier(val){
    this.form.get('FormKeyList').reset();
    this.form.get('FormAssignedTo').reset();
    this.pro_val = val;
    this.getAssignedToList();
    this.getKeyResultsList();
  }

  public noWhitespaceValidator(control) {
    const isWhitespace = (control.value || '').trim().length === 0;
    const isValid = !isWhitespace;
    return isValid ? null : { 'whitespace': true };
  }

  validateInt(controls){
    const reqExp = new RegExp(/^[0-9]*$/);
    if (reqExp.test(controls.value)){
      return null;
    } else{
      return {'validateInt' : true};
    }
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
    let param = {
      project_code: this.data.show_project_list && this.form.get('FormProjectList').value ? this.form.get('FormProjectList').value.project_code : null,
      project_name: this.data.show_project_list && this.form.get('FormProjectList').value ? this.form.get('FormProjectList').value.project_name : null,
      suggestion_id: this.data.show_key_list && this.form.get('FormKeyList').value ? this.form.get('FormKeyList').value.id : null,
      suggestion_name: this.data.show_key_list && this.form.get('FormKeyList').value ? this.form.get('FormKeyList').value.suggestion_name : null,
      start_date: this.data.show_start_date ? this.form.get('FormStartDate').value.format() : null,
      end_date: this.data.show_end_date ? this.form.get('FormEndDate').value.format() : null,
      assigned_to_id: this.data.show_assigned_to && this.form.get('FormAssignedTo').value ? this.form.get('FormAssignedTo').value.id : null,
      assigned_to_name: this.data.show_assigned_to && this.form.get('FormAssignedTo').value ? this.form.get('FormAssignedTo').value.user_name : null,
    }
    this.dialogRef.close(param);
  }

  changeDate(type, event){
    let selectedDate = new Date(event.value.format());
    if (type == "start"){
      let endDate = new Date(this.form.get('FormEndDate').value.format());
      if (endDate < selectedDate){
        this.form.get('FormStartDate').setErrors({invalidInput: true});
      } else {
        this.form.get('FormStartDate').setErrors(null);
      }
    } else {
      let stDate = new Date(this.form.get('FormStartDate').value.format());
      if (selectedDate < stDate ){
        this.form.get('FormEndDate').setErrors({invalidInput: true});
      } else {
        this.form.get('FormEndDate').setErrors(null);
      }
    }
  }
}
