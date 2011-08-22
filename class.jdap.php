<?php
include_once "class.smbhash.php";

class jdap {
    /*
    * The class always returns an array with at least the following keys:
    * [error]   : the error code (0 = success)
    * [errormsg]: the error message
    * [usermsf] : a user friendly feedback message
    */

    private $config = Array();
    private $msg = Array();

    function __construct($configarr, $msgarr) {
        $this->config = $configarr;
        $this->msg = $msgarr;
    }
   
    function __destruct() {
        unset($this->config);
    }
    
    public function doRun() {
        $result = Array();
        
        //if no user/pass is given there is no use to continue
        if(!(array_key_exists("Username", $this->config) && array_key_exists("Password", $this->config))) {
            $result["usermsg"] = $this->msg['failedLogin'];
            $result["error"] = -1;
            $result["errmsg"] = "No username or password given";
            return $result;
        }
        // connect to ldap server
        $ldapconn = ldap_connect($this->config['host'], $this->config['port']);
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
                    if ($this->updatePassword($ldapconn, $ldaprdn, $this->config["jdapUpdatePassword"])) {
                        $result["usermsg"] = $this->msg['failedPw'];
                    }
                }
                else {
                   $result["usermsg"] = $this->msg['failedCred'];
                }
            }
            //Change attributes action
            elseif(array_key_exists("jdapModifyAttributes", $this->config)) {
                if ($this->logIn($ldapconn, $ldaprdn, $this->config['Password'])) {
                    if ($this->modifyAttributes($ldapconn, $ldaprdn, $this->config["jdapModifyAttributes"])) {
                        $result["usermsg"] = $this->msg['failedModify'];
                    }
                }
                else {
                   $result["usermsg"] = $this->msg['failedCred'];
                }
            }
            else {
                $result["usermsg"] = $this->msg['nop'];
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

    private function findUser(&$ldapcn, $user) {
        /*
        * return DN of first user found 
        */
        $filter = "(&(objectClass=person)(".$this->config['user_attribute']."=".$user."))";
        $ldapbind = @ldap_bind($ldapcn, $this->config["searchuser"], $this->config["searchpass"]);
        $res = ldap_search($ldapcn, $this->config['basedn'], $filter, array("dn"));
        if (res) {
            $entryid = ldap_first_entry($ldapcn, $res);
            if($entryid) {
                return ldap_get_dn($ldapcn, $entryid);
            }
            else {
                return ldap_errno($ldapcn);
            }
        } 
        else {
            return ldap_errno($ldapcn);
        }
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
            $modattr['sambaLMPassword'] = $smbHasher->lmhash($passwd);
            $modattr['sambaNTPassword'] = $smbHasher->nthash($passwd);
            $modattr['sambaPwdLastSet'] = $newData['sambaPwdCanChange'] = time();
            $modattr['sambaPwdMustChange'] = '2147483647';
        }
        $modattr["userPassword"] = $this->encryptPassword($passwd);
        return $this->modifyAttributes($ldapcn, $udn, $modattr);
    }
    
    function encryptPassword($password) {
        /*
        * funcions to encrypt the password for ldap
        * based on code from egroupware.org
        */
        $type = strtolower($this->config['password_encryption']);
        $salt = '';
        switch($type) {
            case 'des':
                $salt       = self::randomstring(2);
                $_password  = crypt($password, $salt);
                $e_password = '{crypt}'.$_password;
                break;
            case 'blowfish_crypt':
                if(@defined('CRYPT_BLOWFISH') && CRYPT_BLOWFISH == 1) {
                    $salt = '$2$' . self::randomstring(13);
                    $e_password = '{crypt}'.crypt($password,$salt);
                     break;
                }
                self::$error = 'no blowfish crypt';
                break;
            case 'md5_crypt':
                if(@defined('CRYPT_MD5') && CRYPT_MD5 == 1) {
                    $salt = '$1$' . self::randomstring(9);
                    $e_password = '{crypt}'.crypt($password,$salt);
                    break;
                }
                self::$error = 'no md5 crypt';
                break;
            case 'ext_crypt':
                if(@defined('CRYPT_EXT_DES') && CRYPT_EXT_DES == 1) {
                    $salt = self::randomstring(9);
                    $e_password = '{crypt}'.crypt($password,$salt);
                      break;
                }
                self::$error = 'no ext crypt';
                break;
            case 'md5':
                /* New method taken from the openldap-software list as recommended by
                 * Kervin L. Pierre" <kervin@blueprint-tech.com>
                 */
                $e_password = '{md5}' . base64_encode(pack("H*",md5($password)));
                break;
            case 'smd5':
                $salt = self::randomstring(8);
                $hash = md5($password . $salt,true);
                $e_password = '{SMD5}' . base64_encode($hash . $salt);
                break;
            case 'sha':
                $e_password = '{SHA}' . base64_encode(sha1($password,true));
                break;
             case 'ssha':
                $salt = self::randomstring(8);
                $hash = sha1($password . $salt,true);
                $e_password = '{SSHA}' . base64_encode($hash . $salt);
                break;
            default:
                // if plain no type is prepended
                $e_password =$password;
                break;
        }
        return $e_password;
    }
}
?>
