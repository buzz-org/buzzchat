<?php

$sessionId = 'obhib7vvuqv3fd4nap3m1otprd';
echo $sessionPath = ini_get('session.save_path');
$sessionFile = rtrim($sessionPath, '/\\') . DIRECTORY_SEPARATOR . 'sess_' . $sessionId;

if (file_exists($sessionFile)) {
    echo "<br>Session is active.";
} else {
    echo "<br>Session is not active.";
}

?>