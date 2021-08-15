import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { environment } from '../environments/environment';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Router } from '@angular/router';
import * as CryptoJS from 'crypto-js';
import { BehaviorSubject } from 'rxjs';
import {FileSelectDirective, FileUploader} from 'ng2-file-upload'

@Injectable({
  providedIn: 'root'
})

export class AuthServiceService {
  domain = environment.domain;

  uploader:FileUploader;
  hasBaseDropZoneOver:boolean;
  hasAnotherDropZoneOver:boolean;
  uploaderResp:string;

  constructor(
    private http: HttpClient,
    private router: Router,
    public jwtHelper: JwtHelperService,
  ) { }

  screenChange: BehaviorSubject<{}> = new BehaviorSubject({height:window.innerHeight-64, width:window.innerWidth-20,resize:false});

  fnUploader(){
    let varUploader = new FileUploader({url:this.domain+ '/workflow/fileUpload', headers: [{ name: 'authorization', value: sessionStorage.getItem('token') },{name:'suggestion_id',value:null}]});
    return (varUploader);
  }
  storeSessionData(token,user){
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("loginUserDetails", JSON.stringify(user));
  }

  logout() {
      sessionStorage.clear();
  }

  loggedIn() {
    const token = this.jwtHelper.tokenGetter();
    if (!token) return false;
    return !this.jwtHelper.isTokenExpired();    
  }

  public randomString(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  encrypt(val){
    var key = CryptoJS.enc.Utf8.parse(environment.keyEncryptDecrypt);
    var iv = CryptoJS.enc.Hex.parse(this.randomString(32));
    var encrypted = CryptoJS.AES.encrypt(val, key, { 
      iv: iv, 
      mode: CryptoJS.mode.CBC
    });   
    var output = encrypted.ciphertext.toString();
    return iv+":"+output;
  }
   
  decrypt(val){
    try {
      var key = CryptoJS.enc.Utf8.parse(environment.keyEncryptDecrypt);
      let keyVal = val.split(":");
      var iv = CryptoJS.enc.Hex.parse(keyVal[0]);
      var cipherText = CryptoJS.enc.Hex.parse(keyVal[1]);
      var options = { mode: CryptoJS.mode.CBC, iv: iv};
      var decrypted = CryptoJS.AES.decrypt({ciphertext: cipherText, iv:iv, salt:undefined}, key, options);
      let retVal = decrypted.toString(CryptoJS.enc.Utf8);
      return retVal
    } catch (err) {
      console.error(err);
      return "";
    } 
  }

  logoutUser() {
    return this.http.get<any>(this.domain+'/workflow/logoutUser').toPromise();
  }

  invalidSession(res: any, dispErr?: any) {
    let msg;
    if (res.invalidToken) {
      msg = 'Session expired, please login again.';
      this.logout();
      this.router.navigate(['/login']);
    } else if (!res.success) {
      if (res.message != undefined){
          if (res.message.includes("duplicate")){
              msg = "Already Exists, use different name and try again";
          } else {
              let pos = res.message.indexOf(' at ');
              msg = pos > 0 ? res.message.substring(0,pos) : res.message; 
          }
      } else {
          msg ="Some of the operation failed. please see the server log for more details";
      }
    } else {
      msg = res.message
    }
    return msg;
  }


  async login(param){
    return this.http.post<any>( this.domain +'/workflow/login',param).toPromise();
  }

  async getSuggestions(param){
    return this.http.post<any>( this.domain +'/workflow/getSuggestions',param).toPromise();
  }

  async getSuggestionSummary(){
    return this.http.get<any>( this.domain +'/workflow/getSuggestionSummary').toPromise();
  }

  async getSuggestionsList(param){
    return this.http.post<any>( this.domain +'/workflow/getSuggestionsList',param).toPromise();
  }

  async addSuggestion(param){
    return this.http.post<any>( this.domain +'/workflow/addSuggestion',param).toPromise();
  }

  async updSuggestion(param){
    return this.http.post<any>( this.domain +'/workflow/updSuggestion',param).toPromise();
  }

  async updSuggestionAttachRef(param){
    return this.http.post<any>( this.domain +'/workflow/updSuggestionAttachRef',param).toPromise();
  }

  async delSuggestion(param){
    return this.http.post<any>( this.domain +'/workflow/delSuggestion',param).toPromise();
  }

  async getUsers(param){
    return this.http.post<any>( this.domain +'/workflow/getUsers',param).toPromise();
  }

  async addUser(param){
    return this.http.post<any>( this.domain +'/workflow/addUser',param).toPromise();
  }

  async updUser(param){
    return this.http.post<any>( this.domain +'/workflow/updUser',param).toPromise();
  }

  async delUndelUser(param){
    return this.http.post<any>( this.domain +'/workflow/delUndelUser',param).toPromise();
  }

  async getProjects(param){
    return this.http.post<any>( this.domain +'/workflow/getProjects',param).toPromise();
  }

  async getUserProjects(param){
    return this.http.post<any>( this.domain +'/workflow/getUserProjects',param).toPromise();
  }

  async getProjectUsers(param){
    return this.http.post<any>( this.domain +'/workflow/getProjectUsers',param).toPromise();
  }

  async addProject(param){
    return this.http.post<any>( this.domain +'/workflow/addProject',param).toPromise();
  }

  async updProject(param){
    return this.http.post<any>( this.domain +'/workflow/updProject',param).toPromise();
  }

  async updProjectAttachRef(param){
    return this.http.post<any>( this.domain +'/workflow/updProjectAttachRef',param).toPromise();
  }

  async delProject(param){
    return this.http.post<any>( this.domain +'/workflow/delProject',param).toPromise();
  }

  async addProjectUpdate(param){
    return this.http.post<any>( this.domain +'/workflow/addProjectUpdate',param).toPromise();
  }

  async getProjectHistory(param){
    return this.http.post<any>( this.domain +'/workflow/getProjectHistory',param).toPromise();
  }

  async delProjectUpdate(param){
    return this.http.post<any>( this.domain +'/workflow/delProjectUpdate',param).toPromise();
  }

  async getTeams(param){
    return this.http.post<any>( this.domain +'/workflow/getTeams',param).toPromise();
  }

  async getNonTeamMembers(param){
    return this.http.post<any>( this.domain +'/workflow/getNonTeamMembers',param).toPromise();
  }

  async addTeamMembers(param){
    return this.http.post<any>( this.domain +'/workflow/addTeamMembers',param).toPromise();
  }

  async removeTeamMember(param){
    return this.http.post<any>( this.domain +'/workflow/removeTeamMember',param).toPromise();
  }

  async deactivateTeamMember(param){
    return this.http.post<any>( this.domain +'/workflow/deactivateTeamMember',param).toPromise();
  }

  async resetPassword(param){
    return this.http.post<any>( this.domain +'/workflow/resetPassword',param).toPromise();
  }

  async changePassword(param){
    return this.http.post<any>( this.domain +'/workflow/changePassword',param).toPromise();
  }

  async getLists(param){
    return this.http.post<any>( this.domain +'/workflow/getLists',param).toPromise();
  }

  async addList(param){
    return this.http.post<any>( this.domain +'/workflow/addList',param).toPromise();
  }

  async updList(param){
    return this.http.post<any>( this.domain +'/workflow/updList',param).toPromise();
  }

  async delUndelList(param){
    return this.http.post<any>( this.domain +'/workflow/delUndelList',param).toPromise();
  }

  async fileDownload(param){
    return this.http.post( this.domain +'/workflow/fileDownload',param, {responseType:'blob'}).toPromise();
  }

  async getFacts(param){
    return this.http.post<any>( this.domain +'/workflow/getFacts',param).toPromise();
  }

  async addFact(param){
    return this.http.post<any>( this.domain +'/workflow/addFact',param).toPromise();
  }

  async updFact(param){
    return this.http.post<any>( this.domain +'/workflow/updFact',param).toPromise();
  }

  async updFactAttachRef(param){
    return this.http.post<any>( this.domain +'/workflow/updFactAttachRef',param).toPromise();
  }

  async delFact(param){
    return this.http.post<any>( this.domain +'/workflow/delFact',param).toPromise();
  }

  async getTypes(param){
    return this.http.post<any>( this.domain +'/workflow/getTypes',param).toPromise();
  }

  async getTasks(param){
    return this.http.post<any>( this.domain +'/workflow/getTasks',param).toPromise();
  }

  async addTask(param){
    return this.http.post<any>( this.domain +'/workflow/addTask',param).toPromise();
  }

  async updTask(param){
    return this.http.post<any>( this.domain +'/workflow/updTask',param).toPromise();
  }

  async updTaskAttachRef(param){
    return this.http.post<any>( this.domain +'/workflow/updTaskAttachRef',param).toPromise();
  }

  async delTask(param){
    return this.http.post<any>( this.domain +'/workflow/delTask',param).toPromise();
  }

  async addTaskUpdate(param){
    return this.http.post<any>( this.domain +'/workflow/addTaskUpdate',param).toPromise();
  }

  async getTaskHistory(param){
    return this.http.post<any>( this.domain +'/workflow/getTaskHistory',param).toPromise();
  }

  async delTaskUpdate(param){
    return this.http.post<any>( this.domain +'/workflow/delTaskUpdate',param).toPromise();
  }

  async getPendingTaskStatus(param){
    return this.http.post<any>( this.domain +'/workflow/pendingTaskStatus', param).toPromise();
  }
  
  async getTaskActualEfforts(param){
    return this.http.post<any>( this.domain +'/workflow/getTaskActualEfforts', param).toPromise();
  }
  
  async getMap(param){
    return this.http.post<any>( this.domain +'/workflow/getMap',param).toPromise();
  }

  async addMap(param){
    return this.http.post<any>( this.domain +'/workflow/addMap',param).toPromise();
  }

  async updMap(param){
    return this.http.post<any>( this.domain +'/workflow/updMap',param).toPromise();
  }

  async updMapAttachRef(param){
    return this.http.post<any>( this.domain +'/workflow/updMapAttachRef',param).toPromise();
  }

  async delMap(param){
    return this.http.post<any>( this.domain +'/workflow/delMap',param).toPromise();
  }

  async getContacts(param){
    return this.http.post<any>( this.domain +'/workflow/getContacts',param).toPromise();
  }

  async addContact(param){
    return this.http.post<any>( this.domain +'/workflow/addContact',param).toPromise();
  }

  async updContact(param){
    return this.http.post<any>( this.domain +'/workflow/updContact',param).toPromise();
  }

  async updContactAttachRef(param){
    return this.http.post<any>( this.domain +'/workflow/updContactAttachRef',param).toPromise();
  }

  async delContact(param){
    return this.http.post<any>( this.domain +'/workflow/delContact',param).toPromise();
  }

  async addContactUpdate(param){
    return this.http.post<any>( this.domain +'/workflow/addContactUpdate',param).toPromise();
  }

  async getContactHistory(param){
    return this.http.post<any>( this.domain +'/workflow/getContactHistory',param).toPromise();
  }

  async delContactUpdate(param){
    return this.http.post<any>( this.domain +'/workflow/delContactUpdate',param).toPromise();
  }

  async getChartData(param){
    return this.http.post<any>( this.domain +'/workflow/getChartData', param).toPromise();
  }

}
