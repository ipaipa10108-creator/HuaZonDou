import { createClient } from "@libsql/client";
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const GOOGLE_APP_SCRIPT_URL = process.env.VITE_GOOGLE_APP_SCRIPT_URL || "https://script.google.com/macros/s/AKfycby5hT5B-yOa_J8AksCj9c1tUvG9e_zWvA8qX5Q-oP3rQW0eP7A4VZQ7R-yL_Z2x9/exec";
const VITE_TURSO_DB_URL = process.env.VITE_TURSO_DATABASE_URL;
const VITE_TURSO_AUTH_TOKEN = process.env.VITE_TURSO_AUTH_TOKEN;

if (!VITE_TURSO_DB_URL || !VITE_TURSO_AUTH_TOKEN) {
    console.error("請在 .env 中設定 VITE_TURSO_DATABASE_URL 和 VITE_TURSO_AUTH_TOKEN");
    process.exit(1);
}

const tursoClient = createClient({
    url: VITE_TURSO_DB_URL,
    authToken: VITE_TURSO_AUTH_TOKEN,
});

async function runMigration() {
    console.log("開始從 Google Sheets 獲取資料...");
    try {
        const response = await fetch(`${GOOGLE_APP_SCRIPT_URL}?action=leaderboard&level=all`);
        const result = await response.json();

        const rawRecords = result.records || result.data || [];
        if (rawRecords.length === 0) {
            console.log("從 Google Sheets 沒有抓到任何資料");
            return;
        }

        console.log(`成功獲取 ${rawRecords.length} 筆原始紀錄，準備處理並寫入 Turso...`);

        // Mapping to schema logic from googleSheetsApi.ts
        const statements = rawRecords.map((item: any) => {
            const getValue = (targetKeys: string[]) => {
                const itemKeys = Object.keys(item);
                for (const k of targetKeys) {
                    if (item[k] !== undefined) return item[k];
                }
                const normalizedTargetKeys = targetKeys.map(k => k.toLowerCase().replace(/\s/g, ''));
                for (const k of itemKeys) {
                    const normalizedK = k.toLowerCase().replace(/\s/g, '');
                    if (normalizedTargetKeys.includes(normalizedK)) return item[k];
                }
                return undefined;
            };

            const timeRaw = String(getValue(['time', '通關時間', '時間']) || item.time || item['通關時間'] || '00:00');
            const tsRaw = String(getValue(['timestamp', 'Timestamp', 'date', 'Date', '提交時間', '時間戳記', '日期', 'created_at', 'createdAt', 'Submission Time']) || item.timestamp || '');

            let formattedTime = '00:00';
            let dateStr = '';

            const timeMatch = timeRaw.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})/);
            if (timeMatch) {
                formattedTime = `${parseInt(timeMatch[1])}分${parseInt(timeMatch[2])}秒`;
            } else {
                const simpleMatch = timeRaw.match(/(\d{1,2}):(\d{1,2})/);
                if (simpleMatch) {
                    formattedTime = `${parseInt(simpleMatch[1])}分${parseInt(simpleMatch[2])}秒`;
                } else {
                    formattedTime = timeRaw;
                }
            }

            if (tsRaw) {
                let match = tsRaw.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
                if (match) {
                    dateStr = `${match[1]}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}`;
                } else {
                    dateStr = tsRaw.split(' ')[0];
                }
            }

            const playerId = String(item.playerId || item['ID'] || item['帳號'] || item['玩家'] || '神秘玩家');
            const level = String(item.level || item['關卡'] || item['關卡名稱'] || 'unknown');
            const moves = parseInt(String(item.moves || item['步數'] || item['移動步數'] || item['次數'] || '0'));
            const cheatCount = parseInt(String(item.cheatCount || item['作弊次數'] || item['作弊'] || '0'));
            const specialModes = String(getValue(['specialModes', 'special', '特殊', '特殊模式']) || item.specialModes || '');

            const uniqueId = item.id || `${playerId}_${level}_${Date.now()}_${Math.random()}`;

            return {
                sql: `INSERT INTO leaderboard 
                (id, player_id, level, time, moves, cheat_count, timestamp, special_modes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO NOTHING`,
                args: [uniqueId, playerId, level, formattedTime, moves, cheatCount, dateStr, specialModes]
            };
        });

        // Batch write to turso
        const chunkSize = 50;
        for (let i = 0; i < statements.length; i += chunkSize) {
            const chunk = statements.slice(i, i + chunkSize);
            await tursoClient.batch(chunk, "write");
            console.log(`已成功寫入 ${Math.min(i + chunkSize, statements.length)} / ${statements.length} 筆資料...`);
        }

        console.log("✅ 轉移完成！");

    } catch (error) {
        console.error("轉移過程發生錯誤:", error);
    }
}

// Ensure table exists first
tursoClient.execute(`CREATE TABLE IF NOT EXISTS leaderboard (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    level TEXT NOT NULL,
    time TEXT NOT NULL,
    moves INTEGER NOT NULL,
    cheat_count INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    special_modes TEXT
)`).then(() => {
    runMigration();
}).catch(console.error);

