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
2. 資料欄位建議：`ID`、`關卡`、`通關時間`、`作弊次數`、`提交時間`。
3. 點選「擴充功能」 > 「Apps Script」。
4. 貼上實作計畫中提供的 `doPost` 程式碼。
5. 點選「部署」 > 「新部署」，將權限設定為「任何人」。
6. 複製生成的 Web App URL 並填入 `.env`。

## Google Apps Script 範例
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('紀錄');
  const data = JSON.parse(e.postData.contents);
  
  sheet.appendRow([
    data.playerId,
    data.level,
    data.time,
    data.cheatCount,
    new Date().toLocaleString('zh-TW')
  ]);
  
  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  // 可用於取得排名等功能
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

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
