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
	height: number = window.innerHeight;
	width: number = window.innerWidth;
	fxGap:string = "30px";
	formlayoutalign = "center center";

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
			PrivacyPolicy:[null,Validators.compose([
				Validators.required,
			])],
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
		this.createForm();
	}

	ngOnInit() {
		this.reusable.screenChange.subscribe(res=>{
			this.height = res.height;
			this.width = res.width;
			if (this.height <= 500){
				this.fxGap ="10px";
				this.formlayoutalign = "center start";
			} else {
				this.formlayoutalign = "center center";
			}
		})
	}

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
		if (this.form.get("email").valid){
			let email = {email: this.form.get("email").value};
			let result = await this.authService.validateEmail({param:this.reusable.encrypt(JSON.stringify(email))});
			if (result.success && result.rowCount==0) {
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
			email:this.form.get('email').value.toLowerCase(),
			full_name: this.form.get('name').value,
			password: this.form.get('password').value,
			mobile_country:null,
			mobile:null
		};
		const usr = {param:this.reusable.encrypt(JSON.stringify(user))};
		let data = await this.authService.registerUser(usr);
		this.isLoading = false;
		if (data.success){
			this.reusable.openAlertMsg("User Successfully Registered.Login to proceed","info");
			this.router.navigate(['/login']);
		} else {
			this.reusable.openAlertMsg(this.authService.invalidSession(data),"error");
		}
	} else {
		this.reusable.openAlertMsg("Form is not valid, please check for errors","info");
	}
  }
  signIn(){
	  this.router.navigate(["home"]);
  }
  orgprofile(where){
	  let compName = this.form.get("name") == undefined || this.form.get("name").value.trim().length == 0 ? "Company name" : this.form.get("name").value;
	sessionStorage.setItem("orgprofile",where);
	sessionStorage.setItem("org",JSON.stringify({name: compName, logo: "../../assets/image/adqvest_small.png"}));
	this.router.navigate(["/home/orgprofile"])
  }
}
