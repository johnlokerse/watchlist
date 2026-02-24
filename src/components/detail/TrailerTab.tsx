import { useState } from 'react';
import type { TMDBVideo } from '../../api/types';

interface Props {
  videos: TMDBVideo[] | undefined;
}

export default function TrailerTab({ videos }: Props) {
  const youtubeVideos = (videos ?? []).filter((v) => v.site === 'YouTube');

  // Prefer official trailers first, then teasers, then anything
  const trailers = youtubeVideos.filter((v) => v.type === 'Trailer');
  const teasers = youtubeVideos.filter((v) => v.type === 'Teaser');
  const others = youtubeVideos.filter((v) => v.type !== 'Trailer' && v.type !== 'Teaser');

  const ordered = [
    ...trailers.sort((a, b) => (b.official ? 1 : 0) - (a.official ? 1 : 0)),
    ...teasers.sort((a, b) => (b.official ? 1 : 0) - (a.official ? 1 : 0)),
    ...others,
  ];

  const [selected, setSelected] = useState(0);

  if (ordered.length === 0) {
    return (
      <div className="text-center py-16 text-text-muted">
        <p className="text-3xl mb-2">🎬</p>
        <p>No trailers available.</p>
      </div>
    );
  }

  const active = ordered[selected];

  return (
    <div className="space-y-4">
      {/* Embedded player */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          key={active.key}
          className="absolute inset-0 w-full h-full rounded-xl"
          src={`https://www.youtube-nocookie.com/embed/${active.key}?rel=0`}
          title={active.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      <p className="text-sm font-medium text-text-primary">{active.name}</p>

      {/* Playlist — only shown when there are multiple videos */}
      {ordered.length > 1 && (
        <div className="space-y-1">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-2">More videos</p>
          <div className="flex flex-col gap-1">
            {ordered.map((v, i) => (
              <button
                key={v.id}
                onClick={() => setSelected(i)}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  i === selected
                    ? 'bg-accent/15 text-accent font-medium'
                    : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                }`}
              >
                <span className="font-medium">{v.type}</span>
                {v.official && (
                  <span className="ml-1.5 text-xs text-text-muted">(Official)</span>
                )}
                <span className="ml-1.5 text-text-muted">— {v.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
