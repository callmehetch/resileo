import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { AuthenticationService} from '../_services/index';
import { ReusableComponent } from '../reusable/reusable.component';
import { Observable, Observer, fromEvent, merge, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})

export class HomeComponent {
  isLoading = [];
  showHeader = true;
  showProfile = false;
  userDetails:string ;
  cusName:string = environment.customer;
  cusLogo:string = environment.customer_logo;
  entSelVal:string;  entCollection=[]; myDashSelVal; myDashColl=[];
  appTitle:string = environment.browser_title.substr(0,1).toUpperCase()+environment.browser_title.substr(1);
  userDet; entObj;
  dispMenu = true;
  dispCalendar = false; dispOnRequest = false; dispEnt = true; dispMyChart = false;
  online$: any;
  amIOnline = true;
  modName:string ='';
  height:number;
  width:number;
  pendingInviteColl = new MatTableDataSource([]);
  dispPendInvite = ["full_name","company_name","invited_on","is_accepted"];
  dispInviteScreen = false;
  isBtnValid = false;
  enableMyAccount = false;
  chartColl = [];
  widgetColl = new MatTableDataSource([]);
  theme = "light";
  chartToDisplay = [];
  svgData = [];
  chartHt:number;
  @ViewChild(MatSort, { static: false }) sort: MatSort;

  constructor(
    private router: Router,
    private authService: AuthenticationService,
    private reusable: ReusableComponent,
  ) { 
  }
  
  createOnline$() {
    return merge<boolean>(
      fromEvent(window, 'offline').pipe(map(() => false)),
      fromEvent(window, 'online').pipe(map(() => true)),
      new Observable((sub: Observer<boolean>) => {
        sub.next(navigator.onLine);
        sub.complete();
      }));
  }

  ngOnInit(){
		this.userDet = JSON.parse(this.reusable.decrypt(sessionStorage.getItem('usr')));
    this.header();
    this.createOnline$().subscribe(isOnLine => {
      if(!isOnLine) console.log("i am offline");
      this.amIOnline = isOnLine;
    });
    this.reusable.modName.subscribe(name=>{
      this.modName = name;
    });
    this.reusable.screenChange.subscribe(screen=>{
      this.height = screen.height-64-33;
      this.width = screen.width - 100;
      this.chartHt = 250;
    })
    this.reusable.search.subscribe(qrySearch=>{
      if (!this.dispInviteScreen){
        if (qrySearch.length>0) this.getPublishedSearchWidgets(qrySearch);
      }
    })
    this.getPendingInvitations();
  }

  async getPublishedSearchWidgets(search){
		let strSearch = search.replace(/ /g,' & ');
		console.log(strSearch);
		let param = {
			search: strSearch
		}
		let result = await this.authService.getPublishedSearchWidgets({param:this.reusable.encrypt(JSON.stringify(param))});
		if (result.success){
			this.chartColl = result.result;
      this.chartColl.map((chart,i)=>{
        this.isLoading[i] = true;
        this.getData(chart,i);
      })
		}
		else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		}
	}

  async getData(chart,i){
		let param = {
			queryText: chart.query_param.query
		}
		await this.getChQuery(param, chart, i);
	}

	async getChQuery(param, chart, i){
		let result =  await this.authService.clickhouseQuery({param:this.reusable.encrypt(JSON.stringify(param))});
    this.isLoading[i] = false;
		if (result.success){
			chart.query_param["data"] = result.result;
      this.chartToDisplay[i] = Object.assign({},chart.query_param);
      this.svgData[i] = JSON.parse(JSON.stringify(chart.query_param['data']));
      if (chart.query_param.root_chart_type == 'table'){
        chart.query_param["tblData"] = new MatTableDataSource(result.result);
        chart.query_param["tblData"].sort = this.sort;
        if (result.rowCount>1){
          let row = result.result[0];
          chart.query_param["dispCols"] = [];
          Object.keys(row).map((col,ix) => {
            chart.query_param["dispCols"].push(col);
          });
        }
      }
		}
		else {
      chart.query_param["error"] = result.message;
		}
    console.log(chart);
	}

  async getPendingInvitations(){
    let param = {
      email: this.userDet.email
    }
    let result = await this.authService.getPendingInvitations(param);
    if (result.success){
      this.pendingInviteColl = new MatTableDataSource(result.result);
      if (result.rowCount > 1){
        this.dispInviteScreen = true;
      }
      else if (result.rowCount == 1){
        this.pendingInviteColl.data[0].is_accepted = true;
        this.updPendInv();
      }
      else {
        this.dispInviteScreen = false;
        this.reusable.enableMyAccount.next(true);
      }
    }
    else {
      this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
    }
  }

  confirmInvite(){
    let conf = confirm("Thanks for accepting this invite. All other invites stands denied. Please confirm?");
    if (!conf) return;
    this.updPendInv();
    console.log(this.pendingInviteColl.data);
  }

  async updPendInv(){
    let acceptedInvite = this.pendingInviteColl.data.filter(x=>x.is_accepted)[0];
    let rejectedInvites = this.pendingInviteColl.data.filter(x=>!x.is_accepted);
    if (rejectedInvites.length>0){
      this.updRejInvite(rejectedInvites);
    }
    this.updInvite(acceptedInvite);
  }

  async updInvite(acceptedInvite){
    let updInvite = {
      invitation_id: acceptedInvite.invitation_id,
      invited_by: acceptedInvite.invited_by,
      email: this.userDet.email
    }
    let result = await this.authService.updInvitationToExistingUser(updInvite);
    if (result.success){
      this.reusable.openAlertMsg("Successfully updated the Invite","info");
      this.userDet["invited_by"] = acceptedInvite.invited_by;
      sessionStorage.setItem('usr', this.reusable.encrypt(JSON.stringify(this.userDet)));
      this.reusable.enableMyAccount.next(true);
      setTimeout(() => {
        this.getPendingInvitations();
      }, 500);
    }
    else {
      this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
    }
  }

  async updRejInvite(rejectedInvites){
    let ids = '' ;
    rejectedInvites.map((inv,i)=>{
      if (i!=0) ids += ",";
      ids += inv.invitation_id;
    });
    let param = {
      ids : ids
    }
    await this.authService.rejInvitation(param);
  }

  selOption(element){
    this.pendingInviteColl.data.map(row=>{
      row.is_accepted = false;
    })
    element.is_accepted = true;
    setTimeout(() => {
      this.confirmInvite();
    }, 200);
    // this.isBtnValid = true;
  }

  async header(mode?:boolean) {
    if (this.reusable.loggedIn()){
      this.showProfile = true;
      this.userDetails = JSON.parse(this.reusable.decrypt(sessionStorage.getItem('usr')))
    }
  }

  hideHeader() {
    this.showHeader = this.showHeader ? false : true ;
  }
}
