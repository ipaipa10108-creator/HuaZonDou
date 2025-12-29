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
        const mappedRecords = rawRecords.map((item: any) => ({
            playerId: item.playerId || item['ID'] || item['帳號'] || '神秘玩家',
            level: item.level || item['關卡'] || item['關卡名稱'] || level,
            time: item.time || item['通關時間'] || item['時間'] || '00:00',
            moves: parseInt(item.moves || item['步數'] || item['移動步數'] || '0'),
            cheatCount: parseInt(item.cheatCount || item['作弊次數'] || item['作弊'] || '0'),
            timestamp: item.timestamp || item['提交時間'] || item['時間戳記'] || ''
        }))

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
