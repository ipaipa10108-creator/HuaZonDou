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

            // 1. 處理通關時間 (使用 Regex 統一擷取 HH:MM:SS 部分，不論格式)
            // 匹配例如 "01:31:00" 或 "1899-12-30T01:31:00" 或 "Sat Dec 30 1899 01:31:00"
            const timeMatch = timeRaw.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})/);

            if (timeMatch) {
                // Sheets 的特性：1:31 (MM:SS) 會被儲存為 01:31:00 (HH:MM:SS)
                // 所以：第一組是分，第二組是秒
                const mins = parseInt(timeMatch[1]);
                const secs = parseInt(timeMatch[2]);
                formattedTime = `${mins}分${secs}秒`;
            } else {
                // 備用處理：如果是傳統 MM:SS 且沒有第三段秒
                const simpleMatch = timeRaw.match(/(\d{1,2}):(\d{1,2})/);
                if (simpleMatch) {
                    formattedTime = `${parseInt(simpleMatch[1])}分${parseInt(simpleMatch[2])}秒`;
                } else {
                    formattedTime = timeRaw;
                }
            }

            // 2. 處理提交日期 (僅提取 YYYY/MM/DD)
            if (tsRaw) {
                try {
                    const d = new Date(tsRaw);
                    if (!isNaN(d.getTime())) {
                        dateStr = `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
                    }
                } catch (e) {
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
