import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from '../_services/index';
import { ReusableComponent } from '../reusable/reusable.component';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent implements OnInit {

  isLoading = false; checkEmail = false; phide=true; cphide=true; ophide=true;
	showRegisterForm = false;
	passwordReqData = {};
	SlaReqData = {};
	cusName:string = environment.customer;
	cusLogo:string = environment.customer_logo;
	form: FormGroup;
  modPassword;
	height: number = window.innerHeight;
	width: number = window.innerWidth;
	cardPadtb:number = 40;
	cardPadrl:number = 40;
	fxGap:string = "30px";
	colWidth = 80;
	formLayoutAlign = "center center"
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
      oldpassword:['',Validators.compose([
				Validators.required,
				Validators.minLength(5),
				Validators.maxLength(20)
			])],
			password:['',Validators.compose([
				Validators.required,
				Validators.minLength(5),
				Validators.maxLength(20)
			])],
			confirm:['',Validators.required],
		},
			{validators: this.matchingPasswords('password', 'confirm')}
		);	
	}

	constructor(
		private router: Router,
		private authService: AuthenticationService,
		private reusable: ReusableComponent,
		private formBuilder: FormBuilder
	) {
		this.createForm();
	}

	ngOnInit() {
		this.reusable.screenChange.subscribe(res=>{
			this.height = res.height;
			this.width = res.width;
			if (this.height<=600){
				this.cardPadtb = 10;
				this.cardPadrl = 10
				this.fxGap ="10px"
				this.formLayoutAlign = "center start"
			}
			else {
				this.formLayoutAlign = "center center"
			}
			if (this.width <= 700){
				this.colWidth = 95;
			} else {
				this.colWidth = 80;
			}
		})
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

  onClose(){
    this.router.navigate(['home']);
  }
	
  async changePassword() {
	if (this.form.valid){
		this.isLoading = true;
        let user_id = JSON.parse(this.reusable.decrypt(sessionStorage.getItem("usr"))).user_id;
		const param = {
	        user_id : user_id,
			password: this.form.get('password').value,
		};
        let result = await this.authService.changePassword({param: param});
	  	this.isLoading = false;
	  	if (result.success){
		 	this.reusable.openAlertMsg('Password Changed Successfully',"info");
		 	this.router.navigate(['/home']);
		 } else {
		 	this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		 }
	} else {
		this.reusable.openAlertMsg("Form is not valid, please check for errors","info");
	 }
 }
 
}