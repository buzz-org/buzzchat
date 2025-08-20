<?php
function downloadFile(string $filePath, string $downloadName): void
{
    // Ensure script doesn't time out or abort
    set_time_limit(0);
    ignore_user_abort(true);

    // Check if file exists and is readable
    if (!is_file($filePath) || !is_readable($filePath)) {
        http_response_code(404);
        echo 'File not found.';
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
    header('Content-Disposition: attachment; filename="' . $downloadName . '"');
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
        echo 'Could not open file.';
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
}

// File on disk
$filePath = 'C:/Users/supt3/Desktop/Deploy/6messenger/omschat/files/1_BLD 95 (1).zip.part';

// Name for download
$downloadName = 'BLD 95 (1).zip';

// Call the function
downloadFile($filePath, $downloadName);

?>