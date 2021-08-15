import { Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from '../_services/index';
import { ReusableComponent } from '../reusable/reusable.component';
import { environment } from '../../environments/environment';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-org-settings',
  templateUrl: './org-settings.component.html',
  styleUrls: ['./org-settings.component.css'],
})

export class OrgSettingsComponent implements OnInit {
	isLoading = false; checkOrg = false; 
	height: number = window.innerHeight;
	width: number = window.innerWidth;
	cardPadtb:number = 40;
	cardPadrl:number = 40;
	fxGap:string = "30px";
	org:any;
	form:FormGroup;
	permissionColl = ["New Dashboard","Share Dashboard","Edit Dashboard", "Delete Dashboard"];
	fxlayoutalign: string ="start center";

	constructor(
		private router: Router,
		private authService: AuthenticationService,
		private reusable: ReusableComponent,
		private formBuilder: FormBuilder,
		public dialog: MatDialog,
	) {}

	ngOnInit() {
		if (sessionStorage.getItem("org")){
			this.org = JSON.parse(sessionStorage.getItem("org"));
		}
		else {
			this.router.navigate(["/home/org1"]);
		}
	
		this.reusable.screenChange.subscribe(res=>{
			this.height = res.height;
			this.width = res.width;
			if (this.height<=370){
				this.cardPadtb = 10;
				this.cardPadrl = 10
				this.fxGap ="10px";
			}
			if (res.height < 500){
				this.fxlayoutalign = "start start";
			} 
			else {
				this.fxlayoutalign = "start center";
			}

		});
		this.createProfile();
		
	}

	createProfile(){
		this.form = this.formBuilder.group({
			DisplayName:['', Validators.compose([
				Validators.required,
			])],
			ContactEmail:['',Validators.compose([
				Validators.email,
				Validators.required
			])],
			BillingEmail:['',Validators.compose([
				Validators.email,
			])],
			URL:[''],
		},
		);	
	}

	getErrorMessage(control, controlName) {
		let msg ='';
		msg += control.hasError('required') ? 'Field Cannot be empty. ' :'';
		if (controlName =='DisplayName') {msg += control.hasError('validateAdqName') ? 'Only AlphaNumeric or with Hyphen allowed' :''}
		if (controlName =='ContactEmail') {msg += control.hasError('ContactEmail') ? 'Not a valid email. ' :''}
		if (controlName =='BillingEmail') {msg += control.hasError('BillingEmail') ? 'Not a valid email. ' :''}
		return msg;
	}

	goBack(){
		this.router.navigate(["/home/org1"]);
	}
	
	AddOrg(){
		this.router.navigate(["home"]);
	}
}
