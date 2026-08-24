export {}

declare global {
  interface Navigator {
    /** Safari/iOS PWA standalone mode flag. */
    standalone?: boolean
  }
}
