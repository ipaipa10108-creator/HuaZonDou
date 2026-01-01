import { useState, useEffect } from 'react'
import { storage } from '../utils/storage'
import './SettingsModal.css'

interface SettingsModalProps {
    onClose: () => void
    onSave: () => void
}

export default function SettingsModal({ onClose, onSave }: SettingsModalProps) {
    const [enabled, setEnabled] = useState(false)
    const [value, setValue] = useState(30)

    useEffect(() => {
        const settings = storage.getSwapSensitivity()
        setEnabled(settings.enabled)
        setValue(settings.value)
    }, [])

    const handleSave = () => {
        storage.setSwapSensitivity({ enabled, value })
        onSave()
        onClose()
    }

    return (
        <div className="settings-modal-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
        }}>
            <div className="settings-modal">
                <header className="settings-header">
                    <h2>⚙️ 遊戲設定</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </header>

                <div className="settings-content">
                    <div className="setting-item">
                        <div className="setting-row">
                            <span className="setting-label">轉珠靈敏度調整</span>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={(e) => setEnabled(e.target.checked)}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                        {enabled && (
                            <div className="sensitivity-control">
                                <div className="value-display">
                                    <span>靈敏度 (冷卻時間)</span>
                                    <span className="current-value">{value} ms</span>
                                </div>
                                <input
                                    type="range"
                                    min="5"
                                    max="250"
                                    step="5"
                                    value={value}
                                    onChange={(e) => setValue(parseInt(e.target.value))}
                                    className="range-slider"
                                />
                                <div className="value-display">
                                    <span>快 (5ms)</span>
                                    <span>慢 (250ms)</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <footer className="settings-footer">
                    <button className="save-btn" onClick={handleSave}>
                        儲存設定
                    </button>
                </footer>
            </div>
        </div>
    )
}
