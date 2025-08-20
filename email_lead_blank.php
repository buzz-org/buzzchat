<?php

email_send(1, 4, 'admin');

function logerror($logmsg)
{
	$errmsg = "[ ".date('Y-m-d H:i:s')." ]";
	
	$processArray = function ($array) use (&$processArray) {
        $result = '';
        foreach ($array as $key => $value) {
            if (is_array($value)) {
                $result .= " [ $key : {" . $processArray($value) . " } ]";
            } else {
                $result .= " [ $key : $value ]";
            }
        }
        return $result;
    };
	$errmsg .= $processArray($logmsg) . "\n";
	
	error_log($errmsg, 3, LOGFILE);
}

function email_send($pk_id, $usr_login)
{
	try
	{
		$sql_db = 'SELECT DATABASE() AS DB';		sc_lookup_field(arr_db, $sql_db);
	
		$sql_pref = 'SELECT a.EmailPrefId, a.EmailPrefName, a.EmailOnOff, a.EmailSend, a.EmailFolder, a.LibraryPath, a.EmailPath, a.EmailLogFile, a.IsRecClosed, a.EmailCurl FROM emailpreference a WHERE a.EmailPrefId = "1"';	sc_lookup_field(arr_pref, $sql_pref);

		$arr_pref[0]['DB']	=	$arr_db[0]['DB'];	$appname = getCurrentUrl();
		
		$sql_log = 'INSERT INTO emailloghd (LogType, AppName, CreatedBy) VALUES("2", "'.$appname.'", "'.$usr_login.'")';	sc_exec_sql($sql_log);
		
		$sql_lid = 'SELECT LAST_INSERT_ID() AS LID';	sc_lookup(arr_lid, $sql_lid);
		
		// $pk_id = array('6', '7');		$usr_login = [usr_login];

		// $pk_id = 1;		$usr_login = "csa";

		// $pk_id = $_POST['pk_id'];		$usr_login = $_POST['usr_login'];

		define('DIR', dirname(__FILE__,3));	require DIR.'/vendor/autoload.php';	define('AUTHFOLDER', DIR . '/authdata');

		define('LOGFILE', AUTHFOLDER . '/authlog.log');		ini_set('error_log', LOGFILE);	$hdrlog = [];

		$logmsg = ["status" => "success", "code" => 1, "message" => "Starting trouble.", "details" => "Not going forward."];

		if ( !empty($pk_id) && isset($usr_login) )
		{
			list($logmsg, $hdrlog) = auto_send($pk_id, $usr_login, $arr_pref, $logmsg, $hdrlog, $appname);
		}
		else
		{
			$logmsg = ["status" => "failed", "code" => 0, "message" => "primary key or username not set.", "details" => "Either primary key or username not set." ];
		}
	}
	catch (Throwable $oe)
	{
		$logmsg = json_decode($oe->getMessage(), true);

		if (json_last_error() !== JSON_ERROR_NONE)
		{
			$logmsg = ["status" => "error", "code" => 0, "message" => "Error Occured.", "details" => ['message' => $oe->getMessage(), 'code' => $oe->getCode(), 'file' => $oe->getFile(), 'line' => $oe->getLine()]];
		}
	}

	$sql_log = 'UPDATE emailloghd SET SendStatus = "'.$logmsg['code'].'", SendMsgs = FROM_BASE64("'.base64_encode(json_encode($logmsg, JSON_PRETTY_PRINT)).'") WHERE SendLogHdId = "'.$arr_lid[0][0].'"';	sc_exec_sql($sql_log);
	
	if ( !empty($hdrlog) )
	{
		// $sql_lid = 'SELECT LAST_INSERT_ID() AS LID';	sc_lookup(arr_lid, $sql_lid);

		for ($i= 0; $i<count($hdrlog); $i++)
		{
			$sql_log .= 'UPDATE emaillogdt SET DatabaseName="'.$temp_db.'", TableName="'.$temp_tb.'", BulkMail="'.$BulkMail.'", SendLogHdId=(SELECT LAST_INSERT_ID()), EmailTemplateId="'.$templateid.'", EmailFrm="'.$usr.'", EmailTo="'.$hdrlog[$i]['to'].'", EmailCc="'.$hdrlog[$i]['cc'].'", EmailBcc="'.$hdrlog[$i]['bcc'].'", EmailSubj=FROM_BASE64("'.base64_encode($hdrlog[$i]['subj']).'"), EmailBody=FROM_BASE64("'.base64_encode($hdrlog[$i]['body']).'"), AttachSent="'.$hdrlog[$i]['att'].'", SendStatus="'.$hdrlog[$i]['flag'].'", SendMsgs=FROM_BASE64("'.base64_encode(json_encode($hdrlog[$i]['send'], JSON_PRETTY_PRINT)).'"), ForeignKey="'.$hdrlog[$i]['desg'].'", CreatedBy="'.$login_usr.'" WHERE SendLogDtId = "'.$pk_id.'"';
		}
	}

	// 		$sql_senlog = 'INSERT INTO emaillogdt (DatabaseName, TableName, BulkMail, EmailTemplateId, EmailFrm, EmailTo, EmailCc, EmailBcc, EmailSubj, EmailBody, AttachSent, SendStatus, SendMsgs, ForeignKey, CreatedBy) VALUES ("'.$db.'", "crmdetails", "0", "0", "'.$EmailFrmId.'", "'.$EmailTo.'", "'.$EmailCc.'", "'.$EmailBcc.'", FROM_BASE64("'.base64_encode($EmailSubj).'"), FROM_BASE64("'.base64_encode($EmailBody).'"), "'.$AttachSent.'", "'.$logmsg['code'].'", FROM_BASE64("'.base64_encode(json_encode($logmsg, true)).'"), "'.$pk_id[$i].'", "'.$usr_login.'");
// ';
		sc_exec_sql($sql_log);
	
	logerror($logmsg);
	// echo "<script>alert('".$logmsg['message']."');</script>";
	echo "<script>alert('".$hdrlog[0]['message']."');</script>";
	// sc_alert($logmsg['message']);
	// echo json_encode($logmsg, true);
	print_r($logmsg);
	// sc_redir("email_client_blank", usr_login=[usr_login]; emlserpro=[emlserpro], "_blank", "", "800", "600");
}

function auto_send($pk_id, $usr_login, $arr_pref, $logmsg, $hdrlog, $appname)
{
	$EmailPrefId				=	$arr_pref[0]['EmailPrefId'];
	$EmailPrefName				=	$arr_pref[0]['EmailPrefName'];
	$EmailOnOff					=	$arr_pref[0]['EmailOnOff'];
	$EmailFolder                =	$arr_pref[0]['EmailFolder'];
	$LibraryPath				=	$arr_pref[0]['LibraryPath'];
	$EmailPath					=	$arr_pref[0]['EmailPath'];
	$EmailLogFile				=	$arr_pref[0]['EmailLogFile'];
	$EmailSend					=	$arr_pref[0]['EmailSend'];
	$EPRClosed					=	$arr_pref[0]['EPRClosed'];
	$EmailCurl					=	$arr_pref[0]['EmailCurl'];
	
	if( empty($arr_pref) )
	{
		$logmsg = ["status" => "failed", "code" => 0, "message" => "Email configuration is empty.", "details" => "Email configuration is empty."];
	}
	elseif ( $EmailOnOff != 1 )
	{
		$logmsg = ["status" => "failed", "code" => 0, "message" => "Email feature is disabled.", "details" => "Email feature is disabled."];
	}
	elseif ( $EmailSend != 1 )
	{
		$logmsg = ["status" => "failed", "code" => 0, "message" => "Email sending is disabled.", "details" => "Email sending is disabled."];
	}
	elseif ( $EPRClosed != 0 )
	{
		$logmsg = ["status" => "failed", "code" => 0, "message" => "Email preference is closed.", "details" => "Email preference is closed."];
	}
	else
	{
		$sql_sesmax = "SET SESSION group_concat_max_len = 1000000;";	sc_exec_sql($sql_sesmax);
		list($logmsg, $hdrlog) = bulk_loop($pk_id, $usr_login, $arr_pref, $logmsg, $hdrlog, $appname);
		
	}
	return array($logmsg, $hdrlog);
}

function bulk_loop($pk_id, $usr_login, $arr_pref, $logmsg, $hdrlog, $appname)
{
	for ($i = 0; $i < count($pk_id); $i++ )
	{
		try
		{
			$sql_eml = 'SELECT b.EmailSerProId, b.EmailSerProName, b.ClientSecret, b.AllowSend, b.IsRecClosed, c.EmailAddressId, c.EmailAddress, c.AddressToken, c.AllowSend, c.IsRecClosed, d.EmailFrm, (SELECT GROUP_CONCAT(e.Email) FROM custcontact e WHERE FIND_IN_SET(e.custcontactid, d.EmailTo)) AS EmailTo, (SELECT GROUP_CONCAT(e.Email) FROM custcontact e WHERE FIND_IN_SET(e.custcontactid, d.EmailCc)) AS EmailCc, (SELECT GROUP_CONCAT(e.Email) FROM custcontact e WHERE FIND_IN_SET(e.custcontactid, d.EmailBcc)) AS EmailBcc, d.CrmSubject, d.CrmDetails FROM crmdetails d INNER JOIN emailaddressmst c ON c.EmailAddressId = d.EmailFrm INNER JOIN emailserpromst b ON b.EmailSerProId = c.EmailSerProId WHERE d.crmdetailsid = "'.$pk_id[$i].'"';	sc_lookup_field(arr_eml, $sql_eml);

			$sql_att = 'SELECT e.Attachment, e.FileName, e.FileSize FROM crmattach e WHERE e.crmdetailsid = "'.$pk_id[$i].'"';	sc_lookup(arr_att, $sql_att);
			$hdrlog[$i] = mail_send($pk_id, $usr_login, $arr_eml, $arr_att, $appname);
		}
		catch (Throwable $oe)
		{
			$hdrlog[$i] = json_decode($oe->getMessage(), true);

			if (json_last_error() !== JSON_ERROR_NONE)
			{
				$hdrlog[$i] = ["status" => "error", "code" => 0, "message" => "Error Occured.", "details" => ['message' => $oe->getMessage(), 'code' => $oe->getCode(), 'file' => $oe->getFile(), 'line' => $oe->getLine()]];
			}
		}
		$sql_senlog = 'UPDATE crmdetails SET SentStatus = "'.$hdrlog[$i]['code'].'", SentMsg = FROM_BASE64("'.base64_encode(json_encode($hdrlog[$i], JSON_PRETTY_PRINT)).'"), EmailUnqId = "'.$hdrlog[$i]['unqid'].'", MessageId = "'.$hdrlog[$i]['msgid'].'", InReplyTo = NULL, `References` = NULL WHERE crmdetailsid = "'.$pk_id[$i].'"';		sc_exec_sql($sql_senlog);
	}
	$logmsg = ["status" => "success", "code" => 1, "message" => "Sent successfully.", "details" => count($hdrlog), "foreignkey" => $pk_id, "function" => __FUNCTION__];
	return array($logmsg, $hdrlog);
}

function mail_send($pk_id, $usr_login, $arr_eml, $arr_att, $appname)
{
	echo __FUNCTION__."<br>";
	$EmailFrm = $arr_eml[0]['EmailAddress'];
	$EmailSubj = $arr_eml[0]['CrmSubject'];
	$EmailBody = $arr_eml[0]['CrmDetails'];
	$serproid = $arr_eml[0]['EmailSerProId'];
	$serpronm = $arr_eml[0]['EmailSerProName'];
	
	list($EmailTo, $InvalidTo) = val_cc_bcc($arr_eml[0]['EmailTo']);
	list($EmailCc, $InvalidCc) = val_cc_bcc($arr_eml[0]['EmailCc']);
	list($EmailBcc, $InvalidBcc) = val_cc_bcc($arr_eml[0]['EmailBcc']);
	
	if (filter_var($EmailFrm, FILTER_VALIDATE_EMAIL) == false)
	{
		$logmsg = ["status" => "failed", "code" => 0, "message" => "From : ".$EmailFrm." is invalid.", "details" => "From : ".$EmailFrm." is invalid."];
	}
	elseif ($EmailSubj == '')
	{
		$logmsg = ["status" => "failed", "code" => 0, "message" => "Subject : ".$EmailSubj." is empty.", "details" => "Subject : ".$EmailSubj." is empty."];
	}
	elseif ($EmailBody == '')
	{
		$logmsg = ["status" => "failed", "code" => 0, "message" => "Body : ".$EmailBody." is empty.", "details" => "Body : ".$EmailBody." is empty."];
	}
	else
	{
		if ( $serproid == 1 || $serproid == 4 )
		{
			$logmsg = googl_send($pk_id, $usr_login, $arr_eml, $arr_att, $EmailFrm, $EmailTo, $EmailCc, $EmailBcc, $EmailSubj, $EmailBody, $appname);
		}
		elseif ( $serproid == 2 )
		{
			$logmsg = micro_send($pk_id, $usr_login, $arr_eml, $arr_att, $EmailFrm, $EmailTo, $EmailCc, $EmailBcc, $EmailSubj, $EmailBody, $appname);
		}
		else
		{
			$logmsg = ["status" => "failed", "code" => 0, "message" => "Invalid Account.", "details" => "Email integration for this account does not exist." ];
		}
	}
	$AttachSent = count($arr_att);	$names = array_column($arr_att, 1);
	
// 	$logmsg['ValidTo'] = $EmailTo;
// 	$logmsg['ValidCc'] = $EmailCc;
// 	$logmsg['ValidBcc'] = $EmailBcc;
	
// 	$logmsg['From'] = $EmailFrm;
// 	$logmsg['Subject'] = $EmailSubj;
// 	$logmsg['Body'] = $EmailBody;
	
	$logmsg['InvalidTo'] = $InvalidTo;
	$logmsg['InvalidCc'] = $InvalidCc;
	$logmsg['InvalidBcc'] = $InvalidBcc;
	
	$logmsg['SerPro'] = $serpronm;
	$logmsg['attachments']['total'] = $AttachSent;
	$logmsg['attachments']['names'] = $names;
	
	return $logmsg;
}

// function googl_send($pk_id, $usr_login, $arr_eml, $arr_at, $EmailFrm, $EmailTo, $EmailCc, $EmailBcc, $EmailSubj, $EmailBody)
// {
// 	echo __FUNCTION__."<br>";
// 	$boundary = uniqid(rand(), true);
// 	$mimeMessage = "MIME-Version: 1.0\r\n";
// 	$mimeMessage .= "To: < ".$EmailTo." >\r\n";
// 	if ( !empty($EmailCc) )
// 	{
// 		$EmailCc = implode(" >,< ", $EmailCc);
// 		$mimeMessage .= "Cc: < ".$EmailCc." >\r\n";
// 	}
// 	if ( !empty($EmailBcc) )
// 	{
// 		$EmailBcc = implode(" >,< ", $EmailBcc);
// 		$mimeMessage .= "Bcc: < ".$EmailBcc." >\r\n";
// 	}
// 	$mimeMessage .= "Subject: " . $EmailSubj . "\r\n";
// 	$mimeMessage .= "Date: " . date(DATE_RFC2822) . "\r\n";
// 	$mimeMessage .= "Content-Type: multipart/mixed; boundary=" . $boundary . "\r\n\r\n";

// 	$mimeMessage .= "--" . $boundary . "\r\n";
// 	$mimeMessage .= "Content-Type: text/html; charset=UTF-8\r\n";
// 	$mimeMessage .= "Content-Transfer-Encoding: base64\r\n\r\n";
// 	$mimeMessage .= base64_encode($EmailBody) . "\r\n";
// 	$mime = new Mimey\MimeTypes();
// 	// echo $pk_id.'<br>' .$EmailTo.'<br>' .$EmailCc.'<br>' .$EmailBcc.'<br>' .$EmailSubj.'<br>' .$EmailBody.'<br>' .$mimeMessage.'<br>';
// 	for ($i = 0; $i < count($arr_att); $i++ )
// 	{
// 		$mimeMessage .= "--".$boundary."\r\n";
// 		$mimeMessage .= "Content-Type: " . getMimeType($mime, $arr_att[$i][1]) . "; name=\"" . $arr_att[$i][1] . "\"\r\n";
// 		$mimeMessage .= "Content-Disposition: attachment; filename=\"" . $arr_att[$i][1] . "\"\r\n";
// 		$mimeMessage .= "Content-Transfer-Encoding: base64\r\n\r\n";
// 		$mimeMessage .= chunk_split(base64_encode($arr_att[$i][0])) . "\r\n";
// 	}
// 	$mimeMessage .= "--" . $boundary . "--\r\n";
// 	$logmsg = getClient($arr_eml, $mimeMessage);
// 	return $logmsg;
// }

function googl_send($pk_id, $usr_login, $arr_eml, $arr_att, $EmailFrm, $EmailTo, $EmailCc, $EmailBcc, $EmailSubj, $EmailBody, $appname)
{
	echo __FUNCTION__."<br>";
	$message = new Symfony\Component\Mime\Email();
	$message->from($EmailFrm);
	if ( !empty($EmailTo) )
    {
        $message->to(...$EmailTo);
    }
	if ( !empty($EmailCc) )
    {
        $message->cc(...$EmailCc);
    }
    if ( !empty($EmailBcc) )
    {
        $message->bcc(...$EmailBcc);
    }
	$message->subject($EmailSubj);
	// print_r($pk_id); echo '<br>'; print_r($EmailFrm); echo '<br>'; print_r($EmailTo); echo '<br>'; print_r($EmailCc); echo '<br>'; print_r($EmailBcc); echo '<br>'; echo $EmailSubj; echo '<br>'; //echo $EmailBody; echo '<br>';
	$mime = new Mimey\MimeTypes();
	for ($i = 0; $i < count($arr_att); $i++ )
	{
		if ( str_contains($EmailBody, $arr_att[$i][1]) )
		{
			$replace = 'inlineimage'.$i;
			$EmailBody = str_replace($arr_att[$i][1], '<img src="cid:'.$replace.'">', $EmailBody);
			$message->embed($arr_att[$i][0], $replace, getMimeType($mime, $arr_att[$i][1]));
		}
		else
		{
			// echo '<br>Bad';
			$message->attach($arr_att[$i][0], $arr_att[$i][1], getMimeType($mime, $arr_att[$i][1]));
		}
	}
	$message->html($EmailBody);
	// echo $EmailBody; echo '<br>All';
	$mimeMessage = $message->toString();	// print_r($mimeMessage);
	// $logmsg = getClient($pk_id, $usr_login, $arr_eml, $mimeMessage);
	$logmsg = googl_curl($pk_id, $arr_eml, $mimeMessage, $usr_login, $appname);
	return $logmsg;
}

function micro_send($pk_id, $usr_login, $arr_eml, $arr_att, $EmailFrm, $EmailTo, $EmailCc, $EmailBcc, $EmailSubj, $EmailBody, $appname)
{
	echo __FUNCTION__."<br>";
	$message = [];	$raw = [];
	$message["subject"] = $EmailSubj;
	if ( !empty($EmailCc) )
	{
		$message["toRecipients"] = createRecipientsArray($EmailTo);
	}
	if ( !empty($EmailCc) )
	{
		$message["ccRecipients"] = createRecipientsArray($EmailCc);
	}
	if ( !empty($EmailBcc) )
	{
		$message["bccRecipients"] = createRecipientsArray($EmailBcc);
	}
	$mime = new Mimey\MimeTypes();	$attachments = [];
	 // print_r($pk_id); echo '<br>'; print_r($EmailFrm); echo '<br>'; print_r($EmailTo); echo '<br>'; print_r($EmailCc); echo '<br>'; print_r($EmailBcc); echo '<br>'; echo $EmailSubj; echo '<br>'; echo $EmailBody; echo '<br>'; // echo json_encode($message); echo '<br>';
	for ($i = 0; $i < count($arr_att); $i++ )
	{
		if ( str_contains($EmailBody, $arr_att[$i][1]) )
		{
			$replace = 'inlineimage'.$i;
			$EmailBody = str_replace($arr_att[$i][1], '<img src="cid:'.$replace.'">', $EmailBody);
			$attachments[] = [
				 "@odata.type" => "#microsoft.graph.fileAttachment",
				 "name" => $arr_att[$i][1],
				 "contentType" => getMimeType($mime, $arr_att[$i][1]),
				 "contentBytes" => base64_encode($arr_att[$i][0]),
				 "contentId" => $replace
			];
		}
		else
		{
			$attachments[] = [
				 "@odata.type" => "#microsoft.graph.fileAttachment",
				 "name" => $arr_att[$i][1],
				 "contentType" => getMimeType($mime, $arr_att[$i][1]),
				 "contentBytes" => base64_encode($arr_att[$i][0]),
				 "size" => $arr_att[$i][2]
			];
		}
	}
	$message["body"] = [
			"contentType" => "HTML",
			"content" => $EmailBody
			// "content" => mb_convert_encoding($EmailBody, 'UTF-8', 'UTF-8')
		];
	if ( !empty($attachments) )
	{
		$message["attachments"] = $attachments;
		// $raw["attachments"] = $attachments;
	}
	$raw['message'] = $message;
	$jsonMessage = json_encode($message);	// print_r($jsonMessage);
	unset($message["attachments"]);		// echo $EmailBody; echo '<br>All';
	$logmsg = getOutlook($pk_id, $usr_login, $arr_eml, $jsonMessage, $appname);
	$logmsg['finalmsg'] = $message;
	return $logmsg;
}

function getCurrentUrl()
{
	// $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
	$protocol = !empty($_SERVER['HTTP_X_FORWARDED_PROTO']) ? $_SERVER['HTTP_X_FORWARDED_PROTO'] . '://' : ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $_SERVER['SERVER_PORT'] == 443 ? 'https://' : 'http://');
	$host = $_SERVER['HTTP_HOST'];
	// $requestUri = $_SERVER['REQUEST_URI'];
	$requestUri = $_SERVER['SCRIPT_NAME'];
	$currentUrl = $protocol . $host . $requestUri;
	return $currentUrl;
}

function val_cc_bcc($emls)
{
	$valid = []; $invalid = [];
	
	if (!empty($emls))
	{
		$arr_emls = explode(",", $emls);
	
		foreach ($arr_emls as $email)
		{
			if (filter_var($email, FILTER_VALIDATE_EMAIL))
			{
				$valid[] = $email;
			}
			else
			{
				$invalid[] = $email;
			}
		}	
	}
	return array($valid, $invalid);
}

function getMimeType($mime, $filename) 
{
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    return $mime->getMimeType($ext);
}

// function getClient($pk_id, $usr_login, $arr_eml, $mimeMessage)
// {
// 	echo __FUNCTION__."<br>";
// 	$usr				=	$arr_eml[0]['EmailAddressId'];
// 	$ClientSecret		=	$arr_eml[0]['ClientSecret'];
// 	$AddressToken		=	$arr_eml[0]['AddressToken'];
// 	$token_usr			=	$arr_eml[0]['EmailAddress'];
// 	$serproid			=	$arr_eml[0]['EmailSerProId'];
	
// 	// $dotenv = Dotenv\Dotenv::createImmutable(AUTHFOLDER);
// 	// $dotenv->load();
// 	// $dotenv->required(['GMAIL_CLIENT']);
// 	// define('GMAIL_CLIENT', $_ENV['GMAIL_CLIENT']);
//     $client = new Google\Client();
//     $client->setApplicationName('GMail');
//     $client->setScopes('https://mail.google.com/');
//     $client->addScope("openid");
//     $client->addScope("profile");
//     $client->addScope("email");
//     // $secretPath = AUTHFOLDER . '/' . GMAIL_CLIENT . '.json';
//     // $tokenPath = AUTHFOLDER . '/' . $token_usr . '.json';
//     $secretPath = json_decode($ClientSecret, true);
//     $client->setAuthConfig($secretPath);
// 	$accessToken = json_decode($AddressToken, true);
// 	$client->setAccessToken($accessToken);
//     $client->setAccessType('offline');
//     $client->setPrompt('select_account consent');

//     // if (file_exists($tokenPath))
//     // {
//     //     $accessToken = json_decode(file_get_contents($tokenPath), true);
//     //     $client->setAccessToken($accessToken);
//     // }
//     if ($client->isAccessTokenExpired())
//     {
//         if ($client->getRefreshToken())
//         {
//             $client->fetchAccessTokenWithRefreshToken($client->getRefreshToken());
//         }
//         else
//         {
//             if (isset($_GET['code']))
//             {
//                 $authCode = trim($_GET['code']);
//             }
//             else
//             {
//                 $authUrl = $client->createAuthUrl();
//                 header("Location: " . $authUrl);
//             }
//             $accessToken = $client->fetchAccessTokenWithAuthCode($authCode);
//             $client->setAccessToken($accessToken);
//         }
//         // if (!file_exists(dirname($tokenPath)))
//         // {
//         //     mkdir(dirname($tokenPath), 0700, true);
//         // }
//         // file_put_contents($tokenPath, json_encode($client->getAccessToken()));
		
// 		$token_usr = GetFrom($client);
		
// 		$logmsg = ["status" => "success", "code" => 1, "message" => "Refreshed successfully.", "token" => $client->getAccessToken(), "email" => $token_usr, "details" => "Refreshed"];
		
// 		$sql_tknmst = "INSERT INTO emailaddressmst (EmailAddress, AddressToken, EmailSerProId, AllowConn, AllowSend, AllowSync, IsRecClosed, CreatedBy, UpdatedBy) VALUES ('".$logmsg['email']."', FROM_BASE64('".base64_encode(json_encode($logmsg['token'], JSON_PRETTY_PRINT))."'), '".$serproid."', '1', '1', '1', '0', '".$usr_login."', '".$usr_login."') ON DUPLICATE KEY UPDATE AddressToken = VALUES(AddressToken), UpdatedBy = VALUES(UpdatedBy)";        sc_exec_sql($sql_tknmst);
				
// 				$sql_conlog = 'INSERT INTO emailloghd (LogType, EmailAddressId, SendStatus, SendMsgs, AppName, CreatedBy) VALUES ("1", (SELECT EmailAddressId FROM emailaddressmst a WHERE a.EmailAddress = "'.$logmsg['email'].'"), "'.$logmsg['code'].'", FROM_BASE64("'.base64_encode(json_encode($logmsg, JSON_PRETTY_PRINT)).'"), "'.getCurrentUrl().'", "'.$usr_login.'")';	sc_exec_sql($sql_conlog);
//     }
	
// 	$logmsg = GmailSend($client, $mimeMessage);
// 	$data = google_msgid($client->getAccessToken(), $logmsg['unqid']);
	
// 	if (isset($data['payload']['headers'])) 
// 	{
// 		foreach ($data['payload']['headers'] as $header) 
// 		{
// 			if ($header['name'] === 'Message-Id') 
// 			{
// 				$logmsg['msgid'] = $header['value'];
// 				break; // Stop looping once found
// 			}
// 			else
// 			{
// 				$logmsg['msgid'] = NULL;
// 				$logmsg['msgdata'] = $data;
// 			}
// 		}
// 	}
//     return $logmsg;
// }

// function GetFrom($client)
// {
// 	echo __FUNCTION__."<br>";
	
//     $info = new Google_Service_Oauth2($client);
//     $user = $info->userinfo->get();
// 	// $tokenPath = AUTHFOLDER.'/'.$user->getEmail().'.json';
// 	// if (!file_exists(dirname($tokenPath)))	
// 	// {	
// 	// 	mkdir(dirname($tokenPath), 0777, true);	
// 	// }
// 	// file_put_contents($tokenPath, json_encode($client->getAccessToken()));
//     return $user->getEmail();
// }

// function GmailSend($client, $mimeMessage)
// {
// 	echo __FUNCTION__."<br>";
//     $service = new Google\Service\Gmail($client);
//     $message = new Google\Service\Gmail\Message();
//     $encodedEmail = base64_encode($mimeMessage);
//     $encodedEmail = str_replace(array('+', '/', '='), array('-', '_', ''), $encodedEmail);
//     $message->setRaw($encodedEmail);
//     $message = $service->users_messages->send('me', $message);
// 	$msg = json_decode(json_encode($message), true);
//     $logmsg = ["status" => "success", "code" => 1, "message" => "Sent successfully.", "details" => $msg, "unqid" => $msg['id']];
//     return $logmsg;
// }

function createRecipientsArray($addresses) 
{
	// echo __FUNCTION__."<br>";
    $recipients = [];
    foreach ($addresses as $address)
	{
        $recipients[] = ["emailAddress" => ["address" => $address]];
    }
    return $recipients;
}

function getOutlook($pk_id, $usr_login, $arr_eml, $jsonMessage, $appname)
{
	echo __FUNCTION__."<br>";
	$usr				=	$arr_eml[0]['EmailAddressId'];
	$ClientSecret		=	$arr_eml[0]['ClientSecret'];
	$AddressToken		=	$arr_eml[0]['AddressToken'];
	$token_usr			=	$arr_eml[0]['EmailAddress'];
	$serproid			=	$arr_eml[0]['EmailSerProId'];
	
	$secretPath = json_decode($ClientSecret, true);
	define('CLIENT_ID', $secretPath['CLIENT_ID']);
	define('TENANT_ID', $secretPath['TENANT_ID']);
	define('CLIENT_SECRET', $secretPath['CLIENT_SECRET']);
	define('REDIRECT_URI', $appname);
	define('USER_SCOPES', $secretPath['USER_SCOPES']);
	define('MAIL_SCOPES', $secretPath['MAIL_SCOPES']);
	define('AUTHORITY_URL', 'https://login.microsoftonline.com/' . TENANT_ID);
	define('TOKEN_ENDPOINT', AUTHORITY_URL . '/oauth2/v2.0/token');
	define('AUTH_ENDPOINT', AUTHORITY_URL . '/oauth2/v2.0/authorize');
	
	// $dotenv = Dotenv\Dotenv::createImmutable(AUTHFOLDER);
	// $dotenv->load();
	// $dotenv->required(['CLIENT_ID', 'TENANT_ID', 'USER_SCOPES', 'MAIL_SCOPES', 'CLIENT_SECRET', 'REDIRECT_URI']);
	// define('CLIENT_ID', $_ENV['CLIENT_ID']);
	// define('TENANT_ID', $_ENV['TENANT_ID']);
	// define('CLIENT_SECRET', $_ENV['CLIENT_SECRET']);
	// define('REDIRECT_URI', $_ENV['REDIRECT_URI']);
	// define('AUTHORITY_URL', 'https://login.microsoftonline.com/' . TENANT_ID);
	// define('TOKEN_ENDPOINT', AUTHORITY_URL . '/oauth2/v2.0/token');
	// define('AUTH_ENDPOINT', AUTHORITY_URL . '/oauth2/v2.0/authorize');
	// define('USER_SCOPES', $_ENV['USER_SCOPES']);
	// define('MAIL_SCOPES', $_ENV['MAIL_SCOPES']);

	$queryParams = http_build_query([
		'client_id' => CLIENT_ID,
		'response_type' => 'code',
		'redirect_uri' => REDIRECT_URI,
		'response_mode' => 'query',
		'scope' => USER_SCOPES,
	]);

	define('AUTH_URL', AUTH_ENDPOINT . '?' . $queryParams);
	
	// $tokenPath = AUTHFOLDER . '/' . $token_usr . '.json';
	
	// if (file_exists($tokenPath))
	$accessToken = json_decode($AddressToken, true);
	if ( $accessToken )
	{
    	// $accessToken = json_decode(file_get_contents($tokenPath), true);
		
		if (isset($accessToken['expires_at'], $accessToken['refresh_token']) && time() > $accessToken['expires_at'])
    	{
			$tokenResponse = refreshToken($accessToken['refresh_token']);	// print_r($tokenResponse);
			
			if (isset($tokenResponse['access_token']))
            {
				$tokenResponse['created'] = time();
				$tokenResponse['generated'] = date('Y-m-d H:i:s', $tokenResponse['created']);
				$tokenResponse['expires_at'] = $tokenResponse['created'] + $tokenResponse['expires_in'];
				$tokenResponse['validtill'] = date('Y-m-d H:i:s', $tokenResponse['expires_at']);
				$tokenResponse['TOKEN_ENDPOINT'] = TOKEN_ENDPOINT;
				$tokenResponse['AUTH_ENDPOINT'] = AUTH_ENDPOINT;
				$tokenResponse['AUTH_URL'] = AUTH_URL;
				// $tokenResponse['refresh_token'] = $accessToken['refresh_token'];
				
				$logmsg = ["status" => "success", "code" => 1, "message" => "Refreshed successfully.", "token" => $tokenResponse, "email" => $token_usr, "details" => "Refreshed"];
				$sql_tknmst = "INSERT INTO emailaddressmst (EmailAddress, AddressToken, EmailSerProId, AllowConn, AllowSend, AllowSync, IsRecClosed, CreatedBy, UpdatedBy) VALUES ('".$logmsg['email']."', FROM_BASE64('".base64_encode(json_encode($logmsg['token'], JSON_PRETTY_PRINT))."'), '".$serproid."', '1', '1', '1', '0', '".$usr_login."', '".$usr_login."') ON DUPLICATE KEY UPDATE AddressToken = VALUES(AddressToken), UpdatedBy = VALUES(UpdatedBy)";        sc_exec_sql($sql_tknmst);
				
				$sql_conlog = 'INSERT INTO emailloghd (LogType, EmailAddressId, SendStatus, SendMsgs, AppName, CreatedBy) VALUES ("1", (SELECT EmailAddressId FROM emailaddressmst a WHERE a.EmailAddress = "'.$logmsg['email'].'"), "'.$logmsg['code'].'", FROM_BASE64("'.base64_encode(json_encode($logmsg, JSON_PRETTY_PRINT)).'"), "'.$appname.'", "'.$usr_login.'")';	sc_exec_sql($sql_conlog);
				$logmsg = saveTokenToFile($tokenResponse, $tokenPath, $jsonMessage);
			}
			else
			{
				$logmsg = ["status" => "failed", "code" => 0, "message" => "Error in refresh token.", "details" => $tokenResponse];
				// header('Location: ' . AUTH_URL);
				// exit();
			}
		}
		elseif (isset($accessToken['expires_at'], $accessToken['access_token']))
    	{
			$logmsg = OutlookSend($accessToken, $jsonMessage);
    	}
		else
		{
			$logmsg = ["status" => "failed", "code" => 0, "message" => "Error in access token.", "details" => $tokenResponse];
		}
	}
	elseif (isset($_GET['code']))
	{
		$authCode = $_GET['code'];

		$tokenResponse = getToken($authCode);

		if (isset($tokenResponse['access_token']))
		{
			$tokenResponse['created'] = time();
			$tokenResponse['generated'] = date('Y-m-d H:i:s', $tokenResponse['created']);
			$tokenResponse['expires_at'] = $tokenResponse['created'] + $tokenResponse['expires_in'];
			$tokenResponse['validtill'] = date('Y-m-d H:i:s', $tokenResponse['expires_at']);
			$tokenResponse['TOKEN_ENDPOINT'] = TOKEN_ENDPOINT;
			$tokenResponse['AUTH_ENDPOINT'] = AUTH_ENDPOINT;
			$tokenResponse['AUTH_URL'] = AUTH_URL;
			// $tokenResponse['refresh_token'] = $accessToken['refresh_token'];
			$logmsg = profile($tokenResponse, $jsonMessage);
		}
		else
		{
			$logmsg = ["status" => "failed", "code" => 0, "message" => "Error obtaining token.", "details" => $tokenResponse];
		}
	}
	elseif (empty($_GET))
	{
		header('Location: ' . AUTH_URL);
		exit();
	}
	else
	{
		$logmsg = ["status" => "failed", "code" => 0, "message" => "Error in last else part.", "details" => $tokenResponse];
	}
	return $logmsg;
}

function getToken($authCode)
{
	echo __FUNCTION__."<br>";
    $postFields = [
        'client_id' => CLIENT_ID,
        'scope' => USER_SCOPES,
        'code' => $authCode,
        'redirect_uri' => REDIRECT_URI,
        'grant_type' => 'authorization_code',
        'client_secret' => CLIENT_SECRET,
    ];
    return curl(TOKEN_ENDPOINT, $postFields);
}

function refreshToken($refreshToken)
{
	echo __FUNCTION__."<br>";
    $postFields = [
        'client_id' => CLIENT_ID,
        'scope' => USER_SCOPES,
        'refresh_token' => $refreshToken,
        'grant_type' => 'refresh_token',
        'client_secret' => CLIENT_SECRET,
    ];
    return curl(TOKEN_ENDPOINT, $postFields);
}

function curl($url, $postFields)
{
	echo __FUNCTION__."<br>";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postFields));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	// curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
	// curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

function saveTokenToFile($tokenResponse, $tokenPath, $jsonMessage)
{
	echo __FUNCTION__."<br>";
    // if (!file_exists(dirname($tokenPath))) {
    //     mkdir(dirname($tokenPath), 0775, true);
    // }
    // $tokenResponse['expires_at'] = time() + $tokenResponse['expires_in'];
    // $tokenResponse['AUTHORITY_URL'] = AUTHORITY_URL;
    // $tokenResponse['TOKEN_ENDPOINT'] = TOKEN_ENDPOINT;
    // $tokenResponse['AUTH_ENDPOINT'] = AUTH_ENDPOINT;
    // $tokenResponse['AUTH_URL'] = AUTH_URL;
    // file_put_contents($tokenPath, json_encode($tokenResponse));
	return OutlookSend($tokenResponse, $jsonMessage);
}

function draftsend($tokenResponse, $jsonMessage, $url)
{
	echo __FUNCTION__."<br>";
	$curl = curl_init();
	curl_setopt_array($curl, array(
	  CURLOPT_URL => $url,
	  CURLOPT_RETURNTRANSFER => true,
	  CURLOPT_ENCODING => '',
	  CURLOPT_MAXREDIRS => 10,
	  CURLOPT_TIMEOUT => 0,
	  CURLOPT_FOLLOWLOCATION => true,
	  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
	  CURLOPT_CUSTOMREQUEST => 'POST',
	  CURLOPT_POSTFIELDS => $jsonMessage,
	  CURLOPT_HTTPHEADER => array(
		'Content-Type: application/json',
		'Authorization: Bearer ' . $tokenResponse['access_token']
	  ),
		// CURLOPT_SSL_VERIFYPEER => true, 
		// CURLOPT_SSL_VERIFYHOST => 2
		CURLOPT_SSL_VERIFYPEER => false, 
		CURLOPT_SSL_VERIFYHOST => false
	));
	$response = curl_exec($curl);
	curl_close($curl);
	return json_decode($response, true);
}

function OutlookSend($tokenResponse, $jsonMessage)
{
	echo __FUNCTION__."<br>";
	$url = "https://graph.microsoft.com/v1.0/me/messages";
	// $url = "https://graph.microsoft.com/v1.0/me/messages/AQMkADAwATMwMAExLTg3MTQtZDA5OQAtMDACLTAwCgBGAAADkMtSR42JukaUFOMC9tpBfwcA68XQdOPy70qIPbzSz-86BAAAAgEJAAAA68XQdOPy70qIPbzSz-86BAAAAFm36HgAAAA=/createReply";
	// $url = "https://graph.microsoft.com/v1.0/me/messages/AQMkADAwATMwMAExLTg3MTQtZDA5OQAtMDACLTAwCgBGAAADkMtSR42JukaUFOMC9tpBfwcA68XQdOPy70qIPbzSz-86BAAAAgEMAAAA68XQdOPy70qIPbzSz-86BAAAAFq0FCcAAAA=/createReplyAll";
	$msg = draftsend($tokenResponse, $jsonMessage, $url);
	if ( isset($msg['id']) )
	{
		$url = "https://graph.microsoft.com/v1.0/me/messages/".$msg['id']."/send";
		$res = draftsend($tokenResponse, "{}", $url);
		if ( $res == '' )
		{
			$logmsg = ["status" => "success", "code" => 1, "message" => "Sent successfully.", "details" => $msg, "unqid" => $msg['id'], "msgid" => $msg['internetMessageId']];
		}
		else
		{
			$logmsg = ["status" => "failed", "code" => 0, "message" => "Error sending.", "details" => $res];
		}
	}
	else
	{
		$logmsg = ["status" => "failed", "code" => 0, "message" => "Error drafting.", "details" => $msg];
	}
	return $logmsg;
}

function profile($tokenResponse, $jsonMessage)
{
    $curl = curl_init();

    curl_setopt_array($curl, array(
    CURLOPT_URL => 'https://graph.microsoft.com/v1.0/me',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => '',
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 0,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => 'GET',
    CURLOPT_HTTPHEADER => array(
        'Authorization: Bearer ' . $tokenResponse['access_token']
    ),
	// CURLOPT_SSL_VERIFYPEER => true, 
	// CURLOPT_SSL_VERIFYHOST => 2
	CURLOPT_SSL_VERIFYPEER => false, 
	CURLOPT_SSL_VERIFYHOST => false
    ));

    $response = curl_exec($curl);

    curl_close($curl);
    $profileresponse = json_decode($response, true);
    $tokenPath = AUTHFOLDER.'/'.$profileresponse['mail'].'.json';
	return saveTokenToFile($tokenResponse, $tokenPath, $jsonMessage);
}

function google_msgid($tokenResponse, $unqid)
{
	echo __FUNCTION__."<br>";
	// echo $unqid.'<br>'.$tokenResponse['access_token'].'<br>';
	$curl = curl_init();
	curl_setopt_array($curl, array(
	  CURLOPT_URL => 'https://gmail.googleapis.com//gmail/v1/users/me/messages/'.$unqid.'?format=full',
	  CURLOPT_RETURNTRANSFER => true,
	  CURLOPT_ENCODING => '',
	  CURLOPT_MAXREDIRS => 10,
	  CURLOPT_TIMEOUT => 0,
	  CURLOPT_FOLLOWLOCATION => true,
	  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
	  CURLOPT_CUSTOMREQUEST => 'GET',
	  CURLOPT_HTTPHEADER => array(
        'Authorization: Bearer ' . $tokenResponse['access_token']
    ),
		// CURLOPT_SSL_VERIFYPEER => true, 
		// CURLOPT_SSL_VERIFYHOST => 2
		CURLOPT_SSL_VERIFYPEER => false, 
		CURLOPT_SSL_VERIFYHOST => false
	));

	$response = curl_exec($curl);
	curl_close($curl);
	// echo $response;
	// Decode JSON into PHP array
	$data = json_decode($response, true);
	// Initialize Message-Id as empty
	// $messageId = NULL;
	// // Loop through headers to find Message-Id
	// if (isset($data['payload']['headers'])) {
	// 	foreach ($data['payload']['headers'] as $header) {
	// 		if ($header['name'] === 'Message-Id') {
	// 			$messageId = $header['value'];
	// 			break; // Stop looping once found
	// 		}
	// 	}
	// }
	return $data;
}

function googl_curl($pk_id, $arr_check, $mimeMessage, $usr_login, $appname)
{
	// echo __FUNCTION__."<br>";
	$ClientSecret		=	$arr_check[0]['ClientSecret'];
	$AddressToken		=	$arr_check[0]['AddressToken'];
	$token_usr			=	$arr_check[0]['EmailAddress'];
	$serproid			=	$arr_check[0]['EmailSerProId'];
	
	$secretPath = json_decode($ClientSecret, true);
	define('CLIENT_ID', $secretPath['web']['client_id']);
	define('CLIENT_SECRET', $secretPath['web']['client_secret']);
	// if (in_array($appname, $secretPath['web']['redirect_uris']))
	// {
	// 	define('REDIRECT_URI', $appname);
	// }
	// else
	// {
	// 	return $logmsg = ["status" => "error", "code" => 0, "message" => "Invalid redirect uri.", "uri" => $appname];
	// }
	define('REDIRECT_URI', $appname);
	define('TOKEN_ENDPOINT', $secretPath['web']['token_uri']);
	// define('AUTH_ENDPOINT', 'https://accounts.google.com/o/oauth2/v2/auth');
	define('AUTH_ENDPOINT', $secretPath['web']['auth_uri']);
	
	$queryParams = http_build_query([
	    'client_id' => CLIENT_ID,
	    'response_type' => 'code',
	    'redirect_uri' => REDIRECT_URI,
		'access_type' => 'offline',
		'state' => '',
		'scope' => 'https://mail.google.com/ openid profile email',
		'prompt' => 'select_account consent'
	]);

	define('AUTH_URL', AUTH_ENDPOINT . '?' . $queryParams);
	$accessToken = json_decode($AddressToken, true);
	
	if ( $accessToken )
	{
		if (isset($accessToken['expires_at'], $accessToken['refresh_token']) && time() > $accessToken['expires_at'])
    	{
			$tokenResponse = refreshToken1($accessToken['refresh_token']);
			if (isset($tokenResponse['access_token']))
            {
				$tokenResponse['created'] = time();
				$tokenResponse['generated'] = date('Y-m-d H:i:s', $tokenResponse['created']);
				$tokenResponse['expires_at'] = $tokenResponse['created'] + $tokenResponse['expires_in'];
				$tokenResponse['validtill'] = date('Y-m-d H:i:s', $tokenResponse['expires_at']);
				$tokenResponse['TOKEN_ENDPOINT'] = TOKEN_ENDPOINT;
				$tokenResponse['AUTH_ENDPOINT'] = AUTH_ENDPOINT;
				$tokenResponse['AUTH_URL'] = AUTH_URL;
				$tokenResponse['refresh_token'] = $accessToken['refresh_token'];
				// $profileresponse = profile1($tokenResponse);
				// $token_usr = $profileresponse['emailAddress'];
				
				$logmsg = ["status" => "success", "code" => 1, "message" => "Refreshed successfully.", "token" => $tokenResponse, "email" => $token_usr, "details" => "Refreshed"];
				
				$sql_tknmst = "INSERT INTO emailaddressmst (EmailAddress, AddressToken, EmailSerProId, AllowConn, AllowSend, AllowSync, IsRecClosed, CreatedBy, UpdatedBy) VALUES ('".$logmsg['email']."', FROM_BASE64('".base64_encode(json_encode($logmsg['token'], JSON_PRETTY_PRINT))."'), '".$serproid."', '1', '1', '1', '0', '".$usr_login."', '".$usr_login."') ON DUPLICATE KEY UPDATE AddressToken = VALUES(AddressToken), UpdatedBy = VALUES(UpdatedBy)";        sc_exec_sql($sql_tknmst);
				
				$sql_conlog = 'INSERT INTO emailloghd (LogType, EmailAddressId, SendStatus, SendMsgs, AppName, CreatedBy) VALUES ("1", (SELECT EmailAddressId FROM emailaddressmst a WHERE a.EmailAddress = "'.$logmsg['email'].'"), "'.$logmsg['code'].'", FROM_BASE64("'.base64_encode(json_encode($logmsg, JSON_PRETTY_PRINT)).'"), "'.$appname.'", "'.$usr_login.'")';	sc_exec_sql($sql_conlog);
				
				$logmsg = GmailSend($tokenResponse, $mimeMessage);
				$data = google_msgid($tokenResponse, $logmsg['unqid']);
	
				if (isset($data['payload']['headers'])) 
				{
					foreach ($data['payload']['headers'] as $header) 
					{
						if ($header['name'] === 'Message-Id') 
						{
							$logmsg['msgid'] = $header['value'];
							break; // Stop looping once found
						}
						else
						{
							$logmsg['msgid'] = NULL;
							$logmsg['msgdata'] = $data;
						}
					}
				}
			}
			else
			{
				$logmsg = ["status" => "failed", "code" => 0, "message" => "Error obtaining refresh token.", "details" => $tokenResponse];
				// header('Location: ' . AUTH_URL);
				// exit();
			}
		}
		elseif (isset($accessToken['expires_at'], $accessToken['access_token']))
		{
			$logmsg = GmailSend($accessToken, $mimeMessage);
			$data = google_msgid($accessToken, $logmsg['unqid']);
	
			if (isset($data['payload']['headers'])) 
			{
				foreach ($data['payload']['headers'] as $header) 
				{
					if ($header['name'] === 'Message-Id') 
					{
						$logmsg['msgid'] = $header['value'];
						break; // Stop looping once found
					}
					else
					{
						$logmsg['msgid'] = NULL;
						$logmsg['msgdata'] = $data;
					}
				}
			}
		}
		else
		{
			$logmsg = ["status" => "failed", "code" => 0, "message" => "Error in access token.", "details" => $tokenResponse];
			// header('Location: ' . AUTH_URL);
			// exit();
		}
	}
	elseif (isset($_GET['code']))
	{
		$authCode = $_GET['code'];

		$tokenResponse = getToken1($authCode);

		if (isset($tokenResponse['access_token']))
		{
			$tokenResponse['generated'] = date('Y-m-d H:i:s', $tokenResponse['created']);
			$tokenResponse['expires_at'] = $tokenResponse['created'] + $tokenResponse['expires_in'];
			$tokenResponse['validtill'] = date('Y-m-d H:i:s', $tokenResponse['expires_at']);
			$tokenResponse['TOKEN_ENDPOINT'] = TOKEN_ENDPOINT;
			$tokenResponse['AUTH_ENDPOINT'] = AUTH_ENDPOINT;
			$tokenResponse['AUTH_URL'] = AUTH_URL;
			// $profileresponse = profile1($tokenResponse);
			// $token_usr = $profileresponse['emailAddress'];
			$profileresponse = profile1($tokenResponse);
			$token_usr = $profileresponse['emailAddress'];
			
			$logmsg = ["status" => "success", "code" => 1, "message" => "Connected successfully.", "details" => "Connected", "token" => $tokenResponse, "email" => $token_usr, "profile" => $profileresponse];
			
			$sql_tknmst = "INSERT INTO emailaddressmst (EmailAddress, AddressToken, EmailSerProId, AllowConn, AllowSend, AllowSync, IsRecClosed, CreatedBy, UpdatedBy) VALUES ('".$logmsg['email']."', FROM_BASE64('".base64_encode(json_encode($logmsg['token'], JSON_PRETTY_PRINT))."'), '".$serproid."', '1', '1', '1', '0', '".$usr_login."', '".$usr_login."') ON DUPLICATE KEY UPDATE AddressToken = VALUES(AddressToken), UpdatedBy = VALUES(UpdatedBy)";        sc_exec_sql($sql_tknmst);
				
			$sql_conlog = 'INSERT INTO emailloghd (LogType, EmailAddressId, SendStatus, SendMsgs, AppName, CreatedBy) VALUES ("1", (SELECT EmailAddressId FROM emailaddressmst a WHERE a.EmailAddress = "'.$logmsg['email'].'"), "'.$logmsg['code'].'", FROM_BASE64("'.base64_encode(json_encode($logmsg, JSON_PRETTY_PRINT)).'"), "'.$appname.'", "'.$usr_login.'")';	sc_exec_sql($sql_conlog);
			
			$logmsg = GmailSend($tokenResponse, $mimeMessage);
		}
		else
		{
			$logmsg = ["status" => "failed", "code" => 0, "message" => "Error obtaining token.", "details" => $tokenResponse];
		}
	}
	elseif (empty($_GET))
	{
		$logmsg = ["status" => "failed", "code" => 0, "message" => "Error authenticating/redirecting.", "details" => $tokenResponse];
		// header('Location: ' . AUTH_URL);
		// exit();
	}
	else
	{
		$logmsg = ["status" => "failed", "code" => 0, "message" => "Error in last else part.", "details" => $tokenResponse];
	}
	return $logmsg;
}

function getToken1($authCode)
{
	// echo __FUNCTION__."<br>";
    $postFields = [
		'code' => $authCode,
		'client_id' => CLIENT_ID,
		'client_secret' => CLIENT_SECRET,
		'redirect_uri' => REDIRECT_URI,
		'grant_type' => 'authorization_code'
	];
    return curl1(TOKEN_ENDPOINT, $postFields);
}

function refreshToken1($refreshToken)
{
	// echo __FUNCTION__."<br>";
    $postFields = [
        'client_id' => CLIENT_ID,
        'client_secret' => CLIENT_SECRET,
        'refresh_token' => $refreshToken,
        'grant_type' => 'refresh_token',
    ];
    return curl1(TOKEN_ENDPOINT, $postFields);
}

function curl1($url, $postFields)
{
	// echo __FUNCTION__."<br>";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postFields));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	// curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
	// curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

function saveTokenToFile1($tokenResponse, $tokenPath, $jsonMessage)
{
	echo __FUNCTION__."<br>";
    // if (!file_exists(dirname($tokenPath))) {
    //     mkdir(dirname($tokenPath), 0775, true);
    // }
    // $tokenResponse['expires_at'] = time() + $tokenResponse['expires_in'];
    // $tokenResponse['AUTHORITY_URL'] = AUTHORITY_URL;
    // $tokenResponse['TOKEN_ENDPOINT'] = TOKEN_ENDPOINT;
    // $tokenResponse['AUTH_ENDPOINT'] = AUTH_ENDPOINT;
    // $tokenResponse['AUTH_URL'] = AUTH_URL;
    // file_put_contents($tokenPath, json_encode($tokenResponse));
	return OutlookSend($tokenResponse, $jsonMessage);
}

function profile1($tokenResponse)
{
	// echo __FUNCTION__."<br>";
	$curl = curl_init();
	curl_setopt_array($curl, array(
	CURLOPT_URL => 'https://gmail.googleapis.com//gmail/v1/users/me/profile',
	CURLOPT_RETURNTRANSFER => true,
	CURLOPT_ENCODING => '',
	CURLOPT_MAXREDIRS => 10,
	// CURLOPT_SSL_VERIFYPEER => true, 
	// CURLOPT_SSL_VERIFYHOST => 2,
	CURLOPT_SSL_VERIFYPEER => false, 
    CURLOPT_SSL_VERIFYHOST => false,
	CURLOPT_TIMEOUT => 0,
	CURLOPT_FOLLOWLOCATION => true,
	CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
	CURLOPT_CUSTOMREQUEST => 'GET',
	CURLOPT_HTTPHEADER => array(
        'Authorization: Bearer ' . $tokenResponse['access_token']
    ),
	));

	$response = curl_exec($curl);

	curl_close($curl);
	// echo $response;
    $profileresponse = json_decode($response, true);
    // $tokenPath = AUTHFOLDER.'/'.$profileresponse['mail'].'.json';
    // saveTokenToFile($tokenResponse, $tokenPath);
	return $profileresponse;
}

function draftsend1($tokenResponse, $mimeMessage)	
{
	// echo __FUNCTION__."<br>";
	$curl = curl_init();
	curl_setopt_array($curl, array(
	  CURLOPT_URL => 'https://gmail.googleapis.com//gmail/v1/users/me/messages/send',
	  CURLOPT_RETURNTRANSFER => true,
	  CURLOPT_ENCODING => '',
	  CURLOPT_MAXREDIRS => 10,
	  CURLOPT_TIMEOUT => 0,
	  CURLOPT_FOLLOWLOCATION => true,
	  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
	  CURLOPT_CUSTOMREQUEST => 'POST',
	  CURLOPT_POSTFIELDS =>'{
		"raw" : "'.base64url_encode($mimeMessage).'"
	}',
	  CURLOPT_HTTPHEADER => array(
		  	'Content-Type: message/cpim',
			'Authorization: Bearer ' . $tokenResponse['access_token']
		),
		// CURLOPT_SSL_VERIFYPEER => true, 
		// CURLOPT_SSL_VERIFYHOST => 2
		CURLOPT_SSL_VERIFYPEER => false, 
		CURLOPT_SSL_VERIFYHOST => false
	));

	$response = curl_exec($curl);
	curl_close($curl);
	// echo $response;
	return json_decode($response, true);
}

function GmailSend($tokenResponse, $mimeMessage)
{
	// echo __FUNCTION__."<br>";
	$res = draftsend1($tokenResponse, $mimeMessage);
	
	if ( isset($res['id']) )
	{
		$logmsg = ["status" => "success", "code" => 1, "message" => "Sent successfully.", "details" => $res, "unqid" => $res['id']];
	}
	else
	{
		$logmsg = ["status" => "failed", "code" => 0, "message" => "Error sending.", "details" => $res, "AddressToken" => $tokenResponse];
	}
	return $logmsg;
}

function base64url_encode($data)
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}























	
?>