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
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1 || data[0].length === 0) return [];

  const headers = data[0].map(header => String(header).trim());
  return data.slice(1).map(row => {
    const item = {};
    headers.forEach((header, index) => {
      if (header) item[header] = row[index];
    });
    return item;
  }).filter(item => item.id);
}

function archiveOldStockCounts(ss, payload) {
  const today = String(payload.today || '').slice(0, 10);
  const targetProperty = String(payload.property || '').trim().toLowerCase();
  let archived = 0;

  ss.getSheets().forEach(sheet => {
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;

    const headers = data[0].map(header => String(header).trim());
    const stockTypeIndex = headers.indexOf('stock_type');
    const dateIndex = headers.indexOf('date_added');
    const propertyIndex = headers.indexOf('property');
    const archivedIndex = headers.indexOf('is_archived');
    if (stockTypeIndex === -1 || dateIndex === -1 || archivedIndex === -1) return;

    const rows = data.slice(1);
    const updatedRows = rows.map(row => {
      const rowDate = row[dateIndex] instanceof Date
        ? Utilities.formatDate(row[dateIndex], ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd')
        : String(row[dateIndex] || '').slice(0, 10);
      const rowProperty = propertyIndex === -1 ? '' : String(row[propertyIndex] || '').trim().toLowerCase();
      const propertyMatches = !targetProperty || !rowProperty || rowProperty === targetProperty;
      const shouldArchive = String(row[stockTypeIndex]).toLowerCase() === 'minibar_count'
        && rowDate !== today
        && propertyMatches
        && !['true', 'yes', '1'].includes(String(row[archivedIndex]).toLowerCase());

      if (shouldArchive) {
        row[archivedIndex] = true;
        archived++;
      }
      return row;
    });

    sheet.getRange(2, 1, updatedRows.length, headers.length).setValues(updatedRows);
  });

  return { success: true, archived };
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
    } else if (action === 'archive_old_stock_counts') {
      responseData = archiveOldStockCounts(ss, payload);
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
          const updatedRow = headers.map((header, columnIndex) =>
            payload[header] !== undefined ? payload[header] : (data[rowIndex][columnIndex] ?? '')
          );
          sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([updatedRow]);
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