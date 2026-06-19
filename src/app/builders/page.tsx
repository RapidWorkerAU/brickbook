import Nav from "@/components/Nav";
import { PaginatedBuilderDirectory } from "@/components/PaginatedDirectoryGrid";
import { getBuilderDirectory } from "@/lib/public-data";

export default async function BuildersPage() {
  const builders = await getBuilderDirectory();
  const totalBuilds = builders.reduce((total, builder) => total + builder.buildCount, 0);

  return (
    <div className="page-shell">
      <Nav />

      <header className="page-header">
        <div className="page-container directory-header-row">
          <div>
            <p className="landing-kicker">Directory</p>
            <h1 className="page-title">Builders</h1>
            <p className="page-subtitle">{builders.length} builders tracked across {totalBuilds} builds</p>
          </div>
        </div>
      </header>

      <section className="directory-stats-band">
        <div className="page-container">
          <div className="directory-stats-grid">
            <Stat value={builders.length} label="Builders tracked" />
            <Stat value={totalBuilds} label="Builds documented" />
            <Stat value="Live" label="From public builds" />
          </div>
        </div>
      </section>

      <main className="page-container content-section">
        {builders.length > 0 ? (
          <PaginatedBuilderDirectory builders={builders} />
        ) : (
          <div className="empty-state">
            <h2 className="empty-state-title">No builders yet</h2>
            <p className="empty-state-sub">Builders will appear here when public builds are listed.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="directory-stat">
      <div className="directory-metric-value">{value}</div>
      <div className="directory-metric-label">{label}</div>
    </div>
  );
}
