import { Component, OnInit, Inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AlertComponent } from '../_directives/alert.component';
import { environment } from '../../environments/environment';
import * as CryptoJS from 'crypto-js';
import { BehaviorSubject, from } from 'rxjs';

@Component({
  selector: 'app-reusable',
  templateUrl: './reusable.component.html',
  styleUrls: ['./reusable.component.scss']
})

export class ReusableComponent implements OnInit {
  constructor(
    private _snackBar: MatSnackBar,
  ) { 
  }

  screenChange: BehaviorSubject<{height:number, width:number}> = new BehaviorSubject({height:window.innerHeight, width:window.innerWidth});
  modName: BehaviorSubject<string> = new BehaviorSubject('Login');
  enableMyAccount: BehaviorSubject<boolean> = new BehaviorSubject(false);
  userName: BehaviorSubject<string> = new BehaviorSubject('');
  search: BehaviorSubject<string> = new BehaviorSubject('');

  ngOnInit() {
  }

  public openAlertMsg(msg,type){
    this._snackBar.openFromComponent(AlertComponent,{data: {message:msg, type:type}});
  }

  public getIconName(module: string){
    let iconName: string;
    let clrClass: string;
    switch (module){
      case 'server':
        iconName = 'airplay';
        clrClass = 'apd-blue';
      break;
      case 'application':
        iconName = 'developer_board';
        clrClass = 'apd-brown';
      break;
      case 'database':
        iconName = 'storage';
        clrClass = 'apd-blue';
      break;
      case 'profiler':
        iconName = 'format_textdirection_r_to_l';
        clrClass = 'apd-brown';
      break;
      case 'log':
        iconName = 'format_line_spacing';
        clrClass = 'apd-brown';
      break;
      case 'visualizer':
        iconName = 'pie_chart';
        clrClass = 'apd-brown';
      break;
      default :
        iconName = 'airplay';
        clrClass = 'apd=blue';
    }
    return {iconName: iconName, clrClass:clrClass};
  }

  public convertMstoTime(intMs){
    if (isNaN(intMs)) return intMs;
    let ms = intMs%1000;
    let Sec = Math.floor(intMs/1000);
    let convSec = this.convertSecToTime(Sec);
    return convSec+"."+ms;
  }
  
  public convertSecToTime(intSeconds){
    let hours = Math.floor(intSeconds / 3600);
    let minutes = Math.floor((intSeconds - (hours * 3600)) / 60);
    let sec = intSeconds - (hours * 3600) - (minutes * 60);
    let timeString = hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + sec.toString().padStart(2, '0');
    return timeString;
  }

  public convertToIndiaSystem(amount){
    let strAmt = amount.toString();
    strAmt = strAmt.split('.')[0];
    let length = strAmt.length;
    let modAmt='';
    if (length <=3){
      return strAmt+'.00';
    }
    modAmt = ","+strAmt.substring(strAmt.length-3);
    if (length == 11) modAmt = strAmt.substring(0,2)+","+strAmt.substring(2,4)+","+strAmt.substring(4,6)+","+strAmt.substring(6,8)+modAmt;
    else if (length == 10) modAmt = strAmt.substr(0,1)+","+strAmt.substring(1,3)+","+strAmt.substring(3,5)+","+strAmt.substring(5,7)+modAmt;
    else if (length == 9) modAmt = strAmt.substring(0,2)+","+strAmt.substring(2,4)+","+strAmt.substring(4,6)+modAmt;
    else if (length == 8) modAmt = strAmt.substr(0,1)+","+strAmt.substring(1,3)+","+strAmt.substring(3,5)+modAmt;
    else if (length == 7) modAmt = strAmt.substring(0,2)+","+strAmt.substring(2,4)+modAmt;
    else if (length == 6) modAmt = strAmt.substring(0,1)+","+strAmt.substring(1,3)+modAmt;
    else if (length == 5) modAmt = strAmt.substring(0,2)+modAmt;
    else if (length == 4) modAmt = strAmt.substring(0,1)+modAmt;
    else {
      modAmt = strAmt;
    }
    return modAmt+'.00';
  }

  public convertDate(strDate){
    let date = new Date(strDate);
    if (date.toString() == "Invalid Date") return strDate;
    return date.toLocaleDateString([],{year:'numeric',month:'short', day:'numeric'});
  }

  public convertDateTime(strDate){
    let repStrDate = strDate.toString().replace(' ','');
    if (!isNaN(repStrDate)) repStrDate = Number(repStrDate);
    let date = new Date(repStrDate);
    if (date.toString() == "Invalid Date") return strDate;
    return date.toLocaleString([],{year:'numeric',month:'short', day:'numeric', hour: '2-digit', minute: '2-digit', hour12: false});
  }

  public convertTime(strDate){
    let date = new Date(strDate);
    if (date.toString() == "Invalid Date") return strDate;
    return date.toLocaleTimeString([],{hour: '2-digit', minute: '2-digit', hour12: false});
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

  public encrypt(val){
    var key = CryptoJS.enc.Utf8.parse(environment.keyEncryptDecrypt);
    var iv = CryptoJS.enc.Hex.parse(this.randomString(32));
    var encrypted = CryptoJS.AES.encrypt(val, key, { 
      iv: iv, 
      mode: CryptoJS.mode.CBC
    });   
    var output = encrypted.ciphertext.toString();
    return iv+":"+output;
  }
   
  public decrypt(val){
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

	private tokenExpired(token: string) {
		const expiry = (JSON.parse(atob(token.split('.')[1]))).exp;
		return (Math.floor((new Date).getTime() / 1000)) >= expiry;
	}

  public loggedIn() {
    let token = sessionStorage.getItem("token");
    if (token == undefined) return false;
		if (this.tokenExpired(token)) {
			console.log("Token expired");
      return false;
    } else {
      return true;
    }
  }

  public cmp2Array(arr1, arr2){
    if (arr1 == undefined || arr2 == undefined) return false;
    return arr1.sort().toString()==arr2.sort().toString();
  }

  public getMonthShortName(month){
    if (Number(month).toString()=='NaN') return month;
    if (month < 1 || month > 12) return month;
    let mon = 'mon'+month;
    let arrMonth = {mon1:'Jan',mon2:'Feb',mon3:'Mar',mon4:'Apr',mon5:'May',mon6:'Jun',mon7:'Jul',mon8:'Aug',mon9:'Sep',mon10:'Oct',mon11:'Nov',mon12:'Dec'}
    return arrMonth[mon];
  }

  public getMonthFullName(month){
    if (Number(month).toString()=='NaN') return month;
    if (month < 1 || month > 12) return month;
    let mon = 'mon'+month;
    let arrMonth = {mon1:'January',mon2:'February',mon3:'March',mon4:'April',mon5:'May',mon6:'June',mon7:'July',mon8:'August',mon9:'September',mon10:'October',mon11:'November',mon12:'December'}
    return arrMonth[mon];
  }
}

