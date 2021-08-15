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

export interface FactClass {
  id: number,
  suggestion_id: number,
  name: string,
  description: string,
  fact_type: number,
  fact_type_name: string,
  uom: number,
  uom_name:string,
  value: number,
  attachment: any,
}

@Component({
  selector: 'app-facts',
  templateUrl: './facts.component.html',
  styleUrls: ['./facts.component.css']
})
export class FactsComponent implements OnInit {
  @ViewChild(CdkScrollable, { static: true }) virtualScroll: CdkScrollable;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  
  private screenChangeEvent = new Subject();
  private filterEventSub = new Subject();

  fact : FactClass; 
  factsColl = new MatTableDataSource([]);
  screenParam: {height:number, width:number};
  isLoading = false;
  cardTitle:string;
  offset:number = 0;
  limit:number = 20;
  isFetched:boolean = false;
  attachmentList = [];

  tableWidth: number;
  factSummary: {total:number; active:number; completed:number; beyondDue:number};
  setIntervalId;
  screenSubscribe;
  suggestionRef;

  handleScroll = (scrolled: boolean, filterVal) => {
    if (scrolled) {
      this.offset += this.limit; 
      this.getFacts(filterVal, this.offset, this.limit);
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
    this.suggestionRef = JSON.parse(sessionStorage.getItem("suggestionRef"));
    if (this.suggestionRef == undefined){
      this.router.navigate(["home"]);
    }
    this.screenSubscribe = this.authService.screenChange.subscribe(screen => {
      this.screenParam = {height:screen["height"], width:screen["width"]};
      let { width, height } = this.getFactGridWidth();
      this.tableWidth = width-60-35;
    });
    this.screenChangeEvent
    .pipe(debounceTime(1000))
    .subscribe(e => {
      let { width, height } = this.getFactGridWidth();
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
      console.log(e, this.factsColl);
      if (this.factsColl['_renderData'].value.length < this.limit && this.isFetched){
        this.handleScroll(this.isFetched, e);
      }
    })
    this.cardTitle = "Facts for Suggestion: "+this.suggestionRef.name+" (id:"+this.suggestionRef.id+")";
    this.getFacts(null);
    this.setIntervalId = setInterval(()=>{this.cd.detectChanges();},2000);  
  }

  applyFilter(filterValue) {
    // const filterValue = (event.target as HTMLInputElement).value;
    console.log(filterValue);
    this.factsColl.filter = filterValue.trim().toLowerCase();
    this.filterEventSub.next(filterValue);
  }

  private getFactGridWidth() {
    let element = document.getElementById("facts-grid");
    let positionInfo = element.getBoundingClientRect();
    let height = positionInfo.height;
    let width = positionInfo.width;
    return { width, height };
  }

  openModuleEdit(row){
    this.fact = {id: row.id, suggestion_id:row.suggestion_id, name: row.name, description: row.description, fact_type: row.fact_type, fact_type_name: row.fact_type_name, uom: row.uom, uom_name: row.uom_name, value:row.value, attachment:row.attachment_json == undefined ? [] : row.attachment_json};
    this.openModuleDialog(this.fact);
  }

  openModuleAdd(){
    this.fact = {id:null, suggestion_id:this.suggestionRef.id, name: null, description: null, fact_type: null, fact_type_name: null, uom: null, uom_name:null, value:null, attachment: []};
    this.openModuleDialog(this.fact);
  }

  openModuleDialog(data:any): void {
    const dialogRef = this.dialog.open(FactAddeditDialog, {
      width: '60%',
      data: data
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result != undefined) {
        this.getFacts(null);
      }
    });
  }

  displayedColumns = ['edit','delete',"name", "fact_type_name", "uom_name","value","attachment","created_on"];
  async getFacts(filterValue:any, offset?:number, limit?:number){
    this.isLoading = true;
    let reset = false;
    if (offset == undefined) {offset = this.offset = 0; reset = true; } 
    if (limit == undefined) limit = this.limit;
    let param = {
      suggestion_id: this.suggestionRef.id,
      offset: offset,
      limit: limit
    }
    let resp = await this.authService.getFacts(param);
    this.isLoading = false;
    let decryptedRows;
    if (resp.success && resp.rowCount > 0){
      this.isFetched = true;
      decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
      if(this.factsColl.data.length == 0 || reset){
        this.factsColl = new MatTableDataSource(decryptedRows);
      } else {
        let newData = this.factsColl.data.concat(decryptedRows);
        this.factsColl = new MatTableDataSource(newData);
        if(filterValue != undefined){
          console.log(filterValue);
          this.applyFilter(filterValue);
        }
      }
      this.factsColl.sort = this.sort;
    } else if (resp.rowCount == 0){
      if (reset){
        this.reusable.openAlertMsg("No rows found","info");
        this.factsColl.data = [];
      }
      this.isFetched = false;
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  async deleteFact(element){
    let msg = "Please confirm the deletion of Fact "+element.name+" (id:"+element.id+")";
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
      fact_id: element.id,
      file_list: element.attachment_json == undefined ? [] : element.attachment_json,
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.delFact({param:encrypted});
    if (resp.success){
      this.reusable.openAlertMsg(resp.message,"info");
      this.getFacts(null);
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  goBack(){
    sessionStorage.removeItem("suggestionRef");
    this.router.navigate(['home']);
  }
}

/** Fact ADD/Edit Dialog */
@Component({
  selector: 'facts-addedit-dialog',
  templateUrl: 'facts-addedit-dialog.html',
  styleUrls: ['./facts.component.css']
})
export class FactAddeditDialog implements OnInit {
  btnDisable = false;
  isLoading: boolean;
  form: FormGroup;
  name: string;
  desc: string;
  factType:number;
  factTypeArr:{id:number; list_name:string};
  uom:number;
  uomTypeArr:{id:number; list_name:string};
  value: number;
  titleIcon: string;
  title: string;
  uploader;
  attachmentList = [];
  factId: number;
  uploaderQLength: number;
  fileList = [];
  removedFileList = [];
  factTypeColl = [];
  uomColl = [];

  constructor(
    public dialogRef: MatDialogRef<FactAddeditDialog>,
    @Inject(MAT_DIALOG_DATA) public data: FactClass,
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
    this.getFactType();
    this.getUOMType();
    if (this.data.id == undefined) {
      this.titleIcon = "list"
      this.title = "Add Fact";
    } else {
      this.titleIcon = "edit"
      this.title = "Edit Fact ("+ this.data.id +")";
    }
    this.name = this.data.name;
    this.desc = this.data.description;
    this.factType = this.data.fact_type;
    this.uom = this.data.uom;
    this.value = this.data.value;
    if (this.data.attachment.length > 0){
      this.fileList = JSON.parse(JSON.stringify(this.data.attachment)); //this will remove the reference to the parent data.
    }
    this.createForm();
    this.uploader = this.authService.fnUploader();
    //on upload uploads the file and getting the response back. 
    this.uploader.onCompleteItem = (item:any,response:any, status:any, headers:any) =>{
      let resp = JSON.parse(response);
      resp["fact_id"] = Number(this.factId);
      this.attachmentList.push(resp);
      item.remove();
      if (this.uploaderQLength == this.attachmentList.length){
        this.saveUploadedReference();
      }
    }
  }

  async getFactType(){
    let param={
      list_group: 'fact'
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.getTypes({param:encrypted});
    if (resp.success){
      if (resp.rowCount > 0){
        let decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
        this.factTypeColl = decryptedRows;
        if (this.data.id != undefined){
          let idx = this.factTypeColl.findIndex(x => x.id === this.data.fact_type);
          if (idx != -1){
            this.form.get("FactType").setValue(this.factTypeColl[idx]);
          }
        }
      }
    }
  }

  async getUOMType(){
    let param={
      list_group: 'UOM'
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.getTypes({param:encrypted});
    if (resp.success){
      if (resp.rowCount>0){
        let decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
        this.uomColl = decryptedRows;
        if (this.data.id != undefined){
          let idx = this.uomColl.findIndex(x => x.id === this.data.uom);
          if (idx != -1){
            this.form.get("Uom").setValue(this.uomColl[idx]);
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
      fact_id: this.factId,
      attachment: JSON.stringify(this.attachmentList)
    }
    console.log(param);
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    await this.authService.updFactAttachRef({param:encrypted});
    this.closeWithReturn();
  }

  createForm(){
    this.form = this.formBuilder.group({
     Name:[this.name, Validators.compose([
       Validators.required,
       this.noWhitespaceValidator,
     ])],
     Desc:[this.desc],
     FactType: [this.factTypeColl[0], Validators.compose([Validators.required])],
     Uom: [this.uomColl[0], Validators.compose([Validators.required])],
     Value: [this.value, Validators.compose([
      Validators.max(2147483647),
      Validators.min(-2147483647),
      this.validateInt
    ])]
   });	
  }

  validateInt(controls){
		const reqExp = new RegExp(/^[0-9]*$/);
		if (reqExp.test(controls.value)){
			return null;
		} else{
			return {'validateInt' : true};
		}
  }

  public noWhitespaceValidator(control) {
    const isWhitespace = (control.value || '').trim().length === 0;
    const isValid = !isWhitespace;
    return isValid ? null : { 'whitespace': true };
  }

  getErrorMessage(control, controlName) {
    let msg ='';
    msg += control.hasError('required') ? 'You must enter a value ' :'';
    if (controlName =='Value') {msg += (control.errors != undefined && (control.errors.min || control.errors.max)) ? 'Min -2147483647 & Max 2147483647 ': ''}
    msg += control.hasError('validateInt') ? 'Only numeric value is allowed ' :'';
    msg += control.hasError('whitespace') ? 'Name cannot be empty or white spaces only' : '';
    return msg;
  }

  onClose(): void {
    this.dialogRef.close();
  }

  closeWithReturn(): void {
    this.dialogRef.close(this.data);
  }
  
  async addUpdateFact(){ 
    let param = {};
    if (this.form.valid){
      this.isLoading = true;
      param = {
        id: this.data.id,
        suggestion_id: this.data.suggestion_id,
        name: this.form.get('Name').value.trim(),
        description: this.form.get('Desc').value.trim(),
        fact_type: this.form.get('FactType').value.id,
        uom: this.form.get('Uom').value.id,
        value: this.form.get('Value').value,
        removed_file_list: this.removedFileList
      }
      console.log(param);
      let encrypted = this.authService.encrypt(JSON.stringify(param));
      let resp;
      if (this.data.id == undefined){
        resp = await this.authService.addFact({param:encrypted});
        if (resp.success){
          this.factId = resp.result[0].id;
        }
      } else {
        resp = await this.authService.updFact({param:encrypted});
        if (resp.success){
          this.factId = Number(this.data.id);
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
          this.uploader['options']['headers'][1].value = this.data.suggestion_id+"/facts/"+this.factId;
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
