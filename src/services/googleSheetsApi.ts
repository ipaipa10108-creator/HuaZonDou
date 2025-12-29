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
            mode: 'no-cors', // Google Apps Script 需要 no-cors 模式
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(result),
        })

        // no-cors 模式下無法讀取 response，假設成功
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
 * 取得排行榜（如果 Google Apps Script 支援）
 */
export async function getLeaderboard(level: string): Promise<GameResult[]> {
    if (!GOOGLE_SCRIPT_URL) {
        return []
    }

    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=leaderboard&level=${encodeURIComponent(level)}`
        console.log(`[API 請求] GET 排行榜: ${url}`)
        const response = await fetch(url)
        const data = await response.json()
        console.log(`[API 回應] 原始數據:`, data)

        const rawRecords = data.records || data.data || []

        // 欄位對照映射表 (處理 Sheets 的中文欄位名)
        const mappedRecords = rawRecords.map((item: any) => {
            // 處理 Google Sheets 可能將 MM:SS 誤判為日期的情況
            let timeRaw = item.time || item['通關時間'] || item['時間'] || '00:00';
            let formattedTime = '00:00';

            if (typeof timeRaw === 'string' && timeRaw.includes('T') && timeRaw.includes('1899')) {
                try {
                    const date = new Date(timeRaw);
                    // Google Sheets 的基礎日期是 1899-12-30
                    // 我們計算該 Date 物件在當天的總秒數
                    const totalSeconds = (date.getUTCHours() * 3600) + (date.getUTCMinutes() * 60) + date.getUTCSeconds();

                    // 考慮到 Sheets 的 1:31 可能被儲存為 01:31:00 (H:M:S) 或 00:01:31
                    // 但對於華榮道，超過一小時的機率極低，我們直接取商數為分，餘數為秒
                    const mins = Math.floor(totalSeconds / 60);
                    const secs = totalSeconds % 60;
                    formattedTime = `${mins}分${secs}秒`;
                } catch (e) {
                    formattedTime = timeRaw;
                }
            } else if (typeof timeRaw === 'string' && timeRaw.includes(':')) {
                // 處理原始 MM:SS 格式
                const parts = timeRaw.split(':');
                if (parts.length === 2) {
                    formattedTime = `${parseInt(parts[0])}分${parseInt(parts[1])}秒`;
                } else if (parts.length === 3) {
                    // HH:MM:SS
                    const h = parseInt(parts[0]);
                    const m = parseInt(parts[1]);
                    const s = parseInt(parts[2]);
                    if (h > 0) {
                        formattedTime = `${h * 60 + m}分${s}秒`;
                    } else {
                        formattedTime = `${m}分${s}秒`;
                    }
                }
            } else {
                formattedTime = timeRaw;
            }
        }

            // 處理日期格式 (提交時間)
            let timestamp = item.timestamp || item['提交時間'] || item['時間戳記'] || '';
        let dateStr = '';
        if (timestamp) {
            try {
                const d = new Date(timestamp);
                if (!isNaN(d.getTime())) {
                    dateStr = `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
                }
            } catch (e) {
                // 解析失敗則不顯示日期
            }
        }

        return {
            playerId: item.playerId || item['ID'] || item['帳號'] || '神秘玩家',
            level: item.level || item['關卡'] || item['關卡名稱'] || level,
            time: formattedTime, // 儲存格式化後的字串，例如 "1分31秒"
            moves: parseInt(item.moves || item['步數'] || item['移動步數'] || item['次數'] || '0'),
            cheatCount: parseInt(item.cheatCount || item['作弊次數'] || item['作弊'] || '0'),
            timestamp: dateStr // 儲存 YYYY/MM/DD
        };
    });

    return mappedRecords
} catch (error) {
    console.error('取得排行榜失敗:', error)
    return []
}
}
/**
 * 取得網路關卡列表
 */
export async function getLevels(): Promise<RemoteLevel[]> {
    if (!GOOGLE_SCRIPT_URL) {
        return []
    }

    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=levels`)
        const data = await response.json()
        return data.levels || []
    } catch (error) {
        console.error('取得網路關卡失敗:', error)
        return []
    }
}

export interface RemoteLevel {
    id: string;
    name: string;
    image: string;
    size: number;
}
