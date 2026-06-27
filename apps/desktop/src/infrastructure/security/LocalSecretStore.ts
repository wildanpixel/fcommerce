import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { hostname, userInfo } from "node:os";
import { dirname, join } from "node:path";
import { getPlatformService } from "../platform/PlatformService.js";

type SecretFile = Record<
  string,
  {
    iv: string;
    tag: string;
    value: string;
  }
>;

export class LocalSecretStore {
  private readonly filePath: string;
  private readonly key: Buffer;

  constructor(filePath = join(getPlatformService().info.directories.settings, "secrets.json")) {
    this.filePath = filePath;
    const identity = `${userInfo().username}@${hostname()}:marketplace-intelligence-os`;
    this.key = scryptSync(identity, "local-desktop-secret-store", 32);
  }

  async save(name: string, value: string): Promise<void> {
    const file = await this.read();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    file[name] = {
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      value: encrypted.toString("base64")
    };
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(file, null, 2), "utf8");
  }

  async get(name: string): Promise<string | null> {
    const file = await this.read();
    const secret = file[name];
    if (!secret) {
      return null;
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(secret.iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(secret.tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(secret.value, "base64")),
      decipher.final()
    ]).toString("utf8");
  }

  private async read(): Promise<SecretFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as SecretFile;
    } catch {
      return {};
    }
  }
}
