/* global AC $App HR UB appAC */
exports.formCode = {
  controlChanged,
  initComponentStart,
  onFormDataReady,
  onRecordLoaded,
  filterDepartment,
  filterPosition,
  filterEmployeePosition,
  enableControls,
  initComponentDone,
  onCheckValidBeforeSaveForm,
  setFilter
}

function setFilter ({
  isClear,
  isReload
} = {}) {
  const me = this
  if (me.isReadOnly) {
    return
  }
  const positionCtrl = me.attr.positionID
  const departmentCtrl = me.attr.departmentID
  const employeePositionCtrl = me.attr.employeePositionID
  positionCtrl.setDisabled(false)
  employeePositionCtrl.setDisabled(false)
  const req = employeePositionCtrl.getStore().ubRequest
  const onDate = AC.dateService.truncTimeToUtcNull(appAC.globalApplicationDate())
  setTimeout(() => {
    const positionID = positionCtrl.getFieldValue('mi_data_id')
    const departmentID = departmentCtrl.getFieldValue('mi_data_id')
    req.whereList = {
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
      orgID: {
        expression: '[organizationID]',
        condition: 'equal',
        value: me.record.get('organizationID')
      }
    }
    if (positionID) {
      req.whereList.pos = {
        expression: '[positionID]',
        condition: 'equal',
        value: positionID
      }
    }
    if (departmentID) {
      req.whereList.dep = {
        expression: '[departmentID]',
        condition: 'equal',
        value: departmentID
      }
    }
    // monkey request prevention
    req.whereList.mrp = {
      expression: '[ID]',
      condition: 'notEqual',
      value: AC.dataService.getUniqueInt()
    }

    positionCtrl.clearIsPhantom()
    if (isReload) {
      employeePositionCtrl.getStore().load().then(store => {
        if (isClear) {
          employeePositionCtrl.setValue()
        }
      })
    }
  }, 500)
}

function initComponentStart () {
  const me = this
  me.gridConfig = {
    detailGrids: ['hr_empOrderActingCloseEmp']
  }

  AC.acEditGridManager.init(me)
  me.on('recordLoaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', controlChanged, me)
  me.on('beforeClose', function () {
    if (me.sender) {
      let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
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

function onFormDataReady () {
  const me = this
  me.filterDepartment({})
  me.filterPosition({})
  me.masterForm.makeReasonSelector(me)
  if (me.isNewInstance) {
    me.record.set('dateToEmpty', null)
    me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate') || appAC.globalApplicationDate()))
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
  }
  me.isReadOnly = me.enableControls()
  me.setFilter()
}

function controlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'departmentID':
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
  let errorMessage = ''
  if (me.skipValidate) {
    delete me.skipValidate
    return Promise.resolve(true)
  }
  const store = me.attr['hr_empOrderActingCloseEmp'].getStore()
  if (!store.getCount()) {
    $App.dialogInfo(UB.i18n(`Неможливо зберегти, необхідно додати працівників.`))
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
    depCtrl: me.attr.departmentID
  })
}

function enableControls () {
  return this.masterForm.enableParaControls(this)
}

function initComponentDone () {
  const me = this
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.orderState = me.orderForm.record.get('orderState')
  AC.viewUtils.setAttr(me, ['ubdetailgrid'])
  if (me.isNewInstance) {
    const acRefresh = me.attr['hr_empOrderActingCloseEmp'].actions['refresh']
    acRefresh && acRefresh.setDisabled(true)
    // me.attr['hr_empOrderActingCloseEmp'].notWriteChanges = true
  }

  const isEnableReasonDoc = AC.settings.get('hrEnableReasonDoc')
  if (isEnableReasonDoc) {
    me.down('[name=reasonDocPanel]').show()
  }
}

function filterEmployeePosition (ctrl) {
  const me = this
  if (!ctrl) return
  const req = ctrl.getStore().ubRequest
  const onDate = (me.masterForm && me.masterForm.record.get('orderDate')) ? AC.dateService.truncTimeToUtcNull(me.masterForm.record.get('orderDate'))
    : appAC.globalApplicationDate()
  const positionID = me.attr.positionID.getFieldValue('mi_data_id')
  const departmentID = me.attr.departmentID.getFieldValue('mi_data_id')
  req.whereList = {
    byOrgID: {
      condition: 'equal',
      expression: '[organizationID]',
      value: me.record.get('organizationID')
    },
    dateTo: {
      condition: '>=',
      expression: '[dateTo]',
      value: onDate
    },
    dateToNull: {
      condition: 'isNull',
      expression: '[dateTo]'
    },
    orderState: {
      expression: '[paraID.orderID.orderState]',
      condition: 'in',
      value: ['POSTED', 'PROCESSED']
    }
  }
  req.logicalPredicates = ['([dateTo] OR [dateToNull])']
  if (me.record.get('employeePositionID')) {
    req.whereList.para = {
      expression: '[paraID.employeePositionID]',
      condition: 'equal',
      value: me.record.get('employeePositionID')
    }
  } else if (positionID) {
    req.whereList.pos = {
      expression: '[paraID.positionID.mi_data_id]',
      condition: 'equal',
      value: positionID
    }
  } else if (departmentID) {
    req.whereList.dep = {
      expression: '[paraID.departmentID.mi_data_id]',
      condition: 'equal',
      value: departmentID
    }
  }
}
