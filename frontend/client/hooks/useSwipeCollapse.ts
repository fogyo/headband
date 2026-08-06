import { useState, useRef, TouchEvent } from "react";

const SWIPE_THRESHOLD = 50; // минимальное смещение для срабатывания

export function useSwipeCollapse(initialState = false) {
  const [isCollapsed, setIsCollapsed] = useState(initialState);
  const startY = useRef<number | null>(null);
  const startX = useRef<number | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    startY.current = touch.clientY;
    startX.current = touch.clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (startY.current === null || startX.current === null) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - startY.current;
    const deltaX = touch.clientX - startX.current;

    // Игнорируем, если движение больше по горизонтали (скролл внутри)
    if (Math.abs(deltaX) > Math.abs(deltaY)) return;

    if (deltaY > SWIPE_THRESHOLD) {
      // свайп вниз → сворачиваем
      setIsCollapsed(true);
      startY.current = null;
      startX.current = null;
    } else if (deltaY < -SWIPE_THRESHOLD) {
      // свайп вверх → разворачиваем
      setIsCollapsed(false);
      startY.current = null;
      startX.current = null;
    }
  };

  const handleTouchEnd = () => {
    startY.current = null;
    startX.current = null;
  };

  const toggleCollapse = () => setIsCollapsed(prev => !prev);

  return {
    isCollapsed,
    setIsCollapsed,
    toggleCollapse,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}