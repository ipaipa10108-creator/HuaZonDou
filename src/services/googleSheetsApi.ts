import { tursoClient } from './tursoApi';
import { GameResult } from '../types'

const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL || ''

/**
 * 提交遊戲成績至 Turso Database (原 Google Sheets)
 */
export async function submitScore(result: GameResult): Promise<{ success: boolean; error?: string }> {
    if (!tursoClient) {
        console.warn('Turso Client 未初始化，可能缺少環境變數');
        return { success: false, error: '資料庫連線未設定' };
    }

    try {
        const uniqueId = `${result.playerId}_${result.level}_${Date.now()}`;

        await tursoClient.execute({
            sql: `INSERT INTO leaderboard 
            (id, player_id, level, time, moves, cheat_count, timestamp, special_modes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                uniqueId,
                result.playerId || '神秘玩家',
                result.level || '未知關卡',
                result.time || '00:00',
                result.moves || 0,
                result.cheatCount || 0,
                result.timestamp || new Date().toISOString(),
                result.specialModes || ''
            ]
        });

        console.log('成績已成功提交至 Turso', result)
        return { success: true }
    } catch (error) {
        console.error('提交成績至 Turso 失敗:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : '提交失敗'
        }
    }
}

/**
 * 從 Turso 取得排行榜
 */
export async function getLeaderboard(level: string): Promise<GameResult[]> {
    if (!tursoClient) {
        return [];
    }

    try {
        const response = await tursoClient.execute({
            sql: `SELECT * FROM leaderboard WHERE level = ?`,
            args: [level]
        });

        const mappedRecords: GameResult[] = response.rows.map((row: any) => ({
            playerId: String(row.player_id),
            level: String(row.level),
            time: String(row.time),
            moves: Number(row.moves),
            cheatCount: Number(row.cheat_count),
            timestamp: String(row.timestamp),
            specialModes: String(row.special_modes)
        }));

        // 排序邏輯：作弊次數少 -> 通關時間短 -> 移動步數少
        const sortedRecords = mappedRecords.sort((a, b) => {
            if (a.cheatCount !== b.cheatCount) {
                return a.cheatCount - b.cheatCount;
            }

            const getTimeInSeconds = (timeStr: string) => {
                const minuteMatch = timeStr.match(/(\d+)分/);
                const secondMatch = timeStr.match(/(\d+)秒/);
                let totalSeconds = 0;
                if (minuteMatch) totalSeconds += parseInt(minuteMatch[1]) * 60;
                if (secondMatch) totalSeconds += parseInt(secondMatch[1]);
                if (totalSeconds > 0) return totalSeconds;

                const parts = timeStr.replace(/\s*\(.*\)/, '').split(':')
                if (parts.length === 2) {
                    return (parseInt(parts[0]) * 60) + parseInt(parts[1])
                }
                return 99999
            }

            const timeA = getTimeInSeconds(a.time)
            const timeB = getTimeInSeconds(b.time)
            if (timeA !== timeB) {
                return timeA - timeB;
            }

            return a.moves - b.moves;
        });

        return sortedRecords;
    } catch (error) {
        console.error('從 Turso 取得排行榜失敗:', error);
        return [];
    }
}

export async function getLevels(): Promise<RemoteLevel[]> {
    if (!GOOGLE_SCRIPT_URL) return [];
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=levels`)
        const data = await response.json()
        return data.levels || []
    } catch (error) {
        return []
    }
}

export interface RemoteLevel {
    id: string;
    name: string;
    image: string;
    size: number;
}
