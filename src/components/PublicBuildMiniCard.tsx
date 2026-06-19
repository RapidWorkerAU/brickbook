import Image from "next/image";
import Link from "next/link";
import type { PublicBuildCard } from "@/lib/public-data";

export function PublicBuildMiniCard({ build }: { build: PublicBuildCard }) {
  return (
    <Link href={`/${build.username}/${build.slug}`} className="catalogue-card">
      <article className="build-card">
        <div className="mini-build-image">
          {build.imageUrl ? (
            // Signed Supabase URLs are rendered directly until remote image patterns are finalized.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={build.imageUrl} alt={`${build.title} in ${build.suburb ?? "Australia"}`} />
          ) : (
            <Image src="/images/comingsoon.jpg" alt="" fill sizes="(min-width: 768px) 25vw, 100vw" />
          )}
          <div className="card-badge-row">
            <span className="badge badge-phase">{build.phase}</span>
          </div>
        </div>
        <div className="catalogue-card-body">
          <h3 className="catalogue-card-title">{build.title}</h3>
          <p className="catalogue-card-subtitle">{build.builder || "Builder TBA"}</p>
        </div>
        <div className="catalogue-card-footer">
          <span className="metric">{build.followers} followers</span>
          <span className="metric">{build.week ? `Wk ${build.week}` : build.phase}</span>
        </div>
      </article>
    </Link>
  );
}
