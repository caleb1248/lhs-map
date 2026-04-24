import type { Point } from './points';

const pointsStorageKey = 'lhs-map:points';

export const loadPointsFromStorage = () => {
  if (typeof window === 'undefined') {
    return [] as Point[];
  }

  const storedPoints = window.localStorage.getItem(pointsStorageKey);

  if (!storedPoints) {
    return [] as Point[];
  }

  try {
    const parsedPoints = JSON.parse(storedPoints) as unknown;

    if (!Array.isArray(parsedPoints)) {
      return [] as Point[];
    }

    return parsedPoints
      .filter((point): point is Point => {
        if (typeof point !== 'object' || point === null) {
          return false;
        }

        const candidate = point as Point;
        const type = (candidate as { type?: unknown }).type;

        return (
          typeof candidate.id === 'number' &&
          typeof candidate.x === 'number' &&
          typeof candidate.y === 'number' &&
          typeof candidate.label === 'string' &&
          (type === undefined || type === 'room' || type === 'stairwell' || type === 'other') &&
          Array.isArray(candidate.connections) &&
          candidate.connections.every((connectionId) => typeof connectionId === 'number')
        );
      })
      .map((point) => ({
        ...point,
        type: point.type === 'room' || point.type === 'stairwell' ? point.type : undefined,
      }));
  } catch {
    return [] as Point[];
  }
};

export const savePointsToStorage = (points: Point[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(pointsStorageKey, JSON.stringify(points));
};
