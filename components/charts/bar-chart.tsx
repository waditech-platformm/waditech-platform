/**
 * Minimal, accessible single-series bar chart (server-rendered SVG, no client JS).
 * - one series → one hue (royal blue), no legend; the card title names the measure
 * - thin bars with a 4px rounded data end anchored to the baseline, recessive grid
 * - per-bar hover tooltip (<title>) with a hit target taller than the mark
 * - a visually-hidden data table for screen readers
 * Time runs left→right in both languages (dir="ltr" on the plot).
 */
type Datum = { label: string; value: number; tooltip?: string };

function niceMax(v: number) {
  if (v <= 0) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export function BarChart({ data, title, format = (n) => String(n), height = 180, labelEvery = 1, width = 600 }: {
  data: Datum[]; title: string; format?: (n: number) => string; height?: number; labelEvery?: number;
  /** viewBox width — match the card's rendered width so text keeps a constant size */ width?: number;
}) {
  const W = width, H = height, padL = 36, padR = 8, padT = 10, padB = 26;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const slot = plotW / Math.max(data.length, 1);
  const bw = Math.min(28, slot * 0.6);
  const ticks = [0, max / 2, max];
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  return (
    <figure className="m-0" dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="h-auto w-full overflow-visible font-latin">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--color-subtle)">{format(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + slot * i + (slot - bw) / 2;
          const h = Math.max((d.value / max) * plotH, d.value > 0 ? 2 : 0);
          const top = padT + plotH - h;
          const r = Math.min(4, h / 2, bw / 2);
          return (
            <g key={i}>
              <title>{d.tooltip ?? `${d.label}: ${format(d.value)}`}</title>
              <rect x={padL + slot * i} y={padT} width={slot} height={plotH} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${top + h} Z`}
                  fill="var(--color-royal-600)"
                />
              )}
              {i % labelEvery === 0 && (
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--color-subtle)">{d.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>{data.map((d, i) => <tr key={i}><th scope="row">{d.label}</th><td>{format(d.value)}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
