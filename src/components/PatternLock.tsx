import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Lock, RotateCcw, Check, AlertCircle, KeyRound, Sparkles } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface PatternLockProps {
  mode: 'set' | 'unlock';
  storedPattern?: number[];
  onSuccess: (pattern: number[]) => void;
  onCancel?: () => void;
}

export const PatternLock: React.FC<PatternLockProps> = ({
  mode,
  storedPattern,
  onSuccess,
  onCancel,
}) => {
  // Setup state: 'draw_first' -> 'draw_confirm'
  const [setupStep, setSetupStep] = useState<'first' | 'confirm'>('first');
  const [firstPattern, setFirstPattern] = useState<number[]>([]);
  const [currentPath, setCurrentPath] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'normal' | 'success' | 'error';
  }>({
    text: mode === 'set' ? '请滑动绘制锁屏图案 (至少连接4个点)' : '请绘制锁屏手势图案解锁',
    type: 'normal',
  });
  const [isErrorShake, setIsErrorShake] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dotCenters, setDotCenters] = useState<Point[]>([]);

  // Update dot coordinates based on bounding rect
  const updateDotPositions = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const size = rect.width;
    const padding = size * 0.16;
    const step = (size - padding * 2) / 2;

    const points: Point[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        points.push({
          x: padding + col * step,
          y: padding + row * step,
        });
      }
    }
    setDotCenters(points);
  }, []);

  useEffect(() => {
    updateDotPositions();
    window.addEventListener('resize', updateDotPositions);
    return () => window.removeEventListener('resize', updateDotPositions);
  }, [updateDotPositions]);

  // Find dot near client coordinate
  const getDotIndexNear = (clientX: number, clientY: number): number | null => {
    if (!containerRef.current || dotCenters.length < 9) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const hitRadius = (rect.width / 6) * 1.1;

    for (let i = 0; i < dotCenters.length; i++) {
      const dot = dotCenters[i];
      const dx = x - dot.x;
      const dy = y - dot.y;
      if (Math.hypot(dx, dy) <= hitRadius) {
        return i;
      }
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isErrorShake) return;

    const dotIdx = getDotIndexNear(e.clientX, e.clientY);
    setIsDrawing(true);
    if (dotIdx !== null) {
      setCurrentPath([dotIdx]);
    } else {
      setCurrentPath([]);
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    const dotIdx = getDotIndexNear(e.clientX, e.clientY);
    if (dotIdx !== null && !currentPath.includes(dotIdx)) {
      // Add dot to path
      setCurrentPath((prev) => [...prev, dotIdx]);
    }
  };

  const triggerError = (msg: string) => {
    setIsErrorShake(true);
    setStatusMessage({ text: msg, type: 'error' });
    setTimeout(() => {
      setIsErrorShake(false);
      setCurrentPath([]);
      setCursorPos(null);
      if (mode === 'set' && setupStep === 'confirm') {
        setStatusMessage({ text: '请再次绘制确认图案', type: 'normal' });
      } else if (mode === 'set') {
        setStatusMessage({ text: '请重新绘制图案 (至少4个点)', type: 'normal' });
      } else {
        setStatusMessage({ text: '请重新绘制图案解锁', type: 'normal' });
      }
    }, 900);
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setCursorPos(null);

    const path = currentPath;
    if (path.length === 0) return;

    if (mode === 'set') {
      if (setupStep === 'first') {
        if (path.length < 4) {
          triggerError('图案太简单，请连接至少 4 个点');
          return;
        }
        setFirstPattern(path);
        setSetupStep('confirm');
        setCurrentPath([]);
        setStatusMessage({ text: '请再次绘制图案以确认', type: 'normal' });
      } else {
        // Confirm step
        const isMatch =
          path.length === firstPattern.length &&
          path.every((val, idx) => val === firstPattern[idx]);

        if (isMatch) {
          setStatusMessage({ text: '手势图案设置成功！', type: 'success' });
          setTimeout(() => {
            onSuccess(path);
          }, 400);
        } else {
          triggerError('两次绘制图案不一致，请重新确认');
          setTimeout(() => {
            setSetupStep('first');
            setFirstPattern([]);
            setStatusMessage({ text: '请重新绘制图案 (至少4个点)', type: 'normal' });
          }, 1000);
        }
      }
    } else {
      // Unlock mode
      if (!storedPattern || storedPattern.length === 0) {
        // If not set, let any pass
        onSuccess(path);
        return;
      }

      const isMatch =
        path.length === storedPattern.length &&
        path.every((val, idx) => val === storedPattern[idx]);

      if (isMatch) {
        setStatusMessage({ text: '解锁成功！正在进入私密空间...', type: 'success' });
        setTimeout(() => {
          onSuccess(path);
        }, 350);
      } else {
        triggerError('手势图案错误，请重试');
      }
    }
  };

  const handleResetSetup = () => {
    setSetupStep('first');
    setFirstPattern([]);
    setCurrentPath([]);
    setCursorPos(null);
    setStatusMessage({ text: '请绘制锁屏图案 (至少连接4个点)', type: 'normal' });
  };

  return (
    <div className="flex flex-col items-center select-none w-full max-w-xs mx-auto">
      {/* Status Header */}
      <div className="w-full text-center space-y-1 mb-4">
        <div className="flex items-center justify-center gap-2">
          {mode === 'set' ? (
            <KeyRound className="w-5 h-5 text-purple-500" />
          ) : (
            <Lock className="w-5 h-5 text-purple-500" />
          )}
          <span className="font-semibold text-sm text-theme-primary">
            {mode === 'set'
              ? setupStep === 'first'
                ? '设置手势锁图案'
                : '确认手势锁图案'
              : '私密导航手势解锁'}
          </span>
        </div>
        <p
          className={`text-xs transition-colors duration-200 ${
            statusMessage.type === 'error'
              ? 'text-red-500 font-medium'
              : statusMessage.type === 'success'
              ? 'text-emerald-500 font-medium'
              : 'text-theme-muted'
          }`}
        >
          {statusMessage.text}
        </p>
      </div>

      {/* 9-Dot Canvas Board */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-64 h-64 rounded-3xl bg-theme-base border border-theme-default shadow-inner touch-none cursor-crosshair overflow-hidden transition-transform ${
          isErrorShake ? 'animate-shake' : ''
        }`}
      >
        {/* SVG Drawing Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Connected dots lines */}
          {currentPath.map((dotIdx, i) => {
            if (i === 0) return null;
            const prevDot = dotCenters[currentPath[i - 1]];
            const currDot = dotCenters[dotIdx];
            if (!prevDot || !currDot) return null;

            return (
              <line
                key={`line-${i}`}
                x1={prevDot.x}
                y1={prevDot.y}
                x2={currDot.x}
                y2={currDot.y}
                stroke={isErrorShake ? '#ef4444' : '#a855f7'}
                strokeWidth="5"
                strokeLinecap="round"
                className="transition-colors duration-200"
              />
            );
          })}

          {/* Line to current pointer position */}
          {isDrawing && currentPath.length > 0 && cursorPos && (
            <line
              x1={dotCenters[currentPath[currentPath.length - 1]]?.x ?? 0}
              y1={dotCenters[currentPath[currentPath.length - 1]]?.y ?? 0}
              x2={cursorPos.x}
              y2={cursorPos.y}
              stroke={isErrorShake ? '#ef4444' : '#c084fc'}
              strokeWidth="4"
              strokeDasharray="4 4"
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* 9 Dots */}
        {dotCenters.map((pt, idx) => {
          const isSelected = currentPath.includes(idx);
          const isCurrentEnd = currentPath[currentPath.length - 1] === idx;

          return (
            <div
              key={idx}
              style={{ left: pt.x, top: pt.y }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
            >
              {/* Outer Halo */}
              <div
                className={`rounded-full transition-all duration-200 ${
                  isSelected
                    ? isErrorShake
                      ? 'w-10 h-10 bg-red-500/20 border-2 border-red-500 scale-110'
                      : 'w-10 h-10 bg-purple-500/20 border-2 border-purple-500 scale-110'
                    : 'w-8 h-8 bg-theme-surface border border-theme-subtle'
                }`}
              />

              {/* Inner Dot Center */}
              <div
                className={`absolute rounded-full transition-all duration-200 ${
                  isSelected
                    ? isErrorShake
                      ? 'w-4 h-4 bg-red-500'
                      : isCurrentEnd
                      ? 'w-4 h-4 bg-purple-400 ring-2 ring-purple-300'
                      : 'w-3 h-3 bg-purple-500'
                    : 'w-2.5 h-2.5 bg-theme-muted group-hover:bg-theme-primary'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between w-full mt-4 text-xs">
        {mode === 'set' && setupStep === 'confirm' ? (
          <button
            type="button"
            onClick={handleResetSetup}
            className="flex items-center gap-1 text-theme-muted hover:text-theme-primary transition-colors cursor-pointer py-1 px-2 rounded-lg"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重新录入图案</span>
          </button>
        ) : (
          <span className="text-[11px] text-theme-muted flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>连结圆点完成手势</span>
          </span>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-theme-muted hover:text-red-500 transition-colors cursor-pointer py-1 px-2 rounded-lg"
          >
            取消退出
          </button>
        )}
      </div>
    </div>
  );
};
