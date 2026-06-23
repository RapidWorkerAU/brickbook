'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { IconArrowLeft, IconCheck, IconChevronUp, IconMessageCircle, IconSend, IconTrash, IconEdit, IconX, IconExternalLink, IconLink } from '@tabler/icons-react'
import { COMMUNITY_TAGS } from '@/lib/community-data'
import { LoadingButton } from '@/components/action-buttons'
import type { CommunityComment, CommunityPost } from '@/lib/community-data'

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

function PostImageGrid({ images, postId }: { images: CommunityPost['images']; postId: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (!images.length) return null
  const current = lightboxIndex !== null ? images[lightboxIndex] : null

  return (
    <>
      <div className={`community-post-images community-post-images-${Math.min(images.length, 4)}`}>
        {images.map((img, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={img.id}
            src={img.imageUrl}
            alt=""
            className="community-post-thumb community-post-thumb-click"
            onClick={() => setLightboxIndex(i)}
          />
        ))}
      </div>

      {current && (
        <div className="community-lightbox" role="dialog" aria-modal="true">
          <button className="update-modal-backdrop" onClick={() => setLightboxIndex(null)} aria-label="Close" />
          <div className="community-lightbox-panel">
            <button className="btn-icon community-lightbox-close" onClick={() => setLightboxIndex(null)}><IconX size={18} /></button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.imageUrl} alt="" className="community-lightbox-img" />
            {current.buildTitle && current.ownerUsername && current.buildSlug && (
              <div className="community-lightbox-attribution">
                <span className="community-lightbox-from">From <strong>{current.buildTitle}</strong></span>
                <Link
                  href={`/${current.ownerUsername}/${current.buildSlug}?returnTo=/community/${postId}`}
                  className="btn btn-secondary btn-sm"
                >
                  <IconExternalLink size={13} /> View build
                </Link>
              </div>
            )}
            {images.length > 1 && (
              <div className="community-lightbox-nav">
                <button className="btn btn-secondary btn-sm" onClick={() => setLightboxIndex((i) => ((i ?? 0) - 1 + images.length) % images.length)}>{'<'}</button>
                <span>{(lightboxIndex ?? 0) + 1} / {images.length}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setLightboxIndex((i) => ((i ?? 0) + 1) % images.length)}>{'>'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function CommentItem({
  comment,
  postUserId,
  currentUserId,
  acceptedCommentId,
  onUpvote,
  onDelete,
  onAccept,
  onReply,
  depth = 0,
}: {
  comment: CommunityComment
  postUserId: string
  currentUserId: string | null
  acceptedCommentId: string | null
  onUpvote: (id: string) => void
  onDelete: (id: string) => void
  onAccept: (id: string | null) => void
  onReply: (parentId: string, content: string) => Promise<void>
  depth?: number
}) {
  const [upvoteCount, setUpvoteCount] = useState(comment.upvoteCount)
  const [hasUpvoted, setHasUpvoted] = useState(comment.hasUpvoted)
  const [upvoting, setUpvoting] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [content, setContent] = useState(comment.content)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isOwn = currentUserId === comment.userId
  const isPostOwner = currentUserId === postUserId
  const isAccepted = comment.id === acceptedCommentId

  const handleUpvote = async () => {
    if (upvoting || isOwn || !currentUserId) return
    setUpvoting(true)
    const res = await fetch(`/api/community/comments/${comment.id}/upvote`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) { setUpvoteCount(data.upvoteCount); setHasUpvoted(data.hasUpvoted) }
    setUpvoting(false)
    onUpvote(comment.id)
  }

  const handleDelete = async () => {
    if (deleting) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    await fetch(`/api/community/comments/${comment.id}`, { method: 'DELETE' })
    onDelete(comment.id)
  }

  const handleSaveEdit = async () => {
    if (saving || !editContent.trim()) return
    setSaving(true)
    const res = await fetch(`/api/community/comments/${comment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent.trim() }),
    })
    if (res.ok) { setContent(editContent.trim()); setEditing(false) }
    setSaving(false)
  }

  const handleReply = async () => {
    if (!replyText.trim() || sendingReply) return
    setSendingReply(true)
    await onReply(comment.id, replyText.trim())
    setReplyText('')
    setReplyOpen(false)
    setSendingReply(false)
  }

  return (
    <div className={`community-comment${isAccepted ? ' community-comment-accepted' : ''}${depth > 0 ? ' community-comment-reply' : ''}`}>
      {isAccepted && (
        <div className="community-accepted-label"><IconCheck size={12} /> Accepted answer</div>
      )}

      <div className="community-comment-header">
        <Link href={`/${comment.username}`} className="community-comment-author">
          <span className="avatar avatar-sm avatar-amber">{(comment.displayName ?? comment.username).charAt(0).toUpperCase()}</span>
          <span className="community-comment-author-name">{comment.displayName ?? comment.username}</span>
          <span className="community-comment-author-handle">@{comment.username}</span>
        </Link>
        <span className="community-comment-time">{timeAgo(comment.createdAt)}</span>

        {(isOwn) && (
          <div className="community-comment-menu-wrap" ref={menuRef}>
            <button className="community-comment-menu-btn" onClick={() => setMenuOpen((v) => !v)}>···</button>
            {menuOpen && (
              <div className="community-comment-menu">
                <button onClick={() => { setEditing(true); setMenuOpen(false) }}><IconEdit size={13} /> Edit</button>
                <button
                  className={confirmDelete ? 'danger' : ''}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <IconTrash size={13} /> {confirmDelete ? 'Confirm delete' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="community-comment-edit">
          <textarea
            className="form-input community-comment-textarea"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
          />
          <div className="community-comment-edit-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(false); setEditContent(content) }}>Cancel</button>
            <LoadingButton className="btn btn-primary btn-sm" loading={saving} disabled={!editContent.trim()} onClick={handleSaveEdit}>Save</LoadingButton>
          </div>
        </div>
      ) : (
        <p className="community-comment-body">{content}</p>
      )}

      {comment.image && (
        <div className="community-comment-image-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={comment.image.imageUrl} alt="" className="community-comment-image" />
          {comment.image.buildTitle && comment.image.ownerUsername && comment.image.buildSlug && (
            <Link
              href={`/${comment.image.ownerUsername}/${comment.image.buildSlug}`}
              className="community-comment-image-link"
            >
              <IconExternalLink size={12} /> From {comment.image.buildTitle}
            </Link>
          )}
        </div>
      )}

      <div className="community-comment-actions">
        <button
          className={`community-upvote-btn${hasUpvoted ? ' community-upvote-btn-active' : ''}${isOwn || !currentUserId ? ' community-upvote-btn-disabled' : ''}`}
          onClick={handleUpvote}
          disabled={upvoting || isOwn || !currentUserId}
          title={isOwn ? "Can't upvote your own comment" : !currentUserId ? 'Sign in to upvote' : hasUpvoted ? 'Remove upvote' : 'Helpful'}
        >
          <IconChevronUp size={14} />
          <span>{upvoteCount}</span>
        </button>

        {depth === 0 && currentUserId && (
          <button className="community-reply-btn" onClick={() => setReplyOpen((v) => !v)}>
            <IconMessageCircle size={13} /> Reply
          </button>
        )}

        {isPostOwner && depth === 0 && !isAccepted && (
          <button className="community-accept-btn" onClick={() => onAccept(comment.id)}>
            <IconCheck size={13} /> Mark as answer
          </button>
        )}
        {isPostOwner && isAccepted && (
          <button className="community-accept-btn community-accept-btn-active" onClick={() => onAccept(null)}>
            <IconCheck size={13} /> Unmark answer
          </button>
        )}
      </div>

      {replyOpen && (
        <div className="community-reply-form">
          <textarea
            className="form-input community-comment-textarea"
            placeholder={`Reply to ${comment.displayName ?? comment.username}…`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            autoFocus
          />
          <div className="community-comment-edit-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => { setReplyOpen(false); setReplyText('') }}>Cancel</button>
            <LoadingButton className="btn btn-primary btn-sm" loading={sendingReply} disabled={!replyText.trim()} onClick={handleReply}>
              <IconSend size={13} /> Reply
            </LoadingButton>
          </div>
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="community-replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postUserId={postUserId}
              currentUserId={currentUserId}
              acceptedCommentId={acceptedCommentId}
              onUpvote={onUpvote}
              onDelete={onDelete}
              onAccept={onAccept}
              onReply={onReply}
              depth={1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

type Build = { id: string; title: string; slug: string }

export default function CommunityPostClient({
  post,
  initialComments,
  currentUserId,
  currentUsername,
  returnTo,
  ownerBuilds = [],
}: {
  post: CommunityPost
  initialComments: CommunityComment[]
  currentUserId: string | null
  currentUsername: string | null
  returnTo: string | null
  ownerBuilds?: Build[]
}) {
  const router = useRouter()
  const [comments, setComments] = useState(initialComments)
  const [commentCount, setCommentCount] = useState(post.commentCount)
  const [acceptedCommentId, setAcceptedCommentId] = useState(post.acceptedCommentId)
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [postMenuOpen, setPostMenuOpen] = useState(false)
  const [deletingPost, setDeletingPost] = useState(false)
  const [confirmDeletePost, setConfirmDeletePost] = useState(false)
  const [editingPost, setEditingPost] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title)
  const [editBody, setEditBody] = useState(post.body ?? '')
  const [editTags, setEditTags] = useState(post.tags)
  const [savingPost, setSavingPost] = useState(false)
  const [postTitle, setPostTitle] = useState(post.title)
  const [postBody, setPostBody] = useState(post.body)
  const [postTags, setPostTags] = useState(post.tags)
  const [postBuildId, setPostBuildId] = useState(post.buildId)
  const [editBuildId, setEditBuildId] = useState(post.buildId ?? '')
  const postMenuRef = useRef<HTMLDivElement>(null)

  const isOwner = currentUserId === post.userId

  useEffect(() => {
    if (!postMenuOpen) return
    const handle = (e: MouseEvent) => {
      if (postMenuRef.current && !postMenuRef.current.contains(e.target as Node)) {
        setPostMenuOpen(false)
        setConfirmDeletePost(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [postMenuOpen])

  const handlePostComment = async () => {
    if (!commentText.trim() || postingComment) return
    setPostingComment(true)
    setCommentError('')
    const res = await fetch('/api/community/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id, content: commentText.trim() }),
    })
    const data = await res.json()
    setPostingComment(false)
    if (!res.ok) {
      setCommentError(res.status === 401 ? 'Sign in to comment.' : data.error ?? 'Failed to post comment.')
      return
    }
    const newComment: CommunityComment = {
      id: data.comment.id,
      postId: post.id,
      userId: currentUserId!,
      username: currentUsername ?? 'you',
      displayName: null,
      content: data.comment.content,
      parentCommentId: null,
      image: null,
      upvoteCount: 0,
      hasUpvoted: false,
      isAccepted: false,
      createdAt: data.comment.created_at,
      replies: [],
    }
    setComments((prev) => [...prev, newComment])
    setCommentCount(data.commentCount)
    setCommentText('')
  }

  const handleReply = async (parentId: string, content: string) => {
    const res = await fetch('/api/community/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id, content, parentCommentId: parentId }),
    })
    const data = await res.json()
    if (!res.ok) return
    const reply: CommunityComment = {
      id: data.comment.id,
      postId: post.id,
      userId: currentUserId!,
      username: currentUsername ?? 'you',
      displayName: null,
      content: data.comment.content,
      parentCommentId: parentId,
      image: null,
      upvoteCount: 0,
      hasUpvoted: false,
      isAccepted: false,
      createdAt: data.comment.created_at,
      replies: [],
    }
    setComments((prev) =>
      prev.map((c) => c.id === parentId ? { ...c, replies: [...c.replies, reply] } : c)
    )
    setCommentCount(data.commentCount)
  }

  const handleDeleteComment = (commentId: string) => {
    setComments((prev) => {
      const top = prev.filter((c) => c.id !== commentId)
      return top.map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== commentId) }))
    })
    setCommentCount((n) => Math.max(0, n - 1))
  }

  const handleAccept = async (commentId: string | null) => {
    const res = await fetch(`/api/community/posts/${post.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId }),
    })
    if (res.ok) {
      const data = await res.json()
      setAcceptedCommentId(data.acceptedCommentId)
      setComments((prev) => prev.map((c) => ({ ...c, isAccepted: c.id === data.acceptedCommentId })))
    }
  }

  const handleSavePost = async () => {
    if (!editTitle.trim() || savingPost) return
    setSavingPost(true)
    const res = await fetch(`/api/community/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle.trim(), body: editBody.trim() || null, tags: editTags, buildId: editBuildId || null }),
    })
    setSavingPost(false)
    if (res.ok) {
      setPostTitle(editTitle.trim())
      setPostBody(editBody.trim() || null)
      setPostTags([...editTags])
      setPostBuildId(editBuildId || null)
      setEditingPost(false)
    }
  }

  const handleDeletePost = async () => {
    if (deletingPost) return
    if (!confirmDeletePost) { setConfirmDeletePost(true); return }
    setDeletingPost(true)
    await fetch(`/api/community/posts/${post.id}`, { method: 'DELETE' })
    router.push('/community')
  }

  return (
    <main className="community-container-post">
        {/* Back link */}
        <div className="community-post-back">
          {returnTo ? (
            <Link href={returnTo} className="community-back-link">
              <IconArrowLeft size={15} /> Back to community post
            </Link>
          ) : (
            <Link href="/community" className="community-back-link">
              <IconArrowLeft size={15} /> Community
            </Link>
          )}
        </div>

        {/* Post */}
        <article className="community-post-full">
          <div className="community-post-card-meta">
            <Link href={`/${post.username}`} className="community-post-author">
              <span className="avatar avatar-sm avatar-amber">{(post.displayName ?? post.username).charAt(0).toUpperCase()}</span>
              <span className="community-post-author-name">{post.displayName ?? post.username}</span>
              <span className="community-post-author-handle">@{post.username}</span>
            </Link>
            <div className="community-post-meta-right">
              <span className="community-post-time">{timeAgo(post.createdAt)}</span>
              {isOwner && (
                <div className="community-post-menu-wrap" ref={postMenuRef} style={{ marginLeft: 0 }}>
                  <button className="community-comment-menu-btn" onClick={() => { setPostMenuOpen((v) => !v); setConfirmDeletePost(false) }}>···</button>
                  {postMenuOpen && (
                    <div className="community-comment-menu">
                      <button onClick={() => { setEditTitle(postTitle); setEditBody(postBody ?? ''); setEditTags([...postTags]); setEditBuildId(postBuildId ?? ''); setEditingPost(true); setPostMenuOpen(false) }}>
                        <IconEdit size={13} /> Edit post
                      </button>
                      <button
                        className={confirmDeletePost ? 'danger' : ''}
                        onClick={handleDeletePost}
                        disabled={deletingPost}
                      >
                        <IconTrash size={13} /> {confirmDeletePost ? 'Confirm delete' : 'Delete post'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {editingPost ? (
            <div className="community-post-edit-form">
              <input
                className="form-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={150}
                placeholder="Title"
              />
              <textarea
                className="form-input community-comment-textarea"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={4}
                placeholder="Body (optional)"
              />
              <div className="community-edit-tags">
                <p className="community-edit-tags-label">Tags (up to 3)</p>
                <div className="community-filter-tags">
                  {COMMUNITY_TAGS.map((tag) => {
                    const active = editTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        className={`community-tag community-tag-btn${active ? ' community-tag-active' : ''}`}
                        onClick={() => setEditTags(active ? editTags.filter((t) => t !== tag) : editTags.length < 3 ? [...editTags, tag] : editTags)}
                      >
                        {active && <IconCheck size={10} />} {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
              {ownerBuilds.length > 0 && (
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label className="form-label" htmlFor="edit-post-build-link" style={{ fontSize: 12 }}>
                    <IconLink size={13} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                    Linked build
                  </label>
                  <select
                    id="edit-post-build-link"
                    className="form-input form-select"
                    value={editBuildId}
                    onChange={(e) => setEditBuildId(e.target.value)}
                    style={{ fontSize: 13 }}
                  >
                    <option value="">No build linked</option>
                    {ownerBuilds.map((b) => (
                      <option key={b.id} value={b.id}>{b.title}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="community-comment-edit-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingPost(false)}>Cancel</button>
                <LoadingButton className="btn btn-primary btn-sm" loading={savingPost} disabled={!editTitle.trim()} onClick={handleSavePost}>Save changes</LoadingButton>
              </div>
            </div>
          ) : (
            <>
              {postTags.length > 0 && (
                <div className="community-post-tags">
                  {postTags.map((tag) => <span key={tag} className="community-tag">{tag}</span>)}
                </div>
              )}
              <h1 className="community-post-full-title">{postTitle}</h1>
              {postBody && <div className="community-post-full-body"><p>{postBody}</p></div>}
              {postBuildId && (() => {
                const linkedBuild = ownerBuilds.find((b) => b.id === postBuildId)
                if (!linkedBuild) return null
                return (
                  <Link
                    href={`/${post.username}/${linkedBuild.slug}`}
                    className="community-post-build-link"
                  >
                    <IconLink size={13} /> {linkedBuild.title}
                  </Link>
                )
              })()}
            </>
          )}

          <PostImageGrid images={post.images} postId={post.id} />

          <div className="community-post-footer">
            <span className="community-post-stat">
              <IconMessageCircle size={13} /> {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
            </span>
            {acceptedCommentId && (
              <span className="community-answered-badge"><IconCheck size={11} /> Answered</span>
            )}
          </div>
        </article>

        {/* Comment form */}
        <div className="community-comment-form-wrap">
          <h3 className="community-comments-heading">{commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}</h3>
          {currentUserId ? (
            <div className="community-comment-form">
              <textarea
                className="form-input community-comment-textarea"
                placeholder="Share your knowledge or ask a follow-up…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
              />
              {commentError && <p className="community-form-error">{commentError}</p>}
              <div className="community-comment-form-footer">
                <LoadingButton
                  className="btn btn-primary btn-sm"
                  loading={postingComment}
                  disabled={!commentText.trim()}
                  onClick={handlePostComment}
                >
                  <IconSend size={13} /> Post comment
                </LoadingButton>
              </div>
            </div>
          ) : (
            <p className="community-sign-in-prompt">
              <Link href="/get-started" className="link">Sign in</Link> to join the discussion.
            </p>
          )}
        </div>

        {/* Comments */}
        {comments.length > 0 && (
          <div className="community-comments-list">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postUserId={post.userId}
                currentUserId={currentUserId}
                acceptedCommentId={acceptedCommentId}
                onUpvote={() => {}}
                onDelete={handleDeleteComment}
                onAccept={handleAccept}
                onReply={handleReply}
              />
            ))}
          </div>
        )}
    </main>
  )
}
