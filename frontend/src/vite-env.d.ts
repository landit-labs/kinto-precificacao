/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base da API do backend (default: http://localhost:8000). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
