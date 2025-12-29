/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GOOGLE_APP_SCRIPT_URL: string
    readonly VITE_BASE_URL: string
    // 更多環境變數...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
