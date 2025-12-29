import { Position } from '../types'

/**
 * 初始化已解決狀態的棋盤
 */
export function createSolvedBoard(size: number): number[][] {
    const board: number[][] = []
    let value = 1
    for (let row = 0; row < size; row++) {
        const rowArray: number[] = []
        for (let col = 0; col < size; col++) {
            if (row === size - 1 && col === size - 1) {
                rowArray.push(0)
            } else {
                rowArray.push(value++)
            }
        }
        board.push(rowArray)
    }
    return board
}

/**
 * 計算逆序數
 */
function countInversions(flatBoard: number[]): number {
    let inversions = 0
    for (let i = 0; i < flatBoard.length; i++) {
        for (let j = i + 1; j < flatBoard.length; j++) {
            if (flatBoard[i] > flatBoard[j]) {
                inversions++
            }
        }
    }
    return inversions
}

/**
 * 檢查棋盤是否可解
 */
export function isSolvable(board: number[][], emptyPos: Position): boolean {
    const size = board.length
    const flatBoard: number[] = []

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] !== 0) {
                flatBoard.push(board[r][c])
            }
        }
    }

    const inversions = countInversions(flatBoard)

    if (size % 2 === 1) {
        return inversions % 2 === 0
    } else {
        const emptyRowFromBottom = size - emptyPos.row
        return (inversions % 2 === 0 && emptyRowFromBottom % 2 === 1) ||
            (inversions % 2 === 1 && emptyRowFromBottom % 2 === 0)
    }
}

/**
 * 使修復棋盤為可解狀態
 */
export function makeGameSolvable(board: number[][]): void {
    const size = board.length
    let r1 = -1, c1 = -1, r2 = -1, c2 = -1
    let found = 0

    outer: for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] !== 0) {
                if (found === 0) {
                    r1 = r; c1 = c
                    found++
                } else if (found === 1) {
                    r2 = r; c2 = c
                    found++
                    break outer
                }
            }
        }
    }

    if (found === 2) {
        [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]]
    }
}

/**
 * 洗牌並確保可解
 */
export function shuffleBoard(size: number): { board: number[][], emptyPos: Position } {
    const totalTiles = size * size
    const allTiles = Array.from({ length: totalTiles }, (_, i) => i)

    // Fisher-Yates 洗牌
    for (let i = totalTiles - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[allTiles[i], allTiles[j]] = [allTiles[j], allTiles[i]]
    }

    const board: number[][] = []
    let emptyPos: Position = { row: 0, col: 0 }
    let k = 0

    for (let row = 0; row < size; row++) {
        const rowArray: number[] = []
        for (let col = 0; col < size; col++) {
            const tileValue = allTiles[k]
            rowArray.push(tileValue)
            if (tileValue === 0) {
                emptyPos = { row, col }
            }
            k++
        }
        board.push(rowArray)
    }

    // 確保可解
    if (!isSolvable(board, emptyPos)) {
        makeGameSolvable(board)
        // 重新找空格位置
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[r][c] === 0) {
                    emptyPos = { row: r, col: c }
                }
            }
        }
    }

    return { board, emptyPos }
}

/**
 * 檢查兩個位置是否相鄰
 */
export function isAdjacent(pos1: Position, pos2: Position): boolean {
    return Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col) === 1
}

/**
 * 取得相鄰的方塊位置
 */
export function getAdjacentBlocks(emptyPos: Position, size: number): Position[] {
    const { row, col } = emptyPos
    const adjacent: Position[] = []

    if (row > 0) adjacent.push({ row: row - 1, col })
    if (row < size - 1) adjacent.push({ row: row + 1, col })
    if (col > 0) adjacent.push({ row, col: col - 1 })
    if (col < size - 1) adjacent.push({ row, col: col + 1 })

    return adjacent
}

/**
 * 計算曼哈頓距離
 */
export function calculateManhattanDistance(board: number[][]): number {
    const size = board.length
    let totalDistance = 0

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const value = board[r][c]
            if (value !== 0) {
                const targetRow = Math.floor((value - 1) / size)
                const targetCol = (value - 1) % size
                totalDistance += Math.abs(r - targetRow) + Math.abs(c - targetCol)
            }
        }
    }

    return totalDistance
}

/**
 * 取得提示（最佳下一步）
 */
export function getHint(board: number[][], emptyPos: Position): Position | null {
    const size = board.length
    const adjacentBlocks = getAdjacentBlocks(emptyPos, size)

    if (adjacentBlocks.length === 0) return null

    let bestMove: Position | null = null
    let minDistance = Infinity

    for (const move of adjacentBlocks) {
        // 模擬移動
        const tempBoard = board.map(row => [...row])
        const { row, col } = move

        tempBoard[emptyPos.row][emptyPos.col] = tempBoard[row][col]
        tempBoard[row][col] = 0

        const currentDistance = calculateManhattanDistance(tempBoard)

        if (currentDistance < minDistance) {
            minDistance = currentDistance
            bestMove = move
        }
    }

    return bestMove
}

/**
 * 檢查是否完成
 */
export function checkWin(board: number[][]): boolean {
    const size = board.length
    let value = 1

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (r === size - 1 && c === size - 1) {
                if (board[r][c] !== 0) return false
            } else {
                if (board[r][c] !== value++) return false
            }
        }
    }

    return true
}
