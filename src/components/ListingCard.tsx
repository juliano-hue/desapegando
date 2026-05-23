import { Link } from 'react-router-dom'
import { MapPin, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Listing } from '@/lib/models'

function formatMoneyBRL(cents: number) {
  const v = cents / 100
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ListingCard({ listing }: { listing: Listing }) {
  const cover = listing.images?.[0]?.url
  return (
    <Link
      to={`/anuncio/${listing.id}`}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/10 bg-white/4 transition hover:bg-white/6 hover:border-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
      )}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-white/6">
        {cover ? (
          <img
            src={cover}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
            Sem foto
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="line-clamp-1 text-sm font-semibold text-slate-100">{listing.title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" />
                {listing.category?.name}
              </span>
              {listing.subCategory?.name ? (
                <span className="rounded-md bg-white/6 px-2 py-0.5 text-[11px] text-slate-200">
                  {listing.subCategory.name}
                </span>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 rounded-xl bg-emerald-300/12 px-2.5 py-1 text-xs font-semibold text-emerald-200">
            {formatMoneyBRL(listing.priceCents)}
          </div>
        </div>
        {listing.city || listing.state ? (
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">
              {[listing.city, listing.state].filter(Boolean).join(' • ')}
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  )
}

