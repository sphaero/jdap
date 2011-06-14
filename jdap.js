loggedIn = false;
var jdapMarkUp = new Array();
//LogIn is essential
jdapMarkUp.Login = { 
    "Username" : "text",  
    "Password" : "password", 
    "func_jdapLogIn" : "Log in"
};
jdapMarkUp.UpdatePassword = {
    "New Password" : "password",
    "New Password Again" : "password",
    "func_jdapUpdatePassword" : "Change Password"
};
//LogOut is essential
jdapMarkUp.LogOut = {
    "func_jdapLogOut" : "Click to log out"
};

function jdapGetFuncName(func_string) {
    return func_string.slice(5);
}

function jdapRunFunction(functionName /*, args*/) {
    var args = Array.prototype.slice.call(arguments).splice(1);
    //alert("run func "+ window[functionName] + " " + functionName + " " + args);
    //alert(functionName);
    if (typeof window[functionName] === 'undefined') {
        return jdapSendFormDefault(args);
    } else {
        return window[functionName](args);
    }
}

function jdapLogIn(button) {
    msg = jdapGetUserPw();
    //we are also requesting all attributes immediatelly
    msg['jdapAttributes'] = jdapGetAllLdapAttributes();
    jdapPostData(msg, jdapDecodeLoginResult);
}

function jdapGetUserPw() {
    //get username + password
    msg = {};
    msg['Username'] = $('#Username').val();
    msg['Password'] = $('#Password').val();
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
        $('div').filter('.jdapHead').filter(':first').slideUp(600);
        $('div').filter('.jdapHead').filter(':first').next().slideUp(600);
        $('div').filter('.jdapHead').not(':first').slideDown(600);
        $('div').filter('.jdapResult').eq(1).slideDown(600);
        loggedIn = true;
    }
}

function jdapLogOut(button) {
    /*
    * clear all inputs and reset the form
    */ 
    $(':input:not(input[type=button])').each(function() {
        $(this).val("");
    });
    //slide all results up except the first which is the login
    $('div').filter('.jdapHead').not(':first').next().slideUp(600);
    //same for the headings
    $('div').filter('.jdapHead').not(':first').slideUp(600);
    //make sure the first is visible
    $('div').filter('.jdapHead').filter(':first').slideDown(600);
    $('div').filter('.jdapHead').filter(':first').next().slideDown(600);
    loggedIn = false;
    $('#status').html("You are logged out");
}

function jdapUpdatePassword(button) {
    //get the username
    msg = jdapGetUserPw();
    container = $(button).parent();
    pwds = new Array();
    container.children().filter(":password").each(function(index) {
        pwds.push($(this).val());
    });
    if(jdapValidatePasswd(pwds[0], pwds[1])) {
        msg['newPw'] = pwds[0];
        msg['jdapUpdatePw'] = "";
        jdapPostData(msg, jdapDecodeResult);
    }
    else {
        alert("Passwords do not match");
    }
}

function jdapValidatePasswd(pw1, pw2) {
    if ( pw1 === pw2 ) { 
        return true;
    } else {
        //$('#status').html("wachtwoorden komen niet overeen!");
        return false;
    }
}

function jdapHideGui() {
    /*
    * hide everything but the login
    */ 
    $(':input:not(input[type=button])').each(function() {
        $(this).val("");
    });
    $('div').filter('.jdapHead').not(':first').next().hide();
    $('div').filter('.jdapHead').not(':first').hide();
}

function jdapSendFormDefault(button) {
    /*
    * General function for buttons
    */
    //get parent div
    container = $(button).parent();
    msg = jdapGetUserPw();
    //iterate on all input elements
    container.children().filter(":input").each(function(index) {
        msg[$(this).attr('id')] = $(this).val();
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
    for(item in msg) {
        out = out + item +" "+ msg[item]+"\n";
    }
    alert(out);
    $.post("index.php", msg, callback, "json");
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
                $('#'+result[i]).val(result[result[i]][j]);
            }
        }
        
    }
    $('#status').html(result["usermsg"]);
}

function jdapGuiControls() {
    $('div').filter('.jdapHead').click(jdapGuiSlide);
}

function jdapGuiButtons() {
    /*
    * Set click actions on buttons
    */
    $(":button").each(function() {
            $(this).click( function(event) { 
                jdapRunFunction($(this).attr('id'), event.target);
            });
        }
    )
}

function jdapGuiSlide() {
    //Didn't expect this to work but it does... :)
    $('div').filter('.jdapHead').next().slideUp(600);
    $(this).next().slideDown();
}

function jdapGui() {
    /*
    * create form from the associative array
    */
    res = "";
    func_pattern = /func_/;
    for (var object in jdapMarkUp) {
        res = res + "<div class=jdapHead id=" + object + ">" + object + "</div>";
        res = res + "<div class=jdapResult id=" + object + ">";
        for (var item in jdapMarkUp[object]) {
            //try to match the item to predefined strings patterns
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
        res = res + "</div>";
    }
    res = res + "<div id='status' class='jdapStatus'></div>";
    $('#jdapApp').html(res);
}
