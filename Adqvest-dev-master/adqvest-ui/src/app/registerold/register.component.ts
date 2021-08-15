import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from '../_services/index';
import { ReusableComponent } from '../reusable/reusable.component';
import { environment } from '../../environments/environment';
// import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})

export class RegisterComponent implements OnInit {
	isLoading = false; checkEmail = false; phide=true; cphide=true;
	showRegisterForm = false;
	passwordReqData = {};
	SlaReqData = {};
	cusName:string = environment.customer;
	cusLogo:string = environment.customer_logo;
	form: FormGroup;
  	modPassword;
	registerTitle:string;
  
	getErrorMessage(control, controlName) {
		let msg ='';
		msg += control.hasError('required') ? 'Field Cannot be empty. ' :'';
		if (controlName =='email') {msg += control.hasError('email') ? 'Not a valid email. ' :''}
		if (controlName == "email") {msg += control.hasError('emailexists') ? 'Email Id already Exists, use forgot password link in login page ' :''}
		if (controlName =='name') {msg += (control.errors.minlength || control.errors.maxlength) ? 'Must be between 3 & 50 char length. ': ''}
		if (controlName =='name') {msg += (control.errors.validateName) ? 'Special Characters/Numbers are not allowed. ': ''}
		if (controlName =='mobile_no') {msg += (control.errors.minlength || control.errors.maxlength) ? 'Must be between 13 & 15 Char length. Must include country code. ': ''}
		if (controlName =='mobile_no') {msg += !control.value.startsWith('+') ? 'Must start with +. ': ''}
		if (controlName =='mobile_no') {msg += control.hasError('validateMobile') ? 'Only Numeric value allowed. ' :''}
		if (controlName =='form') {msg += control.hasError('matchingPasswords') ? 'Password, confirm password must be same' :''}
		return msg;
	}

	createForm() {
		this.form = this.formBuilder.group({
			email:['',Validators.compose([
				Validators.required,
				Validators.email
			])],
			name:['',Validators.compose([
				Validators.required,
				Validators.minLength(3),
				Validators.maxLength(50),
				this.validateName
			])],
			password:['',Validators.compose([
				Validators.required,
				Validators.minLength(5),
				Validators.maxLength(20)
			])],
			confirm:['',Validators.required],
			mobile_no:['+',Validators.compose([
				Validators.required,
				Validators.minLength(13),
				Validators.maxLength(15),
				this.validateMobile
			])]
		},
			{validators: this.matchingPasswords('password', 'confirm')}
		);	
	}

	constructor(
		private router: Router,
		private authService: AuthenticationService,
		private reusable: ReusableComponent,
		// private updates: SwUpdate,
		private formBuilder: FormBuilder
	) {
		// updates.available.subscribe(event =>{
		// 	updates.activateUpdate().then(() => document.location.reload());
		// });
		this.createForm();
	}
	height:number = window.innerHeight;
	ngOnInit() {
		console.log("inside register page");
		this.reusable.screenChange.subscribe(res=>{
			this.height = res.height;
		})
		// this.getAdminUser();
	}

	// async getAdminUser(){
	// 	let result = await this.authService.getAdminUser();
	// 	if (result.success && result.rowCount > 0){
	// 		this.registerTitle = "Register User";
	// 	} else if (result.success) {
	// 		this.registerTitle = "Register Admin User";
	// 	} else {
	// 		this.authService.invalidSession(result);
	// 	}
	// }

	validateName(controls){
		const reqExp = new RegExp("^[a-zA-Z ]+$");
		if (reqExp.test(controls.value)){
			if(controls.value.trim().length == 0)  return {'validateName' : true};
			return null;
		} else{
			return { 'validateName' : true};
		}
	}

	matchingPasswords(pass,conf){
		return (group: FormGroup) => {
			if(group.controls[pass].value === group.controls[conf].value){
				return null;
			} else{
				return {'matchingPasswords' : true};
			}
		}
	}

	validateMobile(controls){
		const reqExp = new RegExp(/^[+][0-9]*$/);
		if (reqExp.test(controls.value)){
			return null;
		} else{
			return { 'validateMobile' : true};
		}
	}
	  
	async validateEmailSignUp(){
		if (this.form.get("email").status == "VALID"){
			let emailData = {email: this.form.get("email").value};
			let result = await this.authService.validateEmail(emailData);
			if (result.success && result.result == "available") {
				this.checkEmail = true; 
				return true;
			} else if (result.success) {
				this.checkEmail = false; 
				this.form.get("email").setErrors({emailexists:true});
				return false;
			}
			else (this.authService.invalidSession(result));
		}
	}
	
  async register() {
	if (this.form.valid && this.checkEmail){
		this.isLoading = true;
		const user = {
			email:this.form.get('email').value,
			user_name: this.form.get('name').value,
			password: this.form.get('password').value,
			mobile: this.form.get('mobile_no').value,
			is_admin: this.registerTitle.includes("Admin") ? true : false
		};
		const usr = {data:this.reusable.encrypt(JSON.stringify(user))};
		// let data = await this.authService.register(usr);
		// this.isLoading = false;
		// if (data.success){
		// 	this.reusable.openAlertMsg(data.message,"info");
		// 	this.router.navigate(['/login']);
		// } else {
		// 	this.reusable.openAlertMsg(this.authService.invalidSession(data),"error");
		// }
	} else {
		this.reusable.openAlertMsg("Form is not valid, please check for errors","info");
	}
  }
}
