<?php

try {

session_start();

// echo phpinfo();

require_once 'Database.php';

header('Content-Type: application/json');

if (php_sapi_name() == "cli")
{
    $options = getopt("", ["param:"]);
    $payload = $options["param"];
    // $payload = file_get_contents('php://stdin');
    $data = json_decode($payload, true);
    $action = $data['action'];
    $ip = '127.0.0.1';
}
else
{
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    $payload = file_get_contents("php://input");
    $data = json_decode($payload, true);
    $ip = $_SERVER['REMOTE_ADDR'];
}

$db = new Database();
$conn = $db->getConnection();
$conn->beginTransaction();

switch ($action) {

    case 'login':
        
        $login = $data['login'] ?? '';
        $password = $data['password'] ?? '';
        $stmt = $conn->prepare("SELECT * FROM sec_users WHERE login = :login AND pswd = :pswd");
        $stmt->execute(['login' => $login, 'pswd' => md5($password)]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            $_SESSION['user'] = $user['login'];
            $stmt = $conn->prepare("INSERT INTO user_conns (User, SessnId, DeviceIP, Conn_At, status) VALUES (:user, :sessnId, :ip, NOW(), '1')");
            $stmt->execute(['user' => $login, 'sessnId' => session_id(), 'ip' => $ip]);
            $stmt = $conn->prepare("INSERT INTO `user_stats` (`User`, `status`) VALUES (:user, '1') ON DUPLICATE KEY UPDATE `status` =VALUES(`status`);");
            $stmt->execute(['user' => $login]);
            echo json_encode(['success' => true, 'message' => 'Login successful']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
        }
        break;

    case 'get_conversations':
        // if (!isset($_SESSION['user'])) {
        //     echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        //     exit;
        // }

        $currentUser = $data['user'];

        $stmt = $conn->prepare("INSERT IGNORE INTO user_room (Room, Type) SELECT CONCAT(LEAST(:user, login), '_', GREATEST(:user,login)), '1' FROM sec_users;");
        $stmt->execute(['user' => $currentUser]);

        $stmt = $conn->prepare("INSERT IGNORE INTO user_mmbrs (RoomId, `User`) SELECT ur.RoomId, su.login FROM user_room ur JOIN sec_users su ON ur.Room = CONCAT(LEAST(:user, login), '_', GREATEST(:user, login)) UNION ALL SELECT ur.RoomId, :user FROM user_room ur JOIN sec_users su ON ur.Room = CONCAT(LEAST(:user, login), '_', GREATEST(:user, login)) WHERE su.login != :user;");
        $stmt->execute(['user' => $currentUser]);

        $stmt = $conn->prepare("SELECT ur.RoomId AS login, ur.Room AS Room, (CASE WHEN (ur.Type = '1') THEN (su.`login`) ELSE ur.Room END) AS user, (CASE WHEN (ur.Type = '1') THEN (su.name) ELSE ur.Room END) AS name, (CASE WHEN (ur.`Type` = '2') THEN (NULL) WHEN (us.`status` = '1') THEN ('Online') ELSE 'Offline' END) AS `status`, (SELECT COUNT(*) FROM user_reads r JOIN user_mssgs m ON r.MsgId = m.MsgId WHERE r.User = um1.`User` AND r.Read_At IS NULL AND m.RoomId = ur.RoomId) AS unread, um.MsgTxt, ur.`Type` FROM user_room ur JOIN user_mmbrs um1 ON ur.RoomId = um1.RoomId AND um1.`User` = :user LEFT JOIN user_mmbrs um2 ON ur.RoomId = um2.RoomId AND um2.`User` != um1.`User` LEFT JOIN sec_users su ON (CASE WHEN (um2.`User` IS NULL) THEN (su.login = um1.`User`) ELSE (su.login = um2.`User`) END) LEFT JOIN user_stats us ON (CASE WHEN (um2.`User` IS NULL) THEN (us.`User` = um1.`User`) ELSE (us.`User` = um2.`User`) END) LEFT JOIN user_mssgs um ON um.RoomId = ur.RoomId GROUP BY ur.RoomId ORDER BY um.Sent_At DESC");
        $stmt->execute(['user' => $currentUser]);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $contacts = [];
        foreach ($users as $user) {
            $login = $user['login'];
            $name = $user['name'];
            $lastMessage = $user['MsgTxt'] ? $user['MsgTxt'] : 'No messages yet';
            $unreadCount = $user['unread'];
            
            $contacts[] = [
                'login' => $user['login'],
                'name' => $name,
                'user' => $user['user'],
                'avatar' => strtoupper(substr($name, 0, 1)),
                'status' => $user['status'], // Can be enhanced with real status
                'avatarClass' => 'avatar-' . strtolower(preg_replace('/\s+/', '-', $name)),
                'lastMessage' => $lastMessage,
                'unreadCount' => $unreadCount
            ];
        }

        echo json_encode(['success' => true, 'contacts' => $contacts]);
        break;

    case 'get_users':
        if (!isset($_SESSION['user'])) {
            echo json_encode(['success' => false, 'message' => 'Not authenticated']);
            exit;
        }

        $stmt = $conn->prepare("SELECT login, name FROM sec_users");
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'users' => $users]);
        break;

    case 'create_group':
        if (!isset($_SESSION['user'])) {
            echo json_encode(['success' => false, 'message' => 'Not authenticated']);
            exit;
        }

        $groupName = $data['groupName'] ?? '';
        $currentUser = $_SESSION['user'];
        $data['users'][] = $currentUser;
        $users = $data['users'] ?? [];

        if (!$groupName || count($users) < 2) {
            echo json_encode(['success' => false, 'message' => 'Group name and at least one other user required']);
            exit;
        }

            
        $stmt = $conn->prepare("INSERT INTO user_room (Room, Type) VALUES (:room, '2')");
        $stmt->execute(['room' => $groupName]);
        $roomId = $conn->lastInsertId();

        foreach ($users as $user) {
            $stmt = $conn->prepare("INSERT INTO user_mmbrs (RoomId, User) VALUES (:roomId, :user)");
            $stmt->execute(['roomId' => $roomId, 'user' => $user]);
        }

        echo json_encode(['success' => true, 'message' => 'Group created successfully']);
        break;

    case 'send_message':
        if (!isset($_SESSION['user'])) {
            echo json_encode(['success' => false, 'message' => 'Not authenticated']);
            exit;
        }

        $receiver = $data['receiver'] ?? '';
        $message = $data['message'] ?? '';
        $currentUser = $_SESSION['user'];

        if (!$receiver || !$message) {
            echo json_encode(['success' => false, 'message' => 'Missing receiver or message']);
            exit;
        }

        $stmt = $conn->prepare("INSERT INTO user_mssgs (User, RoomId, MsgTxt, Sent_At) VALUES (:user, :roomId, :msgTxt, NOW())");
        $stmt->execute(['user' => $currentUser, 'roomId' => $receiver, 'msgTxt' => $message]);
        $msgId = $conn->lastInsertId();
        $stmt = $conn->prepare("INSERT INTO user_reads (MsgId, User, Read_At) SELECT :msgId, User, NULL FROM user_mmbrs WHERE RoomId = :roomId AND User != :sender ");
        $stmt->execute(['msgId' => $msgId, 'roomId' => $receiver, 'sender' => $currentUser]);
            
            echo json_encode(['success' => true, 'message' => 'Message sent']);
        break;

    case 'get_messages':
        // if (!isset($_SESSION['user'])) {
        //     echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        //     exit;
        // }

        // $data = json_decode(file_get_contents('php://input'), true);
        $contact = $data['contact'] ?? '';
        $receiver = $data['receiver'] ?? '';
        // $currentUser = $_SESSION['user'];
        $currentUser = $data['user'];

        if ($data['receiver'] != '') {
            $stmt = $conn->prepare("UPDATE user_reads ur JOIN user_mssgs um ON um.MsgId = ur.MsgId SET ur.Read_At = NOW() WHERE um.RoomId = :contact AND ur.User != :user AND ur.Read_At IS NULL");
            $stmt->execute(['contact' => $contact, 'user' => $receiver]);
        }
        $stmt = $conn->prepare("SELECT m.MsgId, m.User, m.MsgTxt, m.Sent_At, s.`Name` FROM user_mssgs m JOIN sec_users s ON s.login = m.`User` WHERE m.RoomId = :contact ORDER BY m.Sent_At ASC;");
        $stmt->execute(['contact' => $contact]);
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'messages' => $messages]);
        break;

    case 'logout':
        // if (!isset($_SESSION['user'])) {
        //     echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        //     exit;
        // }
        // $currentUser = $_SESSION['user'];
        $currentUser = $data['user'];
        $stmt = $conn->prepare("UPDATE user_conns SET Discn_At = NOW(), status = '0' WHERE SessnId = :sessnId AND Discn_At IS NULL");
        $stmt->execute(['sessnId' => session_id()]);
        $stmt = $conn->prepare("UPDATE user_stats us SET us.status = (SELECT CASE WHEN COUNT(*) = 0 THEN 0 ELSE 1 END FROM user_conns uc WHERE uc.User = us.User AND uc.Discn_At IS NULL) WHERE us.User = :user;");
        $stmt->execute(['user' => $currentUser]);
        session_destroy();
        echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

$conn->commit();

$db->closeConnection();

} catch (PDOException $e) {
    $conn->rollBack();
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
} catch (Exception $e) {
    $conn->rollBack();
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

?>