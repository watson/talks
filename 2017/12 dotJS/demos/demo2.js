'use strict'

const rtlsdr = require('rtl-sdr')
const decoder = require('mode-s-decoder')

const DEFAULT_RATE = 2000000
const DEFAULT_FREQ = 1090000000
const ASYNC_BUF_NUMBER = 12
const DATA_LEN = 16 * 16384    // 256k
const AUTO_GAIN = -100         // Use automatic gain
const MAX_GAIN = 999999        // Use max available gain

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
  const msghex = Buffer.from(mm.msg.buffer, 0, mm.msgbits / 8).toString('hex')
  console.log(msghex)
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
