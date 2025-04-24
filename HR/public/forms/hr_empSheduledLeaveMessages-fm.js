/* global AC UB */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onControlChanged
}

function initComponentStart () {
  let me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('date', AC.dateService.todayDate())
  }
}

async function onControlChanged (field, value) {
  const me = this
  if (field.getName() === 'orderID') {
    AC.viewUtils.setFilterValue(
      me.attr.employeeNumberID, {
        // ID: me.attr.orderID.getFieldValue('respEmployeeNumID')
        ID: me.attr.orderID.getFieldValue('respEmployeeNumID')
        UB.Repository('hr_empOrderEmployeeDet')
      }
    )
  }
}
