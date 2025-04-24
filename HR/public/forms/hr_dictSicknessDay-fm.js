/* global AC UB */

exports.formCode = {
  initComponentDone
}

function initComponentDone () {
  const me = this

  if (me.isNewInstance) {
    UB.Repository('hr_dictIllnessReason')
      .attrs(['ID'])
      .orderBy('orderN')
      .selectScalar().then(dictIllnessReasonID => {
        if (dictIllnessReasonID) {
          me.record.set('dictIllnessReasonID', dictIllnessReasonID)
        }
      })
  }
  AC.viewUtils.setAttr(me)
}
