import { useState, useEffect } from 'react'
import { GameSettings, Player, HighScore, GameResult } from '../types'
import { storage } from '../utils/storage'
import { submitScore, getLeaderboard } from '../services/googleSheetsApi'
import HighScores from './HighScores'
import './GameComplete.css'

interface GameCompleteProps {
    settings: GameSettings
    result: {
        time: string
        moves: number
        cheatCount: number
        specialModes?: string
    }
    player: Player
    onPlayAgain: () => void
    onBackToSetup: () => void
}

export default function GameComplete({ settings, result, player, onPlayAgain, onBackToSetup }: GameCompleteProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [isNewRecord, setIsNewRecord] = useState(false)
    const [leaderboardScores, setLeaderboardScores] = useState<GameResult[]>([])
    const [playerRank, setPlayerRank] = useState<number | null>(null)
    const [showLeaderboard, setShowLeaderboard] = useState(false)

    useEffect(() => {
        // 1. 儲存本地高分記錄
        const key = `${settings.mode}-${settings.imageIdentifier || ''}-${settings.size}`
        const newScore: HighScore = {
            levelName: settings.imageDisplayName || (settings.mode === 'number' ? '數字模式' : '圖片模式'),
            difficulty: `${settings.size}x${settings.size}`,
            time: result.time,
            moves: result.moves,
            cheatUsed: (result.cheatCount > 0) || !!result.specialModes,
            cheatCount: result.cheatCount,
            specialModes: result.specialModes
        }

        const record = storage.saveHighScore(key, newScore)
        setIsNewRecord(record)

        // 2. 自動提交到 Google Sheets
        const autoSubmit = async () => {
            setIsSubmitting(true)
            const gameResult: GameResult = {
                playerId: player.id,
                level: `${newScore.levelName} (${newScore.difficulty})`,
                time: result.time,
                moves: result.moves,
                cheatCount: result.cheatCount,
                timestamp: new Date().toISOString(),
                specialModes: result.specialModes
            }

            const res = await submitScore(gameResult)

            if (res.success) {
                setSubmitStatus('success')

                // 3. 提交成功後，載入該關卡排行榜並計算排名
                try {
                    const levelKey = gameResult.level
                    console.log(`[GameComplete] 取得排行榜: "${levelKey}"`)

                    let scores = await getLeaderboard(levelKey)

                    // Fallback: 嘗試移除空格
                    if (scores.length === 0 && levelKey.includes(' ')) {
                        scores = await getLeaderboard(levelKey.replace(/\s/g, ''))
                    }

                    setLeaderboardScores(scores)

                    // 4. 計算排名 (更加寬鬆的匹配邏輯)
                    const getTimeInSeconds = (timeStr: string) => {
                        const minuteMatch = timeStr.match(/(\d+)分/)
                        const secondMatch = timeStr.match(/(\d+)秒/)
                        if (minuteMatch || secondMatch) {
                            let totalSeconds = 0
                            if (minuteMatch) totalSeconds += parseInt(minuteMatch[1]) * 60
                            if (secondMatch) totalSeconds += parseInt(secondMatch[1])
                            return totalSeconds
                        }
                        const parts = timeStr.split(':')
                        if (parts.length === 2) {
                            return parseInt(parts[0]) * 60 + parseInt(parts[1])
                        }
                        return 0
                    }

                    const currentSeconds = getTimeInSeconds(gameResult.time)

                    // 尋找剛剛提交的成績
                    // 策略：符合 ID 且時間/步數完全吻合 (忽略作弊次數/特殊模式，避免解析誤差)
                    const rankIndex = scores.findIndex(s => {
                        const isIdMatch = s.playerId === gameResult.playerId
                        const isTimeMatch = Math.abs(getTimeInSeconds(s.time) - currentSeconds) < 2 // 容許 2 秒誤差
                        const isMoveMatch = s.moves === gameResult.moves
                        return isIdMatch && isTimeMatch && isMoveMatch
                    })

                    if (rankIndex !== -1) {
                        const rank = rankIndex + 1
                        setPlayerRank(rank)
                        // 如果在前 10 名，預設顯示排行榜
                        if (rank <= 10) {
                            setShowLeaderboard(true)
                        }
                    } else {
                        console.warn('無法在排行榜中找到剛提交的成績', gameResult)
                    }

                } catch (e) {
                    console.error('載入排行榜失敗', e)
                }
            } else {
                setSubmitStatus('error')
            }
            setIsSubmitting(false)
        }

        autoSubmit()
    }, []) // Run once

    return (
        <div className="game-complete">
            <div className="complete-container">

                {/* Header */}
                <header className="complete-header">
                    <div className="confetti-icon">🎊</div>
                    <h1>CONGRATS!</h1>
                    <span className="complete-title-zh">恭喜完成了挑戰</span>

                    {isNewRecord && (
                        <div className="new-record-highlight">
                            <div className="new-record-badge">
                                <span>👑</span> NEW RECORD
                            </div>
                        </div>
                    )}
                </header>

                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <span className="stat-icon">⏱️</span>
                        <span className="stat-label">TIME</span>
                        <span className="stat-value">{result.time}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-icon">👣</span>
                        <span className="stat-label">MOVES</span>
                        <span className="stat-value">{result.moves}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-icon">✨</span>
                        <span className="stat-label">SPECIAL</span>
                        <span className="stat-value special">{result.specialModes || 'None'}</span>
                    </div>
                </div>

                {/* Status & Ranking */}
                <div className="status-section">
                    {isSubmitting ? (
                        <div className="loading-pill">
                            <div className="spinner"></div>
                            <span>上傳成績中...</span>
                        </div>
                    ) : submitStatus === 'success' ? (
                        <div className="success-message">
                            <div>✅ 成績已上傳</div>
                            {playerRank ? (
                                <div className="rank-info">
                                    當前排名 <span className="rank-highlight">#{playerRank}</span>
                                </div>
                            ) : (
                                <div className="rank-info" style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                                    (未能在排行榜中定位排名)
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="error-message">
                            ❌ 上傳失敗，請檢查網路
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="action-buttons">
                    <button className="btn-primary" onClick={onPlayAgain}>
                        再玩一次
                    </button>
                    <button className="btn-secondary" onClick={onBackToSetup}>
                        返回主選單
                    </button>
                </div>

                {/* Leaderboard Toggle Area */}
                {!showLeaderboard && submitStatus === 'success' && (
                    <button
                        className="btn-text"
                        style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setShowLeaderboard(true)}
                    >
                        查看排行榜
                    </button>
                )}

                {showLeaderboard && (
                    <div className="leaderboard-section">
                        <HighScores
                            mode={settings.mode}
                            imageIdentifier={settings.imageIdentifier || ''}
                            imageDisplayName={settings.imageDisplayName}
                            size={settings.size}
                            preloadedScores={leaderboardScores}
                            highlightResult={{
                                ...result,
                                type: 'GameResult',
                                playerId: player.id,
                                level: leaderboardScores[0]?.level || '',
                                timestamp: '',
                            } as any}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
