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

export interface MapClass {
  id: number,
  suggestion_id: number,
  name: string,
  description: string,
  map_type: number,
  map_type_name: string,
  uom: number,
  uom_name:string,
  value: number,
  attachment: any,
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  @ViewChild(CdkScrollable, { static: true }) virtualScroll: CdkScrollable;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  
  private screenChangeEvent = new Subject();
  private filterEventSub = new Subject();

  map : MapClass; 
  mapColl = new MatTableDataSource([]);
  screenParam: {height:number, width:number};
  isLoading = false;
  cardTitle:string;
  offset:number = 0;
  limit:number = 20;
  isFetched:boolean = false;
  attachmentList = [];

  tableWidth: number;
  mapSummary: {total:number; active:number; completed:number; beyondDue:number};
  setIntervalId;
  screenSubscribe;
  suggestionRef;

  handleScroll = (scrolled: boolean, filterVal) => {
    if (scrolled) {
      this.offset += this.limit; 
      this.getMap(filterVal, this.offset, this.limit);
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
      let { width, height } = this.getMapGridWidth();
      this.tableWidth = width-60-35;
    });
    this.screenChangeEvent
    .pipe(debounceTime(1000))
    .subscribe(e => {
      let { width, height } = this.getMapGridWidth();
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
      if (this.mapColl['_renderData'].value.length < this.limit && this.isFetched){
        this.handleScroll(this.isFetched, e);
      }
    })
    this.cardTitle = "Maps for Suggestion: "+this.suggestionRef.name+" (id:"+this.suggestionRef.id+")";
    this.getMap(null);
    this.setIntervalId = setInterval(()=>{this.cd.detectChanges();},2000);  
  }

  applyFilter(filterValue) {
    this.mapColl.filter = filterValue.trim().toLowerCase();
    this.filterEventSub.next(filterValue);
  }

  private getMapGridWidth() {
    let element = document.getElementById("map-grid");
    let positionInfo = element.getBoundingClientRect();
    let height = positionInfo.height;
    let width = positionInfo.width;
    return { width, height };
  }

  openModuleEdit(row){
    this.map = {id: row.id, suggestion_id:row.suggestion_id, name: row.name, description: row.description, map_type: row.map_type, map_type_name: row.map_type_name, uom: row.uom, uom_name: row.uom_name, value:row.value, attachment:row.attachment_json == undefined ? [] : row.attachment_json};
    this.openModuleDialog(this.map);
  }

  openModuleAdd(){
    this.map = {id:null, suggestion_id:this.suggestionRef.id, name: null, description: null, map_type: null, map_type_name: null, uom: null, uom_name:null, value:null, attachment: []};
    this.openModuleDialog(this.map);
  }

  openModuleDialog(data:any): void {
    const dialogRef = this.dialog.open(MapAddeditDialog, {
      width: '60%',
      data: data
    });
    dialogRef.afterClosed().subscribe(result => {
      sessionStorage.removeItem("suggestionRef");
      if(result != undefined) {
        this.getMap(null);
      }
    });
  }

  displayedColumns = ['edit','delete',"name", "map_type_name", "uom_name","value","attachment","created_on"];
  async getMap(filterValue:any, offset?:number, limit?:number){
    this.isLoading = true;
    let reset = false;
    if (offset == undefined) {offset = this.offset = 0; reset = true; } 
    if (limit == undefined) limit = this.limit;
    let param = {
      suggestion_id: this.suggestionRef.id,
      offset: offset,
      limit: limit
    }
    let resp = await this.authService.getMap(param);
    this.isLoading = false;
    let decryptedRows;
    if (resp.success && resp.rowCount > 0){
      this.isFetched = true;
      decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
      if(this.mapColl.data.length == 0 || reset){
        this.mapColl = new MatTableDataSource(decryptedRows);
      } else {
        let newData = this.mapColl.data.concat(decryptedRows);
        this.mapColl = new MatTableDataSource(newData);
        if(filterValue != undefined){
          this.applyFilter(filterValue);
        }
      }
      this.mapColl.sort = this.sort;
    } else if (resp.rowCount == 0){
      if (reset){
        this.reusable.openAlertMsg("No rows found","info");
        this.mapColl.data = [];
      }
      this.isFetched = false;
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  async deleteMap(element){
    let msg = "Please confirm the deletion of map "+element.name+" (id:"+element.id+")";
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
      map_id: element.id,
      file_list: element.attachment_json == undefined ? [] : element.attachment_json,
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.delMap({param:encrypted});
    if (resp.success){
      this.reusable.openAlertMsg(resp.message,"info");
      this.getMap(null);
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  goBack(){
    sessionStorage.removeItem("suggestionRef");
    this.router.navigate(['home']);
  }
}

/** Map ADD/Edit Dialog */
@Component({
  selector: 'map-addedit-dialog',
  templateUrl: 'map-addedit-dialog.html',
  styleUrls: ['./map.component.css']
})
export class MapAddeditDialog implements OnInit {
  isLoading: boolean;
  form: FormGroup;
  name: string;
  desc: string;
  mapType:number;
  uom:number;
  value: number;
  titleIcon: string;
  title: string;
  uploader;
  attachmentList = [];
  mapId: number;
  uploaderQLength: number;
  fileList = [];
  removedFileList = [];
  mapTypeColl = [];
  uomColl = [];

  constructor(
    public dialogRef: MatDialogRef<MapAddeditDialog>,
    @Inject(MAT_DIALOG_DATA) public data: MapClass,
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
    this.getMapType();
    this.getUOMType();
    if (this.data.id == undefined) {
      this.titleIcon = "settings_input_component"
      this.title = "Add Map";
    } else {
      this.titleIcon = "edit"
      this.title = "Edit Map ("+ this.data.id +")";
    }
    this.name = this.data.name;
    this.desc = this.data.description;
    this.mapType = this.data.map_type;
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
      resp["map_id"] = Number(this.mapId);
      this.attachmentList.push(resp);
      item.remove();
      if (this.uploaderQLength == this.attachmentList.length){
        this.saveUploadedReference();
      }
    }
  }

  async getMapType(){
    let param={
      list_group: 'map'
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.getTypes({param:encrypted});
    if (resp.success){
      if (resp.rowCount > 0){
        let decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
        this.mapTypeColl = decryptedRows;
        if (this.data.id != undefined){
          let idx = this.mapTypeColl.findIndex(x => x.id === this.data.map_type);
          if (idx != -1){
            this.form.get("MapType").setValue(this.mapTypeColl[idx]);
          }
        } else {
          this.form.get("MapType").setValue(this.mapTypeColl[0]);
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
      map_id: this.mapId,
      attachment: JSON.stringify(this.attachmentList)
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    await this.authService.updMapAttachRef({param:encrypted});
    this.closeWithReturn();
  }

  createForm(){
    this.form = this.formBuilder.group({
     Name:[this.name, Validators.compose([
       Validators.required,
       this.noWhitespaceValidator,
     ])],
     Desc:[this.desc],
     MapType: [this.mapTypeColl[0], Validators.compose([Validators.required])],
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
  
  async addUpdateMap(){ 
    let param = {};
    if (this.form.valid){
      this.isLoading = true;
      param = {
        id: this.data.id,
        suggestion_id: this.data.suggestion_id,
        name: this.form.get('Name').value.trim(),
        description: this.form.get('Desc').value.trim(),
        map_type: this.form.get('MapType').value.id,
        uom: this.form.get('Uom').value.id,
        value: this.form.get('Value').value,
        removed_file_list: this.removedFileList
      }
      let encrypted = this.authService.encrypt(JSON.stringify(param));
      let resp;
      if (this.data.id == undefined){
        resp = await this.authService.addMap({param:encrypted});
        if (resp.success){
          this.mapId = resp.result[0].id;
        }
      } else {
        resp = await this.authService.updMap({param:encrypted});
        if (resp.success){
          this.mapId = Number(this.data.id);
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
          this.uploader['options']['headers'][1].value = this.data.suggestion_id+"/map/"+this.mapId;
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
