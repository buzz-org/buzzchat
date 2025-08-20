TRUNCATE user_conns;
TRUNCATE user_mmbrs;
TRUNCATE user_mssgs;
TRUNCATE user_reads;
TRUNCATE user_room;
TRUNCATE user_chunks;
TRUNCATE user_files;
UPDATE sec_users sc SET sc.`status` = NULL, sc.ConnId = NULL