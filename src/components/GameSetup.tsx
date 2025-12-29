import { useState, useEffect, useRef, ChangeEvent } from 'react'
import { GameSettings, GameMode, Player, PresetImage, RemoteLevel } from '../types'
import { sanitizeFilenameForKey, preprocessImage } from '../utils/imageUtils'
import { getLevels } from '../services/googleSheetsApi'
import './GameSetup.css'

interface GameSetupProps {
    player: Player
    onStartGame: (settings: GameSettings) => void
    onLogout: () => void
}

// 預設圖片列表
const PRESET_IMAGES: PresetImage[] = [
    { name: 'C9', src: 'images/C9.webp' },
    { name: 'C1', src: 'images/C1.webp' }, { name: 'C2', src: 'images/C2.webp' },
    { name: 'C3', src: 'images/C3.webp' }, { name: 'C4', src: 'images/C4.webp' },
    { name: 'C5', src: 'images/C5.webp' }, { name: 'C6', src: 'images/C6.webp' },
    { name: 'C7', src: 'images/C7.webp' }, { name: 'C8', src: 'images/C8.webp' },
    { name: 'E1', src: 'images/E1.webp' }, { name: 'E2', src: 'images/E2.webp' },
    { name: 'E3', src: 'images/E3.webp' }, { name: 'E4', src: 'images/E4.webp' },
    { name: 'E5', src: 'images/E5.webp' }, { name: 'E6', src: 'images/E6.webp' },
    { name: 'M1', src: 'images/M1.webp' }, { name: 'M2', src: 'images/M2.webp' },
    { name: 'M3', src: 'images/M3.webp' }, { name: 'M4', src: 'images/M4.webp' },
    { name: 'M5', src: 'images/M5.webp' }, { name: 'H1', src: 'images/H1.webp' },
    { name: 'H2', src: 'images/H2.webp' }, { name: 'H3', src: 'images/H3.webp' },
    { name: 'H4', src: 'images/H4.webp' }, { name: 'H5', src: 'images/H5.webp' },
    { name: 'H6', src: 'images/H6.webp' }
]

const SIZES = [3, 4, 5, 6, 8]

export default function GameSetup({ player, onStartGame, onLogout }: GameSetupProps) {
    const [mode, setMode] = useState<GameMode>('number')
    const [size, setSize] = useState(4)
    const [selectedImage, setSelectedImage] = useState<PresetImage | null>(null)
    const [customImageSrc, setCustomImageSrc] = useState<string | null>(null)
    const [customImageName, setCustomImageName] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [remoteLevels, setRemoteLevels] = useState<RemoteLevel[]>([])
    const [isLoadingLevels, setIsLoadingLevels] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const basePath = (import.meta as any).env.BASE_URL || '/'

    // 載入網路關卡
    useEffect(() => {
        const loadRemoteLevels = async () => {
            setIsLoadingLevels(true)
            try {
                const levels = await getLevels()
                setRemoteLevels(levels)
            } catch (error) {
                console.error('載入網路關卡失敗:', error)
            } finally {
                setIsLoadingLevels(false)
            }
        }
        loadRemoteLevels()
    }, [])

    // 當選擇圖片模式時，自動選中第一張圖片
    useEffect(() => {
        if (mode === 'image' && !selectedImage && !customImageSrc) {
            setSelectedImage(PRESET_IMAGES[0])
        }
    }, [mode, selectedImage, customImageSrc])

    const handleImageSelect = (image: PresetImage) => {
        setSelectedImage(image)
        setCustomImageSrc(null)
        setCustomImageName('')
    }

    const handleCustomImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsProcessing(true)

        try {
            const reader = new FileReader()
            reader.onload = async (event) => {
                const src = event.target?.result as string
                try {
                    const processed = await preprocessImage(src, size)
                    setCustomImageSrc(processed)
                    setCustomImageName(file.name)
                    setSelectedImage(null)
                } catch {
                    alert('圖片處理失敗')
                }
                setIsProcessing(false)
            }
            reader.readAsDataURL(file)
        } catch {
            setIsProcessing(false)
            alert('讀取圖片失敗')
        }
    }

    const handleStartGame = async () => {
        if (mode === 'image') {
            let imageSource: string
            let imageIdentifier: string
            let imageDisplayName: string

            if (customImageSrc) {
                imageSource = customImageSrc
                imageIdentifier = sanitizeFilenameForKey(customImageName)
                imageDisplayName = customImageName
            } else if (selectedImage) {
                try {
                    setIsProcessing(true)
                    imageSource = await preprocessImage(`${basePath}${selectedImage.src}`, size)
                    imageIdentifier = selectedImage.name
                    imageDisplayName = selectedImage.name
                } catch {
                    alert('圖片處理失敗，請重試')
                    setIsProcessing(false)
                    return
                }
                setIsProcessing(false)
            } else {
                alert('請選擇一張圖片')
                return
            }

            onStartGame({
                mode,
                size,
                imageSource,
                imageIdentifier,
                imageDisplayName,
            })
        } else {
            onStartGame({ mode, size })
        }
    }

    return (
        <div className="game-setup">
            <div className="setup-container">
                <header className="setup-header">
                    <h1>燒腦華榮道</h1>
                    <div className="player-info">
                        <span>玩家: {player.id}</span>
                        <button onClick={onLogout} className="logout-btn">登出</button>
                    </div>
                </header>

                <section className="setup-section">
                    <h2>選擇遊戲模式</h2>
                    <div className="mode-buttons">
                        <button
                            className={`mode-btn ${mode === 'number' ? 'selected' : ''}`}
                            onClick={() => setMode('number')}
                        >
                            <span className="mode-icon">🔢</span>
                            <span>數字模式</span>
                        </button>
                        <button
                            className={`mode-btn ${mode === 'image' ? 'selected' : ''}`}
                            onClick={() => setMode('image')}
                        >
                            <span className="mode-icon">🖼️</span>
                            <span>圖片模式</span>
                        </button>
                    </div>
                </section>

                {mode === 'image' && (
                    <section className="setup-section">
                        <h2>選擇圖片</h2>
                        <div className="image-grid">
                            {/* 顯示網路關卡 */}
                            {remoteLevels.map((level) => (
                                <div
                                    key={`remote-${level.id}`}
                                    className={`image-option remote-option ${selectedImage?.src === level.image && !customImageSrc ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedImage({ name: level.name, src: level.image })
                                        setCustomImageSrc(null)
                                        setCustomImageName('')
                                        // 如果網路關卡有指定尺寸，則自動切換
                                        if (level.size) setSize(level.size)
                                    }}
                                >
                                    <div className="remote-badge">網路</div>
                                    <img src={level.image} alt={level.name} />
                                    <span className="image-name">{level.name}</span>
                                </div>
                            ))}
                            {/* 顯示預設圖片 */}
                            {PRESET_IMAGES.map((image) => (
                                <div
                                    key={image.name}
                                    className={`image-option ${selectedImage?.name === image.name && selectedImage?.src === `${basePath}${image.src}` && !customImageSrc ? 'selected' : ''}`}
                                    onClick={() => handleImageSelect(image)}
                                >
                                    <img src={`${basePath}${image.src}`} alt={image.name} />
                                    <span className="image-name">{image.name}</span>
                                </div>
                            ))}
                        </div>
                        {isLoadingLevels && <div className="loading-text">載入網路關卡中...</div>}
                        <div className="custom-upload">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleCustomImageUpload}
                                hidden
                            />
                            <button
                                className="upload-btn"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isProcessing}
                            >
                                {isProcessing ? '處理中...' : '📁 上傳自訂圖片'}
                            </button>
                            {customImageSrc && (
                                <div className="custom-preview">
                                    <img src={customImageSrc} alt="自訂圖片" />
                                    <span>{customImageName}</span>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                <section className="setup-section">
                    <h2>選擇難度</h2>
                    <div className="size-buttons">
                        {SIZES.map((s) => (
                            <button
                                key={s}
                                className={`size-btn ${size === s ? 'selected' : ''}`}
                                onClick={() => setSize(s)}
                            >
                                {s}×{s}
                            </button>
                        ))}
                    </div>
                    <div className="custom-size">
                        <label>自訂尺寸:</label>
                        <input
                            type="number"
                            min={3}
                            max={10}
                            value={size}
                            onChange={(e) => {
                                const v = parseInt(e.target.value)
                                if (v >= 3 && v <= 10) setSize(v)
                            }}
                        />
                    </div>
                </section>

                <button
                    className="start-btn"
                    onClick={handleStartGame}
                    disabled={isProcessing || isLoadingLevels || (mode === 'image' && !selectedImage && !customImageSrc)}
                >
                    {isProcessing ? '準備中...' : (isLoadingLevels ? '載入中...' : '🎮 開始遊戲')}
                </button>
            </div>
        </div>
    )
}
