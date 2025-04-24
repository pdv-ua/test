/* global $App AC appAC HR UB */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  controlChanged,
  onAfterRender,
  setDefaultValues,
  enableControls,
  filterOrg,
  onAfterSave,
  onAfterDelete,
  setCategoryChecks,
  onChangeOrg
}

function initComponentStart () {
  const me = this
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', controlChanged, me)
  me.on('afterDelete', onAfterDelete, me)
  me.on('afterrender', onAfterRender, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  if (me.customParams.orderForm) {
    me.orderForm = me.customParams.orderForm
  } else {
    if (me.sender) {
      me.orderForm = me.sender.up('form')
    }
  }
  me.orderState = me.orderForm && me.orderForm.record.get('orderState')
}

function onRecordLoaded () {
  const me = this
  setCategoryChecks(me)
  filterOrg(me)
}

function onFormDataReady () {
  const me = this
  setDefaultValues(me)
  enableControls(me)
}

function controlChanged (ctrl, value) {
  const me = this
  switch (ctrl.name) {
    case 'year':
      if (value) {
        me.record.set('dateFrom', AC.dateService.getYearBegin(value))
        me.record.set('dateTo', AC.dateService.getYearEnd(value))
      }
      break
  }
}

function onAfterRender () {
  const me = this
  me.up('window').on('beforeclose', () => {
    if (me.closeForce) {
      return true
    }
    const vacationSchedule = me.down('[name=vacationSchedule]')
    if (vacationSchedule.store.getCount() === 0) {
      $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Не додано даних по відпусткам працівників. Все одно вийти?'))
        .then(choice => {
          if (choice) {
            me.closeForce = true
            me.closeWindow(true)
          }
        })
      return false
    }
    return true
  })
}

function setDefaultValues (me) {
  if (me.isEditMode) {
    return
  }
  const onDate = appAC.globalApplicationDate()
  me.record.set('year', onDate.getFullYear())
  me.record.set('dateFrom', AC.dateService.firstDayOfYear(onDate))
  me.record.set('dateTo', AC.dateService.lastDayOfYear(onDate))
  me.orderForm && me.record.set('orderID', me.orderForm.instanceID)
}

function filterOrg (me) {
  const orgID = me.record.get('orderID.organizationID') || me.orderForm.record.get('organizationID')
  const orderDate = me.record.get('orderID.orderDate')
  HR.treeUtils.getChildOrgsPromise(orgID, orderDate)
    .then(orgItems => {
      const childOrgIDs = orgItems.map(item => item.mi_data_id)
      childOrgIDs.unshift(orgID)
      AC.viewUtils.setWhereListProperty(me.attr.organizationID, [['mi_data_id', 'in', childOrgIDs]], undefined, ['clearStore'])
    })
}

function onAfterSave () {
  AC.gridUtils.refreshSenderGrid(this)
}

function onAfterDelete () {
  AC.gridUtils.refreshSenderGrid(this)
}

function enableControls (me) {
  if (me.isEditMode) {
    const isPosted = me.record.get('orderID.orderState') !== 'PROJECT'
    if (isPosted) {
      me.down('[name=isBosses]').setDisabled(true)
      me.down('[name=isOthers]').setDisabled(true)
    }
  }
  me.orderForm.enableParaControls(me)
}

function setCategoryChecks (me, changeCtrl) {
  if (me.isInnerControlChange) {
    return
  }

  const isBosses = me.down('[name=isBosses]')
  const isOthers = me.down('[name=isOthers]')
  let positionCategory
  let isBossesCheck = false
  let isOthersCheck = false
  let isBossesChange = false
  let isOthersChange = false
  if (changeCtrl) {
    isBossesChange = changeCtrl.name === 'isBosses'
    isOthersChange = !isBossesChange
    const changeValue = changeCtrl.getValue()
    if (changeValue) {
      isBossesCheck = isBossesChange
      isOthersCheck = !isBossesCheck
      me.record.set('positionCategory', isBossesCheck ? '1' : '5')
    } else {
      me.record.set('positionCategory', null)
    }
  } else {
    positionCategory = me.record.get('positionCategory')
    if (positionCategory) {
      isBossesCheck = positionCategory === '1'
      isOthersCheck = !isBossesCheck
    }
  }
  me.isInnerControlChange = true
  try {
    !isBossesChange && isBosses.setValue(isBossesCheck)
    !isOthersChange && isOthers.setValue(isOthersCheck)
  } finally {
    me.isInnerControlChange = false
  }
}

function onChangeOrg () {
  const me = this
  const onDate = appAC.globalApplicationDate()
  const orgID = me.attr.organizationID.getValue()
  const whereList = [
    ['state', '=', 'ACTIVE'],
    ['orgID.state', '=', 'ACTIVE'],
    ['orgID.mi_dateFrom', '<=', onDate],
    ['orgID.mi_dateTo', '>=', onDate],
    ['orgID', '=', orgID || 0]
  ]
  AC.viewUtils.setWhereListProperty(me.attr.departmentID, whereList, null, ['clearWhereList', 'clearValue', 'clearStore'])
  me.attr.departmentID.setReadOnly(!orgID)
}
