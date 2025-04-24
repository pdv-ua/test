/* global AC */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  onControlChanged
}

function initComponentStart () {
  const me = this
  me.on('controlchanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onControlChanged (field) {
  const me = this
  if (['dictBalanceUnitID', 'dictActivityTypeID', 'dictCostPlaceTypeID', 'dictAdministrationID', 'dictCostPlaceNumberID'].includes(field.name)) {
    const dictBalanceUnitCode = me.attr.dictBalanceUnitID.getFieldValue('code') || ''
    const dictActivityTypeCode = me.attr.dictActivityTypeID.getFieldValue('code') || ''
    const dictCostPlaceTypeCode = me.attr.dictCostPlaceTypeID.getFieldValue('code') || ''
    const dictDepCostKindCode = me.attr.dictDepCostKindID.getFieldValue('code') || ''
    const dictCostPlaceNumber = me.attr.dictCostPlaceNumberID.getFieldValue('code') || ''
    const code = dictBalanceUnitCode + dictActivityTypeCode + dictCostPlaceTypeCode + dictDepCostKindCode + dictCostPlaceNumber
    me.attr.code.setValue(code)
  }
}
