import { useState, useCallback } from 'react'

export function usePressable() {
  const [pressed, setPressed] = useState(false)

  const handleTouchStart = useCallback(() => setPressed(true), [])
  const handleTouchEnd   = useCallback(() => setPressed(false), [])

  return {
    pressed,
    handlers: {
      onTouchStart:  handleTouchStart,
      onTouchEnd:    handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
    style: {
      transform:  pressed ? 'scale(0.96)' : 'scale(1)',
      opacity:    pressed ? 0.85 : 1,
      transition: 'transform 0.1s ease, opacity 0.1s ease',
      willChange: 'transform',
    } as React.CSSProperties,
  }
}
