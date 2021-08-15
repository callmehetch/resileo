import { Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from '../_services/index';
import { ReusableComponent } from '../reusable/reusable.component';
import { environment } from '../../environments/environment';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-org',
  templateUrl: './org.component.html',
  styleUrls: ['./org.component.css'],
})

export class OrgComponent implements OnInit {
	isLoading = false; checkOrg = false; 
	height: number = window.innerHeight;
	width: number = window.innerWidth;
	cardPadtb:number = 40;
	cardPadrl:number = 40;
	fxGap:string = "30px";
	orgColl = [{name:"Myorganization1",logo:"../../assets/image/adqvest_small.png"},{name:"myorganization2", logo:"../../assets/image/adqvest_small.png"},{name:"neworganization", logo:"../../assets/image/adqvest_small.png"}];
	orgDialogWidth = "60%";
	constructor(
		private router: Router,
		private authService: AuthenticationService,
		private reusable: ReusableComponent,
		private formBuilder: FormBuilder,
		public dialog: MatDialog,
	) {}

	ngOnInit() {
		console.log("inside company page");
		this.reusable.screenChange.subscribe(res=>{
			this.height = res.height;
			this.width = res.width;
			if (this.height<=370){
				this.cardPadtb = 10;
				this.cardPadrl = 10
				this.fxGap ="10px";

			}
			if (this.width <600) this.orgDialogWidth ="90%";
			else if (this.width>=600 && this.width<=900) this.orgDialogWidth ="60%";
			else this.orgDialogWidth ="40%";
		})
	}
	openOrgDialog(): void {
		const dialogRef = this.dialog.open(AddOrgDialog, {
		  width: this.orgDialogWidth,
		});
		dialogRef.afterClosed().subscribe(result => {
		  if(result != undefined) {
		  }
		});
	  }
	
	addOrg(){
		this.openOrgDialog();
	}

	orgProfile(org){
		sessionStorage.setItem("org",JSON.stringify(org));
		this.router.navigate(["/home/orgprofile"])
	}

	orgSettings(org){
		sessionStorage.setItem("org",JSON.stringify(org));
		this.router.navigate(["/home/orgsettings"])
	}
	goBack(){
		this.router.navigate(["/home"])
	}
}

/* Add Organization */
@Component({
	selector: 'app-add-org',
	templateUrl: 'add-org.dialog.html',
  })
  
  export class AddOrgDialog implements OnInit {
	title: string;
	form: FormGroup;
	isLoading: boolean = false;
	checkOrg = false;
	fxlayoutalign = "start center";

	constructor(
	  public dialogRef: MatDialogRef<AddOrgDialog>,
	  @Inject(MAT_DIALOG_DATA) public data:any,
	  private formBuilder: FormBuilder,
	  private reusable: ReusableComponent
	) { }
  
	ngOnInit(){
		this.createForm();
		this.reusable.screenChange.subscribe(res=>{
			if (res.height < 500){
				this.fxlayoutalign = "start start";
			} 
			else {
				this.fxlayoutalign = "start center";
			}
		})
	}

	createForm(){
		this.form = this.formBuilder.group({
			OrgAdqName:['', Validators.compose([
				Validators.required,
				this.validateAdqName
			])],
			Email:['',Validators.compose([
				Validators.email,
				Validators.required
			])],
			EntityName:['',Validators.compose([
				Validators.required,
				Validators.minLength(2),
				Validators.maxLength(150),
				this.validateName
			])],
		},
		);	
	}

	validateAdqName(controls){
		const reqExp = new RegExp("^[a-zA-Z0-9\-]+$");
		if (reqExp.test(controls.value)){
			return null;
		} else{
			return { 'validateAdqName' : true};
		}
	}

	validateName(controls){
		const reqExp = new RegExp("^[a-zA-Z0-9 ]+$");
		if (reqExp.test(controls.value)){
			if(controls.value.trim().length == 0)  return {'validateName' : true};
			return null;
		} else{
			return { 'validateName' : true};
		}
	}

	isAdqNameExist(){
		this.checkOrg = true
	}

	getErrorMessage(control, controlName) {
		let msg ='';
		msg += control.hasError('required') ? 'Field Cannot be empty. ' :'';
		if (controlName =='OrgAdqName') {msg += control.hasError('validateAdqName') ? 'Only AlphaNumeric or with Hyphen allowed' :''}
		if (controlName =='Email') {msg += control.hasError('Email') ? 'Not a valid email. ' :''}
		if (controlName == "OrgAdqName") {msg += control.hasError('OrgAdqNameExists') ? 'Account already Exists' :''}
		if (controlName =='EntityName') {msg += (control.errors.minlength || control.errors.maxlength) ? 'Must be between 3 & 150 char length. ': ''}
		if (controlName =='EntityName') {msg += control.hasError("validateName") ? 'Special Characters are not allowed. ': ''}
		return msg;
	}

  }  
