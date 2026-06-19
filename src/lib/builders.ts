import slugify from "slugify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CanonicalBuilder = {
  id: string;
  name: string;
  slug: string;
  normalized_name: string;
};

export function normalizeBuilderName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(pty|ltd|limited|homes?|builders?|construction|constructions)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getBuilderOptions() {
  const supabase = await createClient();
  const { data } = await supabase.from("builders").select("name").order("name", { ascending: true }).limit(500);
  return Array.from(new Set((data ?? []).map((builder) => builder.name).filter(Boolean)));
}

export async function ensureBuilderForName(rawName: string | null | undefined) {
  const name = String(rawName ?? "").trim().replace(/\s+/g, " ");
  if (!name) return null;

  const normalizedName = normalizeBuilderName(name) || name.toLowerCase();
  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("builders")
    .select("id,name,slug,normalized_name")
    .eq("normalized_name", normalizedName)
    .maybeSingle<CanonicalBuilder>();

  if (existingError) throw new Error(existingError.message);
  if (existing) return existing;

  const slug = await uniqueBuilderSlug(admin, name);
  const { data, error } = await admin
    .from("builders")
    .insert({ name, slug, normalized_name: normalizedName })
    .select("id,name,slug,normalized_name")
    .single<CanonicalBuilder>();

  if (error || !data) throw new Error(error?.message ?? "Unable to save builder.");
  return data;
}

async function uniqueBuilderSlug(admin: ReturnType<typeof createAdminClient>, name: string) {
  const base = slugify(name, { lower: true, strict: true }) || "builder";
  let candidate = base;
  let suffix = 2;

  while (true) {
    const { data, error } = await admin.from("builders").select("id").eq("slug", candidate).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}
