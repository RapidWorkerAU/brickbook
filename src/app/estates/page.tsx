import Nav from "@/components/Nav";
import { PaginatedEstateDirectory } from "@/components/PaginatedDirectoryGrid";
import { getEstateDirectory } from "@/lib/public-data";

export default async function EstatesPage() {
  const estates = await getEstateDirectory();
  const totalBuilds = estates.reduce((total, estate) => total + estate.buildCount, 0);

  return (
    <div className="page-shell">
      <Nav />

      <header className="page-header">
        <div className="page-container directory-header-row">
          <div>
            <p className="landing-kicker">Directory</p>
            <h1 className="page-title">Estates</h1>
            <p className="page-subtitle">{estates.length} estates - {totalBuilds} builds documented</p>
          </div>
        </div>
      </header>

      <main className="page-container content-section">
        {estates.length > 0 ? (
          <PaginatedEstateDirectory estates={estates} />
        ) : (
          <div className="empty-state">
            <h2 className="empty-state-title">No estates yet</h2>
            <p className="empty-state-sub">Estates will appear here when public builds include estate data.</p>
          </div>
        )}
      </main>
    </div>
  );
}
