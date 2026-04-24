import { useEffect, useRef, useState } from 'react';
import imageUrl from './assets/floor_plan_1.png';
import { canvasHeight, canvasWidth, usePoints } from './points';

export function App() {
  const {
    canvasRef,
    points,
    selectedPointId,
    selectedPoint,
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
    clearAllPoints,
  } = usePoints();
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [satelliteImage, setSatelliteImage] = useState<HTMLImageElement | null>(null);
  const canvasInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !baseImage || !satelliteImage) {
      return;
    }

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
      satelliteImage,
      -900,
      -700,
      satelliteImage.width * 2.47,
      satelliteImage.height * 2.47,
    );
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.95)';
    ctx.fillStyle = 'rgba(34, 211, 238, 0.95)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const point of points) {
      for (const connectionId of point.connections) {
        if (connectionId <= point.id) {
          continue;
        }

        const connectedPoint = points.find((candidate) => candidate.id === connectionId);

        if (!connectedPoint) {
          continue;
        }

        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(connectedPoint.x, connectedPoint.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(point.x, point.y, 9, 0, Math.PI * 2);
        ctx.arc(connectedPoint.x, connectedPoint.y, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const point of points) {
      const isActive = point.id === selectedPointId || point.id === hoveredPointId;
      ctx.fillStyle = isActive ? '#f97316' : '#e11d48';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [baseImage, satelliteImage, hoveredPointId, points, selectedPointId]);

  useEffect(() => {
    const baseImg = new Image();

    baseImg.onload = () => {
      setBaseImage(baseImg);
    };

    baseImg.onerror = () => {
      setBaseImage(null);
    };

    baseImg.src = imageUrl;

    const satelliteImg = new Image();

    satelliteImg.onload = () => {
      setSatelliteImage(satelliteImg);
    };

    satelliteImg.onerror = () => {
      setSatelliteImage(null);
      alert('error loading images');
    };

    satelliteImg.src = new URL('./assets/satellite.png', import.meta.url).href;
  }, []);

  useEffect(() => {
    if (editingPointLocation !== 'canvas') {
      return;
    }

    canvasInputRef.current?.focus({ preventScroll: true });
  }, [editingPointLocation, editingPointId]);

  return (
    <>
      <aside className="max-h-screen w-80 shrink-0 overflow-y-auto border-r border-white/10 bg-linear-to-b from-[#161616] to-[#101010] p-6 text-slate-50">
        <div className="flex flex-col gap-4">
          <h1 className="m-0 text-2xl font-semibold">Points</h1>
          <p className="m-0 text-sm text-slate-300">
            Click the map to add a point, then label it here.
          </p>
          <button
            className="w-full rounded-xl bg-red-600 px-3 py-2 text-left font-inherit text-white transition-colors hover:bg-red-700"
            type="button"
            onClick={clearAllPoints}
          >
            Clear all points
          </button>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {points.map((point) => {
              const isSelected = point.id === selectedPointId;

              return (
                <li key={point.id} className={isSelected ? 'rounded-xl ring-1 ring-red-500' : ''}>
                  {editingPointId === point.id && editingPointLocation === 'sidebar' ? (
                    <input
                      className="w-full box-border rounded-xl border border-orange-500 bg-[#1c1c1c] px-3 py-2 font-inherit text-slate-50 outline-none"
                      type="text"
                      value={point.label}
                      onChange={(event) => updatePointLabel(point.id, event.target.value)}
                      onBlur={() => {
                        setEditingPointId(null);
                        setEditingPointLocation(null);
                      }}
                      onKeyDown={handlePointKeyDown}
                    />
                  ) : (
                    <button
                      className="w-full rounded-xl border border-white/10 bg-[#1c1c1c] px-3 py-2 text-left font-inherit text-slate-50"
                      type="button"
                      onClick={() => selectPoint(point.id)}
                    >
                      {point.label || `Point ${point.id}`}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
      <main className="grid min-w-0 flex-1 place-items-center overflow-auto bg-[#111] p-6">
        <div
          className="relative w-full max-w-250"
          style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}` }}
        >
          <canvas
            ref={canvasRef}
            tabIndex={0}
            className="absolute inset-0 block h-full w-full touch-none bg-black shadow-[0_20px_60px_rgba(0,0,0,0.35)] outline-none"
            width={canvasWidth}
            height={canvasHeight}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onKeyDown={handleCanvasKeyDown}
          />
          {editingPointId === selectedPointId &&
          selectedPoint &&
          editingPointLocation === 'canvas' ? (
            <div
              className="absolute z-10 flex w-28 -translate-x-1/2 -translate-y-full flex-col gap-1 rounded-lg border border-orange-500 bg-[#1c1c1c] p-2 text-sm shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
              style={{
                left: `${(selectedPoint.x / canvasWidth) * 100}%`,
                top: `calc(${(selectedPoint.y / canvasHeight) * 100}% - 12px)`,
              }}
            >
              <select
                className="rounded-md border border-white/10 bg-[#111] px-2 py-1 text-slate-50 outline-none"
                value={selectedPoint.type ?? ''}
                onChange={(event) =>
                  updatePointType(
                    selectedPoint.id,
                    event.target.value === ''
                      ? undefined
                      : (event.target.value as 'room' | 'stairwell'),
                  )
                }
                onKeyDown={handlePointKeyDown}
              >
                <option value="room">Room</option>
                <option value="stairwell">Stairwell</option>
                <option value="">Other</option>
              </select>
              <input
                ref={canvasInputRef}
                className="w-full rounded-md border border-white/10 bg-[#111] px-2 py-1 text-slate-50 outline-none"
                type="text"
                value={selectedPoint.label}
                onChange={(event) => updatePointLabel(selectedPoint.id, event.target.value)}
                onBlur={() => {
                  setEditingPointId(null);
                  setEditingPointLocation(null);
                }}
                onKeyDown={handlePointKeyDown}
              />
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
