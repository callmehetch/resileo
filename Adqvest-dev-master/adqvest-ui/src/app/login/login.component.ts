import { Component, OnInit, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { AuthenticationService } from '../_services/index';
import { ReusableComponent } from '../reusable/reusable.component';
import { environment } from '../../environments/environment';

@Component({
	selector: 'app-login',
	templateUrl: 'login.component.html',
	styleUrls: ['login.component.scss']
})

export class LoginComponent implements OnInit {
	isLoading = false;
	returnUrl: string;
	hide = true;
	form: FormGroup;
	themeChange;
	email = new FormControl('', [Validators.required]);
	password = new FormControl('');
	disableLoginBtn = false;
	isUserRegistered = true;
	appTitle: string = environment.browser_title.substr(0, 1).toUpperCase() + environment.browser_title.substr(1);
	cusName: string = environment.customer;
	cusLogo: string = environment.customer_logo;
	height: number = window.innerHeight;
	width: number = window.innerWidth;
	cardPadtb:number = 40;
	cardPadrl:number = 40;
	fxGap:string = "30px";
	readonly:boolean=true;
	getErrorMessage() {
		return this.email.hasError('required') ? 'You must enter a value' : '';
	}

	constructor(
		private router: Router,
		private authenticationService: AuthenticationService,
		private reusable: ReusableComponent,
	) { }

	ngOnInit() {
		// if (this.reusable.loggedIn()) {
		// 	this.router.navigate(['home']);
		// }
		this.reusable.screenChange.subscribe(res=>{
			this.height = res.height;
			this.width = res.width;
			if (this.height<=370){
				this.cardPadtb = 10;
				this.cardPadrl = 10
				this.fxGap ="10px"
			}
		})
	}

	async login() {
		if (this.email.valid && this.password.valid) {
			this.disableLoginBtn = true;
			this.isLoading = true;
			const user = {
				email: this.email.value,
				password: this.password.value
			};
			const usr = { data: this.reusable.encrypt(JSON.stringify(user)) };
			let data = await this.authenticationService.login(usr);
			if (data.success) {
				let decryptData = this.reusable.decrypt(data.result);
				this.authenticationService.storeSessionData(decryptData);
				let jsonParse = JSON.parse(decryptData);
				sessionStorage.setItem("usr",this.reusable.encrypt(JSON.stringify(jsonParse.user)));
				this.reusable.userName.next(jsonParse.user.full_name);
				console.log("resetting name from login",jsonParse.user.full_name );
				this.router.navigate(['home']);
			} else {
				this.disableLoginBtn = false;
				this.reusable.openAlertMsg(data.message, 'error');
			}
			setTimeout(() => { this.isLoading = false }, 0); //to avoid login button getting enabled by the time navigation completes
		} else {
			this.reusable.openAlertMsg('Wrong input', 'warn');
		}
	}

	signup(){
		this.router.navigate(["register"]);
	}
}
