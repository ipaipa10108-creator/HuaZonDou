# 燒腦華榮道 (HuaZonDou) - React Vite 版

經典的拼圖滑塊遊戲，採用 React + Vite + TypeScript 改寫，具備現代化的 UI/UX 設計與 Google Sheets 成績連動功能。

## ✨ 特色功能

### 🎮 遊戲模式
- **經典模式**：標準的滑塊拼圖，支援「數字模式」與「圖片模式」（內建 26 款美圖）。
- **作弊模式 (🃏)**：內建趣味作弊功能（任意交換方塊），需等待時間冷卻。
- **盲解模式 (😎)**：挑戰記憶力！
    - 啟用後計時器會**增加 10 秒**並**暫停**。
    - 所有方塊翻面顯示木紋，隱藏數字/圖案。
    - 再次點擊按鈕可切換回正常模式，計時器繼續。
- **轉珠模式 (🔮)**：
    - 空白格變身為「靈珠」。
    - 支援**拖曳移動**（電腦滑鼠或手機觸控），像轉珠遊戲一樣快速交換位置。
    - 每一次交換都算一步，適合快速調整版面。

### ⚙️ 自訂體驗
- **自訂圖片/尺寸**：可上傳自訂圖片或設定 3x3 ~ 10x10 棋盤。
- **轉珠靈敏度調整**：可於設定中調整轉珠模式的拖曳靈敏度 (5ms ~ 250ms)，適應不同設備的操作手感。
- **特殊紀錄**：通關後會記錄您是否使用了特殊功能（🃏🔮😎），並顯示在排行榜上。
- **操作優化**：流暢的動畫效果，完整支援手機觸控操作。

### 🏆 雲端排行榜
- 通關成績自動同步至 Google Sheets。
- 支援顯示「通關時間」、「步數」以及「特殊模式使用狀況」。
- PWA 支援：可安裝至手機桌面，離線遊玩（亦可同步成績）。

---

## 🚀 快速開始

### 環境需求
- Node.js 18+
- npm 或 yarn

### 安裝與啟動
1. 克隆專案或下載原始碼。
2. 在根目錄建立 `.env` 檔案，參考 `.env.example` 配置：
   ```env
   VITE_GOOGLE_APP_SCRIPT_URL=您的_Google_Apps_Script_URL
   VITE_BASE_URL=/HuaZonDou/
   ```
3. 安裝依賴並啟動：
   ```bash
   npm install
   npm run dev
   ```

---

## 📊 Google Sheets 整合指南

為了讓排行榜能正確顯示「特殊模式」紀錄，請更新您的 Google Apps Script。

1. 建立一份 Google 試算表，重新命名工作表為「**紀錄**」。
2. 資料欄位建議（第一列）：`ID`、`關卡`、`通關時間`、`作弊次數`、`移動步數`、`提交時間`、**`特殊模式`**。
3. 點選「擴充功能」 > 「Apps Script」。
4. 貼上以下 **最新版** 程式碼：

### Google Apps Script (v2.0)
```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('紀錄') || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const data = JSON.parse(e.postData.contents);
  
  // 記錄特殊模式 (如果前端有傳送 specialModes 則記錄，否則留空)
  const specialModes = data.specialModes || "";
  
  sheet.appendRow([
    data.playerId,
    data.level,
    "'" + data.time, // 強制字串格式
    data.cheatCount,
    data.moves || 0,
    new Date().toLocaleString('zh-TW'),
    specialModes // 新增欄位
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
    
    // 自動尋找欄位位置 (支援模糊匹配)
    const getCol = (keys) => headers.findIndex(h => keys.some(k => String(h).includes(k)));
    
    const levelIdx = getCol(['關卡', 'Level']);
    const timeIdx = getCol(['通關時間', 'Time']);
    const idIdx = getCol(['ID', 'Player']);
    const cheatIdx = getCol(['作弊', 'Cheat']);
    const moveIdx = getCol(['步數', 'Move']);
    // 特殊模式欄位
    const specialIdx = getCol(['特殊', 'Special', 'Mode']);
    
    let tsIdx = getCol(['提交', 'Timestamp', 'Date']);
    if (tsIdx === -1) tsIdx = 5; // 預設第 6 欄
    
    // 過濾資料
    let records = rows.filter(row => {
      const rowLevel = String(row[levelIdx] || '');
      // 支援忽略空格比對
      return rowLevel === level || rowLevel.replace(/\s/g, '') === level.replace(/\s/g, '');
    }).map(row => {
      let tsVal = row[tsIdx];
      if (tsVal instanceof Date) {
        tsVal = tsVal.toLocaleString('zh-TW', { hour12: false }); 
      }
      
      return {
        playerId: String(row[idIdx]),
        level: String(row[levelIdx]),
        time: String(row[timeIdx]), 
        cheatCount: parseInt(row[cheatIdx] || 0),
        moves: parseInt(row[moveIdx] || 0),
        timestamp: String(tsVal || ''),
        // 回傳特殊模式字串 (例如 "🃏🔮")
        specialModes: specialIdx !== -1 ? String(row[specialIdx] || '') : ""
      };
    });
    
    // 排序邏輯 (前端會再處理一次，這裡做初步排序)
    // 1. 特殊模式少的優先 (長度短優先) ? 或是暫時不排，交給前端
    
    return createJsonResponse({ records: records });
  }
  
  if (action === 'levels') {
    // 這裡可以實作讀取遠端關卡列表的功能
    return createJsonResponse({ levels: [] });
  }

  return createJsonResponse({ status: 'ok' });
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
```
5. 點選「部署」 > 「管理部署」 > 「新部署」，將權限設定為「任何人」。
6. 更新 `.env` 中的 `VITE_GOOGLE_APP_SCRIPT_URL`。

## 🛠️ 技術棧
- **框架**: React 18, Vite
- **語言**: TypeScript
- **樣式**: Vanilla CSS (現代化變數設計)
- **部署**: GitHub Actions + GitHub Pages

## 📱 桌布/書籤圖示
本專案已配置 PWA 支援。使用行動裝置開啟網頁後，點選瀏覽器的「加入主螢幕」即可看到精美的遊戲圖示。

## 📜 授權
MIT License
