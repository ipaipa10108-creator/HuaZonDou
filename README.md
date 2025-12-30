# 燒腦華榮道 (HuaZonDou) - React Vite 版

經典的拼圖滑塊遊戲，採用 React + Vite + TypeScript 改寫，具備現代化的 UI/UX 設計與 Google Sheets 成績連動功能。

## ✨ 特色功能
- **兩種模式**：支援「數字模式」與「圖片模式」（內建 26 款美圖）。
- **自訂體驗**：可上傳自訂圖片或自訂棋盤尺寸 (3x3 ~ 10x10)。
- **操作優化**：流暢的動畫效果，支援點擊與觸控。
- **作弊模式**：內建趣味作弊功能（任意交換方塊），需等待時間冷卻。
- **成績連動**：通關成績自動同步至 Google Sheets，並記錄本地排行榜。
- **PWA 支援**：可安裝至手機桌面，離線使用。

## 🚀 快速開始

### 環境需求
- Node.js 18+
- npm 或 yarn

### 安裝步驟
1. 克隆專案或下載原始碼。
2. 在根目錄建立 `.env` 檔案，參考 `.env.example` 配置：
   ```env
   VITE_GOOGLE_APP_SCRIPT_URL=您的_Google_Apps_Script_URL
   VITE_BASE_URL=/HuaZonDou/
   ```
3. 安裝依賴項目：
   ```bash
   npm install
   ```
4. 啟動開發伺服器：
   ```bash
   npm run dev
   ```
5. 建立生產版本：
   ```bash
   npm run build
   ```

## 📊 Google Sheets 整合指南
1. 建立一份 Google 試算表，重新命名工作表為「紀錄」。
2. 資料欄位建議：`ID`、`關卡`、`通關時間`、`作弊次數`、`移動步數`、`提交時間`。
3. 點選「擴充功能」 > 「Apps Script」。
4. 貼上以下優化過的程式碼（支援全球排行榜自動排序）：

### Google Apps Script 完整程式碼
```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('紀錄') || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const data = JSON.parse(e.postData.contents);
  
  // 為了防止 Google Sheets 自動將 MM:SS 轉為日期，我們在前面加上單引號 "'" 強制設為字串
  sheet.appendRow([
    data.playerId,
    data.level,
    "'" + data.time,
    data.cheatCount,
    data.moves || 0,
    new Date().toLocaleString('zh-TW')
  ]);
  
  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = e.parameter.action;
  const level = e.parameter.level;
  
  if (action === 'leaderboard') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('紀錄') || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) return createJsonResponse({ records: [] });
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // 自動尋找欄位位置 (支援中文標頭)
    const levelIdx = headers.indexOf('關卡');
    const timeIdx = headers.indexOf('通關時間');
    const idIdx = headers.indexOf('ID');
    const cheatIdx = headers.indexOf('作弊次數');
    const moveIdx = Math.max(headers.indexOf('移動步數'), headers.indexOf('步數'));
    
    // 強健的日期欄位搜尋：
    let tsIdx = headers.indexOf('提交時間');
    if (tsIdx === -1) tsIdx = headers.findIndex(h => String(h).includes('提交'));
    if (tsIdx === -1) tsIdx = 5;
    
    // 過濾資料
    let records = rows.filter(row => {
      const rowLevel = String(row[levelIdx] || '');
      return rowLevel === level || rowLevel.replace(/\s/g, '') === level.replace(/\s/g, '');
    }).map(row => {
      let tsVal = row[tsIdx];
      if (tsVal instanceof Date) {
        tsVal = tsVal.toLocaleString('zh-TW', { hour12: false }); 
      }
      
      return {
        playerId: row[idIdx],
        level: row[levelIdx],
        time: String(row[timeIdx]), 
        cheatCount: parseInt(row[cheatIdx] || 0),
        moves: parseInt(row[moveIdx] || 0),
        timestamp: String(tsVal || ''),
        // === DEBUG 資訊 ===
        debug_headers: headers, // 回傳標頭
        debug_row: row          // 回傳整列資料
      };
    });
    
    return createJsonResponse({ records: records });
  }
  return createJsonResponse({ status: 'ok' });
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
```
5. 點選「部署」 > 「管理部署」 > 「新部署」，將權限設定為「任何人」。
6. 複製生成的 Web App URL 並填入 `.env`。

## 🛠️ 技術棧
- **框架**: React 18
- **建構工具**: Vite
- **語言**: TypeScript
- **樣式**: Vanilla CSS (現代化變數設計)
- **音效**: Web Audio API
- **部署**: GitHub Actions + GitHub Pages

## 📱 桌布/書籤圖示
本專案已配置 PWA 支援。使用行動裝置開啟網頁後，點選瀏覽器的「加入主螢幕」即可看到精美的遊戲圖示。

## 📜 授權
MIT License
