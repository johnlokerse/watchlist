import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { Bucket, Granularity } from '../../utils/insights';
import { formatBucketLabel, formatBucketTick, formatEpisodeCount } from '../../utils/insights';

interface Props {
  buckets: Bucket[];
  granularity: Granularity;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

const HEIGHT = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 32 };
const TOOLTIP_WIDTH = 248;
const TOOLTIP_ITEMS = 5;

export const SERIES_LINES = [
  { key: 'movies', label: 'Movies', color: 'var(--color-accent)' },
  { key: 'episodes', label: 'Episodes', color: 'var(--color-text-secondary)' },
] as const;

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(value)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * step >= value) return m * step;
  }
  return 10 * step;
}

function linePath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');
}

export default function ActivityChart({ buckets, granularity, selectedIndex, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const geometry = useMemo(() => {
    const counts = buckets.map((b) => ({ movies: b.movies.length, episodes: b.episodes }));
    const max = niceMax(Math.max(0, ...counts.map((c) => Math.max(c.movies, c.episodes))));
    const xAt = (i: number) => PAD.left + (buckets.length <= 1 ? plotW / 2 : (i / (buckets.length - 1)) * plotW);
    const yAt = (v: number) => PAD.top + plotH - (v / max) * plotH;
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f)).filter((v, i, a) => a.indexOf(v) === i);
    const labelEvery = Math.max(1, Math.ceil(buckets.length / Math.max(2, Math.floor(plotW / 72))));
    return {
      max,
      xAt,
      yAt,
      yTicks,
      labelEvery,
      lines: {
        movies: counts.map((c, i) => ({ x: xAt(i), y: yAt(c.movies) })),
        episodes: counts.map((c, i) => ({ x: xAt(i), y: yAt(c.episodes) })),
      },
    };
  }, [buckets, plotW, plotH]);

  const indexFromPointer = (event: MouseEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    return Math.min(buckets.length - 1, Math.max(0, Math.round(ratio * (buckets.length - 1))));
  };

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const current = selectedIndex ?? buckets.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowLeft') next = current - 1;
    if (event.key === 'ArrowRight') next = current + 1;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = buckets.length - 1;
    if (next == null) return;
    event.preventDefault();
    onSelect(Math.min(buckets.length - 1, Math.max(0, next)));
  };

  const activeIndex = hoverIndex ?? selectedIndex;
  const active = activeIndex != null ? buckets[activeIndex] : null;
  const showMarkers = buckets.length <= 45;

  return (
    <div ref={containerRef} className="relative w-full select-none" data-testid="activity-chart">
      <svg
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label="Movies and series watched over time. Use the arrow keys to move between periods."
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="block overflow-visible rounded-md"
      >
        {geometry.yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={geometry.yAt(tick)}
              y2={geometry.yAt(tick)}
              stroke="var(--color-border-subtle)"
              strokeWidth={1}
              strokeDasharray={tick === 0 ? undefined : '2 4'}
            />
            <text
              x={PAD.left - 8}
              y={geometry.yAt(tick)}
              dy="0.32em"
              textAnchor="end"
              fill="var(--color-text-muted)"
              fontSize={11}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {tick}
            </text>
          </g>
        ))}

        {buckets.map((b, i) =>
          i % geometry.labelEvery === 0 ? (
            <text
              key={b.key}
              x={geometry.xAt(i)}
              y={HEIGHT - 8}
              textAnchor={i === 0 && buckets.length > 1 ? 'start' : 'middle'}
              fill="var(--color-text-muted)"
              fontSize={11}
            >
              {formatBucketTick(b.start, granularity)}
            </text>
          ) : null,
        )}

        {activeIndex != null && (
          <line
            x1={geometry.xAt(activeIndex)}
            x2={geometry.xAt(activeIndex)}
            y1={PAD.top}
            y2={PAD.top + plotH}
            stroke="var(--color-text-muted)"
            strokeWidth={1}
          />
        )}

        {SERIES_LINES.map((line) => (
          <g key={line.key}>
            <path
              d={linePath(geometry.lines[line.key])}
              fill="none"
              stroke={line.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              data-testid={`line-${line.key}`}
            />
            {geometry.lines[line.key].map((p, i) => {
              const isActive = i === activeIndex;
              if (!showMarkers && !isActive) return null;
              const size = isActive ? 5 : 3.5;
              // Squares for episodes, circles for movies: identity never relies on color alone.
              return line.key === 'episodes' ? (
                <rect
                  key={i}
                  x={p.x - size}
                  y={p.y - size}
                  width={size * 2}
                  height={size * 2}
                  rx={1.5}
                  fill={line.color}
                  stroke="var(--color-surface-raised)"
                  strokeWidth={2}
                />
              ) : (
                <circle key={i} cx={p.x} cy={p.y} r={size} fill={line.color} stroke="var(--color-surface-raised)" strokeWidth={2} />
              );
            })}
          </g>
        ))}

        <rect
          x={PAD.left - 8}
          y={0}
          width={plotW + 16}
          height={HEIGHT}
          fill="transparent"
          className="cursor-pointer"
          onPointerMove={(e) => setHoverIndex(indexFromPointer(e))}
          onPointerLeave={() => setHoverIndex(null)}
          onClick={(e) => onSelect(indexFromPointer(e))}
          data-testid="chart-hit-area"
        />
      </svg>

      {active && hoverIndex != null && (
        <div
          role="tooltip"
          className="app-panel pointer-events-none absolute z-10 p-3 text-xs"
          style={{
            width: TOOLTIP_WIDTH,
            top: PAD.top,
            left: Math.min(
              Math.max(0, geometry.xAt(hoverIndex) + (geometry.xAt(hoverIndex) > width / 2 ? -TOOLTIP_WIDTH - 12 : 12)),
              width - TOOLTIP_WIDTH,
            ),
          }}
        >
          <p className="mb-2 font-semibold text-text-primary">{formatBucketLabel(active.start, granularity)}</p>
          <TooltipGroup
            label="Movies"
            color={SERIES_LINES[0].color}
            shape="circle"
            items={active.movies.map((m) => ({ title: m.title, meta: m.isRewatch ? 'Rewatch' : '' }))}
          />
          <TooltipGroup
            label="Episodes"
            color={SERIES_LINES[1].color}
            shape="square"
            count={active.episodes}
            items={active.series.map((s) => ({ title: s.title, meta: formatEpisodeCount(s.episodes.length) }))}
          />
        </div>
      )}
    </div>
  );
}

function TooltipGroup({
  label,
  color,
  shape,
  items,
  count = items.length,
}: {
  label: string;
  color: string;
  shape: 'circle' | 'square';
  items: { title: string; meta: string }[];
  count?: number;
}) {
  return (
    <div className="mt-2 first-of-type:mt-0">
      <div className="flex items-center justify-between gap-2 text-text-secondary">
        <span className="flex items-center gap-1.5">
          <LegendSwatch color={color} shape={shape} />
          {label}
        </span>
        <span className="font-semibold text-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      </div>
      {items.length > 0 && (
        <ul className="mt-1 space-y-0.5 pl-4">
          {items.slice(0, TOOLTIP_ITEMS).map((item, i) => (
            <li key={i} className="flex items-baseline justify-between gap-2">
              <span className="truncate text-text-primary">{item.title}</span>
              {item.meta && <span className="shrink-0 text-text-muted">{item.meta}</span>}
            </li>
          ))}
          {items.length > TOOLTIP_ITEMS && (
            <li className="text-text-muted">+{items.length - TOOLTIP_ITEMS} more</li>
          )}
        </ul>
      )}
    </div>
  );
}

export function LegendSwatch({ color, shape }: { color: string; shape: 'circle' | 'square' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2.5 w-2.5 shrink-0 ${shape === 'circle' ? 'rounded-full' : 'rounded-[2px]'}`}
      style={{ background: color }}
    />
  );
}
