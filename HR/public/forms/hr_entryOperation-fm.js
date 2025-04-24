/* global AC */
exports.formCode = {
  initComponentStart
}

function initComponentStart () {
  const me = this
  me.gridConfig = {
    detailGrids: ['entryAcc']
  }
  AC.acEditGridManager.init(me)
}
