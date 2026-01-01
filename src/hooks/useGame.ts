import { useState, useEffect, useCallback, useRef } from 'react'
import { GameState, GameSettings, Position, MoveResult } from '../types'
import { shuffleBoard, isAdjacent, checkWin, getHint } from '../utils/puzzleLogic'

export function useGame(settings: GameSettings) {
    const [gameState, setGameState] = useState<GameState>(() => {
        const { board, emptyPos } = shuffleBoard(settings.size)
        return {
            board,
            emptyPos,
            moves: 0,
            startTime: null,
            moves: 0,
            startTime: null,
            elapsedSeconds: 0,
            accumulatedTime: 0, // 新增：累積時間（用於暫停/懲罰）
            cheatCount: 0,
            cheatEnabled: false,
            status: 'idle',
            isBlindMode: false,
            isSwapMode: false,
            hasUsedBlindMode: false,
            hasUsedSwapMode: false,
            hasUsedCheatMode: false,
        }
    })

    const timerRef = useRef<number | null>(null)

    // 計時器
    useEffect(() => {
        if (gameState.status === 'playing' && gameState.startTime && !gameState.isBlindMode) {
            timerRef.current = window.setInterval(() => {
                setGameState((prev: GameState) => {
                    if (!prev.startTime) return prev
                    // 計算方式：累積時間 + 本次區段時間
                    const currentSessionTime = Math.floor((Date.now() - new Date(prev.startTime).getTime()) / 1000)
                    return { ...prev, elapsedSeconds: prev.accumulatedTime + currentSessionTime }
                })
            }, 1000)
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
    }, [gameState.status, gameState.startTime])

    // 開始遊戲
    const startGame = useCallback(() => {
        setGameState((prev: GameState) => ({
            ...prev,
            startTime: new Date(),
            accumulatedTime: 0,
            elapsedSeconds: 0,
            status: 'playing',
        }))
    }, [])

    // 移動方塊
    const moveBlock = useCallback((row: number, col: number): MoveResult | null => {
        if (gameState.status !== 'playing') return null

        const clickedPos: Position = { row, col }
        if (!isAdjacent(clickedPos, gameState.emptyPos)) {
            return null
        }

        const newBoard = gameState.board.map(r => [...r])
        const movedValue = newBoard[row][col]

        // 交換
        newBoard[gameState.emptyPos.row][gameState.emptyPos.col] = movedValue
        newBoard[row][col] = 0

        const isWin = checkWin(newBoard)

        setGameState((prev: GameState) => ({
            ...prev,
            board: newBoard,
            emptyPos: clickedPos,
            moves: prev.moves + 1,
            status: isWin ? 'complete' : 'playing',
        }))

        return {
            success: true,
            oldEmptyPos: gameState.emptyPos,
            newEmptyPos: clickedPos,
            movedValue,
        }
    }, [gameState.board, gameState.emptyPos, gameState.status])

    // 作弊交換
    const cheatSwap = useCallback((row1: number, col1: number, row2: number, col2: number): boolean => {
        if (gameState.status !== 'playing') return false

        const size = settings.size
        if (row1 < 0 || row1 >= size || col1 < 0 || col1 >= size ||
            row2 < 0 || row2 >= size || col2 < 0 || col2 >= size) {
            return false
        }

        if (row1 === row2 && col1 === col2) return false

        const value1 = gameState.board[row1][col1]
        const value2 = gameState.board[row2][col2]

        if (value1 === 0 || value2 === 0) return false

        // 檢查時間限制（首次作弊需等待5分鐘）
        if (gameState.cheatCount === 0 && gameState.startTime) {
            const elapsed = Math.floor((Date.now() - gameState.startTime.getTime()) / 1000)
            if (elapsed < 300) return false
        }

        const newBoard = gameState.board.map(r => [...r])
        newBoard[row1][col1] = value2
        newBoard[row2][col2] = value1

        const isWin = checkWin(newBoard)

        setGameState((prev: GameState) => ({
            ...prev,
            board: newBoard,
            moves: prev.moves + 1,
            cheatCount: prev.cheatCount + 1,
            hasUsedCheatMode: true,
            status: isWin ? 'complete' : 'playing',
        }))

        return true
    }, [gameState.board, gameState.status, gameState.cheatCount, gameState.startTime, settings.size])

    // 切換作弊模式
    const toggleCheatMode = useCallback((): { enabled: boolean; error?: string } => {
        if (!gameState.startTime) {
            return { enabled: false, error: '遊戲尚未開始' }
        }

        if (gameState.cheatCount === 0) {
            const elapsed = Math.floor((Date.now() - gameState.startTime.getTime()) / 1000)
            if (elapsed < 300) {
                const remaining = 300 - elapsed
                const mins = Math.floor(remaining / 60)
                const secs = remaining % 60
                return { enabled: false, error: `作弊模式將在 ${mins}分${secs}秒 後可用` }
            }
        }

        const newEnabled = !gameState.cheatEnabled
        setGameState((prev: GameState) => ({ ...prev, cheatEnabled: newEnabled }))

        return { enabled: newEnabled }
    }, [gameState.startTime, gameState.cheatCount, gameState.cheatEnabled])

    // 取得提示
    const getHintMove = useCallback((): Position | null => {
        return getHint(gameState.board, gameState.emptyPos)
    }, [gameState.board, gameState.emptyPos])

    // 重置遊戲
    const resetGame = useCallback(() => {
        const { board, emptyPos } = shuffleBoard(settings.size)
        setGameState({
            board,
            emptyPos,
            moves: 0,
            startTime: new Date(),
            accumulatedTime: 0,
            elapsedSeconds: 0,
            cheatCount: 0,
            cheatEnabled: false,
            status: 'playing',
            isBlindMode: false,
            isSwapMode: false,
            hasUsedBlindMode: false,
            hasUsedSwapMode: false,
            hasUsedCheatMode: false,
        })
    }, [settings.size])

    // 停止遊戲
    const stopGame = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }, [])

    // 切換盲解模式
    const toggleBlindMode = useCallback(() => {
        if (gameState.status !== 'playing') return

        setGameState((prev: GameState) => {
            const newIsBlindMode = !prev.isBlindMode

            if (newIsBlindMode) {
                // 開啟盲解：暫停計時，並加 10 秒
                // 當前總秒數 = 累積 + (現在 - 開始)
                // 但因為開啟盲解那一刻要暫停，所以把「當前總秒數 + 10」存入 accumulatedTime
                // 並將 startTime 設為 null (暫停)

                let currentSessionTime = 0
                if (prev.startTime) {
                    currentSessionTime = Math.floor((Date.now() - new Date(prev.startTime).getTime()) / 1000)
                }

                const newAccumulated = prev.accumulatedTime + currentSessionTime + 10

                return {
                    ...prev,
                    isBlindMode: true,
                    hasUsedBlindMode: true,
                    accumulatedTime: newAccumulated,
                    elapsedSeconds: newAccumulated, // 顯示時間立即更新
                    startTime: null // 停止計時
                }
            } else {
                // 關閉盲解：恢復計時
                // startTime 設為現在
                // accumulatedTime 保持不變（就是剛才暫停時的值）
                return {
                    ...prev,
                    isBlindMode: false,
                    startTime: new Date()
                }
            }
        })
    }, [gameState.status])

    // 切換轉珠模式
    const toggleSwapMode = useCallback(() => {
        if (gameState.status !== 'playing') return

        setGameState((prev: GameState) => ({
            ...prev,
            isSwapMode: !prev.isSwapMode,
            hasUsedSwapMode: prev.hasUsedSwapMode || !prev.isSwapMode // 如果是啟用，則標記為已使用
        }))
    }, [gameState.status])

    return {
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
    }
}
