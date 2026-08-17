// Test exactly what the SunMoonTool does
const lat = -15.7801
const lon = -47.9292
const now = new Date()
console.log('now:', now.toISOString())
console.log('now locale:', now.toLocaleString('pt-BR'))

function calcSunTimes(lat, lon, date) {
  const rad = Math.PI / 180
  const start = new Date(Date.UTC(date.getFullYear(), 0, 0))
  const diff = date.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / 86400000)
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1)
  const declination = 0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148 * Math.sin(3 * gamma)
  const eqTime = 229.18 * (0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma))
  const zenith = 90.833
  const latRad = lat * rad
  const cosH = (Math.cos(zenith * rad) - Math.sin(latRad) * Math.sin(declination))
    / (Math.cos(latRad) * Math.cos(declination))
  if (cosH > 1 || cosH < -1) return { sunrise: null, sunset: null, solarNoon: null }
  const H = Math.acos(cosH) * 180 / Math.PI
  const sunriseMin = 720 - 4 * (lon + H) - eqTime
  const sunsetMin = 720 - 4 * (lon - H) - eqTime
  const solarNoonMin = 720 - 4 * lon - eqTime
  const baseDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  return {
    sunrise: new Date(baseDate.getTime() + sunriseMin * 60000),
    sunset: new Date(baseDate.getTime() + sunsetMin * 60000),
    solarNoon: new Date(baseDate.getTime() + solarNoonMin * 60000),
  }
}

const sun = calcSunTimes(lat, lon, now)
console.log('sunrise:', sun.sunrise?.toISOString())
console.log('sunset:', sun.sunset?.toISOString())
console.log('solarNoon:', sun.solarNoon?.toISOString())
console.log('sunrise_local (pt-BR):', sun.sunrise?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
console.log('sunset_local (pt-BR):', sun.sunset?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
console.log('solarNoon_local (pt-BR):', sun.solarNoon?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))

// Daylight
if (sun.sunrise && sun.sunset) {
  const diff = sun.sunset.getTime() - sun.sunrise.getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  console.log(`daylight: ${h}h ${m}min`)
}
