import { Initialize  } from "../models/initialize";
let log = require("../log");

let initClass = new Initialize();
let dbConnected = false;

// interface lookupValue {
//     lookup_name_id: number;
//     lookup_name:string;
//     display_name:string;
//     lookup_type:string;
//     require_validation:boolean;
//     company_id:number;
// }

// interface country {
//     id:number;
//     name: string; 
//     iso3: string |undefined; 
//     iso2: string |undefined; 
// }

// interface state {
//     id:number; 
//     name:string; 
//     country_id: number; 
// }

// interface city {
//     id: number, 
//     name: string, 
//     state_id: number, 
//     country_id: number
// }

// let lookupValue:lookupValue[] = [];
// let countryArr:country[] = [];
// let stateArr:state[] = [];
// let cityArr:city[] = [];

// function setLookupValueColl(){
//     return lookupValue;
// }

// function setCountryColl(){
//     return countryArr;
// }

// function setStateColl(){
//     return stateArr;
// }

// function setCityColl(){
//     return cityArr;
// }

function setDbConnected(){
    return dbConnected;
}

async function checkDb(){
    let result = await initClass.checkDB();
    if (result.success) {
        dbConnected = true;
    } 
    else {
        dbConnected = false;
        log.logger("error",`checkDb(), PSQL Connection Error ${result.message}, trying to connect in 10 sec`);
        setTimeout(() => {
            checkDb();
        }, 10000);
    }
    console.log("DbConnected", dbConnected);
}

async function getPlan(){
    try {
        let result = await initClass.getPlan();
        if (result.success){
            return {success:true, result:result.rows };
        }
        else {
            return {success:false, message: result.message };
        }
    }
    catch (e) {
        log.logger("error",`getPlan(), function Error ${e.message}`);
        return {success:false, message:e.message };
    }
}

async function getSectors(){
    try {
        let result = await initClass.getSectors();
        if (result.success){
            return {success:true, result:result.rows };
        }
        else {
            return {success:false, message: result.message };
        }
    }
    catch (e) {
        log.logger("error",`getSectors(), function Error ${e.message}`);
        return {success:false, message:e.message };
    }
}

export = {dbConnected:setDbConnected, checkDb,getPlan, getSectors};
