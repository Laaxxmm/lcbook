/**
 * Learn Crew Publications — Google Sheet sync (spec §10).
 *
 * The app POSTs:  { secret, sheet: "Orders" | "Cancellations" | "PrintQueue", data: { order_id, ... } }
 * This script UPSERTS by order_id (partial updates — only the sent fields change).
 * The sheet is a READ-ONLY MIRROR; Postgres is the source of truth (the app never reads back).
 *
 * DEPLOY:
 *   1. Create a Google Sheet with tabs: Orders, Cancellations, PrintQueue.
 *   2. Extensions → Apps Script → paste this file.
 *   3. Set SECRET below to the SAME value as Railway's SHEETS_SECRET.
 *   4. Deploy → New deployment → type "Web app" → Execute as: Me · Who has access: Anyone → Deploy.
 *   5. Copy the Web app URL (ends with /exec) → that is SHEETS_WEBHOOK_URL in Railway.
 */

const SECRET = 'PUT_YOUR_SHEETS_SECRET_HERE'; // must equal Railway SHEETS_SECRET

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) return json_({ ok: false, error: 'bad secret' });

    const sheetName = body.sheet;
    const data = body.data || {};
    if (!sheetName || !data.order_id) return json_({ ok: false, error: 'missing sheet or order_id' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

    // Header row = column names. Add any new columns the payload introduces.
    let headers = sheet.getLastRow() === 0
      ? []
      : sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].filter(String);
    if (headers.indexOf('order_id') === -1) headers.unshift('order_id');
    let changed = false;
    Object.keys(data).forEach(function (k) {
      if (headers.indexOf(k) === -1) { headers.push(k); changed = true; }
    });
    if (changed || sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    const orderCol = headers.indexOf('order_id') + 1;
    const rowIndex = findRow_(sheet, orderCol, data.order_id);

    if (rowIndex === -1) {
      // New order → append a full row in header order.
      sheet.appendRow(headers.map(function (h) { return h in data ? data[h] : ''; }));
    } else {
      // Existing order → partial update, only the sent fields.
      Object.keys(data).forEach(function (k) {
        sheet.getRange(rowIndex, headers.indexOf(k) + 1).setValue(data[k]);
      });
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function findRow_(sheet, orderCol, orderId) {
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const vals = sheet.getRange(2, orderCol, last - 1, 1).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) === String(orderId)) return i + 2;
  }
  return -1;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
