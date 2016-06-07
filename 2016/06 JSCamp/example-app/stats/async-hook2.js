'use strict'

// The bulk of this code is borrowed from:
// https://github.com/othiym23/async-listener

var util = require('util')
var shimmer = require('shimmer')
var isNative = require('is-native')
var wrap = shimmer.wrap
var massWrap = shimmer.massWrap

module.exports = function (agent) {
  function wrapCallback (original) {
    if (typeof original !== 'function') return original

    var trans = agent.currentTransaction

    return function instrumented () {
      var prev = agent.currentTransaction
      agent.currentTransaction = trans
      var result = original.apply(this, arguments)
      agent.currentTransaction = prev
      return result
    }
  }

  wrap(process, 'nextTick', activatorFirst)

  var asynchronizers = [
    'setTimeout',
    'setInterval'
  ]
  if (global.setImmediate) asynchronizers.push('setImmediate')

  var timers = require('timers')
  var patchGlobalTimers = global.setTimeout === timers.setTimeout

  massWrap(
    timers,
    asynchronizers,
    activatorFirst
  )

  if (patchGlobalTimers) {
    massWrap(
      global,
      asynchronizers,
      activatorFirst
    )
  }

  var instrumentPromise = isNative(global.Promise)

  /*
   * Native promises use the microtask queue to make all callbacks run
   * asynchronously to avoid Zalgo issues. Since the microtask queue is not
   * exposed externally, promises need to be modified in a fairly invasive and
   * complex way.
   *
   * The async boundary in promises that must be patched is between the
   * fulfillment of the promise and the execution of any callback that is waiting
   * for that fulfillment to happen. This means that we need to trigger a create
   * when accept or reject is called and trigger before, after and error handlers
   * around the callback execution. There may be multiple callbacks for each
   * fulfilled promise, so handlers will behave similar to setInterval where
   * there may be multiple before after and error calls for each create call.
   *
   * async-listener monkeypatching has one basic entry point: `wrapCallback`.
   * `wrapCallback` should be called when create should be triggered and be
   * passed a function to wrap, which will execute the body of the async work.
   * The accept and reject calls can be modified fairly easily to call
   * `wrapCallback`, but at the time of accept and reject all the work to be done
   * on fulfillment may not be defined, since a call to then, chain or fetch can
   * be made even after the promise has been fulfilled. To get around this, we
   * create a placeholder function which will call a function passed into it,
   * since the call to the main work is being made from within the wrapped
   * function, async-listener will work correctly.
   *
   * There is another complication with monkeypatching Promises. Calls to then,
   * chain and catch each create new Promises that are fulfilled internally in
   * different ways depending on the return value of the callback. When the
   * callback return a Promise, the new Promise is resolved asynchronously after
   * the returned Promise has been also been resolved. When something other than
   * a promise is resolved the accept call for the new Promise is put in the
   * microtask queue and asynchronously resolved.
   *
   * Then must be wrapped so that its returned promise has a wrapper that can be
   * used to invoke further continuations. This wrapper cannot be created until
   * after the callback has run, since the callback may return either a promise
   * or another value. Fortunately we already have a wrapper function around the
   * callback we can use (the wrapper created by accept or reject).
   *
   * By adding an additional argument to this wrapper, we can pass in the
   * returned promise so it can have its own wrapper appended. the wrapper
   * function can the call the callback, and take action based on the return
   * value. If a promise is returned, the new Promise can proxy the returned
   * Promise's wrapper (this wrapper may not exist yet, but will by the time the
   * wrapper needs to be invoked). Otherwise, a new wrapper can be create the
   * same way as in accept and reject. Since this wrapper is created
   * synchronously within another wrapper, it will properly appear as a
   * continuation from within the callback.
   */

  if (instrumentPromise) {
    wrapPromise()
  }

  function wrapPromise () {
    var Promise = global.Promise

    function wrappedPromise (executor) {
      if (!(this instanceof wrappedPromise)) {
        return Promise(executor)
      }

      if (typeof executor !== 'function') {
        return new Promise(executor)
      }

      var context, args
      var promise = new Promise(wrappedExecutor)
      promise.__proto__ = wrappedPromise.prototype // eslint-disable-line no-proto

      try {
        executor.apply(context, args)
      } catch (err) {
        args[1](err)
      }

      return promise

      function wrappedExecutor (accept, reject) {
        context = this
        args = [wrappedAccept, wrappedReject]

        // These wrappers create a function that can be passed a function and an argument to
        // call as a continuation from the accept or reject.
        function wrappedAccept (val) {
          ensureAslWrapper(promise, false)
          return accept(val)
        }

        function wrappedReject (val) {
          ensureAslWrapper(promise, false)
          return reject(val)
        }
      }
    }

    util.inherits(wrappedPromise, Promise)

    wrap(Promise.prototype, 'then', wrapThen)
    wrap(Promise.prototype, 'chain', wrapThen)

    var PromiseMethods = ['accept', 'all', 'defer', 'race', 'reject', 'resolve']

    PromiseMethods.forEach(function (key) {
      wrappedPromise[key] = Promise[key]
    })

    global.Promise = wrappedPromise

    function ensureAslWrapper (promise) {
      if (!promise.__asl_wrapper) {
        promise.__asl_wrapper = wrapCallback(propagateAslWrapper)
      }
    }

    function propagateAslWrapper (ctx, fn, result, next) {
      var nextResult
      try {
        nextResult = fn.call(ctx, result)
        return {nextResult: nextResult, error: false}
      } catch (err) {
        return {errorVal: err, error: true}
      } finally {
        // Wrap any resulting futures as continuations.
        if (nextResult instanceof Promise) {
          next.__asl_wrapper = function proxyWrapper () {
            var aslWrapper = nextResult.__asl_wrapper || propagateAslWrapper
            return aslWrapper.apply(this, arguments)
          }
        } else {
          ensureAslWrapper(next, true)
        }
      }
    }

    function wrapThen (original) {
      return function wrappedThen () {
        var promise = this
        var next = original.apply(promise, Array.prototype.map.call(arguments, bind))

        next.__asl_wrapper = function proxyWrapper (ctx, fn, val, last) {
          if (promise.__asl_wrapper) {
            promise.__asl_wrapper(ctx, function () {}, null, next)
            return next.__asl_wrapper(ctx, fn, val, last)
          }
          return propagateAslWrapper(ctx, fn, val, last)
        }

        return next

        // wrap callbacks (success, error) so that the callbacks will be called as a
        // continuations of the accept or reject call using the __asl_wrapper created above.
        function bind (fn) {
          if (typeof fn !== 'function') return fn
          return function (val) {
            var result = (promise.__asl_wrapper || propagateAslWrapper)(this, fn, val, next)
            if (result.error) {
              throw result.errorVal
            } else {
              return result.returnVal
            }
          }
        }
      }
    }
  }

  // Shim activator for functions that have callback first
  function activatorFirst (fn) {
    var fallback = function () {
      if (typeof arguments[0] === 'function') {
        arguments[0] = wrapCallback(arguments[0])
      }
      return fn.apply(this, arguments)
    }
    // Preserve function length for small arg count functions.
    switch (fn.length) {
      case 1:
        return function (cb) {
          if (arguments.length !== 1) return fallback.apply(this, arguments)
          if (typeof cb === 'function') cb = wrapCallback(cb)
          return fn.call(this, cb)
        }
      case 2:
        return function (cb, a) {
          if (arguments.length !== 2) return fallback.apply(this, arguments)
          if (typeof cb === 'function') cb = wrapCallback(cb)
          return fn.call(this, cb, a)
        }
      case 3:
        return function (cb, a, b) {
          if (arguments.length !== 3) return fallback.apply(this, arguments)
          if (typeof cb === 'function') cb = wrapCallback(cb)
          return fn.call(this, cb, a, b)
        }
      case 4:
        return function (cb, a, b, c) {
          if (arguments.length !== 4) return fallback.apply(this, arguments)
          if (typeof cb === 'function') cb = wrapCallback(cb)
          return fn.call(this, cb, a, b, c)
        }
      case 5:
        return function (cb, a, b, c, d) {
          if (arguments.length !== 5) return fallback.apply(this, arguments)
          if (typeof cb === 'function') cb = wrapCallback(cb)
          return fn.call(this, cb, a, b, c, d)
        }
      case 6:
        return function (cb, a, b, c, d, e) {
          if (arguments.length !== 6) return fallback.apply(this, arguments)
          if (typeof cb === 'function') cb = wrapCallback(cb)
          return fn.call(this, cb, a, b, c, d, e)
        }
      default:
        return fallback
    }
  }
}
