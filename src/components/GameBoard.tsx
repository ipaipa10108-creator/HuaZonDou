import { useState, useEffect, useCallback, useRef } from 'react'
import { GameSettings, GameState, Position, ColorTheme } from '../types'
import { useGame } from '../hooks/useGame'
import { useSoundManager } from '../hooks/useSoundManager'
import { useImageProcessor } from '../hooks/useImageProcessor'
import HighScores from './HighScores'
import './GameBoard.css'

interface GameBoardProps {
    settings: GameSettings
    onComplete: (gameState: GameState) => void
    onBackToSetup: () => void
    soundManager: any
}

export default function GameBoard({ settings, onComplete, onBackToSetup, soundManager }: GameBoardProps) {
    const {
        gameState,
        startGame,
        moveBlock,
        cheatSwap,
        toggleCheatMode,
        getHintMove,
        resetGame,
        stopGame,
        toggleBlindMode,
        toggleSwapMode,
    } = useGame(settings)

    const {
        muted,
        toggleMute,
        playMoveSound,
        playCheatSound,
        playWinSound,
        playColorChangeSound,
        playGameStartSound,
    } = soundManager

    const { imagePieces, processImage, isProcessing } = useImageProcessor()

    const [colorTheme, setColorTheme] = useState<ColorTheme>('default')
    const [hintPos, setHintPos] = useState<Position | null>(null)
    const [cheatFirstBlock, setCheatFirstBlock] = useState<Position | null>(null)
    const [showOriginal, setShowOriginal] = useState(false)
    const [isReady, setIsReady] = useState(false)
    const [isDragging, setIsDragging] = useState(false)

    // 處理轉珠模式的拖曳開始
    const handleDragStart = useCallback((row: number, col: number, e: React.PointerEvent) => {
        if (!gameState.isSwapMode || gameState.board[row][col] !== 0) return
        e.preventDefault() // 防止捲動
        setIsDragging(true)
    }, [gameState.isSwapMode, gameState.board])

    // 處理轉珠模式的拖曳移動進出
    const handlePointerEnter = useCallback((row: number, col: number) => {
        if (!isDragging || !gameState.isSwapMode) return

        // 嘗試移動（交換）
        // moveBlock 內部會檢查是否相鄰，若相鄰就會交換並返回結果
        const result = moveBlock(row, col)
        if (result?.success) {
            playMoveSound()
        }
    }, [isDragging, gameState.isSwapMode, moveBlock, playMoveSound])

    // 處理拖曳結束（全域）
    useEffect(() => {
        const handleGlobalPointerUp = () => {
            setIsDragging(false)
        }
        window.addEventListener('pointerup', handleGlobalPointerUp)
        return () => window.removeEventListener('pointerup', handleGlobalPointerUp)
    }, [])

    const puzzleContainerRef = useRef<HTMLDivElement>(null)

    // 初始化遊戲
    useEffect(() => {
        const initGame = async () => {
            if (settings.mode === 'image' && settings.imageSource) {
                try {
                    await processImage(settings.imageSource, settings.size)
                } catch (error) {
                    console.error('圖片處理失敗:', error)
                }
            }
            setIsReady(true)
        }
        initGame()

        return () => {
            stopGame()
        }
    }, [settings, processImage, stopGame])

    // 開始計時
    useEffect(() => {
        if (isReady && gameState.status === 'idle') {
            startGame()
            playGameStartSound()
        }
    }, [isReady, gameState.status, startGame, playGameStartSound])

    // 遊戲完成
    useEffect(() => {
        if (gameState.status === 'complete') {
            playWinSound()
            stopGame()
            onComplete(gameState)
        }
    }, [gameState, onComplete, playWinSound, stopGame])

    // 處理方塊點擊
    const handleBlockClick = useCallback((row: number, col: number) => {
        if (gameState.status !== 'playing') return
        if (gameState.board[row][col] === 0) return

        // 清除提示
        setHintPos(null)

        if (gameState.cheatEnabled) {
            if (!cheatFirstBlock) {
                setCheatFirstBlock({ row, col })
                return
            }

            const success = cheatSwap(cheatFirstBlock.row, cheatFirstBlock.col, row, col)
            if (success) {
                playCheatSound()
            }
            setCheatFirstBlock(null)
        } else {
            const result = moveBlock(row, col)
            if (result?.success) {
                playMoveSound()
            }
        }
    }, [gameState, cheatFirstBlock, cheatSwap, moveBlock, playMoveSound, playCheatSound])

    // 提示功能
    const handleHint = () => {
        const hint = getHintMove()
        if (hint) {
            setHintPos(hint)
            playCheatSound() // 提示音效
            setTimeout(() => setHintPos(null), 3000)
        }
    }

    // 切換作弊模式
    const handleToggleCheat = () => {
        const result = toggleCheatMode()
        if (result.error) {
            playCheatSound() // 提示不能使用的音效
            alert(result.error)
        } else {
            playCheatSound()
            if (result.enabled) {
                alert('作弊模式已啟用！點擊任意兩個非空方塊進行交換。')
            }
        }
        setCheatFirstBlock(null)
    }

    // 換色
    const handleColorChange = () => {
        const colors: ColorTheme[] = ['default', 'blue', 'red', 'orange']
        const currentIndex = colors.indexOf(colorTheme)
        setColorTheme(colors[(currentIndex + 1) % colors.length])
        playColorChangeSound()
    }

    // 重置
    const handleReset = () => {
        resetGame()
        playGameStartSound()
        setHintPos(null)
        setCheatFirstBlock(null)
    }

    // 格式化時間
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    if (!isReady || (settings.mode === 'image' && isProcessing)) {
        return (
            <div className="game-board loading">
                <div className="loading-spinner">載入中...</div>
            </div>
        )
    }

    return (
        <div className="game-board">
            <div className="board-container">
                <header className="board-header">
                    <h1>{settings.imageDisplayName || '數字模式'}</h1>
                    <span className="difficulty">{settings.size}×{settings.size}</span>
                </header>

                <div className="game-stats">
                    <div className="stat">
                        <span className="stat-label">時間</span>
                        <span className="stat-value">{formatTime(gameState.elapsedSeconds)}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">步數</span>
                        <span className="stat-value">{gameState.moves}</span>
                    </div>
                    {gameState.cheatCount > 0 && (
                        <div className="stat cheat-stat">
                            <span className="stat-label">作弊</span>
                            <span className="stat-value">{gameState.cheatCount}</span>
                        </div>
                    )}
                </div>

                <div
                    className="puzzle-container"
                    ref={puzzleContainerRef}
                    style={{
                        gridTemplateColumns: `repeat(${settings.size}, 1fr)`,
                        position: 'relative'
                    }}
                >
                    {gameState.board.flat().map((value, index) => {
                        const row = Math.floor(index / settings.size)
                        const col = index % settings.size
                        const isEmpty = value === 0
                        const isHint = hintPos?.row === row && hintPos?.col === col
                        const isCheatSelected = cheatFirstBlock?.row === row && cheatFirstBlock?.col === col

                        // 盲解模式：所有格子在非空時都顯示背面（木紋）
                        const isBlindMasked = gameState.isBlindMode && !isEmpty

                        // 轉珠模式：空白格子變為可拖曳的珠子
                        const isSwapBead = gameState.isSwapMode && isEmpty

                        return (
                            <div
                                key={`${row}-${col}`}
                                className={`puzzle-block ${isEmpty ? `empty color-${colorTheme}` : ''} ${settings.mode === 'image' ? 'image-block' : ''} ${isHint ? 'hint' : ''} ${isCheatSelected ? 'cheat-selected' : ''} ${isBlindMasked ? 'blind-masked' : ''} ${isSwapBead ? 'swap-bead' : ''}`}
                                onClick={() => handleBlockClick(row, col)}
                                onPointerDown={(e) => handleDragStart(row, col, e)}
                                onPointerEnter={() => handlePointerEnter(row, col)}
                                style={{ touchAction: gameState.isSwapMode ? 'none' : 'auto' }} // 轉珠模式下禁止觸控捲動以利拖曳
                                data-row={row}
                                data-col={col}
                                data-value={value}
                            >
                                {!isEmpty && !isBlindMasked && (
                                    settings.mode === 'number' ? (
                                        <span>{value}</span>
                                    ) : (
                                        imagePieces[value - 1] && imagePieces[value - 1] !== 'error_piece' && (
                                            <img src={imagePieces[value - 1]} alt={`Piece ${value}`} draggable={false} />
                                        )
                                    )
                                )}
                            </div>
                        )
                    })}

                    {/* 顯示原圖 overlay */}
                    {showOriginal && settings.imageSource && (
                        <div
                            className="original-overlay"
                            style={{ backgroundImage: `url(${settings.imageSource})` }}
                        />
                    )}
                </div>

                <div className="game-controls">
                    <button onClick={handleReset}>🔄 重置</button>
                    <button onClick={handleHint}>💡 提示</button>
                    {settings.mode === 'image' && (
                        <button
                            onClick={() => setShowOriginal(!showOriginal)}
                            className={showOriginal ? 'active' : ''}
                        >
                            {showOriginal ? '🙈 隱藏原圖' : '👁️ 顯示原圖'}
                        </button>
                    )}
                    <button onClick={handleColorChange}>🎨 換色</button>
                    <button onClick={toggleMute} className={muted ? 'active' : ''}>
                        {muted ? '🔇 靜音' : '🔊 音效'}
                    </button>
                    <button
                        onClick={toggleBlindMode}
                        className={gameState.isBlindMode ? 'active' : ''}
                    >
                        😎 盲解
                    </button>
                    <button
                        onClick={toggleSwapMode}
                        className={gameState.isSwapMode ? 'active' : ''}
                    >
                        🔮 轉珠
                    </button>
                    <button
                        onClick={handleToggleCheat}
                        className={`cheat-btn ${gameState.cheatEnabled ? 'active' : ''}`}
                    >
                        🃏 作弊
                    </button>
                    <button onClick={onBackToSetup}>🏠 返回</button>
                </div>

                <HighScores
                    mode={settings.mode}
                    imageIdentifier={settings.imageIdentifier || ''}
                    imageDisplayName={settings.imageDisplayName}
                    size={settings.size}
                />
            </div>
        </div >
    )
}
