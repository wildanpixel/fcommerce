import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LicenseActivationService } from "./LicenseActivationService.js";

const SIGNED_TEST_LICENSE = "eyJ2ZXJzaW9uIjoxLCJsaWNlbnNlSWQiOiJ0ZXN0LTU0Y2Q5YWJmNTA3NSIsImVtYWlsIjoid2lsZGFuQGV4YW1wbGUuY29tIiwicGFzc3dvcmRTYWx0IjoiblNWcUFCUUhWT2xyVnlUQl9LQ1owZyIsInBhc3N3b3JkSGFzaCI6ImxhUnhRVHYwc01LMkludm5obzNYYjdUbE1sNmJUZWU3ZzBrQjdBeUY4dGMiLCJpc3N1ZWRBdCI6IjIwMjYtMDgtMDlUMDA6MDA6MDAuMDAwWiIsImV4cGlyZXNBdCI6IjIwOTktMTItMzFUMDA6MDA6MDAuMDAwWiIsInByb2R1Y3QiOiJyZXNlYXJjaC1wcm9kdWN0LW1hcmtldCJ9.IP80m_RFmH20SGJFYvepXMY2JccrqkNK-aDyHAZWU43Ymh4ff1FPEBE1hRU6jALtdu1rcx5PgwMsV-_B1eUFQLzG9-FPvryCqwq87L19uV2u9L_8ANb92wao3gUT615Wu9IAWJh_qZjTKMGeVdXRKx-8iCkZPwOjLLLRhoZYoNAUyZkXYaqGqPJvRsmN-MMyLYw_6i4kTkQg9m7ThNJP-xUHlsq70rOZjvMQJYgiDuKaiXGFwIhHiHLJYgQN9VfSNR_lai_yoCXJ_uypy8Di71fGHbeer5j59-DFpX59-TmKnHC-mT1XScZnab9hiPDbPvedhD9V1SB-mzf6Lx1s1xTWgxIVdyw8vfZ5MEfRGF_qTbfLG_FZnUkRiwQ015IlGBJSyDClk8AlC39aLYno68156UDsIz6F5BMzWOCVc_UOawlkMxFkKIVSsyGd9FUqcDwwCDifNbvr_eNgPVQo5QL3R67FBAhPhIo3wZIe4XJlg2Q8RTshlqRkj_j8JRiP";

describe("LicenseActivationService", () => {
  it("creates an authenticated development session without weakening packaged enforcement", async () => {
    const directory = await mkdtemp(join(tmpdir(), "rpm-license-"));
    const service = new LicenseActivationService(directory, true);
    const status = await service.status();
    expect(status.developmentBypass).toBe(true);
    expect(status.authenticated).toBe(true);
    expect(service.hasValidSession(status.sessionToken)).toBe(true);
  });

  it("does not authenticate an unactivated production installation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "rpm-license-"));
    const service = new LicenseActivationService(directory, false);
    const status = await service.status();
    expect(status.requiresActivation).toBe(true);
    expect(status.authenticated).toBe(false);
    expect(service.hasValidSession(undefined)).toBe(false);
  });

  it("restores an authenticated production session from a saved activation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "rpm-license-"));
    const service = new LicenseActivationService(directory, false);
    const activated = await service.activate({
      email: "wildan@example.com",
      password: "valid-password",
      license: SIGNED_TEST_LICENSE
    });
    expect(activated.authenticated).toBe(true);
    expect(service.hasValidSession(activated.sessionToken)).toBe(true);

    const restartedService = new LicenseActivationService(directory, false);
    const restored = await restartedService.status();
    expect(restored.authenticated).toBe(true);
    expect(restored.email).toBe("wildan@example.com");
    expect(restartedService.hasValidSession(restored.sessionToken)).toBe(true);
  });
});
