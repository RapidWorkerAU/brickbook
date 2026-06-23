'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { IconArrowLeft, IconCheck, IconPhoto, IconX, IconBuildingCommunity, IconLink } from '@tabler/icons-react'
import { LoadingButton } from '@/components/action-buttons'
import { COMMUNITY_TAGS } from '@/lib/community-data'

type Build = { id: string; title: string; slug: string }

type LibraryImage = {
  id: string
  buildId: string
  buildTitle: string | null
  buildSlug: string | null
  imageUrl: string | null
  imageKind: string
}

type SelectedImage =
  | { source: 'upload'; file: File; preview: string }
  | { source: 'library'; imageId: string; buildTitle: string | null; buildSlug: string | null; preview: string }

export default function CreatePostClient({
  builds,
  initialBuildId,
}: {
  builds: Build[]
  initialBuildId: string | null
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [images, setImages] = useState<SelectedImage[]>([])
  const [selectedBuildId, setSelectedBuildId] = useState<string>(initialBuildId ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 3 ? [...prev, tag] : prev,
    )
  }

  const addUploadedFiles = (files: FileList | null) => {
    if (!files) return
    const remaining = 4 - images.length
    const newImages: SelectedImage[] = []
    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue
      newImages.push({ source: 'upload', file, preview: URL.createObjectURL(file) })
    }
    setImages((prev) => [...prev, ...newImages])
  }

  const openLibrary = async () => {
    setLibraryOpen(true)
    if (libraryImages.length > 0) return
    setLibraryLoading(true)
    const res = await fetch('/api/community/images/my-library')
    const data = await res.json()
    setLibraryImages(data.images ?? [])
    setLibraryLoading(false)
  }

  const addLibraryImage = (img: LibraryImage) => {
    if (images.length >= 4) return
    if (images.some((i) => i.source === 'library' && i.imageId === img.id)) return
    setImages((prev) => [
      ...prev,
      { source: 'library', imageId: img.id, buildTitle: img.buildTitle, buildSlug: img.buildSlug, preview: img.imageUrl! },
    ])
    setLibraryOpen(false)
  }

  const removeImage = (index: number) => {
    setImages((prev) => {
      const next = [...prev]
      const removed = next.splice(index, 1)[0]
      if (removed.source === 'upload') URL.revokeObjectURL(removed.preview)
      return next
    })
  }

  useEffect(() => {
    return () => {
      images.forEach((img) => { if (img.source === 'upload') URL.revokeObjectURL(img.preview) })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!title.trim() || title.trim().length < 5) {
      setError('Title must be at least 5 characters.')
      return
    }
    setError('')
    setSubmitting(true)

    try {
      const uploadedPaths: string[] = []
      const buildImageIds: string[] = []

      const toUpload = images.filter((img): img is Extract<SelectedImage, { source: 'upload' }> => img.source === 'upload')
      const fromLibrary = images.filter((img): img is Extract<SelectedImage, { source: 'library' }> => img.source === 'library')

      if (toUpload.length > 0) {
        const presignRes = await fetch('/api/community/images/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: toUpload.map((img) => ({ name: img.file.name, type: img.file.type })) }),
        })
        const presignData = await presignRes.json()
        if (!presignRes.ok) throw new Error(presignData.error ?? 'Failed to prepare upload.')

        const uploads: { signedUrl: string; path: string }[] = presignData.uploads
        for (let i = 0; i < uploads.length; i++) {
          const putRes = await fetch(uploads[i].signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': toUpload[i].file.type },
            body: toUpload[i].file,
          })
          if (!putRes.ok) throw new Error(`Failed to upload image ${i + 1}.`)
          uploadedPaths.push(uploads[i].path)
        }
      }

      for (const img of fromLibrary) buildImageIds.push(img.imageId)

      const postRes = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || null,
          tags,
          imagePaths: uploadedPaths,
          buildImageIds,
          buildId: selectedBuildId || null,
        }),
      })
      const postData = await postRes.json()
      if (!postRes.ok) throw new Error(postData.error ?? 'Failed to create post.')

      router.push(`/community/${postData.post.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  const linkedBuild = builds.find((b) => b.id === selectedBuildId)

  return (
    <main className="community-container-post">
      <div className="community-post-back">
        <Link href="/community" className="community-back-link">
          <IconArrowLeft size={15} /> Community
        </Link>
      </div>

      <div className="community-create-form card card-body">
        <h1 className="community-create-title">Ask the community</h1>
        <p className="community-create-subtitle">Share a question or start a discussion with other Brickbook members.</p>

        {/* Title */}
        <div className="form-group">
          <label className="form-label" htmlFor="post-title">
            Title <span className="form-required">*</span>
          </label>
          <input
            id="post-title"
            className="form-input"
            type="text"
            placeholder="e.g. Has anyone dealt with a brick veneer vs full brick decision?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
          />
          <span className="form-hint">{title.length}/150</span>
        </div>

        {/* Body */}
        <div className="form-group">
          <label className="form-label" htmlFor="post-body">Details (optional)</label>
          <textarea
            id="post-body"
            className="form-input community-create-textarea"
            placeholder="Add any extra context, what you've already tried, or what you're comparing…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
          />
        </div>

        {/* Tags */}
        <div className="form-group">
          <label className="form-label">Tags <span className="form-hint-inline">(pick up to 3)</span></label>
          <div className="community-tag-picker">
            {COMMUNITY_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`community-tag community-tag-btn${tags.includes(tag) ? ' community-tag-active' : ''}${tags.length >= 3 && !tags.includes(tag) ? ' community-tag-disabled' : ''}`}
                onClick={() => toggleTag(tag)}
                disabled={tags.length >= 3 && !tags.includes(tag)}
              >
                {tags.includes(tag) && <IconCheck size={10} />} {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Link to a build */}
        {builds.length > 0 && (
          <div className="form-group">
            <label className="form-label" htmlFor="post-build-link">
              <IconLink size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Link to a build <span className="form-hint-inline">(optional)</span>
            </label>
            <select
              id="post-build-link"
              className="form-input form-select"
              value={selectedBuildId}
              onChange={(e) => setSelectedBuildId(e.target.value)}
            >
              <option value="">No build linked</option>
              {builds.map((b) => (
                <option key={b.id} value={b.id}>{b.title}</option>
              ))}
            </select>
            {linkedBuild && (
              <p className="form-hint">This post will appear on the Discussion tab of <strong>{linkedBuild.title}</strong>.</p>
            )}
          </div>
        )}

        {/* Images */}
        <div className="form-group">
          <label className="form-label">Images (optional, up to 4)</label>
          {images.length > 0 && (
            <div className="community-create-image-preview">
              {images.map((img, i) => (
                <div key={i} className="community-create-image-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt="" className="community-create-thumb" />
                  {img.source === 'library' && img.buildTitle && (
                    <span className="community-create-image-from">{img.buildTitle}</span>
                  )}
                  <button
                    type="button"
                    className="community-create-image-remove"
                    onClick={() => removeImage(i)}
                    aria-label="Remove image"
                  >
                    <IconX size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {images.length < 4 && (
            <div className="community-image-btns">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <IconPhoto size={14} /> Upload photo
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={openLibrary}
              >
                <IconBuildingCommunity size={14} /> Pick from my build
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => addUploadedFiles(e.target.files)}
          />
        </div>

        {error && <p className="community-form-error">{error}</p>}

        <div className="community-create-actions">
          <Link href="/community" className="btn btn-secondary">Cancel</Link>
          <LoadingButton
            className="btn btn-primary"
            loading={submitting}
            disabled={title.trim().length < 5}
            onClick={handleSubmit}
          >
            Post question
          </LoadingButton>
        </div>
      </div>

      {/* Build library picker modal */}
      {libraryOpen && (
        <div className="community-library-modal" role="dialog" aria-modal="true" aria-label="Pick from build library">
          <button className="update-modal-backdrop" onClick={() => setLibraryOpen(false)} aria-label="Close" />
          <div className="community-library-panel">
            <div className="community-library-header">
              <span className="community-library-title">Pick from your build</span>
              <button className="btn-icon" type="button" onClick={() => setLibraryOpen(false)} aria-label="Close">
                <IconX size={16} />
              </button>
            </div>
            <div className="community-library-body">
              {libraryLoading ? (
                <div className="community-loading-small">Loading your images…</div>
              ) : libraryImages.length === 0 ? (
                <p className="community-library-empty">No public build images found. Upload images to your build first.</p>
              ) : (
                <div className="community-library-grid">
                  {libraryImages.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      className={`community-library-item${images.some((i) => i.source === 'library' && i.imageId === img.id) ? ' community-library-item-selected' : ''}`}
                      onClick={() => addLibraryImage(img)}
                      disabled={images.length >= 4 && !images.some((i) => i.source === 'library' && i.imageId === img.id)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.imageUrl!} alt="" className="community-library-thumb" />
                      {img.buildTitle && <span className="community-library-item-label">{img.buildTitle}</span>}
                      {images.some((i) => i.source === 'library' && i.imageId === img.id) && (
                        <span className="community-library-check"><IconCheck size={14} /></span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
