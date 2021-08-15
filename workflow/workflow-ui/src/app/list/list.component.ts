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

export interface ListClass {
  id: number,
  list_name: string,
  description: string,
  list_group: string,
  is_deleted: Boolean,
  created_on: Date,
}

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css']
})

export class ListComponent implements OnInit {
  @ViewChild(CdkScrollable, { static: true }) virtualScroll: CdkScrollable;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  
  private screenChangeEvent = new Subject();
  private filterEventSub = new Subject();

  list : ListClass; 
  listColl = new MatTableDataSource([]);
  screenParam: {height:number, width:number};
  isLoading = false;
  cardTitle:string;
  offset:number = 0;
  limit:number = 20;
  isFetched:boolean = false;
  loggedInUserId:number;
  tableWidth: number;
  setIntervalId;
  screenSubscribe;

  handleScroll = (scrolled: boolean, filterVal) => {
    if (scrolled) {
      this.offset += this.limit; 
      this.getLists(filterVal, this.offset, this.limit);
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
      let { width, height } = this.getListGridWidth();
      this.tableWidth = width-60-35;
    });

    this.screenChangeEvent
    .pipe(debounceTime(1000))
    .subscribe(e => {
      let { width, height } = this.getListGridWidth();
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
      if (this.listColl['_renderData'].value.length < this.limit && this.isFetched){
        this.handleScroll(this.isFetched, e);
      }
    })
    this.cardTitle = "List Management";
    this.getLists(null);
    this.setIntervalId = setInterval(()=>{this.cd.detectChanges();},2000);  
  }

  applyFilter(filterValue) {
    this.listColl.filter = filterValue.trim().toLowerCase();
    this.filterEventSub.next(filterValue);
  }

  private getListGridWidth() {
    let element = document.getElementById("list-grid");
    let positionInfo = element.getBoundingClientRect();
    let height = positionInfo.height;
    let width = positionInfo.width;
    return { width, height };
  }

  openModuleEdit(row){
    this.list = {id: row.id, list_name: row.list_name, description: row.description, list_group: row.list_group, is_deleted: row.is_deleted, created_on: row.created_on};
    this.openModuleDialog(this.list);
  }

  openModuleAdd(){
    this.list = {id: null, list_name: null, description: null, list_group: null, is_deleted: false, created_on: null};
    this.openModuleDialog(this.list);
  }

  openModuleDialog(data:any): void {
    const dialogRef = this.dialog.open(ListAddeditDialog, {
      width: '50%',
      data: data
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result != undefined) {
        this.getLists(null);
      }
    });
  }

  displayedColumns = ["edit","delete","list_name", "description", "list_group","created_on"];
  async getLists(filterValue:any, offset?:number, limit?:number){
    this.isLoading = true;
    let reset = false;
    if (offset == undefined) {offset = this.offset = 0; reset = true; } 
    if (limit == undefined) limit = this.limit;
    let param = {
      offset: offset,
      limit: limit
    };
    let resp = await this.authService.getLists(param);
    this.isLoading = false;
    let decryptedRows;
    if (resp.success && resp.rowCount > 0){
      this.isFetched = true;
      decryptedRows = JSON.parse(this.authService.decrypt(resp.result));
      if(this.listColl.data.length == 0 || reset){
        this.listColl = new MatTableDataSource(decryptedRows);
      } else {
        let newData = this.listColl.data.concat(decryptedRows);
        this.listColl = new MatTableDataSource(newData);
        if(filterValue != undefined){
          this.applyFilter(filterValue);
        }
      }
      this.listColl.sort = this.sort;
    } else if (resp.rowCount == 0){
      if (reset){
        this.reusable.openAlertMsg("No rows found","info");
        this.listColl.data = [];
      }
      this.isFetched = false;
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  async delUndelList(element, isDel){
    let msg = "Please confirm the deletion of List "+element.list_name+" (id:"+element.id+")";
    let confirmMessage = confirm(msg);
    if (!confirmMessage) return;
    let param = {
      id: element.id,
      is_deleted: isDel=="undelete" ? false : true
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.delUndelList({param:encrypted});
    if (resp.success){
      this.reusable.openAlertMsg(resp.message,"info");
      this.getLists(null);
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }
}

/** List ADD/Edit Dialog */
@Component({
  selector: 'list-addedit-dialog',
  templateUrl: 'list-addedit-dialog.html',
  styleUrls: ['./list.component.css']
})
export class ListAddeditDialog implements OnInit {
  btnDisable = false;
  isLoading: boolean;
  form: FormGroup;
  listName: string;
  description: string;
  listGroup: string;
  createdOn: Date;
  isDeleted: Boolean;
  titleIcon: string;
  title: string;
  userId: number;
  hide = true;
  listGroupColl = ["fact","map","UOM","department","Task Type","Project Type"];

  constructor(
    public dialogRef: MatDialogRef<ListAddeditDialog>,
    @Inject(MAT_DIALOG_DATA) public data: ListClass,
    private authService: AuthServiceService,
    private reusable: ReusableComponent,
    private formBuilder: FormBuilder,
  ) {}
    
  ngOnInit(){
    if (this.data.id == undefined) {
      this.titleIcon = "list"
      this.title = "Add List Item";
    } else {
      this.titleIcon = "edit"
      this.title = "Edit List (id:"+ this.data.id +")";
    }
    this.listName = this.data.list_name;
    this.description = this.data.description;
    this.listGroup = this.data.list_group;
    this.createdOn = this.data.created_on;
    this.isDeleted = this.data.is_deleted;
    this.createForm();
  }

  createForm(){
    this.form = this.formBuilder.group({
      ListName:[this.listName, Validators.compose([
        Validators.required,
        this.validateListName,
        this.noWhitespaceValidator,
      ])],
      Description:[this.description, Validators.compose([
        Validators.required
      ])],
      ListGroup:[this.listGroup,Validators.compose([
        Validators.required,
      ])],
      IsDeleted:[this.isDeleted, Validators.compose([
        Validators.required,
      ])],
    });	
  }

  public noWhitespaceValidator(control) {
    const isWhitespace = (control.value || '').trim().length === 0;
    const isValid = !isWhitespace;
    return isValid ? null : { 'whitespace': true };
  }
  
  validateListName(controls){
		const reqExp = new RegExp(/^[0-9a-zA-z \-]*$/);
		if (reqExp.test(controls.value)){
			return null;
		} else{
			return {'validateListName' : true};
		}
  }

  getErrorMessage(control, controlName) {
    let msg ='';
    msg += control.hasError('required') ? 'You must enter a value ' :'';
    if (controlName =='ListName') {msg += control.hasError('validateListName') ? 'Only Alpha Numeric, space and hypen Fields are Allowed ' :''}
    msg += control.hasError('whitespace') ? 'Name cannot be empty or white spaces only ' : '';
    return msg;
	}

  onClose(): void {
    this.dialogRef.close();
  }

  closeWithReturn(): void {
    this.dialogRef.close(this.data);
  }
  
  async addUpdateList(){ 
    let param = {};
    if (this.form.valid){
      this.isLoading = true;
      param = {
        id: this.data.id,
        list_name: this.form.get('ListName').value.trim(),
        description: this.form.get('Description').value.trim(),
        list_group: this.form.get('ListGroup').value,
        is_deleted: this.form.get('IsDeleted').value
      }
      let encrypted = this.authService.encrypt(JSON.stringify(param));
      let resp;
      if (this.data.id == undefined){
        resp = await this.authService.addList({param:encrypted});
      } else {
        resp = await this.authService.updList({param:encrypted});
      }
      this.isLoading = false;
      if (resp.success) {
        this.reusable.openAlertMsg(resp.message, "info");
        this.closeWithReturn();
      } else {
        this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
      }
    } else {
      this.reusable.openAlertMsg('Please enter all required fields.',"error");
    }
  }
}

