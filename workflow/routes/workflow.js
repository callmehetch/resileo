const Router = require('express-promise-router');
const settings = require('../config/constants');
global.logger = require('../log');
const psqlAPM = require('./psqlAPM');
const jwt = require('jsonwebtoken');
//const multer = require('multer');
//const upload = multer();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
//const fetch = require('node-fetch');
const crypto = require('crypto');
const child_process = require('child_process');  
const fetch = require('node-fetch');
const FormData = require('form-data');
const form = new FormData();
const router = new Router();
module.exports = router;


function getRequestIP (req) {
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

let errorInGetNullPostCode = false;


router.post('/login', async (req, res) =>{
  try{
    start = Date.now();
    let user = JSON.parse(settings.decrypt(req.body.data));
    let response = {}
    const queryText = "SELECT id, pgp_sym_decrypt(password_encrypted::bytea, $2) AS password, email, user_name, mobile from login_user where login_name = $1 AND NOT is_deleted";
    const queryParam = [user.login_name,settings.settings.dbPwdPvtKey];
    let result = await psqlAPM.fnDbQuery('login',queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0) {
        let details = result.rows[0];
        if (user.password === details.password) {
          const token = jwt.sign({ userId: details.id}, settings.settings.jwtKey, { expiresIn: settings.settings.tokenExpiresIn });
          addLoginHistory(user.login_name, getRequestIP(req), "Successfully logged", true, token);
          let sendData = {token: token, user: {user_id: details.id, name: details.user_name, email: details.email, mobile:details.mobile}};
          let encryptData = settings.encrypt(JSON.stringify(sendData));
          response = {success: true, result: encryptData }
        }
        else {
          response = { success: false, invalidToken: false, message: "Invalid password" };
          addLoginHistory(user.login_name, getRequestIP(req), "Invalid password "+user.password, false, null);
        }
      } else {
        addLoginHistory(user.login_name, getRequestIP(req), "Invalid login Name "+ user.login_name, false, null);
        response = {success: false, message: "Invalid login name "+user.login_name};
      }
    }
    else {
      response = result;
    }
    res.json(response);
  } catch (e) {
    logger.error(process.pid,e.stack);
    res.json({success:false, error:true, message: e.stack});
  }
});

router.get('/logoutUser', async (req, res) => {
  logout(req);
  res.json({success:true, invalidToken : false, message:'Successfully logged out'})
});

function addLoginHistory (login_name, ipAddress, message, status, token) {
    let query = "INSERT INTO login_history(login_name, ip_address, status, remarks, session_id) VALUES ($1, $2, $3, $4, $5);";
    let qryParam = [login_name, ipAddress, status, message, token];
    try {
        psqlAPM.fnDbQuery('loginHistory',query, qryParam);
    } catch (e) {
        logger.error(process.pid,e.stack);
    }
}

function logout(req){
  try {
    const token = req.headers['authorization'];
    const queryText = "UPDATE login_history SET logout_at = now(), remarks = $1 WHERE session_id= $2";
    const queryParam = ["Successful Logout", token];
    psqlAPM.fnDbQuery('logoutUser',queryText, queryParam);
  } catch (e) {
    logger.error(process.pid,e.stack);
  }
}

// routes defined below will pass through this use() function
// So define all the authorization not required above this function definition
router.use((req,res,next) => {
  const token = req.headers['authorization'];
  if (!token){
    res.json({success:false, invalidToken : true ,message: 'No token provided'});
  } else {
    jwt.verify(token, settings.settings.jwtKey, (err,decoded) => {
      if(err) {
        res.json({success:false, invalidToken : true, message:'Session Expired'});
      } else {
        req.decoded = decoded;
        next();
      }
    })
  }
});

function cleanup (fileDir) {
  try {
    logger.log("info", "Deleting dir %s and all its files",fileDir);
    if (fs.existsSync(fileDir)) {
      fs.readdirSync(fileDir).forEach(function (file) {
        let curPath = `${fileDir}/${file}`;
        if (fs.statSync(curPath).isDirectory()) cleanup(curPath);
        else {
          try {
            fs.unlinkSync(curPath);
            logger.log("info", "Deleted file %s",curPath);
          } catch (e){
            logger.log("error","Could not delete file %s. ErrMsg:%s",curPath,e.Message);
          }
        }
      })
      fs.rmdirSync(fileDir);
      logger.log("info", "Deleted Dir %s",fileDir);
    } else {
      logger.log("info", "Directory %s does not exist",fileDir)
    }
  } catch (e) {
    logger.log("error","ErrMsg:%s, ErrStack:%s",e.message, e.stack);
  }
}

function deleteFilesFromLocation(deletedFileList, mode){
  try{
    deletedFileList.map(file => {
      let filePath = file.path+"/"+file.uploadFileName;
      if (fs.existsSync(filePath)){
        try {
          fs.unlinkSync(filePath);
          logger.log("info","Deleted the file %s",filePath);
        } catch (e){
          logger.log("error","Could not delete file %s",filePath);
        }
      } else {
        logger.log("info","Could not find file %s", filePath);
      }
    });
  } catch (e){
    logger.log("error","Exception thrown in deleteFilesFromLocation ErrMsg %s and data %s ErrStack %s",e.messsage, JSON.stringify(deletedFileList), e.stack);
  }
}

router.post('/addSuggestion', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "INSERT INTO suggestions(name, description, start_date, end_date, is_active, is_completed, project_code, owner_id, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) Returning id"
    const queryParam = [param.name, param.description, param.start_date, param.end_date, param.is_active, param.is_completed, param.project_code, param.owner_id, req.decoded.userId];
    let result = await psqlAPM.fnDbQuery("addSuggestion", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        let dir = path.join(__dirname,'../uploads');
        if (!fs.existsSync(dir)){
          fs.mkdirSync(dir);
        }
        dir = dir+'/'+result.rows[0].id;
        if (!fs.existsSync(dir)){
          fs.mkdirSync(dir);
        }
        res.json({success:true, rowCount:result.rowCount, message:"Successfully added the Key Value.", result: result.rows});
      } else {
        res.json({success:false, message:"Failed to add the Key Value"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: addSuggestion and Data is %s",e.message, JSON.stringify(req.body.param));
    res.json({success: false, error:true, methodName:"addSuggestion", data:JSON.stringify(req.body.param), message: e.message});
  }
});

router.post('/updSuggestion', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "UPDATE suggestions SET name = $1, description = $2, start_date = $3, end_date = $4, is_active = $5, is_completed = $6, project_code = $7, owner_id = $8, modified_by = $9, modified_on = now() WHERE id = $10";
    const queryParam = [param.name, param.description, param.start_date, param.end_date, param.is_active, param.is_completed, param.project_code, param.owner_id, req.decoded.userId, param.id];
    if (param.removed_file_list.length > 0){
      deleteFilesFromLocation(param.removed_file_list,"upd");
    }
    let result = await psqlAPM.fnDbQuery("updSuggestion", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully updated the Key Value."});
      } else {
        res.json({success:false, message:"Failed to update the Key Value"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","methodName: updSuggestion and Data is %s",JSON.stringify(req.body.param));
    res.json({success: false, error:true, methodName:"updSuggestion", data:JSON.stringify(req.body.param), message: e.message});
  }
});

router.post('/getSuggestions', async (req, res) => {
    const queryParam = [];
    let queryText;
    param = req.body;
    let where = 'WHERE 1=1 '
    if (param.whereFilter =="beyonddue"){
      where += "AND s.end_date < now() AND NOT s.is_completed AND s.is_active ";
    } else if (param.whereFilter == "completed") {
      where += "AND s.is_completed ";
    } else if (param.whereFilter =="active") {
      where += "AND s.is_active ";
    }
    if ( param.filterValue ) {
        where += "AND (s.name ILIKE '%"+param.filterValue+"%' OR s.description ILIKE '%"+param.filterValue+"%' OR p.project_name ILIKE '%"+param.filterValue+"%' OR u.user_name ILIKE '%"+param.filterValue+"%')";
    }
    
    queryText = "SELECT s.id, s.name, s.description, s.start_date, s.end_date, extract(epoch from s.end_date)*1000 as end_date_epoch, s.attachment as attachment_json, s.is_active, s.is_completed, "+
    "COALESCE(json_array_length(s.attachment),0) AS attachment, "+
    "(SELECT count(*) FROM facts WHERE suggestion_id = s.id) AS facts, "+
    "(SELECT count(*) FROM map WHERE suggestion_id = s.id) AS maps, "+
    "(SELECT count(*) FROM tasks WHERE suggestion_id = s.id) AS tasks, "+
    "(SELECT count(*) FROM contacts WHERE suggestion_id = s.id) AS contacts, "+
    "(SELECT ROUND(COALESCE(AVG(completion_percentage),0),2) FROM tasks WHERE suggestion_id = s.id) AS status, "+
    "(SELECT ROUND(COALESCE(SUM(hours_spent),0),2) FROM tasks WHERE suggestion_id = s.id) AS hours_spent, "+
    "s.project_code, p.project_name, "+
    "s.owner_id, u.user_name AS owner_name "+
    "FROM suggestions as s "+
    "INNER JOIN projects AS p ON p.project_code = s.project_code ";
    if ( req.decoded.userId !== 1 ) {    // Admin check
      queryParam.push(req.decoded.userId);
      queryText += "INNER JOIN teams AS t ON t.project_code = s.project_code AND t.user_id = $"+queryParam.length+" AND t.active_flag ";
    }
    queryText += 
    "LEFT JOIN login_user u ON s.owner_id = u.id "+
    where+" ";
    queryParam.push(req.body.offset);
    queryParam.push(req.body.limit);
    queryText += 
    "ORDER BY s.start_date DESC "+
    "OFFSET $"+(queryParam.length-1)+" LIMIT $"+queryParam.length+"";
    
    try {
      let result = await psqlAPM.fnDbQuery("getSuggestions", queryText, queryParam);
      if (result.success){
        let encryptData;
        if (result.rowCount > 0){
          encryptData = settings.encrypt(JSON.stringify(result.rows));
        } else {
          encryptData = "";
        }
        res.json({success:true, rowCount:result.rowCount, result:encryptData});
      } else {
        res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.error("Exception at getSuggestions ErrMsg:%s, Query %s",e.message, queryText);
    res.json({success: false, error:true, message: e.message});
  }
});

router.post('/fileUpload', async (req, res) => {
  settings.fileUpload(req,res,function(err){
    if (err){
      res.json({success:false, status:501, message:err});
    } else {
      res.json({success:true,originalName:req.file.originalname, uploadFileName:req.file.filename, path: req.file.destination, size: req.file.size});
    }
  })
});

router.post('/updSuggestionAttachRef', async (req, res) => {
  let queryText;
  let queryParam;
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    queryText = "UPDATE suggestions SET modified_on = now(), modified_by = $3, attachment = $2 WHERE id = $1";
    queryParam = [param.suggestion_id, param.attachment, req.decoded.userId];
    let result = await psqlAPM.fnDbQuery("updSuggestionAttachRef", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully updated the attachment reference to Key Value id "+param.suggestion_id});
      } else {
        res.json({success:false, message:"Failed to update the Key Value attachment reference"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","methodName: updSuggestionAttachRef and Query %s & param is %s", queryText, queryParam.toString());
    res.json({success: false, error:true, methodName:"updSuggestionAttachRef", message: e.message});
  }
});

router.post('/delSuggestion', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    let sId = param.suggestion_id;
    const queryText = "DELETE FROM facts WHERE suggestion_id = "+sId+"; DELETE FROM map where suggestion_id = "+sId+"; DELETE FROM tasks_update WHERE task_id IN (SELECT id FROM tasks WHERE suggestion_id = "+sId+"); DELETE FROM tasks WHERE suggestion_id = "+sId+"; DELETE FROM contact_update WHERE contact_id IN (SELECT id FROM contacts WHERE suggestion_id = "+sId+"); DELETE FROM contacts WHERE suggestion_id = "+sId+";DELETE FROM suggestions WHERE id = "+sId+";";
    const queryParam = [];
    cleanup("./uploads/"+param.suggestion_id);
    let result = await psqlAPM.fnDbQuery("delSuggestion", queryText, queryParam);
    if (result.success){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully deleted the Key Value (id "+param.suggestion_id+")"});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","ErrMsg %s, ErrStack %s, methodName: delSuggestion and Data is %s",e.message,e.stack, JSON.stringify(req.body.param));
    res.json({success: false, error:true, methodName:"delSuggestion", message: e.message});
  }
});

router.get('/getSuggestionSummary', async (req, res) => {
  try {
    let queryParam = [];
    let queryText = "SELECT count(*) suggestions, "+
                      "COUNT(CASE WHEN s.is_active THEN 1 ELSE null END) active, "+
                      "COUNT(CASE WHEN s.is_completed THEN 1 ELSE null END) completed, "+
                      "COUNT(CASE WHEN NOT s.is_completed AND s.end_date < now() THEN 1 ELSE null END) beyond_due "+
                      "FROM suggestions s ";
    if ( req.decoded.userId !== 1 ) {    // Admin check
      queryParam.push(req.decoded.userId);
      queryText += "INNER JOIN teams ON teams.project_code = s.project_code AND teams.user_id = $"+queryParam.length+" AND teams.active_flag ";
    }
    
    let result = await psqlAPM.fnDbQuery("getSuggestionSummary", queryText, queryParam);
    if (result.success){
        res.json({success:true, rowCount:result.rowCount, result: result.rows});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","ErrMsg %s, ErrStack %s, methodName: getSuggestionSummary",e.message,e.stack);
    res.json({success: false, error:true, methodName:"getSuggestionSummary", message: e.message});
  }
});

router.post('/getSuggestionsList', async (req, res) => {
    let queryText, queryParam = [];
    param = req.body;
    queryText  = "SELECT s.id AS suggestion_id, s.name AS suggestion_name, s.project_code "+
                 "FROM suggestions AS s ";
    if( req.decoded.userId !== 1 ) {    // Admin check
      queryText += "INNER JOIN teams AS t ON t.project_code = s.project_code AND t.user_id = $1 AND t.active_flag ";
      queryParam.push(req.decoded.userId);
    }
    queryText += "ORDER BY s.name ";
    try {
      let result = await psqlAPM.fnDbQuery("getSuggestionsList", queryText, queryParam);
      if (result.success){
        let encryptData;
        if (result.rowCount > 0){
          encryptData = settings.encrypt(JSON.stringify(result.rows));
        } else {
          encryptData = "";
        }
        res.json({success: true, rowCount: result.rowCount, result: encryptData});
      } else {
        res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.error("Exception at getSuggestionsList ErrMsg:%s, Query %s",e.message, queryText);
    res.json({success: false, error:true, message: e.message});
  }
});

router.post('/getUsers', async (req, res) => {
  const queryText = "SELECT id, login_name, user_name, mobile, email, created_on, is_deleted FROM login_user ORDER BY user_name OFFSET $1 LIMIT $2";
  const queryParam = [req.body.offset, req.body.limit];
  try {
    let result = await psqlAPM.fnDbQuery("getUsers", queryText, queryParam);
    if (result.success){
      let encryptData;
      if (result.rowCount > 0){
        encryptData = settings.encrypt(JSON.stringify(result.rows));
      } else {
        encryptData = "";
      }
      res.json({success:true, rowCount:result.rowCount, result:encryptData});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.error("Exception at getUsers ErrMsg:%s, Query %s",e.message, queryText);
    res.json({success: false, error:true, message: e.message});
  }
});

router.post('/addUser', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "INSERT INTO login_user(login_name, user_name, mobile, email, password_encrypted, created_by) VALUES ($1, $2, $3, $4, pgp_sym_encrypt($5, $6), $7)";
    const queryParam = [param.login_name, param.user_name, param.mobile, param.email, param.password, settings.settings.dbPwdPvtKey, req.decoded.userId];
    let result = await psqlAPM.fnDbQuery("addUser", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully added the User."});
      } else {
        res.json({success:false, message:"Failed to add the user"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: addUser",e.message);
    res.json({success: false, error:true, methodName:"addUser", message: e.message});
  }
});

router.post('/updUser', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "UPDATE login_user SET login_name=$1, user_name=$2, mobile=$3, email=$4 WHERE id = $5";
    const queryParam = [param.login_name, param.user_name, param.mobile, param.email, param.id];
    let result = await psqlAPM.fnDbQuery("updUser", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully updated the User."});
      } else {
        res.json({success:false, message:"Failed to update the user"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: updUser",e.message);
    res.json({success: false, error:true, methodName:"updUser", message: e.message});
  }
});

router.post('/delUndelUser', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "UPDATE login_user SET is_deleted = $2 WHERE id = $1 ";
    const queryParam = [param.id, param.is_deleted];
    let result = await psqlAPM.fnDbQuery("delUndelUser", queryText, queryParam);
    let msg = param.is_deleted ? "Deleted" : "Undeleted"
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully "+msg+" the User."});
      } else {
        res.json({success:false, message:"Failed to "+msg+" the user"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: delUndelUser",e.message);
    res.json({success: false, error:true, methodName:"delUndelUser", message: e.message});
  }
});

router.post('/getTeams', async (req, res) => {
  const queryText = "SELECT t.user_id, lu.user_name, t.active_flag, CASE WHEN p.project_manager_id IS NOT NULL THEN true ELSE FALSE END AS project_manager_flag "+
                    "FROM teams t "+
                    "INNER JOIN login_user AS lu ON lu.id = t.user_id "+
                    "LEFT JOIN projects AS p ON p.project_code = t.project_code AND p.project_manager_id = lu.id "+
                    "WHERE t.project_code = $1 "+
                    "ORDER BY project_manager_flag DESC, lu.user_name ";
  let param = JSON.parse(settings.decrypt(req.body.param));
  const queryParam = [param.project_code];
  try {
    let result = await psqlAPM.fnDbQuery("getTeams", queryText, queryParam);
    if (result.success){
      let encryptData;
      if (result.rowCount > 0){
        encryptData = settings.encrypt(JSON.stringify(result.rows));
      } else {
        encryptData = "";
      }
      res.json({success:true, rowCount:result.rowCount, result:encryptData});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.error("Exception at getTeams ErrMsg:%s, Query %s",e.message, queryText);
    res.json({success: false, error:true, message: e.message});
  }
});

router.post('/getNonTeamMembers', async (req, res) => {
  const queryText = "SELECT lu.id, lu.user_name "+
                    "FROM login_user AS lu "+
                    "LEFT JOIN teams t ON lu.id = t.user_id AND t.project_code = $1 AND t.active_flag "+
                    "WHERE t.user_id IS NULL "+
                    "ORDER BY lu.user_name";
  let param = JSON.parse(settings.decrypt(req.body.param));
  const queryParam = [param.project_code];
  try {
    let result = await psqlAPM.fnDbQuery("getNonTeamMembers", queryText, queryParam);
    if (result.success){
      let encryptData;
      if (result.rowCount > 0){
        encryptData = settings.encrypt(JSON.stringify(result.rows));
      } else {
        encryptData = "";
      }
      res.json({success:true, rowCount:result.rowCount, result:encryptData});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.error("Exception at getNonTeamMembers ErrMsg:%s, Query %s",e.message, queryText);
    res.json({success: false, error:true, message: e.message});
  }
});

router.post('/addTeamMembers', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "INSERT INTO teams(project_code, user_id, added_by) SELECT $1, unnest, $2 FROM unnest('{"+param.user_ids+"}'::INT[])";
    const queryParam = [param.project_code, req.decoded.userId];
    let result = await psqlAPM.fnDbQuery("addTeamMembers", queryText, queryParam);
    if (result.success) {
      if (result.rowCount > 0) {
        res.json({success:true, rowCount:result.rowCount, message:"Added the Users for the Project."});
      } else {
        res.json({success:false, message:"Failed to add the Users for the Project."});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: addTeamMembers", e.message);
    res.json({success: false, error:true, methodName:"addTeamMembers", message: e.message});
  }
});

router.post('/deactivateTeamMember', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "UPDATE teams SET active_flag = $3, last_modified_by = $4 WHERE project_code = $1 AND user_id = $2";
    const queryParam = [param.project_code, param.user_id, param.new_active_flag, req.decoded.userId];
    let result = await psqlAPM.fnDbQuery("removeTeamMembers", queryText, queryParam);
    if (result.success) {
      if (result.rowCount > 0) {
        res.json({success:true, rowCount:result.rowCount, message:"Updated the Users status in the Project."});
      } else {
        res.json({success:false, message:"Failed to update the User status from the Project."});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: removeTeamMembers", e.message);
    res.json({success: false, error:true, methodName:"removeTeamMembers", message: e.message});
  }
});

router.post('/removeTeamMember', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "DELETE FROM teams WHERE project_code = $1 AND user_id = $2";
    const queryParam = [param.project_code, param.user_id];
    let result = await psqlAPM.fnDbQuery("removeTeamMembers", queryText, queryParam);
    if (result.success) {
      if (result.rowCount > 0) {
        res.json({success:true, rowCount:result.rowCount, message:"Removed the User from the Project."});
      } else {
        res.json({success:false, message:"Failed to remove the User from the Project."});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: removeTeamMembers", e.message);
    res.json({success: false, error:true, methodName:"removeTeamMembers", message: e.message});
  }
});

router.post('/resetPassword', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    let queryText = "UPDATE login_user SET password_encrypted = pgp_sym_encrypt($2, $3) WHERE id = $1 ";
    let queryParam = [param.id, param.password, settings.settings.dbPwdPvtKey];
    let result = await psqlAPM.fnDbQuery("resetPassword", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully updated the password"});
      } else {
        res.json({success:false, message:"Failed to update the password"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: resetPassword",e.message);
    res.json({success: false, error:true, methodName:"resetPassword", message: e.message});
  }
});

router.post('/changePassword', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    let queryText = "UPDATE login_user SET password_encrypted = pgp_sym_encrypt($2, $4) "+
                    "WHERE id = $1 AND pgp_sym_decrypt(password_encrypted::BYTEA, $4) = $3";
    let queryParam = [req.decoded.userId, param.new_password, param.current_password, settings.settings.dbPwdPvtKey];
    let result = await psqlAPM.fnDbQuery("changePassword", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"New password is updated"});
      } else {
        res.json({success:false, message:"Password is not correct"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: changePassword",e.message);
    res.json({success: false, error:true, methodName:"changePassword", message: e.message});
  }
});

router.post('/getLists', async (req, res) => {
  const queryText = "SELECT id, list_name, description, list_group, created_on, is_deleted FROM lists ORDER BY list_group, list_name OFFSET $1 LIMIT $2";
  const queryParam = [req.body.offset, req.body.limit];
  try {
    let result = await psqlAPM.fnDbQuery("getLists", queryText, queryParam);
    if (result.success){
      let encryptData;
      if (result.rowCount > 0){
        encryptData = settings.encrypt(JSON.stringify(result.rows));
      } else {
        encryptData = "";
      }
      res.json({success:true, rowCount:result.rowCount, result:encryptData});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.error("Exception at getLists ErrMsg:%s, Query %s",e.message, queryText);
    res.json({success: false, error:true, message: e.message});
  }
});

router.post('/addList', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "INSERT INTO lists(list_name, description, list_group, created_by) VALUES ($1, $2, $3, $4)";
    const queryParam = [param.list_name, param.description, param.list_group, req.decoded.userId];
    let result = await psqlAPM.fnDbQuery("addList", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully added the list item."});
      } else {
        res.json({success:false, message:"Failed to add the list item"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: addList",e.message);
    res.json({success: false, error:true, methodName:"addList", message: e.message});
  }
});

router.post('/updList', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "UPDATE lists SET list_name=$1, description=$2, modified_on=now(), modified_by=$3 WHERE id = $4";
    const queryParam = [param.list_name, param.description, req.decoded.userId, param.id];
    let result = await psqlAPM.fnDbQuery("updList", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully updated the list."});
      } else {
        res.json({success:false, message:"Failed to update the list"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: updList",e.message);
    res.json({success: false, error:true, methodName:"updList", message: e.message});
  }
});

router.post('/delUndelList', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "UPDATE lists SET is_deleted = $2 WHERE id = $1 ";
    const queryParam = [param.id, param.is_deleted];
    let result = await psqlAPM.fnDbQuery("delUndelList", queryText, queryParam);
    let msg = param.is_deleted ? "Deleted" : "Undeleted"
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully "+msg+" the list."});
      } else {
        res.json({success:false, message:"Failed to "+msg+" the list"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: delUndelList",e.message);
    res.json({success: false, error:true, methodName:"delUndelList", message: e.message});
  }
});

router.post( "/fileDownload", async (req, res)  => {
  let param = JSON.parse(settings.decrypt(req.body.param));
  fileName = "."+param.file.path+"/"+param.file.uploadFileName;
  const file = path.resolve(__dirname, fileName);
  res.download(file); 
})

router.post('/getFacts', async (req, res) => {
  const queryText = "SELECT f.id, f.suggestion_id, f.name, f.description, f.fact_type, l.list_name as fact_type_name, f.uom, u.list_name as uom_name, f.value, f.attachment as attachment_json, COALESCE(json_array_length(f.attachment),0) attachment, f.created_on FROM facts f JOIN lists l ON f.fact_type = l.id JOIN lists u ON u.id = f.uom WHERE f.suggestion_id = $1 ORDER BY name OFFSET $2 LIMIT $3";
  const queryParam = [req.body.suggestion_id, req.body.offset, req.body.limit];
  try {
    let result = await psqlAPM.fnDbQuery("getFacts", queryText, queryParam);
    if (result.success){
      let encryptData;
      if (result.rowCount > 0){
        encryptData = settings.encrypt(JSON.stringify(result.rows));
      } else {
        encryptData = "";
      }
      res.json({success:true, rowCount:result.rowCount, result:encryptData});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.error("Exception at getFacts ErrMsg:%s, Query %s",e.message, queryText);
    res.json({success: false, error:true, message: e.message});
  }
});

router.post('/addFact', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "INSERT INTO facts(suggestion_id, name, description, fact_type, uom, value, created_by) VALUES ($1, $2, $3, $4, $5, $6,$7) Returning id"
    const queryParam = [param.suggestion_id, param.name, param.description, param.fact_type, param.uom, param.value, req.decoded.userId];
    let result = await psqlAPM.fnDbQuery("addFact", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        let dir = path.join(__dirname,'../uploads/'+param.suggestion_id+'/facts');
        if (!fs.existsSync(dir)){
          fs.mkdirSync(dir);
        }
        dir = dir+"/"+result.rows[0].id;
        if (!fs.existsSync(dir)){
          fs.mkdirSync(dir);
        }
        res.json({success:true, rowCount:result.rowCount, message:"Successfully added the fact.", result: result.rows});
      } else {
        res.json({success:false, message:"Failed to add the fact"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: addFact",e.message);
    res.json({success: false, error:true, methodName:"addFact",message: e.message});
  }
});

router.post('/updFact', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "UPDATE facts SET name = $1, description = $2, fact_type = $3, uom = $4, value = $7, modified_by = $5, modified_on = now() WHERE id = $6";
    const queryParam = [param.name, param.description, param.fact_type, param.uom, req.decoded.userId, param.id, param.value];
    if (param.removed_file_list.length > 0){
      deleteFilesFromLocation(param.removed_file_list,"upd");
    }
    let result = await psqlAPM.fnDbQuery("updFact", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully updated the fact."});
      } else {
        res.json({success:false, message:"Failed to update the fact"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","methodName: updFact ErrMsg:%s",e.message);
    res.json({success: false, error:true, methodName:"updFact", message: e.message});
  }
});

router.post('/updFactAttachRef', async (req, res) => {
  let queryText;
  let queryParam;
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    queryText = "UPDATE facts SET modified_on = now(), modified_by = $3, attachment = $2 WHERE id = $1";
    queryParam = [param.fact_id, param.attachment, req.decoded.userId];
    let result = await psqlAPM.fnDbQuery("updFactAttachRef", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully updated the attachment reference to fact id "+param.fact_id});
      } else {
        res.json({success:false, message:"Failed to update the fact attachment reference"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","methodName: updFactAttachRef and Query %s & param is %s", queryText, queryParam.toString());
    res.json({success: false, error:true, methodName:"updFactAttachRef", message: e.message});
  }
});

router.post('/delFact', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "DELETE FROM facts WHERE id = $1";
    const queryParam = [param.fact_id];
    cleanup("./uploads/"+param.suggestion_id+"/facts/"+param.fact_id);
    let result = await psqlAPM.fnDbQuery("delFact", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully deleted the fact id "+param.fact_id});
      } else {
        res.json({success:false, message:"Failed to delete the fact"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","ErrMsg %s, ErrStack %s, methodName: delFact",e.message,e.stack);
    res.json({success: false, error:true, methodName:"delFact", message: e.message});
  }
});

router.post('/getTypes', async (req, res) => {
  let param = JSON.parse(settings.decrypt(req.body.param));
  const queryText = "SELECT id, list_name FROM lists WHERE list_group = $1 AND is_deleted = false ORDER BY list_name";
  const queryParam = [param.list_group];
  try {
    let result = await psqlAPM.fnDbQuery("getTypes", queryText, queryParam);
    if (result.success){
      let encryptData;
      if (result.rowCount > 0){
        encryptData = settings.encrypt(JSON.stringify(result.rows));
      } else {
        encryptData = "";
      }
      res.json({success:true, rowCount:result.rowCount, result:encryptData});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.error("Exception at getTypes ErrMsg:%s, Query %s",e.message, queryText);
    res.json({success: false, error:true, message: e.message});
  }
});

router.post('/getTasks', async (req, res) => {
  queryParam = [];
  queryText = "SELECT t.id, t.suggestion_id, t.name, t.description, "+
              "t.ministry, l_department.list_name as ministry_name, "+
              "t.task_type_id, l_task_type.list_name as task_type_name, "+
              "t.start_date, t.end_date, "+
              "extract(epoch from t.end_date)*1000 as end_date_epoch, "+
              "t.assigned_to_id, u.user_name AS assigned_to_name, "+
              "s.project_code, ";
  if( req.body.my_task ) {
    queryText += "s.name AS suggestion_name, p.project_name, sugg_u.user_name AS kv_owner_name, ";
  }
  queryText += "t.completion_percentage, t.hours_spent, t.created_on, t.created_by, "+
               "t.attachment as attachment_json, COALESCE(json_array_length(t.attachment),0) attachment "+
               "FROM tasks t "+
              "JOIN suggestions s ON s.id = t.suggestion_id "+
              "INNER JOIN login_user sugg_u ON s.owner_id = sugg_u.id "+
              "INNER JOIN projects AS p ON p.project_code = s.project_code ";
  if( req.body.my_task ) {
    queryParam.push(req.decoded.userId);
    queryText += "  AND ( s.owner_id = $"+queryParam.length+" OR t.assigned_to_id = $"+queryParam.length+" ) "+
                "INNER JOIN teams ON teams.project_code = s.project_code AND teams.user_id = $1 AND teams.active_flag ";
  }
  queryText += "JOIN lists l_department ON t.ministry = l_department.id AND l_department.list_group = 'department' "+
               "LEFT JOIN lists l_task_type ON t.task_type_id = l_task_type.id AND l_task_type.list_group = 'Task Type' "+
               "LEFT JOIN login_user u ON t.assigned_to_id = u.id ";
  if( req.body.suggestion_id ) {
    queryParam.push(req.body.suggestion_id);
    queryText += "WHERE t.suggestion_id = $"+queryParam.length+" ";
  }
  queryParam.push(req.body.offset);
  queryParam.push(req.body.limit);
  queryText += "ORDER BY t.start_date DESC, t.end_date DESC "+
               "OFFSET $"+(queryParam.length-1)+" LIMIT $"+queryParam.length+"";

  try {
    let result = await psqlAPM.fnDbQuery("getTasks", queryText, queryParam);
    if (result.success){
      let encryptData;
      if (result.rowCount > 0){
        encryptData = settings.encrypt(JSON.stringify(result.rows));
      } else {
        encryptData = "";
      }
      res.json({success:true, rowCount:result.rowCount, result:encryptData});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.error("Exception at getTasks ErrMsg:%s, Query %s",e.message, queryText);
    res.json({success: false, error:true, message: e.message});
  }
});

router.post('/addTask', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    param.userId = req.decoded.userId;
    const queryText = "INSERT INTO tasks(suggestion_id, name, description, ministry, task_type_id, start_date, end_date, assigned_to_id, completion_percentage, hours_spent, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) Returning id"
    const queryParam = [param.suggestion_id, param.name, param.description, param.ministry, param.task_type_id, param.start_date,param.end_date, param.assigned_to_id, param.completion_percentage, param.hours_spent, req.decoded.userId];
    let result = await psqlAPM.fnDbQuery("addTask", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        param.task_id = result.rows[0].id;
        // Add the completion_percentage and hours-spent in Task-Update (Task-Efforts) table.
        let result_update = addTaskUpdate(param);
        let dir = path.join(__dirname,'../uploads/'+param.suggestion_id+'/tasks');
        if (!fs.existsSync(dir)){
          fs.mkdirSync(dir);
        }
        dir = dir+"/"+result.rows[0].id;
        if (!fs.existsSync(dir)){
          fs.mkdirSync(dir);
        }
        res.json({success:true, rowCount:result.rowCount, message:"Successfully added the task.", result: result.rows});
      } else {
        res.json({success:false, message:"Failed to add the task"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: addTask",e.message);
    res.json({success: false, error:true, methodName:"addTask",message: e.message});
  }
});

router.post('/updTask', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "UPDATE tasks SET name = $1, description = $2, ministry = $3, task_type_id = $4, start_date = $5, end_date = $6, assigned_to_id = $7, completion_percentage = $8, hours_spent = $9, modified_by = $10, modified_on = now() WHERE id = $11";
    const queryParam = [param.name, param.description, param.ministry, param.task_type_id, param.start_date, param.end_date, param.assigned_to_id, param.completion_percentage, param.hours_spent, req.decoded.userId, param.id];
    if (param.removed_file_list.length > 0){
      deleteFilesFromLocation(param.removed_file_list,"upd");
    }
    let result = await psqlAPM.fnDbQuery("updTask", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully updated the task."});
      } else {
        res.json({success:false, message:"Failed to update the task"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","methodName: updTask ErrMsg:%s",e.message);
    res.json({success: false, error:true, methodName:"updTask", message: e.message});
  }
});

router.post('/updTaskAttachRef', async (req, res) => {
  let queryText;
  let queryParam;
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    queryText = "UPDATE tasks SET modified_on = now(), modified_by = $3, attachment = $2 WHERE id = $1";
    queryParam = [param.task_id, param.attachment, req.decoded.userId];
    let result = await psqlAPM.fnDbQuery("updTaskAttachRef", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully updated the attachment reference to task id "+param.task_id});
      } else {
        res.json({success:false, message:"Failed to update the task attachment reference"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","methodName: updTaskAttachRef and Query %s & param is %s", queryText, queryParam.toString());
    res.json({success: false, error:true, methodName:"updTaskAttachRef", message: e.message});
  }
});

router.post('/delTask', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    let tId = param.task_id;
    const queryText = "WITH del_task AS ( "+
                      "  DELETE FROM tasks WHERE id = $1 "+
                      "  AND ( created_by = $2 )"+
                      "  RETURNING 1 "+
                      "), "+
                      "del_cnt AS ( "+
                      "  SELECT count(*) AS cnt FROM del_task "+
                      ") "+
                      "DELETE FROM tasks_update USING del_cnt WHERE del_cnt.cnt > 1 AND task_id = $1";
    const queryParam = [tId, req.decoded.userId];
    cleanup("./uploads/"+param.suggestion_id+"/tasks/"+param.task_id);
    let result = await psqlAPM.fnDbQuery("delTask", queryText, queryParam);
    if (result.success){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully deleted the task id "+param.task_id});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","ErrMsg %s, ErrStack %s, methodName: delTask",e.message,e.stack);
    res.json({success: false, error:true, methodName:"delTask", message: e.message});
  }
});

async function addTaskUpdate(param) {
  let result;
  try{
    const queryText = "INSERT INTO tasks_update(task_id, remarks, date_of_status, completion_percentage, hours_spent, created_by) VALUES ($1, $2, $3, $4, $5, $6);"
    const queryParam = [param.task_id, param.remarks, param.date_of_status, param.completion_percentage, param.hours_spent, param.userId];
    result = await psqlAPM.fnDbQuery("addTaskUpdate", queryText, queryParam);
  } catch(e) {
    return e;
  }
  return result;
}
router.post('/addTaskUpdate', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));

    param.userId = req.decoded.userId;
    
    let result = addTaskUpdate(param);

    if (result.success){
      let qText = "UPDATE tasks SET completion_percentage = $1, hours_spent = hours_spent+$2 WHERE id = $3";
      let qParam = [param.completion_percentage, param.hours_spent, param.task_id];
      psqlAPM.fnDbQuery("addTaskUpdate-updateTasks", qText, qParam);
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully added the task update"});
      } else {
        res.json({success:false, message:"Failed to add the task"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: addTaskUpdate",e.message);
    res.json({success: false, error:true, methodName:"addTaskUpdate",message: e.message});
  }
});

router.post('/getTaskHistory', async (req, res) => {
  try {
    let param = req.body;
    const queryText = "SELECT id, date_of_status, remarks, completion_percentage, hours_spent, created_on FROM tasks_update WHERE task_id = $1 ORDER BY created_on desc OFFSET $2 LIMIT $3;";
    const queryParam = [param.task_id, param.offset, param.limit];
    let encryptData;
    let result = await psqlAPM.fnDbQuery("getTaskHistory", queryText, queryParam);
    if (result.success){
      if(result.rowCount>0){
        encryptData = settings.encrypt(JSON.stringify(result.rows));
      } else {
        encryptData = '';
      }
      res.json({success:true, rowCount:result.rowCount, result: encryptData});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: getTaskHistory",e.message);
    res.json({success: false, error:true, methodName:"getTaskHistory",message: e.message});
  }
});

router.post('/delTaskUpdate', async (req, res) => {
  try {
    let param = req.body;
    const queryText = "DELETE FROM tasks_update WHERE id = $1;";
    const queryParam = [param.id];
    let result = await psqlAPM.fnDbQuery("delTaskUpdate", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully deleted the task update id "+param.id});
      } else {
        res.json({success:false, message:"Failed to delete the task update record"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","ErrMsg %s, ErrStack %s, methodName: delTaskUpdate",e.message,e.stack);
    res.json({success: false, error:true, methodName:"delTaskUpdate", message: e.message});
  }
});

router.post('/getMap', async (req, res) => {
  const queryText = "SELECT m.id, m.suggestion_id, m.name, m.description, m.map_type, l.list_name as map_type_name, m.uom, u.list_name as uom_name, m.value, m.attachment as attachment_json, COALESCE(json_array_length(m.attachment),0) attachment, m.created_on FROM map m JOIN lists l ON m.map_type = l.id JOIN lists u ON u.id = m.uom WHERE m.suggestion_id = $1 ORDER BY m.name OFFSET $2 LIMIT $3";
  const queryParam = [req.body.suggestion_id, req.body.offset, req.body.limit];
  try {
    let result = await psqlAPM.fnDbQuery("getMap", queryText, queryParam);
    if (result.success){
      let encryptData;
      if (result.rowCount > 0){
        encryptData = settings.encrypt(JSON.stringify(result.rows));
      } else {
        encryptData = "";
      }
      res.json({success:true, rowCount:result.rowCount, result:encryptData});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.error("Exception at getMap ErrMsg:%s, Query %s",e.message, queryText);
    res.json({success: false, error:true, message: e.message});
  }
});

router.post('/addMap', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "INSERT INTO map(suggestion_id, name, description, map_type, uom, value, created_by) VALUES ($1, $2, $3, $4, $5, $6,$7) Returning id"
    const queryParam = [param.suggestion_id, param.name, param.description, param.map_type, param.uom, param.value, req.decoded.userId];
    let result = await psqlAPM.fnDbQuery("addMap", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        let dir = path.join(__dirname,'../uploads/'+param.suggestion_id+'/map');
        if (!fs.existsSync(dir)){
          fs.mkdirSync(dir);
        }
        dir = dir+"/"+result.rows[0].id;
        if (!fs.existsSync(dir)){
          fs.mkdirSync(dir);
        }
        res.json({success:true, rowCount:result.rowCount, message:"Successfully added the map.", result: result.rows});
      } else {
        res.json({success:false, message:"Failed to add the map"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: addMap",e.message);
    res.json({success: false, error:true, methodName:"addMap",message: e.message});
  }
});

router.post('/updMap', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "UPDATE map SET name = $1, description = $2, map_type = $3, uom = $4, value = $7, modified_by = $5, modified_on = now() WHERE id = $6";
    const queryParam = [param.name, param.description, param.map_type, param.uom, req.decoded.userId, param.id, param.value];
    if (param.removed_file_list.length > 0){
      deleteFilesFromLocation(param.removed_file_list,"upd");
    }
    let result = await psqlAPM.fnDbQuery("updMap", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully updated the map."});
      } else {
        res.json({success:false, message:"Failed to update the map"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","methodName: updMap ErrMsg:%s",e.message);
    res.json({success: false, error:true, methodName:"updMap", message: e.message});
  }
});

router.post('/updMapAttachRef', async (req, res) => {
  let queryText;
  let queryParam;
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    queryText = "UPDATE map SET modified_on = now(), modified_by = $3, attachment = $2 WHERE id = $1";
    queryParam = [param.map_id, param.attachment, req.decoded.userId];
    let result = await psqlAPM.fnDbQuery("updMapAttachRef", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully updated the attachment reference to map id "+param.map_id});
      } else {
        res.json({success:false, message:"Failed to update the map attachment reference"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","methodName: updMapAttachRef and Query %s & param is %s", queryText, queryParam.toString());
    res.json({success: false, error:true, methodName:"updMapAttachRef", message: e.message});
  }
});

router.post('/delMap', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "DELETE FROM map WHERE id = $1";
    const queryParam = [param.map_id];
    cleanup("./uploads/"+param.suggestion_id+"/map/"+param.map_id);
    let result = await psqlAPM.fnDbQuery("delMap", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully deleted the map id "+param.map_id});
      } else {
        res.json({success:false, message:"Failed to delete the map"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","ErrMsg %s, ErrStack %s, methodName: delMap",e.message,e.stack);
    res.json({success: false, error:true, methodName:"delMap", message: e.message});
  }
});

router.post('/getContacts', async (req, res) => {
  const queryText = "SELECT c.id, c.suggestion_id, c.name, c.notes, c.ministry, l.list_name as ministry_name, c.attachment as attachment_json, COALESCE(json_array_length(c.attachment),0) attachment, (SELECT count(*) FROM contact_update WHERE contact_id = c.id) as notes_count, c.created_on FROM contacts c JOIN lists l ON c.ministry = l.id  WHERE c.suggestion_id = $1 ORDER BY name OFFSET $2 LIMIT $3";
  const queryParam = [req.body.suggestion_id, req.body.offset, req.body.limit];
  try {
    let result = await psqlAPM.fnDbQuery("getContacts", queryText, queryParam);
    if (result.success){
      let encryptData;
      if (result.rowCount > 0){
        encryptData = settings.encrypt(JSON.stringify(result.rows));
      } else {
        encryptData = "";
      }
      res.json({success:true, rowCount:result.rowCount, result:encryptData});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.error("Exception at getContacts ErrMsg:%s, Query %s",e.message, queryText);
    res.json({success: false, error:true, message: e.message});
  }
});

router.post('/addContact', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "INSERT INTO contacts(suggestion_id, name, notes, ministry, created_by) VALUES ($1, $2, $3, $4, $5) Returning id"
    const queryParam = [param.suggestion_id, param.name, param.notes, param.ministry, req.decoded.userId];
    let result = await psqlAPM.fnDbQuery("addContact", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        let dir = path.join(__dirname,'../uploads/'+param.suggestion_id+'/contacts');
        if (!fs.existsSync(dir)){
          fs.mkdirSync(dir);
        }
        dir = dir+"/"+result.rows[0].id;
        if (!fs.existsSync(dir)){
          fs.mkdirSync(dir);
        }
        res.json({success:true, rowCount:result.rowCount, message:"Successfully added the contacts.", result: result.rows});
      } else {
        res.json({success:false, message:"Failed to add the contacts"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: addContact",e.message);
    res.json({success: false, error:true, methodName:"addContact",message: e.message});
  }
});

router.post('/updContact', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "UPDATE contacts SET name = $1, notes = $2, ministry = $3, modified_by = $4, modified_on = now() WHERE id = $5";
    const queryParam = [param.name, param.notes, param.ministry, req.decoded.userId, param.id];
    if (param.removed_file_list.length > 0){
      deleteFilesFromLocation(param.removed_file_list,"upd");
    }
    let result = await psqlAPM.fnDbQuery("updContact", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully updated the contacts."});
      } else {
        res.json({success:false, message:"Failed to update the contacts"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","methodName: updContact ErrMsg:%s",e.message);
    res.json({success: false, error:true, methodName:"updContact", message: e.message});
  }
});

router.post('/updContactAttachRef', async (req, res) => {
  let queryText;
  let queryParam;
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    queryText = "UPDATE contacts SET modified_on = now(), modified_by = $3, attachment = $2 WHERE id = $1";
    queryParam = [param.contact_id, param.attachment, req.decoded.userId];
    let result = await psqlAPM.fnDbQuery("updContactAttachRef", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully updated the attachment reference to contacts id "+param.contact_id});
      } else {
        res.json({success:false, message:"Failed to update the contacts attachment reference"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","methodName: updContactAttachRef and Query %s & param is %s", queryText, queryParam.toString());
    res.json({success: false, error:true, methodName:"updContactAttachRef", message: e.message});
  }
});

router.post('/delContact', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    let cId = param.contact_id;
    const queryText = "DELETE FROM contacts WHERE id = "+cId+"; DELETE FROM contact_update WHERE contact_id = "+cId+";";
    const queryParam = [];
    cleanup("./uploads/"+param.suggestion_id+"/contacts/"+param.contact_id);
    let result = await psqlAPM.fnDbQuery("delContact", queryText, queryParam);
    if (result.success){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully deleted the contacts id "+param.contact_id});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","ErrMsg %s, ErrStack %s, methodName: delContact",e.message,e.stack);
    res.json({success: false, error:true, methodName:"delContact", message: e.message});
  }
});

router.post('/addContactUpdate', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "INSERT INTO contact_update(contact_id, notes, date_of_status, created_by) VALUES ($1, $2, $3, $4);"
    const queryParam = [param.contact_id, param.notes, param.date_of_status, req.decoded.userId];
    let result = await psqlAPM.fnDbQuery("addContactUpdate", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully added the contact update"});
      } else {
        res.json({success:false, message:"Failed to add the contact"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: addContactUpdate",e.message);
    res.json({success: false, error:true, methodName:"addContactUpdate",message: e.message});
  }
});

router.post('/getContactHistory', async (req, res) => {
  try {
    let param = req.body;
    const queryText = "SELECT id, date_of_status, notes, created_on FROM contact_update WHERE contact_id = $1 ORDER BY created_on desc OFFSET $2 LIMIT $3;";
    const queryParam = [param.contact_id, param.offset, param.limit];
    let encryptData;
    let result = await psqlAPM.fnDbQuery("getContactHistory", queryText, queryParam);
    if (result.success){
      if(result.rowCount>0){
        encryptData = settings.encrypt(JSON.stringify(result.rows));
      } else {
        encryptData = '';
      }
      res.json({success:true, rowCount:result.rowCount, result: encryptData});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: getContactHistory",e.message);
    res.json({success: false, error:true, methodName:"getContactHistory",message: e.message});
  }
});

router.post('/delContactUpdate', async (req, res) => {
  try {
    let param = req.body;
    const queryText = "DELETE FROM contact_update WHERE id = $1;";
    const queryParam = [param.id];
    let result = await psqlAPM.fnDbQuery("delContactUpdate", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Successfully deleted the contact update id "+param.id});
      } else {
        res.json({success:false, message:"Failed to delete the contact update record"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","ErrMsg %s, ErrStack %s, methodName: delContactUpdate",e.message,e.stack);
    res.json({success: false, error:true, methodName:"delContactUpdate", message: e.message});
  }
});

router.post('/pendingTaskStatus', async (req, res) => {
  try {
    let param = req.body;
    const queryText = 
          "SELECT t.id as task_id, t.name as task_name, s.id as suggestion_id, s.name as suggestion_name, "+
          "  l.list_name as department, now()-t.end_date-'1 day'::INTERVAL as delay_by, t.end_date, "+
          "  t.assigned_to_id, u.user_name AS assigned_to_user, "+
          "  COALESCE( "+
          "    (SELECT COALESCE(completion_percentage,0) "+
          "     FROM tasks_update "+
          "     WHERE id =(SELECT MAX(id) FROM tasks_update WHERE task_id = t.id)),0) as cp "+
          "FROM tasks t "+
          "JOIN suggestions s on s.id = t.suggestion_id "+
          "JOIN lists l on l.id = t.ministry "+
          "LEFT JOIN login_user u ON t.assigned_to_id = u.id "+
          "WHERE t.end_date+'1 day'::INTERVAL < now() AND COALESCE((SELECT COALESCE(completion_percentage,0) FROM tasks_update WHERE id = (SELECT MAX(id) FROM tasks_update WHERE task_id = t.id)),t.completion_percentage,0) < 100 "+
          "ORDER BY delay_by DESC "+
          "OFFSET $1 LIMIT $2";
    const queryParam = [param.offset, param.limit];
    let result = await psqlAPM.fnDbQuery("pendingTaskStatus", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        encryptData = settings.encrypt(JSON.stringify(result.rows));
      } else {
        encryptData = '';
      }
      res.json({success:true, rowCount:result.rowCount, result:encryptData});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","ErrMsg %s, ErrStack %s, methodName: pendingTaskStatus",e.message,e.stack);
    res.json({success: false, error:true, methodName:"pendingTaskStatus", message: e.message});
  }
});

router.post('/getTaskActualEfforts', async (req, res) => {
  let param = req.body;
  var queryParam = [param.start_date, param.end_date];
  try {
    var queryText = 
        "SELECT s.name AS suggestion_name, t.name AS task_name, tu.date_of_status, tu.created_on, "+
        "  remarks, COALESCE(tu.completion_percentage, t.completion_percentage) AS cp, "+
        "  COALESCE(tu.hours_spent, t.hours_spent) AS hs "+
        "FROM tasks t "+
        "INNER JOIN suggestions s ON t.suggestion_id = s.id "+
        "LEFT JOIN tasks_update tu ON t.id = tu.task_id "+
        "WHERE t.start_date >= $1 AND t.end_date <= $2 ";
    if( param.project_code != null){
        queryParam.push(param.project_code);
        queryText += "AND s.project_code = $"+(queryParam.length)+" ";
    }
    if(param.suggestion_id !=null){
        queryParam.push(param.suggestion_id);
        queryText += "AND s.id = $"+(queryParam.length)+" ";
    }
    if(param.assigned_to != null){
        queryParam.push(param.assigned_to);
        queryText += "AND assigned_to_id = $"+(queryParam.length)+" ";
    }
    queryParam.push(param.offset, param.limit);
    queryText += "ORDER BY tu.created_on DESC, date_of_status DESC "+
        "OFFSET $"+ (queryParam.length-1) + " " + "LIMIT $"+ (queryParam.length) ;
    let result = await psqlAPM.fnDbQuery("getTaskActualEfforts", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        encryptData = settings.encrypt(JSON.stringify(result.rows));
      } else {
        encryptData = '';
      }
      res.json({success:true, rowCount:result.rowCount, result:encryptData});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","ErrMsg %s, ErrStack %s, methodName: getTaskActualEfforts",e.message,e.stack);
    res.json({success: false, error:true, methodName:"getTaskActualEfforts", message: e.message});
  }
});


/* Projects grid,add,edit { */

router.post('/getProjects', async (req, res) => {
const queryText = "SELECT p.project_code, p.project_name, p.description, p.department_id, l_dep.list_name AS department_name, p.start_date, p.end_date, "+
                    "p.project_type_id, l_proj.list_name AS project_type_name, "+
                    "p.project_manager_id AS project_manager_id, u.user_name AS project_manager_name, "+
                    "p.created_on, p.active_flag, p.delete_flag "+
                    "FROM projects p "+
                    "LEFT JOIN lists l_dep ON l_dep.list_group = 'department' AND p.department_id = l_dep.id "+
                    "LEFT JOIN lists l_proj ON l_proj.list_group = 'Project Type' AND p.project_type_id = l_proj.id "+
                    "LEFT JOIN login_user u ON p.project_manager_id = u.id "+
                    "ORDER BY p.project_name "+
                    "OFFSET $1 LIMIT $2";
  const queryParam = [req.body.offset, req.body.limit];
  try {
    let result = await psqlAPM.fnDbQuery("getProjects", queryText, queryParam);
    if (result.success){
      let encryptData;
      if (result.rowCount > 0){
        encryptData = settings.encrypt(JSON.stringify(result.rows));
      } else {
        encryptData = "";
      }
      res.json({success:true, rowCount:result.rowCount, result:encryptData});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.error("Exception at getProjects ErrMsg:%s, Query %s",e.message, queryText);
    res.json({success: false, error:true, message: e.message});
  }
});

router.post('/getUserProjects', async (req, res) => {
  let queryParam = [];
  let queryText =  "SELECT p.project_code, p.project_name "+
                     "FROM projects AS p ";
  if( req.decoded.userId !== 1 ) {    // Admin check
        queryParam.push(req.decoded.userId);
        queryText += "INNER JOIN teams ON p.project_code = teams.project_code AND teams.user_id = $"+queryParam.length+" AND teams.active_flag ";
  }
        queryText += "WHERE p.active_flag AND NOT p.delete_flag "+
                     "ORDER BY p.project_name ";
  try {
    let result = await psqlAPM.fnDbQuery("getUserProjects", queryText, queryParam);
    if (result.success){
      let encryptData;
      if (result.rowCount > 0){
        encryptData = settings.encrypt(JSON.stringify(result.rows));
      } else {
        encryptData = "";
      }
      res.json({success:true, rowCount:result.rowCount, result:encryptData});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.error("Exception at getUserProjects ErrMsg:%s, Query %s",e.message, queryText);
    res.json({success: false, error:true, message: e.message});
  }
});

router.post('/getProjectUsers', async (req, res) => {
  const queryText = "SELECT lu.id, lu.login_name, lu.user_name, lu.mobile, lu.email, lu.created_on, lu.is_deleted "+
                    "FROM login_user AS lu "+
                    "INNER JOIN teams ON lu.id = teams.user_id AND teams.project_code = $1 AND teams.active_flag "+
                    "ORDER BY lu.user_name ";
  let param = JSON.parse(settings.decrypt(req.body.param));
  const queryParam = [param.project_code];
  try {
    let result = await psqlAPM.fnDbQuery("getProjectUsers", queryText, queryParam);
    if (result.success){
      let encryptData;
      if (result.rowCount > 0){
        encryptData = settings.encrypt(JSON.stringify(result.rows));
      } else {
        encryptData = "";
      }
      res.json({success:true, rowCount:result.rowCount, result:encryptData});
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.error("Exception at getProjectUsers ErrMsg:%s, Query %s",e.message, queryText);
    res.json({success: false, error:true, message: e.message});
  }
});

router.post('/addProject', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "INSERT INTO projects(project_code, project_name, description, start_date, end_date, project_type_id, department_id, project_manager_id, created_by) "+
                      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
    const queryParam = [param.project_code, param.project_name, param.description, param.start_date, param.end_date, param.project_type_id, param.department_id, param.project_manager_id, req.decoded.userId];
    let result = await psqlAPM.fnDbQuery("addProject", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Added the Project.", result: result.rows});
      } else {
        res.json({success:false, message:"Failed to add the Project"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","Error Message: %s, methodName: addProject and Data is %s",e.message, JSON.stringify(req.body.param));
    res.json({success: false, error:true, methodName:"addProject", data:JSON.stringify(req.body.param), message: e.message});
  }
});

router.post('/updProject', async (req, res) => {
  try {
    let param = JSON.parse(settings.decrypt(req.body.param));
    const queryText = "UPDATE projects SET project_name = $2, description = $3, start_date = $4, end_date = $5, department_id = $6, project_type_id = $7, project_manager_id = $8, last_modified_by = $9, last_modified_on = now() WHERE project_code = $1";
    const queryParam = [param.project_code, param.project_name, param.description, param.start_date, param.end_date, param.department_id, param.project_type_id, param.project_manager_id, req.decoded.userId];
    let result = await psqlAPM.fnDbQuery("updProject", queryText, queryParam);
    if (result.success){
      if (result.rowCount > 0){
        res.json({success:true, rowCount:result.rowCount, message:"Updated the Project"});
      } else {
        res.json({success:false, message:"Failed to update the Project"});
      }
    } else {
      res.json({success: false, message: result.message});
    }
  } catch (e){
    logger.log("error","methodName: updProject ErrMsg:%s",e.message);
    res.json({success: false, error:true, methodName:"updProject", message: e.message});
  }
});

/* } Projects grid,add,edit */
