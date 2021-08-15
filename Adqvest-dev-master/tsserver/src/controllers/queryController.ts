import { QryModel } from "../models/query";
let qryClass = new QryModel();

async function insQuery(param:any){
    try {
        let result = await qryClass.insQuery(param);
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

async function getAllWidgets(){
    try {
        let result = await qryClass.getAllWidgets();
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

async function getMyWidgets(userId:number){
    try {
        let result = await qryClass.getMyWidgets(userId);
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

async function updStatusQuery(param:any){
    try {
        let result = await qryClass.updStatusQuery(param);
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

async function updQuery(param:any){
    try {
        let result = await qryClass.updQuery(param);
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

async function getSearchWidgets(search:string){
    try {
        let result = await qryClass.getSearchWidgets(search);
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

async function getPublishedSearchWidgets(search:string){
    try {
        let result = await qryClass.getPublishedSearchWidgets(search);
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

async function delWidget(widget_id:number){
    try {
        let result = await qryClass.delWidget(widget_id);
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

export = {insQuery,getAllWidgets,getMyWidgets,updStatusQuery,updQuery,getSearchWidgets,getPublishedSearchWidgets,delWidget}