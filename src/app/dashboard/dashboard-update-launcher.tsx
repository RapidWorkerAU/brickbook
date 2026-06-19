"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";
import { SearchableSelect } from "@/components/SearchableSelect";

type LauncherBuild = {
  id: string;
  title: string;
};

export function DashboardUpdateLauncher({ builds }: { builds: LauncherBuild[] }) {
  const [selectedTitle, setSelectedTitle] = useState(builds[0]?.title ?? "");
  const selectedBuild = useMemo(
    () => builds.find((build) => build.title === selectedTitle) ?? builds[0] ?? null,
    [builds, selectedTitle],
  );

  if (builds.length === 0) {
    return (
      <div className="card mb-5">
        <div className="card-body dashboard-update-launcher">
          <Link href="/dashboard/builds/new" className="btn btn-primary btn-sm gap-1">
            <IconPlus size={14} /> Add build
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-5">
      <div className="card-body dashboard-update-launcher">
        <div className="dashboard-update-label">Post update for</div>
        <div className="dashboard-update-field">
          <SearchableSelect
            label="Post update for"
            hideLabel
            value={selectedTitle}
            onChange={setSelectedTitle}
            options={builds.map((build) => build.title)}
          />
        </div>
        <Link
          href={selectedBuild ? `/dashboard/builds/${selectedBuild.id}/updates/new?returnTo=/dashboard` : "/dashboard/builds/new"}
          className="btn btn-primary btn-sm gap-1 flex-shrink-0"
        >
          <IconPlus size={14} /> Post update
        </Link>
      </div>
    </div>
  );
}
