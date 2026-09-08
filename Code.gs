/**
 * Google Apps Script Web App Backend for Inventory & User Management.
 */

const USER_HEADERS = [
  'id', 'user_type', 'username', 'name', 'role', 'pin',
  'property', 'status', 'created_at', 'date_added', 'is_archived'
];
const FRONTDESK_SHEET_NAME = 'Front Desk';
const BACKEND_VERSION = 'frontdesk-sheet-v1';

function ensureUsersSheet(ss) {
  let sheet = ss.getSheetByName('Users');
  if (!sheet) {
    sheet = ss.insertSheet('Users');
  }

  if (sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, USER_HEADERS.length).setValues([USER_HEADERS]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(header => String(header).trim());
  const missingHeaders = USER_HEADERS.filter(header => !headers.includes(header));
  if (missingHeaders.length) {
    sheet.getRange(1, headers.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
  }
  return sheet;
}

function ensureFrontDeskSheet(ss) {
  let sheet = ss.getSheetByName(FRONTDESK_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(FRONTDESK_SHEET_NAME);
  }
  return sheet;
}

function isFrontDeskPayload(payload) {
  return String(payload.type || payload.stock_type || '').toLowerCase() === 'frontdesk_inventory';
}

function getSheetForPayload(ss, payload) {
  if (payload.user_type === 'app_user' || payload.role || payload.username) {
    return ensureUsersSheet(ss);
  }
  if (isFrontDeskPayload(payload)) {
    return ensureFrontDeskSheet(ss);
  }
  return ss.getSheets()[0];
}

function getSheetsForPayload(ss, payload) {
  if (payload.user_type === 'app_user' || payload.role || payload.username) {
    return [ensureUsersSheet(ss)];
  }
  if (isFrontDeskPayload(payload)) {
    const frontDeskSheet = ensureFrontDeskSheet(ss);
    return [frontDeskSheet, ...ss.getSheets().filter(sheet => sheet.getSheetId() !== frontDeskSheet.getSheetId())];
  }
  return ss.getSheets();
}

function ensurePayloadHeaders(sheet, payload) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    const headers = Object.keys(payload);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return headers;
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map(header => String(header).trim());
  const missingHeaders = Object.keys(payload).filter(header => header && !headers.includes(header));
  if (missingHeaders.length) {
    sheet.getRange(1, headers.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
    headers.push(...missingHeaders);
  }
  return headers;
}

function sheetToObjects(sheet) {
  if (sheet.getLastRow() <= 1 || sheet.getLastColumn() === 0) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(header => String(header).trim());
  return data.slice(1).map(row => {
    const item = {};
    headers.forEach((header, index) => {
      if (header) item[header] = row[index];
    });
    return item;
  }).filter(item => item.id);
}

function doGet(e) {
  const action = e?.parameter?.action || 'read';
  const callback = e?.parameter?.callback || '';
  const payloadStr = e?.parameter?.payload || '';
  let payload = {};

  if (payloadStr) {
    try {
      payload = JSON.parse(payloadStr);
    } catch (err) {
      return jsonpResponse({ success: false, error: 'Invalid request payload.' }, callback);
    }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let responseData;

  try {
    if (action === 'health') {
      responseData = { success: true, version: BACKEND_VERSION };
    } else if (action === 'read') {
      responseData = ss.getSheets().flatMap(sheetToObjects);
    } else if (action === 'create') {
      const targetSheet = getSheetForPayload(ss, payload);
      const headers = ensurePayloadHeaders(targetSheet, payload);
      const row = headers.map(header => payload[header] !== undefined ? payload[header] : '');
      targetSheet.appendRow(row);
      responseData = { success: true, item: payload };
    } else if (action === 'update' || action === 'delete') {
      const sheets = getSheetsForPayload(ss, payload);
      let changed = false;

      sheets.some(sheet => {
        const data = sheet.getDataRange().getValues();
        if (!data.length) return false;
        const existingHeaders = data[0].map(header => String(header).trim());
        const idColIndex = existingHeaders.indexOf('id');
        if (idColIndex === -1) return false;
        const rowIndex = data.findIndex((row, index) => index > 0 && String(row[idColIndex]) === String(payload.id));
        if (rowIndex === -1) return false;

        if (action === 'delete') {
          sheet.deleteRow(rowIndex + 1);
        } else {
          const headers = ensurePayloadHeaders(sheet, payload);
          headers.forEach((header, columnIndex) => {
            if (payload[header] !== undefined) {
              sheet.getRange(rowIndex + 1, columnIndex + 1).setValue(payload[header]);
            }
          });
        }
        changed = true;
        return true;
      });
      responseData = { success: changed };
    } else {
      responseData = { success: false, error: 'Unsupported action.' };
    }
  } catch (err) {
    responseData = { success: false, error: err.message };
  }

  return jsonpResponse(responseData, callback);
}

function jsonpResponse(data, callback) {
  const jsonString = JSON.stringify(data);
  const output = callback ? `${callback}(${jsonString})` : jsonString;
  return ContentService.createTextOutput(output)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}