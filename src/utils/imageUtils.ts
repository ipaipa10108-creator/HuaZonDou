/**
 * 預處理圖片為正方形
 */
export async function preprocessImage(
    imageSource: string,
    gridSize: number
): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!imageSource) {
            reject(new Error('圖片源為空'))
            return
        }

        const img = new Image()
        if (imageSource.startsWith('http')) {
            img.crossOrigin = 'Anonymous'
        }

        const timeoutId = setTimeout(() => {
            reject(new Error('圖片載入超時'))
        }, 10000)

        img.onload = function () {
            clearTimeout(timeoutId)

            try {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')

                if (!ctx) {
                    reject(new Error('無法獲取畫布上下文'))
                    return
                }

                const canvasDimension = Math.max(img.width, img.height)
                const targetCanvasSize = Math.max(canvasDimension, gridSize * 100)
                canvas.width = targetCanvasSize
                canvas.height = targetCanvasSize

                ctx.fillStyle = '#FFFFFF'
                ctx.fillRect(0, 0, canvas.width, canvas.height)

                const scale = Math.min(canvas.width / img.width, canvas.height / img.height)
                const scaledWidth = img.width * scale
                const scaledHeight = img.height * scale
                const offsetX = (canvas.width - scaledWidth) / 2
                const offsetY = (canvas.height - scaledHeight) / 2

                ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

                try {
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
                    resolve(dataUrl)
                } catch (error) {
                    if ((error as Error).name === 'SecurityError') {
                        resolve(imageSource)
                    } else {
                        reject(error)
                    }
                }
            } catch (error) {
                reject(error)
            }
        }

        img.onerror = function () {
            clearTimeout(timeoutId)
            reject(new Error('圖片載入失敗'))
        }

        img.src = imageSource
    })
}

/**
 * 將圖片切割成小塊
 */
export async function cutImageIntoPieces(
    squareImageSource: string,
    gridSize: number
): Promise<string[]> {
    return new Promise((resolve, reject) => {
        if (!squareImageSource) {
            reject(new Error('用於切割的圖片源為空'))
            return
        }

        const mainImage = new Image()

        mainImage.onload = () => {
            if (mainImage.width === 0 || mainImage.height === 0) {
                reject(new Error('切割用的主圖片尺寸無效'))
                return
            }

            const pieceWidth = mainImage.width / gridSize
            const pieceHeight = mainImage.height / gridSize
            const piecesDataUrls: string[] = []

            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    const pieceCanvas = document.createElement('canvas')
                    pieceCanvas.width = pieceWidth
                    pieceCanvas.height = pieceHeight
                    const pieceCtx = pieceCanvas.getContext('2d')

                    if (!pieceCtx) {
                        reject(new Error('無法獲取小塊畫布的上下文'))
                        return
                    }

                    try {
                        pieceCtx.drawImage(
                            mainImage,
                            c * pieceWidth,
                            r * pieceHeight,
                            pieceWidth,
                            pieceHeight,
                            0,
                            0,
                            pieceWidth,
                            pieceHeight
                        )
                        piecesDataUrls.push(pieceCanvas.toDataURL('image/png'))
                    } catch {
                        piecesDataUrls.push('error_piece')
                    }
                }
            }

            resolve(piecesDataUrls)
        }

        mainImage.onerror = () => {
            reject(new Error('載入用於切割的主圖片失敗'))
        }

        mainImage.src = squareImageSource
    })
}

/**
 * 批量預處理預設圖片
 */
export async function preprocessPresetImages(
    presetImages: { name: string; src: string }[]
): Promise<{ name: string; src: string }[]> {
    const processedImages: { name: string; src: string }[] = []

    for (const image of presetImages) {
        try {
            const processedSrc = await preprocessImage(image.src, 4)
            processedImages.push({
                name: image.name,
                src: processedSrc,
            })
        } catch {
            processedImages.push({ ...image })
        }
    }

    return processedImages
}

/**
 * 從檔名生成識別碼
 */
export function sanitizeFilenameForKey(filename: string): string {
    if (!filename) return 'custom_unknown'
    const baseName = filename
        .substring(filename.lastIndexOf('/') + 1)
        .substring(filename.lastIndexOf('\\') + 1)
    const sanitized = baseName.replace(/[^a-zA-Z0-9_-]/g, '_')
    const truncated = sanitized.substring(0, 30)
    const finalKey = 'custom_' + truncated.toLowerCase()
    return finalKey === 'custom_' ? 'custom_upload' : finalKey
}
