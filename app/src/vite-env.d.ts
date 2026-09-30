/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional CORS proxy prefix for browser-side scrape fetches
   *  (e.g. "https://my-proxy/?u="). See ConnectorsPanel / wfdfParse. */
  readonly VITE_WFDF_PROXY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
