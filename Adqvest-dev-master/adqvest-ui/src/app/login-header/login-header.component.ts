import { Component, Inject, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { AuthenticationService} from '../_services/index';
import { ReusableComponent } from '../reusable/reusable.component';
import { Observable, Observer, fromEvent, merge, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-login-header',
  templateUrl: './login-header.component.html',
  styleUrls: ['./login-header.component.css'],
})

export class LoginHeaderComponent {
  isLoading = false;
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
  isMobile:boolean = false;
  enableMyAccount:boolean = false;
  userName:string;
  qrySearch:string;

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
    console.log(this.userDet);
    this.header();
    this.createOnline$().subscribe(isOnLine => {
      if(!isOnLine) console.log("i am offline");
      this.amIOnline = isOnLine;
    });
    this.reusable.modName.subscribe(name=>{
      this.modName = name;
    });
    this.reusable.enableMyAccount.subscribe(bool=>{
      this.enableMyAccount = bool;
    })
    this.reusable.screenChange.subscribe(screen =>{
      if (screen.width < 400){
        this.isMobile = true;
      }
      else {
        this.isMobile = false;
      }
    })
    this.reusable.userName.subscribe(name=>{
      this.userName = name;
      if (name == ''){
        let usr = sessionStorage.getItem('usr');
        if (usr != undefined){
          this.userName = JSON.parse(this.reusable.decrypt(usr)).full_name;
        }
      }
    });
  }

  fnSearch(keycode){
    if (keycode===13){
      console.log("search", keycode, this.qrySearch)
      this.reusable.search.next(this.qrySearch);
    }
  }

  async header(mode?:boolean) {
    if (this.reusable.loggedIn()){
      this.showProfile = true;
      this.userDetails = JSON.parse(this.reusable.decrypt(sessionStorage.getItem('usr')))
    }
  }

  public async logout() {
    let userDet=JSON.parse(this.reusable.decrypt(sessionStorage.getItem('usr')));
    if (userDet.user_id > 0) {
      let data={id: userDet.user_id};
      let result = await this.authService.logoutUser(data);
      if (!result.success){
        this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
      }
    }
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  hideHeader() {
    this.showHeader = this.showHeader ? false : true ;
  }

  changePassword(){
    this.router.navigate(["changepassword"]);
  }

  // updateProfile(){
  //   this.router.navigate(["updateprofile"]);
  // }

  mngOrg(){
    if (this.enableMyAccount) this.router.navigate(["/home/orgprofile"]);
    else this.router.navigate(['/home']);
  }

  home(){
    this.router.navigate(["/home"]);
  }

  mngAdmin(){
    this.router.navigate(['/home/admin']);
  }
}
