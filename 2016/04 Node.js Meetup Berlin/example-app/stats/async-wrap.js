'use strict'

const asyncWrap = process.binding('async_wrap')
const TIMER = asyncWrap.Providers.TIMERWRAP

module.exports = function (agent) {
  asyncWrap.setupHooks(init, pre, post, destroy)
  asyncWrap.enable()

  const initState = new Map()
  const prevState = new Map()

  function init (uid, provider, parentUid, parentHandle) {
    if (provider === TIMER) return // some timers share the handle, so we have to manage them manually
    initState.set(uid, agent.currentTransaction)
  }

  function pre (uid) {
    if (!initState.has(uid)) return // in case provider === TIMER
    prevState.set(uid, agent.currentTransaction)
    agent.currentTransaction = initState.get(uid)
  }

  function post (uid) {
    if (!initState.has(uid)) return // in case provider === TIMER
    agent.currentTransaction = prevState.get(uid)
  }

  function destroy (uid) {
    if (!initState.has(uid)) return // in case provider === TIMER
    initState.delete(uid)
    prevState.delete(uid)
  }
}
