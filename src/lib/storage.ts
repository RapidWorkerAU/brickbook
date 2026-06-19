import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_BUCKET = "brickbook-build-images";
type ImageTransform = {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
};

export function parseStoragePath(storagePath: string) {
  const parts = storagePath.split("/");
  if (parts.length > 1 && parts[0].startsWith("brickbook-")) {
    return {
      bucket: parts[0],
      path: parts.slice(1).join("/"),
    };
  }

  return {
    bucket: DEFAULT_BUCKET,
    path: storagePath,
  };
}

export async function getSignedImageUrl(storagePath: string, expiresIn = 3600, transform?: ImageTransform) {
  const admin = createAdminClient();
  const { bucket, path } = parseStoragePath(storagePath);
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn, transform ? { transform } : undefined);

  if (error) return null;
  return data.signedUrl;
}

export async function getSignedImageUrls(storagePaths: string[], expiresIn = 3600) {
  const admin = createAdminClient();
  const output = new Map<string, string | null>();
  if (storagePaths.length === 0) return output;

  const uniquePaths = Array.from(new Set(storagePaths.filter(Boolean)));
  const byBucket = new Map<string, string[]>();

  for (const storagePath of uniquePaths) {
    const { bucket, path } = parseStoragePath(storagePath);
    const list = byBucket.get(bucket) ?? [];
    list.push(path);
    byBucket.set(bucket, list);
  }

  await Promise.all(
    Array.from(byBucket.entries()).map(async ([bucket, paths]) => {
      const { data, error } = await admin.storage.from(bucket).createSignedUrls(paths, expiresIn);
      if (error || !data) {
        for (const path of paths) {
          output.set(`${bucket}/${path}`, null);
        }
        return;
      }
      for (let i = 0; i < paths.length; i += 1) {
        const signedUrl = data[i]?.signedUrl ?? null;
        output.set(`${bucket}/${paths[i]}`, signedUrl);
      }
    }),
  );

  for (const storagePath of uniquePaths) {
    const { bucket, path } = parseStoragePath(storagePath);
    if (!output.has(`${bucket}/${path}`)) {
      output.set(`${bucket}/${path}`, null);
    }
    output.set(storagePath, output.get(`${bucket}/${path}`) ?? null);
  }

  return output;
}
