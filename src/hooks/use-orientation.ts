'use client'

import { useEffect, useState } from 'react'

export type Orientation = 'portrait' | 'landscape'
export type LayoutMode = 'mobile-portrait' | 'mobile-landscape' | 'tablet' | 'desktop'

interface OrientationState {
  orientation: Orientation
  layout: LayoutMode
  isLandscape: boolean
  isWide: boolean // largura >= 1024px
  isTablet: boolean // largura >= 768px
  hasNotch: boolean
  safeArea: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

/**
 * Detecta orientação e modo de layout do dispositivo.
 * - Celular em retrato: tabs no topo
 * - Celular em paisagem: sidebar à esquerda + conteúdo à direita
 * - Tablet/desktop: sidebar à esquerda expandida
 */
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

    const update = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const isLandscape = w > h
      const isWide = w >= 1024
      const isTablet = w >= 768

      let layout: LayoutMode = 'mobile-portrait'
      if (isWide) layout = 'desktop'
      else if (isTablet) layout = 'tablet'
      else if (isLandscape) layout = 'mobile-landscape'
      else layout = 'mobile-portrait'

      // Detect notch / dynamic island via env() (apenas iOS)
      const cs = getComputedStyle(document.documentElement)
      const safeArea = {
        top: parseInt(cs.getPropertyValue('--sat-top') || '0', 10) || 0,
        bottom: parseInt(cs.getPropertyValue('--sat-bottom') || '0', 10) || 0,
        left: parseInt(cs.getPropertyValue('--sat-left') || '0', 10) || 0,
        right: parseInt(cs.getPropertyValue('--sat-right') || '0', 10) || 0,
      }
      const hasNotch = safeArea.top > 0 || safeArea.bottom > 0

      setState({
        orientation: isLandscape ? 'landscape' : 'portrait',
        layout,
        isLandscape,
        isWide,
        isTablet,
        hasNotch,
        safeArea,
      })
    }

    // CSS env() não é legível via getComputedStyle direto — precisamos de um truco
    // usando um elemento temporário com position fixed e padding env()
    const probe = document.createElement('div')
    probe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right);visibility:hidden;pointer-events:none;'
    document.body.appendChild(probe)
    const cs = getComputedStyle(probe)
    document.documentElement.style.setProperty(
      '--sat-top',
      cs.paddingTop || '0px'
    )
    document.documentElement.style.setProperty(
      '--sat-bottom',
      cs.paddingBottom || '0px'
    )
    document.documentElement.style.setProperty(
      '--sat-left',
      cs.paddingLeft || '0px'
    )
    document.documentElement.style.setProperty(
      '--sat-right',
      cs.paddingRight || '0px'
    )
    document.body.removeChild(probe)

    update()

    // ResizeObserver cobre rotação + mudança de viewport
    const ro = new ResizeObserver(update)
    ro.observe(document.documentElement)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', () => {
      // espera a rotação completar
      setTimeout(update, 250)
    })

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  return state
}
