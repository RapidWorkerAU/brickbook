import Link from "next/link";
import Nav from "@/components/Nav";
import { PaginatedPublicBuildGrid } from "@/components/PaginatedPublicBuildGrid";
import { IconArrowLeft, IconBuildingCommunity, IconCheck, IconMapPin } from "@tabler/icons-react";
import { getBuilderDetail } from "@/lib/public-data";

export default async function BuilderProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { entry, builds } = await getBuilderDetail(slug);

  return (
    <div className="page-shell">
      <Nav />

      <div className="back-bar">
        <div className="page-container">
          <Link href="/builders" className="back-link">
            <IconArrowLeft size={13} /> All builders
          </Link>
        </div>
      </div>

      <header className="directory-detail-header">
        <div className="page-container">
          <div className="directory-detail-main">
            <div className="profile-header-inner p-0">
              <div className="directory-icon">
                <IconBuildingCommunity size={24} />
              </div>
              <div>
                <div className="directory-detail-title-row">
                  <h1 className="directory-detail-title">{entry.name}</h1>
                  <span className="badge badge-listed"><IconCheck size={10} /> Public data</span>
                </div>
                <p className="profile-bio">Public build activity for {entry.name}, grouped from listed Brickbook builds.</p>
                <div className="profile-meta">
                  <span className="muted-row"><IconMapPin size={13} /> {entry.suburbs.slice(0, 3).join(", ") || "WA"}</span>
                </div>
              </div>
            </div>
          </div>
          <Stats items={[
            { value: entry.buildCount, label: "Builds documented" },
            { value: builds.length, label: "Public builds" },
            { value: entry.suburbs.length, label: "Suburbs" },
          ]} />
        </div>
      </header>

      <main className="page-container content-section">
        <div className="directory-detail-layout">
          <section>
            <h2 className="section-title">Builds with {entry.name}</h2>
            <PaginatedPublicBuildGrid builds={builds} />
          </section>
          <aside className="build-sidebar">
            <DirectoryCard title="Builds by suburb" items={entry.suburbs.map((suburb) => ({ label: suburb, href: `/suburbs/${slugifyPath(suburb)}` }))} />
          </aside>
        </div>
      </main>
    </div>
  );
}

function Stats({ items }: { items: { value: string | number; label: string }[] }) {
  return (
    <div className="directory-detail-stats">
      {items.map((item) => (
        <div key={item.label}>
          <span className="profile-stat-value">{item.value}</span>
          <span className="profile-stat-label ml-1.5">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function DirectoryCard({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <section className="card">
      <div className="card-body">
        <div className="section-label">{title}</div>
        {items.length > 0 ? items.map((item) => (
          <div className="spec-row" key={item.href}>
            <Link href={item.href} className="directory-link">{item.label}</Link>
          </div>
        )) : <p className="empty-state-sub">No data yet.</p>}
      </div>
    </section>
  );
}

function slugifyPath(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
