import { useState, useEffect, useCallback, useRef } from 'react'
import { storage } from '../utils/storage'

interface SoundBuffers {
    [key: string]: AudioBuffer
}

const SOUNDS = {
    move: 'sounds/hitted.mp3',
    cheat: 'sounds/cheating.mp3',
    win: 'sounds/done-perfect.mp3',
    colorChange: 'sounds/color-change.mp3',
    gameStart: 'sounds/game-start.mp3',
} as const

type SoundName = keyof typeof SOUNDS

export function useSoundManager() {
    const audioContextRef = useRef<AudioContext | null>(null)
    const gainNodeRef = useRef<GainNode | null>(null)
    const soundBuffersRef = useRef<SoundBuffers>({})
    const [muted, setMuted] = useState(() => storage.getMuted())
    const [isLoaded, setIsLoaded] = useState(false)

    // 初始化 AudioContext
    useEffect(() => {
        const initAudio = async () => {
            try {
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext
                const ctx = new AudioContext()
                audioContextRef.current = ctx

                const gainNode = ctx.createGain()
                gainNode.connect(ctx.destination)
                gainNode.gain.value = muted ? 0 : 0.5
                gainNodeRef.current = gainNode

                // 載入所有音效
                const loadPromises = Object.entries(SOUNDS).map(async ([name, url]) => {
                    try {
                        const basePath = import.meta.env.BASE_URL || '/'
                        const response = await fetch(`${basePath}${url}`)
                        const arrayBuffer = await response.arrayBuffer()
                        const buffer = await ctx.decodeAudioData(arrayBuffer)
                        soundBuffersRef.current[name] = buffer
                    } catch (error) {
                        console.warn(`載入音效 ${name} 失敗:`, error)
                    }
                })

                await Promise.all(loadPromises)
                setIsLoaded(true)
            } catch (error) {
                console.error('初始化音效系統失敗:', error)
            }
        }

        initAudio()

        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close()
            }
        }
    }, [])

    // 更新音量
    useEffect(() => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.setValueAtTime(
                muted ? 0 : 0.5,
                audioContextRef.current?.currentTime || 0
            )
        }
        storage.setMuted(muted)
    }, [muted])

    // 播放音效
    const playSound = useCallback((soundName: SoundName) => {
        if (muted) return

        const ctx = audioContextRef.current
        const buffer = soundBuffersRef.current[soundName]
        const gainNode = gainNodeRef.current

        if (!ctx || !buffer || !gainNode) return

        // iOS 需要在用戶交互後恢復
        if (ctx.state === 'suspended') {
            ctx.resume()
        }

        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.connect(gainNode)
        source.start(0)
    }, [muted])

    // 切換靜音
    const toggleMute = useCallback(() => {
        setMuted(prev => !prev)
    }, [])

    return {
        muted,
        isLoaded,
        toggleMute,
        playMoveSound: () => playSound('move'),
        playCheatSound: () => playSound('cheat'),
        playWinSound: () => playSound('win'),
        playColorChangeSound: () => playSound('colorChange'),
        playGameStartSound: () => playSound('gameStart'),
    }
}
