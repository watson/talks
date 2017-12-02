'use strict'

const fs = require('fs')
const http = require('http')
const rtlsdr = require('rtl-sdr')
const decoder = require('mode-s-decoder')

const server = http.createServer(function (req, res) {
  console.log(req.method, req.url)
  switch (req.url) {
    case '/':
      fs.createReadStream('index.html').pipe(res)
      break
    case '/plane.png':
      fs.createReadStream('plane.png').pipe(res)
      break
    case '/planes':
      const pos = Object.keys(aircrafts)
        .filter(function (addr) {
          const a = aircrafts[addr]
          return a.lat
        })
        .map(function (addr) {
          const a = aircrafts[addr]
          return [addr, a.lat, a.lon]
        })
      res.end(JSON.stringify(pos))
      break
    default:
      res.statusCode = 404
      res.end()
  }
})

server.listen(3000)

const DEFAULT_RATE = 2000000
const DEFAULT_FREQ = 1090000000
const ASYNC_BUF_NUMBER = 12
const DATA_LEN = 16 * 16384    // 256k
const AUTO_GAIN = -100         // Use automatic gain
const MAX_GAIN = 999999        // Use max available gain

const aircrafts = {}
const self = decoder.init()
const dev = setup()
let mag

const noop = function () {}

rtlsdr.read_async(dev, onData, noop, ASYNC_BUF_NUMBER, DATA_LEN)

function onData (data, len) {
  if (!mag) mag = new Uint16Array(len / 2)
  decoder.computeMagnitudeVector(data, mag, len)
  decoder.detect(self, mag, len / 2, onMsg)
}

function onMsg (self, mm) {
  if (self.checkCrc && !mm.crcok) return null

  let addr = ((mm.aa1 << 16) | (mm.aa2 << 8) | mm.aa3).toString(16)
  let _mm = aircrafts[addr]
  mm.flight = mm.flight[0] && mm.flight.join('')

  if (_mm) {
    _mm.count++
    if (mm.flight) _mm.flight = mm.flight
    if (mm.altitude) _mm.altitude = mm.altitude
    if (mm.velocity) _mm.velocity = mm.velocity
    if (mm.heading) _mm.heading = mm.heading
    if (mm.rawLatitude) _mm.rawLatitude = mm.rawLatitude
    if (mm.rawLongitude) _mm.rawLongitude = mm.rawLongitude
  } else {
    mm.count = 1
    aircrafts[addr] = mm
  }

  if (mm.rawLatitude) {
    _mm = _mm || mm
    if (mm.fflag) {
      _mm.odd_cprlat = mm.rawLatitude
      _mm.odd_cprlon = mm.rawLongitude
      _mm.odd_cprtime = mstime()
    } else {
      _mm.even_cprlat = mm.rawLatitude
      _mm.even_cprlon = mm.rawLongitude
      _mm.even_cprtime = mstime()
    }
    if (Math.abs(_mm.even_cprtime - _mm.odd_cprtime) <= 10000) {
      decodeCPR(_mm)
    }
  }
}

function setup (opts) {
  opts = {
    gain: MAX_GAIN,
    dev_index: 0,
    enable_agc: true,
    freq: DEFAULT_FREQ
  }

  const ppmError = 0
  const vendor = Buffer.alloc(256)
  const product = Buffer.alloc(256)
  const serial = Buffer.alloc(256)

  const deviceCount = rtlsdr.get_device_count()
  if (!deviceCount) {
    console.log('No supported RTLSDR devices found.')
    process.exit(1)
  }

  console.log('Found %d device(s):', deviceCount)
  for (let j = 0; j < deviceCount; j++) {
    rtlsdr.get_device_usb_strings(j, vendor, product, serial)
    console.log('%d: %s, %s, SN: %s %s', j, vendor, product, serial,
        (j === opts.dev_index) ? '(currently selected)' : '')
  }

  const dev = rtlsdr.open(opts.dev_index)
  if (typeof dev === 'number') {
    console.log('Error opening the RTLSDR device: %s', dev)
    process.exit(1)
  }

  // Set gain, frequency, sample rate, and reset the device
  rtlsdr.set_tuner_gain_mode(dev,
      (opts.gain === AUTO_GAIN) ? 0 : 1)
  if (opts.gain !== AUTO_GAIN) {
    if (opts.gain === MAX_GAIN) {
      // Find the maximum gain available
      const gains = new Int32Array(100)
      const numgains = rtlsdr.get_tuner_gains(dev, gains)
      opts.gain = gains[numgains - 1]
      console.log('Max available gain is: %d', opts.gain / 10)
    }
    rtlsdr.set_tuner_gain(dev, opts.gain)
    console.log('Setting gain to: %d', opts.gain / 10)
  } else {
    console.log('Using automatic gain control.')
  }
  rtlsdr.set_freq_correction(dev, ppmError)
  if (opts.enable_agc) rtlsdr.set_agc_mode(dev, 1)
  rtlsdr.set_center_freq(dev, opts.freq)
  rtlsdr.set_sample_rate(dev, DEFAULT_RATE)
  rtlsdr.reset_buffer(dev)
  console.log('Gain reported by device: %d', rtlsdr.get_tuner_gain(dev) / 10)

  return dev
}

/* This algorithm comes from:
 * http://www.lll.lu/~edward/edward/adsb/DecodingADSBposition.html.
 *
 *
 * A few remarks:
 * 1) 131072 is 2^17 since CPR latitude and longitude are encoded in 17 bits.
 * 2) We assume that we always received the odd packet as last packet for
 *    simplicity. This may provide a position that is less fresh of a few
 *    seconds.
 */
function decodeCPR (a) {
  const AirDlat0 = 360.0 / 60
  const AirDlat1 = 360.0 / 59
  let lat0 = a.even_cprlat
  let lat1 = a.odd_cprlat
  let lon0 = a.even_cprlon
  let lon1 = a.odd_cprlon

  /* Compute the Latitude Index "j" */
  const j = Math.floor(((59 * lat0 - 60 * lat1) / 131072) + 0.5)
  let rlat0 = AirDlat0 * (cprModFunction(j, 60) + lat0 / 131072)
  let rlat1 = AirDlat1 * (cprModFunction(j, 59) + lat1 / 131072)

  if (rlat0 >= 270) rlat0 -= 360
  if (rlat1 >= 270) rlat1 -= 360

  /* Check that both are in the same latitude zone, or abort. */
  if (cprNLFunction(rlat0) !== cprNLFunction(rlat1)) return

  /* Compute ni and the longitude index m */
  if (a.even_cprtime > a.odd_cprtime) {
    /* Use even packet. */
    const ni = cprNFunction(rlat0, 0)
    const m = Math.floor((((lon0 * (cprNLFunction(rlat0) - 1)) -
                    (lon1 * cprNLFunction(rlat0))) / 131072) + 0.5)
    a.lon = cprDlonFunction(rlat0, 0) * (cprModFunction(m, ni) + lon0 / 131072)
    a.lat = rlat0
  } else {
    /* Use odd packet. */
    const ni = cprNFunction(rlat1, 1)
    const m = Math.floor((((lon0 * (cprNLFunction(rlat1) - 1)) -
                    (lon1 * cprNLFunction(rlat1))) / 131072.0) + 0.5)
    a.lon = cprDlonFunction(rlat1, 1) * (cprModFunction(m, ni) + lon1 / 131072)
    a.lat = rlat1
  }
  if (a.lon > 180) a.lon -= 360
}

/* Always positive MOD operation, used for CPR decoding. */
function cprModFunction (a, b) {
  let res = a % b
  if (res < 0) res += b
  return res
}

function cprNFunction (lat, isodd) {
  let nl = cprNLFunction(lat) - isodd
  if (nl < 1) nl = 1
  return nl
}

function cprDlonFunction (lat, isodd) {
  return 360.0 / cprNFunction(lat, isodd)
}

/* The NL function uses the precomputed table from 1090-WP-9-14 */
function cprNLFunction (lat) {
  if (lat < 0) lat = -lat /* Table is simmetric about the equator. */
  if (lat < 10.47047130) return 59
  if (lat < 14.82817437) return 58
  if (lat < 18.18626357) return 57
  if (lat < 21.02939493) return 56
  if (lat < 23.54504487) return 55
  if (lat < 25.82924707) return 54
  if (lat < 27.93898710) return 53
  if (lat < 29.91135686) return 52
  if (lat < 31.77209708) return 51
  if (lat < 33.53993436) return 50
  if (lat < 35.22899598) return 49
  if (lat < 36.85025108) return 48
  if (lat < 38.41241892) return 47
  if (lat < 39.92256684) return 46
  if (lat < 41.38651832) return 45
  if (lat < 42.80914012) return 44
  if (lat < 44.19454951) return 43
  if (lat < 45.54626723) return 42
  if (lat < 46.86733252) return 41
  if (lat < 48.16039128) return 40
  if (lat < 49.42776439) return 39
  if (lat < 50.67150166) return 38
  if (lat < 51.89342469) return 37
  if (lat < 53.09516153) return 36
  if (lat < 54.27817472) return 35
  if (lat < 55.44378444) return 34
  if (lat < 56.59318756) return 33
  if (lat < 57.72747354) return 32
  if (lat < 58.84763776) return 31
  if (lat < 59.95459277) return 30
  if (lat < 61.04917774) return 29
  if (lat < 62.13216659) return 28
  if (lat < 63.20427479) return 27
  if (lat < 64.26616523) return 26
  if (lat < 65.31845310) return 25
  if (lat < 66.36171008) return 24
  if (lat < 67.39646774) return 23
  if (lat < 68.42322022) return 22
  if (lat < 69.44242631) return 21
  if (lat < 70.45451075) return 20
  if (lat < 71.45986473) return 19
  if (lat < 72.45884545) return 18
  if (lat < 73.45177442) return 17
  if (lat < 74.43893416) return 16
  if (lat < 75.42056257) return 15
  if (lat < 76.39684391) return 14
  if (lat < 77.36789461) return 13
  if (lat < 78.33374083) return 12
  if (lat < 79.29428225) return 11
  if (lat < 80.24923213) return 10
  if (lat < 81.19801349) return 9
  if (lat < 82.13956981) return 8
  if (lat < 83.07199445) return 7
  if (lat < 83.99173563) return 6
  if (lat < 84.89166191) return 5
  if (lat < 85.75541621) return 4
  if (lat < 86.53536998) return 3
  if (lat < 87.00000000) return 2
  else return 1
}

function mstime () {
  return Date.now()
}
