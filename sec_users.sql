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

-- Dumping structure for table test.sec_users
DROP TABLE IF EXISTS `sec_users`;
CREATE TABLE IF NOT EXISTS `sec_users` (
  `login` varchar(32) NOT NULL,
  `name` varchar(64) DEFAULT NULL,
  `DateOfBirth` date DEFAULT NULL,
  `email` varchar(64) DEFAULT NULL,
  `MobileNo` varchar(12) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `DateOfJoining` date DEFAULT NULL,
  `status` int DEFAULT NULL,
  `ConnId` int DEFAULT NULL,
  `UserGrp` tinyint DEFAULT NULL,
  `CrtDtTm` timestamp NULL DEFAULT (now()),
  PRIMARY KEY (`login`),
  KEY `status` (`status`),
  KEY `ConnId` (`ConnId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='default=''3e5d2fc2f3da51233cc213cf301c3cc4''';

-- Data exporting was unselected.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
