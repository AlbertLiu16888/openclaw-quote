/**
 * Google Apps Script — 報價單系統後端
 *
 * 功能：
 *   1. 儲存報價單到 Google Sheets
 *   2. 複製模板生成新試算表
 *   3. 匯出 PDF 到 Google Drive
 *   4. 發送 Email（附 PDF）
 *   5. 發送 LINE Notify 通知
 *
 * 分頁結構（自動建立）：
 *   - Quote_Items    品項資料庫
 *   - Quote_Clients  客戶資料庫
 *   - Quote_History  報價紀錄
 *   - Quote_Config   系統設定
 *
 * 部署：
 *   擴充功能 → Apps Script → 貼上 → 部署 → 網頁應用程式
 *   執行身分：自己 / 存取權限：任何人
 */

// ===== Configuration =====
var QUOTE_TEMPLATE_ID = ''; // 報價單模板試算表 ID（空白則自動生成）
var SAVE_FOLDER_ID = '';     // Google Drive 資料夾 ID（空白則存根目錄）

// ===== HTTP Handlers =====
function doGet(e) {
  var action = e.parameter.action;
  var game = (e.parameter.game || '').toLowerCase();

  // Support existing game leaderboards
  if (game && game !== 'quote') {
    return handleGameGet(e, game);
  }

  switch (action) {
    case 'getItems': return getItems();
    case 'getClients': return getClients();
    case 'getHistory': return getHistory();
    case 'getConfig': return getQuoteConfig();
    case 'getScores': return getScores(game || e.parameter.gameId);
    default: return jsonResp({ error: 'Unknown action' });
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var game = (data.game || '').toLowerCase();

    // Support existing game leaderboards
    if (game && game !== 'quote' && (action === 'addScore' || action === 'setConfig')) {
      return handleGamePost(data, game);
    }

    switch (action) {
      case 'saveQuote': return saveQuote(data);
      case 'sendEmail': return sendQuoteEmail(data);
      case 'sendLINE': return sendLINENotify(data);
      case 'saveItem': return saveItem(data);
      case 'saveClient': return saveClient(data);
      case 'addScore': return addScore(game || data.gameId, data.name, data.score);
      case 'setConfig': return setGameConfig(game || data.gameId, data.key, data.value);
      default: return jsonResp({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResp({ error: err.message });
  }
}

function jsonResp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== Sheet Helpers =====
function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers) sheet.appendRow(headers);
  }
  return sheet;
}

// ===== Quote Functions =====

function saveQuote(data) {
  var sheet = getOrCreateSheet('Quote_History', [
    'quoteId', 'clientName', 'contact', 'email', 'phone',
    'eventDate', 'location', 'period', 'headcount', 'taxId',
    'subtotal', 'tax', 'total', 'deposit', 'balance',
    'itemsJson', 'notes', 'createdAt', 'pdfUrl', 'sheetUrl'
  ]);

  var info = data.info || {};
  var pdfUrl = '';
  var sheetUrl = '';

  // Try to generate PDF via template
  try {
    var result = generateQuotePDF(data);
    pdfUrl = result.pdfUrl || '';
    sheetUrl = result.sheetUrl || '';
  } catch (err) {
    Logger.log('PDF generation error: ' + err.message);
  }

  sheet.appendRow([
    data.quoteId,
    info.clientName, info.contact, info.email, info.phone,
    info.eventDate, info.location, info.period, info.headcount, info.taxId,
    data.subtotal, data.tax, data.total, data.deposit, data.balance,
    JSON.stringify(data.items || []),
    info.notes,
    new Date().toISOString(),
    pdfUrl,
    sheetUrl
  ]);

  return jsonResp({ success: true, quoteId: data.quoteId, pdfUrl: pdfUrl, sheetUrl: sheetUrl });
}

function generateQuotePDF(data) {
  var info = data.info || {};
  var items = data.items || [];

  // Create a new spreadsheet for this quote
  var ss = SpreadsheetApp.create('報價單_' + data.quoteId + '_' + (info.clientName || ''));
  var sheet = ss.getActiveSheet();
  sheet.setName('報價單');

  // Set column widths
  sheet.setColumnWidth(1, 200); // 品項
  sheet.setColumnWidth(2, 60);  // 數量
  sheet.setColumnWidth(3, 60);  // 單位
  sheet.setColumnWidth(4, 100); // 單價
  sheet.setColumnWidth(5, 120); // 小計

  var row = 1;

  // Header
  sheet.getRange(row, 1).setValue('異品科技股份有限公司').setFontSize(16).setFontWeight('bold').setFontColor('#2563eb');
  sheet.getRange(row, 4, 1, 2).merge().setValue('報價單 ' + data.quoteId).setFontSize(12).setFontWeight('bold').setHorizontalAlignment('right');
  row++;
  sheet.getRange(row, 1).setValue('Fresh Gifts Technology Co., Ltd.').setFontSize(9).setFontColor('#666666');
  sheet.getRange(row, 4, 1, 2).merge().setValue('報價日期：' + new Date().toLocaleDateString('zh-TW')).setFontSize(9).setHorizontalAlignment('right');
  row += 2;

  // Client info
  var clientInfo = [
    ['客戶名稱：', info.clientName || '', '活動日期：', info.eventDate || ''],
    ['聯絡人：', info.contact || '', '活動地點：', info.location || ''],
    ['Email：', info.email || '', '預估人數：', (info.headcount || '') + ' 人'],
    ['電話：', info.phone || '', '統一編號：', info.taxId || ''],
  ];
  for (var ci = 0; ci < clientInfo.length; ci++) {
    sheet.getRange(row, 1).setValue(clientInfo[ci][0]).setFontColor('#666666').setFontSize(9);
    sheet.getRange(row, 2).setValue(clientInfo[ci][1]).setFontWeight('bold').setFontSize(9);
    sheet.getRange(row, 3).setValue(clientInfo[ci][2]).setFontColor('#666666').setFontSize(9);
    sheet.getRange(row, 4, 1, 2).merge().setValue(clientInfo[ci][3]).setFontWeight('bold').setFontSize(9);
    row++;
  }
  row++;

  // Table header
  var headers = ['品項名稱', '數量', '單位', '單價', '小計'];
  sheet.getRange(row, 1, 1, 5).setValues([headers])
    .setBackground('#2563eb').setFontColor('#ffffff').setFontWeight('bold').setFontSize(9)
    .setHorizontalAlignment('center');
  row++;

  // Group items by category
  var catOrder = ['主題活動', '活動關卡', '保險', '人力', '交通', '餐飲', '場地', '扣抵/調整', '代辦服務費'];
  var grouped = {};
  for (var i = 0; i < items.length; i++) {
    var cat = items[i].category || '其他';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(items[i]);
  }

  // Add items
  var allCats = catOrder.concat(Object.keys(grouped).filter(function(c) { return catOrder.indexOf(c) === -1; }));
  for (var ci2 = 0; ci2 < allCats.length; ci2++) {
    var catName = allCats[ci2];
    if (!grouped[catName]) continue;

    // Category row
    sheet.getRange(row, 1, 1, 5).merge().setValue(catName)
      .setBackground('#f8fafc').setFontWeight('bold').setFontColor('#2563eb').setFontSize(9);
    row++;

    for (var j = 0; j < grouped[catName].length; j++) {
      var item = grouped[catName][j];
      var lineTotal = (item.qty || 0) * (item.customPrice || 0);
      sheet.getRange(row, 1).setValue(item.name).setFontSize(9);
      sheet.getRange(row, 2).setValue(item.qty).setHorizontalAlignment('center').setFontSize(9);
      sheet.getRange(row, 3).setValue(item.unit).setHorizontalAlignment('center').setFontSize(9);
      sheet.getRange(row, 4).setValue(item.customPrice).setNumberFormat('$#,##0').setFontSize(9);
      sheet.getRange(row, 5).setValue(lineTotal).setNumberFormat('$#,##0').setFontSize(9);
      row++;
    }
  }

  row++;
  // Summary
  sheet.getRange(row, 4).setValue('未稅小計').setFontSize(9).setHorizontalAlignment('right');
  sheet.getRange(row, 5).setValue(data.subtotal || 0).setNumberFormat('$#,##0').setFontSize(9);
  row++;
  sheet.getRange(row, 4).setValue('營業稅 (5%)').setFontSize(9).setHorizontalAlignment('right');
  sheet.getRange(row, 5).setValue(data.tax || 0).setNumberFormat('$#,##0').setFontSize(9);
  row++;
  sheet.getRange(row, 4).setValue('含稅總計').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('right');
  sheet.getRange(row, 5).setValue(data.total || 0).setNumberFormat('$#,##0').setFontWeight('bold').setFontSize(12).setFontColor('#2563eb');
  row += 2;

  // Payment
  sheet.getRange(row, 1).setValue('付款方式').setFontWeight('bold').setFontSize(9);
  row++;
  sheet.getRange(row, 1).setValue('訂金 (50%): $' + (data.deposit || 0).toLocaleString() + '　確認訂單時支付').setFontSize(9);
  row++;
  sheet.getRange(row, 1).setValue('尾款 (50%): $' + (data.balance || 0).toLocaleString() + '　活動結束後14個工作天內支付').setFontSize(9);
  row += 2;

  // Terms
  sheet.getRange(row, 1, 1, 5).merge().setValue(
    '注意事項：\n' +
    '1. 確認訂單後請支付訂金，始完成訂單預約。\n' +
    '2. 若已支付訂金，因不可抗力或臨時異動取消活動，將評估已產出之成本酌收作業費。\n' +
    '3. 設計物相關素材請依團隊排程時間提供，避免額外修改費用。'
  ).setFontSize(8).setFontColor('#666666').setWrap(true);

  SpreadsheetApp.flush();

  // Export as PDF
  var ssId = ss.getId();
  var pdfBlob = exportSheetAsPDF(ssId);

  // Set spreadsheet to "anyone with link can view"
  var file = DriveApp.getFileById(ssId);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Move to folder if specified
  if (SAVE_FOLDER_ID) {
    try {
      var folder = DriveApp.getFolderById(SAVE_FOLDER_ID);
      folder.addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    } catch (err) {
      Logger.log('Folder error: ' + err.message);
    }
  }

  // Save PDF and set sharing
  if (pdfBlob) {
    var pdfFile;
    if (SAVE_FOLDER_ID) {
      try {
        pdfFile = DriveApp.getFolderById(SAVE_FOLDER_ID).createFile(pdfBlob);
      } catch (err) {
        pdfFile = DriveApp.createFile(pdfBlob);
      }
    } else {
      pdfFile = DriveApp.createFile(pdfBlob);
    }
    // Set PDF to "anyone with link can view"
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { sheetUrl: ss.getUrl(), pdfUrl: pdfFile.getUrl() };
  }

  return { sheetUrl: ss.getUrl(), pdfUrl: '' };
}

function exportSheetAsPDF(ssId) {
  try {
    var url = 'https://docs.google.com/spreadsheets/d/' + ssId + '/export?' +
      'format=pdf&portrait=true&size=A4&scale=4&gridlines=false&' +
      'top_margin=0.4&bottom_margin=0.4&left_margin=0.5&right_margin=0.5';

    var token = ScriptApp.getOAuthToken();
    var response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      return response.getBlob().setName('報價單_' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd') + '.pdf');
    }
  } catch (err) {
    Logger.log('PDF export error: ' + err.message);
  }
  return null;
}

// ===== Email =====
function sendQuoteEmail(data) {
  var to = data.to;
  var quoteData = data.quoteData;
  if (!to || !quoteData) return jsonResp({ error: 'Missing to/quoteData' });

  var subject = '報價單 ' + (quoteData.quoteId || '') + ' - 異品科技';
  var body = (quoteData.info.clientName || '') + ' 您好，\n\n' +
    '附上報價單 ' + (quoteData.quoteId || '') + '，含稅總計 $' + (quoteData.total || 0).toLocaleString() + '。\n\n' +
    '如有任何問題歡迎聯繫。\n\n' +
    '異品科技股份有限公司';

  var options = {};

  // Try to attach PDF
  if (quoteData.pdfUrl) {
    // not easily attachable from URL in Apps Script without fetching
  }

  // Generate fresh PDF
  try {
    var result = generateQuotePDF(quoteData);
    if (result.pdfUrl) {
      var pdfFile = DriveApp.getFileById(extractFileId(result.pdfUrl));
      options.attachments = [pdfFile.getBlob()];
    }
  } catch (err) {
    Logger.log('Email PDF error: ' + err.message);
  }

  try {
    GmailApp.sendEmail(to, subject, body, options);
    return jsonResp({ success: true, to: to });
  } catch (err) {
    return jsonResp({ error: 'Email failed: ' + err.message });
  }
}

function extractFileId(url) {
  var match = url.match(/[-\w]{25,}/);
  return match ? match[0] : '';
}

// ===== LINE Notify =====
function sendLINENotify(data) {
  var token = data.token;
  var message = data.message;
  if (!token || !message) return jsonResp({ error: 'Missing token/message' });

  try {
    var response = UrlFetchApp.fetch('https://notify-api.line.me/api/notify', {
      method: 'post',
      headers: { Authorization: 'Bearer ' + token },
      payload: { message: message },
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code === 200) {
      return jsonResp({ success: true });
    } else {
      return jsonResp({ error: 'LINE API error: ' + code + ' ' + response.getContentText() });
    }
  } catch (err) {
    return jsonResp({ error: 'LINE error: ' + err.message });
  }
}

// ===== Game Leaderboard Support (backward compatible) =====
var GAME_SHEETS = {
  rhythm:  { scores: 'Rhythm',  config: 'Rhythm_Config' },
  pacman:  { scores: 'PacMan',  config: 'PacMan_Config' },
};

var GAME_DEFAULTS = {
  rhythm: [['key', 'value'], ['secretMessage', 'openthedoor'], ['passThreshold', '3000']],
  pacman: [['key', 'value'], ['secretMessage', 'openthedoor'], ['passThreshold', '3000']],
};

function handleGameGet(e, game) {
  var action = e.parameter.action;
  if (action === 'getScores') return getScores(game);
  if (action === 'getConfig') return getGameConfig(game);
  return jsonResp({ error: 'Unknown game action' });
}

function handleGamePost(data, game) {
  if (data.action === 'addScore') return addScore(game, data.name, data.score);
  if (data.action === 'setConfig') return setGameConfig(game, data.key, data.value);
  return jsonResp({ error: 'Unknown game action' });
}

function getScores(game) {
  var mapping = GAME_SHEETS[game];
  if (!mapping) return jsonResp([]);
  var sheet = getOrCreateSheet(mapping.scores, ['name', 'score', 'date']);
  var data = sheet.getDataRange().getValues();
  var all = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && !isNaN(Number(data[i][1]))) {
      all.push({ name: data[i][0], score: Number(data[i][1]), date: data[i][2] });
    }
  }
  var byName = {};
  for (var j = 0; j < all.length; j++) {
    if (!byName[all[j].name] || all[j].score > byName[all[j].name].score) {
      byName[all[j].name] = all[j];
    }
  }
  var scores = Object.keys(byName).map(function(k) { return byName[k]; });
  scores.sort(function(a, b) { return b.score - a.score; });
  return jsonResp(scores.slice(0, 10));
}

function addScore(game, name, score) {
  var mapping = GAME_SHEETS[game];
  if (!mapping) return jsonResp({ error: 'Unknown game' });
  if (!name || typeof score !== 'number') return jsonResp({ error: 'Invalid data' });
  name = String(name).replace(/<[^>]*>/g, '').substring(0, 12);
  var sheet = getOrCreateSheet(mapping.scores, ['name', 'score', 'date']);
  sheet.appendRow([name, score, new Date().toISOString().slice(0, 10)]);
  return jsonResp({ success: true });
}

function getGameConfig(game) {
  var mapping = GAME_SHEETS[game];
  if (!mapping) return jsonResp({});
  var defaults = GAME_DEFAULTS[game] || [['key', 'value']];
  var sheet = getOrCreateSheet(mapping.config, defaults[0]);
  // Check if config sheet is empty (only header)
  if (sheet.getLastRow() <= 1 && defaults.length > 1) {
    for (var d = 1; d < defaults.length; d++) {
      sheet.appendRow(defaults[d]);
    }
  }
  var data = sheet.getDataRange().getValues();
  var config = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) config[data[i][0]] = data[i][1];
  }
  return jsonResp(config);
}

function setGameConfig(game, key, value) {
  var mapping = GAME_SHEETS[game];
  if (!mapping) return jsonResp({ error: 'Unknown game' });
  if (!key) return jsonResp({ error: 'Missing key' });
  var sheet = getOrCreateSheet(mapping.config, ['key', 'value']);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return jsonResp({ success: true });
    }
  }
  sheet.appendRow([key, value]);
  return jsonResp({ success: true });
}

function getQuoteConfig() {
  var sheet = getOrCreateSheet('Quote_Config', ['key', 'value']);
  var data = sheet.getDataRange().getValues();
  var config = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) config[data[i][0]] = data[i][1];
  }
  return jsonResp(config);
}
