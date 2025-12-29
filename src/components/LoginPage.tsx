import { useState, FormEvent } from 'react'
import './LoginPage.css'

interface LoginPageProps {
    onLogin: (playerId: string) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
    const [playerId, setPlayerId] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()

        const trimmedId = playerId.trim()
        if (!trimmedId) {
            setError('請輸入您的 ID')
            return
        }

        if (trimmedId.length < 2) {
            setError('ID 至少需要 2 個字元')
            return
        }

        if (trimmedId.length > 20) {
            setError('ID 不能超過 20 個字元')
            return
        }

        onLogin(trimmedId)
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="game-icon">🧩</div>
                    <h1>燒腦華榮道</h1>
                    <p className="subtitle">經典滑塊拼圖挑戰</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <label htmlFor="player-id">玩家 ID</label>
                        <input
                            id="player-id"
                            type="text"
                            value={playerId}
                            onChange={(e) => {
                                setPlayerId(e.target.value)
                                setError('')
                            }}
                            placeholder="請輸入您的 ID"
                            autoFocus
                            autoComplete="off"
                        />
                        {error && <span className="error-message">{error}</span>}
                    </div>

                    <button type="submit" className="login-button">
                        進入遊戲
                    </button>
                </form>

                <div className="login-footer">
                    <p>您的 ID 將用於記錄遊戲成績</p>
                </div>
            </div>
        </div>
    )
}
