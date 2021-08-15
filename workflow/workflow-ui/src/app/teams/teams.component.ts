import { Component, OnInit, ViewChild, Inject, HostListener, EventEmitter, ChangeDetectorRef } from '@angular/core';
//ChangeDetectorRef is added for CDK scrolling to render the changes. It is not recognizing the changes by default
import { ReusableComponent } from '../reusable/reusable.component';
import { Router } from '@angular/router';
import { AuthServiceService } from '../auth-service.service';
import { ScrollDispatcher, CdkScrollable } from '@angular/cdk/scrolling';
import { MatTableDataSource, MatTable } from '@angular/material/table';
import { Sort, MatSort } from '@angular/material/sort';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import * as _moment from 'moment';
// tslint:disable-next-line:no-duplicate-imports -- 
//for default as to work, need to add "allowSyntheticDefaultImports": true, under tsconfig.json compiler option element.
import {default as _rollupMoment} from 'moment';
import { saveAs } from 'file-saver';

const moment = _rollupMoment || _moment;

export interface TeamClass {
  project_code: string,
  project_name: string,
  project_manager_id: number,
  project_manager_name: string,
  team_name: string
}

@Component({
  selector: 'app-teams',
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.css']
})
export class TeamsComponent implements OnInit {

  @ViewChild(CdkScrollable, { static: true }) virtualScroll: CdkScrollable;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  
  private screenChangeEvent = new Subject();
  private filterEventSub = new Subject();

  team : TeamClass; 
  form: FormGroup;
  teamsColl = new MatTableDataSource([]);
  projectsColl = [];
  usersColl = [];
  screenParam: {height:number, width:number};
  isFetched = false;
  isLoadingProjectUsers = false;
  loadCounter = 0;
  cardTitle:string;
  
  tableWidth: number;
  screenSubscribe;
  currentDate = new Date(new Date().toDateString()).getTime();

  constructor(
    private router: Router,
    private authService: AuthServiceService,
    private reusable: ReusableComponent,
    private scrollDispatcher: ScrollDispatcher,
    private cd: ChangeDetectorRef,
    public dialog: MatDialog,
    private formBuilder: FormBuilder,
  ) { }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    if (event != undefined)
      this.screenChangeEvent.next(event);
  }

  ngOnDestroy(){
    this.screenSubscribe.unsubscribe();
  }

  ngOnInit(): void {
    this.screenSubscribe = this.authService.screenChange.subscribe(screen => {
      this.screenParam = {height:screen["height"], width:screen["width"]};
      let { width, height } = this.getTeamsGridWidth();
      this.tableWidth = width-60-35;
    });
    this.screenChangeEvent
      .pipe(debounceTime(1000))
      .subscribe(e => {
        let { width, height } = this.getTeamsGridWidth();
        this.tableWidth = width-60-35;
      })
    
    this.scrollDispatcher.scrolled(500)
      .pipe(filter(event => this.virtualScroll.measureScrollOffset('bottom') === 0))
      .subscribe(ele =>{
        // if(this.hasMore())
        //   this.handleScroll(true, null);
      });
  
//    this.filterEventSub.pipe(debounceTime(1000))
//      .subscribe(e => {
//        if (this.teamsColl['_renderData'].value.length < this.limit && this.isFetched){
//          this.handleScroll(this.isFetched, e);
//        }
//      })
    this.cardTitle = "Teams Management";
    
    this.loadCounter += 1;
    this.getProjects();
    
    this.createForm();
  }

  applyFilter(filterValue) {
    this.teamsColl.filter = filterValue.trim().toLowerCase();
    this.filterEventSub.next(filterValue);
  }

  private getTeamsGridWidth() {
    let element = document.getElementById("teams-grid");
    let positionInfo = element.getBoundingClientRect();
    let height = positionInfo.height;
    let width = positionInfo.width;
    return { width, height };
  }

  createForm(){
    this.form = this.formBuilder.group({
      FormProjectCode: new FormControl(),
      FormUsers: new FormControl(),
      //FormProjectManager: [Validators.compose([Validators.required])]
    });
  }

  /*get FormUsers(): any {
    return this.form.get('FormUsers');
  }*/

  displayedColumns = ['status','delete', 'user_name'];

  async getProjects(){
    let param = {
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.getProjects({param:encrypted});
    if (resp.success){
      if (resp.rowCount > 0){
        this.projectsColl = JSON.parse(this.authService.decrypt(resp.result));
      }
    }
    
    this.stopLoader();
  }

  async getNonTeamMembers(){
    let param = {
      project_code: this.form.get('FormProjectCode').value.project_code,
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.getNonTeamMembers({param:encrypted});
    if (resp.success){
      if (resp.rowCount > 0){
        this.usersColl = JSON.parse(this.authService.decrypt(resp.result));
      }
    }
    
    this.stopLoader();
  }

  async getTeams(){
    this.isLoadingProjectUsers = true;
    let param = {
      project_code: this.form.get('FormProjectCode').value.project_code,
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    
    let resp = await this.authService.getTeams({param:encrypted});
    this.isLoadingProjectUsers = false;
    let decryptedRows;
    if (resp.success && resp.rowCount > 0){
      this.isFetched = true;
      let teamMember = JSON.parse(this.authService.decrypt(resp.result));
      this.teamsColl = new MatTableDataSource(teamMember);
      this.teamsColl.sort = this.sort;
    } else if (resp.rowCount == 0){
      this.reusable.openAlertMsg("No rows found","info");
      this.teamsColl.data = [];
      this.isFetched = false;
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
    
    this.stopLoader();
  }

  async addTeamMembers(){
    let param = {}, usersId = [];
    
    console.log(this.form.get('FormProjectCode').value);
    if( ! this.form.get('FormProjectCode').value ) {
        this.reusable.openAlertMsg("Select a Project", "info");
        return ;
    }
    
    if( ! this.form.get('FormUsers').value ) {
        this.reusable.openAlertMsg("Select atleast one User", "info");
        return ;
    }
    
    let selectedUsers = this.form.get('FormUsers').value;
    selectedUsers.forEach(user => usersId.push(user.id) );
    
    
    if (this.form.valid){
      this.isLoadingProjectUsers = true;
      
      param = {
        project_code: this.form.get('FormProjectCode').value.project_code,
        user_ids: usersId
      }
      let encrypted = this.authService.encrypt(JSON.stringify(param));
      let resp;
      resp = await this.authService.addTeamMembers({param:encrypted});
      this.isLoadingProjectUsers = false;
      if (resp.success) {
        this.reusable.openAlertMsg(resp.message, "info");
        
        this.form.get('FormUsers').setValue(null);
        this.getTeams();
        this.getNonTeamMembers();
      } else {
        this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
      }
    } else {
      this.reusable.openAlertMsg('Please enter all required fields.',"error");
    }
  }

  async deactivateTeamMember(element){
    if( element.project_manager_flag ) {
        this.reusable.openAlertMsg("Project Manager can't be deactivated.", "info");
        return ;
    }
    
    let msg = "Confirm to "+(element.active_flag?"deactivate":"activate")+" the User from this Project";
    let confirmMessage = confirm(msg);
    if (!confirmMessage) return;
    let param = {
      project_code: this.form.get('FormProjectCode').value.project_code,
      user_id: element.user_id,
      new_active_flag: ! element.active_flag
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.deactivateTeamMember({param:encrypted});
    if (resp.success){
      this.reusable.openAlertMsg(resp.message,"info");
        
      this.form.get('FormUsers').setValue(null);
      this.getTeams();
      this.getNonTeamMembers();
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  async removeTeamMember(element){
    if( element.project_manager_flag ) {
        this.reusable.openAlertMsg("Project Manager can't be deleted.", "info");
        return ;
    }
    
    let msg = "Confirm to remove the User from this Project";
    let confirmMessage = confirm(msg);
    if (!confirmMessage) return;
    let param = {
      project_code: this.form.get('FormProjectCode').value.project_code,
      user_id: element.user_id
    }
    let encrypted = this.authService.encrypt(JSON.stringify(param));
    let resp = await this.authService.removeTeamMember({param:encrypted});
    if (resp.success){
      this.reusable.openAlertMsg(resp.message,"info");
        
      this.form.get('FormUsers').setValue(null);
      this.getTeams();
      this.getNonTeamMembers();
    } else {
      this.reusable.openAlertMsg(this.authService.invalidSession(resp),"error");
    }
  }

  private stopLoader() {
    this.loadCounter--;
    
    if( this.loadCounter === 0 ) {
      this.isLoadingProjectUsers = false;
    }
  }

  goBack(){
    this.router.navigate(['home']);
  }
}
