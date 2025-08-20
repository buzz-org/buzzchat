<?php

require_once 'vendor/autoload.php';

use Dotenv\Dotenv;

class Database {
    private $conn;
    private $host;
    private $port;
    private $database;
    private $username;
    private $password;

    public function __construct() {
        $dotenv = Dotenv::createImmutable(__DIR__);
        $dotenv->load();
        
        $this->host = $_ENV['DB_HOST'];
        $this->port = $_ENV['DB_PORT'];
        $this->database = $_ENV['DB_NAME'];
        $this->username = $_ENV['DB_USER'];
        $this->password = $_ENV['DB_PASS'];

        try {
            $this->conn = new PDO("mysql:host=$this->host;port=$this->port;dbname=$this->database", $this->username, $this->password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::MYSQL_ATTR_MULTI_STATEMENTS => true]);
        } catch (PDOException $e) {
            die("Connection failed: " . $e->getMessage());
        }
    }

    public function getConnection() {
        return $this->conn;
    }

    public function closeConnection() {
        $this->conn = null;
    }

    public function execQuery(string $query, array $params = []): array
    {
        try {
            $response = $result = $warnings = [];

            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);

            do {
                $set = $stmt->fetchAll(PDO::FETCH_ASSOC);
                if ($set) $result[] = $set;
            } while ($stmt->nextRowset());

            $warnings = $this->conn->query("SHOW WARNINGS")->fetchAll(PDO::FETCH_ASSOC);

            $response = [
                'affected_rows' => $stmt->rowCount(),
                'affected_columns' => $stmt->columnCount(),
                'lastInsertId' => $this->conn->lastInsertId(),
                'warnings_count' => count($warnings),
                'warnings_desc' => $warnings,
                'final_query' => $query
            ];

            return ['status' => 'success', 'code' => 1, 'message' => 'Query executed successfully.', 'document' => $response, 'result' => $result];
        } catch (Throwable $e) {
            $logmsg = json_decode($e->getMessage(), true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $logmsg = ['status' => 'error', 'code' => 0, 'message' => 'Error executing query.', 'document' => ['message' => $e->getMessage(), 'code' => $e->getCode(), 'file' => $e->getFile(), 'line' => $e->getLine(), 'final_query' => $query]
                ];
            }
            throw new Exception(json_encode($logmsg));
        }
    }

    public function execSql(string $query, array $params = []): array
    {
        try {
            $response = $result = $warnings = [];

            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);

            do {
                $set = $stmt->fetchAll(PDO::FETCH_NUM);
                if ($set) $result[] = $set;
            } while ($stmt->nextRowset());

            $warnings = $this->conn->query("SHOW WARNINGS")->fetchAll(PDO::FETCH_ASSOC);

            $response = [
                'affected_rows' => $stmt->rowCount(),
                'affected_columns' => $stmt->columnCount(),
                'lastInsertId' => $this->conn->lastInsertId(),
                'warnings_count' => count($warnings),
                'warnings_desc' => $warnings,
                'final_query' => $query
            ];

            return ['status' => 'success', 'code' => 1, 'message' => 'Query executed successfully.', 'document' => $response, 'result' => $result];
        } catch (Throwable $e) {
            $logmsg = json_decode($e->getMessage(), true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $logmsg = ['status' => 'error', 'code' => 0, 'message' => 'Error executing query.', 'document' => ['message' => $e->getMessage(), 'code' => $e->getCode(), 'file' => $e->getFile(), 'line' => $e->getLine(), 'final_query' => $query]
                ];
            }
            throw new Exception(json_encode($logmsg));
        }
    }

    public function insertChunk(string $query, array $params = []): array
    {
        try {
            $response = $result = $warnings = [];
            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $paramType = ($key == 'chunk') ? PDO::PARAM_LOB : PDO::PARAM_STR;
                $stmt->bindValue(':' . $key, $value, $paramType);
            }
            $stmt->execute();
            do {
                $set = $stmt->fetchAll(PDO::FETCH_ASSOC);
                if ($set) $result[] = $set;
            } while ($stmt->nextRowset());

        $warnings = $this->conn->query("SHOW WARNINGS")->fetchAll(PDO::FETCH_ASSOC);

        $response = [
            'affected_rows' => $stmt->rowCount(),
            'affected_columns' => $stmt->columnCount(),
            'lastInsertId' => $this->conn->lastInsertId(),
            'warnings_count' => count($warnings),
            'warnings_desc' => $warnings,
            'final_query' => $query
        ];

        return ['status' => 'success', 'code' => 1, 'message' => 'Chunk inserted successfully.', 'document' => $response, 'result' => $result];
        } catch (Throwable $e) {
            $logmsg = json_decode($e->getMessage(), true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $logmsg = ['status' => 'error', 'code' => 0, 'message' => 'Error executing chunk.', 'document' => ['message' => $e->getMessage(), 'code' => $e->getCode(), 'file' => $e->getFile(), 'line' => $e->getLine(), 'final_query' => $query]
                ];
            }
            throw new Exception(json_encode($logmsg));
        }
    }

    public function selectChunk(string $query, array $params = []): array
    {
        try {
            $response = $result = $warnings = [];

            $stmt = $this->conn->prepare($query);

            foreach ($params as $key => $value) {
                $stmt->bindValue(':' . $key, $value, PDO::PARAM_STR);
            }

            $stmt->execute();

            // Bind the chunk column as a LOB stream
            $chunkData = null;
            $stmt->bindColumn('ChunkData', $chunkData, PDO::PARAM_LOB);
            $stmt->fetch(PDO::FETCH_BOUND);

            $chunkContent = is_resource($chunkData) ? stream_get_contents($chunkData) : $chunkData;

            if (is_resource($chunkData)) {
                fclose($chunkData);
            }

            $warnings = $this->conn->query("SHOW WARNINGS")->fetchAll(PDO::FETCH_ASSOC);

            $response = [
                'affected_rows' => $stmt->rowCount(),
                'affected_columns' => $stmt->columnCount(),
                'lastInsertId' => $this->conn->lastInsertId(),
                'warnings_count' => count($warnings),
                'warnings_desc' => $warnings,
                'final_query' => $query
            ];

            return ['status' => 'success', 'code' => 1, 'message' => 'Chunk selected successfully.', 'document' => $response, 'chunk_data' => $chunkContent];
        } catch (Throwable $e) {
            $logmsg = json_decode($e->getMessage(), true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $logmsg = ['status' => 'error', 'code' => 0, 'message' => 'Error executing chunk.', 'document' => ['message' => $e->getMessage(), 'code' => $e->getCode(), 'file' => $e->getFile(), 'line' => $e->getLine(), 'final_query' => $query]
                ];
            }
            throw new Exception(json_encode($logmsg));
        }
    }
}

// class ProDB {
//     private $mysqli;
//     private $host;
//     private $port;
//     private $database;
//     private $username;
//     private $password;

//     public function __construct() {
//         $dotenv = Dotenv::createImmutable(__DIR__);
//         $dotenv->load();
        
//         $this->host = $_ENV['DB_HOST'];
//         $this->port = $_ENV['DB_PORT'];
//         $this->database = $_ENV['DB_NAME'];
//         $this->username = $_ENV['DB_USER'];
//         $this->password = $_ENV['DB_PASS'];

//         $this->mysqli = new mysqli($host, $user, $password, $database);
//         if ($this->mysqli->connect_error) {
//             throw new Exception("Connection failed: " . $this->mysqli->connect_error);
//         }
//     }

//     public function nameQuery($sql) {
//         $results = [];
//         if ($this->mysqli->multi_query($sql)) {
//             do {
//                 if ($result = $this->mysqli->store_result()) {
//                     $results[] = $result->fetch_all(MYSQLI_ASSOC);
//                     $result->free();
//                 }
//             } while ($this->mysqli->more_results() && $this->mysqli->next_result());
//         }
//         return $results;
//     }
    
//     public function numbsql($sql) {
//         $results = [];
//         if ($this->mysqli->multi_query($sql)) {
//             do {
//                 if ($result = $this->mysqli->store_result()) {
//                     while ($row = $result->fetch_array(MYSQLI_NUM)) {
//                         $results[] = $row;
//                     }
//                     $result->free();
//                 }
//             } while ($this->mysqli->more_results() && $this->mysqli->next_result());
//         }
//         return $results;
//     }

//     public function getConnection() {
//         return $this->mysqli;
//     }
    
//     public function closeConnection() {
//         $this->mysqli->close();
//     }
// }

?>