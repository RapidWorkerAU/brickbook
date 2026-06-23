'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { IconBell, IconBuilding, IconBuildingCommunity, IconCheck, IconHome, IconLogout, IconMapPin, IconMenu2, IconMessages, IconPhoto, IconPlus, IconSearch, IconSettings, IconUser, IconX } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NavProps {
  user?: { id?: string; username: string; display_name?: string; avatar_path?: string } | null
}

const NAV_LINKS = [
  { label: 'Discover', href: '/discover' },
  { label: 'Community', href: '/community' },
  { label: 'Builders', href: '/builders' },
  { label: 'Suburbs', href: '/suburbs' },
  { label: 'Estates', href: '/estates' },
]

export default function Nav({ user }: NavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const toolsMenuRef = useRef<HTMLDivElement | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [sessionUser, setSessionUser] = useState<NavProps['user']>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddStep, setQuickAddStep] = useState<'choice' | 'pick-build'>('choice')
  const [quickAddBuilds, setQuickAddBuilds] = useState<{ id: string; title: string }[]>([])
  const [quickAddLoading, setQuickAddLoading] = useState(false)
  const navUser = user !== undefined ? user : sessionUser
  const authUserId = navUser?.id ?? null
  const name = navUser?.display_name ?? navUser?.username

  useEffect(() => {
    if (user !== undefined) return

    let cancelled = false
    async function loadUser() {
      const supabase = createClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        if (!cancelled) {
          setSessionUser(null)
        }
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username,display_name,avatar_path')
        .eq('id', authUser.id)
        .maybeSingle()

      if (!cancelled) {
        setSessionUser(
          profile
            ? {
                id: authUser.id,
                username: profile.username,
                display_name: profile.display_name ?? undefined,
                avatar_path: profile.avatar_path ?? undefined,
              }
            : null,
        )
      }
    }

    loadUser()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!authUserId) return

    const supabase = createClient()
    let cancelled = false

    async function loadUnreadCount() {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', authUserId)
        .eq('is_read', false)

      if (!cancelled) setUnreadCount(count ?? 0)
    }

    void loadUnreadCount()

    const channel = supabase
      .channel(`notifications:${authUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${authUserId}` },
        () => void loadUnreadCount(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${authUserId}` },
        () => void loadUnreadCount(),
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [authUserId])

  useEffect(() => {
    if (!toolsOpen) return
    function handlePointerDown(event: PointerEvent) {
      if (toolsMenuRef.current?.contains(event.target as Node)) return
      setToolsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [toolsOpen])

  useEffect(() => {
    if (!accountOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (accountMenuRef.current?.contains(event.target as Node)) return
      setAccountOpen(false)
      setConfirmLogout(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setAccountOpen(false)
      setConfirmLogout(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [accountOpen])

  const linkClass = (href: string) =>
    pathname === href ? 'nav-link nav-link-active' : 'nav-link'

  const openQuickAdd = async () => {
    if (!navUser) return
    setQuickAddStep('choice')
    setQuickAddOpen(true)
    setQuickAddLoading(true)
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { setQuickAddLoading(false); return }
    const { data: builds } = await supabase
      .from('builds')
      .select('id, title')
      .eq('owner_id', authUser.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setQuickAddBuilds((builds ?? []) as { id: string; title: string }[])
    setQuickAddLoading(false)
  }

  const signOut = async () => {
    if (logoutLoading) return
    if (!confirmLogout) {
      setConfirmLogout(true)
      return
    }

    setLogoutLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    await fetch('/api/auth/sign-out', { method: 'POST' })
    setAccountOpen(false)
    setConfirmLogout(false)
    setMobileOpen(false)
    router.push('/get-started?tab=login')
    router.refresh()
  }

  return (
    <nav className="bb-nav">
      <div className="bb-nav-inner">
        <Link href="/" className="bb-nav-logo">
          Brickbook
        </Link>

        <div className="bb-nav-desktop-links">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
          {navUser ? (
            <Link href="/dashboard/following" className={linkClass('/dashboard/following')}>
              Following
            </Link>
          ) : null}

          {/* Tools dropdown */}
          <div className="bb-nav-tools-wrap" ref={toolsMenuRef}>
            <button
              type="button"
              className={`nav-link bb-nav-tools-btn${toolsOpen || pathname.startsWith('/tools') ? ' nav-link-active' : ''}`}
              aria-haspopup="menu"
              aria-expanded={toolsOpen}
              onClick={() => setToolsOpen((o) => !o)}
            >
              Tools
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 3, opacity: 0.6, transform: toolsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {toolsOpen && (
              <div className="bb-nav-tools-menu" role="menu">
                <Link
                  href="/tools/sun-planner"
                  className="bb-nav-tools-item"
                  role="menuitem"
                  onClick={() => setToolsOpen(false)}
                >
                  <span className="bb-nav-tools-item-icon">☀️</span>
                  <span className="bb-nav-tools-item-text">
                    <span className="bb-nav-tools-item-label">Sun Planner</span>
                    <span className="bb-nav-tools-item-sub">Solar path overlay for floor plans</span>
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="bb-nav-desktop-actions">
          {navUser ? (
            <>
              <Link href="/dashboard/notifications" aria-label="Notifications" className="btn-icon nav-notification-link">
                <IconBell size={16} />
                {authUserId && unreadCount > 0 ? <span className="nav-notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
              </Link>
              <div className="bb-nav-account" ref={accountMenuRef}>
                <button
                  type="button"
                  className="bb-nav-user"
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                  onClick={() => {
                    setAccountOpen((open) => !open)
                    setConfirmLogout(false)
                  }}
                >
                  <span className="avatar avatar-sm avatar-amber">{name?.charAt(0).toUpperCase()}</span>
                  <span>{name}</span>
                </button>

                {accountOpen ? (
                  <div className="bb-nav-account-menu" role="menu">
                    <Link href="/dashboard" className="bb-nav-account-item" role="menuitem" onClick={() => setAccountOpen(false)}>
                      <IconBell size={14} /> Dashboard
                    </Link>
                    <Link href="/dashboard/builds" className="bb-nav-account-item" role="menuitem" onClick={() => setAccountOpen(false)}>
                      <IconBuildingCommunity size={14} /> My Builds
                    </Link>
                    <Link href={`/${navUser.username}`} className="bb-nav-account-item" role="menuitem" onClick={() => setAccountOpen(false)}>
                      <IconUser size={14} /> My Profile
                    </Link>
                    <Link href="/dashboard/account" className="bb-nav-account-item" role="menuitem" onClick={() => setAccountOpen(false)}>
                      <IconSettings size={14} /> Settings
                    </Link>
                    <button
                      type="button"
                      className={`bb-nav-account-item bb-nav-account-logout ${confirmLogout ? 'bb-nav-account-logout-confirm' : ''}`}
                      role="menuitem"
                      disabled={logoutLoading}
                      onBlur={() => {
                        if (!logoutLoading) setConfirmLogout(false)
                      }}
                      onClick={signOut}
                    >
                      {confirmLogout ? <IconCheck size={14} /> : <IconLogout size={14} />}
                      {logoutLoading ? 'Logging out...' : confirmLogout ? 'Confirm logout' : 'Logout'}
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <Link href="/get-started" className="nav-link">
                Sign in
              </Link>
              <Link href="/get-started?tab=signup" className="btn btn-primary btn-sm">
                Start your build
              </Link>
            </>
          )}
        </div>

        <div className="bb-nav-mobile-right">
          {navUser && authUserId ? (
            <Link href="/dashboard/notifications" aria-label="Notifications" className="btn-icon bb-nav-mobile-bell">
              <IconBell size={18} />
              {unreadCount > 0 ? <span className="nav-notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
            </Link>
          ) : null}
          <button
            type="button"
            className="btn-icon bb-nav-mobile-toggle"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="bb-nav-mobile-menu">
          {navUser ? (
            <>
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={linkClass(link.href)} onClick={() => setMobileOpen(false)}>
                  {link.label}
                </Link>
              ))}
              <Link href="/dashboard/following" className={linkClass('/dashboard/following')} onClick={() => setMobileOpen(false)}>
                Following
              </Link>
              <Link href="/tools/sun-planner" className={linkClass('/tools/sun-planner')} onClick={() => setMobileOpen(false)}>
                ☀️ Sun Planner
              </Link>
              <div className="bb-nav-mobile-actions">
                <Link href="/dashboard/account" className="btn btn-secondary" onClick={() => setMobileOpen(false)}>
                  <IconSettings size={14} /> Settings
                </Link>
                <button
                  type="button"
                  className={`btn btn-danger ${confirmLogout ? 'btn-danger-confirm' : ''}`}
                  disabled={logoutLoading}
                  onBlur={() => { if (!logoutLoading) setConfirmLogout(false) }}
                  onClick={signOut}
                >
                  {confirmLogout ? <IconCheck size={14} /> : <IconLogout size={14} />}
                  {logoutLoading ? 'Logging out...' : confirmLogout ? 'Confirm logout' : 'Logout'}
                </button>
              </div>
            </>
          ) : (
            <>
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={linkClass(link.href)} onClick={() => setMobileOpen(false)}>
                  {link.label}
                </Link>
              ))}
              <Link href="/tools/sun-planner" className={linkClass('/tools/sun-planner')} onClick={() => setMobileOpen(false)}>
                ☀️ Sun Planner
              </Link>
              <div className="bb-nav-mobile-actions">
                <Link href="/get-started" className="btn btn-secondary" onClick={() => setMobileOpen(false)}>
                  Sign in
                </Link>
                <Link href="/get-started?tab=signup" className="btn btn-primary" onClick={() => setMobileOpen(false)}>
                  Start your build
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* Quick-add modal — triggered by + tab */}
      {quickAddOpen && (
        <div className="bb-modal" role="dialog" aria-modal="true" aria-label="Add">
          <button className="bb-modal-backdrop" onClick={() => setQuickAddOpen(false)} aria-label="Close" />
          <div className="bb-modal-panel bb-quick-add-panel">
            <div className="bb-modal-header">
              <span className="bb-quick-add-title">
                {quickAddStep === 'pick-build' ? 'Choose a build' : 'Add something'}
              </span>
              <button type="button" className="btn-icon" onClick={() => setQuickAddOpen(false)} aria-label="Close">
                <IconX size={16} />
              </button>
            </div>
            <div className="bb-modal-body bb-quick-add-body">
              {quickAddLoading ? (
                <div className="bb-quick-add-loading"><span className="loader-spin" /></div>
              ) : quickAddStep === 'choice' ? (
                <div className="bb-quick-add-options">
                  <button type="button" className="bb-quick-add-option" onClick={() => { router.push('/dashboard/builds/new'); setQuickAddOpen(false); }}>
                    <span className="bb-quick-add-icon"><IconBuildingCommunity size={22} /></span>
                    <span className="bb-quick-add-text">
                      <span className="bb-quick-add-option-title">New build</span>
                      <span className="bb-quick-add-option-sub">Start documenting a new home build</span>
                    </span>
                  </button>
                  {quickAddBuilds.length > 0 && (
                    <button type="button" className="bb-quick-add-option" onClick={() => {
                      if (quickAddBuilds.length === 1) {
                        router.push(`/dashboard/builds/${quickAddBuilds[0].id}/updates/new`)
                        setQuickAddOpen(false)
                      } else {
                        setQuickAddStep('pick-build')
                      }
                    }}>
                      <span className="bb-quick-add-icon"><IconPhoto size={22} /></span>
                      <span className="bb-quick-add-text">
                        <span className="bb-quick-add-option-title">Post a build update</span>
                        <span className="bb-quick-add-option-sub">Share photos and progress on an existing build</span>
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="bb-quick-add-options">
                  {quickAddBuilds.map(build => (
                    <button key={build.id} type="button" className="bb-quick-add-option" onClick={() => {
                      router.push(`/dashboard/builds/${build.id}/updates/new`)
                      setQuickAddOpen(false)
                    }}>
                      <span className="bb-quick-add-icon"><IconBuildingCommunity size={20} /></span>
                      <span className="bb-quick-add-text">
                        <span className="bb-quick-add-option-title">{build.title}</span>
                        <span className="bb-quick-add-option-sub">Post a new update to this build</span>
                      </span>
                    </button>
                  ))}
                  <button type="button" className="bb-quick-add-back" onClick={() => setQuickAddStep('choice')}>
                    ← Back to options
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar — visible only on mobile via CSS */}
      <div className="bb-tab-bar">
        {navUser ? (
          <>
            <Link
              href="/dashboard"
              className={`bb-tab-bar-item${pathname === '/dashboard' ? ' bb-tab-bar-item-active' : ''}`}
            >
              <span className="bb-tab-bar-icon-wrap">
                {unreadCount > 0 && authUserId ? <span className="bb-tab-bar-badge">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
                <IconHome size={22} />
              </span>
              <span className="bb-tab-bar-label">Home</span>
            </Link>
            <Link
              href="/community"
              className={`bb-tab-bar-item${pathname.startsWith('/community') ? ' bb-tab-bar-item-active' : ''}`}
            >
              <IconMessages size={22} />
              <span className="bb-tab-bar-label">Community</span>
            </Link>
            <button type="button" className="bb-tab-bar-item bb-tab-bar-add" onClick={openQuickAdd}>
              <span className="bb-tab-bar-add-circle"><IconPlus size={20} /></span>
              <span className="bb-tab-bar-label">Add</span>
            </button>
            <Link
              href="/dashboard/builds"
              className={`bb-tab-bar-item${pathname.startsWith('/dashboard/builds') && !pathname.endsWith('/new') ? ' bb-tab-bar-item-active' : ''}`}
            >
              <IconBuildingCommunity size={22} />
              <span className="bb-tab-bar-label">Builds</span>
            </Link>
            <Link
              href={`/${navUser.username}`}
              className={`bb-tab-bar-item${pathname === `/${navUser.username}` ? ' bb-tab-bar-item-active' : ''}`}
            >
              <span className="bb-tab-bar-avatar-circle">{name?.charAt(0).toUpperCase()}</span>
              <span className="bb-tab-bar-label">Profile</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/discover" className={`bb-tab-bar-item${pathname.startsWith('/discover') ? ' bb-tab-bar-item-active' : ''}`}>
              <IconSearch size={22} />
              <span className="bb-tab-bar-label">Discover</span>
            </Link>
            <Link href="/builders" className={`bb-tab-bar-item${pathname === '/builders' ? ' bb-tab-bar-item-active' : ''}`}>
              <IconBuildingCommunity size={22} />
              <span className="bb-tab-bar-label">Builders</span>
            </Link>
            <Link href="/suburbs" className={`bb-tab-bar-item${pathname === '/suburbs' ? ' bb-tab-bar-item-active' : ''}`}>
              <IconMapPin size={22} />
              <span className="bb-tab-bar-label">Suburbs</span>
            </Link>
            <Link href="/estates" className={`bb-tab-bar-item${pathname === '/estates' ? ' bb-tab-bar-item-active' : ''}`}>
              <IconBuilding size={22} />
              <span className="bb-tab-bar-label">Estates</span>
            </Link>
            <Link href="/get-started" className={`bb-tab-bar-item${pathname.startsWith('/get-started') ? ' bb-tab-bar-item-active' : ''}`}>
              <IconUser size={22} />
              <span className="bb-tab-bar-label">Sign in</span>
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
