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

export interface SuggestionClass {
  id: string,
  name: string,
  description: string,
  start_date: Date,
  end_date: Date,
  is_active: boolean,
  is_completed: boolean,
  project_code: string,
  project_name: string,
  owner_id: number,
  owner_name: string,
  attachment: any,
}

@Component({
  selector: 'app-suggestion',
  templateUrl: './suggestion.component.html',
  styleUrls: ['./suggestion.component.css']
})
export class SuggestionComponent implements OnInit {
  @ViewChild(CdkScrollable, { static: true }) virtualScroll: CdkScrollable;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  
  private screenChangeEvent = new Subject();
  private filterEventSub = new Subject();

  suggestion : SuggestionClass; 
  suggestionColl = new MatTableDataSource([]);
  screenParam: {height:number, width:number};
  isLoading = false;
  cardTitle:string;
  offset:number = 0;
  limit:number = 50;
  isFetched:boolean = false;
  attachmentList = [];

  tableWidth: number;
  suggestionSummary: {total:number; active:number; completed:number; beyondDue:number};
  setIntervalId;
  screenSubscribe;
  whereFilter;
  filterValue;
  currentDate = new Date(new Date().toDateString()).getTime();
  subTotal = {facts:0, maps:0, tasks:0, contacts:0, attachment:0};
  totalSuggestion:number;

  handleScroll = (scrolled: boolean, filtered: boolean, filterVal) => {
    if (scrolled) {
      this.offset += this.limit;
      this.getSuggestions(filterVal, this.whereFilter, this.offset, this.limit);
    } else if( filtered ) {
      this.getSuggestions(filterVal, this.whereFilter, null, null);
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
    this.screenSubscribe = this.authService.screenChange.subscribe(screen => {
      this.screenParam = {height:screen["height"], width:screen["width"]};
      let { width, height } = this.getSuggestionGridWidth();
      this.tableWidth = width-60-35;
    });

    this.screenChangeEvent
    .pipe(debounceTime(1000))
    .subscribe(e => {
      let { width, height } = this.getSuggestionGridWidth();
      this.tableWidth = width-60-35;
    })
    
    this.scrollDispatcher.scrolled(500)
    .pipe(filter(event => this.virtualScroll.measureScrollOffset('bottom') === 0))
    .subscribe(ele =>{
      if(this.hasMore())
        this.handleScroll(true, null, this.filterValue);
      });
  
    this.filterEventSub.pipe(debounceTime(1000))
    .subscribe(filterValue => {
      // call the respective event only if any changes done
      if( filterValue !== this.filterValue /* && this.suggestionColl['_renderData'].value.length < this.limit && this.isFetched */ ){
        this.filterValue = filterValue;
        this.handleScroll(false, true, filterValue);
      }
    })
    
    this.cardTitle = "Key Results";
    this.getSuggestions(null);
    this.setIntervalId = setInterval(()=>{this.cd.detectChanges();},2000);  
  }

  applyFilter(filterValue) {
    // this.suggestionColl.filter = filterValue.trim().toLowerCase();
    this.filterEventSub.next( filterValue.trim().toLowerCase() );
  }

  private getSuggestionGridWidth() {
    let element = document.getElementById("suggestion-grid");
    let positionInfo = element.getBoundingClientRect();
    let height = positionInfo.height;
    let width = positionInfo.width;
    return { width, height };
  }

  openModuleEdit(row){
    this.suggestion = {id: row.id, name: row.name, description: row.description, start_date: row.start_date, end_date: row.end_date, is_active:row.is_active, is_completed:row.is_completed, project_code: row.project_code, project_name: row.project_name, owner_id: row.owner_id, owner_name: row.owner_name, attachment:row.attachment_json == undefined ? [] : row.attachment_json};
    this.openModuleDialog(this.suggestion);
  }

  openModuleAdd(){
    this.suggestion = {id: null, name: null, description: null, start_date: new Date(), end_date: null, is_active: true, is_completed:false, project_code: null, project_name: null, owner_id: null, owner_name: null, attachment:[]};
    this.openModuleDialog(this.suggestion);
  }

  openModuleDialog(data:any): void {
    const dialogRef = this.dialog.open(SuggestionAddeditDialog, {
      width: '60%',
      data: data
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result != undefined) {
        this.getSuggestions(this.filterValue, this.whereFilter, null, null);
      }
    });
  }

  displayedColumns = ['edit','delete',"name", "project_name", "owner_name", "status", "start_date", "end_date","facts","maps","tasks","attachment","is_active","is_completed" /*,"project_name" */];
  async getSuggestions(filterValue:any, whereFil?:string, offset?:number, limit?:number){
    this.isLoading = true;
    let reset = false;
    if (offset == undefined) {offset = this.offset = 0; reset = true; } 
    if (limit == undefined) limit = this.limit;
    //this.filterValue = filterValue;
    this.whereFilter = whereFil;
    let param = {
      filterValue: filterValue,
      whereFilter: whereFil,
      offset: offset,
      limit: limit
    }
    let resp = await this.authService.getSuggestions(param);
    this.isLoading = false;
    let decryptedRows;
    if (resp.success && resp.rowCount > 0){
      this.isFetched = true;
      decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
      if(this.suggestionColl.data.length == 0 || reset){
        this.suggestionColl = new MatTableDataSource(decryptedRows);
      } else {
        let newData = this.suggestionColl.data.concat(decryptedRows);
        this.suggestionColl = new MatTableDataSource(newData);
        //if(filterValue != undefined){
        //  this.applyFilter(filterValue);
        //}
      }
      this.suggestionColl.sort = this.sort;
      
      this.getSuggestionSummary();
    } else if (resp.rowCount == 0){
      if (reset){
        this.reusable.openAlertMsg("No rows found","info");
        this.suggestionColl.data = [];
      }
      this.isFetched = false;
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
    this.getSubTotals();
    this.totalSuggestion = this.suggestionColl.data.length;
  }

  getSubTotals(){
    this.subTotal['facts'] = 0;
    this.subTotal['maps'] = 0;
    this.subTotal['contacts'] = 0;
    this.subTotal['tasks'] = 0;
    this.subTotal.attachment  = 0;
    this.suggestionColl.data.map(x=>{
      this.subTotal.facts += Number(x.facts);
      this.subTotal.maps += Number(x.maps);
      this.subTotal.contacts += Number(x.contacts);
      this.subTotal.tasks += Number(x.tasks);
      this.subTotal.attachment += Number(x.attachment);
    });
  }

  async getSuggestionSummary(){
    let resp = await this.authService.getSuggestionSummary();
    if (resp.success){
      if (resp.rowCount > 0){
        let summary = resp.result[0];
        this.suggestionSummary = {total:summary.suggestions,active:summary.active,completed:summary.completed, beyondDue:summary.beyond_due};
      } else {
        this.suggestionSummary = {total:0,active:0,completed:0, beyondDue:0};
      }
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  async deleteSuggestion(element){
    let msg = "Please confirm the deletion of Suggession "+element.name+" (id:"+element.id+"). This will delete all facts, maps, tasks and contacts for this suggestion.";
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
      suggestion_id: element.id,
      file_list: element.attachment_json == undefined ? [] : element.attachment_json,
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.delSuggestion({param:encrypted});
    if (resp.success){
      this.reusable.openAlertMsg(resp.message,"info");
      this.getSuggestions(this.filterValue, this.whereFilter, null, null);
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  toFactScreen(element){
    sessionStorage.setItem("suggestionRef",JSON.stringify(element));
    this.router.navigate(['facts']);
  }

  toMapScreen(element){
    sessionStorage.setItem("suggestionRef",JSON.stringify(element));
    this.router.navigate(['map']);
  }

  toTaskScreen(element){
    sessionStorage.setItem("suggestionRef",JSON.stringify(element));
    sessionStorage.setItem("myTaskOnly","false");
    this.router.navigate(['tasks']);
  }

  toMyTaskScreen(){
    sessionStorage.setItem("suggestionRef",null);
    sessionStorage.setItem("myTaskOnly","true");
    this.router.navigate(['tasks']);
  }
  
  toContactScreen(element){
    sessionStorage.setItem("suggestionRef",JSON.stringify(element));
    this.router.navigate(['contacts']);
  }
}

/** Key-Result (Suggestion) ADD/Edit Dialog */
@Component({
  selector: 'suggestion-addedit-dialog',
  templateUrl: 'suggestion-addedit-dialog.html',
})
export class SuggestionAddeditDialog implements OnInit {
  btnDisable = false;
  isLoading: boolean;
  modCode: string;
  form: FormGroup;
  name: string;
  desc: string;
  startDate =  moment();
  endDate = moment();
  isActive: boolean;
  isCompleted: boolean;
  project_code: string;
  projectsColl = [];
  owner_id: number;
  ownersColl = [];
  titleIcon: string;
  title: string;
  showDownloadIcon: boolean;
  showSave:boolean = true;
  uploader;
  attachmentList = [];
  suggestionId: number;
  uploaderQLength: number;
  fileList = [];
  removedFileList = [];

  constructor(
    public dialogRef: MatDialogRef<SuggestionAddeditDialog>,
    @Inject(MAT_DIALOG_DATA) public data: SuggestionClass,
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
    this.getUserProjects();
    
    if (this.data.id == undefined) {
      this.titleIcon = "opacity"
      this.title = "Add Key Result";
    } else {
      this.titleIcon = "edit"
      this.title = "Edit Key Result ("+ this.data.id +")";
    }
    let dt = new Date();
    this.name = this.data.name;
    this.desc = this.data.description;
    this.startDate = this.data.start_date == undefined ? moment(new Date(dt.getFullYear(),dt.getMonth(), dt.getDate())) : moment(this.data.start_date);
    this.endDate = this.data.end_date == undefined ? moment(new Date(dt.getFullYear(), dt.getMonth()+4, dt.getDate())) : moment(this.data.end_date);
    this.isActive = this.data.is_active == undefined ? true : this.data.is_active;
    this.isCompleted = this.data.is_completed == undefined ? false : this.data.is_completed;
    this.project_code = this.data.project_code;
    this.owner_id = this.data.owner_id;
    if (this.data.attachment.length > 0){
      this.fileList = JSON.parse(JSON.stringify(this.data.attachment)); //this will remove the reference to the parent data.
    }
    this.createForm();
    this.uploader = this.authService.fnUploader();
    //on upload uploads the file and getting the response back. 
    this.uploader.onCompleteItem = (item:any,response:any, status:any, headers:any) =>{
      let resp = JSON.parse(response);
      resp["suggestion_id"] = Number(this.suggestionId);
      this.attachmentList.push(resp);
      item.remove();
      if (this.uploaderQLength == this.attachmentList.length){
        this.saveUploadedReference();
      }
    }
  }

  async getUserProjects(){
    let param = {
      //list_group: 'Project Type'
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.getUserProjects({param:encrypted});
    if (resp.success){
      if (resp.rowCount > 0){
        let decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
        this.projectsColl = decryptedRows;
        if (this.data.id != undefined){
          let idx = this.projectsColl.findIndex(x => x.project_code === this.data.project_code);
          if (idx != -1){
            this.form.get("FormProjectCode").setValue(this.projectsColl[idx]);
            this.clearOnProjectSelection();
          }
        } else {
          // select the first item as default.
          //this.form.get("FormProject").setValue(this.projectsColl[0]);
        }
      }
    }
  }

  clearOnProjectSelection() {
    this.ownersColl = [];
    this.form.get("FormOwner").setValue(null);
    this.getOwnerList();
  }


  async getOwnerList(){
    let param = {
      project_code: this.form.get("FormProjectCode").value ? this.form.get("FormProjectCode").value.project_code : null
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.getProjectUsers({param:encrypted});
    if (resp.success){
      if (resp.rowCount > 0){
        let decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
        this.ownersColl = decryptedRows;
        if (this.data.id != undefined){
          let idx = this.ownersColl.findIndex(x => x.id === this.data.owner_id);
          if (idx != -1){
            this.form.get("FormOwner").setValue(this.ownersColl[idx]);
          }
        }
      }
    }
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
      suggestion_id: this.suggestionId,
      attachment: JSON.stringify(this.attachmentList)
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    await this.authService.updSuggestionAttachRef({param:encrypted});
    this.closeWithReturn();
  }

  createForm(){
    this.form = this.formBuilder.group({
     Name:[this.name, Validators.compose([
       Validators.required,
       this.noWhitespaceValidator
     ])],
     Desc:[this.desc],
     FormStartDate: [this.startDate, Validators.compose([Validators.required])],
     FormEndDate: [this.endDate, Validators.compose([Validators.required])],
     IsActive: [this.isActive],
     IsCompleted: [this.isCompleted],
     FormProjectCode: [this.project_code, Validators.compose([Validators.required])],
     FormOwner: [this.owner_id, Validators.compose([Validators.required])]
   });
  }

  public noWhitespaceValidator(control) {
    const isWhitespace = (control.value || '').trim().length === 0;
    const isValid = !isWhitespace;
    return isValid ? null : { 'whitespace': true };
  }

  getErrorMessage(control) {
    let msg ='';
    msg += control.hasError('required') ? 'You must enter a value' :'';
    msg += control.hasError('invalidInput') ? 'End date Cannot be less than start date' : '';
    msg += control.hasError('whitespace') ? 'Name cannot be empty or with white spaces only' : '';
    return msg;
  }

  onClose(): void {
    this.dialogRef.close();
  }

  closeWithReturn(): void {
    this.dialogRef.close(this.data);
  }
  
  async addUpdateSuggestion(){ 
    let param = {};
    if (this.form.valid){
      this.isLoading = true;
      param = {
        id: this.data.id,
        name: this.form.get('Name').value.trim(),
        description: this.form.get('Desc').value.trim(),
        start_date: this.form.get('FormStartDate').value.format(),
        end_date: this.form.get('FormEndDate').value.format(),
        is_active: this.form.get('IsActive').value,
        is_completed: this.form.get('IsCompleted').value,
        project_code: this.form.get('FormProjectCode').value.project_code,
        owner_id: this.form.get('FormOwner').value.id,
        removed_file_list: this.removedFileList
      }
      let encrypted = this.authService.encrypt(JSON.stringify(param));
      let resp;
      if (this.data.id == undefined){
        resp = await this.authService.addSuggestion({param:encrypted});
        if (resp.success){
          this.suggestionId = resp.result[0].id;
        }
      } else {
        resp = await this.authService.updSuggestion({param:encrypted});
        if (resp.success){
          this.suggestionId = Number(this.data.id);
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
          this.uploader['options']['headers'][1].value = this.suggestionId;
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

