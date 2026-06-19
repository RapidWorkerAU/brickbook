import Link from "next/link";
import Nav from "@/components/Nav";
import { PaginatedPublicBuildGrid } from "@/components/PaginatedPublicBuildGrid";
import { IconArrowLeft, IconBuildingCommunity, IconMapPin } from "@tabler/icons-react";
import { getEstateDetail } from "@/lib/public-data";

export default async function EstatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { entry, builds } = await getEstateDetail(slug);

  return (
    <div className="page-shell">
      <Nav />

      <div className="back-bar">
        <div className="page-container">
          <Link href="/estates" className="back-link">
            <IconArrowLeft size={13} /> All estates
          </Link>
        </div>
      </div>

      <header className="directory-detail-header">
        <div className="page-container">
          <div className="directory-detail-main">
            <div className="profile-header-inner p-0">
              <div className="directory-icon">
                <IconBuildingCommunity size={22} />
              </div>
              <div>
                <h1 className="directory-detail-title">{entry.name}</h1>
                <div className="profile-meta mt-2">
                  <span className="muted-row"><IconMapPin size={12} /> {entry.suburbs[0] || "Suburb TBA"}</span>
                </div>
                <p className="profile-bio">Public build activity for this estate, grouped from listed Brickbook builds.</p>
              </div>
            </div>
            <Link href="/discover" className="btn btn-secondary btn-sm">Browse all builds</Link>
          </div>
        </div>
      </header>

      <main className="page-container content-section">
        <div className="directory-detail-layout">
          <section>
            <h2 className="section-title">Builds in {entry.name}</h2>
            <PaginatedPublicBuildGrid builds={builds} />
          </section>
          <aside className="build-sidebar">
            <section className="card">
              <div className="card-body">
                <div className="section-label">Estate info</div>
                <div className="spec-row"><span className="spec-key">Builds</span><span className="spec-val">{entry.buildCount}</span></div>
                <div className="spec-row"><span className="spec-key">Suburb</span><span className="spec-val">{entry.suburbs[0] || "TBA"}</span></div>
                <div className="spec-row"><span className="spec-key">Builders</span><span className="spec-val">{entry.builders.length}</span></div>
              </div>
            </section>
            <section className="card">
              <div className="card-body">
                <div className="section-label">Builders active here</div>
                {entry.builderLinks.length > 0 ? entry.builderLinks.map((builder) => (
                  <div className="spec-row" key={builder.slug}>
                    <Link href={`/builders/${builder.slug}`} className="directory-link">{builder.name}</Link>
                  </div>
                )) : <p className="empty-state-sub">No builder data yet.</p>}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
