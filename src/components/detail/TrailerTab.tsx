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
      <div className="py-16 text-center text-text-secondary">
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
          className="absolute inset-0 h-full w-full rounded-[20px] shadow-card"
          src={`https://www.youtube-nocookie.com/embed/${active.key}?rel=0`}
          title={active.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      <p className="t-headline text-text-primary">{active.name}</p>

      {/* Playlist — only shown when there are multiple videos */}
      {ordered.length > 1 && (
        <div className="space-y-1">
          <p className="section-title mb-2">More videos</p>
          <div className="grouped">
            {ordered.map((v, i) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={i === selected}
                onClick={() => setSelected(i)}
                className={`grouped-row w-full text-left text-[0.875rem] transition-colors ${
                  i === selected
                    ? 'bg-accent/12 text-accent'
                    : 'text-text-primary active:bg-fill [@media(hover:hover)]:hover:bg-fill'
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
