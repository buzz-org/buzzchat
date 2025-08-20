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
, o.CrtBy
FROM user_mssgs m JOIN sec_users s ON s.login = 'admin' JOIN user_room o ON o.RoomId = m.RoomId LEFT JOIN user_reads d ON d.MsgId = m.MsgId AND d.`User` != 'admin' LEFT JOIN (SELECT uc1.* FROM user_conns uc1 JOIN (SELECT `User`, MAX(ConnId) AS max_connid FROM user_conns GROUP BY `User`) AS latest ON uc1.ConnId = latest.max_connid) AS uc ON uc.`User` = d.`User` 
LEFT JOIN (SELECT uf.MsgId, MAX(uf.FileId) AS FileId FROM user_files uf GROUP BY uf.MsgId) AS fl ON fl.MsgId = m.MsgId
LEFT JOIN user_files f ON f.FileId = fl.FileId
WHERE m.RoomId = 83 GROUP BY m.MsgId ORDER BY m.Sent_At ASC