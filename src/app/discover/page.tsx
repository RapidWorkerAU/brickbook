import { DiscoverClient } from "@/app/discover/discover-client";
import { getPaginatedPublicBuilds, getPaginatedInspirationImages, getInspirationFilterMeta } from "@/lib/public-data";

export default async function DiscoverPage() {
  const [buildsResult, inspoResult, inspoMeta] = await Promise.all([
    getPaginatedPublicBuilds({ offset: 0, limit: 24 }),
    getPaginatedInspirationImages({ rawOffset: 0, limit: 24 }),
    getInspirationFilterMeta(),
  ]);

  return (
    <DiscoverClient
      initialBuilds={buildsResult.builds}
      initialBuildsHasMore={buildsResult.hasMore}
      initialInspirationImages={inspoResult.images}
      initialInspirationNextOffset={inspoResult.nextRawOffset}
      initialInspirationHasMore={inspoResult.hasMore}
      inspoRooms={inspoMeta.rooms}
      inspoStyles={inspoMeta.styles}
    />
  );
}
