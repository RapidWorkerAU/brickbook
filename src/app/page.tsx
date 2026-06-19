import Link from 'next/link'
import Image from 'next/image'
import Nav from '@/components/Nav'
import {
  IconArrowRight,
  IconBuildingCommunity,
  IconHeart,
  IconMessageCircle,
  IconTimeline,
  IconUsers,
} from '@tabler/icons-react'

const BUILDS = [
  {
    title: 'Our Hills Pavilion',
    builder: 'Nulook Homes',
    suburb: 'Gidgegannup',
    phase: 'Brickwork',
    followers: 142,
    week: 14,
    image: '/images/modern-home.jpg',
  },
  {
    title: 'The Merrifield Project',
    builder: 'Dale Alcock',
    suburb: 'Ellenbrook',
    phase: 'Frame',
    followers: 84,
    week: 9,
    image: '/images/family-home.jpg',
  },
  {
    title: 'Southern River Reno',
    builder: 'Owner builder',
    suburb: 'Southern River',
    phase: 'Fit-out',
    followers: 203,
    week: 31,
    image: '/images/modern-interior.jpg',
  },
  {
    title: 'Banksia Grove Build',
    builder: 'Celebration',
    suburb: 'Banksia Grove',
    phase: 'Slab',
    followers: 31,
    week: 5,
    image: '/images/hero-1.jpg',
  },
  {
    title: 'Sinagra Storey',
    builder: 'Webb & Brown-Neaves',
    suburb: 'Sinagra',
    phase: 'Roof',
    followers: 76,
    week: 18,
    image: '/images/vertical-home.jpg',
  },
  {
    title: 'Clarkson KDR',
    builder: 'ABN Group',
    suburb: 'Clarkson',
    phase: 'Selections',
    followers: 49,
    week: 3,
    image: '/images/suburb.jpg',
  },
]

const TICKER_ITEMS = [
  { live: true, text: '@leggy59 posted a Brickwork update - 4 min ago' },
  { live: false, text: 'Sinagra Storey hit lock-up - 2 hrs ago' },
  { live: false, text: '@buildingwithbec asked a question on The Merrifield Project' },
  { live: true, text: 'Banksia Grove Build poured their slab today' },
  { live: false, text: '38 new builds started this month' },
]

const FEATURES = [
  {
    icon: IconBuildingCommunity,
    title: 'Build profiles',
    desc: 'One home, one page. Every update, photo, and milestone in one place from first slab to handover.',
  },
  {
    icon: IconTimeline,
    title: 'Milestone tracking',
    desc: 'Structure your build by phase. Slab, frame, brickwork, lock-up, and every stage after that.',
  },
  {
    icon: IconUsers,
    title: 'Follow builds',
    desc: 'Follow builds that interest you and see their updates the moment they post.',
  },
  {
    icon: IconMessageCircle,
    title: 'Ask anything',
    desc: "Comment on photos or ask the owner directly. Real answers from people who've been through it.",
  },
]

const STATS = [
  { value: '2,841', label: 'Builds documented' },
  { value: '47,200', label: 'Updates posted' },
  { value: '312', label: 'Builders tracked' },
]

export default function LandingPage() {
  return (
    <div className="landing-page">
      <Nav />

      <section className="landing-hero">
        <div className="hero-image-grid" aria-hidden="true">
          {BUILDS.map((build) => (
            <div className="hero-image-tile" key={build.title}>
              <Image src={build.image} alt="" fill sizes="(min-width: 768px) 17vw, 33vw" />
              <div className="hero-image-meta">
                <span className="hero-image-phase">{build.phase}</span>
                {build.title}
              </div>
            </div>
          ))}
        </div>
        <div className="hero-overlay" />

        <div className="hero-content">
          <div className="hero-inner">
            <p className="hero-eyebrow">Every build tells a story</p>
            <h1 className="hero-title">Document your build. Follow others. Build together.</h1>
            <p className="hero-subtitle">
              A community built for people building homes - share your progress, ask questions, and follow
              builds happening right now.
            </p>
            <div className="hero-actions">
              <Link href="/get-started?tab=signup" className="btn btn-secondary btn-lg">
                Start your build profile
              </Link>
              <Link href="/discover" className="btn btn-secondary btn-lg">
                Browse builds
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="ticker">
        <div className="ticker-track">
          {TICKER_ITEMS.map((item) => (
            <div className="ticker-item" key={item.text}>
              <span className={item.live ? 'ticker-dot ticker-dot-live' : 'ticker-dot'} />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="stats-band">
        <div className="stats-grid">
          {STATS.map((stat) => (
            <div className="landing-stat" key={stat.label}>
              <div className="landing-stat-value">{stat.value}</div>
              <div className="landing-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="landing-section">
        <div className="page-container landing-feature-layout">
          <div>
            <p className="landing-kicker">What Brickbook is</p>
            <h2 className="landing-heading">Instagram was not built for this</h2>
            <p className="landing-copy">
              Your build deserves more than a hashtag. Brickbook gives your home its own profile,
              structured by milestone, searchable by suburb, and open to people doing the same thing.
            </p>

            <div className="feature-grid">
              {FEATURES.map((feature) => {
                const Icon = feature.icon

                return (
                  <div className="feature-card" key={feature.title}>
                    <Icon size={20} />
                    <h3>{feature.title}</h3>
                    <p>{feature.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <article className="update-card">
            <div className="sample-card-image">
              <Image src="/images/modern-interior.jpg" alt="Interior selection update" fill sizes="(min-width: 768px) 50vw, 100vw" />
            </div>
            <div className="card-body">
              <div className="flex items-center justify-between mb-3">
                <span className="badge badge-phase">Brickwork</span>
                <span className="text-[11px] text-[var(--bb-stone-400)]">3 days ago</span>
              </div>
              <p className="text-[13px] leading-6 text-[var(--bb-black)]">
                Second course done and we are loving how the dark brick is sitting against the render.
                Still cannot believe how fast the crew moves.
              </p>
              <div className="mt-4 flex gap-4 border-t border-[var(--bb-stone-100)] pt-3">
                <span className="update-action">
                  <IconHeart size={14} /> 24
                </span>
                <span className="update-action">
                  <IconMessageCircle size={14} /> 7 comments
                </span>
              </div>
            </div>
            <div className="card-footer">
              <p className="text-xs text-[var(--bb-stone-600)]">
                <span className="font-medium text-[var(--bb-black)]">@buildingwithbec</span> - What brick did you use?
              </p>
              <p className="mt-1 text-[11px] text-[var(--bb-stone-400)]">2 hrs ago</p>
            </div>
          </article>
        </div>
      </section>

      <section className="recent-builds">
        <div className="page-container landing-section">
          <div className="section-header">
            <div>
              <p className="landing-kicker">Recently active</p>
              <h2 className="landing-heading">Builds happening now</h2>
            </div>
            <Link href="/discover" className="btn btn-secondary btn-sm">
              View all <IconArrowRight size={13} />
            </Link>
          </div>

          <div className="build-grid">
            {BUILDS.map((build) => (
              <article className="build-card" key={build.title}>
                <div className="build-card-image">
                  <Image src={build.image} alt={`${build.title} in ${build.suburb}`} fill sizes="(min-width: 768px) 16vw, 100vw" />
                </div>
                <div className="build-card-body">
                  <span className="badge badge-phase">{build.phase}</span>
                  <h3 className="build-card-title">{build.title}</h3>
                  <div className="build-card-meta">{build.suburb}</div>
                </div>
                <div className="build-card-footer">
                  <span>{build.followers} followers</span>
                  <span>Wk {build.week}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <h2>Your build deserves its own page</h2>
        <p>Free to join. Start documenting from day one, or jump in wherever you are at.</p>
        <Link href="/get-started?tab=signup" className="btn btn-secondary btn-lg">
          Create your build profile
        </Link>
      </section>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <span className="site-footer-brand">Brickbook</span>
          <div className="site-footer-links">
            {['Discover', 'Builders', 'Suburbs', 'Estates', 'Terms', 'Privacy', 'Disclaimer'].map((label) => (
              <Link key={label} href={`/${label.toLowerCase()}`}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
