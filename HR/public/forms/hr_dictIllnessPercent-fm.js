/* global AC */
exports.formCode = {
  initComponentStart,
  initComponentDone
}

function initComponentStart () {

}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}
