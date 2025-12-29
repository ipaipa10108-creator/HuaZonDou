import { useState, useCallback } from 'react'
import { preprocessImage, cutImageIntoPieces } from '../utils/imageUtils'

interface ImageProcessorState {
    isProcessing: boolean
    imagePieces: string[]
    processedImageSrc: string | null
    error: string | null
}

export function useImageProcessor() {
    const [state, setState] = useState<ImageProcessorState>({
        isProcessing: false,
        imagePieces: [],
        processedImageSrc: null,
        error: null,
    })

    // 處理圖片並切割
    const processImage = useCallback(async (
        imageSource: string,
        gridSize: number
    ): Promise<string[]> => {
        setState(prev => ({ ...prev, isProcessing: true, error: null }))

        try {
            // 步驟1: 預處理為正方形
            const squareImage = await preprocessImage(imageSource, gridSize)

            // 步驟2: 切割成小塊
            const pieces = await cutImageIntoPieces(squareImage, gridSize)

            setState({
                isProcessing: false,
                imagePieces: pieces,
                processedImageSrc: squareImage,
                error: null,
            })

            return pieces
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '圖片處理失敗'
            setState(prev => ({
                ...prev,
                isProcessing: false,
                error: errorMessage,
            }))
            throw err
        }
    }, [])

    // 清除狀態
    const clearState = useCallback(() => {
        setState({
            isProcessing: false,
            imagePieces: [],
            processedImageSrc: null,
            error: null,
        })
    }, [])

    return {
        ...state,
        processImage,
        clearState,
    }
}
