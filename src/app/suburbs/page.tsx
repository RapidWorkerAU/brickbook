import Nav from "@/components/Nav";
import { PaginatedSuburbTable } from "@/components/PaginatedSuburbTable";
import { getSuburbDirectory } from "@/lib/public-data";

export default async function SuburbsPage() {
  const suburbs = await getSuburbDirectory();
  const totalBuilds = suburbs.reduce((total, suburb) => total + suburb.buildCount, 0);

  return (
    <div className="page-shell">
      <Nav />

      <header className="page-header">
        <div className="page-container directory-header-row">
          <div>
            <p className="landing-kicker">Directory</p>
            <h1 className="page-title">Suburbs</h1>
            <p className="page-subtitle">{suburbs.length} suburbs - {totalBuilds} builds documented across Australia</p>
          </div>
        </div>
      </header>

      <main className="page-container content-section">
        {suburbs.length > 0 ? (
          <PaginatedSuburbTable suburbs={suburbs} />

        ) : (
          <div className="empty-state">
            <h2 className="empty-state-title">No suburbs yet</h2>
            <p className="empty-state-sub">Suburbs will appear here when public builds are listed.</p>
          </div>
        )}
      </main>
    </div>
  );
}
