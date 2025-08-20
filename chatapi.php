<?php
ob_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

error_reporting(E_ERROR | E_PARSE); // Only show fatal errors
ini_set('display_errors', 0);
function logerror($logmsg, $cstmsg)
{
	$errmsg = "[ ".date('Y-m-d H:i:s')." ] [ ".$cstmsg." ]";
	
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
	$logFile = __DIR__ . '/chatlog.log';
	if (file_exists($logFile))
	{
		$perms = fileperms($logFile) & 0777;
		if ($perms !== 0777)
		{
			chmod($logFile, 0777);
		}
	}
	else
	{
		file_put_contents($logFile, '');
		chmod($logFile, 0777);
	}
	file_put_contents($logFile, $errmsg, FILE_APPEND);
	// error_log($errmsg, 3, LOGFILE);
}

try {

    require_once 'Database.php';

    // header('Content-Type: application/json');

    $payload = '';
    $chunkData = '';
    $chunkDown = '';
    define('PATH_NAME', 'files/');
    // $header = null;

    if (php_sapi_name() == "cli")
    {
        // $options = getopt("", ["param:"]);
        // $payload = $options["param"] ?? '';
        // if (empty($payload)) {
        //     $logmsg = ["status" => "failed", "code" => 0, "message" => "No data in STDIN.", "details" => "Please provide valid JSON via CLI."];
        // }
        // $payload = file_get_contents('php://stdin');
        $stdin = fopen('php://stdin', 'r');
        if ($stdin) {
            $firstBytes = fread($stdin, 4);
            if (strlen($firstBytes) === 4) {
                $unpacked = unpack('V', $firstBytes);
                $headerLength = $unpacked[1];
    
                if ($headerLength > 0 && $headerLength < 15 * 1024 * 1024) { // Safety limit: max 15MB header
                    $payload = fread($stdin, $headerLength);
                    // $header = json_decode($payload, true);
                    // $headerJson = fread($stdin, $headerLength);
                    // $header = json_decode($headerJson, true);
    
                    // if (json_last_error() === JSON_ERROR_NONE) {
                        if ($payload != '') {
                        // $logmsg = ["status" => "ok", "mode" => "chunk_with_header", "header" => $header, "chunk_size" => strlen($chunkData)];
                        $chunkData = stream_get_contents($stdin);
                    } else {
                        // Fallback: treat everything as JSON string instead
                        $payload = $firstBytes . $headerJson . stream_get_contents($stdin);
                    }
                } else {
                    // Fallback: treat everything as JSON string instead
                    $payload = $firstBytes . stream_get_contents($stdin);
                }
            } else {
                // Fallback: treat everything as JSON string instead
                $payload = $firstBytes . stream_get_contents($stdin);
            }
        }
        else {
            $options = getopt("", ["param:"]);
            $payload = $options["param"] ?? '';
        }
    
        fclose($stdin);
        
        if (empty($payload)) {
            $logmsg = ["status" => "failed", "code" => 0, "message" => "No data in STDIN.", "details" => "Please provide valid JSON via STDIN."];
        }
    }
    elseif ($_SERVER['REQUEST_METHOD'] == 'POST')
    {
        $payload = $_POST['json'] ?? file_get_contents("php://input");
        // $payload = $_POST['json'];
        // $logmsg = ["status" => "failed", "code" => 0, "message" => "1No data from CLI/STDIN.", "data" => $payload];
    } elseif ($_SERVER['REQUEST_METHOD'] == 'GET') {
        $payload = '{ "fileId": "' . $_GET['fileId'] . '", "username": "' . $_GET['username'] . '", "sessionid": "' . $_GET['sessionid'] .'", "action": "' . $_GET['action'] .'" }';
        $logmsg = ["status" => "failed", "code" => 0, "message" => "2No data from CLI/STDIN.", "data" => $payload];
    }
    else {
        $logmsg = ["status" => "failed", "code" => 0, "message" => "3No data from CLI/STDIN.", "data" => $payload];
    }
    // if ($header !== null) {
    //     $logmsg = ["status" => "ok", "mode" => "chunk_with_header", "header" => $header, "chunk_size" => strlen($chunkData)];
    // } else
    if (!empty($payload)) {

        $data = json_decode($payload, true);

        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {

            $logmsg = ["status" => "failed", "code" => 0, "message" => "Invalid JSON.", "details" => "Provide valid JSON data."];
            
        } else {

            $action = $data['action'] ?? '';
            $db = new Database();   $logmsg = [];
            $conn = $db->getConnection();
            // $conn->beginTransaction();
            
            switch ($action) {
    // 1        
                case 'login':
                    $logmsg['login'] = login($data, $db);
                    $logmsg['get_user_profile'] = get_user_profile($data, $db);
                    $logmsg['get_chats'] = get_chats($data, $db);
                    $logmsg['get_active_sessions'] = get_active_sessions($data, $db);
                    $logmsg['get_online_users'] = get_online_users($data, $db);
                    $logmsg['get_deliver_messages'] = get_deliver_messages($data, $db);
                    $logmsg['get_deliver_sessions'] = get_deliver_sessions($data, $db);
                    $logmsg['get_my_sessions'] = get_my_sessions($data, $db);
                    break;
    // 2
                case 'get_chats':
                    $logmsg['get_chats'] = get_chats($data, $db);
                    break;
    // 3
                case 'get_users':
                    $logmsg['get_users'] = get_users($data, $db);
                    break;
    // 4
                case 'create_group':
                    $logmsg['create_group'] = create_group($data, $db);
                    $data['roomid'] = $logmsg['create_group']['create_group'][0]['RoomId'];
                    $logmsg['get_receiver_sessions'] = get_receiver_sessions($data, $db);
                    break;
    // 5
                case 'send_message':
                    $logmsg['send_message'] = send_message($data, $db);
                    $logmsg['get_receiver_sessions'] = get_receiver_sessions($data, $db);
                    break;
    // 6
                case 'get_messages':
                    $logmsg['get_messages'] = get_messages($data, $db);
                    $logmsg['get_message_files'] = get_message_files($data, $db);
                    $logmsg['get_receiver_profile'] = get_receiver_profile($data, $db);
                    $logmsg['get_sender_messages'] = get_sender_messages($data, $db);
                    $logmsg['get_sender_sessions'] = get_sender_sessions($data, $db);
                    break;
    // 7
                case 'get_groups':
                    $logmsg['get_groups'] = get_groups($data, $db);
                    break;
    // 8
                case 'get_group_users':
                    $logmsg['get_group_users'] = get_group_users($data, $db);
                    break;
    // 9
                case 'get_online_users':
                    $logmsg['get_online_users'] = get_online_users($data, $db);
                    break;
    // 10
                case 'get_my_sessions':
                    $logmsg['get_my_sessions'] = get_my_sessions($data, $db);
                    break;
    // 11
                case 'get_active_sessions':
                    $logmsg['get_active_sessions'] = get_active_sessions($data, $db);
                    break;
    // 12
                case 'get_common_groups':
                    $logmsg['get_common_groups'] = get_common_groups($data, $db);
                    break;
    // 13
                case 'get_user_profile':
                    $logmsg['get_user_profile'] = get_user_profile($data, $db);
                    break;
    // 14
                case 'get_receiver_profile':
                    $logmsg['get_receiver_profile'] = get_receiver_profile($data, $db);
                    break;
    // 15
                case 'chunk_upload':
                    $logmsg['chunk_upload'] = chunk_upload($data, $db, $chunkData);
                    break;
    // 16
                case 'disconn':
                    $logmsg['disconn'] = disconn($data, $db);
                    $logmsg['get_active_sessions'] = get_active_sessions($data, $db);
                    $logmsg['get_online_users'] = get_online_users($data, $db);
                    $logmsg['get_my_sessions'] = get_my_sessions($data, $db);
                    break;
    // 17
                case 'chunk_download':
                    list($logmsg['chunk_download'], $chunkDown) = chunk_download($data, $db);
                    break;
    // 18
                case 'get_max_chunkindex':
                    $logmsg['get_max_chunkindex'] = get_max_chunkindex($data, $db);
                    break;
    // 19
                case 'reset_status':
                    $logmsg['reset_status'] = reset_status($data, $db);
                    break;
    // 20
                case 'chunk_assemble':
                    $logmsg['chunk_assemble'] = chunk_assemble($data, $db);
                    break;
    // 21
                case 'file_download':
                    $logmsg['file_download'] = file_download($data, $db);
                    break;
    // 22
                case 'get_message_files':
                    $logmsg['get_message_files'] = get_message_files($data, $db);
                    break;
    // 23
                case 'chunk_append':
                    $logmsg['chunk_append'] = chunk_append($data, $db);
                    break;
    // 24
                case 'sender_sessions':
                    $logmsg['get_sender_sessions'] = get_sender_sessions($data, $db);
                    break;
    // 25
                case 'sender_messages':
                    $logmsg['get_sender_messages'] = get_sender_messages($data, $db);
                    break;
    // 26
                case 'terminate_session':
                    $logmsg['terminate_session'] = terminate_session($data, $db);
                    break;

                default:
                    $logmsg = ["status" => "failed", "code" => 0, 'message' => 'Invalid action', 'data' => $data];
                    break;
            }
            // $conn->commit();
            // $db->closeConnection();
        }
    }
} catch (PDOException $e) {
    // $conn->rollBack();
    // $db->closeConnection();
    $logmsg = ['status' => 'error', 'code' => 0, 'message' => 'Error executing query.', 'document' => ['message' => $e->getMessage(), 'code' => $e->getCode(), 'file' => $e->getFile(), 'line' => $e->getLine(), 'final_query' => $query]];
    logerror($logmsg, 'Main pdo error');
} catch (Exception $e) {
    // $conn->rollBack();
    // $db->closeConnection();
    $logmsg = ['status' => 'error', 'code' => 0, 'message' => 'Error executing script.', 'document' => ['message' => $e->getMessage(), 'code' => $e->getCode(), 'file' => $e->getFile(), 'line' => $e->getLine()]];
    logerror($logmsg, 'Main try error');
}

if ($chunkDown != '') {
    $header = json_encode($logmsg);
    $headerLength = pack('V', strlen($header));
    echo $headerLength . $header . $chunkDown;
} else {
    echo json_encode($logmsg);
}

function terminate_session($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $connId = $data['connId'] ?? [];

    if (empty($connId)) {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Connection Id is required', 'data' => $data];
    }

    $placeholders = [];
    $params = [':sessnId' => $sessionid];

    foreach ($connId as $index => $id) {
        $key = ":connId$index";
        $placeholders[] = $key;
        $params[$key] = $id;
    }

    $places = implode(', ', $placeholders);

    $response = $db->execQuery("UPDATE user_conns cn JOIN (SELECT uc.ConnId AS newTonnId FROM user_conns uc WHERE uc.SessnId = :sessnId) AS sub ON 1 = 1 SET cn.TonnId = sub.newTonnId WHERE cn.ConnId IN (" . $places . ") AND cn.`status` = '1'; SELECT ns.ConnId, ns.`User`, ns.SessnId, ns.DeviceIP, DATE_FORMAT(ns.Conn_At, '%d-%m-%Y %H:%i:%s') AS Conn_At, (CASE WHEN (ns.`status` = '1') THEN ('Online') ELSE 'Offline' END) AS `Status` FROM user_conns ns WHERE ns.ConnId IN (" . $places . ") ORDER BY ns.ConnId;", $params);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Terminated successfully.', 'terminate_session' => $response['result'][0] ?? []];
}

function file_download($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $fileId = $data['fileId'] ?? '';

    if ($fileId == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'File Id is required'];
    }

    $response = $db->execQuery("SELECT uf.FileName FROM user_files uf INNER JOIN user_mssgs ug ON ug.MsgId = uf.MsgId INNER JOIN user_mmbrs ub ON ub.RoomId = ug.RoomId INNER JOIN sec_users sc ON sc.login = ub.`User` INNER JOIN user_conns cn ON cn.`User` = ub.`User` WHERE uf.FileId = :fileid AND ub.`User` = :user AND sc.`status` = :status AND cn.`status` = :status AND cn.SessnId = :sessnid;", ['sessnid' => $sessionid, 'status' => '1', 'fileid' => $fileId, 'user' => $username]);

    if (!isset($response['result'][0][0]['FileName'])) {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'No file from Query.', "data" => $data, 'response' => $response];
    } 
    
    $fileName = $response['result'][0][0]['FileName'];

    $finalName = $fileId . '_' . $fileName . '.part';

    $filePath = PATH_NAME . $finalName;

    if (file_exists($filePath)) {
        // Ensure script doesn't time out or abort
        set_time_limit(0);
        ignore_user_abort(true);

        // Check if file exists and is readable
        if (!is_file($filePath) || !is_readable($filePath)) {
            http_response_code(404);
            return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'File is not readable.', "data" => $response];
            exit;
        }

        // Disable compression (important for binary files)
        if (ini_get('zlib.output_compression')) {
            ini_set('zlib.output_compression', 'Off');
        }

        // Turn off all output buffering
        while (ob_get_level()) {
            ob_end_clean();
        }

        // Set appropriate headers
        header('Content-Description: File Transfer');
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $fileName . '"');
        header('Content-Transfer-Encoding: binary');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . filesize($filePath));
        flush(); // Push headers to client

        // Open and stream file in chunks
        $chunkSize = 1024 * 1024; // 1MB
        $handle = fopen($filePath, 'rb');
        if ($handle === false) {
            http_response_code(500);
            return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Could not open file.', "data" => $response];
            exit;
        }

        while (!feof($handle)) {
            echo fread($handle, $chunkSize);
            flush();
            if (connection_status() !== CONNECTION_NORMAL) {
                break;
            }
        }
        fclose($handle);
        exit;
    } else {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'File not found.', "data" => $response];
    }
}

function chunk_append($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $fileId = $data['fileId'] ?? '';

    if ($fileId == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'File Id is required'];
    }

    $chunkIndex = $data['chunkIndex'] ?? '';

    if ($chunkIndex == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Chunk Index is required'];
    }

    $totalChunks = $data['totalChunks'] ?? '';

    if ($totalChunks == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Total chunks is required'];
    }

    $fileName = $data['fileName'] ?? '';

    if ($fileName == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'File name is required'];
    }

    $fileBytes = $data['fileBytes'] ?? '';

    if ($fileBytes == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'File size in bytes is required'];
    }

    if ( $chunkIndex < $totalChunks ) {
        $finalName = $fileId . '_' . $fileName . '.part';

        $filePath = PATH_NAME . $finalName;

        $chunkSize = 15 * 1024 * 1024; // 15MB

        $currentFileSize = filesize($filePath);

        $expectedChunkIndex = floor($currentFileSize / $chunkSize);

        if ($chunkIndex != $expectedChunkIndex) {
            return ["status" => "success", "code" => 1, 'message' => "Chunk already appended. Expected: $expectedChunkIndex, Got: $chunkIndex", 'chunkIndex' => $chunkIndex, 'fileId' => $fileId, 'totalChunks' => $totalChunks, 'fileName' => $fileName, 'fileBytes' => $fileBytes];
        }

        $response = $db->selectChunk("SELECT ChunkData FROM user_chunks WHERE FileId = :fileid AND ChunkIndx = :ChunkIndx;", ['fileid' => $fileId, 'ChunkIndx' => $chunkIndex]);

        if (!file_exists($filePath)) {
            file_put_contents($filePath, $response['chunk_data']);

            return ["status" => "success", "code" => 1, 'message' => 'File created/Chunk appended', 'chunkIndex' => $chunkIndex, 'fileId' => $fileId, 'totalChunks' => $totalChunks, 'fileName' => $fileName, 'fileBytes' => $fileBytes];
        }
        
        file_put_contents($filePath, $response['chunk_data'], FILE_APPEND);

        return ["status" => "success", "code" => 1, 'message' => 'Chunk appended', 'chunkIndex' => $chunkIndex, 'fileId' => $fileId, 'totalChunks' => $totalChunks, 'fileName' => $fileName, 'fileBytes' => $fileBytes];

    }
    return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'chunkIndex is greater/equal than totalChunks'];
}

function chunk_assemble($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $fileId = $data['fileId'] ?? '';

    if ($fileId == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'File Id is required'];
    }

    $chunkIndex = $data['chunkIndex'] ?? '';

    if ($chunkIndex == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Chunk Index is required'];
    }

    $totalChunks = $data['totalChunks'] ?? '';

    if ($totalChunks == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Total chunks is required'];
    }

    $fileName = $data['fileName'] ?? '';

    if ($fileName == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'File name is required'];
    }

    if ( $chunkIndex < $totalChunks ) {
        $chunkName = $fileId . '_' . $fileName . '_' . $chunkIndex . '.part';

        $chunkPath = PATH_NAME . $chunkName;

        if (!file_exists($chunkPath)) {
            $response = $db->selectChunk("SELECT ChunkData FROM user_chunks WHERE FileId = :fileid AND ChunkIndx = :ChunkIndx;", ['fileid' => $fileId, 'ChunkIndx' => $chunkIndex]);
            file_put_contents($chunkPath, $response['chunk_data']);

            return ["status" => "success", "code" => 1, 'message' => 'Chunk saved successfully', 'chunkIndex' => $chunkIndex, 'fileId' => $fileId, 'totalChunks' => $totalChunks, 'chunkName' => $chunkName, 'fileName' => $fileName];
        }
        return ["status" => "success", "code" => 1, 'message' => 'Chunk already saved', 'chunkIndex' => $chunkIndex, 'fileId' => $fileId, 'totalChunks' => $totalChunks, 'chunkName' => $chunkName, 'fileName' => $fileName];
    }
    elseif ( $chunkIndex == $totalChunks ) {
        $finalName = $fileId . '_' . $fileName . '.part';

        $filePath = PATH_NAME . $finalName;

        $fileHandle = fopen($filePath, 'wb');

        $bufferSize = 1024 * 1024;  // 1MB

        for ($i = 0; $i < $totalChunks; $i++) {
            $chunkName = $fileId . '_' . $fileName . '_' . $i . '.part';
            $chunkPath = PATH_NAME . $chunkName;
            if (!file_exists($chunkPath)) {
                fclose($fileHandle);
                return ["status" => "failed", "code" => 0, 'message' => $chunkName.' not saved.', 'chunkIndex' => $chunkIndex, 'fileId' => $fileId, 'totalChunks' => $totalChunks];
            }
            // $chunkHandle = fopen($chunkPath, 'rb');
            // while (!feof($chunkHandle)) {
            //     $buffer = fread($chunkHandle, $bufferSize);
            //     fwrite($fileHandle, $buffer);
            // }
            // fclose($chunkHandle);

            // Read and append
            $chunkData = file_get_contents($chunkPath);
            file_put_contents($filePath, $chunkData, FILE_APPEND);

            unlink($chunkPath);
        }
        fclose($fileHandle);

        return ["status" => "success", "code" => 1, 'message' => 'File saved successfully', 'chunkIndex' => $chunkIndex, 'fileId' => $fileId, 'totalChunks' => $totalChunks, 'finalName' => $finalName, 'fileName' => $fileName];
    }
    return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'chunkIndex is greater/equal than totalChunks'];
}

function reset_status($data, $db) {
    // $files = glob(PATH_NAME . '*'); // Get all files in the folder

    // foreach ($files as $file) {
    //     if (is_file($file)) {
    //         unlink($file); // Delete the file
    //     }
    // }

    $response = $db->execQuery("
    UPDATE user_conns SET Discn_At = NOW(), status = '0' WHERE Discn_At IS NULL;UPDATE sec_users us JOIN ( SELECT cn.User, MAX(CASE WHEN cn.status = 1 THEN cn.ConnId ELSE NULL END) AS LatestActiveConnId, SUM(cn.status) AS ActiveCount FROM user_conns cn WHERE cn.User IN (SELECT uc.User FROM user_conns uc) GROUP BY cn.User) agg ON us.login = agg.User SET us.status = IF(agg.ActiveCount = 0, 0, 1);
    UPDATE sec_users sc SET sc.`status` = NULL, sc.ConnId = NULL;
    TRUNCATE user_conns;
    TRUNCATE user_mmbrs;
    TRUNCATE user_mssgs;
    TRUNCATE user_reads;
    TRUNCATE user_room;
    TRUNCATE user_chunks;
    TRUNCATE user_files;
    ");

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Reset status successfull'];
}

function get_message_files($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $roomid = $data['roomid'] ?? '';

    if ($roomid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Room Id is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $response = $db->execQuery("SELECT um.MsgId, uf.FileId, uf.FileName, (CASE
    WHEN FileSize >= 1024 * 1024 * 1024 THEN CONCAT(ROUND(FileSize / (1024 * 1024 * 1024), 2), ' GB')
    WHEN FileSize >= 1024 * 1024 THEN CONCAT(ROUND(FileSize / (1024 * 1024), 2), ' MB')
    WHEN FileSize >= 1024 THEN CONCAT(ROUND(FileSize / 1024, 2), ' KB')
    ELSE CONCAT(FileSize, ' Bytes')
    END) AS `FileSize`, um.RoomId, uf.FileSize AS fileBytes
	--  , SUM(uk.ChunkSize), MAX(uk.ChunkIndx), COUNT(uk.ChunkId) 
	 FROM user_mssgs um INNER JOIN user_files uf ON uf.MsgId = um.MsgId 
    -- INNER JOIN user_chunks uk ON uk.FileId = uf.FileId
    WHERE um.RoomId = :roomid GROUP BY uf.FileId ORDER BY uf.FileId;", ['roomid' => $roomid]);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Message files successfull', 'message_files' => $response['result'][0] ?? []];
}

function get_max_chunkindex($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $fileId = $data['fileId'] ?? '';

    if ($fileId == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'File Id is required'];
    }

    $response = $db->execQuery("SELECT uf.FileName, MAX(uk.ChunkIndx) AS maxchunk, uf.FileId, (CASE
    WHEN FileSize >= 1024 * 1024 * 1024 THEN CONCAT(ROUND(FileSize / (1024 * 1024 * 1024), 2), ' GB')
    WHEN FileSize >= 1024 * 1024 THEN CONCAT(ROUND(FileSize / (1024 * 1024), 2), ' MB')
    WHEN FileSize >= 1024 THEN CONCAT(ROUND(FileSize / 1024, 2), ' KB')
    ELSE CONCAT(FileSize, ' Bytes') END) AS `FileSize`, ug.RoomId, uf.FileSize AS fileBytes
	 , SUM(uk.ChunkSize), COUNT(uk.ChunkId) 
	 FROM user_files uf INNER JOIN user_mssgs ug ON ug.MsgId = uf.MsgId INNER JOIN user_mmbrs ub ON ub.RoomId = ug.RoomId INNER JOIN sec_users sc ON sc.login = ub.`User` INNER JOIN user_conns cn ON cn.`User` = ub.`User` INNER JOIN user_chunks uk ON uk.FileId = uf.FileId WHERE uf.FileId = :fileid AND ub.`User` = :user AND sc.`status` = :status AND cn.`status` = :status AND cn.SessnId = :sessnid GROUP BY uf.FileId;", ['sessnid' => $sessionid, 'status' => '1', 'fileid' => $fileId, 'user' => $username]);

    if (!isset($response['result'][0][0]['FileName'])) {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'No file from Query.', "data" => $data, 'response' => $response];
    }

    $fileName = $response['result'][0][0]['FileName'];

    $fileBytes = $response['result'][0][0]['fileBytes'];

    $finalName = $fileId . '_' . $fileName . '.part';

    $filePath = PATH_NAME . $finalName;

    // if (!is_file($filePath) || !is_readable($filePath)) {
    //     return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'File not found.', "data" => $data, 'response' => $response];
    // }

    if (file_exists($filePath)) {
        if ($fileBytes != filesize($filePath)) {
            return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Max chunkindex successfull', 'max_chunkindex' => $response['result'][0] ?? []];
        }
        $handle = fopen($filePath, 'rb');
        if ($handle === false) {
            fclose($handle);
            return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Could not open file.', "data" => $data, 'response' => $response];
        }
        fclose($handle);
        return $finalmsg = ["status" => "success", "code" => 2, 'message' => 'File already saved', 'max_chunkindex' => $response['result'][0] ?? []];
    }
    
    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Max chunkindex successfull', 'max_chunkindex' => $response['result'][0] ?? []];
}

function chunk_download($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $fileId = $data['fileId'] ?? '';

    if ($fileId == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'File Id is required'];
    }

    $chunkIndex = $data['chunkIndex'] ?? '';

    if ($chunkIndex == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Chunk Index is required'];
    }

    $response = $db->selectChunk("SELECT ChunkData FROM user_chunks WHERE FileId = :fileid AND ChunkIndx = :ChunkIndx;", ['fileid' => $fileId, 'ChunkIndx' => $chunkIndex]);

    return array(["status" => "success", "code" => 1, 'message' => 'Chunk fetched successfully', 'chunkIndex' => $chunkIndex], $response['chunk_data']);
}

function disconn($data, $db) {
    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $response = $db->execQuery("UPDATE user_conns SET Discn_At = NOW(), status = '0' WHERE SessnId = :sessnid AND Discn_At IS NULL;
    UPDATE sec_users us
    JOIN (
        SELECT 
            cn.User, 
            cn.ConnId AS LatestConnId,
            ROW_NUMBER() OVER (
                PARTITION BY cn.User 
                ORDER BY 
                    (cn.Discn_At IS NOT NULL),  -- Active sessions (NULL Discn_At) first
                    cn.Discn_At DESC,           -- Then by latest disconnect time
                    cn.Conn_At DESC             -- Fallback: latest connection time
            ) AS rn,
            SUM(cn.status) OVER (PARTITION BY cn.User) AS ActiveCount
        FROM user_conns cn
        WHERE cn.User = (
            SELECT uc.User
            FROM user_conns uc
            WHERE uc.SessnId = :sessnid
        )
    ) agg 
    ON agg.`User` = us.login SET us.status = IF(agg.ActiveCount = 0, 0, 1), us.ConnId = agg.LatestConnId;", ['sessnid' => $sessionid]);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Disconnected successfull'];
}

function chunk_upload($data, $db, $chunkData) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $fileId = $data['fileId'] ?? '';

    if ($fileId == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'File Id is required'];
    }

    $chunkIndex = $data['chunkIndex'] ?? '';

    if ($chunkIndex == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Chunk Index is required'];
    }

    $totalChunks = $data['totalChunks'] ?? '';

    if ($totalChunks == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Total chunks is required'];
    }

    $fileName = $data['fileName'] ?? '';

    if ($fileName == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'File name is required'];
    }

    $ChunkSize = strlen($chunkData);

    $finalName = $fileId . '_' . $fileName . '.part';
    $filePath = PATH_NAME . $finalName;

    $mode = ($chunkIndex == 0) ? 'wb' : 'ab';
    $fileHandle = fopen($filePath, $mode);
    if (!$fileHandle) {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Unable to open file for writing'];
    }
    fwrite($fileHandle, $chunkData);
    fclose($fileHandle);

    $response = $db->insertChunk("INSERT INTO user_chunks (FileId, ChunkIndx, ChunkData, ChunkSize) VALUES (:fileid, :ChunkIndx, :chunk, :ChunkSize);", ['fileid' => $fileId, 'ChunkIndx' => $chunkIndex, 'chunk' => $chunkData, 'ChunkSize' => $ChunkSize]);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Chunk received successfully', 'ChunkId' => $response['document']['lastInsertId'] ?? [], "chunk_size" => $ChunkSize, 'chunkIndex' => $chunkIndex, 'fileId' => $fileId, 'totalChunks' => $totalChunks];
}

function get_sender_sessions($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $roomid = $data['roomid'] ?? '';

    if ($roomid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Room Id is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $response = $db->execQuery("SELECT ns.ConnId, ns.`User`, ns.SessnId, ns.DeviceIP, DATE_FORMAT(ns.Conn_At, '%d-%m-%Y %H:%i:%s') AS Conn_At, (CASE WHEN (ns.`status` = '1') THEN ('Online') ELSE 'Offline' END) AS `Status` FROM user_conns ns WHERE ns.`status` = 1 AND ns.`User` != :username AND ns.`User` IN (SELECT ms.`User` FROM user_mssgs ms WHERE ms.RoomId = :roomid) ORDER BY ns.ConnId;", ['roomid' => $roomid, 'username' => $username]);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Sender session successfull', 'sender_sessions' => $response['result'][0] ?? []];
}

function get_sender_messages($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $roomid = $data['roomid'] ?? '';

    if ($roomid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Room Id is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $response = $db->execQuery("SELECT ms.MsgId, rd.MsgState, ms.`User`, rd.MsgState, rd.Read_At, rd.ConnId, rd.ConnIndx, ms.RoomId,
    (SELECT COUNT(mb.MbrId) FROM user_mmbrs mb WHERE mb.RoomId = ms.RoomId AND mb.`User` != ms.`User`) AS TotalMembers, 
    COUNT(CASE WHEN rd.MsgState = 3 THEN 1 END) AS SeenCount
    FROM user_mssgs ms 
    JOIN user_reads rd ON rd.MsgId = ms.MsgId 
    JOIN user_room rm ON rm.RoomId = ms.RoomId 
    WHERE ms.RoomId = :roomid AND (CASE WHEN (rm.`Type` = '2') THEN (1=1) ELSE (rd.ConnId IN (SELECT cn.ConnId FROM user_conns cn WHERE cn.SessnId = :sessionid) AND rd.ConnIndx IN (SELECT MAX(rd2.ConnIndx) FROM user_reads rd2 WHERE rd2.ConnId = rd.ConnId)) END)
    GROUP BY ms.MsgId;", ['roomid' => $roomid, 'sessionid' => $sessionid]);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Sender messages successfull', 'sender_messages' => $response['result'][0] ?? []];
}

function get_deliver_messages($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $response = $db->execQuery("SELECT ms.MsgId, rd.MsgState, ms.`User`, rd.MsgState, rd.Read_At, rd.ConnId, rd.ConnIndx, ms.RoomId,
    (SELECT COUNT(mb.MbrId) FROM user_mmbrs mb WHERE mb.RoomId = ms.RoomId AND mb.`User` != ms.`User`) AS TotalMembers, 
    COUNT(CASE WHEN rd.MsgState = 3 THEN 1 END) AS SeenCount
    FROM user_mssgs ms 
    JOIN user_reads rd ON rd.MsgId = ms.MsgId 
    JOIN user_room rm ON rm.RoomId = ms.RoomId 
    WHERE (CASE WHEN (rm.`Type` = '2') THEN (1=1) ELSE (rd.DonnId IN (SELECT cn.ConnId FROM user_conns cn WHERE cn.SessnId = :sessionid)) END)
    GROUP BY ms.MsgId;", ['sessionid' => $sessionid]);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Deliver messages successfull', 'deliver_messages' => $response['result'][0] ?? []];
}

function get_deliver_sessions($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $response = $db->execQuery("SELECT ur.RoomId, ns.ConnId, ns.`User`, ns.SessnId, ns.DeviceIP, DATE_FORMAT(ns.Conn_At, '%d-%m-%Y %H:%i:%s') AS Conn_At, (CASE WHEN (ns.`status` = '1') THEN ('Online') ELSE 'Offline' END) AS `Status` FROM user_conns ns JOIN sec_users su ON su.login = :user JOIN user_room ur ON (CASE WHEN (ur.`Type` = '1') THEN (ur.Room = CONCAT(LEAST(ns.`User`, su.login), '_', GREATEST(ns.`User`, su.login))) WHEN (ur.`Type` = '2') THEN (ur.RoomId IN (SELECT mm.RoomId FROM user_mmbrs mm WHERE mm.`User` IN (ns.`User`, su.login))) END)
    WHERE ns.`status` = 1 AND ns.`User` != su.login GROUP BY ns.SessnId
    ORDER BY ns.ConnId;", ['user' => $username]);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Deliver sessions successfully', 'deliver_sessions' => $response['result'][0] ?? []];
}

function get_receiver_sessions($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $roomid = $data['roomid'] ?? '';

    if ($roomid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Room Id is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $action = $data['action'] ?? '';

    // switch ($action) {
    // // 1        
    //     case 'create_group':
            
    //         break;

    //     default:
            
    //         break;
    // }

    $response = $db->execQuery("-- get_receiver_sessions
    SELECT ms.MsgId, ms.FileName, (CASE WHEN (ur.`Type` = '1') THEN ('Single') WHEN (ur.`Type` = '2') THEN ('Group') END) AS `ChatType`, (CASE WHEN (ur.`Type` = '1') THEN (su.`name`) ELSE ur.Room END) AS `Name`, ur.RoomId, us.SessnId, (CASE WHEN (ur.`Type` = '2') THEN (SELECT CONCAT(COUNT(*), ' Online')
    FROM user_mmbrs mm
    JOIN sec_users su2 ON su2.login = mm.`User`
    WHERE mm.RoomId = ur.RoomId AND su2.`status` = '1') WHEN (su.`status` = '1') THEN ('Online') WHEN (su.`status` != '1') THEN (CONCAT(
        'Last seen ',
        CASE
            WHEN DATE(us.Discn_At) = CURDATE() THEN 'today at '
            WHEN DATE(us.Discn_At) = CURDATE() - INTERVAL 1 DAY THEN 'yesterday at '
            WHEN YEAR(us.Discn_At) < YEAR(CURDATE()) THEN
            CONCAT('on ', DATE_FORMAT(us.Discn_At, '%d %b %Y'), ' at ')
            ELSE
            CONCAT('on ', DATE_FORMAT(us.Discn_At, '%d %b'), ' at ')
        END,
        DATE_FORMAT(us.Discn_At, '%h:%i %p')
        )) ELSE 'Offline' END) AS `Status`, ms.CrtBy AS sender, us.`User` AS receiver, 
        TO_BASE64(CASE WHEN ms.MsgTxt IS NOT NULL AND ms.MsgTxt != '' THEN
        CASE
            WHEN CHAR_LENGTH(ms.MsgTxt) > 40
                THEN CONCAT(SUBSTRING(ms.MsgTxt, 1, 40), '...')
            ELSE ms.MsgTxt
        END
    WHEN ms.MsgTxt = '' AND ms.FileName IS NOT NULL THEN
        CASE
            WHEN CHAR_LENGTH(ms.FileName) > 40
                THEN CONCAT(SUBSTRING(ms.FileName, 1, 40), '...')
            ELSE ms.FileName
        END
    ELSE ('No messages yet')
END) AS MsgStr, TO_BASE64(ms.MsgTxt) AS MsgTxt, ms.Sent_at, (CASE WHEN (ms.`User` = us.`User`) THEN (NULL) ELSE (SELECT 
    (CASE WHEN (COUNT(*) = 0) THEN (NULL) ELSE (COUNT(*)) END) FROM user_reads r JOIN user_mssgs m ON r.MsgId = m.MsgId AND m.RoomId = ur.RoomId WHERE r.`User` != ms.`User` AND r.Read_At IS NULL AND r.`User` = us.`User`) END) AS Unread, cn.ConnId FROM user_conns us INNER JOIN user_mmbrs um ON um.`User` = us.`User` INNER JOIN user_room ur ON ur.RoomId = um.RoomId INNER JOIN LATERAL (SELECT sg.*, uf.FileName FROM user_mssgs sg LEFT JOIN user_files uf ON uf.MsgId = sg.MsgId WHERE sg.RoomId = um.RoomId ORDER BY sg.MsgId DESC LIMIT 1) AS ms ON ms.RoomId = ur.RoomId INNER JOIN sec_users su ON su.login = us.`User` INNER JOIN user_conns cn ON cn.SessnId = :sessnid WHERE ur.RoomId = :roomid " . ($action == 'create_group' ? "" : "AND us.SessnId != :sessnid") . " AND us.`status` = :status AND us.Discn_At IS NULL ORDER BY us.`status` DESC", ['sessnid' => $sessionid, 'roomid' => $roomid, 'status' => '1']);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Message received successfully', 'receiver_sessions' => $response['result'][0] ?? []];
}

function get_receiver_profile($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $roomid = $data['roomid'] ?? '';

    if ($roomid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Room Id is required'];
    }

    $response = $db->execQuery("SELECT ur.RoomId, ur.Room, 
    (CASE WHEn (ur.`Type` = 1) THEN (su.`name`) ELSE (ur.Room) END) AS `Name`, 
    (CASE WHEN (ur.`Type` = '2') THEN (SELECT CONCAT(COUNT(*), ' Online') FROM user_mmbrs mm
            JOIN sec_users su2 ON su2.login = mm.`User`
            WHERE mm.RoomId = ur.RoomId AND su2.`status` = '1') 
              WHEN (uc.`status` = '1') THEN ('Online') WHEN (uc.`status` != '1') THEN (CONCAT(
            'Last seen ',
            CASE
                WHEN DATE(uc.Discn_At) = CURDATE() THEN 'today at '
                WHEN DATE(uc.Discn_At) = CURDATE() - INTERVAL 1 DAY THEN 'yesterday at '
                WHEN YEAR(uc.Discn_At) < YEAR(CURDATE()) THEN
                CONCAT('on ', DATE_FORMAT(uc.Discn_At, '%d %b %Y'), ' at ')
                ELSE
                CONCAT('on ', DATE_FORMAT(uc.Discn_At, '%d %b'), ' at ')
            END,
            DATE_FORMAT(uc.Discn_At, '%h:%i %p')
            )) ELSE 'Offline' END) AS `Status` FROM user_room ur 
    INNER JOIN sec_users sc ON sc.login = :user 
    LEFT JOIN user_mmbrs um ON um.RoomId = ur.RoomId 
    AND (CASE WHEN (ur.Room = CONCAT(LEAST(um.`User`, sc.login), '_', GREATEST(um.`User`, sc.login))) 
    THEN (1) ELSE (um.`User` != sc.login) END)
    LEFT JOIN sec_users su ON su.login = um.`User` 
    LEFT JOIN user_conns uc ON uc.ConnId = su.ConnId
    WHERE ur.RoomId = :roomid GROUP BY ur.RoomId;", ['user' => $username, 'roomid' => $roomid]);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Receiver profile successfull', 'receiver_profile' => $response['result'][0] ?? []];
}

function get_user_profile($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $response = $db->execQuery("SELECT su.login, su.`name`, su.DateOfBirth, su.email, su.MobileNo, su.DateOfJoining, (CASE WHEN (su.`status` = '1') THEN ('Online') ELSE 'Offline' END) AS `Status` FROM sec_users su WHERE su.login = :user", ['user' => $username]);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'User profile successfull', 'user_profile' => $response['result'][0] ?? []];
}

function get_common_groups($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $roomid = $data['roomid'] ?? '';

    if ($roomid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Room Id is required'];
    }

    $response = $db->execQuery("SELECT u.RoomId, u.Room FROM user_room u INNER JOIN user_mmbrs m2 ON m2.RoomId = :roomid AND m2.`User` != :user INNER JOIN user_mmbrs m1 ON m1.RoomId = u.RoomId AND m1.`User` = m2.`User` WHERE u.`Type` = '2'", ['user' => $username, 'roomid' => $roomid]);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Common groups successfull', 'common_groups' => $response['result'][0]];
}

function get_active_sessions($data, $db) {
    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $response = $db->execQuery("SELECT ns.ConnId, ns.`User`, ns.SessnId, ns.DeviceIP, DATE_FORMAT(ns.Conn_At, '%d-%m-%Y %H:%i:%s') AS Conn_At, (CASE WHEN (ns.`status` = '1') THEN ('Online') ELSE 'Offline' END) AS `Status` FROM user_conns ns WHERE ns.`status` = :status AND ns.SessnId != :sessnid ORDER BY ns.ConnId;", ['sessnid' => $sessionid, 'status' => '1']);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Active sessions successfull', 'active_sessions' => $response['result'][0]];
}

function get_my_sessions($data, $db) {
    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $response = $db->execQuery("SELECT us.ConnId, us.SessnId, us.`User`, us.DeviceIP, DATE_FORMAT(us.Conn_At, '%d-%m-%Y %H:%i:%s') AS Conn_At, DATE_FORMAT(us.Discn_At, '%d-%m-%Y %H:%i:%s') AS Discn_At, (CASE WHEN (us.`status` = '1') THEN ('Online') ELSE 'Offline' END) AS `Status`, us.`status` AS SessType FROM user_conns us CROSS JOIN user_conns cn ON cn.SessnId = :sessnid WHERE us.`User` = cn.`User` ORDER BY (us.SessnId = cn.SessnId) DESC, us.`status` DESC, us.ConnId DESC", ['sessnid' => $sessionid]);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'User sessions successfull', 'my_sessions' => $response['result'][0]] ?? [];
}

function get_online_users($data, $db) {
    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $response = $db->execQuery("-- online_users
    -- online_users
    SELECT ur.RoomId, su.login, 
(CASE WHEN (ur.`Type` = '2') THEN (ur.Room) WHEN (ur.`Type` = '1') THEN (rs.`name`) END) AS `Name`, (CASE WHEN (ur.`Type` = '1') THEN ('Single') WHEN (ur.`Type` = '2') THEN ('Group') END) AS `ChatType`, 
(CASE WHEN (ur.`Type` = '2') THEN (SELECT CONCAT(COUNT(*), ' Online')
        FROM user_mmbrs mm
        JOIN sec_users su2 ON su2.login = mm.`User`
        WHERE mm.RoomId = ur.RoomId AND su2.`status` = '1') WHEN (uc.`status` = '1') THEN ('Online') WHEN (uc.`status` != '1') THEN (CONCAT(
        'Last seen ',
        CASE
            WHEN DATE(uc.Discn_At) = CURDATE() THEN 'today at '
            WHEN DATE(uc.Discn_At) = CURDATE() - INTERVAL 1 DAY THEN 'yesterday at '
            WHEN YEAR(uc.Discn_At) < YEAR(CURDATE()) THEN
            CONCAT('on ', DATE_FORMAT(uc.Discn_At, '%d %b %Y'), ' at ')
            ELSE
            CONCAT('on ', DATE_FORMAT(uc.Discn_At, '%d %b'), ' at ')
        END,
        DATE_FORMAT(uc.Discn_At, '%h:%i %p')
        )) ELSE 'Offline' END) AS `Status`, 
    TO_BASE64(CASE WHEN lm.MsgTxt IS NOT NULL AND lm.MsgTxt != '' THEN
        CASE
            WHEN CHAR_LENGTH(lm.MsgTxt) > 40
                THEN CONCAT(SUBSTRING(lm.MsgTxt, 1, 40), '...')
            ELSE lm.MsgTxt
        END
    WHEN lm.MsgTxt = '' AND uf.FileName IS NOT NULL THEN
        CASE
            WHEN CHAR_LENGTH(uf.FileName) > 40
                THEN CONCAT(SUBSTRING(uf.FileName, 1, 40), '...')
            ELSE uf.FileName
        END
    ELSE ('No messages yet')
END) AS MsgStr
FROM sec_users su 
INNER JOIN user_conns cn ON cn.SessnId = :sessnid
INNER JOIN sec_users rs ON rs.login = cn.`User`
INNER JOIN user_room ur ON 
(CASE WHEN (ur.`Type` = '1' AND cn.`User` != su.login) THEN (ur.Room = CONCAT(LEAST(cn.`User`, su.login), '_', GREATEST(cn.`User`, su.login))) WHEN (ur.`Type` = '2') THEN (ur.RoomId IN (SELECT mm.RoomId FROM user_mmbrs mm WHERE mm.`User` IN (cn.`User`, su.login) GROUP BY mm.RoomId HAVING COUNT(DISTINCT mm.`User`) = 2)) END)
LEFT JOIN (SELECT uc1.* FROM user_conns uc1 JOIN (SELECT `User`, ConnId, ROW_NUMBER() OVER (PARTITION BY `User` ORDER BY (Discn_At IS NOT NULL), Discn_At DESC, Conn_At DESC) AS rn FROM user_conns) AS latest ON latest.ConnId = uc1.ConnId AND latest.rn = 1) AS uc ON (CASE WHEN (ur.`Type` = '1') THEN (uc.`User` = cn.`User`) END)
LEFT JOIN (SELECT um.* FROM user_mssgs um JOIN (SELECT RoomId, MAX(MsgId) AS max_id FROM user_mssgs GROUP BY RoomId) AS latest ON um.RoomId = latest.RoomId AND um.MsgId = latest.max_id
) AS lm ON lm.RoomId = ur.RoomId
LEFT JOIN (SELECT f1.* FROM user_files f1 JOIN (SELECT MsgId, MAX(FileId) AS max_file_id FROM user_files GROUP BY MsgId) AS f2 ON f1.FileId = f2.max_file_id) AS uf ON uf.MsgId = lm.MsgId
WHERE su.`status` = :status -- AND su.login != cn.`User`;", ['sessnid' => $sessionid, 'status' => '1']);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Online users successfull', 'online_users' => $response['result'][0]] ?? [];
}

function get_group_users($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $roomid = $data['roomid'] ?? '';

    if ($roomid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Room Id is required'];
    }

    $response = $db->execQuery("SELECT ur.RoomId, m.`User` FROM user_room u INNER JOIN user_mmbrs m ON m.RoomId = u.RoomId INNER JOIN sec_users s ON s.login = m.`User` INNER JOIN user_room ur ON ur.Room = CONCAT(LEAST(:user, m.`User`), '_', GREATEST(:user, m.`User`)) WHERE u.RoomId = :roomid", ['user' => $username, 'roomid' => $roomid]);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Group users successfull', 'group_users' => $response['result'][0]];
}

function get_groups($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $response = $db->execQuery("SELECT u.RoomId, u.Room FROM user_room u INNER JOIN user_mmbrs m ON m.RoomId = u.RoomId WHERE u.`Type` = '2' AND m.`User` = :user", ['user' => $username]);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Groups successfull', 'groups' => $response['result'][0]];
}

function get_messages($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $roomid = $data['roomid'] ?? '';

    if ($roomid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Room Id is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $response = $db->execQuery("UPDATE user_reads ur JOIN user_mssgs um ON um.MsgId = ur.MsgId JOIN (
        SELECT 
            uc.ConnId,
            COALESCE(MAX(rd.ConnIndx), 0) AS MaxConnIndx
        FROM user_conns uc
        LEFT JOIN user_reads rd ON rd.ConnId = uc.ConnId
        WHERE uc.SessnId = :sessnid
        GROUP BY uc.ConnId
    ) AS sub ON 1 = 1 SET ur.Read_At = NOW(), ur.ConnId = (SELECT ConnId FROM user_conns WHERE SessnId = :sessnid), ur.MsgState = '3', ConnIndx = sub.MaxConnIndx + 1 WHERE um.RoomId = :roomid AND ur.User = :user AND ur.Read_At IS NULL;
    -- get_messages
    SELECT m.RoomId, m.User, TO_BASE64(m.MsgTxt) AS MsgTxt, d.MsgState, m.Sent_At, s.`Name`, d.Read_At, (SELECT COUNT(*) FROM user_mssgs g JOIN user_reads r ON r.MsgId = g.MsgId WHERE r.`User` = d.`User` AND r.Read_At IS NULL AND g.RoomId = m.RoomId) AS Unread, 
(CASE WHEN (o.`Type` = '2') THEN (SELECT CONCAT(COUNT(*), ' Online')
    FROM user_mmbrs mm
    JOIN sec_users su2 ON su2.login = mm.`User`
    WHERE mm.RoomId = m.RoomId AND su2.`status` = '1') WHEN (uc.`status` = '1') THEN ('Online') WHEN (uc.`status` != '1') THEN (CONCAT(
        'Last seen ',
        CASE
            WHEN DATE(uc.Discn_At) = CURDATE() THEN 'today at '
            WHEN DATE(uc.Discn_At) = CURDATE() - INTERVAL 1 DAY THEN 'yesterday at '
            WHEN YEAR(uc.Discn_At) < YEAR(CURDATE()) THEN
            CONCAT('on ', DATE_FORMAT(uc.Discn_At, '%d %b %Y'), ' at ')
            ELSE
            CONCAT('on ', DATE_FORMAT(uc.Discn_At, '%d %b'), ' at ')
        END,
        DATE_FORMAT(uc.Discn_At, '%h:%i %p')
        )) ELSE 'Offline' END) AS `Status`, m.MsgId, 
    TO_BASE64(CASE WHEN m.MsgTxt IS NOT NULL AND m.MsgTxt != '' THEN
        CASE
            WHEN CHAR_LENGTH(m.MsgTxt) > 40
                THEN CONCAT(SUBSTRING(m.MsgTxt, 1, 40), '...')
            ELSE m.MsgTxt
        END
    WHEN m.MsgTxt = '' AND f.FileName IS NOT NULL THEN
        CASE
            WHEN CHAR_LENGTH(f.FileName) > 40
                THEN CONCAT(SUBSTRING(f.FileName, 1, 40), '...')
            ELSE f.FileName
        END
    ELSE ('No messages yet')
END) AS MsgStr 
FROM user_mssgs m JOIN sec_users s ON s.login = :user JOIN user_room o ON o.RoomId = m.RoomId LEFT JOIN user_reads d ON d.MsgId = m.MsgId AND d.`User` != :user LEFT JOIN (SELECT uc1.* FROM user_conns uc1 JOIN (SELECT `User`, MAX(ConnId) AS max_connid FROM user_conns GROUP BY `User`) AS latest ON uc1.ConnId = latest.max_connid) AS uc ON uc.`User` = d.`User` 
LEFT JOIN (SELECT uf.MsgId, MAX(uf.FileId) AS FileId FROM user_files uf GROUP BY uf.MsgId) AS fl ON fl.MsgId = m.MsgId
LEFT JOIN user_files f ON f.FileId = fl.FileId
WHERE m.RoomId = :roomid GROUP BY m.MsgId ORDER BY m.Sent_At ASC;
    ", ['sessnid' => $sessionid, 'user' => $username, 'roomid' => $roomid]);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Message got successfully', 'messages' => $response['result'][0] ?? []];
}

function send_message($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $roomid = $data['roomid'] ?? '';

    if ($roomid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Room Id is required'];
    }

    $message = $data['message'] ?? '';

    if ($message == '' && empty($data['files'])) {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Message is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $params = ['sessnid' => $sessionid, 'user' => $username, 'roomid' => $roomid, 'message' => $message];
    $file_placeholders = [];
    $file_params = [];
    $sql = '';
    if(!empty($data['files']) && !empty($data['size'])) {
        $files = $data['files']; // e.g., ['file1', 'file2']
        $sizes = $data['size'];  // e.g., [1234, 5678]
        foreach ($files as $index => $file) {
            $placeholder_file = ":file$index";
            $placeholder_size = ":size$index";
            $file_placeholders[] = "$placeholder_file AS FileName, $placeholder_size AS FileSize";
            $file_params[$placeholder_file] = $files[$index];
            $file_params[$placeholder_size] = $sizes[$index];
        }
        $placeholders_str = implode(' UNION ALL SELECT ', $file_placeholders);
        $params = array_merge($params, $file_params);
        $sql = "INSERT INTO `user_files` (`MsgId`, `FileName`, `FileSize`) 
        SELECT (SELECT rd.MsgId FROM user_reads rd WHERE rd.ReadId = LAST_INSERT_ID()), FileName, FileSize 
        FROM (SELECT $placeholders_str) AS filenames;SELECT uf.FileId, uf.FileName, uf.FileSize FROM user_files uf WHERE uf.MsgId = (SELECT fl.MsgId FROM user_files fl WHERE fl.FileId = LAST_INSERT_ID())";
    }

    $response = $db->execQuery("INSERT INTO user_mssgs (User, ConnId, RoomId, MsgTxt, Sent_At) VALUES (:user, (SELECT ConnId FROM user_conns WHERE SessnId = :sessnid), :roomid, FROM_BASE64(:message), NOW());INSERT INTO user_reads (MsgId, RoomId, User, Read_At, MsgState, DonnId, Dlvr_At) SELECT (LAST_INSERT_ID()), :roomid, mm.`User`, NULL, (CASE WHEN (uu.`status` = '1') THEN ('2') ELSE ('1') END), (CASE WHEN (uu.`status` = '1') THEN (SELECT ConnId FROM user_conns WHERE `User` = mm.`User` AND `Status` = '1' LIMIT 1) ELSE (NULL) END), (CASE WHEN (uu.`status` = '1') THEN (NOW()) ELSE (NULL) END) FROM user_mmbrs mm JOIN sec_users uu ON uu.login = mm.`User` WHERE mm.RoomId = :roomid AND mm.`User` != :user;$sql", $params);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Message sent successfully', 'files' => $response['result'][0] ?? []];
}

function create_group($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $groupname = $data['groupname'] ?? '';

    if (!$groupname) {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Group name is required'];
    }

    $users = $data['users'] ?? [];

    if (count($users) < 1) {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'At least one other user is required'];
    }

    $users[] = $username;

    $response = $db->execQuery("INSERT INTO user_room (Room, Type, CrtBy, ConnId) VALUES (:room, '2', :username, (SELECT ConnId FROM user_conns WHERE SessnId = :sessnid)); 
    INSERT INTO user_mmbrs (RoomId, user, CrtBy, ConnId) SELECT (SELECT RoomId FROM user_room WHERE Room = :room), login, :username, (SELECT ConnId FROM user_conns WHERE SessnId = :sessnid) FROM sec_users WHERE FIND_IN_SET(login, :users); 
    INSERT IGNORE INTO user_mssgs (User, ConnId, RoomId, MsgTxt, Sent_At, CrtBy, MbrId) (SELECT 
            'system', 
            uc.ConnId, 
            ur.RoomId, 
            CASE dp.n
                WHEN 1 THEN CONCAT(su.`name`, ' created group \'', ur.Room, '\'')
                ELSE CONCAT(su.`name`, ' added \'', sc.`name`, '\'')
            END AS SysTxt, 
            NOW(), :username, um.MbrId 
        FROM user_room ur
        JOIN sec_users su 
            ON su.login = ur.CrtBy
        JOIN user_conns uc 
            ON uc.ConnId = ur.ConnId
        CROSS JOIN (
            SELECT @rownum := @rownum + 1 AS n, t.login
            FROM (
                SELECT su1.login AS login, 0 AS sort_order 
                FROM sec_users su1 
                WHERE su1.login = :username
                UNION ALL
                SELECT su2.login, 1 AS sort_order
                FROM sec_users su2
                WHERE su2.login != :username
            ) t
            JOIN (SELECT @rownum := 0) r
            ORDER BY t.sort_order, t.login
        ) dp 
    JOIN sec_users sc ON sc.login = dp.login
    JOIN user_mmbrs um ON um.RoomId = ur.RoomId AND um.`User` = dp.login
    WHERE ur.Room = :room AND su.login = :username ORDER BY dp.n ASC);  
    INSERT IGNORE INTO user_reads (MsgId, RoomId, User, Read_At, MsgState, DonnId, Dlvr_At) 
    (SELECT mg.MsgId, mm.RoomId, mm.`User`, NULL, (CASE WHEN (uu.`status` = '1') THEN ('2') ELSE ('1') END) AS MsgState, (CASE WHEN (uu.`status` = '1') THEN (SELECT ConnId FROM user_conns WHERE `User` = mm.`User` AND `Status` = '1' LIMIT 1) ELSE (NULL) END) AS DonnId, (CASE WHEN (uu.`status` = '1') THEN (NOW()) ELSE (NULL) END) AS Dlvr_At FROM user_mmbrs mm JOIN sec_users uu ON uu.login = mm.`User` JOIN user_room ur ON ur.RoomId = mm.RoomId JOIN user_mssgs mg ON mg.RoomId = ur.RoomId AND mg.`User` = 'system' WHERE ur.Room = :room AND mm.`User` != ur.CrtBy); 
    SELECT RoomId FROM user_room WHERE Room = :room", 
    ['room' => $groupname, 'users' => implode(',', $users), 'username' => $username, 'sessnid' => $sessionid]);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Group created successfully', 'create_group' => $response['result'][0]];
}

function get_users($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }
    
    $response = $db->execQuery("SELECT su.login, su.`name` FROM sec_users su INNER JOIN sec_users sc ON sc.login = :user INNER JOIN user_mmbrs um ON um.`User` = su.login INNER JOIN user_room ur ON ur.RoomId = um.RoomId AND ur.Room = CONCAT(LEAST(sc.login, su.login), '_', GREATEST(sc.login, su.login)) WHERE su.login != sc.login ORDER BY su.`name`;", ['user' => $username]);

    return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Users successfull', 'users' => $response['result'][0]];
}

function get_chats($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }

    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $response = $db->execQuery("SELECT login, name FROM sec_users WHERE BINARY login = :user", ['user' => $username]);
    $user = $response['result'];

    if ($user) {
        $response = $db->execQuery("
        INSERT IGNORE INTO user_room (Room, Type, CrtBy, ConnId) VALUES ('Default Group', '2', :user, (SELECT ConnId FROM user_conns WHERE SessnId = :sessnid));
        INSERT IGNORE INTO user_mmbrs (RoomId, user, CrtBy, ConnId) SELECT (SELECT RoomId FROM user_room WHERE Room = 'Default Group'), login, :user, (SELECT ConnId FROM user_conns WHERE SessnId = :sessnid) FROM sec_users ORDER BY login;
        INSERT IGNORE INTO user_mssgs (User, ConnId, RoomId, MsgTxt, Sent_At, CrtBy, MbrId) (SELECT 
            'system', 
            uc.ConnId, 
            ur.RoomId, 
            CASE dp.n
                WHEN 1 THEN CONCAT(su.`name`, ' created group \'', ur.Room, '\'')
                ELSE CONCAT(su.`name`, ' added \'', sc.`name`, '\'')
            END AS SysTxt, 
            NOW(), :user, um.MbrId 
        FROM user_room ur
        JOIN sec_users su 
            ON su.login = ur.CrtBy
        JOIN user_conns uc 
            ON uc.ConnId = ur.ConnId
        CROSS JOIN (
            SELECT @rownum := @rownum + 1 AS n, t.login
            FROM (
                SELECT su1.login AS login, 0 AS sort_order 
                FROM sec_users su1 
                WHERE su1.login = :user
                UNION ALL
                SELECT su2.login, 1 AS sort_order
                FROM sec_users su2
                WHERE su2.login != :user
            ) t
            JOIN (SELECT @rownum := 0) r
            ORDER BY t.sort_order, t.login
        ) dp 
        JOIN sec_users sc ON sc.login = dp.login
        JOIN user_mmbrs um ON um.RoomId = ur.RoomId AND um.`User` = dp.login
        WHERE ur.Room = 'Default Group' AND su.login = :user ORDER BY dp.n ASC);
        INSERT IGNORE INTO user_reads (MsgId, RoomId, User, Read_At, MsgState, DonnId, Dlvr_At) 
        (SELECT mg.MsgId, mm.RoomId, mm.`User`, NULL, (CASE WHEN (uu.`status` = '1') THEN ('2') ELSE ('1') END) AS MsgState, (CASE WHEN (uu.`status` = '1') THEN (SELECT ConnId FROM user_conns WHERE `User` = mm.`User` AND `Status` = '1' LIMIT 1) ELSE (NULL) END) AS DonnId, (CASE WHEN (uu.`status` = '1') THEN (NOW()) ELSE (NULL) END) AS Dlvr_At FROM user_mmbrs mm JOIN sec_users uu ON uu.login = mm.`User` JOIN user_room ur ON ur.RoomId = mm.RoomId JOIN user_mssgs mg ON mg.RoomId = ur.RoomId AND mg.`User` = 'system' WHERE ur.Room = 'Default Group' AND mm.`User` != ur.CrtBy);
        INSERT IGNORE INTO user_room (Room, Type, CrtBy, ConnId) SELECT CONCAT(LEAST(:user, login), '_', GREATEST(:user,login)), '1', :user, (SELECT ConnId FROM user_conns WHERE SessnId = :sessnid) FROM sec_users ORDER BY login;
        INSERT IGNORE INTO user_mmbrs (RoomId, `User`, CrtBy, ConnId) SELECT * FROM (SELECT ur.RoomId, su.login, :user, (SELECT ConnId FROM user_conns WHERE SessnId = :sessnid) FROM user_room ur JOIN sec_users su ON ur.Room = CONCAT(LEAST(:user, login), '_', GREATEST(:user, login)) UNION ALL SELECT ur.RoomId, :user, :user, (SELECT ConnId FROM user_conns WHERE SessnId = :sessnid) FROM user_room ur JOIN sec_users su ON ur.Room = CONCAT(LEAST(:user, login), '_', GREATEST(:user, login)) WHERE su.login != :user) AS q ORDER BY q.RoomId;
        SELECT ur.RoomId, uf.FileName, (CASE WHEN (ur.Type = '1') THEN (su.name) ELSE ur.Room END) AS `Name`, (CASE WHEN (ur.`Type` = '2') THEN (SELECT CONCAT(COUNT(*), ' Online') FROM user_mmbrs mm JOIN sec_users su2 ON su2.login = mm.`User`
        WHERE mm.RoomId = ur.RoomId AND su2.`status` = '1') 
        WHEN (su.`status` = '1') THEN ('Online') 
        WHEN (uc.`status` != '1') THEN (CONCAT('Last seen ',
        CASE
            WHEN DATE(uc.Discn_At) = CURDATE() THEN 'today at '
            WHEN DATE(uc.Discn_At) = CURDATE() - INTERVAL 1 DAY THEN 'yesterday at '
            WHEN YEAR(uc.Discn_At) < YEAR(CURDATE()) THEN
            CONCAT('on ', DATE_FORMAT(uc.Discn_At, '%d %b %Y'), ' at ')
            ELSE
            CONCAT('on ', DATE_FORMAT(uc.Discn_At, '%d %b'), ' at ')
        END,
        DATE_FORMAT(uc.Discn_At, '%h:%i %p')
        )) ELSE 'Offline' END) AS `Status`, (SELECT COUNT(*) FROM user_reads r JOIN user_mssgs m ON r.MsgId = m.MsgId WHERE r.User = um1.`User` AND r.Read_At IS NULL AND m.RoomId = ur.RoomId) AS Unread, 
        TO_BASE64(um.MsgTxt) AS MsgTxt, TO_BASE64(CASE WHEN um.MsgTxt IS NOT NULL AND um.MsgTxt != '' THEN
        CASE WHEN CHAR_LENGTH(um.MsgTxt) > 40
                THEN CONCAT(SUBSTRING(um.MsgTxt, 1, 40), '...')
            ELSE um.MsgTxt
        END
    WHEN um.MsgTxt = '' AND uf.FileName IS NOT NULL THEN
        CASE
            WHEN CHAR_LENGTH(uf.FileName) > 40
                THEN CONCAT(SUBSTRING(uf.FileName, 1, 40), '...')
            ELSE uf.FileName
        END
    ELSE ('No messages yet')
END) AS MsgStr, (CASE WHEN (ur.`Type` = '1') THEN ('Single') WHEN (ur.`Type` = '2') THEN ('Group') END) AS `ChatType` FROM user_room ur JOIN user_mmbrs um1 ON ur.RoomId = um1.RoomId AND um1.`User` = :user LEFT JOIN user_mmbrs um2 ON ur.RoomId = um2.RoomId AND um2.`User` != um1.`User` LEFT JOIN sec_users su ON (CASE WHEN (um2.`User` IS NULL) THEN (su.login = um1.`User`) ELSE (su.login = um2.`User`) END) 
	LEFT JOIN (SELECT ms.RoomId, MAX(ms.MsgId) AS MsgId, MAX(fl.FileId) AS FileId FROM user_mssgs ms LEFT JOIN user_files fl ON fl.MsgId = ms.MsgId GROUP BY RoomId) AS uk ON uk.RoomId = ur.RoomId 
	LEFT JOIN user_mssgs um ON um.MsgId = uk.MsgId
	LEFT JOIN user_files uf ON uf.FileId = uk.FileId
	LEFT JOIN user_conns uc ON uc.User = su.login GROUP BY ur.RoomId ORDER BY um.Sent_At DESC;", ['user' => $username, 'sessnid' => $sessionid]);

        return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Chat successfull', 'chats' => $response['result'][0] ?? []];
    } else {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Invalid credentials', 'chats' =>[]];
    }
}

function login($data, $db) {
    $username = $data['username'] ?? '';

    if ($username == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Username is required'];
    }
    
    $sessionid = $data['sessionid'] ?? '';

    if ($sessionid == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Session Id is required'];
    }

    $deviceip = $data['deviceip'] ?? '';

    if ($deviceip == '') {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Device IP is required'];
    }

    $response = $db->execQuery("SELECT login, name FROM sec_users WHERE BINARY login = :user", ['user' => $username]);
    $user = $response['result'];

    if ($user) {
        $insert = $db->execQuery("INSERT IGNORE INTO user_conns (User, SessnId, DeviceIP, Conn_At, status) VALUES (:user, :sessnid, :deviceip, NOW(), :status) AS new ON DUPLICATE KEY UPDATE status = new.status, Discn_At = NULL;
        UPDATE sec_users su SET su.`status` = :status, su.ConnId = (SELECT ConnId FROM user_conns WHERE SessnId = :sessnid) WHERE su.`login` = :user;
        UPDATE user_reads rd SET rd.MsgState = '2', rd.Dlvr_At = NOW(), rd.DonnId = (SELECT ConnId FROM user_conns WHERE SessnId = :sessnid) WHERE rd.`User` = :user AND rd.MsgState = '1' AND rd.Dlvr_At IS NULL", ['user' => $username, 'sessnid' => $sessionid, 'deviceip' => $deviceip, 'status' => '1']);
        
        return $finalmsg = ["status" => "success", "code" => 1, 'message' => 'Login successfull', 'login' => 1];
    } else {
        return $finalmsg = ["status" => "failed", "code" => 0, 'message' => 'Invalid credentials', 'login' => 0];
    }
}

?>