// Function implementations
import fs from 'fs';
import path from 'path';
import db from './Database.js';

async function mailsignup(data) {
    
  const query = `SELECT s.SignUpId, s.SignUpPro, s.MailClass FROM signupoptions s;`;
  const params = [];

  const response = await db.execQuery(query, params);

  const finalmsg =  { status: "success", code: 1, message: 'signupoptions successfull', signupoptions: response.result || [] };

  return finalmsg;
}

async function getemlids(data) {
  const login_usr = data?.usr_login ?? null;

  if (!login_usr) return { status: "failed", code: 0, message: "Invalid Username.", details: "Set Username." };

  const query = `SELECT DATABASE() AS DB; SELECT a.EmailPrefId, a.EmailPrefName, a.EmailOnOff, a.EmailSync, a.EmailFolder, a.LibraryPath, a.EmailPath, a.EmailLogFile, a.IsRecClosed, a.EmailCurl FROM emailpreference a WHERE a.EmailPrefId = ?;`; const params = ['1'];

  const request = await db.execQuery(query, params);  const response = request.result;  let logmsg;
  const arr_daba = response[0]; // object inside first array
  const arr_pref = response[1]; // object inside second array 

  const EmailPrefId   = arr_pref[0].EmailPrefId;
  const EmailPrefName = arr_pref[0].EmailPrefName;
  const EmailOnOff    = arr_pref[0].EmailOnOff;
  const EmailFolder   = arr_pref[0].EmailFolder;
  const LibraryPath   = arr_pref[0].LibraryPath;
  const EmailPath     = arr_pref[0].EmailPath;
  const EmailLogFile  = arr_pref[0].EmailLogFile;
  const EmailSync     = arr_pref[0].EmailSync;
  const EPRClosed     = arr_pref[0].IsRecClosed;
  const EmailCurl     = arr_pref[0].EmailCurl;

  if (arr_pref.length == 0) {
    logmsg = { status: "failed", code: 0, message: "Email configuration is empty.", details: "Email configuration is empty.", emlpref: arr_pref };
  } else if (EmailOnOff != 1) {
    logmsg = { status: "failed", code: 0, message: "Email feature is disabled.", details: "Email feature is disabled.", emlpref: arr_pref };
  } else if (EmailSync != 1) {
    logmsg = { status: "failed", code: 0, message: "Email syncing is disabled.", details: "Email syncing is disabled.", emlpref: arr_pref };
  } else if (EPRClosed != 0) {
    logmsg = { status: "failed", code: 0, message: "Email preference is closed.", details: "Email preference is closed.", emlpref: arr_pref };
  } else {
    const query = `SELECT a.EmailAddressId, a.EmailAddress FROM emailaddressmst a INNER JOIN emailserpromst b ON b.EmailSerProId = a.EmailSerProId INNER JOIN emailadrsuser c ON c.EmailAddressId = a.EmailAddressId WHERE c.login = ? AND c.IsRecClosed = ?;`;    const params = [login_usr, '0'];
    const request = await db.execQuery(query, params);  const response = request.result;
    logmsg = { status: "success", code: 1, message: "Successfully retrieved.", details: [response] };
  }
  return logmsg;
}

async function getmsgids(data) {
  const login_usr = data?.usr_login ?? null;
  if (!login_usr) return { status: "failed", code: 0, message: "Invalid Username.", details: "Set Username." };
  
  const emlid_usr = data?.usr_emlid ?? null;
  if (!emlid_usr) return { status: "failed", code: 0, message: "Invalid Email Address Id.", details: "Set Email Address Id." };

  let unqids = [];
  let npt = 1;

  // while (npt) {
    const logmsg = await googl_sync(data);
  //   const lstmsg = await getlst(logmsg.token, npt);
  //   unqids = [...unqids, ...(lstmsg.messages || [])];
  //   npt = lstmsg.nextPageToken ?? 0;
  // }
  // logmsg = { status: "success", code: 1, message: "Got all unique id's.", details: unqids, count: unqids.length };
  return logmsg;
}

async function googl_sync(data) {
  const login_usr = data?.usr_login ?? null;
  const emlid_usr = data?.usr_emlid ?? null;
  const query = `SELECT a.EmailAddressId, a.EmailAddress, a.AddressToken, b.EmailSerProId, b.EmailSerProName, b.ClientSecret FROM emailaddressmst a INNER JOIN emailserpromst b ON b.EmailSerProId = a.EmailSerProId INNER JOIN emailadrsuser c ON c.EmailAddressId = a.EmailAddressId WHERE a.EmailAddressId = ?;`;
  const params = [emlid_usr];  const request = await db.execQuery(query, params);  const arr_temp = request.result; let logmsg;

  const serproid = arr_temp[0].serproid;
  const serproname = arr_temp[0].serproname;
  const ClientSecret = arr_temp[0].ClientSecret;

  const addresid = arr_temp[0].addresid;
  const addresname = arr_temp[0].addresname;
  const AddressToken = arr_temp[0].AddressToken;

  const clientObj = JSON.parse(ClientSecret || '{}');
  let accessObj = JSON.parse(AddressToken || '{}');

  const accesstn = accessObj?.access_token || '';
  const refrestn = accessObj?.refresh_token || '';
  const expireat = accessObj?.expires_at || '';

  if (expireat && refrestn && Math.floor(Date.now() / 1000) > expireat) {
    logmsg = await googl_refresh(arr_temp, login_usr);
  } else if (accesstn) {
    logmsg = { status: "success", code: 1, message: "Token is valid.", token: accessObj };
  } else {
    logmsg = { status: "failed", code: 0, message: "Error in access token.", token: accessObj };
  }

  logmsg = { status: "success", code: 1, message: "All okay.", details: arr_temp };
  return logmsg;
}

async function googl_refresh(arr_temp, usr_login) {
  
    const serproid = arr_temp[0].serproid;
    const serproname = arr_temp[0].serproname;
    const ClientSecret = arr_temp[0].ClientSecret;

    const addresid = arr_temp[0].addresid;
    const addresname = arr_temp[0].addresname;
    const AddressToken = arr_temp[0].AddressToken;

    const clientObj = JSON.parse(ClientSecret || '{}');
    let accessObj = JSON.parse(AddressToken || '{}');
  
    const clientId = clientObj?.client_id || '';
    const clientSt = clientObj?.client_secret || '';
    const cliscope = clientObj?.mail_scopes || '';
    const redirect = clientObj?.redirect_uris || [];
    const oauthuri = clientObj?.auth_uri || '';
    const tokenuri = clientObj?.token_uri || '';

    const refrestn = accessObj?.refresh_token || '';

    const postFields = {
        client_id: clientId,
        client_secret: clientSt,
        refresh_token: refrestn,
        grant_type: 'refresh_token'
    };

    const data = await node_fetch(tokenuri, { "Content-Type": "application/x-www-form-urlencoded" }, new URLSearchParams(postFields));

    const queryParams = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirect,
        access_type: "offline",
        state: "",
        scope: cliscope,
        prompt: "select_account consent"
    });
    const oauthurl = `${oauthuri}?${queryParams.toString()}`;

    data.created = Math.floor(Date.now() / 1000);
    data.generated = new Date(data.created * 1000).toLocaleString("en-CA", { timeZone: "Asia/Kolkata", hour12: false }).replace(",", "");
    data.expires_in = 3600; // Set manually or from API
    data.expires_at = data.created + data.expires_in;
    data.validtill = new Date(data.expires_at * 1000).toLocaleString("en-CA", { timeZone: "Asia/Kolkata", hour12: false }).replace(",", "");
    data.TOKEN_ENDPOINT = tokenuri;
    data.AUTH_ENDPOINT = oauthuri;
    data.AUTH_URL = oauthurl;
    data.redirect_uris = redirect;
    data.refresh_token = refrestn;

    const logmsg = { status: "success", code: 1, message: "Refreshed successfully.", token: data, addresname: addresname, details: "Refreshed", serproid: serproid, usr_login: usr_login };

    await insert_token(logmsg);

    return [logmsg, data];
}

async function node_fetch(url, headers, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: body,
  });

  const text = await response.text();
  let data;   console.log(text);
  try { data = JSON.parse(text); } catch { data = text; }
  return data;
}

async function insert_token(logmsg) {
  const tokenBase64 = Buffer.from(JSON.stringify(logmsg.token, null, 2)).toString("base64");
  const logmsgBase64 = Buffer.from(JSON.stringify(logmsg, null, 2)).toString("base64");
  const query = 'INSERT INTO emailaddressmst (EmailAddress, AddressToken, EmailSerProId, AllowConn, AllowSend, AllowSync, IsRecClosed, CreatedBy, UpdatedBy) VALUES (?, FROM_BASE64(?), ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE AddressToken = VALUES(AddressToken), UpdatedBy = VALUES(UpdatedBy); INSERT INTO emailloghd (LogType, EmailAddressId, SendStatus, SendMsgs, CreatedBy) VALUES (?, (SELECT EmailAddressId FROM emailaddressmst a WHERE a.EmailAddress = ?), ?, FROM_BASE64(?), ?);';
  const params = [logmsg.addresname, tokenBase64, logmsg.serproid, '1', '1', '1', '0', logmsg.usr_login, logmsg.usr_login, '1', logmsg.addresname, logmsg.code, logmsgBase64, logmsg.usr_login ];
  const request = await db.execQuery(query, params);  const response = request.result;
}

async function batch_getmsg(data) {

}

export default {
  mailsignup,
  getemlids,
  getmsgids,
  batch_getmsg
};