import { describe, expect, it } from "vitest";
import { STORE_TYPE_IMAGES, normalizeStoreType, storeTypeImage } from "./storeTypes.js";

describe("store type normalization", () => {
  it("rejects unsupported thumbnail image URLs", () => {
    expect(
      normalizeStoreType(
        "https://down-id.img.susercontent.com/file/id-11134258-7r98o-ly1pxywrszyh0b_tn.webp"
      )
    ).toBeNull();
  });

  it("renders Star with the canonical badge image", () => {
    expect(normalizeStoreType(STORE_TYPE_IMAGES.star)).toBe("star");
    expect(storeTypeImage("star")).toBe(STORE_TYPE_IMAGES.star);
  });
});
