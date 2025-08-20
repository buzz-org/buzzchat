-- --------------------------------------------------------
-- Host:                         192.168.0.98
-- Server version:               8.0.43-0ubuntu0.24.04.1 - (Ubuntu)
-- Server OS:                    Linux
-- HeidiSQL Version:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Dumping structure for table test.user_chunks
DROP TABLE IF EXISTS `user_chunks`;
CREATE TABLE IF NOT EXISTS `user_chunks` (
  `ChunkId` int NOT NULL AUTO_INCREMENT,
  `FileId` int DEFAULT NULL,
  `ChunkIndx` int DEFAULT NULL,
  `ChunkData` mediumblob,
  `ChunkSize` int DEFAULT NULL,
  PRIMARY KEY (`ChunkId`),
  KEY `FileId` (`FileId`),
  KEY `ChunkSize` (`ChunkSize`),
  KEY `ChunkIndx` (`ChunkIndx`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Data exporting was unselected.

-- Dumping structure for table test.user_conns
DROP TABLE IF EXISTS `user_conns`;
CREATE TABLE IF NOT EXISTS `user_conns` (
  `ConnId` int NOT NULL AUTO_INCREMENT,
  `User` varchar(25) DEFAULT NULL,
  `SessnId` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `DeviceIP` varchar(25) DEFAULT NULL,
  `Conn_At` datetime DEFAULT NULL,
  `status` int DEFAULT NULL,
  `Discn_At` datetime DEFAULT NULL,
  `TonnId` int DEFAULT NULL,
  PRIMARY KEY (`ConnId`),
  UNIQUE KEY `SessnId` (`SessnId`),
  KEY `User` (`User`),
  KEY `DeviceIP` (`DeviceIP`),
  KEY `Conn_At` (`Conn_At`),
  KEY `status` (`status`),
  KEY `Discn_At` (`Discn_At`),
  KEY `TonnId` (`TonnId`),
  KEY `User_SessnId` (`User`,`SessnId`),
  KEY `User_status` (`User`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=latin1;

-- Data exporting was unselected.

-- Dumping structure for table test.user_files
DROP TABLE IF EXISTS `user_files`;
CREATE TABLE IF NOT EXISTS `user_files` (
  `FileId` int NOT NULL AUTO_INCREMENT,
  `MsgId` int DEFAULT NULL,
  `FileName` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `FileSize` int DEFAULT NULL,
  PRIMARY KEY (`FileId`),
  KEY `MsgId` (`MsgId`),
  KEY `FileSize` (`FileSize`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Data exporting was unselected.

-- Dumping structure for table test.user_mmbrs
DROP TABLE IF EXISTS `user_mmbrs`;
CREATE TABLE IF NOT EXISTS `user_mmbrs` (
  `MbrId` int NOT NULL AUTO_INCREMENT,
  `RoomId` int DEFAULT NULL,
  `User` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ConnId` int DEFAULT NULL,
  `CrtBy` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `CrtDtTm` timestamp NULL DEFAULT (now()),
  PRIMARY KEY (`MbrId`),
  UNIQUE KEY `RoomId_User` (`RoomId`,`User`),
  KEY `RoomId` (`RoomId`),
  KEY `User` (`User`),
  KEY `ConnId` (`ConnId`),
  KEY `CrtBy` (`CrtBy`)
) ENGINE=InnoDB AUTO_INCREMENT=114 DEFAULT CHARSET=latin1;

-- Data exporting was unselected.

-- Dumping structure for table test.user_mssgs
DROP TABLE IF EXISTS `user_mssgs`;
CREATE TABLE IF NOT EXISTS `user_mssgs` (
  `MsgId` int NOT NULL AUTO_INCREMENT,
  `User` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ConnId` int DEFAULT NULL,
  `RoomId` int DEFAULT NULL,
  `MsgTxt` longtext,
  `Sent_At` datetime DEFAULT NULL,
  PRIMARY KEY (`MsgId`),
  KEY `User` (`User`),
  KEY `ConnId` (`ConnId`),
  KEY `RoomId` (`RoomId`),
  KEY `Sent_At` (`Sent_At`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=latin1;

-- Data exporting was unselected.

-- Dumping structure for table test.user_reads
DROP TABLE IF EXISTS `user_reads`;
CREATE TABLE IF NOT EXISTS `user_reads` (
  `ReadId` int NOT NULL AUTO_INCREMENT,
  `MsgId` int DEFAULT NULL,
  `ConnId` int DEFAULT NULL,
  `ConnIndx` int DEFAULT NULL,
  `DonnId` int DEFAULT NULL,
  `RoomId` int DEFAULT NULL,
  `User` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `Read_At` datetime DEFAULT NULL,
  `MsgState` int DEFAULT NULL,
  `Dlvr_At` datetime DEFAULT NULL,
  PRIMARY KEY (`ReadId`),
  KEY `MsgId` (`MsgId`),
  KEY `ConnId` (`ConnId`),
  KEY `RoomId` (`RoomId`),
  KEY `User` (`User`),
  KEY `Read_At` (`Read_At`),
  KEY `MsgStatus` (`MsgState`) USING BTREE,
  KEY `Dlvr_At` (`Dlvr_At`),
  KEY `DonnId` (`DonnId`),
  KEY `ConnIndx` (`ConnIndx`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=latin1;

-- Data exporting was unselected.

-- Dumping structure for table test.user_room
DROP TABLE IF EXISTS `user_room`;
CREATE TABLE IF NOT EXISTS `user_room` (
  `RoomId` int NOT NULL AUTO_INCREMENT,
  `Room` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ConnId` int DEFAULT NULL,
  `Type` tinyint DEFAULT NULL,
  `CrtBy` varchar(25) DEFAULT NULL,
  `CrtDtTm` timestamp NULL DEFAULT (now()),
  PRIMARY KEY (`RoomId`),
  UNIQUE KEY `Room` (`Room`),
  KEY `Type` (`Type`),
  KEY `CrtBy` (`CrtBy`),
  KEY `ConnId` (`ConnId`)
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=latin1;

-- Data exporting was unselected.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
