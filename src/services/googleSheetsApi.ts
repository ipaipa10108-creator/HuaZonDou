import { GameResult } from '../types'

const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL || ''

/**
 * 提交遊戲成績至 Google Sheets
 */
export async function submitScore(result: GameResult): Promise<{ success: boolean; error?: string }> {
    if (!GOOGLE_SCRIPT_URL) {
        console.warn('Google Apps Script URL 未設定')
        return { success: false, error: 'Google Apps Script URL 未設定' }
    }

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(result),
        })
        console.log('成績提交請求已發送', result)
        return { success: true }
    } catch (error) {
        console.error('提交成績失敗:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : '提交失敗'
        }
    }
}

/**
 * 取得排行榜
 */
export async function getLeaderboard(level: string): Promise<GameResult[]> {
    if (!GOOGLE_SCRIPT_URL) {
        return []
    }

    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=leaderboard&level=${encodeURIComponent(level)}`
        const response = await fetch(url)
        const data = await response.json()
        const rawRecords = data.records || data.data || []

        const mappedRecords: GameResult[] = rawRecords.map((item: any) => {
            let timeRaw = item.time || item['通關時間'] || item['時間'] || '00:00';
            let formattedTime = '00:00';

            // 處理 Google Sheets 傳回的日期字串
            if (typeof timeRaw === 'string' && timeRaw.includes('T')) {
                try {
                    const date = new Date(timeRaw);
                    // 根據使用者截圖，1:31 在 Sheets 被視為 01:31:00 (HH:MM:SS)
                    // 所以獲取分鐘和秒數即可
                    const m = date.getUTCMinutes();
                    const s = date.getUTCSeconds();
                    formattedTime = `${m}分${s}秒`;
                } catch (e) {
                    formattedTime = String(timeRaw);
                }
            } else if (typeof timeRaw === 'string' && timeRaw.includes(':')) {
                const parts = timeRaw.split(':');
                if (parts.length === 2) {
                    formattedTime = `${parseInt(parts[0])}分${parseInt(parts[1])}秒`;
                } else if (parts.length === 3) {
                    // HH:MM:SS 情況下，中間的是分，最後的是秒
                    formattedTime = `${parseInt(parts[1])}分${parseInt(parts[2])}秒`;
                }
            } else {
                formattedTime = String(timeRaw);
            }

            // 處理日期格式
            const tsRaw = item.timestamp || item['提交時間'] || item['時間戳記'] || '';
            let dateStr = '';
            if (tsRaw) {
                try {
                    const d = new Date(tsRaw);
                    if (!isNaN(d.getTime())) {
                        dateStr = `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
                    }
                } catch (e) { }
            }

            return {
                playerId: String(item.playerId || item['ID'] || item['帳號'] || '神秘玩家'),
                level: String(item.level || item['關卡'] || item['關卡名稱'] || level),
                time: formattedTime,
                moves: parseInt(String(item.moves || item['步數'] || item['移動步數'] || item['次數'] || '0')),
                cheatCount: parseInt(String(item.cheatCount || item['作弊次數'] || item['作弊'] || '0')),
                timestamp: dateStr
            };
        });

        return mappedRecords;
    } catch (error) {
        console.error('取得排行榜失敗:', error);
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
