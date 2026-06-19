import Nav from '@/components/Nav'
import { PaginatedProfileBuildGrid } from '@/components/PaginatedProfileBuildGrid'
import { IconCalendar, IconLink, IconMapPin } from '@tabler/icons-react'
import { getPublicProfile } from '@/lib/public-data'

interface Props {
  params: Promise<{ username: string }>
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params
  const { profile, builds } = await getPublicProfile(username)
  const totalFollowers = builds.reduce((total, build) => total + build.followers, 0)
  const totalComments = builds.reduce((total, build) => total + build.comments, 0)

  return (
    <div className="page-shell">
      <Nav />

      <header className="profile-header">
        <div className="page-container profile-header-inner">
          <div className="avatar avatar-xl avatar-amber">{profile.displayName.charAt(0)}</div>

          <div className="profile-main">
            <div className="profile-name-row">
              <h1 className="profile-name">{profile.displayName}</h1>
              <span className="profile-handle">@{profile.username}</span>
            </div>

            <p className="profile-bio">Public Brickbook profile for builds shared by {profile.displayName}.</p>

            <div className="profile-meta">
              <span className="muted-row">
                <IconMapPin size={13} /> Western Australia
              </span>
              <span className="muted-row">
                <IconLink size={13} /> @{profile.username}
              </span>
              <span className="muted-row">
                <IconCalendar size={13} /> Brickbook member
              </span>
            </div>

            <div className="profile-stats">
              {[
                { value: builds.length, label: 'Builds' },
                { value: totalComments, label: 'Comments' },
                { value: totalFollowers, label: 'Followers' },
              ].map((stat) => (
                <span className="profile-stat" key={stat.label}>
                  <span className="profile-stat-value">{stat.value}</span>
                  <span className="profile-stat-label">{stat.label}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="profile-actions">
            <button className="btn btn-secondary btn-sm">Share</button>
          </div>
        </div>
      </header>

      <main className="page-container content-section">
        <h2 className="section-title">Builds</h2>

        <PaginatedProfileBuildGrid builds={builds} username={username} />
      </main>
    </div>
  )
}
