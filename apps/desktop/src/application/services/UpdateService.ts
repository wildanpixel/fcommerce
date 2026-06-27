export type UpdateProvider = "github-releases" | "private-server" | "none";

export type UpdateStatus = {
  provider: UpdateProvider;
  enabled: boolean;
  currentVersion: string;
  message: string;
};

export interface UpdateService {
  getStatus(): Promise<UpdateStatus>;
  checkForUpdates(): Promise<UpdateStatus>;
}

export class NoopUpdateService implements UpdateService {
  constructor(private readonly currentVersion: string) {}

  async getStatus(): Promise<UpdateStatus> {
    return {
      provider: "none",
      enabled: false,
      currentVersion: this.currentVersion,
      message: "Auto update provider is not configured."
    };
  }

  async checkForUpdates(): Promise<UpdateStatus> {
    return this.getStatus();
  }
}
