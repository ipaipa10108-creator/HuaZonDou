import { Player, HighScore } from '../types'

const STORAGE_KEYS = {
    PLAYER: 'huazondou_player',
    HIGH_SCORES: 'puzzleHighScores',
    MUTED: 'huazondou_muted',
    PIXABAY_KEY: 'huazondou_pixabay_key',
} as const

export const storage = {
    // 玩家資訊
    getPlayer(): Player | null {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.PLAYER)
            return data ? JSON.parse(data) : null
        } catch {
            return null
        }
    },

    setPlayer(player: Player): void {
        try {
            localStorage.setItem(STORAGE_KEYS.PLAYER, JSON.stringify(player))
        } catch (e) {
            console.warn('儲存玩家資訊失敗:', e)
        }
    },

    removePlayer(): void {
        try {
            localStorage.removeItem(STORAGE_KEYS.PLAYER)
        } catch (e) {
            console.warn('移除玩家資訊失敗:', e)
        }
    },

    // 高分記錄
    getHighScores(): Record<string, HighScore[]> {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.HIGH_SCORES)
            return data ? JSON.parse(data) : {}
        } catch {
            return {}
        }
    },

    setHighScores(scores: Record<string, HighScore[]>): void {
        try {
            localStorage.setItem(STORAGE_KEYS.HIGH_SCORES, JSON.stringify(scores))
        } catch (e) {
            console.warn('儲存高分記錄失敗:', e)
        }
    },

    saveHighScore(key: string, score: HighScore): boolean {
        const scores = this.getHighScores()
        if (!Array.isArray(scores[key])) {
            scores[key] = []
        }

        // 檢查是否應該新增
        const isNewHighScore = scores[key].length < 3 ||
            scores[key].some(existing => {
                const parseTime = (t: string) => {
                    if (!t || !t.includes(':')) return Infinity
                    const parts = t.split(':').map(Number)
                    return parts[0] * 60 + parts[1]
                }
                const timeExist = parseTime(existing.time)
                const timeNew = parseTime(score.time)
                if (!score.cheatUsed && existing.cheatUsed) return true
                if (score.cheatUsed === existing.cheatUsed) {
                    if (timeNew < timeExist) return true
                    if (timeNew === timeExist && score.moves < existing.moves) return true
                }
                return false
            })

        if (isNewHighScore) {
            scores[key].push(score)
            scores[key].sort((a, b) => {
                if (a.cheatUsed !== b.cheatUsed) return a.cheatUsed ? 1 : -1
                const parseTime = (t: string) => {
                    if (!t || !t.includes(':')) return Infinity
                    const parts = t.split(':').map(Number)
                    return parts[0] * 60 + parts[1]
                }
                const timeA = parseTime(a.time)
                const timeB = parseTime(b.time)
                if (timeA !== timeB) return timeA - timeB
                return a.moves - b.moves
            })
            scores[key] = scores[key].slice(0, 3)
            this.setHighScores(scores)
            return true
        }
        return false
    },

    // 靜音設定
    getMuted(): boolean {
        try {
            return localStorage.getItem(STORAGE_KEYS.MUTED) === 'true'
        } catch {
            return false
        }
    },

    setMuted(muted: boolean): void {
        try {
            localStorage.setItem(STORAGE_KEYS.MUTED, String(muted))
        } catch (e) {
            console.warn('儲存靜音設定失敗:', e)
        }
    },

    // Pixabay API Key
    getPixabayKey(): string {
        try {
            return localStorage.getItem(STORAGE_KEYS.PIXABAY_KEY) || ''
        } catch {
            return ''
        }
    },

    setPixabayKey(key: string): void {
        try {
            localStorage.setItem(STORAGE_KEYS.PIXABAY_KEY, key)
        } catch (e) {
            console.warn('儲存 Pixabay API Key 失敗:', e)
        }
    },
}
