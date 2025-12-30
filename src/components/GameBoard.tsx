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
        if (!gameState.isSwapMode) return
        // 只允許拖曳空白格（珠子）
        if (gameState.board[row][col] !== 0) return

        e.preventDefault()
        setIsDragging(true)
    }, [gameState.isSwapMode, gameState.board])

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

    // 處理轉珠模式的拖曳邏輯 (Mobile & Desktop)
    useEffect(() => {
        if (!isDragging || !gameState.isSwapMode) return

        const handlePointerMove = (e: PointerEvent) => {
            e.preventDefault() // 防止捲動

            // 取得游標下的元素
            const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement
            if (!target) return

            // 檢查是否為拼圖方塊
            const block = target.closest('.puzzle-block') as HTMLElement
            if (!block) return

            const row = parseInt(block.dataset.row || '-1')
            const col = parseInt(block.dataset.col || '-1')

            if (row === -1 || col === -1) return

            // 嘗試移動
            const result = moveBlock(row, col)
            if (result?.success) {
                playMoveSound()
            }
        }

        const handlePointerUp = () => {
            setIsDragging(false)
        }

        window.addEventListener('pointermove', handlePointerMove, { passive: false })
        window.addEventListener('pointerup', handlePointerUp)

        return () => {
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('pointerup', handlePointerUp)
        }
    }, [isDragging, gameState.isSwapMode, moveBlock, playMoveSound])

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
    }, [gameState.status, onComplete, playWinSound, stopGame])
    // 注意：gameState 作為依賴項，當它變為 complete 時觸發。
    // onComplete 應該會處理這個 gameState，我們不需要在這裡修改它，
    // 因為 GameState 已經包含了 hasUsed... 標誌。
    // 但是 HighScores 需要的是 GameResult 結構，這通常在父組件(GameComplete?)處理，
    // 或者我們確保 gameState 包含足夠資訊。
    // `gameState` has `hasUsed...` flags.
    // Parent `App` or `GameComplete` will construct `GameResult`.

    // Self-correction: GameBoard calls onComplete(gameState).
    // Let's check where onComplete goes. (Usually to App.tsx or GameSetup.tsx swapping views)
    // Actually, looking at file list, there is GameComplete.tsx.
    // I should check GameComplete.tsx too.


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
                                style={{ touchAction: 'none' }} // 確保全時禁止預設觸控行為，讓 pointermove 生效
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
