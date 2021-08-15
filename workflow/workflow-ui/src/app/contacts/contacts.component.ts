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

export interface ContactClass {
  id: number,
  suggestion_id: number,
  name: string,
  notes: string,
  ministry: number,
  ministry_name: string,
  attachment_json: any,
}

export interface ContactUpdateClass {
  id: number,
  name: string,
  notes: string
}

export interface ContactHistoryClass {
  contact_id: number,
  name: string,
}

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.css']
})
export class ContactsComponent implements OnInit {
  @ViewChild(CdkScrollable, { static: true }) virtualScroll: CdkScrollable;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  
  private screenChangeEvent = new Subject();
  private filterEventSub = new Subject();

  contact : ContactClass; 
  contactsColl = new MatTableDataSource([]);
  contactUpdate: ContactUpdateClass;
  contactHistory: ContactHistoryClass;
  screenParam: {height:number, width:number};
  isLoading = false;
  cardTitle:string;
  attachmentList = [];

  tableWidth: number;
  contactSummary: {total:number; active:number; completed:number; beyondDue:number};
  setIntervalId;
  screenSubscribe;
  suggestionRef;

  offset:number = 0;
  limit:number = 20;
  isFetched:boolean = false;
  handleScroll = (scrolled: boolean, filterVal) => {
    if (scrolled) {
      this.offset += this.limit; 
      this.getContacts(filterVal, this.offset, this.limit);
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
    this.suggestionRef = JSON.parse(sessionStorage.getItem("suggestionRef"));
    if (this.suggestionRef == undefined){
      this.router.navigate(["home"]);
    }
    this.screenSubscribe = this.authService.screenChange.subscribe(screen => {
      this.screenParam = {height:screen["height"], width:screen["width"]};
      let { width, height } = this.getContactGridWidth();
      this.tableWidth = width-60-35;
    });
    this.screenChangeEvent
    .pipe(debounceTime(1000))
    .subscribe(e => {
      let { width, height } = this.getContactGridWidth();
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
      if (this.contactsColl['_renderData'].value.length < this.limit && this.isFetched){
        this.handleScroll(this.isFetched, e);
      }
    })
    this.cardTitle = "Contacts for Key Results: "+this.suggestionRef.name+" (id:"+this.suggestionRef.id+")";
    this.getContacts(null);
    this.setIntervalId = setInterval(()=>{this.cd.detectChanges();},2000);  
  }

  applyFilter(filterValue) {
    this.contactsColl.filter = filterValue.trim().toLowerCase();
    this.filterEventSub.next(filterValue);
  }

  private getContactGridWidth() {
    let element = document.getElementById("contacts-grid");
    let positionInfo = element.getBoundingClientRect();
    let height = positionInfo.height;
    let width = positionInfo.width;
    return { width, height };
  }

  openContactHistory(row){
    this.contactHistory = {contact_id: row.id,name: row.name};
    this.openContactHistoryDialog(this.contactHistory);
  }

  openContactHistoryDialog(data){
    const dialogRef = this.dialog.open(ContactHistoryDialog, {
      width: '60%',
      data: data
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result != undefined) {
        let idx = this.contactsColl.data.findIndex(x => x.id === data.contact_id);
        if (idx != -1){
          this.contactsColl.data[idx].notes_count = Number(this.contactsColl.data[idx].notes_count)-Number(result);
        }
      }
    });
  }

  openModuleEdit(row){
    this.contact = {id: row.id, suggestion_id:row.suggestion_id, name: row.name, notes: row.notes, ministry: row.ministry, ministry_name: row.ministry_name, attachment_json:row.attachment_json == undefined ? [] : row.attachment_json};
    this.openModuleDialog(this.contact);
  }

  openUpdateContactStatus(row){
    this.contactUpdate = {id: row.id, name: row.name, notes: row.notes};
    this.openUpdateContactDialog(this.contactUpdate);
  }

  openUpdateContactDialog(data:any): void {
    const dialogRef = this.dialog.open(ContactUpdateDialog, {
      width: '40%',
      data: data
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result != undefined) {
        let idx = this.contactsColl.data.findIndex(x => x.id === result.id);
        console.log(result, this.contactsColl.data[idx] );
        if (idx != -1){
          this.contactsColl.data[idx].notes_count = Number(this.contactsColl.data[idx].notes_count)+1;
        }
      }
    });
  }

  openModuleAdd(){
    this.contact = {id:null, suggestion_id:this.suggestionRef.id, name: null, notes: null, ministry: null, ministry_name: null, attachment_json: []};
    this.openModuleDialog(this.contact);
  }

  openModuleDialog(data:any): void {
    const dialogRef = this.dialog.open(ContactAddeditDialog, {
      width: '60%',
      data: data
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result != undefined) {
        this.getContacts(null);
      }
    });
  }

  displayedColumns = ['edit','delete',"history","name", "ministry_name","notes","add_status","attachment","created_on"];
  async getContacts(filterValue:any, offset?:number, limit?:number){
    this.isLoading = true;
    let reset = false;
    if (offset == undefined) {offset = this.offset = 0; reset = true; } 
    if (limit == undefined) limit = this.limit;
    let param = {
      suggestion_id: this.suggestionRef.id,
      offset: offset,
      limit: limit
    }
    let resp = await this.authService.getContacts(param);
    this.isLoading = false;
    let decryptedRows;
    if (resp.success && resp.rowCount > 0){
      this.isFetched = true;
      decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
      if(this.contactsColl.data.length == 0 || reset){
        this.contactsColl = new MatTableDataSource(decryptedRows);
      } else {
        let newData = this.contactsColl.data.concat(decryptedRows);
        this.contactsColl = new MatTableDataSource(newData);
        if(filterValue != undefined){
          this.applyFilter(filterValue);
        }
      }
      this.contactsColl.sort = this.sort;
    } else if (resp.rowCount == 0){
      if (reset){
        this.reusable.openAlertMsg("No rows found","info");
        this.contactsColl.data = [];
      }
      this.isFetched = false;
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  async deleteContact(element){
    let msg = "Please confirm the deletion of Contact "+element.name+" (id:"+element.id+")";
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
      contact_id: element.id,
      file_list: element.attachment_json == undefined ? [] : element.attachment_json,
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.delContact({param:encrypted});
    if (resp.success){
      this.reusable.openAlertMsg(resp.message,"info");
      this.getContacts(null);
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  goBack(){
    sessionStorage.removeItem("suggestionRef");
    this.router.navigate(['home']);
  }
}

/** Contact ADD/Edit Dialog */
@Component({
  selector: 'contacts-addedit-dialog',
  templateUrl: 'contacts-addedit-dialog.html',
  styleUrls: ['./contacts.component.css']
})
export class ContactAddeditDialog implements OnInit {
  btnDisable = false;
  isLoading: boolean;
  form: FormGroup;
  name: string;
  notes: string;
  ministry: number;
  titleIcon: string;
  title: string;
  uploader;
  attachmentList = [];
  contactId: number;
  uploaderQLength: number;
  fileList = [];
  removedFileList = [];
  ministryColl = [];

  constructor(
    public dialogRef: MatDialogRef<ContactAddeditDialog>,
    @Inject(MAT_DIALOG_DATA) public data: ContactClass,
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
    this.getContactType();
    if (this.data.id == undefined) {
      this.titleIcon = "people"
      this.title = "Add Contact";
    } else {
      this.titleIcon = "edit"
      this.title = "Edit Contact ("+ this.data.id +")";
    }
    this.name = this.data.name;
    this.notes = this.data.notes;
    this.ministry = this.data.ministry;
    if (this.data.attachment_json.length > 0){
      this.fileList = JSON.parse(JSON.stringify(this.data.attachment_json)); //this will remove the reference to the parent data.
    }
    this.createForm();
    this.uploader = this.authService.fnUploader();
    //on upload uploads the file and getting the response back. 
    this.uploader.onCompleteItem = (item:any,response:any, status:any, headers:any) =>{
      let resp = JSON.parse(response);
      resp["contact_id"] = Number(this.contactId);
      this.attachmentList.push(resp);
      item.remove();
      if (this.uploaderQLength == this.attachmentList.length){
        this.saveUploadedReference();
      }
    }
  }

  async getContactType(){
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
      contact_id: this.contactId,
      attachment: JSON.stringify(this.attachmentList)
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    await this.authService.updContactAttachRef({param:encrypted});
    this.closeWithReturn();
  }

  createForm(){
    this.form = this.formBuilder.group({
     Name:[this.name, Validators.compose([
       Validators.required,
       this.noWhitespaceValidator
      ])],
     Notes:[this.notes, Validators.compose([Validators.required])],
     Ministry: [this.ministryColl[0], Validators.compose([Validators.required])],
    });	
  }

  public noWhitespaceValidator(control) {
    const isWhitespace = (control.value || '').trim().length === 0;
    const isValid = !isWhitespace;
    return isValid ? null : { 'whitespace': true };
  }

  getErrorMessage(control, controlName) {
    let msg ='';
    msg += control.hasError('required') ? 'You must enter a value ' :'';
    msg += control.hasError('whitespace') ? 'Name cannot be empty or white spaces only ' : '';
    return msg;
  }

  onClose(): void {
    this.dialogRef.close();
  }

  closeWithReturn(): void {
    this.dialogRef.close(this.data);
  }
  
  async addUpdateContact(){ 
    let param = {};
    if (this.form.valid){
      this.isLoading = true;
      param = {
        id: this.data.id,
        suggestion_id: this.data.suggestion_id,
        name: this.form.get('Name').value.trim(),
        notes: this.form.get('Notes').value.trim(),
        ministry: this.form.get('Ministry').value.id,
        removed_file_list: this.removedFileList
      }
      let encrypted = this.authService.encrypt(JSON.stringify(param));
      let resp;
      if (this.data.id == undefined){
        resp = await this.authService.addContact({param:encrypted});
        if (resp.success){
          this.contactId = resp.result[0].id;
        }
      } else {
        resp = await this.authService.updContact({param:encrypted});
        if (resp.success){
          this.contactId = Number(this.data.id);
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
          this.uploader['options']['headers'][1].value = this.data.suggestion_id+"/contacts/"+this.contactId;
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
}

/** Contact Update Dialog */
@Component({
  selector: 'contacts-update-dialog',
  templateUrl: 'contacts-update-dialog.html',
  styleUrls: ['./contacts.component.css']
})
export class ContactUpdateDialog implements OnInit {
  btnDisable = false;
  isLoading: boolean;
  form: FormGroup;
  dateOfStatus = moment();
  titleIcon: string;
  title: string;
  contactId: number;
  localData:any;

  constructor(
    public dialogRef: MatDialogRef<ContactUpdateDialog>,
    @Inject(MAT_DIALOG_DATA) public data: ContactUpdateClass,
    private authService: AuthServiceService,
    private reusable: ReusableComponent,
    private formBuilder: FormBuilder,
  ) {}
  
  ngOnInit(){
    this.localData = JSON.parse(JSON.stringify(this.data)); //removing reference
    this.titleIcon = "assignment"
    this.title = "Update Contact Status for Contact "+this.localData.name+"("+this.localData.id+")";
    let dt = new Date();
    this.dateOfStatus = moment(new Date(dt.getFullYear(),dt.getMonth(), dt.getDate()));
    this.createForm();
  }

  createForm(){
    this.form = this.formBuilder.group({
      Notes: ['', Validators.compose([
        Validators.required,
        this.noWhitespaceValidator,
      ])],
      DateOfStatus: [this.dateOfStatus, Validators.compose([Validators.required])],
    });	
  }

  public noWhitespaceValidator(control) {
    const isWhitespace = (control.value || '').trim().length === 0;
    const isValid = !isWhitespace;
    return isValid ? null : { 'whitespace': true };
  }

  getErrorMessage(control, controlName) {
    let msg ='';
    msg += control.hasError('required') ? 'You must enter a value ' :'';
    msg += control.hasError('whitespace') ? 'Notes cannot be empty or white spaces only ' : '';
    return msg;
  }

  onClose(): void {
    this.dialogRef.close();
  }

  closeWithReturn(): void {
    this.dialogRef.close(this.data);
  }
  
  async addContactUpdate(){ 
    let param = {};
    if (this.form.valid){
      this.isLoading = true;
      param = {
        contact_id: this.localData.id,
        date_of_status: this.form.get('DateOfStatus').value.format(),
        notes: this.form.get('Notes').value
      }
      let encrypted = this.authService.encrypt(JSON.stringify(param));
      let resp;
      resp = await this.authService.addContactUpdate({param:encrypted});
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

/** Contact History Dialog */
@Component({
  selector: 'contacts-history-dialog',
  templateUrl: 'contacts-history-dialog.html',
  styleUrls: ['./contacts.component.css']
})
export class ContactHistoryDialog implements OnInit {

  @ViewChild(CdkScrollable, { static: true }) virtualScroll: CdkScrollable;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  private filterEventSub = new Subject();

  setIntervalId;
  contactHisColl = new MatTableDataSource([]);

  isLoading: boolean;
  titleIcon: string;
  title: string;
  localData:any;
  histDeletedCount:number = 0;
  offset:number = 0;
  limit:number = 20;
  isFetched:boolean = false;
  handleScroll = (scrolled: boolean, filterVal) => {
    if (scrolled) {
      this.offset += this.limit; 
      this.getContactHistory(filterVal, this.offset, this.limit);
    }
  }

  hasMore(){
    return this.isFetched;
  }

  constructor(
    public dialogRef: MatDialogRef<ContactHistoryDialog>,
    @Inject(MAT_DIALOG_DATA) public data: ContactHistoryClass,
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
    this.title = "History for Contact "+this.localData.name+"("+this.localData.contact_id+")";
    this.scrollDispatcher.scrolled(500)
    .pipe(filter(event => this.virtualScroll.measureScrollOffset('bottom') === 0))
    .subscribe(ele =>{
      if(this.hasMore())
        this.handleScroll(true, null);
      });
  
    this.filterEventSub.pipe(debounceTime(1000))
    .subscribe(e => {
      if (this.contactHisColl['_renderData'].value.length < this.limit && this.isFetched){
        this.handleScroll(this.isFetched, e);
      }
    })
    this.getContactHistory(null);
    this.setIntervalId = setInterval(()=>{this.cd.detectChanges();},2000);  
  }

  onClose(): void {
    this.dialogRef.close(this.histDeletedCount);
  }

  displayedColumns = ["delete","date_of_status", "notes", "created_on"];
  
  applyFilter(filterValue) {
    this.contactHisColl.filter = filterValue.trim().toLowerCase();
    this.filterEventSub.next(filterValue);
  }

  async getContactHistory(filterValue:any, offset?:number, limit?:number){
    this.isLoading = true;
    let reset = false;
    if (offset == undefined) {offset = this.offset = 0; reset = true; } 
    if (limit == undefined) limit = this.limit;
    let param = {
      contact_id: this.data.contact_id,
      offset: offset,
      limit: limit
    };
    let resp = await this.authService.getContactHistory(param);
    this.isLoading = false;
    let decryptedRows;
    if (resp.success && resp.rowCount > 0){
      this.isFetched = true;
      decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
      if(this.contactHisColl.data.length == 0 || reset){
        this.contactHisColl = new MatTableDataSource(decryptedRows);
      } else {
        let newData = this.contactHisColl.data.concat(decryptedRows);
        this.contactHisColl = new MatTableDataSource(newData);
        if(filterValue != undefined){
          this.applyFilter(filterValue);
        }
      }
      this.contactHisColl.sort = this.sort;      
    } else if (resp.rowCount == 0){
      if (reset){
        this.reusable.openAlertMsg("No rows found","info");
        this.contactHisColl.data = [];
      }
      this.isFetched = false;
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  async delContactUpdate(row){
    let param = {
      id: row.id
    }
    this.isLoading = true;
    let resp = await this.authService.delContactUpdate(param);
    this.isLoading = false;
    if (resp.success){
      this.histDeletedCount ++;
      this.reusable.openAlertMsg(resp.message, "info");
      this.getContactHistory(null);
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }
}

