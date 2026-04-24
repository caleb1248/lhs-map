import { useEffect, useMemo, useRef, useState } from 'react';
import { loadPointsFromStorage, savePointsToStorage } from './pointsStorage';

export type Point = {
  id: number;
  x: number;
  y: number;
  label: string;
  type?: PointType;
  connections: number[];
};

export type PointType = 'room' | 'stairwell';

type CanvasPoint = {
  x: number;
  y: number;
};

export const canvasWidth = 4000;
export const canvasHeight = (4000 * 1200) / 1616;

const getNextPointId = (points: Point[]) => Math.max(1, ...points.map((point) => point.id + 1));

type PointerEventTarget = HTMLCanvasElement;

export function usePoints() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pendingPointRef = useRef<{
    id: number;
    point: CanvasPoint;
    connectFromPointId: number | null;
  } | null>(null);
  const draggingPointRef = useRef<number | null>(null);
  const dragOffsetRef = useRef<CanvasPoint | null>(null);
  const [points, setPoints] = useState<Point[]>(() => loadPointsFromStorage());
  const nextPointIdRef = useRef(getNextPointId(points));
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<number | null>(null);
  const [editingPointId, setEditingPointId] = useState<number | null>(null);
  const [editingPointLocation, setEditingPointLocation] = useState<'sidebar' | 'canvas' | null>(
    null,
  );

  const selectedPoint = useMemo(
    () => points.find((point) => point.id === selectedPointId) ?? null,
    [points, selectedPointId],
  );

  const getCanvasPoint = (event: React.PointerEvent<PointerEventTarget>) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const bounds = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / bounds.width;
    const scaleY = canvasHeight / bounds.height;

    return {
      x: (event.clientX - bounds.left) * scaleX,
      y: (event.clientY - bounds.top) * scaleY,
    };
  };

  const getHoveredPointId = (event: React.PointerEvent<PointerEventTarget>) => {
    const point = getCanvasPoint(event);

    if (!point) {
      return null;
    }

    const hoverRadius = 9;

    for (let index = points.length - 1; index >= 0; index -= 1) {
      const candidate = points[index];
      const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);

      if (distance <= hoverRadius) {
        return candidate.id;
      }
    }

    return null;
  };

  const updatePointLabel = (pointId: number, label: string) => {
    setPoints((currentPoints) =>
      currentPoints.map((point) => (point.id === pointId ? { ...point, label } : point)),
    );
  };

  const updatePointType = (pointId: number, type: PointType | undefined) => {
    setPoints((currentPoints) =>
      currentPoints.map((point) => (point.id === pointId ? { ...point, type } : point)),
    );
  };

  const updatePointPosition = (pointId: number, x: number, y: number) => {
    setPoints((currentPoints) =>
      currentPoints.map((point) => (point.id === pointId ? { ...point, x, y } : point)),
    );
  };

  const selectPoint = (pointId: number) => {
    setSelectedPointId(pointId);
    setEditingPointId(pointId);
    setEditingPointLocation('sidebar');
  };

  const connectPoints = (firstPointId: number, secondPointId: number) => {
    if (firstPointId === secondPointId) {
      return;
    }

    setPoints((currentPoints) =>
      currentPoints.map((point) => {
        if (point.id === firstPointId && !point.connections.includes(secondPointId)) {
          return {
            ...point,
            connections: [...point.connections, secondPointId],
          };
        }

        if (point.id === secondPointId && !point.connections.includes(firstPointId)) {
          return {
            ...point,
            connections: [...point.connections, firstPointId],
          };
        }

        return point;
      }),
    );
  };

  const deleteSelectedPoint = () => {
    if (selectedPointId === null) {
      return;
    }

    setPoints((currentPoints) =>
      currentPoints
        .filter((point) => point.id !== selectedPointId)
        .map((point) => ({
          ...point,
          connections: point.connections.filter((connectionId) => connectionId !== selectedPointId),
        })),
    );
    setSelectedPointId(null);
    setEditingPointId(null);
    setEditingPointLocation(null);
    pendingPointRef.current = null;
    draggingPointRef.current = null;
    dragOffsetRef.current = null;
  };

  const clearAllPoints = () => {
    setPoints([]);
    setEditingPointLocation(null);
    setSelectedPointId(null);
    setHoveredPointId(null);
    setEditingPointId(null);
    setEditingPointLocation(null);
    pendingPointRef.current = null;
    draggingPointRef.current = null;
    dragOffsetRef.current = null;
    nextPointIdRef.current = 1;
  };

  const handleAltEdit = (event: { altKey: boolean; key: string; preventDefault: () => void }) => {
    if (!event.altKey || event.key.toLowerCase() !== 'e') {
      return false;
    }

    if (selectedPointId === null) {
      return false;
    }

    event.preventDefault();
    setEditingPointId(selectedPointId);
    setEditingPointLocation('canvas');
    return true;
  };

  const handleAltDelete = (event: { altKey: boolean; key: string; preventDefault: () => void }) => {
    if (!event.altKey || event.key !== 'Delete') {
      return false;
    }

    event.preventDefault();
    deleteSelectedPoint();
    return true;
  };

  const handlePointKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (handleAltEdit(event)) {
      return;
    }

    if (handleAltDelete(event)) {
      return;
    }

    if (event.key === 'Enter' || event.key === 'Escape') {
      setEditingPointId(null);
      setEditingPointLocation(null);
    }
  };

  const handleCanvasKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (handleAltEdit(event)) {
      return;
    }

    handleAltDelete(event);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event);

    if (!point) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    const existingPointId = getHoveredPointId(event);

    if (existingPointId !== null) {
      if (event.altKey && selectedPointId !== null && selectedPointId !== existingPointId) {
        connectPoints(selectedPointId, existingPointId);
        pendingPointRef.current = null;
        draggingPointRef.current = null;
        dragOffsetRef.current = null;
        setSelectedPointId(existingPointId);
        setEditingPointId(existingPointId);
        setEditingPointLocation('sidebar');
        return;
      }

      pendingPointRef.current = null;
      setSelectedPointId(existingPointId);
      setEditingPointId(existingPointId);
      setEditingPointLocation('sidebar');

      const draggedPoint = points.find((candidate) => candidate.id === existingPointId);

      if (draggedPoint) {
        draggingPointRef.current = existingPointId;
        dragOffsetRef.current = {
          x: point.x - draggedPoint.x,
          y: point.y - draggedPoint.y,
        };
      }

      return;
    }

    const nextPointId = nextPointIdRef.current;

    pendingPointRef.current = {
      id: nextPointId,
      point,
      connectFromPointId: event.altKey && selectedPointId !== null ? selectedPointId : null,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingPointRef.current !== null && dragOffsetRef.current !== null) {
      const pointerPoint = getCanvasPoint(event);

      if (pointerPoint) {
        updatePointPosition(
          draggingPointRef.current,
          pointerPoint.x - dragOffsetRef.current.x,
          pointerPoint.y - dragOffsetRef.current.y,
        );
      }

      return;
    }

    const nextHoveredPointId = getHoveredPointId(event);
    setHoveredPointId((currentHoveredPointId) =>
      currentHoveredPointId === nextHoveredPointId ? currentHoveredPointId : nextHoveredPointId,
    );
  };

  const handlePointerUp = () => {
    draggingPointRef.current = null;
    dragOffsetRef.current = null;

    if (pendingPointRef.current) {
      const { id, point, connectFromPointId } = pendingPointRef.current;

      nextPointIdRef.current += 1;
      setPoints((currentPoints) => [
        ...currentPoints,
        {
          id,
          x: point.x,
          y: point.y,
          label: '',
          connections: [],
        },
      ]);
      setSelectedPointId(id);
      setEditingPointId(id);
      setEditingPointLocation('sidebar');

      if (connectFromPointId !== null) {
        connectPoints(connectFromPointId, id);
      }

      pendingPointRef.current = null;
    }
  };

  const handlePointerLeave = () => {
    setHoveredPointId(null);
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    savePointsToStorage(points);
  }, [points]);

  return {
    canvasRef,
    points,
    selectedPoint,
    selectedPointId,
    hoveredPointId,
    editingPointId,
    editingPointLocation,
    setEditingPointId,
    setEditingPointLocation,
    selectPoint,
    updatePointLabel,
    updatePointType,
    handlePointKeyDown,
    handleCanvasKeyDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    deleteSelectedPoint,
    clearAllPoints,
  };
}
