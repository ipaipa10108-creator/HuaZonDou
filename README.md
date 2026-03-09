# 燒腦華榮道 (HuaZonDou) - React Vite 版

經典的拼圖滑塊遊戲，採用 React + Vite + TypeScript 改寫，具備現代化的 UI/UX 設計與 **Turso (SQLite)** 成績排行榜功能。

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
- 通關成績自動同步至 **Turso (LibSQL/SQLite) 雲端資料庫**，極速讀寫不卡頓。
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
   VITE_TURSO_DATABASE_URL=你的_Turso_DB_URL
   VITE_TURSO_AUTH_TOKEN=你的_Turso_Auth_Token
   VITE_BASE_URL=/HuaZonDou/
   ```
3. 安裝依賴並啟動：
   ```bash
   npm install
   npm run dev
   ```

---

## 📊 資料庫配置 (Turso)

1. 前往 [Turso Dashboard](https://turso.tech) 建立新的 Database。
2. 取得 Database URL 與 Auth Token，放入 `.env`。
3. 應用程式首次啟動時，若連線成功會自動執行 `CREATE TABLE IF NOT EXISTS leaderboard` 完成初始化。

## 🛠️ 技術棧
- **框架**: React 18, Vite
- **語言**: TypeScript
- **資料庫**: Turso (libSQL)
- **樣式**: Vanilla CSS (現代化變數設計)
- **部署**: GitHub Actions + GitHub Pages

## 📱 桌布/書籤圖示
本專案已配置 PWA 支援。使用行動裝置開啟網頁後，點選瀏覽器的「加入主螢幕」即可看到精美的遊戲圖示。

## 📜 授權
MIT License
