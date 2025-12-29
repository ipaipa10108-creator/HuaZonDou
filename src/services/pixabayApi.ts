/**
 * Pixabay API 服務
 */

export interface PixabayImage {
    id: number;
    webformatURL: string;
    largeImageURL: string;
    tags: string;
}

/**
 * 搜尋圖片
 */
export async function searchImages(query: string, apiKey: string): Promise<PixabayImage[]> {
    if (!apiKey) {
        throw new Error('請先設定 Pixabay API Key');
    }

    const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=square&per_page=20`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('API 請求失敗，請檢查 API Key 是否正確');
        }
        const data = await response.json();
        return data.hits || [];
    } catch (error) {
        console.error('Pixabay 搜尋失敗:', error);
        throw error;
    }
}
