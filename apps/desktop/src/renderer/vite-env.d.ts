/// <reference types="vite/client" />

interface Window {
  marketplaceOS?: {
    apiBaseUrl: string;
    platform?: {
      get: () => Promise<unknown>;
      openPath: (targetPath: string) => Promise<boolean>;
      openUrl: (url: string) => Promise<boolean>;
      pickFolder: () => Promise<string | null>;
      pickFile: () => Promise<string | null>;
      copyText: (value: string) => Promise<boolean>;
    };
  };
}
