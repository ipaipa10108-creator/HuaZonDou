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
        // 加入時間戳記避免瀏覽器快取
        const url = `${GOOGLE_SCRIPT_URL}?action=leaderboard&level=${encodeURIComponent(level)}&_t=${new Date().getTime()}`
        const response = await fetch(url)
        const data = await response.json()
        const rawRecords = data.records || data.data || []



        const mappedRecords: GameResult[] = rawRecords.map((item: any) => {
            // Helper to find value loosely
            const getValue = (targetKeys: string[]) => {
                const itemKeys = Object.keys(item);
                // 1. Exact match
                for (const k of targetKeys) {
                    if (item[k] !== undefined) return item[k];
                }
                // 2. Case-insensitive & trimmed match
                const normalizedTargetKeys = targetKeys.map(k => k.toLowerCase().replace(/\s/g, ''));
                for (const k of itemKeys) {
                    const normalizedK = k.toLowerCase().replace(/\s/g, '');
                    if (normalizedTargetKeys.includes(normalizedK)) return item[k];
                }
                return undefined;
            };

            const timeRaw = String(getValue(['time', '通關時間', '時間']) || item.time || item['通關時間'] || '00:00');

            // 擴充 timestamp 的關鍵字
            const tsRaw = String(
                getValue(['timestamp', 'Timestamp', 'date', 'Date', '提交時間', '時間戳記', '日期', 'created_at', 'createdAt', 'Submission Time']) ||
                item.timestamp || ''
            );

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

            // 2. 處理提交日期 (強制使用 Regex 提取 YYYY/MM/DD，忽略後續時間或中文)
            if (tsRaw) {
                // 優先尋找 YYYY/MM/DD 或 YYYY-MM-DD
                let match = tsRaw.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
                if (match) {
                    dateStr = `${match[1]}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}`;
                } else {
                    // 若無年份，嘗試尋找 MM/DD
                    match = tsRaw.match(/(\d{1,2})[\/\-](\d{1,2})/);
                    if (match) {
                        // 假設為今年 ?? 或是直接顯示原字串
                        // 這裡為了保險起見，若無法識別完整日期，就保留原字串的前10個字元作為參考，或者給空
                        // 但既然 raw data 明顯有日期，通常上面的 regex 就會中了
                        dateStr = tsRaw.split(' ')[0]; // 簡單 fallback
                    }
                }
            }

            // 3. 按照需求合併顯示： "1分31秒 (2025/12/30)"
            // 修改：不再合併，讓 UI 自行決定如何顯示，這裡只回傳純淨的時間字串
            const finalDisplayTime = formattedTime;

            return {
                playerId: String(item.playerId || item['ID'] || item['帳號'] || item['玩家'] || '神秘玩家'),
                level: String(item.level || item['關卡'] || item['關卡名稱'] || level),
                time: finalDisplayTime,
                moves: parseInt(String(item.moves || item['步數'] || item['移動步數'] || item['次數'] || '0')),
                cheatCount: parseInt(String(item.cheatCount || item['作弊次數'] || item['作弊'] || '0')),
                timestamp: dateStr
            };
        });

        // 排序逻辑移至 API 层：
        // 1. 作弊次數：少者優先
        // 2. 通關時間：短者優先
        // 3. 移動步數：少者優先
        const sortedRecords = mappedRecords.sort((a, b) => {
            // 1. 作弊次數
            if (a.cheatCount !== b.cheatCount) {
                return a.cheatCount - b.cheatCount;
            }

            // 2. 通關時間
            const getTimeInSeconds = (timeStr: string) => {
                const minuteMatch = timeStr.match(/(\d+)分/);
                const secondMatch = timeStr.match(/(\d+)秒/);
                let totalSeconds = 0;
                if (minuteMatch) totalSeconds += parseInt(minuteMatch[1]) * 60;
                if (secondMatch) totalSeconds += parseInt(secondMatch[1]);
                if (totalSeconds > 0) return totalSeconds;

                // 備用解析
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

            // 3. 移動步數
            return a.moves - b.moves;
        });

        return sortedRecords;
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
