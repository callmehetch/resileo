import { Component, OnInit, ViewChild, Inject, HostListener, EventEmitter, ChangeDetectorRef } from '@angular/core';
//ChangeDetectorRef is added for CDK scrolling to render the changes. It is not recognizing the changes by default
import { ReusableComponent } from '../reusable/reusable.component';
import { Router } from '@angular/router';
import { AuthServiceService } from '../auth-service.service';
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

export interface ProjectClass {
  project_code: string,
  project_name: string,
  description: string,
  department_id: number,
  department_name: string,
  start_date: Date,
  end_date:Date,
  project_type_id: number,
  project_type_name: string,
  project_manager_id: number,
  project_manager_name: string,
}

export interface ProjectUpdateClass {
  project_code: string,
  project_name: string,
}

export interface ProjectHistoryClass {
  project_code: string,
  project_name: string,
}

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css']
})
export class ProjectsComponent implements OnInit {

  @ViewChild(CdkScrollable, { static: true }) virtualScroll: CdkScrollable;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  
  private screenChangeEvent = new Subject();
  private filterEventSub = new Subject();

  project : ProjectClass; 
  projectsColl = new MatTableDataSource([]);
  projectUpdate: ProjectUpdateClass;
  projectHistory: ProjectHistoryClass;
  screenParam: {height:number, width:number};
  isFetched = false;1
  isLoading = false;
  cardTitle:string;
  
  tableWidth: number;
  projectSummary: {total:number; active:number; completed:number; beyondDue:number};
  setIntervalId;
  screenSubscribe;
  currentDate = new Date(new Date().toDateString()).getTime();

  offset:number = 0;
  limit:number = 20;
  handleScroll = (scrolled: boolean, filterVal) => {
    if (scrolled) {
      this.offset += this.limit; 
      this.getProjects(filterVal, this.offset, this.limit);
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
    this.screenSubscribe = this.authService.screenChange.subscribe(screen => {
      this.screenParam = {height:screen["height"], width:screen["width"]};
      let { width, height } = this.getProjectGridWidth();
      this.tableWidth = width-60-35;
    });
    this.screenChangeEvent
      .pipe(debounceTime(1000))
      .subscribe(e => {
        let { width, height } = this.getProjectGridWidth();
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
        if (this.projectsColl['_renderData'].value.length < this.limit && this.isFetched){
          this.handleScroll(this.isFetched, e);
        }
      })
    this.cardTitle = "Project Management";
    this.getProjects(null);
    // this.setIntervalId = setInterval(()=>{this.cd.detectChanges();},2000);  
  }

  applyFilter(filterValue) {
    this.projectsColl.filter = filterValue.trim().toLowerCase();
    this.filterEventSub.next(filterValue);
  }

  private getProjectGridWidth() {
    let element = document.getElementById("projects-grid");
    let positionInfo = element.getBoundingClientRect();
    let height = positionInfo.height;
    let width = positionInfo.width;
    return { width, height };
  }

  openModuleAdd(){
    this.project = {project_code:null, project_name: null, description: null, department_id: null, department_name: null, start_date: null, end_date: null, project_type_id: null, project_type_name: null, project_manager_id: null, project_manager_name: null};
    this.openModuleDialog(this.project);
  }

  openModuleDialog(data:any): void {
    const dialogRef = this.dialog.open(ProjectAddEditDialog, {
      width: '60%',
      data: data
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result != undefined) {
        this.getProjects(null);
      }
    });
  }

  openProjectHistory(row){
//    this.projectHistory = {project_code: row.project_code, project_name: row.project_name};
//    this.openProjectHistoryDialog(this.projectHistory);
  }

  openProjectHistoryDialog(data){
//    const dialogRef = this.dialog.open(ProjectHistoryDialog, {
//      width: '60%',
//      data: data
//    });
    // dialogRef.afterClosed().subscribe(result => {
    //   if(result != undefined) {
    //     let idx = this.projectsColl.data.findIndex(x => x.id === result.id);
    //     if (idx != -1){
    //       this.projectsColl.data[idx].completion_percentage = result.cp;
    //     }
    //   }
    // });
  }

  openModuleEdit(row){
    console.log("editting row: "+JSON.stringify(row))
    
    this.project = {
      project_code: row.project_code,
      project_name: row.project_name,
      description: row.description,
      department_id: row.department_id,
      department_name: row.department_name,
      start_date: row.start_date,
      end_date: row.end_date,
      project_type_id: row.project_type_id,
      project_type_name: row.project_type_name,
      project_manager_id: row.project_manager_id,
      project_manager_name: row.project_manager_name,
    };
    this.openModuleDialog(this.project);
  }

  openUpdateProjectStatus(row){
//    this.projectUpdate = {project_code: row.project_code, project_name: row.project_name};
//    this.openUpdateProjectDialog(this.projectUpdate);
  }

  openUpdateProjectDialog(data:any): void {
//    const dialogRef = this.dialog.open(ProjectUpdateDialog, {
//      width: '40%',
//      data: data
//    });
//    dialogRef.afterClosed().subscribe(result => {
//      if(result != undefined) {
//        let idx = this.projectsColl.data.findIndex(x => x.id === result.id);
//        if (idx != -1){
//          this.projectsColl.data[idx].completion_percentage = result.cp;
//        }
//      }
//    });
  }

  displayedColumns = ['edit','delete',"history", "project_name", "department_name", "project_manager_name", "start_date", "end_date", "project_type_name","created_on"];
  async getProjects(filterValue:any, offset?:number, limit?:number){
    this.isLoading = true;
    
    let reset = false;
    if (offset == undefined) {offset = this.offset = 0; reset = true; } 
    if (limit == undefined) limit = this.limit;
    let param = {
      offset: offset,
      limit: limit
    }
    let resp = await this.authService.getProjects(param);
    this.isLoading = false;
    let decryptedRows;
    if (resp.success && resp.rowCount > 0){
      this.isFetched = true;
      decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
      if(this.projectsColl.data.length == 0 || reset){
        this.projectsColl = new MatTableDataSource(decryptedRows);
      } else {
        let newData = this.projectsColl.data.concat(decryptedRows);
        this.projectsColl = new MatTableDataSource(newData);
        if(filterValue != undefined){
          this.applyFilter(filterValue);
        }
      }
      this.projectsColl.sort = this.sort;
    } else if (resp.rowCount == 0){
      if (reset){
        this.reusable.openAlertMsg("No rows found","info");
        this.projectsColl.data = [];
      }
      this.isFetched = false;
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  async deleteProject(element){
    let msg = "Please confirm the deletion of Project "+element.project_name;
    let confirmMessage = confirm(msg);
    if (!confirmMessage) return;
    let param = {
      project_code: element.project_code
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.delProject({param:encrypted});
    if (resp.success){
      this.reusable.openAlertMsg(resp.message,"info");
      this.getProjects(null);
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  goBack(){
    this.router.navigate(['home']);
  }
}


/** Project ADD/Edit Dialog */
@Component({
  selector: 'projects-addedit-dialog',
  templateUrl: 'projects-addedit-dialog.html',
  styleUrls: ['./projects.component.css']
})
export class ProjectAddEditDialog implements OnInit {
  btnDisable = false;
  isLoading: boolean;
  loadCounter = 0;
  form: FormGroup;
  titleIcon: string;
  title: string;

  project_code: string;
  project_name: string;
  description: string;
  department_id: number;
  project_type_id: number;
  project_manager_id: number;
  start_date = moment();
  end_date = moment();
  departmentColl = [];
  projectTypeColl = [];
  projectManagerColl = [];

  constructor(
    public dialogRef: MatDialogRef<ProjectAddEditDialog>,
    @Inject(MAT_DIALOG_DATA) public data: ProjectClass,
    private authService: AuthServiceService,
    private reusable: ReusableComponent,
    private formBuilder: FormBuilder,
  ) {}
  
  ngAfterViewInit() {
    
  }
  
  ngOnInit(){
    this.isLoading = true;
    this.loadCounter = 3;
    this.getDepartmentList();
    this.getProjectTypeList();
    this.getProjectManagerList();
    
    let dt = new Date();

    if (this.data.project_code == undefined) {
      this.titleIcon = "assignment"
      this.title = "Add Project";
      this.start_date = this.data.start_date == undefined ? moment(new Date(dt.getFullYear(),dt.getMonth(), dt.getDate())) : moment(this.data.start_date);
      this.end_date = this.data.end_date == undefined ? moment(new Date(dt.getFullYear(), dt.getMonth()+3, dt.getDate())) : moment(this.data.end_date);
    } else {
      this.titleIcon = "edit"
      this.title = "Edit Project ("+ this.data.project_name+")";
      this.start_date = moment(this.data.start_date);
      this.end_date = moment(this.data.end_date);
    }
    this.project_code = this.data.project_code;
    this.project_name = this.data.project_name;
    this.description = this.data.description;
    
    this.createForm();
  }

  async getDepartmentList(){
    let param = {
      list_group: 'department'
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.getTypes({param:encrypted});
    if (resp.success){
      if (resp.rowCount > 0){
        var decryptedDepartments = JSON.parse(this.authService.decrypt(resp.result));
        this.departmentColl = JSON.parse(this.authService.decrypt(resp.result)); // decryptedDepartments;
        if (this.data.project_code != undefined){
          let idx = this.departmentColl.findIndex(x => x.id === this.data.department_id);
          if (idx != -1){
            this.form.get("FormDepartment").setValue(this.departmentColl[idx]);
          }
        }
      }
    }
    this.department_id = this.data.department_id;
    
    this.stopLoader();
  }

  async getProjectTypeList(){
    let param = {
      list_group: 'Project Type'
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.getTypes({param:encrypted});
    if (resp.success){
      if (resp.rowCount > 0){
        let decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
        this.projectTypeColl = decryptedRows;
        if (this.data.project_code != undefined){
          let idx = this.projectTypeColl.findIndex(x => x.id === this.data.project_type_id);
          if (idx != -1){
            this.form.get("FormProjectType").setValue(this.projectTypeColl[idx]);
          }
        } else {
          // select the first item as default.
          //this.form.get("FormProjectType").setValue(this.projectTypeColl[0]);
        }
      }
    }
    this.project_type_id = this.data.project_type_id;
    
    this.stopLoader();
  }

  async getProjectManagerList(){
    let param = {
      // list_group: 'Task Type'
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.getUsers({param:encrypted});
    if (resp.success){
      if (resp.rowCount > 0){
        let decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
        this.projectManagerColl = decryptedRows;
        if (this.data.project_code != undefined){
          let idx = this.projectManagerColl.findIndex(x => x.id === this.data.project_manager_id);
          if (idx != -1){
            this.form.get("FormProjectManager").setValue(this.projectManagerColl[idx]);
          }
        }
      }
    }
    this.project_manager_id = this.data.project_manager_id;
    
    this.stopLoader();
  }

  createForm(){
    this.form = this.formBuilder.group({
      FormProjectCode:[{value: this.project_code, disabled: (this.titleIcon === 'edit')},
		Validators.compose([
        Validators.required,
        this.noWhitespaceValidator
      ])
	  ],
      FormProjectName:[this.project_name, Validators.compose([
        Validators.required,
        this.noWhitespaceValidator,
      ])],
      FormDescription:[this.description],
      FormStartDate: [this.start_date, Validators.compose([Validators.required])],
      FormEndDate: [this.end_date, Validators.compose([Validators.required])],
      FormDepartment: [null, Validators.compose([Validators.required])],
      FormProjectType: [null, Validators.compose([Validators.required])],
      FormProjectManager: [null, Validators.compose([Validators.required])]
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
  
  async addUpdateProject(){ 
    let param = {};
    if (this.form.valid){
      this.isLoading = true;
      
      this.project_code = this.data.project_code
      
      param = {
        project_code: this.data.project_code || this.form.get('FormProjectCode').value.trim(),
        project_name: this.form.get('FormProjectName').value.trim(),
        description: this.form.get('FormDescription').value?this.form.get('FormDescription').value.trim():"",
        start_date: this.form.get('FormStartDate').value.format(),
        end_date: this.form.get('FormEndDate').value.format(),
        department_id: this.form.get('FormDepartment').value.id,
        project_type_id: this.form.get('FormProjectType').value.id,
        project_manager_id: this.form.get('FormProjectManager').value.id,
      }
      let encrypted = this.authService.encrypt(JSON.stringify(param));
      let resp;
      if (this.data.project_code == undefined){
        resp = await this.authService.addProject({param:encrypted});
      } else {
        resp = await this.authService.updProject({param:encrypted});
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

  changeDate(type, event){
    let selectedDate = new Date(event.value.format());
    if (type == "start"){
      let endDate = new Date(this.form.get('FormEndDate').value.format());
      if (endDate <= selectedDate){
        this.form.get('FormStartDate').setErrors({invalidInput: true});
      } else {
        this.form.get('FormStartDate').setErrors(null);
      }
    } else {
      let stDate = new Date(this.form.get('FormStartDate').value.format());
      if (selectedDate <= stDate ){
        this.form.get('FormEndDate').setErrors({invalidInput: true});
      } else {
        this.form.get('FormEndDate').setErrors(null);
      }
    }
  }
}

