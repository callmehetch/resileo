import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { AuthGuard } from '../_guards/auth.guard';
import { AuthServiceService } from '../auth-service.service';
import { ReusableComponent } from '../reusable/reusable.component';
import { HeaderComponent } from '../header/header.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
	isLoading = false;
	returnUrl: string;
	hide = true;
	form: FormGroup;

	loginName = new FormControl('', [Validators.required]);
	password = new FormControl('',[Validators.required]);

	getErrorMessage() {
    	return this.loginName.hasError('required') ? 'You must enter a value' : '';
	}
	
	constructor(
		private route: ActivatedRoute,
		private router: Router,
		private authGuard: AuthGuard,
		private authService: AuthServiceService,
		private formBuilder: FormBuilder,
		private reusable: ReusableComponent,
		private headerVar: HeaderComponent,
	){	} 


	ngOnInit() {
		if (this.authGuard.redirectUrl) {
			this.returnUrl = this.authGuard.redirectUrl;
			this.authGuard.redirectUrl = undefined;
		} else {
			if(this.authService.loggedIn()){
				this.navigation(null);
			}
		}
    }
	
	private navigation(default_route) {
		let lastVisitedURL = sessionStorage.getItem("currentRoute");
		switch (lastVisitedURL) {
			case "home" :
				this.router.navigate(['home']);
			break
			case "user" :
				this.router.navigate(['user']);
			break
			case "projects" :
				this.router.navigate(['projects']);
			break
			case "list" :
				this.router.navigate(['list']);
			break
			case "reports" :
				this.router.navigate(['reports']);
			break
			case "facts" :
				this.router.navigate(['facts']);
			break
			case "tasks" :
				this.router.navigate(['tasks']);
			break
			case "map" :
				this.router.navigate(['map']);
			break
			case "contacts" :
				this.router.navigate(['contacts']);
			break
			case "change-password" :
				this.router.navigate(['change-password']);
			break
			case "settings" :
				this.router.navigate(['settings']);
			break
			default:
				console.log("inside this navigation")
				this.router.navigate([(default_route?default_route:'home')]);
			break
		}
	}

  async login() {
    if (this.loginName.valid && this.password.valid){
    	this.isLoading = true;
    	const user ={
    		login_name: this.loginName.value,
    		password: this.password.value
    	};
		const usr = {data:this.authService.encrypt(JSON.stringify(user))};
		let data = await this.authService.login(usr);
		if (data.success){
			let decryptedValue = JSON.parse(this.authService.decrypt(data.result));
			this.authService.storeSessionData(decryptedValue.token, decryptedValue.user);
			if (this.returnUrl){
				console.log("this.returnUrl: "+this.returnUrl);
				this.router.navigate([this.returnUrl]);
			} else {
				console.log("navigation authService.login")
				this.navigation(decryptedValue.landing_page);
			}
		} else {
			this.reusable.openAlertMsg(data.message,'error');
		}
    	setTimeout(() => {this.isLoading = false},2000); //to avoid login button getting enabled by the time navigation completes
    }
  }
}
