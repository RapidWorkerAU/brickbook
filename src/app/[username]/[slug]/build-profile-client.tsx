'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Nav from '@/components/Nav'
import { ConfirmDeleteButton, LoadingButton } from '@/components/action-buttons'
import { PaginationControls, pageItems } from '@/components/PaginationControls'
import {
  IconArrowLeft,
  IconBath,
  IconBed,
  IconBookmark,
  IconArrowsJoin,
  IconCamera,
  IconCarGarage,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCircleDashed,
  IconClock,
  IconExternalLink,
  IconFileText,
  IconHeart,
  IconLink,
  IconMessageCircle,
  IconEdit,
  IconPhoto,
  IconRuler,
  IconSend,
  IconShare,
  IconSortAscending,
  IconSortDescending,
  IconToiletPaper,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import type { PublicBuildDetail, PublicFloorPlan, PublicComment, PublicSelection, InspirationTag } from '@/lib/public-data'
import type { CommunityPost } from '@/lib/community-data'
import type { ViewerPlanningBuild } from '@/app/[username]/[slug]/page'

type Tab = 'Overview' | 'Updates' | 'Discussion' | 'Q&A' | 'Timeline' | 'Images' | 'Inspiration' | 'Selections' | 'Standard' | 'Wishlist' | 'Saved Builds' | 'Our Planning'
const BASE_BUILD_TABS: Tab[] = ['Overview', 'Updates', 'Discussion', 'Q&A', 'Timeline', 'Images', 'Inspiration', 'Selections', 'Standard']
const PLANNING_TABS: Tab[] = ['Overview', 'Inspiration', 'Wishlist', 'Saved Builds', 'Selections', 'Discussion', 'Q&A']

const STAGE_LABELS: Record<string, string> = {
  planning: 'Planning',
  pre_construction: 'Pre-construction',
  construction: 'Under construction',
  landscaping: 'Landscaping',
  complete: 'Complete',
}
type CommentItem = PublicComment & { time?: string }
type TimelinePhoto = PublicBuildDetail['images'][number]
type TimelineGapInfo = {
  days: number
  isOverlap: boolean
  label: string
  title: string
}
type Update = {
  id: string
  milestone: string
  caption: string
  imageCount: number
  likes: number
  commentCount: number
  timeAgo: string
  imageUrl: string | null
  imageUrls: string[]
  imageIds: string[]
  imageId: string | null
  comments: CommentItem[]
}

function SquareImageCarousel({ images, fallbackAlt, initialIndex = 0 }: { images: string[]; fallbackAlt: string; initialIndex?: number }) {
  const [index, setIndex] = useState(Math.max(0, Math.min(initialIndex, images.length - 1)))
  const current = images[index] ?? null
  const touchStartX = useRef<number | null>(null)

  const move = (direction: -1 | 1) => {
    setIndex((currentIndex) => {
      if (images.length === 0) return 0
      return (currentIndex + direction + images.length) % images.length
    })
  }

  return (
    <div
      className="square-carousel"
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null || images.length <= 1) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1)
        touchStartX.current = null
      }}
    >
      {current ? (
        // Signed Supabase URLs are rendered directly until remote image patterns are finalized.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current} alt={fallbackAlt} />
      ) : (
        <Image src="/images/comingsoon.jpg" alt="" fill sizes="(min-width: 1024px) 65vw, 100vw" />
      )}
      {images.length > 1 ? (
        <>
          <button className="carousel-control carousel-control-prev" type="button" aria-label="Previous image" onClick={() => move(-1)}>
            {"<"}
          </button>
          <button className="carousel-control carousel-control-next" type="button" aria-label="Next image" onClick={() => move(1)}>
            {">"}
          </button>
          <span className="image-count">{index + 1} / {images.length}</span>
          <div className="carousel-dots">
            {images.map((image, dotIndex) => (
              <button
                key={`${image}-${dotIndex}`}
                type="button"
                className={`carousel-dot ${dotIndex === index ? 'carousel-dot-active' : ''}`}
                aria-label={`Show image ${dotIndex + 1}`}
                onClick={() => setIndex(dotIndex)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function EditableComment({
  comment,
  canEdit,
  endpoint,
  onChange,
  onDelete,
  onReply,
}: {
  comment: CommentItem
  canEdit: boolean
  endpoint: '/api/build-comments' | '/api/update-comments' | '/api/image-comments'
  onChange: (commentId: string, content: string) => void
  onDelete: (commentId: string) => void
  onReply?: (parentCommentId: string, content: string) => Promise<string | null>
}) {
  const [editing, setEditing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [replying, setReplying] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const [postingReply, setPostingReply] = useState(false)
  const [draft, setDraft] = useState(comment.content)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const menuRef = useRef<HTMLDivElement | null>(null)
  const replyRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      setMenuOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!replyRef.current) return
    replyRef.current.style.height = 'auto'
    replyRef.current.style.height = `${replyRef.current.scrollHeight}px`
  }, [replyDraft, replying])

  const save = async () => {
    const content = draft.trim()
    if (!content || busy) return
    setBusy(true)
    setError('')

    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_id: comment.id, content }),
    })
    const payload = await response.json().catch(() => null)
    setBusy(false)

    if (!response.ok) {
      setError(payload?.error ?? 'Unable to update comment.')
      return
    }

    onChange(comment.id, content)
    setEditing(false)
  }

  const remove = async () => {
    setError('')

    const response = await fetch(`${endpoint}?commentId=${encodeURIComponent(comment.id)}`, {
      method: 'DELETE',
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setError(payload?.error ?? 'Unable to delete comment.')
      return
    }

    onDelete(comment.id)
  }

  const submitReply = async () => {
    const content = replyDraft.trim()
    if (!content || postingReply || !onReply) return

    setPostingReply(true)
    setError('')
    const replyError = await onReply(comment.id, content)
    setPostingReply(false)

    if (replyError) {
      setError(replyError)
      return
    }

    setReplyDraft('')
    setReplying(false)
  }

  return (
    <div className={`comment-item ${comment.parentCommentId ? 'comment-item-reply' : ''}`}>
      <div className="comment-avatar" aria-hidden="true">{comment.username.charAt(0).toUpperCase()}</div>
      <div className="comment-main">
        <div className="comment-meta">
          <span className="comment-author">@{comment.username}</span>
          <span className="comment-dot">-</span>
          <span className="comment-time">{comment.time ?? formatRelativeTime(comment.createdAt)}</span>
        </div>
        {editing ? (
          <div className="comment-edit-row">
            <input className="form-input" value={draft} onChange={(event) => setDraft(event.target.value)} />
            <LoadingButton className="btn btn-primary btn-sm" loading={busy} disabled={!draft.trim()} onClick={save}>
              Save
            </LoadingButton>
            <button
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => {
                setDraft(comment.content)
                setEditing(false)
                setError('')
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="comment-text">{comment.content}</div>
        )}
        {error ? <div className="form-error">{error}</div> : null}
        <div className="comment-interactions">
          <button type="button" className="comment-action-link">
            <IconHeart size={12} /> 0
          </button>
          <button type="button" className="comment-action-link" onClick={() => setReplying((value) => !value)}>
            <IconMessageCircle size={12} /> Reply
          </button>
        </div>
        {replying ? (
          <div className="comment-reply-composer">
            <textarea
              ref={replyRef}
              className="comment-reply-input"
              placeholder={`Reply to @${comment.username}...`}
              rows={1}
              value={replyDraft}
              onChange={(event) => setReplyDraft(event.target.value)}
            />
            <LoadingButton className="comment-reply-send" aria-label="Send reply" loading={postingReply} disabled={!replyDraft.trim()} onClick={submitReply}>
              <IconSend size={13} />
            </LoadingButton>
          </div>
        ) : null}
      </div>

      {canEdit ? (
        <div className="comment-row-actions" ref={menuRef}>
          <button className="comment-menu-trigger" aria-label="Comment actions" aria-expanded={menuOpen} disabled={busy} onClick={() => setMenuOpen((value) => !value)}>
            <span aria-hidden="true">...</span>
          </button>
          {menuOpen ? (
            <div className="comment-action-menu">
              <button
                type="button"
                onClick={() => {
                  setEditing(true)
                  setMenuOpen(false)
                }}
              >
                <IconEdit size={13} /> Edit
              </button>
              <ConfirmDeleteButton iconOnly={false} label="Delete" confirmLabel="Confirm delete" className="comment-action-menu-delete" disabled={busy} onConfirm={remove} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function UpdateGridItem({ update, onOpen }: { update: Update; onOpen: () => void }) {
  const image = update.imageUrls[0] ?? update.imageUrl

  return (
    <button className="update-grid-item" type="button" onClick={onOpen}>
      {image ? (
        // Signed Supabase URLs are rendered directly until remote image patterns are finalized.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={`${update.milestone} update`} />
      ) : (
        <Image src="/images/comingsoon.jpg" alt="" fill sizes="(min-width: 1024px) 24vw, 50vw" />
      )}
      <div className="update-grid-overlay">
        <span><IconHeart size={15} /> {update.likes}</span>
        <span><IconMessageCircle size={15} /> {update.commentCount}</span>
      </div>
      {update.imageCount > 1 ? <span className="update-grid-count">{update.imageCount}</span> : null}
    </button>
  )
}

function UpdateOverlay({
  update,
  currentUserId,
  onClose,
  initialImageIndex = 0,
  isOwner = false,
  buildId,
}: {
  update: Update
  currentUserId: string | null
  onClose: () => void
  initialImageIndex?: number
  isOwner?: boolean
  buildId?: string
}) {
  const router = useRouter()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(update.likes)
  const [liking, setLiking] = useState(false)
  const [saved, setSaved] = useState(false)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState(update.comments)
  const [commentCount, setCommentCount] = useState(update.commentCount)
  const [commentsOffset, setCommentsOffset] = useState(0)
  const [hasMoreComments, setHasMoreComments] = useState(true)
  const [postMenuOpen, setPostMenuOpen] = useState(false)
  const [deleteState, setDeleteState] = useState<'idle' | 'confirm' | 'deleting'>('idle')
  const [deleteError, setDeleteError] = useState('')
  const [commentsOpen, setCommentsOpen] = useState(false)
  const postMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!postMenuOpen) return
    function handleClick(e: MouseEvent) {
      if (postMenuRef.current && !postMenuRef.current.contains(e.target as Node)) {
        setPostMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [postMenuOpen])

  const deleteUpdate = async () => {
    setDeleteState('deleting')
    setDeleteError('')
    try {
      const res = await fetch(`/api/build-updates/${update.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setDeleteError(data?.error ?? 'Delete failed.')
        setDeleteState('confirm')
        return
      }
      onClose()
      router.refresh()
    } catch {
      setDeleteError('Something went wrong.')
      setDeleteState('confirm')
    }
  }
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadComments() {
      setLoadingComments(true)
      const response = await fetch(`/api/update-comments?updateId=${encodeURIComponent(update.id)}&offset=0&limit=20`)
      const payload = await response.json().catch(() => null)
      if (cancelled) return
      setLoadingComments(false)
      if (!response.ok) {
        setCommentError(payload?.error ?? 'Unable to load comments.')
        return
      }
      setComments(
        (payload?.comments ?? []).map((item: PublicComment) => ({
          id: item.id,
          userId: item.userId,
          username: item.username,
          content: item.content,
          createdAt: item.createdAt,
          parentCommentId: item.parentCommentId,
          imageUrl: item.imageUrl,
        })),
      )
      setCommentsOffset((payload?.comments ?? []).length)
      setHasMoreComments(Boolean(payload?.hasMore))
    }

    loadComments()
    return () => {
      cancelled = true
    }
  }, [update.id])

  const loadMoreComments = async () => {
    if (loadingComments || !hasMoreComments) return
    setLoadingComments(true)
    const response = await fetch(`/api/update-comments?updateId=${encodeURIComponent(update.id)}&offset=${commentsOffset}&limit=20`)
    const payload = await response.json().catch(() => null)
    setLoadingComments(false)
    if (!response.ok) {
      setCommentError(payload?.error ?? 'Unable to load more comments.')
      return
    }
    const nextComments = (payload?.comments ?? []).map((item: PublicComment) => ({
      id: item.id,
      userId: item.userId,
      username: item.username,
      content: item.content,
      createdAt: item.createdAt,
      parentCommentId: item.parentCommentId,
      imageUrl: item.imageUrl,
    }))
    setComments((current) => [...current, ...nextComments])
    setCommentsOffset((current) => current + nextComments.length)
    setHasMoreComments(Boolean(payload?.hasMore))
  }

  const postImageComment = async () => {
    if (!comment.trim() || postingComment) return
    setPostingComment(true)
    setCommentError('')

    const formData = new FormData()
    formData.set('update_id', update.id)
    formData.set('content', comment.trim())

    const response = await fetch('/api/update-comments', {
      method: 'POST',
      body: formData,
    })
    const payload = await response.json().catch(() => null)
    setPostingComment(false)

    if (!response.ok) {
      setCommentError(response.status === 401 ? 'Sign in to comment.' : payload?.error ?? 'Unable to post comment.')
      return
    }

    setComments((current) => [
      ...current,
      {
        id: payload.comment.id,
        userId: payload.comment.userId,
        username: payload.comment.username,
        content: payload.comment.content,
        createdAt: payload.comment.createdAt,
        parentCommentId: null,
        imageUrl: null,
        time: 'Just now',
      },
    ])
    setCommentCount(payload.commentCount ?? commentCount + 1)
    setComment('')
  }

  const postReplyComment = async (parentCommentId: string, content: string) => {
    const formData = new FormData()
    formData.set('update_id', update.id)
    formData.set('content', content)
    formData.set('parent_comment_id', parentCommentId)

    const response = await fetch('/api/update-comments', {
      method: 'POST',
      body: formData,
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return response.status === 401 ? 'Sign in to reply.' : payload?.error ?? 'Unable to post reply.'
    }

    setComments((current) => [
      ...current,
      {
        id: payload.comment.id,
        userId: payload.comment.userId,
        username: payload.comment.username,
        content: payload.comment.content,
        createdAt: payload.comment.createdAt,
        parentCommentId: payload.comment.parentCommentId,
        imageUrl: null,
        time: 'Just now',
      },
    ])
    setCommentCount(payload.commentCount ?? commentCount + 1)
    return null
  }

  const toggleLike = async () => {
    if (liking) return
    setLiking(true)
    const formData = new FormData()
    formData.set('update_id', update.id)
    const response = await fetch('/api/update-likes/toggle', {
      method: 'POST',
      body: formData,
    })
    const payload = await response.json().catch(() => null)
    setLiking(false)
    if (!response.ok) {
      setCommentError(response.status === 401 ? 'Sign in to like updates.' : payload?.error ?? 'Unable to update like.')
      return
    }
    setLiked(Boolean(payload.liked))
    if (typeof payload.likeCount === 'number') setLikeCount(payload.likeCount)
  }

  return (
    <div className="update-modal" role="dialog" aria-modal="true">
      <button className="update-modal-backdrop" type="button" aria-label="Close update" onClick={onClose} />
      <div className="update-modal-panel">
        <button className="btn-icon update-modal-close" type="button" aria-label="Close update" onClick={onClose}>
          <IconX size={18} />
        </button>
        <div className="update-modal-media">
          <SquareImageCarousel key={`${update.id}-${initialImageIndex}`} images={update.imageUrls.length ? update.imageUrls : update.imageUrl ? [update.imageUrl] : []} fallbackAlt={`${update.milestone} update`} initialIndex={initialImageIndex} />
          <button className="modal-view-comments-btn" type="button" onClick={() => setCommentsOpen(true)}>
            <IconMessageCircle size={14} />
            {commentCount > 0 ? `${commentCount} comment${commentCount === 1 ? '' : 's'}` : 'Add a comment'}
          </button>
        </div>
        <aside className="update-modal-detail">
          <div className="update-modal-header">
            <span className="badge badge-phase">{update.milestone}</span>
            <span className="muted-row">{update.timeAgo}</span>
            {isOwner && buildId ? (
              <div className="comment-row-actions" ref={postMenuRef} style={{ marginLeft: 'auto' }}>
                <button
                  className="comment-menu-trigger"
                  aria-label="Post actions"
                  aria-expanded={postMenuOpen}
                  onClick={() => { setPostMenuOpen((v) => !v); setDeleteState('idle'); setDeleteError(''); }}
                >
                  <span aria-hidden="true">...</span>
                </button>
                {postMenuOpen ? (
                  <div className="comment-action-menu">
                    <Link
                      href={`/dashboard/builds/${buildId}/updates/${update.id}/edit`}
                      onClick={() => setPostMenuOpen(false)}
                    >
                      <IconEdit size={13} /> Edit
                    </Link>
                    <button
                      type="button"
                      className="comment-action-menu-delete"
                      onClick={() => { setDeleteState('confirm'); setPostMenuOpen(false); }}
                    >
                      <IconTrash size={13} /> Delete
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          {deleteState !== 'idle' ? (
            <div style={{ padding: '10px 0', borderBottom: '1px solid var(--bb-border)' }}>
              {deleteState === 'confirm' ? (
                <div style={{ background: 'var(--bb-red-light)', borderRadius: 'var(--bb-radius-md)', padding: '12px 14px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--bb-text)', fontWeight: 600 }}>Delete this update permanently?</p>
                  {deleteError ? <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--bb-red)' }}>{deleteError}</p> : null}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setDeleteState('idle')}>Cancel</button>
                    <button className="btn btn-sm" style={{ background: 'var(--bb-red)', color: '#fff', border: 'none' }} onClick={deleteUpdate}>Yes, delete</button>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--bb-muted)', margin: 0 }}>Deleting...</p>
              )}
            </div>
          ) : null}
          <div className="update-modal-caption">
            <p>{update.caption}</p>
          </div>
          <div className="update-card-actions update-modal-actions">
            <LoadingButton className={`update-action ${liked ? 'update-action-active' : ''}`} loading={liking} onClick={toggleLike}>
              <IconHeart size={15} fill={liked ? 'var(--bb-amber)' : 'none'} />
              {likeCount}
            </LoadingButton>
            <span className="update-action">
              <IconMessageCircle size={15} />
              {commentCount}
            </span>
            <button
              className={`update-action update-action-saved ${saved ? 'update-action-active' : ''}`}
              onClick={() => setSaved((value) => !value)}
            >
              <IconBookmark size={15} fill={saved ? 'var(--bb-amber)' : 'none'} />
            </button>
          </div>
          <div
            className="update-modal-comments"
            onScroll={(event) => {
              const target = event.currentTarget
              if (target.scrollTop + target.clientHeight >= target.scrollHeight - 80) void loadMoreComments()
            }}
          >
            {commentError ? <div className="alert alert-error">{commentError}</div> : null}
            {comments.map((item) => (
              <EditableComment
                key={item.id}
                comment={item}
                canEdit={Boolean(currentUserId && item.userId === currentUserId)}
                endpoint="/api/update-comments"
                onChange={(commentId, content) =>
                  setComments((current) => current.map((commentItem) => (commentItem.id === commentId ? { ...commentItem, content } : commentItem)))
                }
                onDelete={(commentId) => {
                  setComments((current) => {
                    const next = current.filter((commentItem) => commentItem.id !== commentId && commentItem.parentCommentId !== commentId)
                    setCommentCount((count) => Math.max(0, count - (current.length - next.length)))
                    return next
                  })
                }}
                onReply={postReplyComment}
              />
            ))}
            {loadingComments ? <div className="comment-loading">Loading comments...</div> : null}
          </div>
          <div className="comment-input-row update-modal-comment-input">
            <input
              className="form-input"
              type="text"
              placeholder="Add a comment..."
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <LoadingButton className="btn-icon" aria-label="Post comment" loading={postingComment} disabled={!comment.trim()} onClick={postImageComment}>
              <IconSend size={14} />
            </LoadingButton>
          </div>
        </aside>
      </div>
      {commentsOpen ? (
        <div className="modal-comments-sheet" role="dialog" aria-label="Comments">
          <div className="modal-comments-sheet-header">
            <button className="modal-comments-sheet-back" type="button" onClick={() => setCommentsOpen(false)}>
              <IconArrowLeft size={16} /> Back
            </button>
            <span className="modal-comments-sheet-title">Comments{commentCount > 0 ? ` (${commentCount})` : ''}</span>
          </div>
          <div
            className="modal-comments-sheet-body"
            onScroll={(event) => {
              const target = event.currentTarget
              if (target.scrollTop + target.clientHeight >= target.scrollHeight - 80) void loadMoreComments()
            }}
          >
            {commentError ? <div className="alert alert-error" style={{ margin: '8px 16px' }}>{commentError}</div> : null}
            {comments.map((item) => (
              <EditableComment
                key={item.id}
                comment={item}
                canEdit={Boolean(currentUserId && item.userId === currentUserId)}
                endpoint="/api/update-comments"
                onChange={(commentId, content) =>
                  setComments((current) => current.map((commentItem) => (commentItem.id === commentId ? { ...commentItem, content } : commentItem)))
                }
                onDelete={(commentId) => {
                  setComments((current) => {
                    const next = current.filter((commentItem) => commentItem.id !== commentId && commentItem.parentCommentId !== commentId)
                    setCommentCount((count) => Math.max(0, count - (current.length - next.length)))
                    return next
                  })
                }}
                onReply={postReplyComment}
              />
            ))}
            {loadingComments ? <div className="comment-loading" style={{ padding: '12px 16px' }}>Loading comments...</div> : null}
          </div>
          <div className="modal-comments-sheet-input">
            <div className="comment-input-row">
              <input
                className="form-input"
                type="text"
                placeholder="Add a comment..."
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
              <LoadingButton className="btn-icon" aria-label="Post comment" loading={postingComment} disabled={!comment.trim()} onClick={postImageComment}>
                <IconSend size={14} />
              </LoadingButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TimelinePhotoOverlay({
  images,
  initialIndex,
  currentUserId,
  onClose,
}: {
  images: TimelinePhoto[]
  initialIndex: number
  currentUserId: string | null
  onClose: () => void
}) {
  const [index, setIndex] = useState(initialIndex)
  const image = images[index] ?? images[0]
  const touchStartX = useRef<number | null>(null)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentCount, setCommentCount] = useState(0)
  const [commentsOffset, setCommentsOffset] = useState(0)
  const [hasMoreComments, setHasMoreComments] = useState(true)
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length)
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, images.length])

  useEffect(() => {
    let cancelled = false
    setComments([])
    setCommentCount(0)
    setCommentsOffset(0)
    setHasMoreComments(true)
    setCommentError('')
    async function loadComments() {
      setLoadingComments(true)
      const response = await fetch(`/api/image-comments?imageId=${encodeURIComponent(image.id)}&offset=0&limit=20`)
      const payload = await response.json().catch(() => null)
      if (cancelled) return
      setLoadingComments(false)
      if (!response.ok) {
        setCommentError(payload?.error ?? 'Unable to load comments.')
        return
      }
      const nextComments = normalizeOverlayComments(payload?.comments ?? [])
      setComments(nextComments)
      setCommentCount(nextComments.length)
      setCommentsOffset(nextComments.length)
      setHasMoreComments(nextComments.length === 20)
    }

    loadComments()
    return () => {
      cancelled = true
    }
  }, [image.id])

  const loadMoreComments = async () => {
    if (loadingComments || !hasMoreComments) return
    setLoadingComments(true)
    const response = await fetch(`/api/image-comments?imageId=${encodeURIComponent(image.id)}&offset=${commentsOffset}&limit=20`)
    const payload = await response.json().catch(() => null)
    setLoadingComments(false)
    if (!response.ok) {
      setCommentError(payload?.error ?? 'Unable to load more comments.')
      return
    }
    const nextComments = normalizeOverlayComments(payload?.comments ?? [])
    setComments((current) => [...current, ...nextComments])
    setCommentCount((current) => current + nextComments.length)
    setCommentsOffset((current) => current + nextComments.length)
    setHasMoreComments(nextComments.length === 20)
  }

  const postImageComment = async () => {
    if (!comment.trim() || postingComment) return
    setPostingComment(true)
    setCommentError('')

    const formData = new FormData()
    formData.set('image_id', image.id)
    formData.set('content', comment.trim())

    const response = await fetch('/api/image-comments', {
      method: 'POST',
      body: formData,
    })
    const payload = await response.json().catch(() => null)
    setPostingComment(false)

    if (!response.ok) {
      setCommentError(response.status === 401 ? 'Sign in to comment.' : payload?.error ?? 'Unable to post comment.')
      return
    }

    setComments((current) => [
      ...current,
      {
        id: payload.comment.id,
        userId: payload.comment.userId,
        username: payload.comment.username,
        content: payload.comment.content,
        createdAt: payload.comment.createdAt,
        parentCommentId: null,
        imageUrl: null,
        time: 'Just now',
      },
    ])
    setCommentCount(payload.commentCount ?? commentCount + 1)
    setComment('')
  }

  const postImageReplyComment = async (parentCommentId: string, content: string) => {
    const formData = new FormData()
    formData.set('image_id', image.id)
    formData.set('content', content)
    formData.set('parent_comment_id', parentCommentId)

    const response = await fetch('/api/image-comments', {
      method: 'POST',
      body: formData,
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return response.status === 401 ? 'Sign in to reply.' : payload?.error ?? 'Unable to post reply.'
    }

    setComments((current) => [
      ...current,
      {
        id: payload.comment.id,
        userId: payload.comment.userId,
        username: payload.comment.username,
        content: payload.comment.content,
        createdAt: payload.comment.createdAt,
        parentCommentId: payload.comment.parentCommentId,
        imageUrl: null,
        time: 'Just now',
      },
    ])
    setCommentCount(payload.commentCount ?? commentCount + 1)
    return null
  }

  return (
    <div className="update-modal" role="dialog" aria-modal="true">
      <button className="update-modal-backdrop" type="button" aria-label="Close photo" onClick={onClose} />
      <div className="update-modal-panel">
        <button className="btn-icon update-modal-close" type="button" aria-label="Close photo" onClick={onClose}>
          <IconX size={18} />
        </button>
        <div
          className="update-modal-media"
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null || images.length <= 1) return
            const dx = e.changedTouches[0].clientX - touchStartX.current
            if (Math.abs(dx) > 40) setIndex((i) => dx < 0 ? (i + 1) % images.length : (i - 1 + images.length) % images.length)
            touchStartX.current = null
          }}
        >
          {image.imageUrl ? (
            // Signed Supabase URLs are rendered directly until remote image patterns are finalized.
            // eslint-disable-next-line @next/next/no-img-element
            <img className="timeline-modal-image" src={image.imageUrl} alt={`${image.milestone} build stage`} />
          ) : (
            <Image src="/images/comingsoon.jpg" alt="" fill sizes="70vw" />
          )}
          {images.length > 1 && (
            <span className="photo-lightbox-count">{index + 1} / {images.length}</span>
          )}
          {images.length > 1 ? (
            <>
              <button className="carousel-control carousel-control-prev" type="button" aria-label="Previous photo" onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}>{'<'}</button>
              <button className="carousel-control carousel-control-next" type="button" aria-label="Next photo" onClick={() => setIndex((i) => (i + 1) % images.length)}>{'>'}</button>
            </>
          ) : null}
          <button className="modal-view-comments-btn" type="button" onClick={() => setCommentsOpen(true)}>
            <IconMessageCircle size={14} />
            {commentCount > 0 ? `${commentCount} comment${commentCount === 1 ? '' : 's'}` : 'Add a comment'}
          </button>
        </div>
        <aside className="update-modal-detail">
          <div className="update-modal-header">
            <span className="badge badge-phase">{image.milestone}</span>
            <span className="muted-row">Timeline photo</span>
          </div>
          <div className="update-modal-caption">
            <p>Photo captured during {image.milestone}.</p>
          </div>
          <div className="update-card-actions update-modal-actions">
            <span className="update-action">
              <IconMessageCircle size={15} />
              {commentCount}
            </span>
          </div>
          <div
            className="update-modal-comments"
            onScroll={(event) => {
              const target = event.currentTarget
              if (target.scrollTop + target.clientHeight >= target.scrollHeight - 80) void loadMoreComments()
            }}
          >
            {commentError ? <div className="alert alert-error">{commentError}</div> : null}
            {comments.map((item) => (
              <EditableComment
                key={item.id}
                comment={item}
                canEdit={Boolean(currentUserId && item.userId === currentUserId)}
                endpoint="/api/image-comments"
                onChange={(commentId, content) =>
                  setComments((current) => current.map((commentItem) => (commentItem.id === commentId ? { ...commentItem, content } : commentItem)))
                }
                onDelete={(commentId) => {
                  setComments((current) => {
                    const next = current.filter((commentItem) => commentItem.id !== commentId && commentItem.parentCommentId !== commentId)
                    setCommentCount((count) => Math.max(0, count - (current.length - next.length)))
                    return next
                  })
                }}
                onReply={postImageReplyComment}
              />
            ))}
            {loadingComments ? <div className="comment-loading">Loading comments...</div> : null}
          </div>
          <div className="comment-input-row update-modal-comment-input">
            <input
              className="form-input"
              type="text"
              placeholder="Add a comment..."
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <LoadingButton className="btn-icon" aria-label="Post comment" loading={postingComment} disabled={!comment.trim()} onClick={postImageComment}>
              <IconSend size={14} />
            </LoadingButton>
          </div>
        </aside>
      </div>
      {commentsOpen ? (
        <div className="modal-comments-sheet" role="dialog" aria-label="Comments">
          <div className="modal-comments-sheet-header">
            <button className="modal-comments-sheet-back" type="button" onClick={() => setCommentsOpen(false)}>
              <IconArrowLeft size={16} /> Back
            </button>
            <span className="modal-comments-sheet-title">Comments{commentCount > 0 ? ` (${commentCount})` : ''}</span>
          </div>
          <div
            className="modal-comments-sheet-body"
            onScroll={(event) => {
              const target = event.currentTarget
              if (target.scrollTop + target.clientHeight >= target.scrollHeight - 80) void loadMoreComments()
            }}
          >
            {commentError ? <div className="alert alert-error" style={{ margin: '8px 16px' }}>{commentError}</div> : null}
            {comments.map((item) => (
              <EditableComment
                key={item.id}
                comment={item}
                canEdit={Boolean(currentUserId && item.userId === currentUserId)}
                endpoint="/api/image-comments"
                onChange={(commentId, content) =>
                  setComments((current) => current.map((commentItem) => (commentItem.id === commentId ? { ...commentItem, content } : commentItem)))
                }
                onDelete={(commentId) => {
                  setComments((current) => {
                    const next = current.filter((commentItem) => commentItem.id !== commentId && commentItem.parentCommentId !== commentId)
                    setCommentCount((count) => Math.max(0, count - (current.length - next.length)))
                    return next
                  })
                }}
                onReply={postImageReplyComment}
              />
            ))}
            {loadingComments ? <div className="comment-loading" style={{ padding: '12px 16px' }}>Loading comments...</div> : null}
          </div>
          <div className="modal-comments-sheet-input">
            <div className="comment-input-row">
              <input
                className="form-input"
                type="text"
                placeholder="Add a comment..."
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
              <LoadingButton className="btn-icon" aria-label="Post comment" loading={postingComment} disabled={!comment.trim()} onClick={postImageComment}>
                <IconSend size={14} />
              </LoadingButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FloorPlanModal({
  plans,
  currentUserId,
  onClose,
}: {
  plans: PublicFloorPlan[]
  currentUserId: string | null
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)
  const plan = plans[index] ?? plans[0]
  const touchStartX = useRef<number | null>(null)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentCount, setCommentCount] = useState(0)
  const [commentsOffset, setCommentsOffset] = useState(0)
  const [hasMoreComments, setHasMoreComments] = useState(true)
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [imgError, setImgError] = useState(false)

  useEffect(() => { setImgError(false) }, [plan.imageUrl])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + plans.length) % plans.length)
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % plans.length)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, plans.length])

  useEffect(() => {
    let cancelled = false
    setComments([])
    setCommentCount(0)
    setCommentsOffset(0)
    setHasMoreComments(true)
    setCommentError('')
    async function loadComments() {
      setLoadingComments(true)
      const response = await fetch(`/api/image-comments?imageId=${encodeURIComponent(plan.id)}&offset=0&limit=20`)
      const payload = await response.json().catch(() => null)
      if (cancelled) return
      setLoadingComments(false)
      if (!response.ok) { setCommentError(payload?.error ?? 'Unable to load comments.'); return }
      const nextComments = normalizeOverlayComments(payload?.comments ?? [])
      setComments(nextComments)
      setCommentCount(nextComments.length)
      setCommentsOffset(nextComments.length)
      setHasMoreComments(nextComments.length === 20)
    }
    loadComments()
    return () => { cancelled = true }
  }, [plan.id])

  const loadMoreComments = async () => {
    if (loadingComments || !hasMoreComments) return
    setLoadingComments(true)
    const response = await fetch(`/api/image-comments?imageId=${encodeURIComponent(plan.id)}&offset=${commentsOffset}&limit=20`)
    const payload = await response.json().catch(() => null)
    setLoadingComments(false)
    if (!response.ok) { setCommentError(payload?.error ?? 'Unable to load more comments.'); return }
    const nextComments = normalizeOverlayComments(payload?.comments ?? [])
    setComments((current) => [...current, ...nextComments])
    setCommentCount((current) => current + nextComments.length)
    setCommentsOffset((current) => current + nextComments.length)
    setHasMoreComments(nextComments.length === 20)
  }

  const postComment = async () => {
    if (!comment.trim() || postingComment) return
    setPostingComment(true)
    setCommentError('')
    const formData = new FormData()
    formData.set('image_id', plan.id)
    formData.set('content', comment.trim())
    const response = await fetch('/api/image-comments', { method: 'POST', body: formData })
    const payload = await response.json().catch(() => null)
    setPostingComment(false)
    if (!response.ok) {
      setCommentError(response.status === 401 ? 'Sign in to comment.' : payload?.error ?? 'Unable to post comment.')
      return
    }
    setComments((current) => [...current, { id: payload.comment.id, userId: payload.comment.userId, username: payload.comment.username, content: payload.comment.content, createdAt: payload.comment.createdAt, parentCommentId: null, imageUrl: null, time: 'Just now' }])
    setCommentCount(payload.commentCount ?? commentCount + 1)
    setComment('')
  }

  const postReply = async (parentCommentId: string, content: string) => {
    const formData = new FormData()
    formData.set('image_id', plan.id)
    formData.set('content', content)
    formData.set('parent_comment_id', parentCommentId)
    const response = await fetch('/api/image-comments', { method: 'POST', body: formData })
    const payload = await response.json().catch(() => null)
    if (!response.ok) return response.status === 401 ? 'Sign in to reply.' : payload?.error ?? 'Unable to post reply.'
    setComments((current) => [...current, { id: payload.comment.id, userId: payload.comment.userId, username: payload.comment.username, content: payload.comment.content, createdAt: payload.comment.createdAt, parentCommentId: payload.comment.parentCommentId, imageUrl: null, time: 'Just now' }])
    setCommentCount(payload.commentCount ?? commentCount + 1)
    return null
  }

  return (
    <div className="update-modal" role="dialog" aria-modal="true">
      <button className="update-modal-backdrop" type="button" aria-label="Close floor plan" onClick={onClose} />
      <div className="update-modal-panel">
        <button className="btn-icon update-modal-close" type="button" aria-label="Close floor plan" onClick={onClose}>
          <IconX size={18} />
        </button>
        <div
          className="update-modal-media"
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null || plans.length <= 1) return
            const dx = e.changedTouches[0].clientX - touchStartX.current
            if (Math.abs(dx) > 40) setIndex((i) => dx < 0 ? (i + 1) % plans.length : (i - 1 + plans.length) % plans.length)
            touchStartX.current = null
          }}
        >
          {imgError ? (
            <div className="floor-plan-img-error">Unable to load floor plan image.</div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="timeline-modal-image" src={plan.imageUrl} alt="Floor plan" onError={() => setImgError(true)} />
          )}
          {plans.length > 1 && <span className="photo-lightbox-count">{index + 1} / {plans.length}</span>}
          {plans.length > 1 ? (
            <>
              <button className="carousel-control carousel-control-prev" type="button" aria-label="Previous" onClick={() => setIndex((i) => (i - 1 + plans.length) % plans.length)}>{'<'}</button>
              <button className="carousel-control carousel-control-next" type="button" aria-label="Next" onClick={() => setIndex((i) => (i + 1) % plans.length)}>{'>'}</button>
            </>
          ) : null}
          <button className="modal-view-comments-btn" type="button" onClick={() => setCommentsOpen(true)}>
            <IconMessageCircle size={14} />
            {commentCount > 0 ? `${commentCount} comment${commentCount === 1 ? '' : 's'}` : 'Add a comment'}
          </button>
        </div>
        <aside className="update-modal-detail">
          <div className="update-modal-header">
            <span className="badge badge-phase">Floor plan</span>
            <span className="muted-row">Public</span>
          </div>
          <div className="update-card-actions update-modal-actions">
            <span className="update-action"><IconMessageCircle size={15} />{commentCount}</span>
          </div>
          <div
            className="update-modal-comments"
            onScroll={(event) => {
              const target = event.currentTarget
              if (target.scrollTop + target.clientHeight >= target.scrollHeight - 80) void loadMoreComments()
            }}
          >
            {commentError ? <div className="alert alert-error">{commentError}</div> : null}
            {comments.map((item) => (
              <EditableComment
                key={item.id}
                comment={item}
                canEdit={Boolean(currentUserId && item.userId === currentUserId)}
                endpoint="/api/image-comments"
                onChange={(commentId, content) => setComments((current) => current.map((c) => c.id === commentId ? { ...c, content } : c))}
                onDelete={(commentId) => {
                  setComments((current) => {
                    const next = current.filter((c) => c.id !== commentId && c.parentCommentId !== commentId)
                    setCommentCount((count) => Math.max(0, count - (current.length - next.length)))
                    return next
                  })
                }}
                onReply={postReply}
              />
            ))}
            {loadingComments ? <div className="comment-loading">Loading comments...</div> : null}
          </div>
          <div className="comment-input-row update-modal-comment-input">
            <input
              className="form-input"
              type="text"
              placeholder="Add a comment..."
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void postComment() }}
            />
            <LoadingButton className="btn-icon" aria-label="Post comment" loading={postingComment} disabled={!comment.trim()} onClick={postComment}>
              <IconSend size={14} />
            </LoadingButton>
          </div>
        </aside>
      </div>
      {commentsOpen ? (
        <div className="modal-comments-sheet" role="dialog" aria-label="Comments">
          <div className="modal-comments-sheet-header">
            <button className="modal-comments-sheet-back" type="button" onClick={() => setCommentsOpen(false)}>
              <IconArrowLeft size={16} /> Back
            </button>
            <span className="modal-comments-sheet-title">Comments{commentCount > 0 ? ` (${commentCount})` : ''}</span>
          </div>
          <div
            className="modal-comments-sheet-body"
            onScroll={(event) => {
              const target = event.currentTarget
              if (target.scrollTop + target.clientHeight >= target.scrollHeight - 80) void loadMoreComments()
            }}
          >
            {commentError ? <div className="alert alert-error" style={{ margin: '8px 16px' }}>{commentError}</div> : null}
            {comments.map((item) => (
              <EditableComment
                key={item.id}
                comment={item}
                canEdit={Boolean(currentUserId && item.userId === currentUserId)}
                endpoint="/api/image-comments"
                onChange={(commentId, content) => setComments((current) => current.map((c) => c.id === commentId ? { ...c, content } : c))}
                onDelete={(commentId) => {
                  setComments((current) => {
                    const next = current.filter((c) => c.id !== commentId && c.parentCommentId !== commentId)
                    setCommentCount((count) => Math.max(0, count - (current.length - next.length)))
                    return next
                  })
                }}
                onReply={postReply}
              />
            ))}
            {loadingComments ? <div className="comment-loading" style={{ padding: '12px 16px' }}>Loading comments...</div> : null}
          </div>
          <div className="modal-comments-sheet-input">
            <div className="comment-input-row">
              <input
                className="form-input"
                type="text"
                placeholder="Add a comment..."
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void postComment() }}
              />
              <LoadingButton className="btn-icon" aria-label="Post comment" loading={postingComment} disabled={!comment.trim()} onClick={postComment}>
                <IconSend size={14} />
              </LoadingButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TimelineTab({
  build,
  updates,
  currentUserId,
  onOpenUpdate,
}: {
  build: PublicBuildDetail
  updates: Update[]
  currentUserId: string | null
  onOpenUpdate: (update: Update, imageIndex?: number) => void
}) {
  const [selectedEntry, setSelectedEntry] = useState<{ images: TimelinePhoto[]; index: number } | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const updatesById = useMemo(() => new Map(updates.map((update) => [update.id, update])), [updates])
  const imagesByMilestone = useMemo(() => {
    const grouped = new Map<string, TimelinePhoto[]>()
    build.images.forEach((image) => {
      if (!image.milestoneId) return
      grouped.set(image.milestoneId, [...(grouped.get(image.milestoneId) ?? []), image])
    })
    return grouped
  }, [build.images])
  const sortedMilestones = useMemo(() => {
    return [...build.milestones].sort((a, b) => {
      const aTime = a.startDate ? new Date(a.startDate).getTime() : (sortOrder === 'asc' ? Infinity : -Infinity)
      const bTime = b.startDate ? new Date(b.startDate).getTime() : (sortOrder === 'asc' ? Infinity : -Infinity)
      return sortOrder === 'asc' ? aTime - bTime : bTime - aTime
    })
  }, [build.milestones, sortOrder])
  const completedPhaseDurations = sortedMilestones
    .map((milestone) => ({ milestone, days: completedPhaseDays(milestone) }))
    .filter((item) => item.days > 0)
  const phaseDurations = sortedMilestones
    .filter((milestone) => milestone.status !== 'pending')
    .map((milestone) => ({ milestone, days: displayPhaseDays(milestone) }))
    .filter((item) => item.days > 0)
  const totalPhaseDays = phaseDurations.reduce((total, item) => total + item.days, 0)
  const gapItems = sortedMilestones.slice(0, -1).map((milestone, index) => calcGap(milestone, sortedMilestones[index + 1]))
  const totalGapDays = gapItems.reduce((total, gap) => total + (gap && !gap.isOverlap ? gap.days : 0), 0)
  const totalBuildDays = calcTotalBuildDays(build.milestones)
  const longestPhase = completedPhaseDurations.reduce<(typeof completedPhaseDurations)[number] | null>((longest, item) => {
    if (!longest) return item
    return item.days > longest.days ? item : longest
  }, null)
  const longestBarDays = Math.max(1, ...phaseDurations.map((item) => item.days))

  return (
    <div className="timeline-dashboard">
      <div className="timeline-summary-grid">
        <div className="timeline-summary-card">
          <span className="timeline-summary-label">Total build time</span>
          <strong>{totalBuildDays ? formatDuration(totalBuildDays) : '-'}</strong>
          <span>Wall clock from first start to latest end</span>
        </div>
        <div className="timeline-summary-card">
          <span className="timeline-summary-label">Time in phases</span>
          <strong>{totalPhaseDays ? formatDuration(totalPhaseDays) : '-'}</strong>
          <span>{phaseDurations.length} tracked phase{phaseDurations.length === 1 ? '' : 's'}</span>
        </div>
        <div className={`timeline-summary-card ${totalGapDays ? 'timeline-summary-card-gap' : ''}`}>
          <span className="timeline-summary-label">Time between phases</span>
          <strong className={totalGapDays ? '' : 'timeline-summary-value-small'}>{totalGapDays ? formatDuration(totalGapDays) : 'None recorded'}</strong>
          <span>{totalGapDays ? 'Waiting time between official stages' : 'Phases ran back to back'}</span>
        </div>
        <div className="timeline-summary-card">
          <span className="timeline-summary-label">Longest phase</span>
          <strong>{longestPhase ? formatDuration(longestPhase.days) : '-'}</strong>
          <span>{longestPhase?.milestone.title ?? '-'}</span>
        </div>
      </div>

      <div className="timeline-panel-header">
        <button
          className="btn btn-ghost btn-sm timeline-sort-btn"
          type="button"
          onClick={() => setSortOrder((o) => o === 'asc' ? 'desc' : 'asc')}
        >
          {sortOrder === 'asc' ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />}
          {sortOrder === 'asc' ? 'Oldest first' : 'Newest first'}
        </button>
      </div>

      <div className="timeline-panel">
      {sortedMilestones.map((milestone, index) => (
        <div className="timeline-row" key={milestone.id}>
          <div className={`timeline-item timeline-item-${milestone.status}`}>
            <div className="timeline-marker">
              <div className={`timeline-dot timeline-dot-${milestone.status}`}>
                {milestone.status === 'complete' && <IconCheck size={11} />}
                {milestone.status === 'active' && <IconClock size={12} />}
                {milestone.status === 'pending' && <IconCircleDashed size={13} />}
              </div>
              {index < sortedMilestones.length - 1 && (
                <div className={`timeline-line ${milestone.status === 'complete' ? 'timeline-line-complete' : ''}`} />
              )}
            </div>

            <div className="timeline-content">
              {milestone.status === 'pending' ? (
                <div className="timeline-pending-title">{milestone.title}</div>
              ) : (
                <div className={`timeline-card ${milestone.status === 'active' ? 'timeline-card-active' : ''}`}>
                  <div className="timeline-card-header">
                    <div>
                      <span className="timeline-title">{milestone.title}</span>
                      <div className="timeline-date">
                        {formatTimelineDateRange(milestone)}
                      </div>
                    </div>
                    <div className="timeline-status-row">
                      {milestone.status === 'active' && <span className="timeline-status-badge timeline-status-active">In progress</span>}
                      {milestone.status === 'complete' && <span className="timeline-status-badge timeline-status-complete">Complete</span>}
                    </div>
                  </div>

                  <div className="timeline-card-divider" />

                  <div className="timeline-duration-block">
                    <div className="timeline-duration-bar" aria-hidden="true">
                      <span
                        className={milestone.status === 'active' ? 'timeline-duration-fill timeline-duration-fill-active' : 'timeline-duration-fill'}
                        style={{ width: `${Math.max(4, Math.min(100, (displayPhaseDays(milestone) / longestBarDays) * 100))}%` }}
                      />
                    </div>
                    <div className="timeline-duration-copy">{formatDuration(displayPhaseDays(milestone))} in {milestone.title}</div>
                  </div>

                  <div className="timeline-card-bottom">
                    <div className="timeline-metrics-row">
                      <div className="timeline-metric">
                        <IconRuler size={15} />
                        <span>{formatDuration(displayPhaseDays(milestone))}</span>
                        <small>in phase</small>
                      </div>
                      <div className="timeline-metric">
                        <IconCamera size={15} />
                        <span>{milestone.updates}</span>
                        <small>update{milestone.updates === 1 ? '' : 's'}</small>
                      </div>
                    </div>

                    <div className="timeline-photo-section">
                      <TimelinePhotoStrip
                        photos={imagesByMilestone.get(milestone.id) ?? []}
                        updatesById={updatesById}
                        onOpenImage={(photos, index) => setSelectedEntry({ images: photos, index })}
                        onOpenUpdate={onOpenUpdate}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {index < sortedMilestones.length - 1 ? <TimelineGapIndicator gap={gapItems[index]} /> : null}
        </div>
      ))}
      </div>

      {selectedEntry ? <TimelinePhotoOverlay images={selectedEntry.images} initialIndex={selectedEntry.index} currentUserId={currentUserId} onClose={() => setSelectedEntry(null)} /> : null}
    </div>
  )
}

function TimelineGapIndicator({ gap }: { gap: TimelineGapInfo | null }) {
  if (!gap) return null

  return (
    <div className="timeline-gap-row">
      <div className="timeline-gap-spine" aria-hidden="true">
        <span className="timeline-gap-connector" />
      </div>
      <div className="timeline-gap-content">
        <span className={`timeline-gap-pill ${gap.isOverlap ? 'timeline-gap-pill-overlap' : ''}`} title={gap.title}>
          {gap.isOverlap ? <IconArrowsJoin size={12} /> : <IconClock size={12} />}
          {gap.label}
        </span>
      </div>
    </div>
  )
}

function TimelinePhotoStrip({
  photos,
  updatesById,
  onOpenImage,
  onOpenUpdate,
}: {
  photos: TimelinePhoto[]
  updatesById: Map<string, Update>
  onOpenImage: (photos: TimelinePhoto[], index: number) => void
  onOpenUpdate: (update: Update, imageIndex?: number) => void
}) {
  if (!photos.length) {
    return <div className="timeline-photo-empty">No public photos captured for this stage yet.</div>
  }

  return (
    <div className="timeline-photo-strip">
      {photos.slice(0, 8).map((photo, index) => {
        const update = photo.updateId ? updatesById.get(photo.updateId) : null
        const commentCount = update?.commentCount ?? photo.commentCount
        const remainder = photos.length > 8 && index === 7 ? photos.length - 8 : 0
        return (
          <button
            key={photo.id}
            className="timeline-photo-tile"
            type="button"
            onClick={() => update ? onOpenUpdate(update, Math.max(0, update.imageIds.indexOf(photo.id))) : onOpenImage(photos, index)}
            aria-label={`Open ${photo.milestone} photo`}
          >
            {photo.imageUrl ? (
              // Signed Supabase URLs are rendered directly until remote image patterns are finalized.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.imageUrl} alt="" />
            ) : (
              <IconPhoto size={20} />
            )}
            {commentCount > 0 ? (
              <span className="timeline-photo-meta">
                <IconMessageCircle size={12} /> {commentCount}
              </span>
            ) : null}
            {remainder > 0 ? <span className="timeline-photo-remainder">+{remainder}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

function ImagesTab({ build }: { build: PublicBuildDetail }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set())

  const allImages = build.images.length
    ? build.images
    : [{ id: build.id, imageUrl: build.imageUrl, milestone: build.phase, milestoneId: null, updateId: null, commentCount: 0, notes: null }]
  const images = allImages.filter((img) => !brokenIds.has(img.id))
  const paginatedImages = pageItems(images, currentPage)
  const selected = selectedIndex == null ? null : images[selectedIndex] ?? null

  const markBroken = (id: string) => setBrokenIds((prev) => new Set([...prev, id]))

  return (
    <>
      <div className="image-grid">
        {paginatedImages.items.map((item) => (
          <button className="image-grid-item" key={item.id} type="button" onClick={() => setSelectedIndex(images.findIndex((image) => image.id === item.id))}>
            {item.imageUrl ? (
              // Signed Supabase URLs are rendered directly until remote image patterns are finalized.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt={`${item.milestone} build update`} onError={() => markBroken(item.id)} />
            ) : (
              <Image src="/images/comingsoon.jpg" alt="" fill sizes="(min-width: 1024px) 22vw, 33vw" />
            )}
            <div className="image-grid-label">{item.milestone}</div>
          </button>
        ))}
      </div>
      <PaginationControls
        currentPage={paginatedImages.currentPage}
        pageCount={paginatedImages.pageCount}
        totalCount={images.length}
        onPageChange={setCurrentPage}
      />
      {selected ? (
        <PhotoCarouselOverlay
          title={selected.milestone}
          images={images.map((image) => ({ url: image.imageUrl, title: image.milestone, notes: image.notes ?? null, selectionTags: image.selectionTags ?? [] }))}
          initialIndex={Math.max(0, selectedIndex ?? 0)}
          onClose={() => setSelectedIndex(null)}
        />
      ) : null}
    </>
  )
}

function InspirationTab({ build }: { build: PublicBuildDetail }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const paginatedImages = pageItems(build.inspirationImages, currentPage)
  const selected = selectedIndex == null ? null : build.inspirationImages[selectedIndex] ?? null

  if (!build.inspirationImages.length) {
    return (
      <div className="empty-state">
        <IconPhoto size={32} />
        <h3 className="empty-state-title">No inspiration photos yet</h3>
        <p className="empty-state-sub">Inspiration photos will appear here when the owner adds them.</p>
      </div>
    )
  }

  return (
    <>
      <div className="image-grid">
        {paginatedImages.items.map((item) => (
          <button className="image-grid-item inspiration-grid-item" key={item.id} type="button" onClick={() => setSelectedIndex(build.inspirationImages.findIndex((image) => image.id === item.id))}>
            {item.imageUrl ? (
              // Signed Supabase URLs are rendered directly until remote image patterns are finalized.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="Inspiration" />
            ) : (
              <Image src="/images/comingsoon.jpg" alt="" fill sizes="(min-width: 1024px) 22vw, 33vw" />
            )}
            <div className="image-grid-label">{item.notes || 'Inspiration'}</div>
          </button>
        ))}
      </div>
      <PaginationControls
        currentPage={paginatedImages.currentPage}
        pageCount={paginatedImages.pageCount}
        totalCount={build.inspirationImages.length}
        onPageChange={setCurrentPage}
      />
      {selected ? (
        <PhotoCarouselOverlay
          title="Inspiration"
          images={build.inspirationImages.map((image) => ({ url: image.imageUrl, title: 'Inspiration', notes: image.notes ?? null }))}
          initialIndex={Math.max(0, selectedIndex ?? 0)}
          onClose={() => setSelectedIndex(null)}
          showNotes
        />
      ) : null}
    </>
  )
}

function PhotoCarouselOverlay({
  images,
  initialIndex,
  title,
  onClose,
  showNotes = false,
}: {
  images: { url: string | null; title: string; notes: string | null; selectionTags?: InspirationTag[] }[]
  initialIndex: number
  title: string
  onClose: () => void
  showNotes?: boolean
}) {
  const [index, setIndex] = useState(initialIndex)
  const [tagsOpen, setTagsOpen] = useState(false)
  const current = images[index] ?? images[0]
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length)
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, images.length])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const tags = current?.selectionTags ?? []

  return (
    <div className="update-modal photo-lightbox" role="dialog" aria-modal="true">
      <button className="update-modal-backdrop" type="button" aria-label="Close photo" onClick={onClose} />
      <div className="photo-lightbox-panel">
        <button className="photo-lightbox-close-btn" type="button" aria-label="Close photo" onClick={onClose}>
          <IconX size={16} />
        </button>
        {/* Content block — image + overlay bar grouped so they can be centered together on mobile */}
        <div className="photo-lightbox-content">
          <div
            className="photo-lightbox-image-area"
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null || images.length <= 1) return
              const dx = e.changedTouches[0].clientX - touchStartX.current
              if (Math.abs(dx) > 40) setIndex((i) => dx < 0 ? (i + 1) % images.length : (i - 1 + images.length) % images.length)
              touchStartX.current = null
            }}
          >
            {current?.url ? (
              // Signed Supabase URLs are rendered directly until remote image patterns are finalized.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.url} alt={current.title || title} />
            ) : (
              <Image src="/images/comingsoon.jpg" alt="" fill sizes="100vw" />
            )}
            {images.length > 1 && (
              <span className="photo-lightbox-count">{index + 1} / {images.length}</span>
            )}
            {images.length > 1 ? (
              <>
                <button className="carousel-control carousel-control-prev" type="button" aria-label="Previous photo" onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}>{"<"}</button>
                <button className="carousel-control carousel-control-next" type="button" aria-label="Next photo" onClick={() => setIndex((i) => (i + 1) % images.length)}>{">"}</button>
              </>
            ) : null}
          </div>
          {/* Overlay bar: absolute on desktop, flows directly below image on mobile */}
          <div className="photo-lightbox-overlay-bar">
            <span className="badge badge-phase">{current?.title ?? title}</span>
            {tags.length > 0 && (
              <div className="photo-lightbox-tags-section">
                <button
                  type="button"
                  className="photo-lightbox-tags-toggle"
                  onClick={() => setTagsOpen((o) => !o)}
                  aria-expanded={tagsOpen}
                >
                  <span>View products in this image</span>
                  <span className="photo-lightbox-tags-toggle-icon">{tagsOpen ? '−' : '+'}</span>
                </button>
                {tagsOpen && (
                  <div className="photo-lightbox-tag-row">
                    {tags.map((tag) => {
                      const primary = tag.colourName || tag.productName || tag.itemName || tag.brand || tag.subcategory || tag.category || 'Selection'
                      const secondary = tag.colourName ? (tag.subcategory || tag.category) : null
                      return (
                        <span key={tag.selectionId} className="photo-lightbox-tag">
                          <span className="photo-lightbox-tag-thumb">
                            {tag.imageUrl
                              ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={tag.imageUrl} alt="" />
                              : <IconPhoto size={12} />
                            }
                          </span>
                          {primary}{secondary ? <span className="photo-lightbox-tag-cat"> · {secondary}</span> : null}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            {showNotes && current?.notes ? <p className="photo-lightbox-overlay-notes">{current.notes}</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function UpdatesTab({ updates, onOpen }: { updates: Update[]; onOpen: (update: Update) => void }) {
  const [currentPage, setCurrentPage] = useState(1)
  const paginatedUpdates = pageItems(updates, currentPage)

  if (!updates.length) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">No public updates yet</h3>
        <p className="empty-state-sub">Updates will appear here when images or posts are shared publicly.</p>
      </div>
    )
  }

  return (
    <>
      <div className="update-photo-grid">
        {paginatedUpdates.items.map((update) => (
          <UpdateGridItem key={update.id} update={update} onOpen={() => onOpen(update)} />
        ))}
      </div>
      <PaginationControls
        currentPage={paginatedUpdates.currentPage}
        pageCount={paginatedUpdates.pageCount}
        totalCount={updates.length}
        onPageChange={setCurrentPage}
      />
    </>
  )
}

const SELECTION_TYPE_LABELS: Record<string, string> = {
  colour: 'Colour',
  construction: 'Exterior & Structure',
  cabinetry: 'Cabinetry',
  appliance: 'Appliance',
  electrical: 'Electrical',
  tapware: 'Tapware',
  other: 'Other',
}

const ROOM_TYPE_OPTIONS = ['Kitchen', 'Scullery', 'Laundry', 'Bathroom', 'Ensuite', 'Powder room', 'Bedroom', 'Living', 'Theatre', 'Study', 'Alfresco', 'Garage', 'Exterior', 'Whole house']

function selectionLabels(selection: PublicSelection) {
  const typeLabel = selection.selectionType ? SELECTION_TYPE_LABELS[selection.selectionType] ?? titleCase(selection.selectionType) : 'Selection'
  const st = selection.selectionType ?? ''
  const roomLabel = selection.roomType ? formatRoomType(selection.roomType) : selection.roomName || selection.location || null

  const badgeLabel = (st === 'appliance' || st === 'electrical' || st === 'tapware')
    ? (selection.subcategory || selection.materialType || typeLabel)
    : (selection.materialType || selection.subcategory || selection.category || typeLabel)

  const cardTitle = (st === 'appliance' || st === 'electrical' || st === 'tapware')
    ? (selection.productName || selection.brand || selection.subcategory || 'Selection')
    : st === 'other'
    ? (selection.itemName || selection.productName || selection.category || 'Selection')
    : (selection.colourName || selection.productName || selection.category || 'Selection')

  const cardSubtitle = (st === 'appliance' || st === 'electrical' || st === 'tapware')
    ? (selection.materialType || null)
    : st === 'construction'
    ? (selection.subcategory || null)
    : (selection.finish || null)

  const visualLabel = selection.colourName || selection.productName || selection.itemName || selection.materialType || selection.subcategory || typeLabel

  let rawDetails: { label: string; value: string | null | undefined }[]
  if (st === 'appliance') {
    rawDetails = [
      { label: 'Brand', value: selection.brand },
      { label: 'Appliance type', value: selection.subcategory },
      { label: 'Finish', value: selection.materialType },
      { label: 'Product code', value: selection.model },
      { label: 'Supplier', value: selection.supplier },
      { label: 'Notes', value: selection.notes },
    ]
  } else if (st === 'electrical' || st === 'tapware') {
    rawDetails = [
      { label: 'Brand', value: selection.brand },
      { label: 'Fitting', value: selection.subcategory },
      { label: 'Finish', value: selection.materialType },
      { label: 'Product code', value: selection.model },
      { label: 'Supplier', value: selection.supplier },
      { label: 'Notes', value: selection.notes },
    ]
  } else if (st === 'construction') {
    rawDetails = [
      { label: 'Brand', value: selection.brand },
      { label: 'Area / Part / Material', value: [selection.category, selection.subcategory, selection.materialType].filter(Boolean).join(' / ') },
      { label: 'Colour', value: selection.colourName },
      { label: 'Product code', value: selection.code },
      { label: 'Supplier', value: selection.supplier },
      { label: 'Notes', value: selection.notes },
    ]
  } else if (st === 'cabinetry') {
    rawDetails = [
      { label: 'Brand', value: selection.brand },
      { label: 'Cabinet', value: selection.subcategory },
      { label: 'Material', value: selection.materialType },
      { label: 'Finish', value: selection.finish },
      { label: 'Product code', value: selection.code },
      { label: 'Supplier', value: selection.supplier },
      { label: 'Notes', value: selection.notes },
    ]
  } else if (st === 'colour') {
    rawDetails = [
      { label: 'Brand', value: selection.brand },
      { label: 'Area / Part', value: [selection.category, selection.subcategory].filter(Boolean).join(' / ') },
      { label: 'Material', value: selection.materialType },
      { label: 'Finish', value: selection.finish },
      { label: 'Colour code', value: selection.code },
      { label: 'Supplier', value: selection.supplier },
      { label: 'Notes', value: selection.notes },
    ]
  } else {
    rawDetails = [
      { label: 'Category', value: selection.category },
      { label: 'Detail', value: selection.subcategory },
      { label: 'Material', value: selection.materialType },
      { label: 'Brand', value: selection.brand },
      { label: 'Supplier', value: selection.supplier },
      { label: 'Notes', value: selection.notes },
    ]
  }
  const details = rawDetails.filter((item) => item.value)

  return { badgeLabel, visualLabel, cardTitle, cardSubtitle, roomLabel, details }
}

function SelectionCard({ selection }: { selection: PublicSelection }) {
  const [expanded, setExpanded] = useState(false)
  const { badgeLabel, visualLabel, cardTitle, cardSubtitle, roomLabel, details } = selectionLabels(selection)

  return (
    <article className="card management-image-card selection-card">
      <div className={`management-image-media selection-card-image ${selection.imageUrl ? 'selection-card-image-uploaded' : 'selection-card-image-placeholder'}`}>
        {(selection.selectionType === 'construction' ? selection.category : roomLabel) ? (
          <span className="selection-card-room-badge">{selection.selectionType === 'construction' ? selection.category : roomLabel}</span>
        ) : null}
        {selection.imageUrl ? (
          // Signed Supabase URLs are rendered directly until remote image patterns are finalized.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selection.imageUrl} alt="" />
        ) : (
          <div className="selection-card-visual">
            <div className="selection-card-visual-mark">
              <IconPhoto size={22} />
            </div>
            <span>{visualLabel}</span>
          </div>
        )}
      </div>
      <div className="management-image-body">
        <button className="management-image-summary" type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          <span className="management-image-copy">
            <span className="selection-card-topline">
              <span className="badge badge-phase">{badgeLabel}</span>
            </span>
            <span className="selection-card-title">{cardTitle}</span>
            {cardSubtitle ? <span className="selection-card-detail">{cardSubtitle}</span> : null}
          </span>
          <IconChevronDown className={expanded ? 'management-image-chevron-expanded' : ''} size={16} />
        </button>
        {expanded ? (
          <div className="management-image-details selection-card-expanded">
            {details.map((item) => (
              <div className="selection-card-detail-row" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
            {selection.productUrl ? (
              <a className="directory-link" href={selection.productUrl} target="_blank" rel="noreferrer">
                Source link
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}

function SelectionsTab({ build }: { build: PublicBuildDetail }) {
  const [columnCount, setColumnCount] = useState(4)
  const [activeRoomType, setActiveRoomType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const roomTypeOptions = useMemo(() => {
    const optionOrder = new Map(ROOM_TYPE_OPTIONS.map((roomType, index) => [normalizeRoomType(roomType), index]))
    const options = new Map<string, string>()

    build.selections.forEach((selection) => {
      const key = normalizeRoomType(selection.roomType)
      if (!key || options.has(key)) return
      options.set(key, formatRoomType(selection.roomType ?? key))
    })

    return Array.from(options.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => {
        const aOrder = optionOrder.get(a.value) ?? Number.MAX_SAFE_INTEGER
        const bOrder = optionOrder.get(b.value) ?? Number.MAX_SAFE_INTEGER
        if (aOrder !== bOrder) return aOrder - bOrder
        return a.label.localeCompare(b.label)
      })
  }, [build.selections])
  const filteredSelections = useMemo(() => {
    if (activeRoomType === 'all') return build.selections
    return build.selections.filter((selection) => normalizeRoomType(selection.roomType) === activeRoomType)
  }, [activeRoomType, build.selections])
  const paginatedSelections = pageItems(filteredSelections, currentPage)
  const selectionColumns = useMemo(() => {
    const columns = Array.from({ length: columnCount }, () => [] as PublicSelection[])
    paginatedSelections.items.forEach((selection, index) => columns[index % columnCount].push(selection))
    return columns
  }, [columnCount, paginatedSelections.items])

  useEffect(() => {
    const updateColumnCount = () => {
      if (window.innerWidth <= 767) setColumnCount(2)
      else setColumnCount(4)
    }

    updateColumnCount()
    window.addEventListener('resize', updateColumnCount)
    return () => window.removeEventListener('resize', updateColumnCount)
  }, [])

  if (!build.selections.length) {
    return (
      <div className="empty-state">
        <IconPhoto size={32} />
        <h3 className="empty-state-title">No selections shared yet</h3>
        <p className="empty-state-sub">The owner has not made their selections public.</p>
      </div>
    )
  }

  return (
    <div className="public-selections">
      <div className="management-image-filters public-selection-filters">
        <div className="form-group">
          <label className="form-label">Room type</label>
          <select className="form-select" value={activeRoomType} onChange={(event) => { setActiveRoomType(event.target.value); setCurrentPage(1) }}>
            <option value="all">All room types</option>
            {roomTypeOptions.map((roomType) => (
              <option key={roomType.value} value={roomType.value}>{roomType.label}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredSelections.length ? (
        <>
          <div className="selection-masonry-grid" style={{ '--selection-column-count': columnCount } as CSSProperties}>
            {selectionColumns.map((column, columnIndex) => (
              <div key={columnIndex} className="management-image-column">
                {column.map((selection) => (
                  <SelectionCard key={selection.id} selection={selection} />
                ))}
              </div>
            ))}
          </div>
          <PaginationControls
            currentPage={paginatedSelections.currentPage}
            pageCount={paginatedSelections.pageCount}
            totalCount={filteredSelections.length}
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        <div className="empty-state">
          <IconPhoto size={32} />
          <h3 className="empty-state-title">No selections for this room type</h3>
          <p className="empty-state-sub">Choose another room type to view shared selections.</p>
        </div>
      )}
    </div>
  )
}

function StandardTab({ build }: { build: PublicBuildDetail }) {
  const rows = specRows(build)

  return (
    <div className="card standard-spec-card">
      {rows.map((row) => (
        <div key={row.key} className="standard-spec-row">
          <span className="standard-spec-key">{row.key}</span>
          <span className="standard-spec-val">{row.val}</span>
        </div>
      ))}
    </div>
  )
}

function OverviewTab({ build }: { build: PublicBuildDetail }) {
  const hasBudget = build.budget.landMin || build.budget.landMax || build.budget.buildMin || build.budget.buildMax
  const hasStyles = build.planningStyles.length > 0
  const hasSuburbs = build.planningSuburbs.length > 0
  const hasBuilders = build.planningBuilders.length > 0
  const hasDetails = build.suburb || build.state || build.builder || build.style

  const formatBudget = (min: number | null, max: number | null) => {
    const fmt = (n: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)
    if (min && max) return `${fmt(min)} – ${fmt(max)}`
    if (min) return `From ${fmt(min)}`
    if (max) return `Up to ${fmt(max)}`
    return null
  }
  const landBudget = formatBudget(build.budget.landMin, build.budget.landMax)
  const buildBudget = formatBudget(build.budget.buildMin, build.budget.buildMax)

  return (
    <div className="planning-overview">
      {hasDetails && (
        <section className="card">
          <div className="card-body">
            <div className="section-label">About this plan</div>
            <div className="overview-detail-grid">
              {build.suburb && (
                <div className="overview-detail-row">
                  <span className="overview-detail-key">Target suburb</span>
                  <span className="overview-detail-val">{build.suburb}</span>
                </div>
              )}
              {build.state && (
                <div className="overview-detail-row">
                  <span className="overview-detail-key">State</span>
                  <span className="overview-detail-val">{build.state}</span>
                </div>
              )}
              {build.builder && (
                <div className="overview-detail-row">
                  <span className="overview-detail-key">Builder</span>
                  <span className="overview-detail-val">{build.builder}</span>
                </div>
              )}
              {build.style && (
                <div className="overview-detail-row">
                  <span className="overview-detail-key">Project type</span>
                  <span className="overview-detail-val">{build.style}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {hasBudget && (
        <section className="card">
          <div className="card-body">
            <div className="section-label">Budget</div>
            <div className="overview-detail-grid">
              {landBudget && (
                <div className="overview-detail-row">
                  <span className="overview-detail-key">Land budget</span>
                  <span className="overview-detail-val">{landBudget}</span>
                </div>
              )}
              {buildBudget && (
                <div className="overview-detail-row">
                  <span className="overview-detail-key">Build budget</span>
                  <span className="overview-detail-val">{buildBudget}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {hasStyles && (
        <section className="card">
          <div className="card-body">
            <div className="section-label">Design styles</div>
            <div className="planning-style-grid" style={{ marginTop: 10 }}>
              {build.planningStyles.map((style) => (
                <span key={style} className="planning-style-chip planning-style-chip-active">{style}</span>
              ))}
            </div>
          </div>
        </section>
      )}

      {hasSuburbs && (
        <section className="card">
          <div className="card-body">
            <div className="section-label">Suburb shortlist</div>
            <div className="planning-wishlist-list">
              {build.planningSuburbs.map((suburb) => (
                <div key={suburb.id} className="planning-wishlist-item">
                  <div className="planning-wishlist-item-name">{suburb.suburb_name}</div>
                  {suburb.notes && <div className="planning-wishlist-item-notes">{suburb.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {hasBuilders && (
        <section className="card">
          <div className="card-body">
            <div className="section-label">Builder shortlist</div>
            <div className="planning-wishlist-list">
              {build.planningBuilders.map((builder) => (
                <div key={builder.id} className="planning-wishlist-item">
                  <div className="planning-wishlist-item-name">{builder.builder_name}</div>
                  {builder.website && (
                    <a href={builder.website} target="_blank" rel="noopener noreferrer" className="planning-wishlist-item-link">
                      <IconExternalLink size={11} /> {builder.website}
                    </a>
                  )}
                  {builder.notes && <div className="planning-wishlist-item-notes">{builder.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!hasDetails && !hasBudget && !hasStyles && !hasSuburbs && !hasBuilders && (
        <div className="empty-state">
          <h3 className="empty-state-title">Nothing shared yet</h3>
          <p className="empty-state-sub">The owner hasn&apos;t filled in their planning details yet.</p>
        </div>
      )}
    </div>
  )
}

function WishlistTab({ build }: { build: PublicBuildDetail }) {
  const hasSuburbs = build.planningSuburbs.length > 0
  const hasBuilders = build.planningBuilders.length > 0

  if (!hasSuburbs && !hasBuilders) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">Nothing shared yet</h3>
        <p className="empty-state-sub">The owner hasn&apos;t added any suburbs or builders to their wishlist yet.</p>
      </div>
    )
  }

  return (
    <div className="planning-public-wishlist">
      {hasSuburbs && (
        <section className="card">
          <div className="card-body">
            <div className="section-label">Suburb wishlist</div>
            <div className="planning-wishlist-list">
              {build.planningSuburbs.map((suburb) => (
                <div key={suburb.id} className="planning-wishlist-item">
                  <div className="planning-wishlist-item-name">{suburb.suburb_name}</div>
                  {suburb.notes && <div className="planning-wishlist-item-notes">{suburb.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {hasBuilders && (
        <section className="card">
          <div className="card-body">
            <div className="section-label">Builder shortlist</div>
            <div className="planning-wishlist-list">
              {build.planningBuilders.map((builder) => (
                <div key={builder.id} className="planning-wishlist-item">
                  <div className="planning-wishlist-item-name">{builder.builder_name}</div>
                  {builder.website && (
                    <a href={builder.website} target="_blank" rel="noopener noreferrer" className="planning-wishlist-item-link">
                      <IconExternalLink size={11} /> {builder.website}
                    </a>
                  )}
                  {builder.notes && <div className="planning-wishlist-item-notes">{builder.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function PlanningBuildsTab({ build }: { build: PublicBuildDetail }) {
  const saves = build.planningPublicSavedBuilds

  if (!saves.length) {
    return (
      <div className="empty-state">
        <IconBookmark size={32} />
        <h3 className="empty-state-title">No saved builds yet</h3>
        <p className="empty-state-sub">When the owner bookmarks builds that inspire their planning, they&apos;ll appear here.</p>
      </div>
    )
  }

  return (
    <div className="planning-public-wishlist">
      {saves.map((save) => (
        <div key={save.id} className="planning-list-item">
          <div>
            <div className="planning-list-title">{save.buildTitle}</div>
            <div className="planning-list-notes">
              {[save.buildSuburb, save.buildStyle].filter(Boolean).join(' · ')}
            </div>
          </div>
          <a href={`/${save.ownerUsername}/${save.buildSlug}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            View <IconExternalLink size={11} />
          </a>
        </div>
      ))}
    </div>
  )
}

function PlanningHistoryTab({ build }: { build: PublicBuildDetail }) {
  const hasStyles = build.planningStyles.length > 0
  const hasSuburbs = build.planningSuburbs.length > 0
  const hasBuilders = build.planningBuilders.length > 0

  return (
    <div className="planning-public-wishlist">
      {hasStyles && (
        <section className="card">
          <div className="card-body">
            <div className="section-label">Design styles they planned for</div>
            <div className="planning-style-grid" style={{ marginTop: 10 }}>
              {build.planningStyles.map((style) => (
                <span key={style} className="planning-style-chip planning-style-chip-active">{style}</span>
              ))}
            </div>
          </div>
        </section>
      )}
      {hasSuburbs && (
        <section className="card">
          <div className="card-body">
            <div className="section-label">Suburbs they considered</div>
            <div className="planning-wishlist-list">
              {build.planningSuburbs.map((suburb) => (
                <div key={suburb.id} className="planning-wishlist-item">
                  <div className="planning-wishlist-item-name">{suburb.suburb_name}</div>
                  {suburb.notes && <div className="planning-wishlist-item-notes">{suburb.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      {hasBuilders && (
        <section className="card">
          <div className="card-body">
            <div className="section-label">Builders they considered</div>
            <div className="planning-wishlist-list">
              {build.planningBuilders.map((builder) => (
                <div key={builder.id} className="planning-wishlist-item">
                  <div className="planning-wishlist-item-name">{builder.builder_name}</div>
                  {builder.website && (
                    <a href={builder.website} target="_blank" rel="noopener noreferrer" className="planning-wishlist-item-link">
                      <IconExternalLink size={11} /> {builder.website}
                    </a>
                  )}
                  {builder.notes && <div className="planning-wishlist-item-notes">{builder.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function PlanningStylesCard({ build }: { build: PublicBuildDetail }) {
  if (!build.planningStyles.length) return null
  return (
    <section className="card">
      <div className="card-body">
        <div className="section-label">Design styles</div>
        <div className="planning-style-grid" style={{ marginTop: 10 }}>
          {build.planningStyles.map((style) => (
            <span key={style} className="planning-style-chip planning-style-chip-active">{style}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

function PlanningWishlistCard({ build }: { build: PublicBuildDetail }) {
  if (!build.planningSuburbs.length && !build.planningBuilders.length) return null
  return (
    <section className="card">
      <div className="card-body">
        <div className="section-label">Planning wishlist</div>
        {build.planningSuburbs.length > 0 && (
          <div className="sidebar-planning-group">
            <div className="sidebar-planning-label">Suburbs</div>
            {build.planningSuburbs.map((suburb) => (
              <div key={suburb.id} className="sidebar-planning-item">{suburb.suburb_name}</div>
            ))}
          </div>
        )}
        {build.planningBuilders.length > 0 && (
          <div className="sidebar-planning-group">
            <div className="sidebar-planning-label">Builders</div>
            {build.planningBuilders.map((builder) => (
              <div key={builder.id} className="sidebar-planning-item">{builder.builder_name}</div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

type BuildQAItem = {
  id: string
  askerId: string
  askerUsername: string
  askerDisplayName: string | null
  question: string
  answer: string | null
  answeredAt: string | null
  createdAt: string
}

function BuildQASection({
  buildId,
  currentUserId,
  isOwner,
}: {
  buildId: string
  currentUserId: string | null
  isOwner: boolean
}) {
  const [items, setItems] = useState<BuildQAItem[] | null>(null)
  const [loadingQA, setLoadingQA] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({})
  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [savingAnswer, setSavingAnswer] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/builds/${buildId}/qa`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) { setItems(data.items ?? []); setLoadingQA(false) } })
      .catch(() => { if (!cancelled) { setItems([]); setLoadingQA(false) } })
    return () => { cancelled = true }
  }, [buildId])

  const closeModal = () => { setModalOpen(false); setQuestionText(''); setSubmitError('') }

  const handleAsk = async () => {
    if (!questionText.trim() || submitting) return
    setSubmitting(true)
    setSubmitError('')
    const res = await fetch(`/api/builds/${buildId}/qa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: questionText.trim() }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setSubmitError(data.error ?? 'Failed to submit.'); return }
    setItems((prev) => [data.item, ...(prev ?? [])])
    closeModal()
  }

  const handleAnswer = async (qaId: string) => {
    const text = (answerDraft[qaId] ?? '').trim()
    if (!text || savingAnswer) return
    setSavingAnswer(true)
    const res = await fetch(`/api/builds/${buildId}/qa/${qaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: text }),
    })
    const data = await res.json()
    setSavingAnswer(false)
    if (res.ok) {
      setItems((prev) => (prev ?? []).map((i) => i.id === qaId ? { ...i, answer: text, answeredAt: data.answeredAt } : i))
      setAnsweringId(null)
    }
  }

  const handleDelete = async (qaId: string) => {
    await fetch(`/api/builds/${buildId}/qa/${qaId}`, { method: 'DELETE' })
    setItems((prev) => (prev ?? []).filter((i) => i.id !== qaId))
  }

  return (
    <div className="build-qa-section">
      <div className="build-qa-header">
        <h3 className="build-qa-section-title">Questions & Answers</h3>
        {!isOwner && (
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
            Ask a question
          </button>
        )}
      </div>

      {loadingQA ? (
        <p className="build-qa-loading">Loading…</p>
      ) : items && items.length > 0 ? (
        <div className="build-qa-list">
          {items.map((item) => (
            <div key={item.id} className="build-qa-item">
              <div className="build-qa-question-row">
                <div className="build-qa-q-mark">Q</div>
                <div className="build-qa-question-body">
                  <div className="build-qa-question-meta">
                    <span className="build-qa-asker">
                      {item.askerDisplayName ?? item.askerUsername}
                      <span className="build-qa-asker-handle"> @{item.askerUsername}</span>
                    </span>
                    <span className="build-qa-time">{formatRelativeTime(item.createdAt)}</span>
                    {(currentUserId === item.askerId || isOwner) && (
                      <button className="build-qa-delete-btn" onClick={() => handleDelete(item.id)} title="Delete">
                        <IconTrash size={12} />
                      </button>
                    )}
                  </div>
                  <p className="build-qa-question-text">{item.question}</p>
                </div>
              </div>

              {item.answer ? (
                <div className="build-qa-answer-row">
                  <div className="build-qa-a-mark">A</div>
                  <p className="build-qa-answer-text">{item.answer}</p>
                </div>
              ) : isOwner ? (
                answeringId === item.id ? (
                  <div className="build-qa-answer-form">
                    <textarea
                      className="form-textarea"
                      placeholder="Your answer…"
                      value={answerDraft[item.id] ?? ''}
                      onChange={(e) => setAnswerDraft((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      rows={2}
                      autoFocus
                    />
                    <div className="build-qa-form-footer">
                      <button className="btn btn-secondary btn-sm" onClick={() => setAnsweringId(null)}>Cancel</button>
                      <LoadingButton
                        className="btn btn-primary btn-sm"
                        loading={savingAnswer}
                        disabled={!(answerDraft[item.id] ?? '').trim()}
                        onClick={() => handleAnswer(item.id)}
                      >
                        Post answer
                      </LoadingButton>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-secondary btn-sm build-qa-answer-btn"
                    onClick={() => setAnsweringId(item.id)}
                  >
                    Answer this question
                  </button>
                )
              ) : (
                <p className="build-qa-unanswered">Awaiting owner's response</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state empty-state-compact">
          <h3 className="empty-state-title">No questions yet</h3>
          <p className="empty-state-sub">
            {isOwner
              ? 'Questions from visitors will appear here for you to answer.'
              : 'Be the first to ask the build owner a question.'}
          </p>
          {!isOwner && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => setModalOpen(true)}>
              Ask a question
            </button>
          )}
        </div>
      )}

      {/* Ask a question modal */}
      {modalOpen && (
        <div className="bb-modal" role="dialog" aria-modal="true" aria-labelledby="qa-modal-title">
          <button className="bb-modal-backdrop" type="button" aria-label="Close" onClick={closeModal} />
          <div className="bb-modal-panel">
            <div className="bb-modal-header">
              <div>
                <h2 id="qa-modal-title" className="bb-modal-title">Ask a question</h2>
                <p className="bb-modal-subtitle">The build owner will be notified and can reply here.</p>
              </div>
              <button className="btn-icon" type="button" aria-label="Close" onClick={closeModal}>
                <IconX size={16} />
              </button>
            </div>
            <div className="bb-modal-body">
              {currentUserId ? (
                <>
                  <textarea
                    className="form-textarea"
                    placeholder="What would you like to know about this build?"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    rows={4}
                    autoFocus
                    maxLength={500}
                  />
                  <p className="form-hint" style={{ textAlign: 'right' }}>{questionText.length}/500</p>
                  {submitError && <p className="build-qa-error">{submitError}</p>}
                </>
              ) : (
                <div className="empty-state empty-state-compact">
                  <p className="empty-state-sub">You need to be signed in to ask a question.</p>
                  <Link href="/get-started" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
                    Sign in
                  </Link>
                </div>
              )}
            </div>
            {currentUserId && (
              <div className="bb-modal-footer">
                <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <LoadingButton
                  className="btn btn-primary"
                  loading={submitting}
                  disabled={questionText.trim().length < 5}
                  onClick={handleAsk}
                >
                  <IconSend size={14} /> Submit question
                </LoadingButton>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CommunityDiscussionTab({
  buildId,
}: {
  buildId: string
}) {
  const router = useRouter()
  const [posts, setPosts] = useState<CommunityPost[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/community/posts?buildId=${buildId}&limit=20`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) { setPosts(data.posts ?? []); setLoading(false) } })
      .catch(() => { if (!cancelled) { setPosts([]); setLoading(false) } })
    return () => { cancelled = true }
  }, [buildId])

  return (
    <section className="discussion-panel">
      <div className="build-community-discussion-header">
        <h2 className="build-community-discussion-title">Community Discussions</h2>
        <p className="build-community-discussion-sub">Posts linked to this build by the owner</p>
      </div>

      {loading ? (
        <div className="empty-state empty-state-compact">
          <p className="empty-state-sub">Loading…</p>
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="build-community-posts">
          {posts.map((post) => (
            <div
              key={post.id}
              className="build-community-post-card"
              onClick={() => router.push(`/community/${post.id}`)}
              role="article"
            >
              {post.tags.length > 0 && (
                <div className="community-post-tags">
                  {post.tags.map((tag) => <span key={tag} className="community-tag">{tag}</span>)}
                </div>
              )}
              <h3 className="build-community-post-title">{post.title}</h3>
              {post.body && (
                <p className="build-community-post-preview">
                  {post.body.length > 120 ? post.body.slice(0, 120) + '…' : post.body}
                </p>
              )}
              <div className="build-community-post-meta">
                <span className="community-post-stat">
                  <IconMessageCircle size={13} />
                  {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
                </span>
                {post.acceptedCommentId && (
                  <span className="community-answered-badge"><IconCheck size={11} /> Answered</span>
                )}
                <span className="build-community-post-link">
                  View in community <IconExternalLink size={12} />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state empty-state-compact">
          <h3 className="empty-state-title">No community posts yet</h3>
          <p className="empty-state-sub">No community discussions have been linked to this build yet.</p>
        </div>
      )}

    </section>
  )
}

function BuildSpecsCard({ build }: { build: PublicBuildDetail }) {
  const metrics = [
    { label: 'beds', value: build.specs.bedrooms, icon: IconBed },
    { label: 'baths', value: build.specs.bathrooms, icon: IconBath },
    { label: 'toilets', value: build.specs.separateToilets, icon: IconToiletPaper },
    { label: 'garage', value: build.specs.garageSpaces, icon: IconCarGarage },
  ]
  const rows = specRows(build)

  return (
    <section className="card">
      <div className="card-body">
        <div className="section-label">Build specs</div>

        <div className="spec-summary-grid">
          {metrics.map((item) => {
            const Icon = item.icon
            return (
              <div className="spec-summary" key={item.label}>
                <Icon size={17} />
                <div className="spec-summary-value">{formatCount(item.value)}</div>
                <div className="spec-summary-label">{item.label}</div>
              </div>
            )
          })}
        </div>

        {rows.length > 0 ? rows.map((row) => (
          <div key={row.key} className="spec-row">
            <span className="spec-key">{row.key}</span>
            <span className="spec-val">{row.val}</span>
          </div>
        )) : (
          <p className="empty-state-sub">No detailed specs shared yet.</p>
        )}
      </div>
    </section>
  )
}

function specRows(build: PublicBuildDetail) {
  return [
    { key: 'Land size', val: formatArea(build.specs.landSizeM2) },
    { key: 'Home size', val: formatArea(build.specs.internalSizeM2) },
    { key: 'Alfresco', val: formatArea(build.specs.alfrescoSizeM2) },
    { key: 'Width', val: formatMetres(build.specs.homeWidthM) },
    { key: 'Depth', val: formatMetres(build.specs.homeDepthM) },
    { key: 'Build type', val: build.specs.buildType },
    { key: 'Construction', val: build.specs.constructionType },
    { key: 'Roof', val: build.specs.roofStructure },
    { key: 'Style', val: build.specs.homeDesignStyle },
  ].filter((row): row is { key: string; val: string } => Boolean(row.val))
}

function formatCount(value: number | null) {
  return value ?? '—'
}

function formatArea(value: number | null) {
  if (value == null) return null
  return `${new Intl.NumberFormat('en-AU').format(value)} m²`
}

function formatMetres(value: number | null) {
  if (value == null) return null
  return `${value.toFixed(1)} m`
}

function titleCase(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value
}

function normalizeRoomType(value: string | null | undefined) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')

  const aliases: Record<string, string> = {
    bedrooms: 'bedroom',
    bathrooms: 'bathroom',
    'living room': 'living',
  }

  return aliases[normalized] ?? normalized
}

function formatRoomType(value: string) {
  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(titleCase)
    .join(' ')
}

function formatRelativeTime(value: string | null) {
  if (!value) return ''
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return ''
  const diff = Date.now() - timestamp
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`
  return `${Math.floor(diff / 86_400_000)} days ago`
}

function normalizeOverlayComments(items: PublicComment[]): CommentItem[] {
  return items.map((item) => ({
    id: item.id,
    userId: item.userId,
    username: item.username,
    content: item.content,
    createdAt: item.createdAt,
    parentCommentId: item.parentCommentId ?? null,
    imageUrl: item.imageUrl ?? null,
  }))
}

function parseTimelineDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function dayDiff(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000))
}

function completedPhaseDays(milestone: PublicBuildDetail['milestones'][number]) {
  const start = parseTimelineDate(milestone.startDate)
  const end = parseTimelineDate(milestone.endDate)
  if (!start || !end) return 0
  return dayDiff(start, end)
}

function displayPhaseDays(milestone: PublicBuildDetail['milestones'][number]) {
  const start = parseTimelineDate(milestone.startDate)
  if (!start) return 0
  const end = parseTimelineDate(milestone.endDate) ?? new Date()
  return dayDiff(start, end)
}

function calcTotalBuildDays(milestones: PublicBuildDetail['milestones']) {
  const starts = milestones.map((milestone) => parseTimelineDate(milestone.startDate)).filter((date): date is Date => Boolean(date))
  const ends = milestones.map((milestone) => parseTimelineDate(milestone.endDate)).filter((date): date is Date => Boolean(date))
  if (!starts.length || !ends.length) return 0
  const earliestStart = starts.reduce((earliest, date) => date < earliest ? date : earliest, starts[0])
  const latestEnd = ends.reduce((latest, date) => date > latest ? date : latest, ends[0])
  return dayDiff(earliestStart, latestEnd)
}

function calcGap(
  previous: PublicBuildDetail['milestones'][number],
  current: PublicBuildDetail['milestones'][number],
): TimelineGapInfo | null {
  if (!previous.endDate || !current.startDate) return null

  const days = Math.round((new Date(current.startDate).getTime() - new Date(previous.endDate).getTime()) / 86_400_000)
  if (Math.abs(days) < 1) return null

  const duration = formatDuration(Math.abs(days))
  // Gap time between phases is a key data point for build watchers.
  // A builder with consistent 0-gap handoffs between stages signals
  // good project management. Long gaps often indicate council delays,
  // supplier issues, or builder scheduling problems - information
  // that isn't captured anywhere else publicly.
  return {
    days: Math.abs(days),
    isOverlap: days < 0,
    label: days < 0 ? `Phases overlapped by ${duration}` : `${duration} between phases`,
    title: `From: ${previous.title} end (${formatTimelineDate(previous.endDate) ?? 'date not shared'})\nTo: ${current.title} start (${formatTimelineDate(current.startDate) ?? 'date not shared'})`,
  }
}

function formatDuration(days: number) {
  if (days < 1) return 'Less than a day'
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`
  const months = Math.round(days / 30)
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`
  const years = Math.floor(days / 365)
  const remainingMonths = Math.round((days % 365) / 30)
  if (remainingMonths === 0) return `${years} year${years !== 1 ? 's' : ''}`
  return `${years} yr ${remainingMonths} mo`
}

function formatTimelineDate(value: string | null) {
  const date = parseTimelineDate(value)
  if (!date) return null
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTimelineDateRange(milestone: PublicBuildDetail['milestones'][number]) {
  const start = formatTimelineDate(milestone.startDate)
  const end = formatTimelineDate(milestone.endDate)
  if (start && end) return `${start} to ${end}`
  if (start) return `${start} to present`
  if (end) return `Ended ${end}`
  return 'Dates not shared yet'
}

const ALL_TABS: Tab[] = ['Overview', 'Updates', 'Discussion', 'Timeline', 'Images', 'Inspiration', 'Selections', 'Standard', 'Wishlist', 'Saved Builds', 'Our Planning']

type BuildProfileClientProps = {
  build: PublicBuildDetail
  username: string
  viewerPlanningBuilds?: ViewerPlanningBuild[]
  initialTab?: string
  returnTo?: string | null
}

export function BuildProfileClient({ build, username, viewerPlanningBuilds = [], initialTab, returnTo = null }: BuildProfileClientProps) {
  const router = useRouter()
  const isPlanning = build.stage === 'planning'
  const resolvedInitialTab: Tab = ALL_TABS.includes(initialTab as Tab)
    ? (initialTab as Tab)
    : isPlanning ? 'Overview' : 'Updates'
  const [activeTab, setActiveTab] = useState<Tab>(resolvedInitialTab)

  // On mobile (≤767px) with no explicit ?tab= param, non-planning builds show Overview
  useEffect(() => {
    if (!initialTab && !isPlanning && typeof window !== 'undefined' && window.innerWidth <= 767) {
      setActiveTab('Overview')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [following, setFollowing] = useState(build.isFollowing)
  const [followerCount, setFollowerCount] = useState(build.followers)
  const [comment, setComment] = useState('')
  const [buildComments, setBuildComments] = useState(build.buildComments)
  const [commentCount, setCommentCount] = useState(build.comments)
  const [commentError, setCommentError] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [followError, setFollowError] = useState('')
  const [followBusy, setFollowBusy] = useState(false)
  const [selectedUpdate, setSelectedUpdate] = useState<{ update: Update; imageIndex: number } | null>(null)
  const [saveStates, setSaveStates] = useState<Map<string, { saved: boolean; savedId: string | null }>>(
    () => new Map(viewerPlanningBuilds.map((p) => [p.id, { saved: p.alreadySaved, savedId: p.savedId }])),
  )
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null)
  const [saveToPlanOpen, setSaveToPlanOpen] = useState(false)
  const [floorPlanOpen, setFloorPlanOpen] = useState(false)
  const [saveError, setSaveError] = useState('')
  const isOwner = build.currentUserId === build.ownerId
  const hasPlanningHistory = !isPlanning && (
    build.planningStyles.length > 0 ||
    build.planningSuburbs.length > 0 ||
    build.planningBuilders.length > 0
  )
  const visibleTabs: Tab[] = isPlanning
    ? PLANNING_TABS
    : hasPlanningHistory
      ? [...BASE_BUILD_TABS, 'Our Planning']
      : BASE_BUILD_TABS

  const activeMilestone = build.milestones.find((milestone) => milestone.status === 'active')
  const updates: Update[] = build.updates.map((update) => ({
    id: update.id,
    milestone: update.milestone,
    caption: update.content,
    imageCount: update.imageCount,
    likes: update.likeCount,
    commentCount: update.commentCount,
    timeAgo: formatRelativeTime(update.createdAt),
    imageUrl: update.imageUrl,
    imageUrls: update.imageUrls,
    imageIds: update.imageIds,
    imageId: update.imageId,
    comments: [],
  }))
  const stats = isPlanning
    ? [
        { value: followerCount as number | string | null, label: 'followers' as string | null },
        { value: build.planningStyles.length > 0 ? build.planningStyles.length : null, label: 'styles' },
        { value: commentCount as number | string | null, label: 'comments' as string | null },
      ].filter((stat) => stat.value !== null && stat.label !== null)
    : [
        { value: followerCount as number | string | null, label: 'followers' as string | null },
        { value: build.updateCount, label: 'updates' },
        { value: commentCount as number | string | null, label: 'comments' as string | null },
        { value: build.week ? `Week ${build.week}` : null, label: build.week ? 'of build' : null },
      ].filter((stat) => stat.value !== null && stat.label !== null)

  const postBuildComment = async () => {
    if (!comment.trim() || postingComment) return
    setPostingComment(true)
    setCommentError('')

    const formData = new FormData()
    formData.set('build_id', build.id)
    formData.set('content', comment.trim())

    const response = await fetch('/api/build-comments', {
      method: 'POST',
      body: formData,
    })
    const payload = await response.json().catch(() => null)
    setPostingComment(false)

    if (!response.ok) {
      setCommentError(response.status === 401 ? 'Sign in to comment.' : payload?.error ?? 'Unable to post comment.')
      return
    }

    setBuildComments((current) => [
      ...current,
      {
        id: payload.comment.id,
        userId: payload.comment.userId,
        username: payload.comment.username,
        content: payload.comment.content,
        createdAt: payload.comment.createdAt,
        parentCommentId: payload.comment.parentCommentId,
        imageUrl: payload.comment.imageUrl,
      },
    ])
    setCommentCount((current) => current + 1)
    setComment('')
  }

  const postBuildReplyComment = async (parentCommentId: string, content: string) => {
    const formData = new FormData()
    formData.set('build_id', build.id)
    formData.set('content', content)
    formData.set('parent_comment_id', parentCommentId)

    const response = await fetch('/api/build-comments', {
      method: 'POST',
      body: formData,
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return response.status === 401 ? 'Sign in to reply.' : payload?.error ?? 'Unable to post reply.'
    }

    setBuildComments((current) => [
      ...current,
      {
        id: payload.comment.id,
        userId: payload.comment.userId,
        username: payload.comment.username,
        content: payload.comment.content,
        createdAt: payload.comment.createdAt,
        parentCommentId: payload.comment.parentCommentId,
        imageUrl: payload.comment.imageUrl,
        time: 'Just now',
      },
    ])
    setCommentCount((current) => current + 1)
    return null
  }

  const toggleFollow = async () => {
    if (followBusy) return
    setFollowBusy(true)
    setFollowError('')
    const formData = new FormData()
    formData.set('build_id', build.id)

    const response = await fetch('/api/build-follows/toggle', {
      method: 'POST',
      body: formData,
    })
    const payload = await response.json().catch(() => null)
    setFollowBusy(false)

    if (!response.ok) {
      setFollowError(response.status === 401 ? 'Sign in to follow this build.' : payload?.error ?? 'Unable to update follow.')
      return
    }

    setFollowing(Boolean(payload.following))
    setFollowerCount(typeof payload.followerCount === 'number' ? payload.followerCount : followerCount)
  }

  const toggleSave = async (planningBuildId: string) => {
    if (savingPlanId) return
    setSavingPlanId(planningBuildId)
    setSaveError('')
    const current = saveStates.get(planningBuildId)
    if (current?.saved && current.savedId) {
      const res = await fetch(`/api/planning-saved-builds?planningBuildId=${planningBuildId}&savedBuildId=${build.id}`, { method: 'DELETE' })
      if (res.ok) {
        setSaveStates((prev) => new Map(prev).set(planningBuildId, { saved: false, savedId: null }))
      } else {
        setSaveError('Unable to remove saved build.')
      }
    } else {
      const res = await fetch('/api/planning-saved-builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planning_build_id: planningBuildId, saved_build_id: build.id }),
      })
      const payload = await res.json().catch(() => null)
      if (res.ok) {
        setSaveStates((prev) => new Map(prev).set(planningBuildId, { saved: true, savedId: payload?.save?.id ?? null }))
      } else {
        setSaveError(payload?.error ?? 'Unable to save build.')
      }
    }
    setSavingPlanId(null)
    setSaveToPlanOpen(false)
  }

  const handleSaveToPlan = () => {
    if (viewerPlanningBuilds.length === 1) {
      void toggleSave(viewerPlanningBuilds[0].id)
    } else {
      setSaveToPlanOpen(true)
    }
  }

  const shareBuild = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: build.title, url }).catch(() => undefined)
      return
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined)
  }

  const goBack = () => {
    if (window.history.length > 1) {
      router.back()
      return
    }
    router.push(`/${username}`)
  }

  return (
    <div className="page-shell">
      <Nav />

      <div className="back-bar">
        <div className="page-container">
          {returnTo ? (
            <Link href={returnTo} className="back-link">
              <IconArrowLeft size={13} /> Back to community post
            </Link>
          ) : (
            <button type="button" className="back-link" onClick={goBack}>
              <IconArrowLeft size={13} /> Back
            </button>
          )}
        </div>
      </div>

      <header className="build-profile-hero">
        {build.imageUrl ? (
          // Signed Supabase URLs are rendered directly until remote image patterns are finalized.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={build.imageUrl} alt={`${build.title} build`} />
        ) : (
          <Image src="/images/comingsoon.jpg" alt="" fill priority sizes="100vw" />
        )}
        <div className="build-profile-hero-overlay">
          <div className="build-profile-hero-content">
            {build.stage ? (
              <span className={`badge ${build.stage === 'planning' ? 'badge-planning' : `badge-stage-${build.stage}`}`}>
                {STAGE_LABELS[build.stage] ?? build.stage}
              </span>
            ) : null}
            <h1 className="build-profile-title">{build.title}</h1>
            <div className="hero-meta-row">
              <span>
                by <Link href={`/${username}`}>@{username}</Link>
              </span>
              {!isPlanning ? (
                <>
                  <span><strong>{build.builder || 'Builder TBA'}</strong></span>
                  <span><strong>{build.suburb || 'Suburb TBA'}</strong></span>
                </>
              ) : null}
            </div>
            {build.description ? (
              <p className="build-profile-hero-description">{build.description}</p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="build-profile-bar">
        <div className="page-container build-profile-bar-inner">
          <div className="profile-stats">
            {stats.map((stat, index) => (
              <span className="profile-stat-group" key={stat.label}>
                {index > 0 ? <span className="profile-stat-divider" /> : null}
                <span className="profile-stat">
                  <span className="profile-stat-value">{stat.value}</span>
                  <span className="profile-stat-label">{stat.label}</span>
                </span>
              </span>
            ))}
          </div>

          <div className="build-profile-actions">
            <button className="btn-icon" aria-label="Share" onClick={shareBuild}>
              <IconShare size={15} />
            </button>
            {build.floorPlans.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setFloorPlanOpen(true)}>
                <IconFileText size={13} /> Floor plan
              </button>
            )}
            {isOwner ? (
              <Link href={`/dashboard/builds/${build.id}`} className="btn btn-secondary btn-sm">
                <IconEdit size={13} /> Edit Build
              </Link>
            ) : (
              <>
                <LoadingButton className={`btn btn-sm ${following ? 'btn-secondary' : 'btn-accent'}`} loading={followBusy} onClick={toggleFollow}>
                  {following ? 'Following' : 'Follow'}
                </LoadingButton>
                {viewerPlanningBuilds.length > 0 && (() => {
                  const singlePlan = viewerPlanningBuilds.length === 1 ? viewerPlanningBuilds[0] : null
                  const isSaved = singlePlan ? (saveStates.get(singlePlan.id)?.saved ?? false) : viewerPlanningBuilds.some((p) => saveStates.get(p.id)?.saved)
                  return (
                    <LoadingButton
                      className={`btn btn-sm ${isSaved ? 'btn-secondary' : 'btn-ghost'}`}
                      loading={savingPlanId !== null}
                      onClick={handleSaveToPlan}
                      title={isSaved ? 'Saved to your plan' : 'Save to your plan'}
                    >
                      <IconBookmark size={13} fill={isSaved ? 'currentColor' : 'none'} />
                      {isSaved ? 'Saved' : 'Save to Plan'}
                    </LoadingButton>
                  )
                })()}
              </>
            )}
          </div>
          {followError ? <div className="alert alert-error">{followError}</div> : null}
          {saveError ? <div className="alert alert-error">{saveError}</div> : null}
        </div>
      </div>

      <div className="tab-bar">
        <div className="page-container">
          <div className="tab-list">
            {visibleTabs.map((tab) => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'tab-active' : ''}${!isPlanning && tab === 'Overview' ? ' tab-mobile-only' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="page-container content-section">
        <div className="build-layout" data-tab={activeTab}>
          <div>
            {activeTab === 'Overview' && isPlanning && <OverviewTab build={build} />}
            {activeTab === 'Updates' && (
              <UpdatesTab updates={updates} onOpen={(update) => setSelectedUpdate({ update, imageIndex: 0 })} />
            )}

            {activeTab === 'Discussion' && (
              <CommunityDiscussionTab buildId={build.id} />
            )}

            {activeTab === 'Q&A' && (
              <section className="discussion-panel">
                <BuildQASection
                  buildId={build.id}
                  currentUserId={build.currentUserId}
                  isOwner={isOwner}
                />
              </section>
            )}

            {activeTab === 'Timeline' && (
              <TimelineTab build={build} updates={updates} currentUserId={build.currentUserId} onOpenUpdate={(update, imageIndex = 0) => setSelectedUpdate({ update, imageIndex })} />
            )}
            {activeTab === 'Images' && <ImagesTab build={build} />}
            {activeTab === 'Inspiration' && <InspirationTab build={build} />}
            {activeTab === 'Selections' && <SelectionsTab build={build} />}
            {activeTab === 'Standard' && <StandardTab build={build} />}
            {activeTab === 'Wishlist' && <WishlistTab build={build} />}
            {activeTab === 'Saved Builds' && <PlanningBuildsTab build={build} />}
            {activeTab === 'Our Planning' && <PlanningHistoryTab build={build} />}
            {selectedUpdate ? <UpdateOverlay update={selectedUpdate.update} currentUserId={build.currentUserId} initialImageIndex={selectedUpdate.imageIndex} onClose={() => setSelectedUpdate(null)} isOwner={isOwner} buildId={build.id} /> : null}
            {floorPlanOpen && build.floorPlans.length > 0 ? <FloorPlanModal plans={build.floorPlans} currentUserId={build.currentUserId} onClose={() => setFloorPlanOpen(false)} /> : null}
            {saveToPlanOpen && viewerPlanningBuilds.length > 1 ? (
              <div className="bb-modal" role="dialog" aria-modal="true" aria-labelledby="save-plan-title">
                <button className="bb-modal-backdrop" type="button" aria-label="Close" onClick={() => setSaveToPlanOpen(false)} />
                <section className="bb-modal-panel">
                  <div className="bb-modal-header">
                    <div>
                      <h2 id="save-plan-title" className="dashboard-title">Save to which plan?</h2>
                      <p className="dashboard-subtitle">Choose a planning build to save this build to.</p>
                    </div>
                    <button className="btn-icon" type="button" aria-label="Close" onClick={() => setSaveToPlanOpen(false)}><IconX size={16} /></button>
                  </div>
                  <div className="bb-modal-body save-plan-picker">
                    {viewerPlanningBuilds.map((plan) => {
                      const state = saveStates.get(plan.id)
                      const isSaved = state?.saved ?? false
                      return (
                        <LoadingButton
                          key={plan.id}
                          className={`save-plan-option ${isSaved ? 'save-plan-option-saved' : ''}`}
                          loading={savingPlanId === plan.id}
                          onClick={() => toggleSave(plan.id)}
                        >
                          <IconBookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
                          <span className="save-plan-option-title">{plan.title}</span>
                          {isSaved && <IconCheck size={14} />}
                        </LoadingButton>
                      )
                    })}
                  </div>
                </section>
              </div>
            ) : null}
          </div>

          <aside className="build-sidebar">
            {isPlanning ? (
              <>
                <PlanningStylesCard build={build} />
                <PlanningWishlistCard build={build} />
                {!build.planningStyles.length && !build.planningSuburbs.length && !build.planningBuilders.length && (
                  <section className="card">
                    <div className="card-body">
                      <p className="empty-state-sub">The owner hasn&apos;t shared their planning details yet.</p>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <>
                <BuildSpecsCard build={build} />

                <section className="card">
                  <div className="card-body">
                    <div className="section-label">Milestones</div>
                    {build.milestones.map((milestone) => (
                      <div className="milestone-row" key={milestone.id}>
                        <span
                          className={`milestone-dot milestone-dot-${
                            milestone.status === 'complete' ? 'done' : milestone.status === 'active' ? 'active' : 'pending'
                          }`}
                        />
                        <span
                          className={`milestone-name ${
                            milestone.status === 'active'
                              ? 'milestone-name-active'
                              : milestone.status === 'pending'
                                ? 'milestone-name-pending'
                                : ''
                          }`}
                        >
                          {milestone.title}
                        </span>
                        {milestone.updates > 0 && <span className="milestone-count">{milestone.updates}</span>}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="card">
                  <div className="card-body">
                    <div className="section-label">Builder</div>
                    <div className="sidebar-link-row">
                      <div>
                        <div className="sidebar-link-title">{build.builder || 'Builder TBA'}</div>
                        <div className="sidebar-link-subtitle">View all builds</div>
                      </div>
                      {build.builderSlug ? (
                        <Link href={`/builders/${build.builderSlug}`} className="muted-row">
                          <IconChevronRight size={16} />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </section>
              </>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}
