import { Component, OnInit,ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from '../_services/index';
import { ReusableComponent } from '../reusable/reusable.component';
import { environment } from '../../environments/environment';
import { filter } from "rxjs/operators";

@Component({
	selector: 'app-forgot-password',
	templateUrl: './forgot-password.component.html',
	styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {

	isLoading = false; checkEmail = true; phide = true; cphide = true;
	showRegisterForm = false;
	passwordReqData = {};
	SlaReqData = {};
	cusName: string = environment.customer;
	cusLogo: string = environment.customer_logo;
	form: FormGroup;
	modPassword; isVerified: boolean;
	registerTitle: string;
	height: number = window.innerHeight;
	width: number = window.innerWidth;
	cardPadtb: number = 40;
	cardPadrl: number = 40;
	fxGap: string = "30px";
	colWidth = 80;
	formLayoutAlign = "center center"
	isOTPSent: boolean;
	checkEmailTimer:any;

	getErrorMessage(control, controlName) {
		let msg = '';
		msg += control.hasError('required') ? 'Field Cannot be empty. ' : '';
		if (controlName == 'email') { msg += control.hasError('email') ? 'Not a valid email. ' : '' }
		if (controlName == "email") { msg += control.hasError('emailexists') ? 'Email Id already Exists, use forgot password link in login page ' : '' }
		if (controlName == 'name') { msg += (control.errors.minlength || control.errors.maxlength) ? 'Must be between 3 & 50 char length. ' : '' }
		if (controlName == 'name') { msg += (control.errors.validateName) ? 'Special Characters/Numbers are not allowed. ' : '' }
		if (controlName == 'code') { msg += (control.errors.minlength || control.errors.maxlength) ? 'Must be 4 digit number. ' : '' }
		if (controlName == 'code') { msg += (control.errors.validateName) ? 'Special Characters/Numbers are not allowed. ' : '' }
		if (controlName == 'mobile_no') { msg += (control.errors.minlength || control.errors.maxlength) ? 'Must be between 13 & 15 Char length. Must include country code. ' : '' }
		if (controlName == 'mobile_no') { msg += !control.value.startsWith('+') ? 'Must start with +. ' : '' }
		if (controlName == 'mobile_no') { msg += control.hasError('validateMobile') ? 'Only Numeric value allowed. ' : '' }
		if (controlName == 'form') { msg += control.hasError('matchingPasswords') ? 'Password, confirm password must be same' : '' }
		return msg;
	}

	createForm() {
		this.form = this.formBuilder.group({
			email: ['', Validators.compose([
				Validators.required,
				Validators.email
			])],
			code1: [{value:'', disabled: true}, Validators.compose([ Validators.required, Validators.maxLength(1)])],
			code2: [{value:'', disabled: true}, Validators.compose([ Validators.required, Validators.maxLength(1)])],
			code3: [{value:'', disabled: true}, Validators.compose([ Validators.required, Validators.maxLength(1)])],
			code4: [{value:'', disabled: true}, Validators.compose([ Validators.required, Validators.maxLength(1)])],
			password: ['', Validators.compose([
				Validators.required,
				Validators.minLength(5),
				Validators.maxLength(20)
			])],
			confirm: ['', Validators.required],
		},
			{ validators: this.matchingPasswords('password', 'confirm') }
		);
	}

	
	@ViewChild("code1") code1Element: ElementRef;

	@ViewChild("code2") code2Element: ElementRef;
  
	@ViewChild("code3") code3Element: ElementRef;

	@ViewChild("code4") code4Element: ElementRef;

	constructor(
		private router: Router,
		private authService: AuthenticationService,
		private reusable: ReusableComponent,
		private formBuilder: FormBuilder
	) {

		this.createForm();
	}

	ngOnInit() {
		this.reusable.screenChange.subscribe(res => {
			this.height = res.height;
			// this.isVerified = false;
			this.width = res.width;
			if (this.height <= 650) {
				this.cardPadtb = 10;
				this.cardPadrl = 10
				this.fxGap = "10px";
				this.formLayoutAlign = "center start"
			}
			else {
				this.formLayoutAlign = "center center"
			}
			if (this.width <= 700) {
				this.colWidth = 95;
			} else {
				this.colWidth = 80;
			}
		})
		this.form.get("code1").valueChanges
		.pipe(filter((value: string) => value.length === 1))
		.subscribe(() => this.code2Element.nativeElement.focus());

		this.form.get("code2").valueChanges
		.pipe(filter((value: string) => value.length === 1))
		.subscribe(() => this.code3Element.nativeElement.focus());

		this.form.get("code3").valueChanges
		.pipe(filter((value: string) => value.length === 1))
		.subscribe(() => this.code4Element.nativeElement.focus());
	}

	validateName(controls) {
		const reqExp = new RegExp("^[a-zA-Z ]+$");
		if (reqExp.test(controls.value)) {
			if (controls.value.trim().length == 0) return { 'validateName': true };
			return null;
		} else {
			return { 'validateName': true };
		}
	}

	matchingPasswords(pass, conf) {
		return (group: FormGroup) => {
			if (group.controls[pass].value === group.controls[conf].value) {
				return null;
			} else {
				return { 'matchingPasswords': true };
			}
		}
	}

	validateMobile(controls) {
		const reqExp = new RegExp(/^[+][0-9]*$/);
		if (reqExp.test(controls.value)) {
			return null;
		} else {
			return { 'validateMobile': true };
		}
	}

	async validateEmail() {
		if (this.form.get("email").status == "VALID") {
			let param = { email: this.form.get("email").value };
            let result = await this.authService.validateEmail({param: this.reusable.encrypt(JSON.stringify(param))});
			console.log(result);
			if (result.success && result.rowCount==1) {
				this.checkEmail = true;
			} else {
				this.checkEmail = false;
				if (this.checkEmailTimer != undefined) clearInterval(this.checkEmailTimer);
				this.checkEmailTimer= setTimeout(() => {
					this.checkEmail = true;
				}, 3000);
			}
		} else {
			this.checkEmail = false;
			if (this.checkEmailTimer != undefined) clearInterval(this.checkEmailTimer);
			this.checkEmailTimer= setTimeout(() => {
				this.checkEmail = true;
			}, 3000);
		}
	}

	async getVerifyCode() {
		await this.validateEmail();
		if (this.checkEmail){
			let sendData = { email: this.form.get('email').value, type: 'Forgot Password' };
			let data = await this.authService.getOTP({ param : sendData });
			if (data.success) {
				this.isOTPSent = true;
				this.form.controls.code1.enable();
				this.form.controls.code2.enable();
				this.form.controls.code3.enable();
				this.form.controls.code4.enable();
				this.reusable.openAlertMsg(data.message, "info");
			} else {
				this.reusable.openAlertMsg(this.authService.invalidSession(data), "error");
			}
		}
	}

	async verifyCode() {
		let sendData;
		sendData = { 
			email: this.form.get('email').value, 
			type: 'Forgot Password',
			OTP: this.form.get('code1').value + this.form.get('code2').value + this.form.get('code3').value + this.form.get('code4').value
		};
		let data = await this.authService.validateOTP({ param: sendData });
		if (data.success) {
			this.isVerified = true;
			this.reusable.openAlertMsg(data.message, "info");
		} else {
			this.isVerified = false;
			this.reusable.openAlertMsg(this.authService.invalidSession(data), "error");
		}
	}

	async changeForgottenPassword() {
		if (this.form.valid) {
			this.isLoading = true;
			const user = {
				email: this.form.get('email').value,
				password: this.form.get('password').value,
			};
			let data = await this.authService.changeForgottenPassword({ param : user });
			this.isLoading = false;
			if (data.success) {
				this.reusable.openAlertMsg("Password Changed Successfully", "info");
				this.router.navigate(['/login']);
			} else {
				this.reusable.openAlertMsg(this.authService.invalidSession(data), "error");
			}
		} else {
			this.reusable.openAlertMsg("Form is not valid, please check for errors", "info");
		}
	}

	signIn() {
		this.router.navigate(["home"]);
	}
}