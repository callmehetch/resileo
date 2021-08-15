import { Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ControlContainer, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from '../_services/index';
import { ReusableComponent } from '../reusable/reusable.component';
import { environment } from '../../environments/environment';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { LoginHeaderComponent } from '../login-header/login-header.component';

@Component({
  selector: 'app-org-profile',
  templateUrl: './org-profile.component.html',
  styleUrls: ['./org-profile.component.css'],
})

export class OrgProfileComponent implements OnInit {
	isLoading = false; checkOrg = false; 
	height: number = window.innerHeight;
	width: number = window.innerWidth;
	cardPadtb:number = 40;
	cardPadrl:number = 40;
	fxGap:string = "30px";
	org:any;
	selList:string="bp";
	isOpen = true;
	form:FormGroup;
	invForm: FormGroup;
	updform: FormGroup;
	permissionColl = ["New Dashboard","Share Dashboard","Edit Dashboard", "Delete Dashboard"];
	fxlayoutalign: string ="start center";
	isOrg:boolean = false;
	userDet:any;
	planColl = [];
	planDetails:any;
	license = [];
	InviteEmail = new FormControl(null,[Validators.required, Validators.email]);
	inviteEmailColl = new MatTableDataSource([])
	dispInvEmail = ["email", "name","is_owner", "status","revoke" ];
	isLicValid = false;
	licErrorMsg:string;

	constructor(
		private router: Router,
		private authService: AuthenticationService,
		private reusable: ReusableComponent,
		private formBuilder: FormBuilder,
		public dialog: MatDialog,
		private loginHeader: LoginHeaderComponent,
	) {}

	ngOnInit() {
		this.userDet = JSON.parse(this.reusable.decrypt(sessionStorage.getItem('usr')));
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
		if (this.userDet.invited_by == undefined){
			this.getUserLic();
			this.getPlanDetails();
		}
		else {
			this.getUserLicOfInvitedUser();
		}
	}

	updProfile(){
		this.createUpdForm();
	}

	createUpdForm() {
		this.updform = this.formBuilder.group({
			Email:[{value: this.userDet.email, disabled: true}],
			Name:[this.userDet.full_name, Validators.compose([
				Validators.required,
				Validators.minLength(3),
				Validators.maxLength(50),
				this.validateName
			])],
			Mobile:[this.userDet.mobile, Validators.compose([
				this.validateMobile
			])]
		}
		);	
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
		if (reqExp.test(controls.value) || controls.value == null){
			return null;
		} else{
			return { 'validateMobile' : true};
		}
	}

	async UpdateProfile() {
		if (this.updform.valid){
		  this.isLoading = true;
		  const param = {
			email:this.updform.get('Email').value,
			user_name: this.updform.get('Name').value,
			mobile: this.updform.get('Mobile').value,
		  };
		  let result = await this.authService.updateProfile({param: param});
		  this.isLoading = false;
		  if (result.success){
			this.reusable.openAlertMsg('Profile Updated Successfully',"info");
			this.userDet.email = this.updform.get('Email').value;
			this.userDet.full_name = this.updform.get('Name').value;
			this.userDet.mobile = this.updform.get('Mobile').value;
			sessionStorage.setItem("usr", this.reusable.encrypt(JSON.stringify(this.userDet)));
			this.reusable.userName.next(this.userDet.full_name);
		  } else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		  }
		} else {
			this.reusable.openAlertMsg("Form is not valid, please check for errors","info");
		}
	  }
	
	async getUserLicOfInvitedUser(){
		let param = {
			user_id: this.userDet.invited_by
		}
		let result = await this.authService.getUserLicOfInvitedUser(param);
		if (result.success){
			let pd = result.result[0];
			this.planDetails = {ul_id:pd.ul_id, max_users:pd.max_users, plan_id:pd.plan_id, valid_from:pd.valid_from, valid_to:pd.valid_to, company_name:pd.company_name, company_address:pd.company_address, gstin:pd.gstin, email:pd.email, plan_name:pd.plan_name};
			if (pd.max_users>1){
				this.getInvitedUsersByOwner();
			}
		}
	}

	async getInvitedUsersByOwner(){
		let param = {
			user_id: this.userDet.invited_by
		}
		let result = await this.authService.getInvitedUsersByOwner(param);
		if (result.success){
			this.mapInvitee(result)
		}
	}

	async getUserLic(){
		let result = await this.authService.getUserLic();
		if (result.success){
			this.license = result.result;
			if (this.license.length>0){
				let pd = this.license[0];
				this.planDetails = {ul_id:pd.ul_id, max_users:pd.max_users, plan_id:pd.plan_id, valid_from:pd.valid_from, valid_to:pd.valid_to, company_name:pd.company_name, company_address:pd.company_address, gstin:pd.gstin, email:pd.email, plan_name:pd.plan_name};
				if (pd.max_users>1){
					this.getInvitedUsers();
					this.selList = 'mm';
				}
				else {
					this.selList = 'bp';
				}
			}
			else {
				let dt = new Date(this.userDet.created_on);
				let validTo = new Date(dt.getFullYear(),dt.getMonth(), dt.getDate()+7);
				this.planDetails = {ul_id:null, plan_id:null, max_users:1, valid_from:null, valid_to:validTo.toISOString(), company_name:null, company_address:null, gstin:null, email:this.userDet.email};
			}
		}
		else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		}
		this.createForm();
		this.createInviteForm();
	}
	
	async getInvitedUsers(){
		let result = await this.authService.getInvitedUsers();
		if (result.success){
			this.mapInvitee(result)
		}
	}

	mapInvitee(result){
		let invitedUsers = [];
		result.result.map(invitee => {
			invitedUsers.push({email: invitee.email, status:invitee.invite_accepted_on==undefined && !invitee.is_owner?invitee.is_rejected?'Denied':'Pending':'Accepted',  is_owner: invitee.is_owner, name:invitee.name, user_id:invitee.user_id});
		});
		this.inviteEmailColl = new MatTableDataSource(invitedUsers);
		if (invitedUsers.length >= this.planDetails.max_users ){
			this.isLicValid = false;
		}
		else {
			this.isLicValid = true;
		}

	}
	async getPlanDetails(){
		let result = await this.authService.getPlan();
		if (result.success){
			this.planColl = result.result;
		}
		else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result), "error");
		}
	}

	createInviteForm(){
		this.invForm = this.formBuilder.group({
			InviteEmail:[null,Validators.compose([
				Validators.email,
				Validators.required
			])],
			Name:[null,Validators.compose([
				Validators.required,
				Validators.minLength(2),
				Validators.maxLength(150),
			])],
		},
		);	
	}
	createForm(){
		let email = this.planDetails == undefined ? this.userDet.email : this.planDetails.email;
		this.form = this.formBuilder.group({
			Email:[email,Validators.compose([
				Validators.email,
				Validators.required
			])],
			EntityName:[this.planDetails==undefined ? null :this.planDetails.company_name,Validators.compose([
				Validators.minLength(2),
				Validators.maxLength(150)
			])],
			GST:[this.planDetails==undefined ? null :this.planDetails.gstin,Validators.compose([
				Validators.minLength(15),
				Validators.maxLength(15),
			])],
		},
		);
	}

	getErrorMessage(control, controlName) {
		let msg ='';
		msg = control.hasError('required') ? 'Field Cannot be empty. ' :'';
		if (controlName == 'Email') {msg += control.hasError('email') ? 'Not an valid email' :''}
		else if (controlName == 'InviteEmail') {msg += control.hasError('email') ? 'Not an valid email' :''}
		else if (controlName == 'Name') {
			msg = control.errors['minlength'] || control.errors['maxlength'] ? 'Must be between 2 and 150 character length' :'';
			msg = (control.errors.validateName) ? 'Special Characters/Numbers are not allowed. ': '';
		}
		else if (controlName == 'Mobile'){
			msg = (control.errors.validateMobile) ? 'Only Numbers are allowed. ': '';
		}
		else if (controlName == 'GST') {
			msg = control.errors['minlength'] || control.errors['maxlength'] ? 'Must be 15 Digit character length' :''
		}
		else if (controlName == 'EntityName') {
			msg = control.errors['minlength'] || control.errors['maxlength'] ? 'Must be between 2 and 150 character length' :'';
		}
		return msg;
	}

	goBack(){
		this.router.navigate(["home"]);
	}
	
	AddOrg(){
		this.router.navigate(["home"]);
	}

	plan(pln){
		if (!this.validateLicense(pln)) return;
		if (pln.max_users >1 || pln == 'ent'){
			this.isOrg = true;
			this.selList = 'profile';
			if (pln == 'ent') {
				this.planDetails["plan_id"] = 4;
				this.planDetails["max_users"] = 25;
			}
			else {
				this.planDetails["plan_id"] = pln.plan_id;
			}
		} 
		else {
			this.isOrg = true;
			this.planDetails["plan_id"] = pln.plan_id;
			this.selList = 'profile';
		}
	}

	validateLicense(selectedPlan){
		if (selectedPlan == 'ent') {
			this.licErrorMsg = undefined
			return true;
		}
		else if (selectedPlan.max_users < this.inviteEmailColl.data.length){
			this.licErrorMsg = "Cannot downgrade the license as added members are more.";
			setTimeout(() => {
				this.licErrorMsg = undefined;
			}, 5000);
			return false;
		}
		else {
			this.licErrorMsg = undefined
			return true;
		}
	}

	async addLicense(){
		if (!this.validateLicense(this.planDetails)) return;
		let param = this.planDetails;
		if (param.plan_id == null) {
			this.selList = 'bp';
			return;
		}
		let dt = new Date();
		if (param["ul_id"] == undefined) param["valid_from"] = dt.toISOString();
		if (param["ul_id"] == undefined) param["valid_to"] = new Date(dt.getFullYear()+1,dt.getMonth(), dt.getDate()).toISOString();
		param["company_name"] = this.form.get("EntityName").value;
		param["gstin"] = this.form.get("GST").value;
		param["name"] = this.userDet?.full_name;
		if (param.ul_id == undefined){
			let result = await this.authService.addUsrLic(param);
			if (result.success){
				this.reusable.openAlertMsg("Successfully added license", "info");
				this.getInvitedUsers();
				this.getUserLic();
			}
			else {
				this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
			}
		}
		else {
			let result = await this.authService.updUsrLic(param);
			if (result.success){
				this.reusable.openAlertMsg("Successfully updated license", "info");
				this.getInvitedUsers();
				this.getUserLic();
			}
			else {
				this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
			}
		}
	}
	
	async invite(){
		let chkInvite = this.inviteEmailColl.data.filter(x=>x.email == this.invForm.get("InviteEmail").value.toLowerCase());
		if (chkInvite.length>0){
			this.reusable.openAlertMsg("Invite Already Exists","info");
			return;
		}
		let param = {
			email: this.invForm.get("InviteEmail").value.toLowerCase(),
			name: this.invForm.get("Name").value,
			is_owner: false
		}
		let result = await this.authService.insInvitation(param);
		if (result.success){
			this.invForm.get("InviteEmail").setValue(null);
			this.invForm.get("Name").setValue(null);
			this.getInvitedUsers();
		}
		else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		}
	}

	async optOut(ele){
		let conf = confirm("Opting out means all your saved dashboard will be moved to the owner and you will be logged out. please confirm");
		if (!conf) return;
		let param = {
			email: ele.email,
			userId:this.userDet.invited_by
		};
		let result = await this.authService.optOut(param);
		if (result.success){
			this.reusable.openAlertMsg("Successfully Opted Out","info");
			this.loginHeader.logout();
		}
		else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		}
	}

	async delInvite(ele){
		if (this.userDet.invited_by != undefined){
			let conf = confirm("Opting out means all your saved dashboard will be moved to the owner? please confirm");
			if (!conf) return;
		}
		else {
			let conf = confirm("Are you sure you want to delete this member?");
			if (!conf) return;
		}
		let param = {
			email: ele.email
		};
		let result = await this.authService.delInvitation(param);
		if (result.success){
			this.getInvitedUsers();
			this.reusable.openAlertMsg(result.message,"info");
		}
		else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		}
	}

	async delAccount(){
		let conf = confirm("Deleting Account will remove all your data and profile from system. Need to register again to get the access. Please confirm.");
		if (!conf){ return }
		let result = await this.authService.delAccount();
		if (result.success){
		  this.reusable.openAlertMsg("Your account is successfully deleted","info");
		  this.loginHeader.logout();
		}
		else {
		  this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		}
	}
	
}
