/* global AC $App HR UB */
exports.formCode = {
  controlChanged,
  initComponentStart,
  onFormDataReady,
  filterDepartment,
  filterPosition,
  enableControls,
  initComponentDone,
  onCheckValidBeforeSaveForm,
  setFilter,
  onAddNewGrid,
  startActingGridEdit,
  onRecordLoaded
}

function onAddNewGrid (grid) {
  let me = this
  if (!grid.editingPlugin.editing) {
    if ((me.isDirty() || me.isNewInstance)) {
      grid.notReload = true
      me.saveForm().then(function (result) {
        delete grid.notReload
        if (result !== -1) {
          grid.getStore().load(then => {
            setTimeout(() => {
              grid.addNewRecord(null, true)
            }, 500)
          })
        }
      })
    } else {
      grid.addNewRecord(null, true)
    }
  } else {
    $App.dialogInfo('rowEditing')
  }
}

function setFilter ({
  isClear,
  isReload
} = {}) {
  const me = this
  if (me.isReadOnly) {
    return
  }
  const dateFromCtrl = me.getField('dateFrom')
  const positionCtrl = me.getField('positionID')
  const employeePositionCtrl = me.getField('employeePositionID')
  if (!dateFromCtrl.isValid() || !positionCtrl.getValue()) {
    employeePositionCtrl.setDisabled(true)
    return
  }
  positionCtrl.setDisabled(false)
  employeePositionCtrl.setDisabled(false)
  const req = employeePositionCtrl.getStore().ubRequest
  const onDate = AC.dateService.truncTimeToUtcNull(dateFromCtrl.getValue())
  setTimeout(() => {
    const positionID = positionCtrl.getFieldValue('mi_data_id')
    req.whereList = {
      pos: {
        expression: '[positionID]',
        condition: 'equal',
        value: positionID
      },
      dFrom: {
        expression: '[dateFrom]',
        condition: 'lessEqual',
        value: onDate

      },
      dTo: {
        expression: '[dateTo]',
        condition: 'moreEqual',
        value: onDate

      },
      rID: {
        expression: '[ID]',
        condition: 'notEqual',
        value: AC.dataService.getUniqueInt()
      }
    }
    positionCtrl.clearIsPhantom()
    if (isReload) {
      employeePositionCtrl.getStore().load().then(store => {
        if (isClear) {
          if (store.getCount() === 1) {
            employeePositionCtrl.setValueById(store.getAt(0).get('ID'))
          } else {
            employeePositionCtrl.setValue()
          }
        }
      })
    }
  }, 1000)
}

function initComponentStart () {
  const me = this
  me.gridConfig = {
    detailGrids: ['hr_empOrderActingDet']
  }

  AC.acEditGridManager.init(me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', controlChanged, me)
  me.on('afterrender', function () {
    HR.orderManager.setDateChecker(null, {
      dateFrom: me.getField('dateFrom'),
      dateTo: me.getField('dateToEmpty')
    })
  })
 /* me.on('beforeClose', function () {
    if (me.sender) {
      let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  })*/
  me.on('beforeSave', function (form, mParams) {
    if (!me.attr.hr_empOrderActingDet.notWriteChanges) {
      delete mParams.formData
    }
  })
}

function onRecordLoaded () {
  const me = this
  me.orderState = (me.masterForm && me.masterForm.record.get('orderState')) || 'POSTED'
  let isProject = me.orderState === 'PROJECT'
  if (isProject && !me.isNextRecordMakerExists) {
    me.isNextRecordMakerExists = true
    HR.orderManager.setNextRecordMaker(me, [
      'dictReasonDismID',
      {
        isExternal: value => value,
        bonusID: value => value,
        organizationID: value => me.masterForm.record.get('organizationID'),
        empOrderType: value => value,
        orderID: value => value
      }
    ], 4)
  }
}

async function onFormDataReady () {
  const me = this
  me.filterDepartment({})
  me.filterPosition({})
  me.masterForm.makeReasonSelector(me)
  if (me.isNewInstance) {
    me.record.set('dateToEmpty', null)
    me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('entryDate')))
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
  }
  // me.getEmployeePosition(false)
  me.isReadOnly = me.enableControls()
  me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
  me.setFilter()
}

function controlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'departmentID':
      case 'dateFrom':
        me.setFilter({
          isReload: true,
          isClear: true
        })
        break
      case 'positionID':
        me.setFilter({
          isReload: true,
          isClear: true
        })
        break
    }
  }
}

function onCheckValidBeforeSaveForm () {
  const me = this
  const store = me.attr.hr_empOrderActingDet.store
  let errorMessage = ''
  if (me.skipValidate) {
    delete me.skipValidate
    return Promise.resolve(true)
  }
  if (!store.getCount()) {
    $App.dialogInfo(UB.i18n(`Неможливо зберегти, необхідно додати виконуючих обов'язки.`))
    return Promise.resolve(false)
  }
  let hasHardError = false
  store.each(record => {
    const recordDateFrom = AC.dateService.truncTimeToUtcNull(record.get('dateFrom'))
    const recordDateTo = AC.dateService.truncTimeToUtcNull(record.get('dateTo'))
    const index = store.findBy(function (rec) {
      if (rec.get('ID') === record.get('ID')) {
        return null
      }
      let dateFrom = AC.dateService.truncTimeToUtcNull(rec.get('dateFrom'))
      let dateTo = AC.dateService.truncTimeToUtcNull(rec.get('dateTo'))
      if ((dateFrom >= recordDateFrom && dateFrom <= recordDateTo) ||
                (dateTo >= recordDateTo && dateFrom <= recordDateTo)
      ) {
        return rec
      }
      return null
    })
    if (index !== -1) {
      hasHardError = true
    }
    if (!me.record.get('employeePositionID')) {
      if (['1', '2'].includes(record.get('payElID.calcAlgorithm'))) {
        errorMessage = UB.i18n('Не обрано відсутнього працівника, та обрано Вид оплати за заміщеня, залежний від заробітку відсутнього працівника')
      }
    }
  })
  if (hasHardError) {
    $App.dialogInfo(UB.i18n(`Періоди перетинаються. Виправіть перед збереженням`))
    return Promise.resolve(false)
  }
  if (errorMessage) {
    return $App.dialogYesNo(UB.i18n('Попередження'), errorMessage + UB.i18n('. Все одно зберегти ?')).then(isAgree => {
      return Promise.resolve(isAgree)
    })
  }
  return Promise.resolve(true)
}

function filterDepartment ({
  isReload = false,
  isClear = false
}) {
  let me = this
  return me.masterForm.filterDepartment({
    form: me,
    isReload: isReload,
    isClear: isClear,
    orgAttr: ''
  })
}

function filterPosition ({
  isReload = false,
  isClear = false
} = {}) {
  let me = this
  return me.masterForm.filterPosition({
    form: me,
    isReload: isReload,
    isClear: isClear,
    orgAttr: '',
    depCtrl: me.getField('departmentID')
  })
}

function enableControls () {
  return this.masterForm.enableParaControls(this)
}

function initComponentDone () {
  let
    me = this
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.orderState = me.orderForm.record.get('orderState')

  const isEnableReasonDoc = AC.settings.get('hrEnableReasonDoc')
  if (isEnableReasonDoc) {
    me.down('[name=reasonDocPanel]').show()
  }
}

function startActingGridEdit () {
  const me = this
  me.orderAttrConfig = HR.orderManager.findOrderAttrConfig(me.orderAttrConfigList, me.attr.positionID.getFieldValue('dictStaffCatID'), me.attr.positionID.getFieldValue('positionType'))
}
