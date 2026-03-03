'use client'

import { FileText, Instagram, Video, Youtube, Globe } from 'lucide-react'
import type { CalculatorInputs } from './types'

interface Props {
  inputs: CalculatorInputs
  updateInputs: (updates: Partial<CalculatorInputs>) => void
}

export default function ContentRequirements({ inputs, updateInputs }: Props) {
  const updatePlatform = (platform: keyof typeof inputs.platforms, updates: any) => {
    updateInputs({
      platforms: {
        ...inputs.platforms,
        [platform]: { ...inputs.platforms[platform], ...updates },
      },
    })
  }

  const cardStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  }

  const platformCardStyle = (selected: boolean) => ({
    border: `2px solid ${selected ? '#FFD700' : '#E5E7EB'}`,
    borderRadius: 10,
    padding: 16,
    backgroundColor: selected ? '#FFFFF8' : '#F9FAFB',
    transition: 'border-color 0.15s, background-color 0.15s',
  })

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#FFFFFF',
    color: '#3A3A3A',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
  }

  const labelStyle = {
    display: 'block' as const,
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  }

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #E5E7EB', paddingBottom: 16 }}>
        <FileText style={{ width: 24, height: 24, color: '#FFD700' }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#3A3A3A', margin: 0 }}>Content Requirements</h2>
      </div>

      {/* Instagram */}
      <div style={platformCardStyle(inputs.platforms.instagram.selected)}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: inputs.platforms.instagram.selected ? 16 : 0, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={inputs.platforms.instagram.selected}
            onChange={(e) => updatePlatform('instagram', { selected: e.target.checked })}
            style={{ accentColor: '#FFD700', width: 16, height: 16 }}
          />
          <Instagram style={{ width: 18, height: 18, color: '#FF6B8A' }} />
          <span style={{ fontWeight: 600, color: '#3A3A3A', fontSize: 15 }}>Instagram</span>
        </label>

        {inputs.platforms.instagram.selected && (
          <div style={{ marginLeft: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Feed Posts</label>
                <input type="number" min="0" value={inputs.platforms.instagram.feedPosts}
                  onChange={(e) => updatePlatform('instagram', { feedPosts: Number(e.target.value) })}
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Reels</label>
                <input type="number" min="0" value={inputs.platforms.instagram.reels}
                  onChange={(e) => updatePlatform('instagram', { reels: Number(e.target.value) })}
                  style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Story Sets</label>
              <input type="number" min="0" value={inputs.platforms.instagram.stories}
                onChange={(e) => updatePlatform('instagram', { stories: Number(e.target.value) })}
                style={inputStyle} />
            </div>
          </div>
        )}
      </div>

      {/* TikTok */}
      <div style={platformCardStyle(inputs.platforms.tiktok.selected)}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: inputs.platforms.tiktok.selected ? 16 : 0, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={inputs.platforms.tiktok.selected}
            onChange={(e) => updatePlatform('tiktok', { selected: e.target.checked })}
            style={{ accentColor: '#FFD700', width: 16, height: 16 }}
          />
          <Video style={{ width: 18, height: 18, color: '#FF6B8A' }} />
          <span style={{ fontWeight: 600, color: '#3A3A3A', fontSize: 15 }}>TikTok</span>
        </label>

        {inputs.platforms.tiktok.selected && (
          <div style={{ marginLeft: 28 }}>
            <label style={labelStyle}>Videos</label>
            <input type="number" min="0" value={inputs.platforms.tiktok.videos}
              onChange={(e) => updatePlatform('tiktok', { videos: Number(e.target.value) })}
              style={inputStyle} />
          </div>
        )}
      </div>

      {/* YouTube */}
      <div style={platformCardStyle(inputs.platforms.youtube.selected)}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: inputs.platforms.youtube.selected ? 16 : 0, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={inputs.platforms.youtube.selected}
            onChange={(e) => updatePlatform('youtube', { selected: e.target.checked })}
            style={{ accentColor: '#FFD700', width: 16, height: 16 }}
          />
          <Youtube style={{ width: 18, height: 18, color: '#FF6B8A' }} />
          <span style={{ fontWeight: 600, color: '#3A3A3A', fontSize: 15 }}>YouTube</span>
        </label>

        {inputs.platforms.youtube.selected && (
          <div style={{ marginLeft: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Dedicated Videos</label>
              <input type="number" min="0" value={inputs.platforms.youtube.dedicatedVideos}
                onChange={(e) => updatePlatform('youtube', { dedicatedVideos: Number(e.target.value) })}
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Integrations</label>
              <input type="number" min="0" value={inputs.platforms.youtube.integrations}
                onChange={(e) => updatePlatform('youtube', { integrations: Number(e.target.value) })}
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Shorts</label>
              <input type="number" min="0" value={inputs.platforms.youtube.shorts}
                onChange={(e) => updatePlatform('youtube', { shorts: Number(e.target.value) })}
                style={inputStyle} />
            </div>
          </div>
        )}
      </div>

      {/* Blog */}
      <div style={platformCardStyle(inputs.platforms.blog.selected)}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: inputs.platforms.blog.selected ? 16 : 0, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={inputs.platforms.blog.selected}
            onChange={(e) => updatePlatform('blog', { selected: e.target.checked })}
            style={{ accentColor: '#FFD700', width: 16, height: 16 }}
          />
          <Globe style={{ width: 18, height: 18, color: '#3AAFF4' }} />
          <span style={{ fontWeight: 600, color: '#3A3A3A', fontSize: 15 }}>Blog</span>
        </label>

        {inputs.platforms.blog.selected && (
          <div style={{ marginLeft: 28 }}>
            <label style={labelStyle}>Blog Posts</label>
            <input type="number" min="0" value={inputs.platforms.blog.posts}
              onChange={(e) => updatePlatform('blog', { posts: Number(e.target.value) })}
              style={inputStyle} />
          </div>
        )}
      </div>

      {/* Pricing note */}
      <div style={{ padding: 14, backgroundColor: '#EBF7FF', borderRadius: 8, border: '1px solid #A3D9FF' }}>
        <p style={{ fontSize: 13, color: '#3A3A3A', margin: 0 }}>
          <strong style={{ color: '#3AAFF4' }}>Pricing notes:</strong> Video content (Reels, TikTok) costs +30–50% more than static posts.
          YouTube dedicated videos cost +100–200% more. Multiple formats may include bulk discounts.
        </p>
      </div>
    </div>
  )
}
