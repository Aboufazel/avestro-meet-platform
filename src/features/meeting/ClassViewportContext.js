import { createContext, useContext } from 'react'

/** { rotated, compact, lw, lh, toLocalDelta } — از useClassViewport در RoomPage. */
export const ClassViewportContext = createContext({
  rotated: false,
  compact: false,
  lw: 0,
  lh: 0,
  toLocalDelta: (dx, dy) => ({ x: dx, y: dy }),
})

export const useViewportContext = () => useContext(ClassViewportContext)
