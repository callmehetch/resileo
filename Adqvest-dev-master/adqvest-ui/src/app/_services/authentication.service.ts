import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class AuthenticationService {
    domain = environment.domain;
    uploaderResp:string;

    private sessionStorage = new Subject<boolean>();

    constructor(
        private http: HttpClient,
        private router: Router,
    ) {}

    storeSessionData(data){
        data = JSON.parse(data);
        this.setItem('token',data.token);
        this.setItem('apdUser', data.user.name);
        // this.setItem('apdUserDet', JSON.stringify(data.user));
    }

    watchStorage(): Observable<any> {
        return this.sessionStorage.asObservable();
    }

    setItem(key: string, data: any) {
        sessionStorage.setItem(key, data);
        // sessionStorage.setItem(key, data);
        this.sessionStorage.next(true);
    }

    removeItem(key) {
        sessionStorage.removeItem(key);
        // sessionStorage.removeItem(key);
        this.sessionStorage.next(false);
    }
    
    logout() {
        sessionStorage.clear();
        // sessionStorage.clear();
    }
  
    invalidSession(resp){
        let msg;
        if (resp.invalidToken) {
            console.log("invalidToken");
            msg = 'Session expired, please login again.';
            this.logout();
            this.router.navigate(['/login']);
        } else if (!resp.success) {
            if (resp.message != undefined) {
                msg = resp.message;
            }
        }
        return msg;
    }
    
    async login(user){
        return this.http.post<any>( this.domain +'/api/login',user).toPromise();
    }
    async logoutUser(data) {
        return this.http.post<any>(this.domain+'/api/logoutUser',data).toPromise();
    }

    async validateEmail(param) {
        return this.http.post<any>(this.domain+'/api/validateEmail', param).toPromise();
    }

    async registerUser(param) {
        return this.http.post<any>(this.domain+'/api/registerUser', param).toPromise();
    }
    async getOTP(param) {
        return this.http.post<any>(this.domain+'/api/getOTP', param).toPromise();
    }
    async validateOTP(param) {
        return this.http.post<any>(this.domain+'/api/validateOTP', param).toPromise();
    }
    async changeForgottenPassword(param) {
        return this.http.post<any>(this.domain+'/api/changeForgottenPassword', param).toPromise();
    }
    async changePassword(param) {
        return this.http.post<any>(this.domain+'/api/changePassword', param).toPromise();
    }
    
    async updateProfile(param) {
        return this.http.post<any>(this.domain+'/api/updateProfile', param).toPromise();
    }

    async getPlan() {
        return this.http.get<any>(this.domain+'/api/getPlan').toPromise();
    }

    async getUserLic() {
        return this.http.get<any>(this.domain+'/api/getUserLic').toPromise();
    }

    async addUsrLic(param) {
        return this.http.post<any>(this.domain+'/api/addUsrLic', param).toPromise();
    }

    async updUsrLic(param) {
        return this.http.post<any>(this.domain+'/api/updUsrLic', param).toPromise();
    }

    async insInvitation(param) {
        return this.http.post<any>(this.domain+'/api/insInvitation', param).toPromise();
    }

    async getInvitedUsers() {
        return this.http.get<any>(this.domain+'/api/getInvitedUsers').toPromise();
    }

    async delInvitation(param) {
        return this.http.post<any>(this.domain+'/api/delInvitation', param).toPromise();
    }

    async getPendingInvitations(param) {
        return this.http.post<any>(this.domain+'/api/getPendingInvitations', param).toPromise();
    }

    async updInvitationToExistingUser(param) {
        return this.http.post<any>(this.domain+'/api/updInvitationToExistingUser', param).toPromise();
    }

    async rejInvitation(param) {
        return this.http.post<any>(this.domain+'/api/rejInvitation', param).toPromise();
    }

    async getUserLicOfInvitedUser(param) {
        return this.http.post<any>(this.domain+'/api/getUserLicOfInvitedUser', param).toPromise();
    }

    async getInvitedUsersByOwner(param) {
        return this.http.post<any>(this.domain+'/api/getInvitedUsersByOwner', param).toPromise();
    }

    async optOut(param) {
        return this.http.post<any>(this.domain+'/api/optOut', param).toPromise();
    }

    async delAccount() {
        return this.http.get<any>(this.domain+'/api/delAccount').toPromise();
    }

    async clickhouseQuery(param) {
        return this.http.post<any>(this.domain+'/api/clickhouseQuery', param).toPromise();
    }

    async insQuery(param) {
        return this.http.post<any>(this.domain+'/api/insQuery', param).toPromise();
    }

    async getAllWidgets() {
        return this.http.get<any>(this.domain+'/api/getAllWidgets').toPromise();
    }

    async getMyWidgets() {
        return this.http.get<any>(this.domain+'/api/getMyWidgets').toPromise();
    }

    async getSectors() {
        return this.http.get<any>(this.domain+'/api/getSectors').toPromise();
    }

    async updStatusQuery(param) {
        return this.http.post<any>(this.domain+'/api/updStatusQuery', param).toPromise();
    }

    async updQuery(param) {
        return this.http.post<any>(this.domain+'/api/updQuery', param).toPromise();
    }

    async getSearchWidgets(param) {
        return this.http.post<any>(this.domain+'/api/getSearchWidgets', param).toPromise();
    }

    async getPublishedSearchWidgets(param) {
        return this.http.post<any>(this.domain+'/api/getPublishedSearchWidgets', param).toPromise();
    }

    async delWidget(param) {
        return this.http.post<any>(this.domain+'/api/delWidget', param).toPromise();
    }
    ////delWidget, 


//Not in use code
    async getAddressTypeList() {
        return this.http.get<any>(this.domain+'/api/getAddressTypeList').toPromise();
    }
    async getParentCompanyList() {
        return this.http.get<any>(this.domain+'/api/getParentCompanyList').toPromise();
    }
    async getOfficeTypeList() {
        return this.http.get<any>(this.domain+'/api/getOfficeTypeList').toPromise();
    }
    async getUsersCompany(param) {
        return this.http.post<any>(this.domain+'/api/getUsersCompany',param).toPromise();
    }
    async insCompanyLicense(param){
        return this.http.post<any>(this.domain+'/api/insCompanyLicense',param).toPromise();
    }
    async getlicenseModules(param){
        return this.http.post<any>(this.domain+'/api/getlicenseModules',param).toPromise();
    }
    async updCompanyLicense(param){
        return this.http.post<any>(this.domain+'/api/updCompanyLicense',param).toPromise();
    }
    async getCountryListForCompany() {
        return this.http.get<any>(this.domain+'/api/getCountryListForCompany').toPromise();
    }
    async getStateListForCompany(param) {
        return this.http.post<any>(this.domain+'/api/getStateListForCompany', param).toPromise();
    }
    async getCityListForCompany(param) {
        return this.http.post<any>(this.domain+'/api/getCityListForCompany', param).toPromise();
    }

//insInvitation
    async getContractsByAcc(param) {
        return this.http.post<any>(this.domain+'/api/getContractsByAcc', param).toPromise();
    }

    async getLookupValuesForContractByCompany(param) {
        return this.http.post<any>(this.domain+'/api/getLookupValuesForContractByCompany', param).toPromise();
    }
    async getItemTypes(param) {
        return this.http.post<any>(this.domain+'/api/getItemTypes', param).toPromise();
    }
    async getServices(param) {
        return this.http.post<any>(this.domain+'/api/getServices', param).toPromise();
    }
    async addContract(param) {
        return this.http.post<any>(this.domain+'/api/addContract', param).toPromise();
    }
    //getCarrier
    /*New Code */
    async getBuyer(param) {
        return this.http.post<any>(this.domain+'/api/getBuyer', param).toPromise();
    }
    async getFF() {
        return this.http.get<any>(this.domain+'/api/getFF').toPromise();
    }
    async getDocs() {
        return this.http.get<any>(this.domain+'/api/getDocs').toPromise();
    }
    async getLookupValuesForSOP(param) {
        return this.http.post<any>(this.domain+'/api/getLookupValuesForSOP', param).toPromise();
    }
    async getPorts() {
        return this.http.get<any>(this.domain+'/api/getPorts').toPromise();
    }
    async getCountry() {
        return this.http.get<any>(this.domain+'/api/getCountry').toPromise();
    }
    async getCarrier() {
        return this.http.get<any>(this.domain+'/api/getCarrier').toPromise();
    }
    async getCountryCode() {
        return this.http.get<any>(this.domain+'/api/getCountryCode').toPromise();
    }
    async insSOP(param) {
        return this.http.post<any>(this.domain+'/api/insSOP', param).toPromise();
    }
    async insUpdContact(param) {
        return this.http.post<any>(this.domain+'/api/insUpdContact', param).toPromise();
    }
    async getSOPContacts(param) {
        return this.http.post<any>(this.domain+'/api/getSOPContacts', param).toPromise();
    }
    async delSOPContacts(param) {
        return this.http.post<any>(this.domain+'/api/delSOPContacts', param).toPromise();
    }
    async getSOPContactPorts(param) {
        return this.http.post<any>(this.domain+'/api/getSOPContactPorts', param).toPromise();
    }
    async getSOPDocs(param) {
        return this.http.post<any>(this.domain+'/api/getSOPDocs', param).toPromise();
    }
    async saveDocs(param) {
        return this.http.post<any>(this.domain+'/api/saveDocs', param).toPromise();
    }
    async getSOPs() {
        return this.http.get<any>(this.domain+'/api/getSOPs').toPromise();
    }
    async getCountryLookup() {
        return this.http.get<any>(this.domain+'/api/getCountryLookup').toPromise();
    }
    async getStateLookup() {
        return this.http.get<any>(this.domain+'/api/getStateLookup').toPromise();
    }
    async getCityLookup() {
        return this.http.get<any>(this.domain+'/api/getCityLookup').toPromise();
    }
    async getCompanyTypeLookup() {
        return this.http.get<any>(this.domain+'/api/getCompanyTypeLookup').toPromise();
    }
    async insUpdCompany(param) {
        return this.http.post<any>(this.domain+'/api/insUpdCompany', param).toPromise();
    }
    async getSOPCompany(param) {
        return this.http.post<any>(this.domain+'/api/getSOPCompany', param).toPromise();
    }
    async delSOPCompany(param) {
        return this.http.post<any>(this.domain+'/api/delSOPCompany', param).toPromise();
    }
    async getAllCompForSOP(param) {
        return this.http.post<any>(this.domain+'/api/getAllCompForSOP', param).toPromise();
    }
    async addRemoveSOPCompanies(param) {
        return this.http.post<any>(this.domain+'/api/addRemoveSOPCompanies', param).toPromise();
    }
    async getCHGrp() {
        return this.http.get<any>(this.domain+'/api/getCHGrp').toPromise();
    }
    async getSOPCHForGroup(param) {
        return this.http.post<any>(this.domain+'/api/getSOPCHForGroup', param).toPromise();
    }
    async checkCreateCHForSOP(param) {
        return this.http.post<any>(this.domain+'/api/checkCreateCHForSOP', param).toPromise();
    }
    async updSOPCHIsSelected(param) {
        return this.http.post<any>(this.domain+'/api/updSOPCHIsSelected', param).toPromise();
    }
    async updSOPCHfields(param) {
        return this.http.post<any>(this.domain+'/api/updSOPCHfields', param).toPromise();
    }
    async getUserCompany(param) {
        return this.http.post<any>(this.domain+'/api/getUserCompany', param).toPromise();
    }
    async getRoleStatForCompAdmin(param) {
        return this.http.post<any>(this.domain+'/api/getRoleStatForCompAdmin', param).toPromise();
    }
    async getRoleStatForAdmin() {
        return this.http.get<any>(this.domain+'/api/getRoleStatForAdmin').toPromise();
    }
    async getUserStat() {
        return this.http.get<any>(this.domain+'/api/getUserStat').toPromise();
    }
    async getAllUsers() {
        return this.http.get<any>(this.domain+'/api/getAllUsers').toPromise();
    }
    async checkUsrEmailExists(param) {
        return this.http.post<any>(this.domain+'/api/checkUsrEmailExists', param).toPromise();
    }
    async updUser(param) {
        return this.http.post<any>(this.domain+'/api/updUser', param).toPromise();
    }
    async delUsr(param) {
        return this.http.post<any>(this.domain+'/api/delUsr', param).toPromise();
    }
    async activateUser(param) {
        return this.http.post<any>(this.domain+'/api/activateUser', param).toPromise();
    }
    async getAllCompanyType() {
        return this.http.get<any>(this.domain+'/api/getAllCompanyType').toPromise();
    }
    async getCompanyOfType(param) {
        return this.http.post<any>(this.domain+'/api/getCompanyOfType', param).toPromise();
    }
    async insUserCompany(param) {
        return this.http.post<any>(this.domain+'/api/insUserCompany', param).toPromise();
    }
    async getUserStatForCompAdmin() {
        return this.http.get<any>(this.domain+'/api/getUserStatForCompAdmin').toPromise();
    }
    async getUsersForCompAdmin() {
        return this.http.get<any>(this.domain+'/api/getUsersForCompAdmin').toPromise();
    }
    async insUsrCompanyForCompAdmin(param) {
        return this.http.post<any>(this.domain+'/api/insUsrCompanyForCompAdmin', param).toPromise();
    }
    async getAdminRoles() {
        return this.http.get<any>(this.domain+'/api/getAdminRoles').toPromise();
    }
    async getAdminCompany() {
        return this.http.get<any>(this.domain+'/api/getAdminCompany').toPromise();
    }
    async getCompanyUnqRoleName(param) {
        return this.http.post<any>(this.domain+'/api/getCompanyUnqRoleName', param).toPromise();
    }
    async getModulesAndRolesForCompany(param) {
        return this.http.post<any>(this.domain+'/api/getModulesAndRolesForCompany', param).toPromise();
    }
    async insRole(param) {
        return this.http.post<any>(this.domain+'/api/insRole', param).toPromise();
    }
    async getSOPContainer(param) {
        return this.http.post<any>(this.domain+'/api/getSOPContainer', param).toPromise();
    }
    async insSOPContainer(param) {
        return this.http.post<any>(this.domain+'/api/insSOPContainer', param).toPromise();
    }
    async updSOPContainer(param) {
        return this.http.post<any>(this.domain+'/api/updSOPContainer', param).toPromise();
    }
    async removeSOPContainer(param) {
        return this.http.post<any>(this.domain+'/api/removeSOPContainer', param).toPromise();
    }
    async getSOPCarrierAlloc(param) {
        return this.http.post<any>(this.domain+'/api/getSOPCarrierAlloc', param).toPromise();
    }
    async insSOPCarrierAlloc(param) {
        return this.http.post<any>(this.domain+'/api/insSOPCarrierAlloc', param).toPromise();
    }
    async updSOPCarrierAlloc(param) {
        return this.http.post<any>(this.domain+'/api/updSOPCarrierAlloc', param).toPromise();
    }
    async removeSOPCarrierAlloc(param) {
        return this.http.post<any>(this.domain+'/api/removeSOPCarrierAlloc', param).toPromise();
    }
    async getSOPCarrierAllocByPort(param) {
        return this.http.post<any>(this.domain+'/api/getSOPCarrierAllocByPort', param).toPromise();
    }
    async delSOPCarrierAllocForPort(param) {
        return this.http.post<any>(this.domain+'/api/delSOPCarrierAllocForPort', param).toPromise();
    }

    async getSOPId(param) {
        return this.http.post<any>(this.domain+'/api/getSOPId', param).toPromise();
    }

    async getSOPCarrierPref(param) {
        return this.http.post<any>(this.domain+'/api/getSOPCarrierPref', param).toPromise();
    }
    async insSOPCarrierPref(param) {
        return this.http.post<any>(this.domain+'/api/insSOPCarrierPref', param).toPromise();
    }
    async updSOPCarrierPref(param) {
        return this.http.post<any>(this.domain+'/api/updSOPCarrierPref', param).toPromise();
    }
    async removeSOPCarrierPref(param) {
        return this.http.post<any>(this.domain+'/api/removeSOPCarrierPref', param).toPromise();
    }
    async getSOPCarrierPrefByPort(param) {
        return this.http.post<any>(this.domain+'/api/getSOPCarrierPrefByPort', param).toPromise();
    }
    async delSOPCarrierPrefForPort(param) {
        return this.http.post<any>(this.domain+'/api/delSOPCarrierPrefForPort', param).toPromise();
    }

    //
}
