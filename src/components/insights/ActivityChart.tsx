import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { AnimatePresence, m } from 'motion/react';
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
  const [tooltipSide, setTooltipSide] = useState<'right' | 'left'>('right');

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
    // The hit rect extends 8 units beyond the plot on each side; map pointer x against the plot itself.
    const scale = rect.width / (plotW + 16);
    const ratio = (event.clientX - rect.left - 8 * scale) / (plotW * scale);
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
  const dataKey = `${granularity}-${buckets.length}-${buckets[0]?.key ?? ''}`;

  // Tooltip follows the pointer 1:1; it only switches sides past a hysteresis band so it
  // doesn't jump back and forth around the middle of the chart.
  if (hoverIndex != null) {
    const x = geometry.xAt(hoverIndex);
    if (tooltipSide === 'right' && x > width * 0.62) setTooltipSide('left');
    else if (tooltipSide === 'left' && x < width * 0.38) setTooltipSide('right');
  }
  const valueText = active
    ? `${formatBucketLabel(active.start, granularity)}: ${active.movies.length} movie${active.movies.length === 1 ? '' : 's'}, ${formatEpisodeCount(active.episodes)}`
    : 'No period selected';

  return (
    <div ref={containerRef} className="relative w-full select-none" style={{ touchAction: 'pan-y' }} data-testid="activity-chart">
      <svg
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="slider"
        aria-label="Watch activity over time. Use the arrow keys to move between periods."
        aria-valuemin={0}
        aria-valuemax={Math.max(0, buckets.length - 1)}
        aria-valuenow={activeIndex ?? 0}
        aria-valuetext={valueText}
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
              stroke={tick === 0 ? 'var(--color-fill-strong)' : 'var(--color-hairline)'}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={geometry.yAt(tick)}
              dy="0.32em"
              textAnchor="end"
              fill="var(--color-text-muted)"
              style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.75rem' }}
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
              style={{ fontSize: '0.75rem' }}
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

        <m.g key={dataKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
        {SERIES_LINES.map((line) => (
          <g key={line.key}>
            <path
              d={linePath(geometry.lines[line.key])}
              fill="none"
              stroke={line.color}
              strokeWidth={2.25}
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
        </m.g>

        <rect
          x={PAD.left - 8}
          y={0}
          width={plotW + 16}
          height={HEIGHT}
          fill="transparent"
          className="cursor-pointer"
          onPointerDown={(e) => {
            // Keep receiving moves for touch drags so the crosshair follows the finger.
            e.currentTarget.setPointerCapture(e.pointerId);
            setHoverIndex(indexFromPointer(e));
          }}
          onPointerMove={(e) => setHoverIndex(indexFromPointer(e))}
          onPointerLeave={() => setHoverIndex(null)}
          onClick={(e) => onSelect(indexFromPointer(e))}
          data-testid="chart-hit-area"
        />
      </svg>

      <AnimatePresence>
        {active && hoverIndex != null && (
          <m.div
            key="tooltip"
            role="tooltip"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="material-sheet shadow-sheet pointer-events-none absolute z-10 rounded-[14px] p-3 text-[0.8125rem]"
            style={{
              width: TOOLTIP_WIDTH,
              top: PAD.top,
              left: Math.min(
                Math.max(0, geometry.xAt(hoverIndex) + (tooltipSide === 'left' ? -TOOLTIP_WIDTH - 14 : 14)),
                width - TOOLTIP_WIDTH,
              ),
            }}
          >
            <p className="mb-2 font-semibold text-text-primary">{formatBucketLabel(active.start, granularity)}</p>
            <TooltipGroup
              label="Movies"
              color={SERIES_LINES[0].color}
              shape="circle"
              items={active.movies.map((mv) => ({ title: mv.title, meta: mv.isRewatch ? 'Rewatch' : '' }))}
            />
            <TooltipGroup
              label="Episodes"
              color={SERIES_LINES[1].color}
              shape="square"
              count={active.episodes}
              items={active.series.map((sr) => ({ title: sr.title, meta: formatEpisodeCount(sr.episodes.length) }))}
            />
          </m.div>
        )}
      </AnimatePresence>
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
