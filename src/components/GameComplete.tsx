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

                // 提交成功後，載入該關卡排行榜
                try {
                    // 使用相同的關卡名稱邏輯
                    const levelKey = gameResult.level
                    console.log(`[GameComplete] 正在取得排行榜: "${levelKey}"`)

                    let scores = await getLeaderboard(levelKey)

                    // 如果精準匹配無結果，嘗試移除空格後再次查詢 (與 HighScores 邏輯一致)
                    if (scores.length === 0 && levelKey.includes(' ')) {
                        scores = await getLeaderboard(levelKey.replace(/\s/g, ''))
                    }

                    setLeaderboardScores(scores)

                    // 計算玩家排名
                    // 比對條件：ID、時間、步數、作弊次數
                    // 注意：timestamp 不參與比對，因為 server 回傳格式不同
                    const rankIndex = scores.findIndex(s =>
                        s.playerId === gameResult.playerId &&
                        s.time === gameResult.time &&
                        s.moves === gameResult.moves &&
                        s.cheatCount === gameResult.cheatCount
                    )

                    if (rankIndex !== -1) {
                        const rank = rankIndex + 1
                        setPlayerRank(rank)
                        // 如果在前 10 名，顯示排行榜
                        if (rank <= 10) {
                            setShowLeaderboard(true)
                        }
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
                        <>
                            <span className="success">✅ 成績已成功上傳！</span>
                            {playerRank && playerRank <= 10 && (
                                <div className="rank-notification">
                                    太神了！您目前的排名是第 <span className="rank-highlight">{playerRank}</span> 名！
                                </div>
                            )}
                        </>
                    ) : (
                        <span className="error">❌ 成績上傳失敗，請檢查網路連線。</span>
                    )}
                </div>

                {showLeaderboard && (
                    <div className="complete-leaderboard">
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
                                timestamp: '', // 不重要，HighScores 使用 playerId+score 比對
                            } as any}
                        />
                    </div>
                )}

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
