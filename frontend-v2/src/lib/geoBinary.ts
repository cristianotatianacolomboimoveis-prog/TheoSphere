/**
 * TheoSphere Binary Geo (PBF-Alternative)
 * Serializes GeoJSON coordinates into compact Typed Arrays with B-Spline interpolation.
 */

export interface BinaryPath {
  trek_id: string;
  positions: Float32Array; // [lon1, lat1, alt1, lon2, lat2, alt2, ...]
  timestamps: Float32Array; // [t1, t2, ...] for TripsLayer
}

/**
 * B-Spline Interpolation for high-performance path smoothing in GPU.
 */
function interpolateBSpline(points: [number, number, number][], degree: number = 3, samples: number = 100): [number, number, number][] {
  if (points.length < degree + 1) return points;
  
  const result: [number, number, number][] = [];
  const n = points.length - 1;
  const k = degree + 1;
  
  // Knot vector
  const knots: number[] = [];
  for (let i = 0; i <= n + k; i++) {
    if (i < k) knots.push(0);
    else if (i > n) knots.push(n - k + 2);
    else knots.push(i - k + 1);
  }

  for (let s = 0; s < samples; s++) {
    const t = (s / (samples - 1)) * (n - k + 2);
    let x = 0, y = 0, z = 0;
    
    for (let i = 0; i <= n; i++) {
      const b = bSplineBasis(i, k, t, knots);
      x += points[i][0] * b;
      y += points[i][1] * b;
      z += points[i][2] * b;
    }
    result.push([x, y, z]);
  }
  
  return result;
}

function bSplineBasis(i: number, k: number, t: number, knots: number[]): number {
  if (k === 1) {
    return (t >= knots[i] && t < knots[i + 1]) || (t === knots[knots.length - 1] && i === knots.length - k - 1) ? 1 : 0;
  }
  
  let denom1 = knots[i + k - 1] - knots[i];
  let term1 = denom1 === 0 ? 0 : ((t - knots[i]) / denom1) * bSplineBasis(i, k - 1, t, knots);
  
  let denom2 = knots[i + k] - knots[i + 1];
  let term2 = denom2 === 0 ? 0 : ((knots[i + k] - t) / denom2) * bSplineBasis(i + 1, k - 1, t, knots);
  
  return term1 + term2;
}

/**
 * Serializes GeoJSON coordinates into BinaryPath with smoothing.
 */
export function serializeTrekToBinary(id: string, rawCoords: [number, number, number][]): BinaryPath {
  // Apply B-Spline interpolation for visual excellence (60fps smoothing)
  const smoothCoords = rawCoords.length > 3 ? interpolateBSpline(rawCoords) : rawCoords;
  
  const positions = new Float32Array(smoothCoords.length * 3);
  const timestamps = new Float32Array(smoothCoords.length);
  
  smoothCoords.forEach((coord, i) => {
    positions[i * 3] = coord[0];
    positions[i * 3 + 1] = coord[1];
    positions[i * 3 + 2] = coord[2];
    timestamps[i] = (i / (smoothCoords.length - 1)) * 1000; // Normalized 0-1000 for TripsLayer
  });
  
  return { trek_id: id, positions, timestamps };
}

/**
 * Decodes binary data back into Deck.gl compatible format.
 */
export function decodeBinaryPath(binary: BinaryPath) {
  const coords: number[][] = [];
  for (let i = 0; i < binary.positions.length; i += 3) {
    coords.push([
      binary.positions[i],
      binary.positions[i + 1],
      binary.positions[i + 2]
    ]);
  }
  return {
    id: binary.trek_id,
    path: coords,
    timestamps: Array.from(binary.timestamps)
  };
}
