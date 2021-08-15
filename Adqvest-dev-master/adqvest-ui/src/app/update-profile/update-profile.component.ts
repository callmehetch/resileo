import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from '../_services/index';
import { ReusableComponent } from '../reusable/reusable.component';
import { environment } from '../../environments/environment';

@Component({
	selector: 'app-update-profile',
	templateUrl: './update-profile.component.html',
	styleUrls: ['./update-profile.component.css'],
})

export class UpdateProfileComponent implements OnInit {
	isLoading = false; checkEmail = false; phide=true; cphide=true;
	showRegisterForm = false;
	passwordReqData = {};
	SlaReqData = {};
	cusName:string = environment.customer;
	cusLogo:string = environment.customer_logo;
	form: FormGroup;
	registerTitle:string;
	height: number = window.innerHeight;
	width: number = window.innerWidth;
	cardPadtb:number = 40;
	cardPadrl:number = 40;
	fxGap:string = "30px";
	colWidth = 80;
	formLayoutAlign = "center center";

	getErrorMessage(control, controlName) {
		let msg ='';
		//msg += control.hasError('required') ? 'Field Cannot be empty. ' :'';
		if (controlName =='email') {msg += control.hasError('email') ? 'Not a valid email. ' :''}
		if (controlName == "email") {msg += control.hasError('emailexists') ? 'Email Id already Exists, use forgot password link in login page ' :''}
		if (controlName =='name') {msg += (control.errors.minlength || control.errors.maxlength) ? 'Must be between 3 & 50 char length. ': ''}
		if (controlName =='name') {msg += (control.errors.validateName) ? 'Special Characters/Numbers are not allowed. ': ''}
		if (controlName =='mobile_no') {msg += (control.errors.minlength || control.errors.maxlength) ? 'Must be a 10 digit number':''}
		if (controlName =='mobile_no') {msg += control.hasError('validateMobile') ? 'Only Numeric value allowed. ' :''}
		if (controlName =='form') {msg += control.hasError('matchingPasswords') ? 'Password, confirm password must be same' :''}
		return msg;
	}

	createForm() {
		this.form = this.formBuilder.group({
			email:[''],
			name:['', Validators.compose([
				Validators.required,
				Validators.minLength(3),
				Validators.maxLength(50),
				this.validateName
			])],
			mobile_no:['']
		}
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
		this.reusable.screenChange.subscribe(res => {
			this.height = res.height;
			this.width = res.width;
			let user_id = JSON.parse(this.reusable.decrypt(sessionStorage.getItem("usr")));
			this.getProfile();
			if (this.height<=450){
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

	validateName(controls){
		const reqExp = new RegExp("^[a-zA-Z ]+$");
		if (reqExp.test(controls.value)){
			if(controls.value.trim().length == 0)  return {'validateName' : true};
			return null;
		} else{
			return { 'validateName' : true};
		}
	}

	validateMobile(controls){
		const reqExp = new RegExp(/^[0-9]*$/);
		if (reqExp.test(controls.value)){
			return null;
		} else{
			return { 'validateMobile' : true};
		}
	}
	  
	async getProfile(){
		let profile = JSON.parse(this.reusable.decrypt(sessionStorage.getItem("usr")));
		this.form.get('name').setValue(profile.full_name);
		this.form.get('email').setValue(profile.email);
		this.form.get('mobile_no').setValue(profile.mobile);

	  }
	
  async UpdateProfile() {
	if (this.form.valid){
      this.isLoading = true;
      let user_id = JSON.parse(this.reusable.decrypt(sessionStorage.getItem("usr"))).user_id;
      const param = {
        user_id: user_id,
        email:this.form.get('email').value,
        user_name: this.form.get('name').value,
        mobile: this.form.get('mobile_no').value,
      };
      let result = await this.authService.updateProfile({param: param});
      this.isLoading = false;
      if (result.success){
        this.reusable.openAlertMsg('Profile Updated Successfully',"info");
        this.router.navigate(['/home']);
      } else {
        this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
      }
	} else {
		this.reusable.openAlertMsg("Form is not valid, please check for errors","info");
	}
  }

  onClose(){
    this.router.navigate(['home']);
  }
	
}
