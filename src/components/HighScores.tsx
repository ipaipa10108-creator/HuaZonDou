import { useState, useEffect } from 'react'
import { GameMode, GameResult } from '../types'
import { getLeaderboard } from '../services/googleSheetsApi'
import './HighScores.css'

interface HighScoresProps {
    mode: GameMode
    imageIdentifier: string
    size: number
}

export default function HighScores({ mode, imageIdentifier, size }: HighScoresProps) {
    const [scores, setScores] = useState<GameResult[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showMore, setShowMore] = useState(false)

    // 產生與提交時一致的關卡識別名稱
    const levelDisplayName = settings.imageDisplayName || (settings.mode === 'number' ? '數字模式' : '圖片模式')
    const levelKey = `${levelDisplayName} (${settings.size}x${settings.size})`

    useEffect(() => {
        const loadScores = async () => {
            setIsLoading(true)
            const remoteScores = await getLeaderboard(levelKey)
            // 排序：時間優先（從小到大）
            const sorted = [...remoteScores].sort((a, b) => {
                const getTimeInSeconds = (timeStr: string) => {
                    const parts = timeStr.split(':')
                    if (parts.length === 2) {
                        return (parseInt(parts[0]) * 60) + parseInt(parts[1])
                    }
                    return 0
                }
                const timeA = getTimeInSeconds(a.time)
                const timeB = getTimeInSeconds(b.time)
                return timeA - timeB
            })
            setScores(sorted)
            setIsLoading(false)
        }
        loadScores()
        setShowMore(false) // 切換關卡時重置展開狀態
    }, [mode, imageIdentifier, size, levelKey])

    const displayedScores = showMore ? scores.slice(0, 100) : scores.slice(0, 10)

    if (isLoading) {
        return (
            <div className="high-scores-container">
                <div className="loading-spinner">載入排行榜中...</div>
            </div>
        )
    }

    if (scores.length === 0) {
        return (
            <div className="high-scores-container empty-scores">
                <p>此關卡暫無紀錄，快來挑戰吧！</p>
            </div>
        )
    }

    return (
        <div className="high-scores-container">
            <h3>🏆 全球排行榜</h3>
            <div className="scores-table-wrapper">
                <table className="scores-table">
                    <thead>
                        <tr>
                            <th>排名</th>
                            <th>玩家</th>
                            <th>通關時間</th>
                            <th>步數</th>
                            <th>作弊</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedScores.map((score, index) => (
                            <tr key={`${score.playerId}-${index}`} className={`rank-${index + 1}`}>
                                <td>
                                    <span className="rank-badge">#{index + 1}</span>
                                </td>
                                <td className="player-cell">{score.playerId}</td>
                                <td className="time-cell">{score.time}</td>
                                <td>{score.moves}</td>
                                <td>
                                    {score.cheatCount > 0 ? (
                                        <span className="cheat-badge used">{score.cheatCount}次</span>
                                    ) : (
                                        <span className="cheat-badge none">無</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {scores.length > 10 && (
                <div className="show-more-container">
                    <button
                        className="show-more-btn"
                        onClick={() => setShowMore(!showMore)}
                    >
                        {showMore ? '收合' : `顯示更多 (共 ${Math.min(scores.length, 100)} 名)`}
                    </button>
                </div>
            )}
        </div>
    )
}
