/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GOOGLE_APP_SCRIPT_URL: string
    // 其他自訂變數...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
