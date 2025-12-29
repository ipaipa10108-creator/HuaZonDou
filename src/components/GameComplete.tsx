import { useState, useEffect } from 'react'
import { GameSettings, Player, HighScore, GameResult } from '../types'
import { storage } from '../utils/storage'
import { submitScore } from '../services/googleSheetsApi'
import './GameComplete.css'

interface GameCompleteProps {
    settings: GameSettings
    result: {
        time: string
        moves: number
        cheatCount: number
    }
    player: Player
    onPlayAgain: () => void
    onBackToSetup: () => void
}

export default function GameComplete({ settings, result, player, onPlayAgain, onBackToSetup }: GameCompleteProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [isNewRecord, setIsNewRecord] = useState(false)

    useEffect(() => {
        // 儲存高分記錄
        const key = `${settings.mode}-${settings.imageIdentifier || ''}-${settings.size}`
        const newScore: HighScore = {
            levelName: settings.imageDisplayName || (settings.mode === 'number' ? '數字模式' : '圖片模式'),
            difficulty: `${settings.size}x${settings.size}`,
            time: result.time,
            moves: result.moves,
            cheatUsed: result.cheatCount > 0,
            cheatCount: result.cheatCount
        }

        const record = storage.saveHighScore(key, newScore)
        setIsNewRecord(record)

        // 自動提交到 Google Sheets
        const autoSubmit = async () => {
            setIsSubmitting(true)
            const gameResult: GameResult = {
                playerId: player.id,
                level: `${newScore.levelName} (${newScore.difficulty})`,
                time: result.time,
                moves: result.moves,
                cheatCount: result.cheatCount,
                timestamp: new Date().toISOString()
            }

            const res = await submitScore(gameResult)
            if (res.success) {
                setSubmitStatus('success')
            } else {
                setSubmitStatus('error')
            }
            setIsSubmitting(false)
        }

        autoSubmit()
    }, [])

    return (
        <div className="game-complete">
            <div className="complete-container">
                <div className="confetti-icon">🎊</div>
                <h1>恭喜通關！</h1>
                <p className="subtitle">太棒了，你完成了挑戰！</p>

                <div className="final-stats">
                    <div className="final-stat">
                        <span className="label">所需時間</span>
                        <span className="value">{result.time}</span>
                    </div>
                    <div className="final-stat">
                        <span className="label">移動步數</span>
                        <span className="value">{result.moves}</span>
                    </div>
                    <div className="final-stat">
                        <span className="label">作弊次數</span>
                        <span className="value">{result.cheatCount}</span>
                    </div>
                </div>

                {isNewRecord && (
                    <div className="new-record-badge">新紀錄！👑</div>
                )}

                <div className="submission-status">
                    {isSubmitting ? (
                        <span className="submitting">正在上傳成績到 Google Sheets...</span>
                    ) : submitStatus === 'success' ? (
                        <span className="success">✅ 成績已成功上傳！</span>
                    ) : (
                        <span className="error">❌ 成績上傳失敗，請檢查網路連線。</span>
                    )}
                </div>

                <div className="complete-buttons">
                    <button className="play-again-btn" onClick={onPlayAgain}>
                        再玩一次
                    </button>
                    <button className="back-menu-btn" onClick={onBackToSetup}>
                        返回主選單
                    </button>
                </div>
            </div>
        </div>
    )
}
