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

  return (
    <div className="bg-brand-grey rounded-lg p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-gray-700 pb-4">
        <FileText className="w-6 h-6 text-brand-yellow" />
        <h2 className="text-2xl font-bold text-white">Content Requirements</h2>
      </div>

      {/* Instagram */}
      <div className="border-2 border-gray-700 rounded-lg p-4 bg-black">
        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={inputs.platforms.instagram.selected}
            onChange={(e) => updatePlatform('instagram', { selected: e.target.checked })}
          />
          <Instagram className="w-5 h-5 text-brand-pink" />
          <span className="font-semibold text-white">Instagram</span>
        </label>

        {inputs.platforms.instagram.selected && (
          <div className="space-y-3 ml-8">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Feed Posts</label>
                <input
                  type="number"
                  min="0"
                  value={inputs.platforms.instagram.feedPosts}
                  onChange={(e) => updatePlatform('instagram', { feedPosts: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-brand-grey text-white border-2 border-gray-700 rounded-lg focus:outline-none focus:border-brand-yellow transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Reels</label>
                <input
                  type="number"
                  min="0"
                  value={inputs.platforms.instagram.reels}
                  onChange={(e) => updatePlatform('instagram', { reels: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-brand-grey text-white border-2 border-gray-700 rounded-lg focus:outline-none focus:border-brand-yellow transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Story Sets</label>
              <input
                type="number"
                min="0"
                value={inputs.platforms.instagram.stories}
                onChange={(e) => updatePlatform('instagram', { stories: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-brand-grey text-white border-2 border-gray-700 rounded-lg focus:outline-none focus:border-brand-yellow transition-colors"
              />
            </div>
          </div>
        )}
      </div>

      {/* TikTok */}
      <div className="border-2 border-gray-700 rounded-lg p-4 bg-black">
        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={inputs.platforms.tiktok.selected}
            onChange={(e) => updatePlatform('tiktok', { selected: e.target.checked })}
          />
          <Video className="w-5 h-5 text-brand-pink" />
          <span className="font-semibold text-white">TikTok</span>
        </label>

        {inputs.platforms.tiktok.selected && (
          <div className="ml-8">
            <label className="block text-sm text-gray-400 mb-1">Videos</label>
            <input
              type="number"
              min="0"
              value={inputs.platforms.tiktok.videos}
              onChange={(e) => updatePlatform('tiktok', { videos: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-brand-grey text-white border-2 border-gray-700 rounded-lg focus:outline-none focus:border-brand-yellow transition-colors"
            />
          </div>
        )}
      </div>

      {/* YouTube */}
      <div className="border-2 border-gray-700 rounded-lg p-4 bg-black">
        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={inputs.platforms.youtube.selected}
            onChange={(e) => updatePlatform('youtube', { selected: e.target.checked })}
          />
          <Youtube className="w-5 h-5 text-brand-pink" />
          <span className="font-semibold text-white">YouTube</span>
        </label>

        {inputs.platforms.youtube.selected && (
          <div className="space-y-3 ml-8">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Dedicated Videos</label>
              <input
                type="number"
                min="0"
                value={inputs.platforms.youtube.dedicatedVideos}
                onChange={(e) => updatePlatform('youtube', { dedicatedVideos: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-brand-grey text-white border-2 border-gray-700 rounded-lg focus:outline-none focus:border-brand-yellow transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Integrations</label>
              <input
                type="number"
                min="0"
                value={inputs.platforms.youtube.integrations}
                onChange={(e) => updatePlatform('youtube', { integrations: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-brand-grey text-white border-2 border-gray-700 rounded-lg focus:outline-none focus:border-brand-yellow transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Shorts</label>
              <input
                type="number"
                min="0"
                value={inputs.platforms.youtube.shorts}
                onChange={(e) => updatePlatform('youtube', { shorts: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-brand-grey text-white border-2 border-gray-700 rounded-lg focus:outline-none focus:border-brand-yellow transition-colors"
              />
            </div>
          </div>
        )}
      </div>

      {/* Blog */}
      <div className="border-2 border-gray-700 rounded-lg p-4 bg-black">
        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={inputs.platforms.blog.selected}
            onChange={(e) => updatePlatform('blog', { selected: e.target.checked })}
          />
          <Globe className="w-5 h-5 text-brand-blue" />
          <span className="font-semibold text-white">Blog</span>
        </label>

        {inputs.platforms.blog.selected && (
          <div className="ml-8">
            <label className="block text-sm text-gray-400 mb-1">Blog Posts</label>
            <input
              type="number"
              min="0"
              value={inputs.platforms.blog.posts}
              onChange={(e) => updatePlatform('blog', { posts: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-brand-grey text-white border-2 border-gray-700 rounded-lg focus:outline-none focus:border-brand-yellow transition-colors"
            />
          </div>
        )}
      </div>

      <div className="p-4 bg-black rounded-lg border-2 border-brand-blue">
        <p className="text-sm text-gray-300">
          <strong className="text-brand-blue">Pricing notes:</strong> Video content (Reels, TikTok) costs +30-50% more than static posts. 
          YouTube dedicated videos cost +100-200% more. Multiple formats may include bulk discounts.
        </p>
      </div>
    </div>
  )
}