import { useState, useEffect } from 'react'
import LoginPage from './components/LoginPage'
import GameSetup from './components/GameSetup'
import GameBoard from './components/GameBoard'
import GameComplete from './components/GameComplete'
import { GameSettings, Player, GameState } from './types'
import { storage } from './utils/storage'
import { useSoundManager } from './hooks/useSoundManager'

type AppView = 'login' | 'setup' | 'game' | 'complete'

function App() {
    const [currentView, setCurrentView] = useState<AppView>('login')
    const [player, setPlayer] = useState<Player | null>(null)
    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null)
    const [gameResult, setGameResult] = useState<{
        time: string
        moves: number
        cheatCount: number
        specialModes?: string
    } | null>(null)
    const soundManager = useSoundManager()

    // 檢查是否已有存儲的玩家資訊
    useEffect(() => {
        const savedPlayer = storage.getPlayer()
        if (savedPlayer) {
            setPlayer(savedPlayer)
            setCurrentView('setup')
        }
    }, [])

    const handleLogin = (playerId: string) => {
        const newPlayer: Player = { id: playerId, lastPlayed: new Date().toISOString() }
        storage.setPlayer(newPlayer)
        setPlayer(newPlayer)
        setCurrentView('setup')
    }

    const handleLogout = () => {
        storage.removePlayer()
        setPlayer(null)
        setCurrentView('login')
    }

    const handleStartGame = (settings: GameSettings) => {
        setGameSettings(settings)
        setCurrentView('game')
    }

    const handleGameComplete = (gameState: GameState) => {
        const formatTime = (seconds: number) => {
            const mins = Math.floor(seconds / 60)
            const secs = seconds % 60
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        }

        setGameResult({
            time: formatTime(gameState.elapsedSeconds),
            moves: gameState.moves,
            cheatCount: gameState.cheatCount,
            specialModes: [
                gameState.hasUsedCheatMode ? `🃏${gameState.cheatCount}` : '', // 金手指 + 次數
                gameState.hasUsedSwapMode ? '🔮' : '',  // 轉珠
                gameState.hasUsedBlindMode ? '😎' : ''  // 盲解
            ].join('') // 串接，如 "🃏3🔮"
        })
        setCurrentView('complete')
    }

    const handleBackToSetup = () => {
        setGameSettings(null)
        setGameResult(null)
        setCurrentView('setup')
    }

    const handlePlayAgain = () => {
        setGameResult(null)
        setCurrentView('game')
    }

    return (
        <div className="app-container">
            {currentView === 'login' && (
                <LoginPage onLogin={handleLogin} />
            )}

            {currentView === 'setup' && player && (
                <GameSetup
                    player={player}
                    onStartGame={handleStartGame}
                    onLogout={handleLogout}
                />
            )}

            {currentView === 'game' && gameSettings && player && (
                <GameBoard
                    settings={gameSettings}
                    onComplete={handleGameComplete}
                    onBackToSetup={handleBackToSetup}
                    soundManager={soundManager}
                />
            )}

            {currentView === 'complete' && gameSettings && gameResult && player && (
                <GameComplete
                    settings={gameSettings}
                    result={gameResult}
                    player={player}
                    onPlayAgain={handlePlayAgain}
                    onBackToSetup={handleBackToSetup}
                />
            )}
        </div>
    )
}

export default App
