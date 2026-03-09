import { createClient } from "@libsql/client/web";
import { GameResult } from '../types';

const VITE_TURSO_DB_URL = import.meta.env.VITE_TURSO_DATABASE_URL || "";
const VITE_TURSO_AUTH_TOKEN = import.meta.env.VITE_TURSO_AUTH_TOKEN || "";

export const isTursoConfigured = !!VITE_TURSO_DB_URL && !!VITE_TURSO_AUTH_TOKEN;

// 確保瀏覽器使用 HTTP(S) 而非 libsql:// (wss) 來避免跨域或通訊協定問題
const formatUrlForWeb = (url: string) => {
    return url.replace(/^libsql:\/\//, 'https://');
};

export const tursoClient = isTursoConfigured ? createClient({
    url: formatUrlForWeb(VITE_TURSO_DB_URL),
    authToken: VITE_TURSO_AUTH_TOKEN,
}) : null;

// 初始化資料庫 (若表格不存在則建立)
export const initTursoDb = async () => {
    if (!tursoClient) return;
    try {
        await tursoClient.batch([
            `CREATE TABLE IF NOT EXISTS leaderboard (
                id TEXT PRIMARY KEY,
                player_id TEXT NOT NULL,
                level TEXT NOT NULL,
                time TEXT NOT NULL,
                moves INTEGER NOT NULL,
                cheat_count INTEGER NOT NULL,
                timestamp TEXT NOT NULL,
                special_modes TEXT
            )`
        ], "write");
        console.log("Turso DB verified/initialized.");
    } catch (e) {
        console.error("Failed to initialize Turso DB:", e);
    }
};

// 進入應用時確保 DB 被初始化
if (isTursoConfigured) {
    initTursoDb();
}
