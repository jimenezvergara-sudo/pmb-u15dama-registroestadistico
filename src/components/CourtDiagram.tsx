import React from 'react';

interface CourtZone {
  id: string;
  points: 1 | 2 | 3;
  path: string;
  label: string;
}

// Half-court zones mapped to SVG viewBox 0 0 300 280
const ZONES: CourtZone[] = [
  // Paint area (2pt)
  { id: 'paint-left', points: 2, path: 'M 100,200 L 100,280 L 150,280 L 150,200 Z', label: 'Pintura Izq' },
  { id: 'paint-right', points: 2, path: 'M 150,200 L 150,280 L 200,280 L 200,200 Z', label: 'Pintura Der' },
  // Close range (2pt)
  { id: 'baseline-left', points: 2, path: 'M 40,240 L 40,280 L 100,280 L 100,200 L 80,200 Z', label: 'Base Izq' },
  { id: 'baseline-right', points: 2, path: 'M 200,200 L 220,200 L 260,240 L 260,280 L 200,280 Z', label: 'Base Der' },
  // Mid-range (2pt)
  { id: 'mid-left', points: 2, path: 'M 40,170 L 40,240 L 80,200 L 100,200 L 100,140 Z', label: 'Media Izq' },
  { id: 'mid-right', points: 2, path: 'M 200,140 L 200,200 L 220,200 L 260,240 L 260,170 Z', label: 'Media Der' },
  { id: 'mid-top', points: 2, path: 'M 100,140 L 100,200 L 200,200 L 200,140 L 185,120 L 115,120 Z', label: 'Media Centro' },
  // Three-point zones
  { id: 'three-left', points: 3, path: 'M 0,170 L 40,170 L 40,280 L 0,280 Z', label: '3pts Izq' },
  { id: 'three-right', points: 3, path: 'M 260,170 L 300,170 L 300,280 L 260,280 Z', label: '3pts Der' },
  { id: 'three-top-left', points: 3, path: 'M 0,50 L 0,170 L 40,170 L 100,140 L 115,120 L 80,60 Z', label: '3pts Sup Izq' },
  { id: 'three-top-right', points: 3, path: 'M 300,50 L 220,60 L 185,120 L 200,140 L 260,170 L 300,170 Z', label: '3pts Sup Der' },
  { id: 'three-top', points: 3, path: 'M 80,60 L 115,120 L 185,120 L 220,60 L 190,30 L 110,30 Z', label: '3pts Centro' },
  // Free throw zone (1pt)
  { id: 'ft', points: 1, path: 'M 110,30 L 190,30 L 220,60 L 300,50 L 300,0 L 0,0 L 0,50 L 80,60 Z', label: 'Tiro Libre' },
];

interface Props {
  onZoneTap: (zone: { x: number; y: number; points: 1 | 2 | 3 }) => void;
  shots?: Array<{ x: number; y: number; made: boolean; points: 1 | 2 | 3 }>;
}

const CourtDiagram: React.FC<Props> = ({ onZoneTap, shots = [] }) => {
  const handleClick = (zone: CourtZone, e: React.MouseEvent<SVGPathElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onZoneTap({ x, y, points: zone.points });
  };

  return (
    <div className="w-full aspect-[300/280] max-w-md mx-auto">
      <svg viewBox="0 0 300 280" className="w-full h-full" style={{ touchAction: 'manipulation' }}>
        {/* Court background */}
        <rect x="0" y="0" width="300" height="280" rx="4" className="fill-court-bg" />

        {/* Tap zones */}
        {ZONES.map(zone => (
          <path
            key={zone.id}
            d={zone.path}
            className="fill-transparent hover:fill-primary/10 active:fill-primary/20 cursor-pointer transition-colors"
            onClick={(e) => handleClick(zone, e)}
          />
        ))}

        {/* Court lines */}
        {/* Boundary */}
        <rect x="0" y="0" width="300" height="280" rx="4" fill="none" className="stroke-court-line" strokeWidth="2" />
        {/* Paint */}
        <rect x="100" y="200" width="100" height="80" fill="none" className="stroke-court-line" strokeWidth="1.5" />
        {/* Free-throw circle */}
        <circle cx="150" cy="200" r="30" fill="none" className="stroke-court-line" strokeWidth="1.5" />
        {/* Basket */}
        <circle cx="150" cy="265" r="5" fill="none" className="stroke-court-line" strokeWidth="1.5" />
        <line x1="140" y1="270" x2="160" y2="270" className="stroke-court-line" strokeWidth="1.5" />
        {/* Three-point arc */}
        <path d="M 40,280 L 40,170 Q 150,40 260,170 L 260,280" fill="none" className="stroke-court-line" strokeWidth="1.5" strokeDasharray="4 3" />
        {/* Half-court line */}
        <line x1="0" y1="0" x2="300" y2="0" className="stroke-court-line" strokeWidth="2" />

        {/* Zone labels */}
        {ZONES.map(zone => {
          const coords = zone.path.match(/[\d.]+/g)?.map(Number) || [];
          const xs = coords.filter((_, i) => i % 2 === 0);
          const ys = coords.filter((_, i) => i % 2 === 1);
          const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
          const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
          return (
            <text
              key={`label-${zone.id}`}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[7px] pointer-events-none select-none font-semibold"
            >
              {zone.points === 1 ? 'TL' : `${zone.points}pt`}
            </text>
          );
        })}

        {/* Shot markers */}
        {shots.map((shot, i) => (
          <circle
            key={i}
            cx={(shot.x / 100) * 300}
            cy={(shot.y / 100) * 280}
            r="4"
            className={shot.made ? 'fill-shot-made' : 'fill-shot-missed'}
            opacity={0.85}
            stroke="white"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  );
};

export default CourtDiagram;
