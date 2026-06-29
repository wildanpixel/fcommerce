/// <reference types="vite/client" />

import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare global {
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

  namespace JSX {
    interface IntrinsicElements {
      webview: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        allowpopups?: boolean;
        partition?: string;
        src?: string;
        useragent?: string;
        webpreferences?: string;
      };
    }
  }
}

export {};
