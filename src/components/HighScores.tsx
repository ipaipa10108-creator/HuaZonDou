import { useState, useEffect } from 'react'
import { GameMode, HighScore } from '../types'
import { storage } from '../utils/storage'
import './HighScores.css'

interface HighScoresProps {
    mode: GameMode
    imageIdentifier: string
    size: number
}

export default function HighScores({ mode, imageIdentifier, size }: HighScoresProps) {
    const [scores, setScores] = useState<HighScore[]>([])

    useEffect(() => {
        const key = `${mode}-${imageIdentifier}-${size}`
        const allScores = storage.getHighScores()
        setScores(allScores[key] || [])
    }, [mode, imageIdentifier, size])

    if (scores.length === 0) {
        return (
            <div className="high-scores-container empty-scores">
                <p>此關卡暫無紀錄，快來挑戰吧！</p>
            </div>
        )
    }

    return (
        <div className="high-scores-container">
            <h3>🏆 本地排行榜</h3>
            <div className="scores-table-wrapper">
                <table className="scores-table">
                    <thead>
                        <tr>
                            <th>排名</th>
                            <th>通關時間</th>
                            <th>步數</th>
                            <th>作弊</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scores.map((score, index) => (
                            <tr key={index} className={`rank-${index + 1}`}>
                                <td>
                                    <span className="rank-badge">#{index + 1}</span>
                                </td>
                                <td className="time-cell">{score.time}</td>
                                <td>{score.moves}</td>
                                <td>
                                    {score.cheatUsed ? (
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
        </div>
    )
}
