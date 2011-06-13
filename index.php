<?php
require "config.php";
include "class.jdap.php";

//Is this safe?
foreach($_POST as $key=>$value) {
	$jdapData[$key] = $value;
}
$jdap = new jdap($jdapData, $jdapMsg);
$result = $jdap->doRun();

//output voor debug
if ($result["error"] == 0 && !isset($_POST["Username"])) {
    echo "<p>".$result["count"] . " attributes held for this entry:<p>";
    for ($j = 0; $j < $result["count"]; $j++){
        echo $result[$j] . " : ";
        for ($i = 0; $i < $result["$result[$j]"]["count"]; $i++){
            echo $result["$result[$j]"][$i]."<br />";
        }
    }
    echo "<p>";
}
elseif (!isset($_POST["Username"])) {
    echo "Some shit :(<p>";
}
error_log($result["usermsg"] ." : ".$result["error"]);
echo json_encode( $result );
?>