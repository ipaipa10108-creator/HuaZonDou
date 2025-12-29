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
            elapsedSeconds: 0,
            cheatCount: 0,
            cheatEnabled: false,
            status: 'idle',
        }
    })

    const timerRef = useRef<number | null>(null)

    // 計時器
    useEffect(() => {
        if (gameState.status === 'playing' && gameState.startTime) {
            timerRef.current = window.setInterval(() => {
                setGameState(prev => {
                    if (!prev.startTime) return prev
                    const elapsed = Math.floor((Date.now() - prev.startTime.getTime()) / 1000)
                    return { ...prev, elapsedSeconds: elapsed }
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
        setGameState(prev => ({
            ...prev,
            startTime: new Date(),
            status: 'playing',
        }))
    }, [])

    // 移動方塊
    const moveBlock = useCallback((row: number, col: number): MoveResult | null => {
        let result: MoveResult | null = null

        setGameState(prev => {
            if (prev.status !== 'playing') return prev

            const clickedPos: Position = { row, col }
            if (!isAdjacent(clickedPos, prev.emptyPos)) {
                return prev
            }

            const newBoard = prev.board.map(r => [...r])
            const movedValue = newBoard[row][col]

            // 交換
            newBoard[prev.emptyPos.row][prev.emptyPos.col] = movedValue
            newBoard[row][col] = 0

            const newEmptyPos = { row, col }
            const newMoves = prev.moves + 1

            result = {
                success: true,
                oldEmptyPos: prev.emptyPos,
                newEmptyPos,
                movedValue,
            }

            const isWin = checkWin(newBoard)

            return {
                ...prev,
                board: newBoard,
                emptyPos: newEmptyPos,
                moves: newMoves,
                status: isWin ? 'complete' : 'playing',
            }
        })

        return result
    }, [])

    // 作弊交換
    const cheatSwap = useCallback((row1: number, col1: number, row2: number, col2: number): boolean => {
        let success = false

        setGameState(prev => {
            if (prev.status !== 'playing') return prev

            const size = settings.size
            if (row1 < 0 || row1 >= size || col1 < 0 || col1 >= size ||
                row2 < 0 || row2 >= size || col2 < 0 || col2 >= size) {
                return prev
            }

            if (row1 === row2 && col1 === col2) return prev

            const value1 = prev.board[row1][col1]
            const value2 = prev.board[row2][col2]

            if (value1 === 0 || value2 === 0) return prev

            // 檢查時間限制（首次作弊需等待5分鐘）
            if (prev.cheatCount === 0 && prev.startTime) {
                const elapsed = Math.floor((Date.now() - prev.startTime.getTime()) / 1000)
                if (elapsed < 300) return prev
            }

            const newBoard = prev.board.map(r => [...r])
            newBoard[row1][col1] = value2
            newBoard[row2][col2] = value1

            success = true

            return {
                ...prev,
                board: newBoard,
                moves: prev.moves + 1,
                cheatCount: prev.cheatCount + 1,
            }
        })

        return success
    }, [settings.size])

    // 切換作弊模式
    const toggleCheatMode = useCallback((): { enabled: boolean; error?: string } => {
        let result = { enabled: false, error: undefined as string | undefined }

        setGameState(prev => {
            if (!prev.startTime) {
                result.error = '遊戲尚未開始'
                return prev
            }

            if (prev.cheatCount === 0) {
                const elapsed = Math.floor((Date.now() - prev.startTime.getTime()) / 1000)
                if (elapsed < 300) {
                    const remaining = 300 - elapsed
                    const mins = Math.floor(remaining / 60)
                    const secs = remaining % 60
                    result.error = `作弊模式將在 ${mins}分${secs}秒 後可用`
                    return prev
                }
            }

            result.enabled = !prev.cheatEnabled
            return { ...prev, cheatEnabled: !prev.cheatEnabled }
        })

        return result
    }, [])

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
            elapsedSeconds: 0,
            cheatCount: 0,
            cheatEnabled: false,
            status: 'playing',
        })
    }, [settings.size])

    // 停止遊戲
    const stopGame = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }, [])

    return {
        gameState,
        startGame,
        moveBlock,
        cheatSwap,
        toggleCheatMode,
        getHintMove,
        resetGame,
        stopGame,
    }
}
