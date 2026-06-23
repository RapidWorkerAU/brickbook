'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { IconMessageCircle, IconCheck, IconSearch, IconX, IconFilter, IconClock, IconTrendingUp, IconCircleDashed } from '@tabler/icons-react'
import { MultiSelectFilter } from '@/components/MultiSelectFilter'
import { COMMUNITY_TAGS } from '@/lib/community-data'
import type { CommunityPost, FeedSort, TopContributor } from '@/lib/community-data'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PostCard({ post }: { post: CommunityPost }) {
  const router = useRouter()
  const preview = post.body ? (post.body.length > 160 ? post.body.slice(0, 160) + '…' : post.body) : null

  return (
    <div className="community-post-card" onClick={() => router.push(`/community/${post.id}`)} role="article">
      <div className="community-post-card-meta">
        <Link href={`/${post.username}`} className="community-post-author" onClick={(e) => e.stopPropagation()}>
          <span className="avatar avatar-sm avatar-amber">{(post.displayName ?? post.username).charAt(0).toUpperCase()}</span>
          <span className="community-post-author-name">{post.displayName ?? post.username}</span>
          <span className="community-post-author-handle">@{post.username}</span>
        </Link>
        <span className="community-post-time">{timeAgo(post.createdAt)}</span>
      </div>

      {post.tags.length > 0 && (
        <div className="community-post-tags">
          {post.tags.map((tag) => (
            <span key={tag} className="community-tag">{tag}</span>
          ))}
        </div>
      )}

      <h2 className="community-post-title">{post.title}</h2>
      {preview && <p className="community-post-preview">{preview}</p>}

      {post.images.length > 0 && (
        <div className={`community-post-images community-post-images-${Math.min(post.images.length, 4)}`}>
          {post.images.slice(0, 4).map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img.id} src={img.imageUrl} alt="" className="community-post-thumb" />
          ))}
        </div>
      )}

      <div className="community-post-footer">
        <span className="community-post-stat">
          <IconMessageCircle size={13} />
          {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
        </span>
        {post.acceptedCommentId && (
          <span className="community-answered-badge">
            <IconCheck size={11} /> Answered
          </span>
        )}
      </div>
    </div>
  )
}

const TAG_OPTIONS = COMMUNITY_TAGS.map((tag) => ({ id: tag, label: tag }))

const SORT_MODES: { value: FeedSort; icon: React.FC<{ size?: number }>; title: string; desc: string }[] = [
  { value: 'latest', icon: IconClock, title: 'Latest', desc: 'Most recently posted questions' },
  { value: 'active', icon: IconTrendingUp, title: 'Most Active', desc: 'Questions with the most discussion' },
  { value: 'unanswered', icon: IconCircleDashed, title: 'Unanswered', desc: 'Questions still looking for answers' },
]

export default function CommunityFeedClient({
  initialPosts,
  initialHasMore,
  initialSort,
  initialTags,
  initialSearch,
  currentUserId,
  topContributors,
}: {
  initialPosts: CommunityPost[]
  initialHasMore: boolean
  initialSort: FeedSort
  initialTags: string[]
  initialSearch: string
  currentUserId: string | null
  currentUsername: string | null
  topContributors: TopContributor[]
}) {
  const router = useRouter()
  const pathname = usePathname()

  const [posts, setPosts] = useState(initialPosts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [sort, setSort] = useState<FeedSort>(initialSort)
  const [activeTags, setActiveTags] = useState<string[]>(initialTags)
  const [search, setSearch] = useState(initialSearch)
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [loading, setLoading] = useState(false)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const offsetRef = useRef(initialPosts.length)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialized = useRef(false)

  const buildUrl = useCallback((s: FeedSort, t: string[], q: string) => {
    const p = new URLSearchParams()
    if (s !== 'latest') p.set('sort', s)
    if (t.length > 0) p.set('tags', t.join(','))
    if (q) p.set('search', q)
    const qs = p.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }, [pathname])

  const fetchPage = useCallback(async (s: FeedSort, t: string[], q: string, startOffset: number, append: boolean) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sort: s, offset: String(startOffset), limit: '20' })
      if (t.length > 0) params.set('tags', t.join(','))
      if (q) params.set('search', q)
      const res = await fetch(`/api/community/posts?${params}`)
      const data = await res.json()
      const newPosts = (data.posts ?? []) as CommunityPost[]
      if (append) {
        setPosts((prev) => [...prev, ...newPosts])
        offsetRef.current += newPosts.length
      } else {
        setPosts(newPosts)
        offsetRef.current = newPosts.length
      }
      setHasMore(data.hasMore ?? false)
    } finally {
      setLoading(false)
    }
  }, [])

  const changeSort = (s: FeedSort) => {
    setSort(s)
    fetchPage(s, activeTags, search, 0, false)
    router.replace(buildUrl(s, activeTags, search), { scroll: false })
  }

  const changeTags = (t: string[]) => {
    setActiveTags(t)
    fetchPage(sort, t, search, 0, false)
    router.replace(buildUrl(sort, t, search), { scroll: false })
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setActiveTags([])
    fetchPage(sort, [], '', 0, false)
    router.replace(buildUrl(sort, [], ''), { scroll: false })
  }

  // Debounced search
  useEffect(() => {
    if (!initialized.current) { initialized.current = true; return }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(searchInput)
      fetchPage(sort, activeTags, searchInput, 0, false)
      router.replace(buildUrl(sort, activeTags, searchInput), { scroll: false })
    }, 400)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll sentinel
  const onReachBottomRef = useRef<() => void>(() => {})
  onReachBottomRef.current = () => { if (!loading && hasMore) fetchPage(sort, activeTags, search, offsetRef.current, true) }
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) onReachBottomRef.current() }, { rootMargin: '400px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const filterCount = (searchInput ? 1 : 0) + activeTags.length

  const SidebarContent = () => (
    <div className="selection-side-section">
      <div className="sidebar-search-field">
        <label className="section-label">Search</label>
        <div className="sidebar-search-input-wrap">
          <IconSearch size={14} className="sidebar-search-icon" />
          <input
            className="form-input"
            type="search"
            placeholder="Search questions…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button className="search-clear" type="button" onClick={() => { setSearchInput(''); setSearch(''); fetchPage(sort, activeTags, '', 0, false); router.replace(buildUrl(sort, activeTags, ''), { scroll: false }) }} aria-label="Clear">
              <IconX size={13} />
            </button>
          )}
        </div>
      </div>
      <MultiSelectFilter
        label="Topics"
        allLabel="All topics"
        options={TAG_OPTIONS}
        selectedIds={activeTags}
        onChange={changeTags}
      />
    </div>
  )

  return (
    <>
      <header className="page-header">
        <div className="page-container">
          <div className="community-header-row">
            <div>
              <h1 className="page-title">Community</h1>
              <p className="page-subtitle">Questions and discussions from Australian home builders</p>
            </div>
            {currentUserId ? (
              <Link href="/community/new" className="btn btn-primary community-ask-btn">Ask the community</Link>
            ) : (
              <Link href="/get-started" className="btn btn-secondary community-ask-btn">Sign in to post</Link>
            )}
          </div>
          <div className="discover-modes community-modes">
            {SORT_MODES.map(({ value, icon: Icon, title, desc }) => (
              <button
                key={value}
                type="button"
                className={`discover-mode-card${sort === value ? ' discover-mode-card-active' : ''}`}
                onClick={() => changeSort(value)}
              >
                <div className="discover-mode-icon"><Icon size={22} /></div>
                <div className="discover-mode-text">
                  <div className="discover-mode-title">{title}</div>
                  <div className="discover-mode-desc">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="page-container content-section">
        <div className="community-workspace">
          <aside className="selection-sidebar">
            <SidebarContent />
          </aside>

          <div className="selection-main">
            <div className="mobile-filter-bar">
              <button type="button" className="mobile-filter-btn" onClick={() => setFilterModalOpen(true)}>
                <IconFilter size={14} />
                Filters
                {filterCount > 0 && <span className="mobile-filter-count">{filterCount}</span>}
              </button>
              {filterCount > 0 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear</button>
              )}
            </div>

            <p className="muted-row" style={{ marginBottom: 12 }}>
              {loading && posts.length === 0 ? 'Loading…' : `${posts.length} post${posts.length !== 1 ? 's' : ''}${hasMore ? '+' : ''}`}
            </p>

            {!loading && posts.length === 0 ? (
              <div className="empty-state">
                <h3 className="empty-state-title">No posts found</h3>
                <p className="empty-state-sub">
                  {search ? `No results for "${search}"` : activeTags.length ? 'No posts matching those topics.' : sort === 'unanswered' ? 'No unanswered questions right now.' : 'No posts yet. Be the first to ask!'}
                </p>
                {filterCount > 0 && <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear filters</button>}
                {currentUserId && <Link href="/community/new" className="btn btn-primary btn-sm">Ask the community</Link>}
              </div>
            ) : (
              <div className="community-feed">
                {posts.map((post) => <PostCard key={post.id} post={post} />)}
              </div>
            )}

            {loading && <div className="infinite-scroll-loader"><span className="loader-spin" /></div>}
            <div ref={sentinelRef} className="infinite-scroll-sentinel" />
          </div>

          {/* Right sidebar — always rendered so 3-col grid stays stable */}
          <aside className="community-right-sidebar">
            <div className="selection-side-section">
              <p className="community-contributors-label">Top Contributors</p>
              {topContributors.length > 0 ? (
                <div className="community-contributors-list">
                  {topContributors.map((c, i) => (
                    <Link key={c.userId} href={`/${c.username}`} className="community-contributor-card">
                      <span className="community-contributor-rank">{i + 1}</span>
                      <span className="avatar avatar-sm avatar-amber">
                        {(c.displayName ?? c.username).charAt(0).toUpperCase()}
                      </span>
                      <div className="community-contributor-info">
                        <span className="community-contributor-name">{c.displayName ?? c.username}</span>
                        <span className="community-contributor-handle">@{c.username}</span>
                      </div>
                      <span className="community-contributor-count" title={`${c.commentCount} comment${c.commentCount !== 1 ? 's' : ''}`}>
                        {c.commentCount}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="community-contributors-empty">Comment on posts to appear here.</p>
              )}
            </div>
          </aside>
        </div>
      </main>

      {filterModalOpen && (
        <div className="bb-modal bb-filter-modal" role="dialog" aria-modal="true" aria-label="Filter community">
          <div className="bb-modal-panel">
            <div className="bb-modal-header">
              <h2 className="bb-modal-title">Filters</h2>
              <button type="button" className="btn-icon" onClick={() => setFilterModalOpen(false)} aria-label="Close filters">
                <IconX size={16} />
              </button>
            </div>
            <div className="bb-modal-body">
              <SidebarContent />
            </div>
            <div className="bb-modal-footer">
              {filterCount > 0 && (
                <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear all filters</button>
              )}
              <button type="button" className="btn btn-primary" onClick={() => setFilterModalOpen(false)}>
                Show results{posts.length > 0 ? ` (${posts.length}${hasMore ? '+' : ''})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
