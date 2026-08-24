declare module 'qrcode' {
  interface QRCodeToDataURLOptions {
    width?: number
    margin?: number
    color?: {
      dark?: string
      light?: string
    }
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  }

  const QRCode: {
    toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>
  }

  export default QRCode
}
