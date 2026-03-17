import React from 'react';
import { RotateCw } from 'lucide-react';

interface CourtZone {
  id: string;
  points: 1 | 2 | 3;
  path: string;
  label: string;
}

// Half-court zones mapped to SVG viewBox 0 0 300 280
const ZONES: CourtZone[] = [
  { id: 'paint-left', points: 2, path: 'M 100,200 L 100,280 L 150,280 L 150,200 Z', label: 'Pintura Izq' },
  { id: 'paint-right', points: 2, path: 'M 150,200 L 150,280 L 200,280 L 200,200 Z', label: 'Pintura Der' },
  { id: 'baseline-left', points: 2, path: 'M 40,240 L 40,280 L 100,280 L 100,200 L 80,200 Z', label: 'Base Izq' },
  { id: 'baseline-right', points: 2, path: 'M 200,200 L 220,200 L 260,240 L 260,280 L 200,280 Z', label: 'Base Der' },
  { id: 'mid-left', points: 2, path: 'M 40,170 L 40,240 L 80,200 L 100,200 L 100,140 Z', label: 'Media Izq' },
  { id: 'mid-right', points: 2, path: 'M 200,140 L 200,200 L 220,200 L 260,240 L 260,170 Z', label: 'Media Der' },
  { id: 'mid-top', points: 2, path: 'M 100,140 L 100,200 L 200,200 L 200,140 L 185,120 L 115,120 Z', label: 'Media Centro' },
  { id: 'three-left', points: 3, path: 'M 0,170 L 40,170 L 40,280 L 0,280 Z', label: '3pts Izq' },
  { id: 'three-right', points: 3, path: 'M 260,170 L 300,170 L 300,280 L 260,280 Z', label: '3pts Der' },
  { id: 'three-top-left', points: 3, path: 'M 0,50 L 0,170 L 40,170 L 100,140 L 115,120 L 80,60 Z', label: '3pts Sup Izq' },
  { id: 'three-top-right', points: 3, path: 'M 300,50 L 220,60 L 185,120 L 200,140 L 260,170 L 300,170 Z', label: '3pts Sup Der' },
  { id: 'three-top', points: 3, path: 'M 80,60 L 115,120 L 185,120 L 220,60 L 190,30 L 110,30 Z', label: '3pts Centro' },
  { id: 'ft', points: 1, path: 'M 110,30 L 190,30 L 220,60 L 300,50 L 300,0 L 0,0 L 0,50 L 80,60 Z', label: 'Tiro Libre' },
];

/** Convert screen click to SVG-native coordinates, accounting for CSS rotation */
function screenToSvg(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: (svgPt.x / 300) * 100, y: (svgPt.y / 280) * 100 };
}

interface Props {
  onZoneTap: (zone: { x: number; y: number; points: 1 | 2 | 3 }) => void;
  shots?: Array<{ x: number; y: number; made: boolean; points: 1 | 2 | 3 }>;
  rotation: number;
  onRotate: () => void;
}

const CourtDiagram: React.FC<Props> = ({ onZoneTap, shots = [], rotation, onRotate }) => {

  const handleClick = (zone: CourtZone, e: React.MouseEvent<SVGPathElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const { x, y } = screenToSvg(svg, e.clientX, e.clientY);
    onZoneTap({ x, y, points: zone.points });
  };

  return (
    <div className="w-full max-w-md mx-auto relative">
      <button
        onClick={onRotate}
        className="absolute top-1 right-1 z-10 p-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground hover:bg-card transition-colors tap-feedback"
        title="Rotar cancha"
      >
        <RotateCw className="w-4 h-4" />
      </button>
      <div className="aspect-[300/280] my-2" style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s ease' }}>
        <svg viewBox="0 0 300 280" className="w-full h-full" style={{ touchAction: 'manipulation' }}>
          <rect x="0" y="0" width="300" height="280" rx="4" className="fill-court-bg" />

          {ZONES.map(zone => (
            <path
              key={zone.id}
              d={zone.path}
              className="fill-transparent hover:fill-primary/10 active:fill-primary/20 cursor-pointer transition-colors"
              onClick={(e) => handleClick(zone, e)}
            />
          ))}

          <rect x="0" y="0" width="300" height="280" rx="4" fill="none" className="stroke-court-line" strokeWidth="2" />
          <rect x="100" y="200" width="100" height="80" fill="none" className="stroke-court-line" strokeWidth="1.5" />
          <circle cx="150" cy="200" r="30" fill="none" className="stroke-court-line" strokeWidth="1.5" />
          <circle cx="150" cy="265" r="5" fill="none" className="stroke-court-line" strokeWidth="1.5" />
          <line x1="140" y1="270" x2="160" y2="270" className="stroke-court-line" strokeWidth="1.5" />
          <path d="M 40,280 L 40,170 Q 150,40 260,170 L 260,280" fill="none" className="stroke-court-line" strokeWidth="1.5" strokeDasharray="4 3" />
          <line x1="0" y1="0" x2="300" y2="0" className="stroke-court-line" strokeWidth="2" />

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
                transform={`rotate(${-rotation}, ${cx}, ${cy})`}
              >
                {zone.points === 1 ? 'TL' : `${zone.points}pt`}
              </text>
            );
          })}

          {/* Shot markers - transformed to follow rotation */}
          {shots.map((shot, i) => {
            const { cx, cy } = transformShot(shot.x, shot.y, rotation);
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r="4"
                className={shot.made ? 'fill-shot-made' : 'fill-shot-missed'}
                opacity={0.85}
                stroke="white"
                strokeWidth="1"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default CourtDiagram;
