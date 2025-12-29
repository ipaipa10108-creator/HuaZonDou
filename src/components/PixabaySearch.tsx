import { useState, useEffect } from 'react'
import { searchImages, PixabayImage } from '../services/pixabayApi'
import { storage } from '../utils/storage'
import './PixabaySearch.css'

interface PixabaySearchProps {
    onSelect: (imageUrl: string, imageName: string) => void;
    onClose: () => void;
}

export default function PixabaySearch({ onSelect, onClose }: PixabaySearchProps) {
    const [apiKey, setApiKey] = useState('')
    const [query, setQuery] = useState('')
    const [images, setImages] = useState<PixabayImage[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [isKeySaved, setIsKeySaved] = useState(false)

    useEffect(() => {
        const savedKey = storage.getPixabayKey()
        if (savedKey) {
            setApiKey(savedKey)
            setIsKeySaved(true)
        }
    }, [])

    const handleSaveKey = () => {
        if (!apiKey.trim()) {
            setError('請輸入有效的 API Key')
            return
        }
        storage.setPixabayKey(apiKey.trim())
        setIsKeySaved(true)
        setError('')
    }

    const handleSearch = async () => {
        if (!isKeySaved) {
            setError('請先保存 API Key')
            return
        }
        if (!query.trim()) {
            setError('請輸入搜尋關鍵詞')
            return
        }

        setLoading(true)
        setError('')
        try {
            const results = await searchImages(query.trim(), apiKey)
            setImages(results)
            if (results.length === 0) {
                setError('找不到相關圖片')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '搜尋失敗')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="pixabay-search-overlay">
            <div className="pixabay-search-modal">
                <header className="modal-header">
                    <h3>網路搜圖 (Pixabay)</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </header>

                <div className="modal-body">
                    <section className="key-section">
                        <div className="input-with-button">
                            <input
                                type="text"
                                value={apiKey}
                                onChange={(e) => {
                                    setApiKey(e.target.value)
                                    setIsKeySaved(false)
                                }}
                                placeholder="輸入您的 Pixabay API Key..."
                                disabled={isKeySaved}
                            />
                            <button
                                className={`save-btn ${isKeySaved ? 'saved' : ''}`}
                                onClick={handleSaveKey}
                            >
                                {isKeySaved ? '已保存' : '保存'}
                            </button>
                        </div>
                        <a href="https://pixabay.com/api/docs/" target="_blank" rel="noopener noreferrer" className="apply-link">
                            申請免費 API Key
                        </a>
                    </section>

                    <section className="search-section">
                        <div className="input-with-button">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="輸入關鍵詞搜索圖片..."
                            />
                            <button className="search-btn" onClick={handleSearch} disabled={loading}>
                                {loading ? '...' : '搜索'}
                            </button>
                        </div>
                    </section>

                    {error && <div className="error-message">{error}</div>}

                    <div className="image-results">
                        {images.map((img) => (
                            <div
                                key={img.id}
                                className="image-item"
                                onClick={() => onSelect(img.largeImageURL, `pixabay-${img.id}`)}
                            >
                                <img src={img.webformatURL} alt={img.tags} />
                                <div className="image-hover-overlay">選中</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
