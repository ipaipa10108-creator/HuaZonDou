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
            const timeRaw = String(item.time || item['通關時間'] || item['時間'] || '00:00');
            const tsRaw = String(item.timestamp || item['提交時間'] || item['時間戳記'] || '');

            let formattedTime = '00:00';
            let dateStr = '';

            // 1. 處理通關時間 (絕對不使用 new Date() 解析，避免時區偏移)
            if (timeRaw.includes('T')) {
                // ISO 格式：1899-12-30T01:31:00.000Z
                // 我們只關心時間部分 HH:MM:SS
                const timePart = timeRaw.split('T')[1] || '';
                const parts = timePart.split(':');
                if (parts.length >= 2) {
                    // Sheets 的轉型特性：1:31 (MM:SS) 會變成 01:31:00 (HH:MM:SS)
                    // 所以：第一位是分，第二位是秒
                    const mm = parseInt(parts[0]);
                    const ss = parseInt(parts[1]);
                    formattedTime = `${mm}分${ss}秒`;
                } else {
                    formattedTime = timeRaw;
                }
            } else if (timeRaw.includes(':')) {
                // 普通冒號格式
                const parts = timeRaw.split(':');
                if (parts.length === 3) {
                    // HH:MM:SS
                    formattedTime = `${parseInt(parts[1])}分${parseInt(parts[2])}秒`;
                } else if (parts.length === 2) {
                    // MM:SS
                    formattedTime = `${parseInt(parts[0])}分${parseInt(parts[1])}秒`;
                } else {
                    formattedTime = timeRaw;
                }
            } else {
                formattedTime = timeRaw;
            }

            // 2. 處理提交日期 (僅提取 YYYY/MM/DD)
            if (tsRaw) {
                try {
                    // 提交時間是正常的當前時間，可以用 Date 解析
                    const d = new Date(tsRaw);
                    if (!isNaN(d.getTime())) {
                        dateStr = `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
                    }
                } catch (e) {
                    // 如果解析失敗，試著用簡單的字串截取
                    const match = tsRaw.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
                    if (match) {
                        dateStr = `${match[1]}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}`;
                    }
                }
            }

            // 3. 按照需求合併顯示： "1分31秒 (2025/12/30)"
            const finalDisplayTime = dateStr ? `${formattedTime} (${dateStr})` : formattedTime;

            return {
                playerId: String(item.playerId || item['ID'] || item['帳號'] || '神秘玩家'),
                level: String(item.level || item['關卡'] || item['關卡名稱'] || level),
                time: finalDisplayTime,
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
