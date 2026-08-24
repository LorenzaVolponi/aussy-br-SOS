'use client'

import { useEffect, useState } from 'react'

export type Orientation = 'portrait' | 'landscape'
export type LayoutMode = 'mobile-portrait' | 'mobile-landscape' | 'tablet' | 'desktop'

interface OrientationState {
  orientation: Orientation
  layout: LayoutMode
  isLandscape: boolean
  isWide: boolean
  isTablet: boolean
  hasNotch: boolean
  safeArea: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

export function useOrientation(): OrientationState {
  const [state, setState] = useState<OrientationState>({
    orientation: 'portrait',
    layout: 'mobile-portrait',
    isLandscape: false,
    isWide: false,
    isTablet: false,
    hasNotch: false,
    safeArea: { top: 0, bottom: 0, left: 0, right: 0 },
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    let orientationTimer: ReturnType<typeof setTimeout> | null = null

    const update = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isLandscape = width > height
      const isWide = width >= 1024
      const isTablet = width >= 768

      let layout: LayoutMode = 'mobile-portrait'
      if (isWide) layout = 'desktop'
      else if (isTablet) layout = 'tablet'
      else if (isLandscape) layout = 'mobile-landscape'

      const rootStyle = getComputedStyle(document.documentElement)
      const safeArea = {
        top: parseInt(rootStyle.getPropertyValue('--sat-top') || '0', 10) || 0,
        bottom: parseInt(rootStyle.getPropertyValue('--sat-bottom') || '0', 10) || 0,
        left: parseInt(rootStyle.getPropertyValue('--sat-left') || '0', 10) || 0,
        right: parseInt(rootStyle.getPropertyValue('--sat-right') || '0', 10) || 0,
      }

      setState({
        orientation: isLandscape ? 'landscape' : 'portrait',
        layout,
        isLandscape,
        isWide,
        isTablet,
        hasNotch: safeArea.top > 0 || safeArea.bottom > 0,
        safeArea,
      })
    }

    const probe = document.createElement('div')
    probe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right);visibility:hidden;pointer-events:none;'
    document.body.appendChild(probe)
    const probeStyle = getComputedStyle(probe)
    document.documentElement.style.setProperty('--sat-top', probeStyle.paddingTop || '0px')
    document.documentElement.style.setProperty('--sat-bottom', probeStyle.paddingBottom || '0px')
    document.documentElement.style.setProperty('--sat-left', probeStyle.paddingLeft || '0px')
    document.documentElement.style.setProperty('--sat-right', probeStyle.paddingRight || '0px')
    document.body.removeChild(probe)

    const handleOrientationChange = () => {
      if (orientationTimer) clearTimeout(orientationTimer)
      orientationTimer = setTimeout(update, 250)
    }

    update()

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(update)
      : null

    resizeObserver?.observe(document.documentElement)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      if (orientationTimer) clearTimeout(orientationTimer)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])

  return state
}
