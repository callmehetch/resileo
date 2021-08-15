import { CompanyContactModel } from "../models/companyContactModel";
const path = require('path');
const fs = require('fs');

const companyContactClass = new CompanyContactModel();

async function getAddressTypeList(){
    try {
        let result = await companyContactClass.getAddressTypeList();
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

async function getParentCompanyList(){
    try {
        let result = await companyContactClass.getParentCompanyList();
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

async function getCountryListForCompany(){
    try {
        let result = await companyContactClass.getCountryListForCompany();
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

async function getStateListForCompany(country_id:number){
    try {
        let result = await companyContactClass.getStateListForCompany(country_id);
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

async function getCityListForCompany(state_id:number){
    try {
        let result = await companyContactClass.getCityListForCompany(state_id);
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

async function getOfficeTypeList(){
    try {
        let result = await companyContactClass.getOfficeTypeList();
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

async function insContact(param:any){
    try {
        let result = await companyContactClass.insContact(param);
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

async function updContact(param:any){
    try {
        let result = await companyContactClass.updContact(param);
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

async function insCompany(param:any){
    try {
        let filePath, relativePath, isResponse = false,msg;
        if (param["LogoFileName"] != undefined) {
            let image = param.CompanyLogo.replace(/data:image\/([A-Za-z]+);base64\,/g, "");
            let unqFileName = new Date().getTime().toString(36);
            filePath = path.join(__dirname, "../fileuploads/", unqFileName + param["LogoFileName"]);
            relativePath = "../fileuploads/" + unqFileName + param["LogoFileName"];
            try {
              fs.writeFileSync(filePath, image, 'base64');
            } catch (e) {
              console.log(e);
            }
        }
        param["relativePath"] = relativePath;
        let result = await companyContactClass.insCompany(param);
        if (result.success) {
            param.CompanyId = result.rows[0].company_id;
            let res1 = await companyContactClass.insCompanyAddress(param);
            let res = await companyContactClass.insTaxDetails(param);
            if(res.success && res1.success) {
              isResponse = true; 
              msg = "Company details added successfully";
            }
        }
        if(isResponse && result.success){
            return {success:true,rowCount:result.rowCount, message:msg };
        }
        else {
            return {success:false, message:"Failed to add company details" };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function updCompany(param:any){
    try {
        let filePath, relativePath, isResponse = false,msg;
        if (param["LogoFileName"] != undefined) {
            let image = param.CompanyLogo.replace(/data:image\/([A-Za-z]+);base64\,/g, "");
            let unqFileName = new Date().getTime().toString(36);
            filePath = path.join(__dirname, "../fileuploads/", unqFileName + param["LogoFileName"]);
            relativePath = "../fileuploads/" + unqFileName + param["LogoFileName"];
            try {
              fs.writeFileSync(filePath, image, 'base64');
            } catch (e) {
              console.log(e);
            }
        }
        param["relativePath"] = relativePath;
        let result = await companyContactClass.updCompany(param);
        if (result.success) {
            let res = await companyContactClass.insCompanyAddress(param);
            let res1 = await companyContactClass.insTaxDetails(param);
            if(res.success && res1.success) {
                isResponse = true; 
                msg = "Company details added successfully";
            }
        }

        if(isResponse && result.success){
            return {success:true,rowCount:result.rowCount, message:msg };
        }
        else {
            return {success:false, message:'Failed to add company details' };
        }
    }
    catch (e){
        return {success:false, message:e.message};
    }
}

async function getCompanyOfType(accountTypeId:number){
    try {
        let result = await companyContactClass.getCompanyOfType(accountTypeId);
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

async function getAdminCompany(){
    try {
        let result = await companyContactClass.getAdminCompany();
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

async function getUsersCompany(param:any){
    try {
        let result = await companyContactClass.getUsersCompany(param);
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

async function insCompanyLicense(param:any){
    try {
        let result = await companyContactClass.insCompanyLicense(param);
        if (result.success) {
            param['cl_id'] = result.rows[0].cl_id;
            let res = await companyContactClass.insCompanyLicenseModule(param);
            if(res.success){
                 return {success:true, rowCount:result.rowCount, result:result.rows };
           }else{
                return {success:false, message:res.message };
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

async function getlicenseModules(param:any){
    try {
        let result = await companyContactClass.getlicenseModules(param);
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

async function updCompanyLicense(param:any){
    try {
        let result = await companyContactClass.delCompanyLicense(param);
        if (result.success) {
            let res = await companyContactClass.insCompanyLicenseModule(param);
            if(res.success){
                 return {success:true, rowCount:result.rowCount, result:result.rows };
           }else{
                return {success:false, message:res.message };
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

async function getCompanyForId(companyId:number){
    try {
        let result = await companyContactClass.getCompanyForId(companyId);
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

export = {getAddressTypeList, getUsersCompany, getStateListForCompany, getParentCompanyList, getCountryListForCompany, getCityListForCompany, getOfficeTypeList, updContact, insContact, insCompany, updCompany, getCompanyOfType, getAdminCompany, getCompanyForId, insCompanyLicense, getlicenseModules, updCompanyLicense }
