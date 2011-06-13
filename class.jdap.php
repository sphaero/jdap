<?php
include_once "class.smbhash.php";

class jdap {
    /*
    * The class always returns an array with at least the following keys:
    * [error]   : the error code (0 = success)
    * [errormsg]: the error message
    * [usermsf] : a user friendly feedback message
    */

    public $config = Array();
    public $msg = Array();

    function __construct($configarr, $msgarr) {
        $this->config = $configarr;
        $this->msg = $msgarr;
    }
   
    function __destruct() {
        unset($this->config);
    }
    
    public function doRun() {
        $result = Array();
        
        // connect to ldap server
        $ldapconn = ldap_connect($this->config['host'], $this->config['port']);
        //TODO fix this
        $ldaprdn = $this->findUser($ldapconn, $this->config["Username"]);
        if (ldap_errno($ldapconn) == 0) {
            //If ldap connection is succesful we start the action
            if(array_key_exists("jdapLogIn", $this->config)) {
                if ($this->logIn($ldapconn, $ldaprdn, $this->config['Password'])) {
                   //$result = getAttributes($ldapconn, $ldaprdn);
                   if(array_key_exists("jdapAttributes", $this->config)) {
                       $result = $this->getAttributes($ldapconn, $ldaprdn, $this->config["jdapAttributes"]);
                   }
                   $result["usermsg"] = $this->msg['login'];
                }
                else {
                   $result["usermsg"] = $this->msg['failedLogin'];
                }
            }
            //Change password action
            elseif(array_key_exists("jdapUpdatePassword", $this->config)) {
                if ($this->logIn($ldapconn, $ldaprdn, $this->config['Password'])) {
                    if ($this->updatePassword($ldapconn, $ldaprdn, $this->config['newPw'])) {
                        $result["usermsg"] = $this->msg['failedPw'];
                    }
                }
                else {
                   $result["usermsg"] = $this->msg['failedCred'];
                }
            }
            //Change attributes action
            elseif(array_key_exists("modifyAttributes", $this->config)) {
                if ($this->logIn($ldapconn, $ldaprdn, $this->config['Password'])) {
                    if ($this->modifyAttributes($ldapconn, $ldaprdn, $ldapconfigp["newAttr"])) {
                        $result["usermsg"] = $this->msg['failedModify'];
                    }
                }
                else {
                   $result["usermsg"] = $this->msg['failedCred'];
                }
            }
        }
        else {
            echo "Could not connect to LDAP server: " . ldap_error($ldapconn);
            $result["usermsg"] = $this->msg['connectFailed'];
        }
        $result["error"] = ldap_errno($ldapconn);
        $result["errmsg"] = ldap_error($ldapconn);
        if ($result["usermsg"] == "" && $result["error"] == 0) {
            $result["usermsg"] = $this->msg['success'];
        }
        elseif ($result["usermsg"] == "") {
            $result["usermsg"] = $this->msg['failed'];
        }
        ldap_unbind($ldapconn);
        return $result;
    }

    private function logIn(&$ldapcn, $udn, $pass) {
        /*
        * Simple login function
        */
        $ldapbind = @ldap_bind($ldapcn, $udn, $pass);
        if (ldap_errno($ldapcn) == 0) {
            return true;
        }
        else {
            return false;
        }
    }

    private function findUser(&$ldapcn, $cn) {
        /*
        * return DN of first user found 
        */
	$filter = "(&(objectClass=person)(uid=".$cn."))";
        $res = ldap_search($ldapcn, $this->config['basedn'], $filter, array("dn"));
        if (res) {
            $entryid = ldap_first_entry($ldapcn, $res);
            return ldap_get_dn($ldapcn, $entryid);
        }
        else {
            return ldap_errno($ldapcn);
        }
	$ldap_unbind($ldapcn);
    }

    private function getAttributes(&$ldapcn, $udn, $attr = array()) {
        /*
        * return requested attribubtes or all if none given 
        * Errorcode on fail!
        */
        $res = ldap_search($ldapcn, $udn, "(objectClass=person)", $attr);
        if (res) {
            $entry = ldap_first_entry($ldapcn, $res);
            return ldap_get_attributes($ldapcn, $entry);
        }
        else {
            return ldap_errno($ldapcn);
        }
    }

    private function modifyAttributes(&$ldapcn, $udn, $attr) {
        @ldap_mod_replace($ldapcn, $udn, $attr);
        return ldap_errno($ldapcn);
    }

    private function updatePassword(&$ldapcn, $udn, $passwd) {
        error_log("PasSSP: changing pw for ".$udn);
        $modattr = Array();
        //Create Samba Hashes
        if ($this->config['sambapasswords']) {
            $smbHasher = new smbHash();
            $modattr['sambaLMPassword'] = $smbHasher->lmhash($_newPassword);
            $modattr['sambaNTPassword'] = $smbHasher->nthash($_newPassword);
            $modattr['sambaPwdLastSet'] = $newData['sambaPwdCanChange'] = time();
            $modattr['sambaPwdMustChange'] = '2147483647';
        }
        switch ($this->config['password_encryption']) {
            case 'md5':
                $passwd = md5($passwd);
            case 'sha1':
                $passwd = sha1($passwd);
            default:
                break;
        }
        $modattr["userPassword"] = $passwd;
        return modifyAttributes($ldapcn, $udn, $modattr);
    }
}
?>
