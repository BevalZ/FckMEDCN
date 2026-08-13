/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RELEASE_TRACK?: 'preview' | 'full';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
