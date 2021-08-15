import { Component, OnInit, ViewChild, Inject, HostListener, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { environment } from '../../environments/environment';
import { ReusableComponent } from '../reusable/reusable.component';
import { Router } from '@angular/router';
import { AuthServiceService} from '../auth-service.service';
import { Sort, MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  public cusName:string = environment.customer;
  cusLogo:string = environment.customer_logo;
  cusLogo1:string = environment.customer_logo_1;
  loginUser: any;
  detectChangeId;

  constructor(
    private router: Router,
    private authService: AuthServiceService,
	private reusable: ReusableComponent,
    // private cd: ChangeDetectorRef,
  ) { }

  ngOnDestroy(){
    // clearInterval(this.detectChangeId);
  }

  ngOnInit(): void {
    this.loginUser = JSON.parse(sessionStorage.getItem("loginUserDetails"));
    // this.detectChangeId = setInterval(() => {this.cd.detectChanges();},2000);  
  }

  async logout() {
    this.authService.logoutUser();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigate(route){
    if (route == "user"){
      this.router.navigate(["user"]);
    } else if (route == "projects"){
      this.router.navigate(["projects"]);
    } else if (route == "teams"){
      this.router.navigate(["teams"]);
    } else if (route == "home"){
      this.router.navigate(["home"]);
    } else if (route == "list"){
      this.router.navigate(["list"]);
    } else if (route == "reports"){
      this.router.navigate(["reports"]);
    } else if (route == "change-password"){
      this.router.navigate(["change-password"]);
    } else if (route == "settings"){
      this.router.navigate(["settings"]);
    }
  }
}

