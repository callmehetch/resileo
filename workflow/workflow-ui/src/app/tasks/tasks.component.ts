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

export interface TaskClass {
  id: number,
  suggestion_id: number,
  name: string,
  description: string,
  ministry: number,
  ministry_name: string,
  project_code: string,
  project_name: string,
  suggestion_name: string,
  task_type_id: number,
  task_type_name: string,
  start_date: Date,
  end_date:Date,
  assigned_to_id: number,
  assigned_to_name: string,
  completion_percentage: number,
  hours_spent: number,
  attachment_json: any,
  isDisabled: boolean
}

export interface TaskUpdateClass {
  id: number,
  name: string,
  completion_percentage: number,
  hours_spent: number
}

export interface TaskHistoryClass {
  task_id: number,
  name: string,
}

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.css']
})
export class TasksComponent implements OnInit {

  @ViewChild(CdkScrollable, { static: true }) virtualScroll: CdkScrollable;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  
  private screenChangeEvent = new Subject();
  private filterEventSub = new Subject();

  task : TaskClass; 
  tasksColl = new MatTableDataSource([]);
  taskUpdate: TaskUpdateClass;
  taskHistory: TaskHistoryClass;
  screenParam: {height:number, width:number};
  showMyTask = true;
  loginUserId: number;
  isLoading = false;
  cardTitle:string;
  displayedColumns = [];
  attachmentList = [];

  tableWidth: number;
  taskSummary: {total:number; active:number; completed:number; beyondDue:number};
  setIntervalId;
  screenSubscribe;
  suggestionRef;
  currentDate = new Date(new Date().toDateString()).getTime();

  offset:number = 0;
  limit:number = 40;
  isFetched:boolean = false;
  handleScroll = (scrolled: boolean, filterVal) => {
    if (scrolled) {
      this.offset += this.limit; 
      this.getTasks(filterVal, this.offset, this.limit);
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
    if( sessionStorage.getItem("suggestionRef") ) {
      this.suggestionRef = JSON.parse(sessionStorage.getItem("suggestionRef"));
    }
    this.showMyTask = sessionStorage.getItem("myTaskOnly") == "true";
    
    if (this.suggestionRef == undefined && ! this.showMyTask ){
      this.router.navigate(["home"]);
    }
    this.screenSubscribe = this.authService.screenChange.subscribe(screen => {
      this.screenParam = {height:screen["height"], width:screen["width"]};
      let { width, height } = this.getTaskGridWidth();
      this.tableWidth = width-60-35;
    });
    this.screenChangeEvent
    .pipe(debounceTime(1000))
    .subscribe(e => {
      let { width, height } = this.getTaskGridWidth();
      this.tableWidth = width-60-35;
    })
    
    this.scrollDispatcher.scrolled(500)
    .pipe(filter(event => this.virtualScroll.measureScrollOffset('bottom') === 0))
    .subscribe(ele =>{
      if(this.hasMore())
        this.handleScroll(true, null);
      });
  
    this.filterEventSub.pipe(debounceTime(1000))
    .subscribe(e => {
      if (this.tasksColl['_renderData'].value.length < this.limit && this.isFetched){
        this.handleScroll(this.isFetched, e);
      }
    })
    
    this.loginUserId = JSON.parse(sessionStorage.getItem("loginUserDetails")).user_id;
    
    if( this.showMyTask ) {
        this.cardTitle = "My Tasks for all the Key Results";
    } else {
        this.cardTitle = "Tasks for Key Result: "+this.suggestionRef.name+" (id:"+this.suggestionRef.id+")";
    }
    this.getTasks(null);
    this.setIntervalId = setInterval(()=>{this.cd.detectChanges();},2000);


    if( this.showMyTask ) {
      this.displayedColumns = ['edit','delete',"history", "suggestion_name", "project_name", "name", "ministry_name", "task_type_name", "assigned_to_name", "start_date", "end_date","completion_percentage","hours_spent","attachment","created_on"];
    } else {
      this.displayedColumns = ['edit','delete',"history", "name", "ministry_name", "task_type_name", "assigned_to_name", "start_date", "end_date","completion_percentage","hours_spent","attachment","created_on"];
    }

  }

  async getTasks(filterValue:any, offset?:number, limit?:number){
    this.isLoading = true;
    let reset = false;
    if (offset == undefined) {offset = this.offset = 0; reset = true; } 
    if (limit == undefined) limit = this.limit;
    let param = {
      suggestion_id: this.suggestionRef?this.suggestionRef.id:null,
      my_task: this.showMyTask,
      offset: offset,
      limit: limit
    }
    let resp = await this.authService.getTasks(param);
    this.isLoading = false;
    let decryptedRows;
    if (resp.success && resp.rowCount > 0){
      this.isFetched = true;
      decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
      if(this.tasksColl.data.length == 0 || reset){
        this.tasksColl = new MatTableDataSource(decryptedRows);
      } else {
        let newData = this.tasksColl.data.concat(decryptedRows);
        this.tasksColl = new MatTableDataSource(newData);
        if(filterValue != undefined){
          this.applyFilter(filterValue);
        }
      }
      this.tasksColl.sort = this.sort;
    } else if (resp.rowCount == 0){
      if (reset){
        this.reusable.openAlertMsg("No rows found","info");
        this.tasksColl.data = [];
      }
      this.isFetched = false;
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  applyFilter(filterValue) {
    this.tasksColl.filter = filterValue.trim().toLowerCase();
    this.filterEventSub.next(filterValue);
  }

  private getTaskGridWidth() {
    let element = document.getElementById("tasks-grid");
    let positionInfo = element.getBoundingClientRect();
    let height = positionInfo.height;
    let width = positionInfo.width;
    return { width, height };
  }

  openTaskHistory(row){
    this.taskHistory = {task_id: row.id,name: row.name};
    this.openTaskHistoryDialog(this.taskHistory);
  }

  openTaskHistoryDialog(data){
    const dialogRef = this.dialog.open(TaskHistoryDialog, {
      width: '60%',
      data: data
    });
    // dialogRef.afterClosed().subscribe(result => {
    //   if(result != undefined) {
    //     let idx = this.tasksColl.data.findIndex(x => x.id === result.id);
    //     if (idx != -1){
    //       this.tasksColl.data[idx].completion_percentage = result.cp;
    //     }
    //   }
    // });
  }

  openModuleEdit(row){
    if( row.assigned_to_id !== this.loginUserId && row.created_by !== this.loginUserId ) {
      this.reusable.openAlertMsg("Only Creator or Assigned-To can Edit.","info");
      return;
    }
    
    this.task = {id: row.id, suggestion_id:row.suggestion_id, name: row.name, description: row.description, ministry: row.ministry, ministry_name: row.ministry_name, task_type_id: row.task_type_id, task_type_name: row.task_type_name, start_date: row.start_date, end_date: row.end_date, assigned_to_id: row.assigned_to_id, assigned_to_name: row.assigned_to_name, completion_percentage: row.completion_percentage, hours_spent: row.hours_spent, suggestion_name: "", project_code: row.project_code, project_name: "", attachment_json:row.attachment_json == undefined ? [] : row.attachment_json, isDisabled: true};
    this.openModuleDialog(this.task);
  }

  openUpdateTaskStatus(row){
    if( row.assigned_to_id !== this.loginUserId && row.created_by !== this.loginUserId ) {
      this.reusable.openAlertMsg("Only Creator or Assigned-To can Update.","info");
      return;
    }
    
    this.taskUpdate = {id: row.id, name: row.name, completion_percentage:row.completion_percentage, hours_spent:row.hours_spent};
    this.openUpdateTaskDialog(this.taskUpdate);
  }

  openUpdateTaskDialog(data:any): void {
    const dialogRef = this.dialog.open(TaskUpdateDialog, {
      width: '40%',
      data: data
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result != undefined) {
        let idx = this.tasksColl.data.findIndex(x => x.id === result.id);
        if (idx != -1){
          this.tasksColl.data[idx].completion_percentage = result.cp;
		  this.tasksColl.data[idx].hours_spent = parseFloat(this.tasksColl.data[idx].hours_spent||0) + parseFloat(result.hs);
        }
      }
    });
  }

  openModuleAdd(){
    this.task = {id:null, suggestion_id:this.suggestionRef?this.suggestionRef.id:null, name: null, description: null, ministry: null, ministry_name: null, task_type_id: null, task_type_name: null, start_date: null, end_date: null, assigned_to_id: null, assigned_to_name: null, completion_percentage:0, hours_spent: 0, suggestion_name: null, project_code: this.suggestionRef?this.suggestionRef.project_code:null, project_name: null, attachment_json: [], isDisabled: false};
    this.openModuleDialog(this.task);
  }

  openModuleDialog(data:any): void {
    const dialogRef = this.dialog.open(TaskAddeditDialog, {
      width: '60%',
      data: data
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result != undefined) {
        this.getTasks(null);
      }
    });
  }

  async deleteTask(element){
    if( element.created_by !== this.loginUserId ) {
      this.reusable.openAlertMsg("Only Creator can delete.","info");
      return;
    }
    
    let msg = "Please confirm the deletion of Task "+element.name+" (id:"+element.id+")";
    if (element.attachment > 0){
      if (element.attachment == 1){
        msg += " and its "+element.attachment+ " attachment";
      } else {
        msg += " and its "+element.attachment+ " attachments";
      }
    }
    let confirmMessage = confirm(msg);
    if (!confirmMessage) return;
    let param = {
      suggestion_id: element.suggestion_id,
      task_id: element.id,
      file_list: element.attachment_json == undefined ? [] : element.attachment_json,
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.delTask({param:encrypted});
    if (resp.success){
      this.reusable.openAlertMsg(resp.message,"info");
      this.getTasks(null);
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  goBack(){
    sessionStorage.removeItem("suggestionRef");
    sessionStorage.removeItem("myTaskOnly");
    this.router.navigate(['home']);
  }
}

/** Task ADD/Edit Dialog */
@Component({
  selector: 'tasks-addedit-dialog',
  templateUrl: 'tasks-addedit-dialog.html',
  styleUrls: ['./tasks.component.css']
})
export class TaskAddeditDialog implements OnInit {
  btnDisable = false;
  isLoading: boolean;
  loadCounter = 0;
  form: FormGroup;
  name: string;
  desc: string;
  ministry: number;
  suggestion_id: number;
  task_type_id: number;
  startDate = moment();
  endDate = moment();
  assigned_to_id: number;
  completionPercentage: number = 0;
  hoursSpent: number = 0;
  titleIcon: string;
  title: string;
  uploader;
  attachmentList = [];
  taskId: number;
  uploaderQLength: number;
  fileList = [];
  removedFileList = [];
  suggestionColl = [];
  ministryColl = [];
  taskTypeColl = [];
  assignedToColl = [];
  isDisabled: boolean;

  constructor(
    public dialogRef: MatDialogRef<TaskAddeditDialog>,
    @Inject(MAT_DIALOG_DATA) public data: TaskClass,
    private authService: AuthServiceService,
    private reusable: ReusableComponent,
    private formBuilder: FormBuilder,
  ) {}
  
  ngAfterViewInit() {
    //when adding the file withCredential default sets to true and if true, our authorization of request fails and hence changing to false
    this.uploader.onAfterAddingFile = (item => {
       item.withCredentials = false;
    });
  }
  
  ngOnInit(){
    this.isLoading = true;
    this.loadCounter += 4;
    this.getDepartmentList();
    this.getTaskTypeList();
    this.getAssignToList(this.data.project_code);
    this.getSuggestionsList();
    this.isDisabled = this.data.isDisabled;
    
    if (this.data.id == undefined) {
      this.titleIcon = "assignment"
      this.title = "Add Task";
    } else {
      this.titleIcon = "edit"
      this.title = "Edit Task ("+ this.data.id +")";
    }
    this.suggestion_id = this.data.suggestion_id;
    this.name = this.data.name;
    this.desc = this.data.description;
    this.ministry = this.data.ministry;
    this.task_type_id = this.data.task_type_id;
    this.assigned_to_id = this.data.assigned_to_id;
    this.completionPercentage = this.data.completion_percentage;
    this.hoursSpent = this.data.hours_spent;
    let dt = new Date();
    this.startDate = this.data.start_date == undefined ? moment(new Date(dt.getFullYear(),dt.getMonth(), dt.getDate())) : moment(this.data.start_date);
    this.endDate = this.data.end_date == undefined ? moment(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()+5)) : moment(this.data.end_date);
    if (this.data.attachment_json.length > 0){
      this.fileList = JSON.parse(JSON.stringify(this.data.attachment_json)); //this will remove the reference to the parent data.
    }
    this.createForm();
    this.uploader = this.authService.fnUploader();
    //on upload uploads the file and getting the response back. 
    this.uploader.onCompleteItem = (item:any,response:any, status:any, headers:any) =>{
      let resp = JSON.parse(response);
      resp["task_id"] = Number(this.taskId);
      this.attachmentList.push(resp);
      item.remove();
      if (this.uploaderQLength == this.attachmentList.length){
        this.saveUploadedReference();
      }
    }
  }

  async afterSuggestionSelect() {
    if( this.form.get("FormSuggestion").value ) {
      this.getAssignToList( this.form.get("FormSuggestion").value.project_code );
    }
  }

  async getSuggestionsList(){
    let param = {}
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.getSuggestionsList({param:encrypted});
    if (resp.success){
      if (resp.rowCount > 0){
        let decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
        this.suggestionColl = decryptedRows;
        if (this.data.suggestion_id != undefined){
          let idx = this.suggestionColl.findIndex(x => x.suggestion_id === this.data.suggestion_id);
          if (idx != -1){
            this.form.get("FormSuggestion").setValue(this.suggestionColl[idx]);
          }
        }
      }
    }
    
    this.stopLoader();
  }

  async getDepartmentList(){
    let param = {
      list_group: 'department'
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.getTypes({param:encrypted});
    if (resp.success){
      if (resp.rowCount > 0){
        let decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
        this.ministryColl = decryptedRows;
        if (this.data.id != undefined){
          let idx = this.ministryColl.findIndex(x => x.id === this.data.ministry);
          if (idx != -1){
            this.form.get("Ministry").setValue(this.ministryColl[idx]);
          }
        }
      }
    }
    
    this.stopLoader();
  }

  async getTaskTypeList(){
    let param = {
      list_group: 'Task Type'
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.getTypes({param:encrypted});
    if (resp.success){
      if (resp.rowCount > 0){
        let decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
        this.taskTypeColl = decryptedRows;
        if (this.data.id != undefined){
          let idx = this.taskTypeColl.findIndex(x => x.id === this.data.task_type_id);
          if (idx != -1){
            this.form.get("FormTaskType").setValue(this.taskTypeColl[idx]);
          }
        }
      }
    }
    
    this.stopLoader();
  }
  
  async getAssignToList(projectCode){
    this.assignedToColl = [];
    var olderValue;
    if( this.form ) {
      olderValue = this.form.get("FormAssignedTo").value;
      this.form.get("FormAssignedTo").setValue(null);
    }
    
    let param = {
      project_code: projectCode
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.getProjectUsers({param:encrypted});
    if (resp.success){
      if (resp.rowCount > 0){
        let decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
        this.assignedToColl = decryptedRows;
        /* if( olderValue ) {
          let idx = this.assignedToColl.findIndex(x => x.id === olderValue.id);
          this.form.get("FormAssignedTo").setValue(this.assignedToColl[idx]);
        } else */ if (this.data.id != undefined){
          let idx = this.assignedToColl.findIndex(x => x.id === this.data.assigned_to_id);
          if (idx != -1){
            this.form.get("FormAssignedTo").setValue(this.assignedToColl[idx]);
          }
        }
      }
    }
    
    this.stopLoader();
  }

  async downloadFile(i){
    let param = {file: this.fileList[i]}
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    this.authService.fileDownload({param:encrypted}).then(blob => {
      saveAs(blob, this.fileList[i].originalName);
    });
  }

  async saveUploadedReference(){
    let param = {
      suggestion_id: this.data.suggestion_id,
      task_id: this.taskId,
      attachment: JSON.stringify(this.attachmentList)
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    await this.authService.updTaskAttachRef({param:encrypted});
    this.closeWithReturn();
  }

  createForm(){
    this.form = this.formBuilder.group({
      FormSuggestion:[{value: this.suggestion_id, disabled: (this.data.suggestion_id != undefined)}, Validators.compose([Validators.required])],
      Name:[this.name, Validators.compose([
        Validators.required,
        this.noWhitespaceValidator,
      ])],
      Desc:[this.desc],
      Ministry: [this.ministryColl[0], Validators.compose([Validators.required])],
      FormTaskType: [],
      FormStartDate: [this.startDate, Validators.compose([Validators.required])],
      FormEndDate: [this.endDate, Validators.compose([Validators.required])],
      FormAssignedTo: [this.assigned_to_id, Validators.compose([Validators.required])],
      CP: [{value: this.completionPercentage, disabled: this.isDisabled}, Validators.compose([
        Validators.max(100),
        Validators.min(0),
        this.validateInt
      ])],
      HS: [{value: this.hoursSpent, disabled: this.isDisabled}, Validators.compose([
        Validators.max(100),
        Validators.min(0),
        this.validateNumeric
      ])]
   });
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
  validateNumeric(controls){
		const reqExp = new RegExp(/^[0-9]*(.[0-9]+){0,1}$/);
		if (reqExp.test(controls.value)){
			return null;
		} else{
			return {'validateNumeric' : true};
		}
  }

  getErrorMessage(control, controlName) {
    let msg ='';
    msg += control.hasError('required') ? 'You must enter a value ' :'';
    if (controlName =='CP' || controlName === 'HS') {msg += (control.errors != undefined && (control.errors.min || control.errors.max)) ? 'Between 0 & 100 Allowed. ': ''}
    msg += control.hasError('validateInt') ? 'Only whole number is allowed. ' :'';
    msg += control.hasError('validateNumeric') ? 'Only numeric value is allowed. ' :'';
    msg += control.hasError('whitespace') ? 'Name cannot be empty or white spaces only.' : '';
    return msg;
  }

  private stopLoader() {
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
  
  async addUpdateTask(){ 
    let param = {};
    if (this.form.valid){
      this.isLoading = true;
      param = {
        id: this.data.id,
        suggestion_id: this.data.suggestion_id || this.form.get('FormSuggestion').value.suggestion_id,
        name: this.form.get('Name').value.trim(),
        description: this.form.get('Desc').value.trim(),
        start_date: this.form.get('FormStartDate').value.format(),
        end_date: this.form.get('FormEndDate').value.format(),
        ministry: this.form.get('Ministry').value.id,
        task_type_id: this.form.get('FormTaskType').value ? this.form.get('FormTaskType').value.id : null,
        assigned_to_id: this.form.get('FormAssignedTo').value.id,
        completion_percentage: this.form.get('CP').value,
		    hours_spent: this.form.get('HS').value,
        removed_file_list: this.removedFileList,
        remarks: "Initial Status",
        date_of_status: ( moment(new Date()).format("DD/MM/YYYY") > this.form.get('FormEndDate').value.format() )? this.form.get('FormEndDate').value.format() : moment(new Date()).format("DD/MM/YYYY")
       }
      let encrypted = this.authService.encrypt(JSON.stringify(param));
      let resp;
      if (this.data.id == undefined){
        resp = await this.authService.addTask({param:encrypted});
        if (resp.success){
          this.taskId = resp.result[0].id;
        }
      } else {
        resp = await this.authService.updTask({param:encrypted});
        if (resp.success){
          this.taskId = Number(this.data.id);
          this.fileList.map(file => {
            if (Object.keys(file).indexOf("originalName") != -1 ){
              this.attachmentList.push(file);
            }
          });
        }
      }
      this.isLoading = false;
      if (resp.success) {
        this.reusable.openAlertMsg(resp.message, "info");
        if (this.uploader.queue.length > 0){
          this.uploaderQLength = this.uploader.queue.length + this.attachmentList.length;
          this.uploader['options']['headers'][1].value = this.data.suggestion_id+"/tasks/"+this.taskId;
          this.uploader.uploadAll();
        } else {
          this.saveUploadedReference();
        }
      } else {
        this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
        this.onClose();
      }
    } else {
      this.reusable.openAlertMsg('Please enter all required fields.',"error");
    }
  }

  removeFile(idx){
    let diff = this.fileList.length - this.uploader.queue.length;
    if (idx >= diff){
      this.uploader.queue[idx-diff].remove();
    }
    let removedContent = this.fileList.splice(idx,1);
    if (Object.keys(removedContent).indexOf("originalName")){
      this.removedFileList.push(removedContent[0]);
    }
  }
  
  onFileSelected(event: EventEmitter<File[]>) {
    for (let i = 0; i< event['length']; i++){
      const file: File = event[i];
      this.fileList.push(file);
    }
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

/** Task Update Dialog */
@Component({
  selector: 'tasks-update-dialog',
  templateUrl: 'tasks-update-dialog.html',
  styleUrls: ['./tasks.component.css']
})
export class TaskUpdateDialog implements OnInit {
  btnDisable = false;
  isLoading: boolean;
  form: FormGroup;
  dateOfStatus = moment();
  completionPercentage: number = 0;
  hoursSpent: number = 0;
  titleIcon: string;
  title: string;
  taskId: number;
  localData:any;

  constructor(
    public dialogRef: MatDialogRef<TaskUpdateDialog>,
    @Inject(MAT_DIALOG_DATA) public data: TaskUpdateClass,
    private authService: AuthServiceService,
    private reusable: ReusableComponent,
    private formBuilder: FormBuilder,
  ) {}
  
  ngOnInit(){
    this.localData = JSON.parse(JSON.stringify(this.data)); //removing reference
    this.titleIcon = "assignment"
    this.title = "Update Task Status for Task "+this.localData.name+"("+this.localData.id+")";
    this.completionPercentage = this.localData.completion_percentage;
    let dt = new Date();
    this.dateOfStatus = moment(new Date(dt.getFullYear(),dt.getMonth(), dt.getDate()));
    this.createForm();
  }

  createForm(){
    this.form = this.formBuilder.group({
      Remarks: ['', Validators.compose([
        Validators.required,
        this.noWhitespaceValidator
      ])],
      DateOfStatus: [this.dateOfStatus, Validators.compose([Validators.required])],
      CP: [this.completionPercentage, Validators.compose([
        Validators.max(100),
        Validators.min(0),
        this.validateInt
      ])],
      HS: [this.hoursSpent, Validators.compose([
        Validators.max(100),
        Validators.min(0),
        this.validateNumeric
      ])]
    });
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
  validateNumeric(controls){
		const reqExp = new RegExp(/^[0-9]*(.[0-9]+){0,1}$/);
		if (reqExp.test(controls.value)){
			return null;
		} else{
			return {'validateNumeric' : true};
		}
  }

  getErrorMessage(control, controlName) {
    let msg ='';
    msg += control.hasError('required') ? 'You must enter a value ' :'';
    if (controlName =='CP' || controlName =='HS') {msg += (control.errors != undefined && (control.errors.min || control.errors.max)) ? 'Between 0 & 100 Allowed. ': ''}
    msg += control.hasError('validateInt') ? 'Only whole number is allowed. ' :'';
    msg += control.hasError('validateNumeric') ? 'Only numeric value is allowed. ' :'';
    msg += control.hasError('whitespace') ? 'Remarks cannot be empty or white spaces only. ' : '';
    return msg;
  }

  onClose(): void {
    this.dialogRef.close();
  }

  closeWithReturn(taskId, status, hours_spent): void {
    this.dialogRef.close({id:taskId, cp:status, hs:hours_spent});
  }
  
  async addTaskUpdate(){ 
    let param = {};
    if (this.form.valid){
      this.isLoading = true;
      param = {
        task_id: this.localData.id,
        date_of_status: this.form.get('DateOfStatus').value.format(),
        completion_percentage: this.form.get('CP').value,
		hours_spent: this.form.get('HS').value,
        remarks: this.form.get('Remarks').value
      }
      let encrypted = this.authService.encrypt(JSON.stringify(param));
      let resp;
      resp = await this.authService.addTaskUpdate({param:encrypted});
      this.isLoading = false;
      if (resp.success) {
        this.reusable.openAlertMsg(resp.message, "info");
        this.closeWithReturn(this.localData.id, this.form.get('CP').value, this.form.get('HS').value);
      } else {
        this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
        this.onClose();
      }
    } else {
      this.reusable.openAlertMsg('Please enter all required fields.',"error");
    }
  }
}

/** Task History Dialog */
@Component({
  selector: 'tasks-history-dialog',
  templateUrl: 'tasks-history-dialog.html',
  styleUrls: ['./tasks.component.css']
})
export class TaskHistoryDialog implements OnInit {

  @ViewChild(CdkScrollable, { static: true }) virtualScroll: CdkScrollable;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  private filterEventSub = new Subject();

  setIntervalId;
  taskHisColl = new MatTableDataSource([]);

  isLoading: boolean;
  titleIcon: string;
  title: string;
  localData:any;

  offset:number = 0;
  limit:number = 20;
  isFetched:boolean = false;
  handleScroll = (scrolled: boolean, filterVal) => {
    if (scrolled) {
      this.offset += this.limit; 
      this.getTaskHistory(filterVal, this.offset, this.limit);
    }
  }

  hasMore(){
    return this.isFetched;
  }

  constructor(
    public dialogRef: MatDialogRef<TaskHistoryDialog>,
    @Inject(MAT_DIALOG_DATA) public data: TaskHistoryClass,
    private authService: AuthServiceService,
    private reusable: ReusableComponent,
    private scrollDispatcher: ScrollDispatcher,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnDestroy(){
    clearInterval(this.setIntervalId);
  }
  
  ngOnInit(){
    this.localData = JSON.parse(JSON.stringify(this.data)); //removing reference of the incoming data
    this.titleIcon = "history"
    this.title = "History for Task "+this.localData.name+"("+this.localData.task_id+")";
    this.scrollDispatcher.scrolled(500)
    .pipe(filter(event => this.virtualScroll.measureScrollOffset('bottom') === 0))
    .subscribe(ele =>{
      if(this.hasMore())
        this.handleScroll(true, null);
      });
  
    this.filterEventSub.pipe(debounceTime(1000))
    .subscribe(e => {
      if (this.taskHisColl['_renderData'].value.length < this.limit && this.isFetched){
        this.handleScroll(this.isFetched, e);
      }
    })
    this.getTaskHistory(null);
    this.setIntervalId = setInterval(()=>{this.cd.detectChanges();},2000);  
  }

  onClose(): void {
    this.dialogRef.close();
  }

  // closeWithReturn(taskId, status): void {
  //   this.dialogRef.close({id:taskId,cp:status});
  // }

  displayedColumns = ["delete","date_of_status", "remarks", "completion_percentage", "hours_spent", "created_on"];
  
  applyFilter(filterValue) {
    this.taskHisColl.filter = filterValue.trim().toLowerCase();
    this.filterEventSub.next(filterValue);
  }

  async getTaskHistory(filterValue:any, offset?:number, limit?:number){
    this.isLoading = true;
    let reset = false;
    if (offset == undefined) {offset = this.offset = 0; reset = true; } 
    if (limit == undefined) limit = this.limit;
    let param = {
      task_id: this.data.task_id,
      offset: offset,
      limit: limit
    };
    let resp = await this.authService.getTaskHistory(param);
    this.isLoading = false;
    let decryptedRows;
    if (resp.success && resp.rowCount > 0){
      this.isFetched = true;
      decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
      if(this.taskHisColl.data.length == 0 || reset){
        this.taskHisColl = new MatTableDataSource(decryptedRows);
      } else {
        let newData = this.taskHisColl.data.concat(decryptedRows);
        this.taskHisColl = new MatTableDataSource(newData);
        if(filterValue != undefined){
          this.applyFilter(filterValue);
        }
      }
      this.taskHisColl.sort = this.sort;      
    } else if (resp.rowCount == 0){
      if (reset){
        this.reusable.openAlertMsg("No rows found","info");
        this.taskHisColl.data = [];
      }
      this.isFetched = false;
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  async delTaskUpdate(row){
    let param = {
      id: row.id
    }
    this.isLoading = true;
    
    let msg = "Please confirm the deletion of Status";
    let confirmMessage = confirm(msg);
    if (!confirmMessage) return;

	let resp = await this.authService.delTaskUpdate(param);
    this.isLoading = false;
    if (resp.success){
      this.reusable.openAlertMsg(resp.message, "info");
      this.getTaskHistory(null);
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }
}
