/* global AC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onControlChanged
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  me.on('recordloaded', function () {
    const me = this
    if (me.isNewInstance && me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        me.record.set(name, value)
      })
    }
  })
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  AC.viewUtils.setFilterValue(me.attr.employeeFamilyID, {
    'employeeID': me.record.get('employeeID')
  })
}

function onControlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'dictSickLimitID':
        me.attr.employeeFamilyID.setValueById(null)
        me.attr.avgSum.setValue(null)
        me.attr.typeSickLimit.setValue(field.getFieldValue('typeSickLimit') || null)
        break
    }
  }
}