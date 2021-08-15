import Router from "express-promise-router";
const clickhouse = require('../models/clickhouse');

const router = Router();
const settings = require("../config/constants");
const { login, logout, validateToken, validateEmail,getOTP, validateOTP, changeForgottenPassword, updateProfile, changePassword,getUserLic,updUsrLic, addUsrLic,insInvitation,getInvitedUsers, delInvitation,getPendingInvitations, updInvitationToExistingUser,rejInvitation,delAccount, getUserRole, getUserCompany,getRoleStatForCompAdmin, getRoleStatForAdmin, getUserStat, getAllUsers,checkUsrEmailExists,registerUser, updUser, delUsr, activateUser, insUserCompany, getUserStatForCompAdmin, getUsersForCompAdmin, insUsrCompanyForCompAdmin,getAdminRoles, getCompanyUnqRoleName, getModulesAndRolesForCompany,insRole } = require("../controllers/userController");
const cmn = require("../controllers/initializeController");
const { getAddressTypeList, getOfficeTypeList, getParentCompanyList,getUsersCompany, getCompanyForId, insCompanyLicense, getlicenseModules, updCompanyLicense, getCountryListForCompany, getStateListForCompany, getCityListForCompany,insCompany, updCompany } = require("../controllers/companyContactController");
const qryController = require("../controllers/queryController")
const log = require("../log");
//{checkDb, getPlan, getSectors}
module.exports = router;

interface lookupValue {
    lookup_name_id: number;
    lookup_name:string;
    display_name:string;
    lookup_type:string;
    require_validation:boolean;
    company_id:number;
}

let chDBConnected = false;

cmn.checkDb();
checkClickhouse();
async function checkClickhouse(){
    let r = await clickhouse.fnDbQuery("checkClickhouse","SELECT now()");
    if (r.success){
        console.log("clickhouse db connected");
        chDBConnected = true;
    }
    else {
        chDBConnected = false;
        console.log("Clickhouse failed to connect will try every min.");
        setTimeout(() => {
            checkClickhouse();
        }, 60000);
    }
}

function getRequestIP(req:any) {
    var ip;
    if (req.connection && req.connection.remoteAddress) {
        ip = req.connection.remoteAddress;
    } else if (req.headers['x-forwarded-for']) {
        ip = req.headers['x-forwarded-for'].split(",")[0];
    } else {
        ip = req.ip;
    }
    return ip;
}

function accessLog(req:any, duration:number, status:boolean) {
    log.accesslog("info", `${getRequestIP(req)}, ${req.url}, ${status}, ${duration}`);
}
router.post('/api/login', async (req, res) => {
    try {
        let dt = new Date().getTime();
        let user = JSON.parse(settings.decrypt(req.body.data));
        let result = await login(user,getRequestIP(req));
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `login Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.post('/api/validateEmail', async (req, res) => {
    try {
        let dt = new Date().getTime();
        let param = JSON.parse(settings.decrypt(req.body.param));
        let result = await validateEmail(param.email);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `validateEmail Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.post('/api/registerUser', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = JSON.parse(settings.decrypt(req.body.param));
        let result = await registerUser(param);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `registerUser Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.post('/api/getOTP', async (req, res) => {
    try {
        let dt = new Date().getTime();
        let param = req.body.param;
        let result = await getOTP(param);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getOTP Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.post('/api/validateOTP', async (req, res) => {
    try {
        let dt = new Date().getTime();
        let param = req.body.param;
        let result = await validateOTP(param);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getOTP Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
  });

router.post('/api/changeForgottenPassword', async (req, res) => {
    try {
        let dt = new Date().getTime();
        let param = req.body.param;      
        let result = await changeForgottenPassword(param);
        if (result.success) {
            accessLog(req, new Date().getTime()-dt, result.success);
            res.json(result);
        }
    } catch (e) {
      log.logger.error(process.pid + ' : ' + e.stack);
      res.json({ success: false, error: true, message: e.message });
    }
});

router.use(async (req:any, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        res.json({ success: false, invalidToken: true, message: 'No token provided' });
    } else {
        let result = validateToken(token);
        if (result.success){
            req.decoded = result.decoded;
            next();
        }
        else {
            res.json(result);
        }
    }
});

router.post('/api/changePassword', async (req, res) => {
    try {
        let dt = new Date().getTime();
        let param = req.body.param;      
        let result = await changePassword(param);
        if (result.success) {
            accessLog(req, new Date().getTime()-dt, result.success);
            res.json(result);
        }
    } catch (e) {
        log.logger.error(process.pid + ' : ' + e.stack);
        res.json({ success: false, error: true, message: e.stack });
    }
});

router.post('/api/updateProfile', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = req.body.param;
        param["user_id"] = req.decoded.userId;
        let result = await updateProfile(param);
        if (result.success) {
            accessLog(req, new Date().getTime()-dt, result.success);
            res.json(result);
        }
    } catch (e) {
      log.logger.error(process.pid + ' : ' + e.stack);
      res.json({ success: false, error: true, message: e.stack });
    }
});

router.get('/api/getUserLic', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let result = await getUserLic(req.decoded.userId);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getUserLic Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.post('/api/getUserLicOfInvitedUser', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = req.body;
        let result = await getUserLic(param.user_id);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getUserLicOfInvitedUser Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.post('/api/addUsrLic', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = req.body;
        param["userId"] = req.decoded.userId;
        let result = await addUsrLic(param);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        console.log(e);
        log.logger("error", `addUsrLic Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.post('/api/updUsrLic', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = req.body;
        param["userId"] = req.decoded.userId;
        let result = await updUsrLic(param);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `updUsrLic Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.post('/api/insInvitation', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = req.body;
        param["invited_by"] = req.decoded.userId;
        let result = await insInvitation(param);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `insInvitation Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});
router.get('/api/getInvitedUsers', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let result = await getInvitedUsers(req.decoded.userId);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getInvitedUsers Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.post('/api/getInvitedUsersByOwner', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = req.body;
        let result = await getInvitedUsers(param.user_id);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getInvitedUsersByOwner Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.get('/api/delInvitation', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let result = await delInvitation(req.decoded.userId);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `delInvitation Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.post('/api/optOut', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = req.body;
        let result = await delInvitation(param);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `delInvitation Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.post('/api/getPendingInvitations', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = req.body;
        // param["userId"] = req.decoded.userId;
        let result = await getPendingInvitations(param.email);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getPendingInvitations Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.post('/api/updInvitationToExistingUser', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = req.body;
        // param["userId"] = req.decoded.userId;
        let result = await updInvitationToExistingUser(param);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `updInvitationToExistingUser Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.post('/api/rejInvitation', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = req.body;
        // param["userId"] = req.decoded.userId;
        let result = await rejInvitation(param);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `rejInvitation Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.get('/api/delAccount', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let result = await delAccount(req.decoded.userId);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `delAccount Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.post('/api/clickhouseQuery', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = JSON.parse(settings.decrypt(req.body.param));
        let result = await clickhouse.fnDbQuery("clickhouseQuery",param.queryText);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `clickhouseQuery Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.post('/api/insQuery', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = JSON.parse(settings.decrypt(req.body.param));
        param["userId"] = req.decoded.userId;
        let result = await qryController.insQuery(param);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `insQuery Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.get('/api/getAllWidgets', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let result = await qryController.getAllWidgets();
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getAllWidgets Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.get('/api/getMyWidgets', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let result = await qryController.getMyWidgets(req.decoded.userId);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getMyWidgets Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.get('/api/getSectors', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let result = await cmn.getSectors();
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getSectors Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.post('/api/updStatusQuery', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = JSON.parse(settings.decrypt(req.body.param));
        param["userId"] = req.decoded.userId;
        let result = await qryController.updStatusQuery(param);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `updStatusQuery Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.post('/api/updQuery', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = JSON.parse(settings.decrypt(req.body.param));
        param["userId"] = req.decoded.userId;
        let result = await qryController.updQuery(param);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `updQuery Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.post('/api/getSearchWidgets', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = JSON.parse(settings.decrypt(req.body.param));
        let result = await qryController.getSearchWidgets(param.search);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getSearchWidgets Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.post('/api/getPublishedSearchWidgets', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = JSON.parse(settings.decrypt(req.body.param));
        let result = await qryController.getPublishedSearchWidgets(param.search);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getSearchWidgets Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

router.post('/api/delWidget', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = JSON.parse(settings.decrypt(req.body.param));
        let result = await qryController.delWidget(param.widget_id);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `delWidget Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    }
});

//delWidget
router.get('/api/getAddressTypeList', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let result = await getAddressTypeList();
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getAddressTypeList Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.get('/api/getOfficeTypeList', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let result = await getOfficeTypeList();
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getOfficeTypeList Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.get('/api/getParentCompanyList', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let result = await getParentCompanyList();
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getParentCompanyList Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.post('/api/getUsersCompany', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = JSON.parse(req.body.param);
        let result = await getUsersCompany(param);
        accessLog(req, new Date().getTime()-dt, true);
        res.json(result);
    } catch (e) {
        log.logger("error", `getUsersCompany Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.get('/api/getParentCompanyList', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let result = await getParentCompanyList();
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getParentCompanyList Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.get('/api/getCountryListForCompany', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let result = await getCountryListForCompany();
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getCountryListForCompany Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.post('/api/getStateListForCompany', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let result = await getStateListForCompany(req.body.country_id);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getStateListForCompany Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.post('/api/getCityListForCompany', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let result = await getCityListForCompany(req.body.state_id);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getCityListForCompany Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.post('/api/insCompanyLicense', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = JSON.parse(req.body.param);
        let result = await insCompanyLicense(param);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `insCompanyLicense Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.post('/api/getlicenseModules', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = JSON.parse(req.body.param);
        let result = await getlicenseModules(param);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `getlicenseModules Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.post('/api/updCompanyLicense', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = JSON.parse(req.body.param);
        let result = await updCompanyLicense(param);
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `updCompanyLicense Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.post('/api/insUpdCompany', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let param = req.body;
        let msg;
        let result:any;
        let result1:any;
        param["UserId"] = req.decoded.userId;
        if (param.company_id == undefined){
            result = await insCompany(param);
            msg="Successfully Inserted Company";
        } 
        else {
            result = await updCompany(param);
            msg="Successfully Updated Company";
        }
        if (result.success){
            accessLog(req, new Date().getTime()-dt, result.success);
            res.json(result);
        } 
        else {
            accessLog(req, new Date().getTime()-dt, result.success);
            res.json(result);
        }
    } catch (e) {
        log.logger("error", `insUpdCompany Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.get('/api/getPlan', async (req:any, res) => {
    try {
        let dt = new Date().getTime();
        let result = await cmn.getPlan();
        accessLog(req, new Date().getTime()-dt, result.success);
        res.json(result);
    } catch (e) {
        log.logger("error", `updCompanyLicense Exception ${e.message}, ${e.stack}`);
        res.json({ success: false, error: true, message: e.message });
    } 
});

router.post('/api/logoutUser', async (req, res) => {
    let dt = new Date().getTime();
    const token = req.headers['authorization'];
    logout(token);
    accessLog(req, new Date().getTime()-dt, true);
    res.json({ success: true, message: 'Successfully logged out' });
});

//getUserLic