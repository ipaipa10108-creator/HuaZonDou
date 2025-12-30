import { useState, useEffect } from 'react'
import { GameMode, GameResult } from '../types'
import { getLeaderboard } from '../services/googleSheetsApi'
import './HighScores.css'

interface HighScoresProps {
    mode: GameMode
    imageIdentifier: string
    imageDisplayName?: string
    size: number
    preloadedScores?: GameResult[]
    highlightResult?: GameResult
}

export default function HighScores({ mode, imageIdentifier, imageDisplayName, size, preloadedScores, highlightResult }: HighScoresProps) {
    const [scores, setScores] = useState<GameResult[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showMore, setShowMore] = useState(false)

    useEffect(() => {
        if (preloadedScores) {
            setScores(preloadedScores)
            return
        }

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

            // 排序邏輯已移至 API 層 (googleSheetsApi.ts)
            // 這裡直接使用回傳的已排序數據
            setScores(remoteScores)
            setIsLoading(false)
        }
        loadScores()
        setShowMore(false) // 切換關卡時重置展開狀態
    }, [mode, imageIdentifier, size, imageDisplayName, preloadedScores])

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
                            <th>特殊</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedScores.map((score, index) => {
                            // 判斷是否為需要高亮的行
                            // 這裡使用較為寬鬆的匹配，因為 timestamp 格式可能不同 (ISO vs YYYY/MM/DD)
                            // 主要比對：玩家ID + 分數(時間/步數/作弊)
                            const isHighlight = highlightResult &&
                                score.playerId === highlightResult.playerId &&
                                score.moves === highlightResult.moves &&
                                score.cheatCount === highlightResult.cheatCount &&
                                (score.time === highlightResult.time || score.time.startsWith(highlightResult.time.split(' ')[0])); // 兼容時間格式

                            return (
                                <tr key={`${score.playerId}-${index}`} className={`rank-${index + 1} ${isHighlight ? 'highlight-row' : ''}`}>
                                    <td>
                                        <span className="rank-badge">#{index + 1}</span>
                                    </td>
                                    <td className="player-cell">
                                        {score.playerId}
                                        {isHighlight && <span className="me-badge"> (我)</span>}
                                    </td>
                                    <td className="time-cell">
                                        {score.time} {score.timestamp && <span className="date-hint">({score.timestamp})</span>}
                                    </td>
                                    <td>{score.moves}</td>
                                    <td>
                                        {score.specialModes ? (
                                            <span className="special-modes">{score.specialModes}</span>
                                        ) : score.cheatCount > 0 ? (
                                            <span className="special-modes">🃏{score.cheatCount}</span>
                                        ) : (
                                            <span className="cheat-badge none">無</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
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
