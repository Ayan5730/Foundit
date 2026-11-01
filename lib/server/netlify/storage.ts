import { getStore } from "@netlify/blobs";
import { getContext } from "@netlify/functions";

export function privateBucket(): R2Bucket {
  const store = () => {
    const context = getContext();
    const name = context.deploy.context === "production"
      ? "foundit-private-photos-production"
      : "foundit-private-photos-preview-" + context.deploy.id;
    return getStore({ name, consistency: "strong" });
  };
  return {
    async put(key: string, value: Uint8Array) { await store().set(key, new Uint8Array(value).buffer); },
    async get(key: string) {
      const body = await store().get(key, { type: "stream" });
      return body ? { body } : null;
    },
    async delete(key: string) { await store().delete(key); },
  } as unknown as R2Bucket;
}
