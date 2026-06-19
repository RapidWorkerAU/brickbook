import { BuildProfileClient } from "@/app/[username]/[slug]/build-profile-client";
import { getPublicBuild } from "@/lib/public-data";

export default async function PublicBuildProfilePage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const build = await getPublicBuild(username, slug);

  return <BuildProfileClient build={build} username={username} />;
}
