//Defaults
loggedIn = false;
postUrl = "index.php";
weakPwMsg = "Password is not strong enough. Try a more complicated password";
noPwMatchMsg = "Passwords do not match or none entered";
logOutMsg = "You are logged out";
processingMsg = "Please wait...";
noCredentialsMsg = "Please enter your username and password";

function jdapGetFuncName(func_string) {
    return func_string.slice(5);
}

function jdapRunFunction(functionName /*, args*/) {
    var args = Array.prototype.slice.call(arguments).splice(1);
    if (typeof window[functionName] === 'undefined') {
        return jdapSendFormDefault(args);
    } else {
        return window[functionName](args);
    }
}

function jdapLogIn(button) {
    msg = jdapGetUserPw();
    if (msg['Username'] != "" && msg['Password'] != "") {
        //we are also requesting all attributes immediatelly
        msg['jdapLogIn'] = "";
        msg['jdapAttributes'] = jdapGetAllLdapAttributes();
        jdapPostData(msg, jdapDecodeLoginResult);
    } else {
        jQuery('#status').html(noCredentialsMsg);
    }
}

function jdapGetUserPw() {
    //get username + password
    msg = {};
    msg['Username'] = jQuery('#jdapApp #Username').val();
    msg['Password'] = jQuery('#jdapApp #Password').val();
    return msg
}

function jdapGetAllLdapAttributes() {
   //iterate on all values not matched with noLdapPattern
    ldapAttributes = [];
    for (var object in jdapMarkUp) {
        //Find only ldap relevant markup parts
        if(!noLdapPattern.test(object)) {
            for (var item in jdapMarkUp[object]) {
                  ldapAttributes.push(jdapMarkUp[object][item]);
            }
        }
    }
    return ldapAttributes;
}

function jdapLoggedIn() {
    /*
    * show rest of Gui slideDown login
    */ 
    if(!loggedIn) {
        jQuery('#jdapApp div').filter('.jdapHead').filter(':first').slideUp(600);
        jQuery('#jdapApp div').filter('.jdapHead').filter(':first').next().slideUp(600);
        jQuery('#jdapApp div').filter('.jdapHead').not(':first').slideDown(600);
        jQuery('#jdapApp div').filter('.jdapResult').eq(1).slideDown(600);
        loggedIn = true;
    }
}

function jdapLogOut(button) {
    /*
    * clear all inputs and reset the form
    */ 
    jQuery('#jdapApp :input:not(input[type=button])').each(function() {
        jQuery(this).val("");
    });
    //slide all results up except the first which is the login
    jQuery('#jdapApp div').filter('.jdapHead').not(':first').next().slideUp(600);
    //same for the headings
    jQuery('#jdapApp div').filter('.jdapHead').not(':first').slideUp(600);
    //make sure the first is visible
    jQuery('#jdapApp div').filter('.jdapHead').filter(':first').slideDown(600);
    jQuery('#jdapApp div').filter('.jdapHead').filter(':first').next().slideDown(600);
    loggedIn = false;
    jQuery('#jdapApp #status').html("You are logged out");
}

function jdapUpdatePassword(button) {
    //get the username
    msg = jdapGetUserPw();
    container = jQuery(button).parent();
    pwds = new Array();
    container.children().filter(":password").each(function(index) {
        pwds.push(jQuery(this).val());
    });
    if((pwds[0] != "") && (pwds[1] != "") && (jdapValidatePasswd(pwds[0], pwds[1]))) {
        if (jdapGetPasswordStrength(pwds[0]) <7) {
            jQuery('#jdapApp #status').html(weakPwMsg);
        } else {
            msg['jdapUpdatePassword'] = pwds[0];
            jdapPostData(msg, jdapDecodeResult);
        }
    }
    else {
        jQuery('#jdapApp #status').html(noPwMatchMsg);
    }
}

function jdapModifyAttributes(button) {
    //get the username etc
    msg = jdapGetUserPw();
    container = jQuery(button).parent();
    //get all input elements except buttons and create 
    //an object of keys and values
    var attrs = new Object();
    container.children().filter(":input").not(":button").each(function(index) {
	var keyname = jQuery(this).attr('id');
	attrs[keyname] = jQuery(this).val();
    });
   msg['jdapModifyAttributes'] = attrs;
    jdapPostData(msg, jdapDecodeResult);
}

function jdapValidatePasswd(pw1, pw2) {
    if ( pw1 === pw2  ) { 
        return true;
    } else {
        //jQuery('#status').html("wachtwoorden komen niet overeen!");
        return false;
    }
}

function jdapGetPasswordStrength(PWD){
        var LENGTHSCORE=(PWD.length);

        // Added below to make all passwords less than 4 characters show as weak
        // LENGTHSCORE MAX = 5
        if (LENGTHSCORE<4) { LENGTHSCORE=0}
        if (LENGTHSCORE>5) { LENGTHSCORE=5}
        
        //test for numeric characters
        // NUMSCORE MAX = 3
        var ALPHAS=PWD.replace(/[0-9]/g,"");
        var NUMSCORE=(PWD.length-ALPHAS.length);
        if(NUMSCORE>3){NUMSCORE=3}
        
        //Test for punctuation characters
        //PUNCTSCORE MAX = 3
        var ALPHANUM=PWD.replace(/\W/g,"");
        var PUNCTSCORE=(PWD.length-ALPHANUM.length);
        if(PUNCTSCORE>3){PUNCTSCORE=3}
        
        //Test for uppercase characters
        //UPPERSCORE MAX = 3
        var LOWER=PWD.replace(/[A-Z]/g,"");
        var UPPERSCORE=(PWD.length-LOWER.length);
        if(UPPERSCORE>3){UPPERSCORE=3}
        
        //TOTALSCORE MAX = 14
        var TOTALSCORE=LENGTHSCORE + NUMSCORE + PUNCTSCORE + UPPERSCORE;
        if(TOTALSCORE<0){TOTALSCORE=0}
        if(TOTALSCORE>14){TOTALSCORE=14}
        return TOTALSCORE
}

function jdapHideGui() {
    /*
    * hide everything but the login
    */ 
    jQuery('#jdapApp :input:not(input[type=button])').each(function() {
        jQuery(this).val("");
    });
    jQuery('#jdapApp div').filter('.jdapHead').not(':first').next().hide();
    jQuery('#jdapApp div').filter('.jdapHead').not(':first').hide();
}

function jdapSendFormDefault(button) {
    /*
    * General function for buttons
    */
    //get parent div
    container = jQuery(button).parent();
    msg = jdapGetUserPw();
    //iterate on all input elements
    container.children().filter(":input").each(function(index) {
        msg[jQuery(this).attr('id')] = jQuery(this).val();
    });
    jdapPostData(msg, jdapDecodeResult);
}

function jdapDecodeLoginResult(result) {
    if (result["error"] == 0) {
        jdapLoggedIn();
    }
    jdapDecodeResult(result);
}

function jdapPostData(msg, callback) {
    out = ""
    for(var item in msg) {
        out = out + item +" "+ msg[item]+"\n";
    }
    //alert(out);
    jQuery.post(postUrl, msg, callback, "json");
    jQuery('#status').html(processingMsg);
}

function jdapDecodeResult(result) {
    /*
    * extract some useful data and try
    * to link them to the input id's
    */
    //alert(result["error"]);
    res = "jdapDecode:<br />";
    if (result["error"] == 0) {
        //example iteration of data  
        itemcount = result["count"];
        for (i = 0; i < itemcount; i++) {
            res = res + result[i] +" : ";
            attr_count = result[result[i]]["count"];
            for(j = 0;j < attr_count; j++) {
            	res = res + "<input type='text' id=\"" + result[i] + "\" value=\"" + result[result[i]][j] + "\"><br />";
                jQuery('#jdapApp #'+result[i]).val(result[result[i]][j]);
            }
        }
        
    }
    jQuery('#jdapApp #status').html(result["usermsg"]);
}

function jdapGuiControls() {
    jQuery('#jdapApp div').filter('.jdapHead').click(jdapGuiSlide);
}

function jdapGuiButtons() {
    /*
    * Set click actions on buttons
    */
    jQuery('#jdapApp :button').each(function() {
            jQuery(this).click( function(event) { 
                jdapRunFunction(jQuery(this).attr('id'), event.target);
            });
        }
    )
    jQuery('#jdapApp :input').each(function() {
            jQuery(this).keypress(function(e) {
                if(e.which == 13) {
                    jdapLogin();
                }
            });
        }
    )
}

function jdapGuiSlide() {
    //Didn't expect this to work but it does... :)
    jQuery('#jdapApp div').filter('.jdapHead').next().slideUp(600);
    jQuery(this).next().slideDown();
}

function jdapGui() {
    /*
    * create form from the associative array
    */
    res = "";
    for (var object in jdapMarkUp) {
        //get optional title and description
        if (jdapMarkUp[object]["_Title"] == undefined) {
            res = res + "<div class=jdapHead id=" + object + ">" + object + "</div>";
        } else {
             res = res + "<div class=jdapHead id=" + object + ">" + jdapMarkUp[object]["_Title"] + "</div>";
        }
        res = res + "<div class=jdapResult id=" + object + ">";
        if (jdapMarkUp[object]["_Description"] != undefined) {
             res = res + "<div class='jdapDescription'>"+ jdapMarkUp[object]["_Description"] + "</div>";
        }
        //iterate on all items in the markup object
        for (var item in jdapMarkUp[object]) {
            //try to match the item to predefined strings patterns
            //items starting with an underscore are ignored
            if (item.match(/^_/i) == null) {
                if (item.match(/func_/i) != null) {
                    //it seems we found a function
                    res = res + "<input type='button' id='" +  jdapGetFuncName(item) + "' value='"+ jdapMarkUp[object][item] +"'><br /> ";
                } else {
                    switch(jdapMarkUp[object][item]) {
                        //do specifics on input element types otherwise set different ID (probably ldap attr ID)
                        case ("password"):
                            res = res + item + "<br /><input type='password' id='" + item + "'> <br /> ";
                            break
                        case ("button"):
                            res = res + item + "<br /><input type='button' id='" + item + "'> <br /> ";
                            break
                        case ("text"):
                            res = res + item + "<br /><input type='text' id='" + item + "'> <br /> ";
                            break
                        default:
                            res = res + item + "<br /><input type='text' id='" + jdapMarkUp[object][item] + "'> <br /> ";
                            break
                    }
                }
            }
        }
        res = res + "</div>";
    }
    res = res + "<div id='status' class='jdapStatus'></div>";
    //Set PostUrl
    if (jdapMarkUp.Login._PostUrl != undefined) {
        postUrl = jdapMarkUp.Login._PostUrl;
    }
    //Set noCredentialMessage
    if (jdapMarkUp.Login._NoCredentialMessage != undefined) {
        noCredentialMessage = jdapMarkUp.Login.__NoCredentialMessage;
    }
    //Set processing msg
    if (jdapMarkUp.Login._ProcessingMsg != undefined) {
        processingMsg = jdapMarkUp.Login._ProcessingMsg;
    }
    //Set Pw messages if UpdatePassword is defined
     if (jdapMarkUp.UpdatePassword =! undefined) {
         if (jdapMarkUp.UpdatePassword._WeakPwMsg != undefined) {
            weakPwMsg = jdapMarkUp.UpdatePassword._WeakPwMsg;
        }
        if (jdapMarkUp.UpdatePassword._NoPwMatchMsg != undefined) {
            noPwMatchMsg = jdapMarkUp.UpdatePassword._NoPwMatchMsg;
        }
    }
    //Set logout msg
    if (jdapMarkUp.LogOut._LogOutMsg != undefined) {
        logOutMsg = jdapMarkUp.LogOut._LogOutMsg;
    }
    jQuery('#jdapApp').html(res);
}
