import { UserModel } from "../models/userModel";
const settings = require('../config/constants');
const {checkDb, dbConnected} = require("../controllers/initializeController");
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

let userClass = new UserModel();
async function getAccess(details:any, user:any, ip:string) {
    const token = jwt.sign({ userId: details[0].user_id, ip: ip }, settings.settings.jwtKey, { expiresIn: settings.settings.tokenExpiresIn });
    addLoginHistory(user, ip, "Successfully logged", true, token);
    delete details[0]["password"];
    let sendData = { token: token, user: details[0]};
    let encryptData = settings.encrypt(JSON.stringify(sendData));
    let response = { success: true, result: encryptData };
    return response;
}

function addLoginHistory(user:any, ipAddress:string, message:string, status:boolean, token:any) {
    if (dbConnected()){
        userClass.addLoginHistory(user.email, ipAddress,message,status,token);
    }
    else {
        checkDb();
    }
}

async function login(user:any, ipAdd:string) {
    try {
        if (dbConnected()){
            let response;
            let result = await userClass.login(user.email);
            if (result.success) {
                if (result.rowCount > 0) {
                    let details = result.rows;
                    let hashPass = settings.MD5Hash(Buffer.from(user.password));
                    if (hashPass === details[0].password) {
                        response = await getAccess(details, user,ipAdd);
                    }
                    else {
                        addLoginHistory(user, ipAdd, "Invalid password " + user.password, false, null);
                        response = { success: false, invalidToken: false, message: "Invalid password" };
                    }
                } 
                else {
                    addLoginHistory(user, ipAdd, "Invalid login Name " + user.email, false, null);
                    response = { success: false, message: "Invalid login name " + user.email };
                }
                return response;
            }
            else {
                return {success: false, message: result.message};
            }
        }
        else {
            checkDb();
            return {success:false, message:"DB connection failure, please try after some time"};
        }
    }
    catch (e) {
        return {success:false, status:400, message:e.message};
    }
}

function validateToken(token:string){
    try{
        let decoded = jwt.verify(token, settings.settings.jwtKey);
        if (!dbConnected()) {
            return { success: false, invalidToken: false, message: 'DB Connection Failure' };
        } else {
            return {success:true, decoded:decoded};
        }
    }
    catch (e){
        return { success: false, invalidToken: true, message: 'Session Expired'};
    }
}

function logout(token:string) {
    userClass.logout(token);
}

async function validateEmail(email:string){
    try {
        let result = await userClass.validateEmail(email);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}
async function getOTP(param: any) {
    try {
        let msg;
        let is_valid_on = false, IsResSuccess = false;
        let verify_code = Math.floor(Math.random() * (9999 - 1000) + 1000);
        param["verify_code"] = verify_code;
        let result = await userClass.getVerifyLinkDetails(param.email);
        if (result.success && result.rowCount > 0) {
            is_valid_on = result.rows[0].is_valid_on;
            IsResSuccess = is_valid_on;
            if (!is_valid_on) {
                let updateResult = await userClass.updVerifyLink(param);
                IsResSuccess = updateResult.success;
            }
        } else {
            let insResult = await userClass.insVerifyLink(param);
            IsResSuccess = insResult.success;
        }
        if (IsResSuccess) {
            let mailResponse = is_valid_on ? { success: true } : await sendEmail(param.email, verify_code);
            console.log("mailResponse", mailResponse);
            //let mailResponse = is_valid_on ? { success: true } : await sendEmail({emailId: "siddiqa@softsmith.com"}, verify_code);
            msg = !mailResponse.success ? "Failed to send PIN, Please try again after some time" : is_valid_on ? "PIN has already been sent to your Mail, Please Check" : "PIN has been sent to your Mail, Please Check";
            return { success: mailResponse.success, is_valid_on: is_valid_on, message: msg };
        } else {
            return { success: false, message: "Failed to send PIN Please Try Again" };
        }
    }
    catch (e) {
        return { success: false, message: e.message };
    }
}

async function validateOTP(param: any) {
    try {
        let msg = '', result, result2;
        result = await userClass.getVerifyLinkDetails(param.email);
        if (result.rows[0].verify_code == param.OTP) {
            if (result.rows[0].is_valid_on == true) {
                await userClass.validateOTP(param);
                msg = "Validation Successful"
            } else if (result.rows[0].is_valid_on == false) {
                msg = "PIN Expired, Please generate PIN again"
            } 
            return { success: true, message: msg };
        }
        else {
           return { success: false, message: "PIN match failed, Please Check" };
        }
    }
    catch (e) {
        return { success: false, message: e.message };
    }
}

async function changeForgottenPassword(param: any) {
    try {
        param["hash_password"] = settings.MD5Hash(Buffer.from(param.password));
        let result = await userClass.changeForgottenPassword(param);
        if (result.success) {
            return { success: true, rowCount: result.rowCount, result: result.rows };
        }
        else {
            return { success: false, message: result.message };
        }
    }
    catch (e) {
        return { success: false, message: e.message };
    }
}

async function changePassword(param:any){
    try {
        param["hash_password"] = settings.MD5Hash(Buffer.from(param.password));
        let result = await userClass.changePassword(param);
        if (result.success) {
            return {success:true,rowCount:result.rowCount,result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function updateProfile(param:any){
    try {
        let result = await userClass.updateProfile(param);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function sendEmail(email: any, verify_code: number) {
    try {
        let sNumber = verify_code.toString().split("");
        let code = sNumber.map(Number);
        let mailDetails = {
            code1: code[0],
            code2: code[1],
            code3: code[2],
            code4: code[3]
        }       
        const emailId = {
            emailId: email,
            cc: '',
            bcc: ''
        }
        const emailParam = {
            htmlFile: 'adqvest_forgot_password',
            mailDetails: JSON.stringify(mailDetails),
            emailIds: JSON.stringify(emailId),
            mailSubject: 'AdqVest Password Reset',
        };
        let url = settings.MAIL_SERVICE_URL + "/getMailParam";
        let response = await fetch(url, { 
            method: 'POST', 
            body: JSON.stringify(emailParam), 
            headers: { 
                'Content-Type': 'application/json' 
            } 
        });
        let jsonRes = await response.json();
        if (jsonRes.success) {
            return { success: true };
        } else {
            return { success: false, message: jsonRes.message };
        }
    } catch (e) {
        console.log("error",e);
        return { success: false, message: e.message };
    }
}

async function addUsrLic(param:any){
    try {
        let result = await userClass.addUsrLic(param);
        if (result.success) {
            param["invited_by"] = param.userId;
            param["is_owner"] = true;
            await userClass.insInvitationWithInvitedOn(param);
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function updUsrLic(param:any){
    try {
        let result = await userClass.updUsrLic(param);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function insInvitation(param:any){
    try {
        //check whether the email already exists in accepted stage for this user with another group
        let result = await userClass.checkInvitationExists(param.email);
        if (result.success && result.rowCount > 0) {
            return {success:false,rowCount:result.rowCount, message:"Member belongs to another group"};
        }
        else if (result.success){
            //check whether this invitee is an owner and holding a group
            let result1 = await userClass.checkInvitationOwner(param.email);
            if (result1.success && result1.rowCount > 0){
                return {success:false,rowCount:result.rowCount, message:param.email+" is already an owner of another group, cannot be invited"};
            }
            //check whether more than one invitation for this user
            let result2 = await userClass.checkMoreThanOneInvitation(param.email);
            let result3 = await userClass.checkLoginExists(param.email)
            if (result2.success && result2.rowCount==0 && result3.rowCount>0){
                await userClass.updInvitationToExistingUser(param);
                result = await userClass.insInvitationWithInvitedOn(param);
            }
            else {
                result = await userClass.insInvitation(param);
            }
            if (result.success){
                return {success:true,rowCount:result.rowCount, message:"Successfully Sent Invitation"};
            }
            else {
                return {success:false, message:result.message };
            }
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}
async function getInvitedUsers(userId:number){
    try {
        let result = await userClass.getInvitedUsers(userId);
        if (result.success){
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}
async function delInvitation(param:any){
    try {
        let result = await userClass.removeInviteReference(param);
        if (!result.success) {
            return {success:false,rowCount:result.rowCount, message: result.message};
        }
        else {
            result = await userClass.delInvite(param);
            if (result.success){
                return {success:true,rowCount:result.rowCount, message:"Successfully deleted the member"};
            }
            else {
                return {success:false, message:result.message };
            }
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function getPendingInvitations(email:string){
    try {
        let result = await userClass.getPendingInvitations(email);
        if (result.success){
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function updInvitationToExistingUser(param:any){
    try {
        let result = await userClass.updInvitationToExistingUser(param);
        if (result.success){
            await userClass.updInvitation(param);
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function rejInvitation(param:any){
    try {
        let result = await userClass.rejInvitation(param);
        if (result.success){
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function delAccount(userId:number){
    try {
        let result = await userClass.delAccount(userId);
        if (result.success){
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

//delAccount

async function getUserAllRole(param:any){
    try {
        let result = await userClass.getUserAllRole(param);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function getRoleStatForAdmin(){
    try {
        let result = await userClass.getRoleStatForAdmin();
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function getUserCompany(userId:number){
    try {
        let result = await userClass.getUserCompany(userId);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function getRoleStatForCompAdmin(param:any){
    try {
        let result = await userClass.getRoleStatForCompAdmin(param);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function getUserStat(){
    try {
        let result = await userClass.getUserStat();
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function getAllUsers(){
    try {
        let result = await userClass.getAllUsers();
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function checkUsrEmailExists(email:string, user_id:number){
    try {
        let result = await userClass.checkUsrEmailExists(email, user_id);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function registerUser(param:any){
    try {
        let chkInvitation = await userClass.checkMoreThanOneInvitation(param.email);
        if (chkInvitation.success && chkInvitation.rowCount == 1){
            param["invited_by"] = chkInvitation.rows[0].invited_by;
            let p = {invitation_id:chkInvitation.rows[0].invitation_id}
            await userClass.updInvitation(p);
        }
        param["hash_password"] = settings.MD5Hash(Buffer.from(param.password));
        let result = await userClass.registerUser(param);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function updUser(param:any){
    try {
        let result = await userClass.updUser(param);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function activateUser(param:any){
    try {
        let result = await userClass.activateUsr(param);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function delUsr(param:any){
    try {
        let result = await userClass.delUsr(param);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function getUserLic(param:any){
    try {
        let result = await userClass.getUserLic(param);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function insUserCompany(userId:number, user_id:number, data:any){
    try {
        let result = await userClass.delAllUsrCompanyForUser(user_id);
        if (result.success) {
            let result1 = await userClass.addUsrCompanyForUser(userId, data);
            if (result1.success) return {success:true,rowCount:result1.rowCount, result:result1.rows };
            else return {success:false, message:result1.message}
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function getUserStatForCompAdmin(userId:number){
    try {
        let result = await userClass.getUserStatForCompAdmin(userId);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function getUsersForCompAdmin(userId:number){
    try {
        let result = await userClass.getUsersForCompAdmin(userId);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function insUsrCompanyForCompAdmin(param:any){
    try {
        let result = await userClass.insUsrCompany(param);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function getAdminRoles(){
    try {
        let result = await userClass.getAdminRoles();
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function getCompanyUnqRoleName(companyId:number){
    try {
        let result = await userClass.getCompanyUnqRoleName(companyId);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function getModulesAndRolesForCompany(companyId:number){
    try {
        let result = await userClass.getModulesAndRolesForCompany(companyId);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function insRole(userId:number, data:any){
    try {
        let result = await userClass.insRole(userId, data);
        if (result.success) {
            return {success:true,rowCount:result.rowCount, result:result.rows };
        }
        else {
            return {success:false, message:result.message };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

export = {login, validateToken, validateEmail, sendEmail, getOTP, validateOTP, changeForgottenPassword, changePassword, updateProfile,logout, getUserLic, updUsrLic,addUsrLic, insInvitation, getInvitedUsers,delInvitation,getPendingInvitations,updInvitationToExistingUser,rejInvitation,delAccount,getUserAllRole, getRoleStatForCompAdmin,getUserCompany, getRoleStatForAdmin, getUserStat, getAllUsers,checkUsrEmailExists, registerUser, updUser, delUsr, activateUser, insUserCompany,getUserStatForCompAdmin, getUsersForCompAdmin, insUsrCompanyForCompAdmin,getAdminRoles, getCompanyUnqRoleName, getModulesAndRolesForCompany,insRole};

// updUsrLic,addUsrLic