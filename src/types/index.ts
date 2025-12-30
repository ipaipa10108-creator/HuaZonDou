// 遊戲模式
export type GameMode = 'number' | 'image';

// 遊戲狀態
export type GameStatus = 'idle' | 'playing' | 'paused' | 'complete';

// 棋盤位置
export interface Position {
    row: number;
    col: number;
}

// 預設圖片配置
export interface PresetImage {
    name: string;
    src: string;
}

// 遊戲設定
export interface GameSettings {
    mode: GameMode;
    size: number;
    imageSource?: string;
    imageIdentifier?: string;
    imageDisplayName?: string;
}

// 遊戲狀態
export interface GameState {
    board: number[][];
    emptyPos: Position;
    moves: number;
    startTime: Date | null;
    elapsedSeconds: number;
    accumulatedTime: number;
    cheatCount: number;
    cheatEnabled: boolean;
    status: GameStatus;
    isBlindMode: boolean;
    isSwapMode: boolean;
}

// 高分記錄
export interface HighScore {
    levelName: string;
    difficulty: string;
    time: string;
    moves: number;
    cheatUsed: boolean;
    cheatCount: number;
}

// 遊戲結果（提交到 Google Sheets）
export interface GameResult {
    playerId: string;
    level: string;
    time: string;
    moves: number;
    cheatCount: number;
    timestamp: string;
}

// 玩家資訊
export interface Player {
    id: string;
    lastPlayed?: string;
}

// 移動結果
export interface MoveResult {
    success: boolean;
    oldEmptyPos: Position;
    newEmptyPos: Position;
    movedValue: number;
}

// 顏色主題
export type ColorTheme = 'default' | 'blue' | 'red' | 'orange';

// 網路關卡
export interface RemoteLevel {
    id: string;
    name: string;
    image: string;
    size: number;
}
