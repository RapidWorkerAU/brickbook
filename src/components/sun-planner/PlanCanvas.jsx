"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Stage, Layer, Image as KonvaImage, Rect } from "react-konva";
import useImage from "use-image";
import NorthArrow from "./NorthArrow";
import SunLightLayer from "./SunLightLayer";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 5;

function clampScale(s) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s));
}

export default function PlanCanvas({
  imageUrl,
  planData,
  scale,
  position,
  onScaleChange,
  onPositionChange,
  northBearing,
  onBearingChange,
  lat,
  lng,
  showHourMarkers = true,
  onStageReady,
  sunAzimuth,
  sunAltitude,
  sunDecHour,
  onPlanRectChange,
}) {
  const containerRef = useRef(null);
  const stageRef     = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [image] = useImage(imageUrl, "anonymous");

  const isRectMode = !imageUrl && planData?.planType === "rectangle";

  // Rectangle pixel size — fits aspect ratio inside the orrery ring
  const { rectW, rectH } = useMemo(() => {
    if (!isRectMode || !size.width || !size.height) return { rectW: 300, rectH: 240 };
    const { widthMetres = 15, heightMetres = 12 } = planData?.planSize ?? {};
    const aspect  = widthMetres / heightMetres;
    const RING_R  = Math.min(size.width, size.height) * 0.36;
    const maxDim  = RING_R * 1.35;
    if (aspect >= 1) return { rectW: maxDim, rectH: maxDim / aspect };
    return { rectW: maxDim * aspect, rectH: maxDim };
  }, [isRectMode, planData, size]);

  // Notify parent once stage is ready
  useEffect(() => {
    if (size.width && stageRef.current) onStageReady?.(stageRef.current);
  }, [size.width]); // eslint-disable-line react-hooks/exhaustive-deps

  // Report floor-plan bounding box whenever image or rect changes
  useEffect(() => {
    if (!onPlanRectChange) return;
    if (image) {
      onPlanRectChange({ x: position.x, y: position.y, width: image.width * scale, height: image.height * scale });
    } else if (isRectMode) {
      onPlanRectChange({ x: position.x, y: position.y, width: rectW * scale, height: rectH * scale });
    }
  }, [image, isRectMode, rectW, rectH, scale, position, onPlanRectChange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track container dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Centre + fit image (or rectangle) on first render / resize
  useEffect(() => {
    if (!size.width || !size.height) return;
    const cx = size.width  / 2;
    const cy = size.height / 2;

    if (image) {
      const RING_R = Math.min(size.width, size.height) * 0.36;
      const maxDim = RING_R * 1.35;
      const fitScale = clampScale(Math.min(maxDim / image.width, maxDim / image.height));
      onScaleChange(fitScale);
      onPositionChange({ x: cx - (image.width * fitScale) / 2, y: cy - (image.height * fitScale) / 2 });
    } else if (isRectMode && rectW) {
      onScaleChange(1);
      onPositionChange({ x: cx - rectW / 2, y: cy - rectH / 2 });
    }
  }, [image, isRectMode, rectW, rectH, size.width, size.height]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mouse-wheel zoom around cursor
  const handleWheel = useCallback(
    (e) => {
      e.evt.preventDefault();
      const stage   = e.target.getStage();
      const pointer = stage.getPointerPosition();
      const direction = e.evt.deltaY < 0 ? 1 : -1;
      const factor  = 1.08;
      const newScale = clampScale(scale * (direction > 0 ? factor : 1 / factor));
      const mousePointTo = {
        x: (pointer.x - position.x) / scale,
        y: (pointer.y - position.y) / scale,
      };
      onScaleChange(newScale);
      onPositionChange({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [scale, position, onScaleChange, onPositionChange]
  );


  if (!size.width) return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;

  const hudX = -position.x / scale;
  const hudY = -position.y / scale;
  const hudS = 1 / scale;

  const arrowX = size.width  - 72;
  const arrowY = 72;

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        onWheel={handleWheel}
      >
        {/* Plan layer */}
        <Layer>
          {image ? (
            <KonvaImage image={image} />
          ) : isRectMode && rectW > 0 ? (
            <Rect
              x={0}
              y={0}
              width={rectW}
              height={rectH}
              fill="rgba(52,211,153,0.12)"
              stroke="rgba(52,211,153,0.55)"
              strokeWidth={2 / scale}
              cornerRadius={4 / scale}
            />
          ) : null}
        </Layer>

        {/* Sun light layer */}
        {sunAzimuth != null && sunAltitude != null && (
          <Layer x={hudX} y={hudY} scaleX={hudS} scaleY={hudS}>
            <SunLightLayer
              azimuth={sunAzimuth}
              altitude={sunAltitude}
              decHour={sunDecHour}
              northBearing={northBearing}
              canvasWidth={size.width}
              canvasHeight={size.height}
            />
          </Layer>
        )}

        {/* HUD layer */}
        <Layer x={hudX} y={hudY} scaleX={hudS} scaleY={hudS}>
          <NorthArrow
            x={arrowX}
            y={arrowY}
            bearing={northBearing}
            onChange={onBearingChange}
          />
        </Layer>
      </Stage>
    </div>
  );
}
