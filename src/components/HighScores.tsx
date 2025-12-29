import { useState, useEffect } from 'react'
import { GameMode, GameResult } from '../types'
import { getLeaderboard } from '../services/googleSheetsApi'
import './HighScores.css'

interface HighScoresProps {
    mode: GameMode
    imageIdentifier: string
    imageDisplayName?: string
    size: number
}

export default function HighScores({ mode, imageIdentifier, imageDisplayName, size }: HighScoresProps) {
    const [scores, setScores] = useState<GameResult[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showMore, setShowMore] = useState(false)

    useEffect(() => {
        const loadScores = async () => {
            const currentLevelName = imageDisplayName || (mode === 'number' ? '數字模式' : '圖片模式')
            const currentLevelKey = `${currentLevelName} (${size}x${size})`

            console.log(`[排行榜查詢] 正在取得關卡: "${currentLevelKey}"`)
            setIsLoading(true)
            let remoteScores = await getLeaderboard(currentLevelKey)

            // 如果精準匹配無結果，嘗試移除空格後再次查詢
            if (remoteScores.length === 0 && currentLevelKey.includes(' ')) {
                const fallbackKey = currentLevelKey.replace(/\s/g, '')
                console.log(`[排行榜查詢] 精準匹配無結果，嘗試移除空格後再次查詢: "${fallbackKey}"`)
                remoteScores = await getLeaderboard(fallbackKey)
            }

            console.log(`[排行榜結果] 取得數據數量: ${remoteScores.length}`, remoteScores)

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
    }, [mode, imageIdentifier, size, imageDisplayName])

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
