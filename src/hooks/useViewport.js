import { useEffect, useState } from 'react'

export default function useViewport() {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1440))

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return { width, isMobile: width < 640, isNarrow: width < 1024 }
}
