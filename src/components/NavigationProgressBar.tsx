'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function NavigationProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Whenever pathname or searchParams change, navigation has completed
    setProgress(100)
    const timeout = setTimeout(() => {
      setIsNavigating(false)
      setProgress(0)
    }, 250)
    return () => clearTimeout(timeout)
  }, [pathname, searchParams])

  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      const targetAttr = target.getAttribute('target')

      // Only handle internal navigation
      if (
        href &&
        href.startsWith('/') &&
        !href.startsWith('/#') &&
        targetAttr !== '_blank' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        if (href !== window.location.pathname + window.location.search) {
          setIsNavigating(true)
          setProgress(30)
          setTimeout(() => setProgress(75), 150)
        }
      }
    }

    const handleCustomNav = () => {
      setIsNavigating(true)
      setProgress(30)
      setTimeout(() => setProgress(75), 150)
    }

    document.addEventListener('click', handleLinkClick, true)
    window.addEventListener('start-navigation', handleCustomNav)
    return () => {
      document.removeEventListener('click', handleLinkClick, true)
      window.removeEventListener('start-navigation', handleCustomNav)
    }
  }, [])

  if (!isNavigating && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none h-1 bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-teal-500 via-amber-400 to-teal-600 transition-all duration-300 ease-out shadow-sm shadow-teal-500/30"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition: progress === 100 ? 'width 200ms ease-out, opacity 250ms ease-in' : 'width 300ms ease-out',
        }}
      />
    </div>
  )
}
