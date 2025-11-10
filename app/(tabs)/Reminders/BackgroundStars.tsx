// components/BackgroundStars.tsx
import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// Seeded RNG so stars don't shuffle every render
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Props = {
  /** Explicit star count (auto-scales by screen area vs iPhone 11-ish baseline 375x812). */
  count?: number;
  /** Stars per 1,000 dp² (ignored if `count` provided). e.g. 0.2 is ~62 on 390x800. */
  densityPerK?: number;
  seed?: number;
  minR?: number;
  maxR?: number;
  color?: string;
  visible?: boolean;
};

const BASE_W = 375;
const BASE_H = 812;
const BASE_AREA = BASE_W * BASE_H; // ~304k dp²

const BackgroundStars: React.FC<Props> = ({
  count,
  densityPerK = 0.2,  // reasonable default → ~62 on 390x800
  seed = 1337,
  minR = 0.6,
  maxR = 1.8,
  color = 'rgba(255,255,255,1)',
  visible = true,
}) => {
  const { width, height } = useWindowDimensions();
  const area = Math.max(1, width * height);

  const stars = useMemo(() => {
    if (!visible) return [];
    const prng = mulberry32(seed);

    // Determine star count
    const scaledCount =
      typeof count === 'number'
        ? Math.max(0, Math.round(count * (area / BASE_AREA))) // scale explicit count to screen
        : Math.max(0, Math.round((area / 1000) * densityPerK)); // density per 1,000 dp²

    return Array.from({ length: scaledCount }).map(() => {
      const x = prng() * width;
      const y = prng() * height;

      // Bias towards smaller stars
      const t = prng();
      const r = minR + Math.pow(t, 2.2) * (maxR - minR);

      // Subtle opacity variance
      const alpha = 0.3 + prng() * 0.6; // 0.3–0.9
      return { x, y, r, alpha };
    });
  }, [width, height, area, count, densityPerK, seed, minR, maxR, visible]);

  if (!visible) return null;

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s, i) => (
        <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={`rgba(255,255,255,${s.alpha})`} />
      ))}
    </Svg>
  );
};

export default BackgroundStars;
