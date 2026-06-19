import Link from "next/link";
import Nav from "@/components/Nav";
import { PaginatedPublicBuildGrid } from "@/components/PaginatedPublicBuildGrid";
import { IconArrowLeft, IconMapPin } from "@tabler/icons-react";
import { getSuburbDetail } from "@/lib/public-data";

export default async function SuburbPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { entry, builds } = await getSuburbDetail(slug);

  return (
    <div className="page-shell">
      <Nav />

      <div className="back-bar">
        <div className="page-container">
          <Link href="/suburbs" className="back-link">
            <IconArrowLeft size={13} /> All suburbs
          </Link>
        </div>
      </div>

      <header className="directory-detail-header">
        <div className="page-container">
          <div className="directory-detail-main">
            <div>
              <div className="directory-detail-title-row">
                <IconMapPin size={16} className="text-[var(--bb-stone-400)]" />
                <h1 className="directory-detail-title">{entry.name}</h1>
                <span className="profile-handle">WA</span>
              </div>
              <p className="page-subtitle">{entry.buildCount} builds documented from public Brickbook listings.</p>
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
            <InfoCard title="Stats" rows={[
              { key: "Total builds", val: entry.buildCount },
              { key: "Builders", val: entry.builders.length },
              { key: "Estates", val: Array.from(new Set(builds.map((build) => build.estate).filter(Boolean))).length },
            ]} />
            <LinkList title="Top builders here" items={entry.builderLinks.map((builder) => ({ label: builder.name, href: `/builders/${builder.slug}` }))} />
          </aside>
        </div>
      </main>
    </div>
  );
}

function InfoCard({ title, rows }: { title: string; rows: { key: string; val: string | number }[] }) {
  return (
    <section className="card">
      <div className="card-body">
        <div className="section-label">{title}</div>
        {rows.map((row) => (
          <div className="spec-row" key={row.key}>
            <span className="spec-key">{row.key}</span>
            <span className="spec-val">{row.val}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function LinkList({ title, items }: { title: string; items: { label: string; href: string }[] }) {
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
