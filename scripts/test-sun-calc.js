// Testar cálculo de sunrise/sunset
const lat = -15.7801
const lon = -47.9292
const date = new Date()

const rad = Math.PI / 180

const start = new Date(Date.UTC(date.getFullYear(), 0, 0))
const diff = date.getTime() - start.getTime()
const dayOfYear = Math.floor(diff / 86400000)
console.log('dayOfYear:', dayOfYear)

const gamma = (2 * Math.PI / 365) * (dayOfYear - 1)
console.log('gamma:', gamma.toFixed(4))

const declination = 0.006918
  - 0.399912 * Math.cos(gamma)
  + 0.070257 * Math.sin(gamma)
  - 0.006758 * Math.cos(2 * gamma)
  + 0.000907 * Math.sin(2 * gamma)
  - 0.002697 * Math.cos(3 * gamma)
  + 0.00148 * Math.sin(3 * gamma)
console.log('declination (rad):', declination.toFixed(4), '(deg):', (declination * 180 / Math.PI).toFixed(2))

const eqTime = 229.18 * (0.000075
  + 0.001868 * Math.cos(gamma)
  - 0.032077 * Math.sin(gamma)
  - 0.014615 * Math.cos(2 * gamma)
  - 0.040849 * Math.sin(2 * gamma))
console.log('eqTime (min):', eqTime.toFixed(2))

const zenith = 90.833
const latRad = lat * rad
const cosH = (Math.cos(zenith * rad) - Math.sin(latRad) * Math.sin(declination))
  / (Math.cos(latRad) * Math.cos(declination))
console.log('cosH:', cosH.toFixed(4))

const H = Math.acos(cosH) * 180 / Math.PI
console.log('H (deg):', H.toFixed(2))

const sunriseMin = 720 - 4 * (lon + H) - eqTime
const sunsetMin = 720 - 4 * (lon - H) - eqTime
const solarNoonMin = 720 - 4 * lon - eqTime
console.log('sunriseMin:', sunriseMin.toFixed(2), '= ', Math.floor(sunriseMin/60), 'h', Math.round(sunriseMin%60), 'min UTC')
console.log('sunsetMin:', sunsetMin.toFixed(2), '= ', Math.floor(sunsetMin/60), 'h', Math.round(sunsetMin%60), 'min UTC')
console.log('solarNoonMin:', solarNoonMin.toFixed(2), '= ', Math.floor(solarNoonMin/60), 'h', Math.round(solarNoonMin%60), 'min UTC')

// BRT = UTC-3
console.log('\nEm BRT (UTC-3):')
console.log('sunrise:', Math.floor((sunriseMin/60 - 3 + 24) % 24), 'h', Math.round(sunriseMin%60), 'min')
console.log('sunset:', Math.floor((sunsetMin/60 - 3 + 24) % 24), 'h', Math.round(sunsetMin%60), 'min')
console.log('solar noon:', Math.floor((solarNoonMin/60 - 3 + 24) % 24), 'h', Math.round(solarNoonMin%60), 'min')
