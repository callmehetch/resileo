const psqlAPM = require('./psqlAPM');
export class UserModel {
    constructor(){ };
    async login (email:string){
        const queryText = "SELECT lu.user_id, lu.hash_password AS password, lu.email, lu.full_name, lu.mobile, lu.is_admin, lu.invited_user_id as invited_by, lu.created_on FROM login_user as lu WHERE lu.email = $1 AND NOT lu.is_deleted";
        const queryParam = [email];
        return await psqlAPM.fnDbQuery('login', queryText, queryParam);
    };

    async validateEmail(email:string){
        const queryText = "SELECT user_id, email FROM login_user WHERE email = $1";
        const queryParam = [email];
        return await psqlAPM.fnDbQuery('validateEmail', queryText, queryParam);
    }

    async addLoginHistory(email:string, ipAddress:string, message:string, status:boolean, token:string|undefined) {
        let query = "INSERT INTO login_history(email, ip_address, status, remarks, session_id) VALUES ($1, $2, $3, $4, $5);";
        let qryParam = [email, ipAddress, status, message, token];
        return await psqlAPM.fnDbQuery('loginHistory', query, qryParam);
    }

    async logout(token:string){
        const queryText = "UPDATE login_history SET logout_at = now(), remarks = $1 WHERE session_id= $2";
        const queryParam = ["Successfully Logged Out", token];
        return await psqlAPM.fnDbQuery('logoutUser', queryText, queryParam);
    }

    async insVerifyLink(param:any){
        const queryText = "INSERT INTO verify_link (email, verify_type, verify_code, validated_on, created_on, is_valid) values ($1, $2, $3, now(), now(), false)";
        const queryParam = [param.email, param.type, param.verify_code];
        return await psqlAPM.fnDbQuery('insVerifyLink', queryText, queryParam);
    }

    async updVerifyLink(param:any){
        const queryText = "Update verify_link set verify_type = $2, verify_code = $3, modified_on = now(), is_valid = false WHERE email ilike $1";
        const queryParam = [param.email, param.type, param.verify_code];
        return await psqlAPM.fnDbQuery('updVerifyLink', queryText, queryParam);
    }

    async checkVerifyLink(email:any){
        const queryText = "select * from verify_link where email = '$1' and created_on > current_timestamp - interval '3 hours";
        const queryParam = [email];
        return await psqlAPM.fnDbQuery('getOTP', queryText, queryParam);
    }

    async getVerifyLinkDetails(email:any){
        const queryText = "SELECT verify_code, is_valid, CASE WHEN validated_on >= now() - interval '3 hours' THEN true ELSE false END AS is_valid_on FROM verify_link WHERE email ilike $1 ";
        const queryParam = [email];
        return await psqlAPM.fnDbQuery('getVerifyLinkDetails', queryText, queryParam);
    }

    async validateOTP(param:any){
        const queryText = "UPDATE verify_link SET validated_on = now(), is_valid = true WHERE email =$1 and verify_type =$2 and verify_code = $3";
        const queryParam = [param.email, param.type, param.OTP];
        return await psqlAPM.fnDbQuery('validateOTP', queryText, queryParam);
    }

    async changeForgottenPassword(param:any){
        const queryText = "UPDATE login_user SET hash_password = $2 WHERE email =$1";
        const queryParam = [param.email, param.hash_password];
        return await psqlAPM.fnDbQuery('changeForgottenPassword', queryText, queryParam);
    }
    
    async changePassword(param:any){
        const queryText = "UPDATE login_user SET hash_password = $2 WHERE user_id =$1";
        const queryParam = [param.user_id, param.hash_password];
        return await psqlAPM.fnDbQuery('changePassword', queryText, queryParam);
    }
    
    async updateProfile(param:any){
        const queryText = "UPDATE login_user SET email = $1, full_name = $2, mobile = $3 WHERE user_id =$4";
        const queryParam = [param.email, param.user_name, param.mobile, param.user_id];
        return await psqlAPM.fnDbQuery('updateProfile', queryText, queryParam);
    }

    async getUserLic(userId:number){
        const queryText ="SELECT ul_id, ul.user_id, ul.plan_id, p.plan_name, p.max_users, ul.valid_from, ul.valid_to, company_name, company_address, gstin, email FROM user_license ul JOIN plan p on p.plan_id=ul.plan_id WHERE user_id = $1";
        const queryParam = [userId];
        return await psqlAPM.fnDbQuery('getUserLic', queryText, queryParam);
    }

    async addUsrLic(param:any){
        const queryText = "INSERT INTO user_license (user_id,plan_id, valid_from, valid_to, company_name, company_address, gstin, email, created_by) VALUES ($8,$1,$2,$3,$4,$5,$6,$7,$8)"
        const queryParam = [param.plan_id, param.valid_from, param.valid_to, param.company_name, param.company_address, param.gstin, param.email, param.userId];
        return await psqlAPM.fnDbQuery('addUsrLic', queryText, queryParam);
    }

    async updUsrLic(param:any){
        const queryText = "UPDATE user_license SET  plan_id=$1, valid_from=$2, valid_to=$3, company_name=$4, company_address=$5, gstin=$6, email=$7, modified_on=now(), modified_by=$8 WHERE ul_id=$9;"
        const queryParam = [param.plan_id, param.valid_from, param.valid_to, param.company_name, param.company_address, param.gstin, param.email,param.userId, param.ul_id];
        return await psqlAPM.fnDbQuery('updUsrLic', queryText, queryParam);
    }

    async checkInvitationExists (email:string){
        const queryText = "SELECT * FROM invitation i JOIN login_user lu ON lu.email=i.email AND lu.invite_accepted_on IS NOT NULL WHERE i.email = $1";
        const queryParam = [email];
        return await psqlAPM.fnDbQuery('checkInvitationExists', queryText, queryParam);
    }

    async checkLoginExists(email:string){
        const queryText = "SELECT * FROM login_user WHERE email = $1";
        const queryParam = [email];
        return await psqlAPM.fnDbQuery('checkLoginExists', queryText, queryParam);
    }

    async checkInvitationOwner (email:string){
        const queryText = "SELECT * FROM user_license WHERE email = $1";
        const queryParam = [email];
        return await psqlAPM.fnDbQuery('checkInvitationExists', queryText, queryParam);
    }
    async checkMoreThanOneInvitation (email:string){
        const queryText = "SELECT * FROM invitation WHERE email = $1;";
        const queryParam = [email];
        return await psqlAPM.fnDbQuery('checkMoreThanOneInvitation', queryText, queryParam);
    }
    async insInvitation(param:any){
        const queryText = "INSERT INTO invitation(email, name, invited_by, is_owner) VALUES ($1, $2, $3, $4) ON CONFLICT ON CONSTRAINT unq_invitation_email_invited_by DO NOTHING;";
        const queryParam = [param.email, param.name, param.invited_by, param.is_owner];
        return await psqlAPM.fnDbQuery('insInvitation', queryText, queryParam);
    }

    async insInvitationWithInvitedOn(param:any){
        const queryText = "INSERT INTO invitation(email, name, invited_by, invite_accepted_on, is_owner) VALUES ($1, $2, $3, now(),$4) ON CONFLICT ON CONSTRAINT unq_invitation_email_invited_by DO NOTHING";
        const queryParam = [param.email, param.name, param.invited_by, param.is_owner];
        return await psqlAPM.fnDbQuery('insInvitation', queryText, queryParam);
    }
    async updInvitationToExistingUser(param:any){
        const queryText = "UPDATE login_user SET invited_user_id=$2, invite_accepted_on=now() WHERE email=$1";
        const queryParam = [param.email, param.invited_by];
        return await psqlAPM.fnDbQuery('updInvitationToExistingUser', queryText, queryParam);
    }

    async updInvitation(param:any){
        const queryText = "UPDATE invitation SET invite_accepted_on = now() WHERE invitation_id=$1";
        const queryParam = [param.invitation_id];
        return await psqlAPM.fnDbQuery('updInvitation', queryText, queryParam);
    }

    async rejInvitation(param:any){
        const queryText = "UPDATE invitation SET invite_revoked_on = now(), is_rejected=true WHERE invitation_id IN ("+param.ids+")";
        // const queryParam = [param.ids];
        return await psqlAPM.fnDbQuery('rejInvitation', queryText, []);
    }

    async getInvitedUsers(userId:number){
        const queryText = "SELECT i.email, i.name, l.user_id, i.invite_accepted_on, i.is_owner, i.is_rejected FROM invitation i LEFT JOIN login_user l on l.email = i.email WHERE i.invited_by = $1";
        const queryParam = [userId];
        return await psqlAPM.fnDbQuery('getInvitedUsers', queryText, queryParam);
    }

    async delInvite(param:any){
        const queryText = "DELETE FROM invitation WHERE email = $1 AND invited_by = $2";
        const queryParam = [param.email, param.userId];
        return await psqlAPM.fnDbQuery('delInvite', queryText, queryParam);
    }

    async removeInviteReference(param:any){
        const queryText = "UPDATE login_user SET invited_user_id = null, invite_accepted_on = null WHERE email=$1 AND invited_user_id=$2";
        const queryParam = [param.email, param.userId];
        return await psqlAPM.fnDbQuery('removeInviteReference', queryText, queryParam);
    }

    async getPendingInvitations(email:string){
        const queryText = "SELECT i.invitation_id, i.invited_by, lu.full_name, ul.company_name, i.invited_on, false as is_accepted FROM invitation i JOIN login_user lu ON lu.user_id=i.invited_by JOIN user_license ul ON ul.user_id=i.invited_by AND now() between valid_from AND valid_to WHERE i.email = $1 AND i.invite_accepted_on is null AND i.invite_revoked_on is null";
        const queryParam = [email];
        return await psqlAPM.fnDbQuery('getPendingInvitations', queryText, queryParam);
    }

    async delAccount(userId:number){
        const queryText = "DELETE FROM login_user WHERE user_id = $1";
        const queryParam = [userId];
        return await psqlAPM.fnDbQuery('delAccount', queryText, queryParam);
    }

    async getUserAllRole(param:any){
        const queryText = "SELECT ur.u_r_id, ur.role_id, r.role_name, r.module_id, m.module_name, m.sub_module, m.permission, m.reserved, m.ui_screen FROM user_role as ur JOIN role as r ON r.role_id = ur.role_id JOIN modules as m JOIN r.module_id = m.module_id WHERE ur.user_id = $1";
        const queryParam = [param.userId];
        return await psqlAPM.fnDbQuery('getUserAllRole', queryText, queryParam);
    }

    async getUserRoleForModule(param:any){
        const queryText = "SELECT ur.u_r_id, ur.company_id, ln.lookup_name as company_type, c.company_name, ur.role_id, r.role_name, r.module_id, m.module_name, m.sub_module, m.permission, m.reserved, m.ui_screen FROM user_role as ur JOIN role as r ON r.role_id = ur.role_id JOIN modules as m JOIN r.module_id = m.module_id JOIN company c ON c.company_id = ur.company_id JOIN lookup_name ln on ln.lookup_name_id = c.company_type_id WHERE ur.user_id = $1 AND m.module_name = $2";
        const queryParam = [param.userId, param.module_name];
        return await psqlAPM.fnDbQuery('getUserRoleForModule', queryText, queryParam);
    }

    async getUserStat(){
        const queryText="SELECT (SELECT count(user_id) FROM login_user where is_active) as active, (SELECT count(user_id) FROM login_user WHERE is_deleted) as deleted,(SELECT count(user_id) FROM login_user WHERE is_admin OR is_company_admin) as admin";
        return await psqlAPM.fnDbQuery('getUserStat', queryText, []);
    }

    async getUserStatForCompAdmin(userId:number){
        const queryText="SELECT (SELECT count(user_id) FROM login_user WHERE user_id IN (SELECT DISTINCT user_id FROM user_company WHERE company_id IN (SELECT company_id FROM user_company WHERE user_id = $1)) AND is_active) as active, (SELECT count(user_id) FROM login_user WHERE user_id IN (SELECT DISTINCT user_id FROM user_company WHERE company_id IN (SELECT company_id FROM user_company WHERE user_id = $1)) AND is_deleted) as deleted,(SELECT count(user_id) FROM login_user WHERE user_id IN (SELECT DISTINCT user_id FROM user_company WHERE company_id IN (SELECT company_id FROM user_company WHERE user_id = $1) AND is_admin)) as admin";
        let queryParam = [userId]
        return await psqlAPM.fnDbQuery('getUserStat', queryText, queryParam);
    }

    async getRoleStatForAdmin(){
        const queryText="SELECT count(role_id) FROM role WHERE company_id IN (1)";
        return await psqlAPM.fnDbQuery('getRoleStatForAdmin', queryText, []);
    }

    async getRoleStatForCompAdmin(param:any){
        let queryText;
        let companies = "";
        let compArr = param.compArr;
        if (compArr.length > 0){
            compArr.map((id: number,ix: number)=>{
                if (ix != 0) companies += ",";
                companies += id;
            });
            queryText="SELECT count(role_id) FROM role WHERE company_id IN (1,"+companies+")";
            return await psqlAPM.fnDbQuery('getRoleStatForCompAdmin', queryText, []);
        } 
        else {
            queryText="SELECT count(role_id) FROM role where company_id IN (1)";
            return await psqlAPM.fnDbQuery('getRoleStatForCompAdmin', queryText, []);
        }
    }

    async getAllUsers(){
        const queryText = "SELECT user_id, email, mobile_country, mobile, full_name, is_active, is_deleted, created_on FROM login_user";
        return await psqlAPM.fnDbQuery('getAllUsers', queryText, []);
    }

    async checkUsrEmailExists(email:string, user_id:number){
        let queryText;
        let queryParam;
        if (user_id == undefined) {
            queryText = "SELECT user_id, email FROM login_user WHERE email=TRIM($1)";
            queryParam = [email];
        } 
        else {
            queryText = "SELECT user_id, email FROM login_user WHERE email=TRIM($1) AND user_id != $2";
            queryParam = [email,user_id];
        }
        return await psqlAPM.fnDbQuery('checkUsrEmailExists', queryText, queryParam);
    }

    async registerUser(param:any){
        let queryText;
        let queryParam;
        if (param.invited_by == undefined){
            queryText = "INSERT INTO login_user(email, full_name, mobile_country, mobile, hash_password) VALUES ($1,$2,$3,$4,$5) returning user_id";
            queryParam = [param.email, param.full_name, param.mobile_country, param.mobile, param.hash_password];
        } 
        else {
            queryText = "INSERT INTO login_user(email, full_name, mobile_country, mobile, hash_password, invited_user_id, invite_accepted_on) VALUES ($1,$2,$3,$4,$5,$6,now()) returning user_id";
            queryParam = [param.email, param.full_name, param.mobile_country, param.mobile, param.hash_password, param.invited_by];
        }
        return await psqlAPM.fnDbQuery('registerUser', queryText, queryParam);
    }

    async updUser(param:any){
        const queryText = "UPDATE login_user SET email = $1, full_name = $2, mobile_country = $3, mobile = $4, modified_by = $5, modified_on = now() WHERE user_id = $6";
        const queryParam = [param.email, param.full_name, param.mobile_country, param.mobile, param.userId, param.user_id];
        return await psqlAPM.fnDbQuery('updUser', queryText, queryParam);
    }

    async activateUsr(param:any){
        const queryText = "UPDATE login_user SET is_active = $1, modified_by= $3, modified_on = now() WHERE user_id = $2";
        const queryParam = [param.is_active, param.user_id, param.userId];
        return await psqlAPM.fnDbQuery('activateUsr', queryText, queryParam);
    }

    async delUsr(param:any){
        const queryText = "UPDATE login_user SET is_deleted = $1, modified_by= $3, modified_on = now() WHERE user_id = $2";
        const queryParam = [param.is_deleted, param.user_id, param.userId];
        return await psqlAPM.fnDbQuery('delUser', queryText, queryParam);
    }

    async getUserCompany(userId:number){
        const queryText = "SELECT c.company_id, c.company_name, c.company_short_name, c.company_type_id, ln.lookup_name as company_type, c.address, ci.name as city, st.name as state, co.name as country, c.zip_code, CASE WHEN uc.user_id is NULL THEN false ELSE true END is_selected, COALESCE(uc.is_admin,false) is_admin FROM company c JOIN lookup_name ln ON ln.lookup_name_id = c.company_type_id JOIN country co on co.id=c.country_id JOIN state st on st.id = c.state_id LEFT JOIN city ci on ci.id=c.city_id LEFT JOIN user_company uc ON uc.company_id = c.company_id AND uc.user_id = $1 WHERE c.company_type_id IN (SELECT distinct company_type_id FROM user_company where user_id = $1)";
        const queryParam = [userId];
        return await psqlAPM.fnDbQuery('getUserCompany', queryText, queryParam);
    }

    async delAllUsrCompanyForUser(userId:number){
        const queryText = "DELETE FROM user_company WHERE user_id=$1";
        const queryParam = [userId];
        return await psqlAPM.fnDbQuery('delAllUsrCompanyForUser', queryText, queryParam);
    }

    async addUsrCompanyForUser(userId:number, insData:any){
        const queryText = "INSERT INTO user_company (created_by, user_id, company_id, company_type_id, is_admin) SELECT $1, * FROM jsonb_to_recordset($2) as x(user_id int, company_id int, company_type_id int, is_admin boolean)";
        const queryParam = [userId, insData];
        return await psqlAPM.fnDbQuery('addUsrCompanyForUser', queryText, queryParam);
    }

    async getUsersForCompAdmin(userId:number){
        const queryText = "SELECT user_id, email, mobile_country, mobile, full_name, is_active, is_deleted, created_on, (SELECT DISTINCT company_type_id FROM user_company WHERE user_id = $1 LIMIT 1) as company_type_id FROM login_user WHERE user_id IN (SELECT DISTINCT user_id FROM user_company WHERE company_id IN (SELECT company_id FROM user_company WHERE user_id = $1))";
        const queryParam = [userId];
        return await psqlAPM.fnDbQuery('getUsersForCompAdmin', queryText, queryParam);
    }

    async insUsrCompany(param:any){
        const queryText = "INSERT INTO user_company (user_id, company_id, company_type_id, created_by) VALUES ($1, $2, $3, $4)";
        const queryParam = [param.user_id, param.company_id, param.company_type_id, param.userId];
        return await psqlAPM.fnDbQuery('insUsrCompany', queryText, queryParam);
    }

    async getAdminRoles(){
        const queryText = "SELECT r.role_id, r.company_id, c.company_name, r.role_name, r.module_id, m.module_name, m.sub_module, r.permission, m.reserved FROM role as r JOIN modules as m ON r.module_id = m.module_id JOIN company c ON c.company_id = r.company_id WHERE c.company_type_id IN (SELECT lookup_name_id FROM lookup_name WHERE lookup_name = 'Enterprise');";
        return await psqlAPM.fnDbQuery('getAdminRoles', queryText, []);
    }

    async getCompanyUnqRoleName(companyId:number){
        const queryText = "SELECT distinct role_name FROM role WHERE company_id = $1";
        const queryParam = [companyId];
        return await psqlAPM.fnDbQuery('getCompanyUnqRoleName', queryText, queryParam);
    }

    async getModulesAndRolesForCompany(companyId:number) {
        const queryText = "SELECT m.module_id, m.module_name, m.sub_module, r.role_id, r.role_name,r.permission,r.company_id FROM modules m LEFT JOIN role r ON r.module_id = m.module_id AND r.company_id = $1";
        const queryParam = [companyId]
        return await psqlAPM.fnDbQuery('getModules', queryText, queryParam);
    }

    async insRole(userId:number, insData:any){
        const queryText = "INSERT INTO role (created_by, company_id, role_name, module_id,permission) SELECT $1, * FROM jsonb_to_recordset($2) as x(company_id int, role_name varchar, module_id int, permission varchar)";
        const queryParam = [userId, insData];
        return await psqlAPM.fnDbQuery('insRole', queryText, queryParam);
    }

}
//