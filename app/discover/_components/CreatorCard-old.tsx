// ─────────────────────────────────────────────────────────────
// app/discover/_components/CreatorCard.tsx
// ─────────────────────────────────────────────────────────────
import type { SafeCreator } from '@/lib/discover/config';

// SVG platform icons (inline, no external deps)
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433" />
          <stop offset="25%" stopColor="#e6683c" />
          <stop offset="50%" stopColor="#dc2743" />
          <stop offset="75%" stopColor="#cc2366" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-grad)" />
      <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="white" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="5" fill="#010101" />
      <path
        d="M16.5 5.5C17.1 6.3 18 6.8 19 6.9V9.4C18 9.3 17.1 9 16.3 8.5V13.5C16.3 16.0 14.2 18 11.7 18C9.2 18 7.1 16.0 7.1 13.5C7.1 11.0 9.2 9.0 11.7 9.0C11.9 9.0 12.1 9.0 12.3 9.0V11.6C12.1 11.5 11.9 11.5 11.7 11.5C10.5 11.5 9.6 12.4 9.6 13.5C9.6 14.6 10.5 15.5 11.7 15.5C12.9 15.5 13.8 14.6 13.8 13.5V5.5H16.5Z"
        fill="white"
      />
      <path
        d="M16.5 5.5C17.1 6.3 18 6.8 19 6.9V9.4C18 9.3 17.1 9 16.3 8.5V13.5C16.3 16.0 14.2 18 11.7 18C9.2 18 7.1 16.0 7.1 13.5C7.1 11.0 9.2 9.0 11.7 9.0C11.9 9.0 12.1 9.0 12.3 9.0V11.6C12.1 11.5 11.9 11.5 11.7 11.5C10.5 11.5 9.6 12.4 9.6 13.5C9.6 14.6 10.5 15.5 11.7 15.5C12.9 15.5 13.8 14.6 13.8 13.5V5.5H16.5Z"
        fill="#69C9D0"
        opacity="0.5"
        transform="translate(-1, -0.5)"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// Generates initials-based avatar with a deterministic color
function getAvatarColor(firstName: string): string {
  const colors = [
    'from-pink-500 to-rose-400',
    'from-violet-500 to-purple-400',
    'from-amber-500 to-orange-400',
    'from-cyan-500 to-sky-400',
    'from-emerald-500 to-teal-400',
    'from-fuchsia-500 to-pink-400',
    'from-indigo-500 to-blue-400',
    'from-red-500 to-orange-400',
  ];
  const idx = firstName.charCodeAt(0) % colors.length;
  return colors[idx];
}

interface CreatorCardProps {
  creator: SafeCreator;
  signupUrl: string;
}

export default function CreatorCard({ creator, signupUrl }: CreatorCardProps) {
  const avatarGradient = getAvatarColor(creator.firstName);

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      {/* Platform badge */}
      <div className="absolute top-3 right-3 z-10">
        {creator.platform === 'instagram' ? (
          <InstagramIcon className="w-6 h-6" />
        ) : (
          <TikTokIcon className="w-6 h-6" />
        )}
      </div>

      {/* Card body */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Avatar + name row */}
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-semibold text-base flex-shrink-0 select-none`}
          >
            {creator.firstName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-[15px] leading-tight">
              {creator.firstName}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 capitalize">
              {creator.platform === 'instagram' ? 'Instagram' : 'TikTok'} Creator
            </p>
          </div>
        </div>

        {/* Category tags */}
        <div className="flex flex-wrap gap-1.5">
          {creator.categories.map((cat) => (
            <span
              key={cat}
              className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100"
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5 font-medium text-gray-700">
            <UsersIcon />
            {creator.followerRange} followers
          </span>
          {creator.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPinIcon />
              <span className="truncate">{creator.location}</span>
            </span>
          )}
        </div>

        {/* Teaser line */}
        {creator.teaser && (
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
            {creator.teaser}
          </p>
        )}

        {/* Gated: engagement section */}
        <div className="mt-auto pt-3 border-t border-gray-100">
          <div className="relative rounded-xl overflow-hidden">
            {/* Blurred placeholder content */}
            <div className="select-none pointer-events-none px-3 py-2 bg-gray-50 rounded-xl space-y-1.5 blur-[3px]">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Engagement rate</span>
                <span className="font-semibold text-emerald-600">4.8%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-emerald-400 h-1.5 rounded-full w-3/5" />
              </div>
            </div>

            {/* Lock overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
              <a
                href={signupUrl}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#3A3A3A] transition-colors"
              >
                <LockIcon />
                Sign up to view engagement
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Gated: full profile CTA */}
      <div className="px-5 pb-5">
        <a
          href={signupUrl}
          className="block w-full py-2.5 rounded-xl text-sm font-semibold text-center bg-[#3A3A3A] text-white hover:bg-black transition-colors"
        >
          🔒 View Full Profile
        </a>
      </div>
    </div>
  );
}
