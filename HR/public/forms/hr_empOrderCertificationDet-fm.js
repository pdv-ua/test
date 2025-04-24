/* eslint-disable no-unused-vars */
/* global AC HR $App Ext UB appAC */
/* jshint maxerr: 10000 */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  onAfterRender,
  onFormRefresh,
  enableControls,
  addBaseActions,
  setupView,
  filterEmployeePosition,
  fillFieldsByEmployeePosition,
  getOnDate,
  disableContextMenu
}

function disableContextMenu () {
  const me = this
  const ctrlList = ['payElID', 'dictTarifCoeffID', 'employeePositionID', 'dictSpecialtyID']
  ctrlList.forEach(attr => {
    if (me.attr[attr]) {
      HR.orderManager.disableContextMenuItems(me.attr[attr], ['addItem', 'editItem', 'showLookup'])
    }
  })
}

function getOnDate () {
  return this.orderForm ? AC.dateService.shiftDate(this.orderForm.record.get('orderDate') || this.orderForm.record.get('entryDate')) : appAC.globalApplicationDate()
}

function fillFieldsByEmployeePosition (employeePositionID) {
  const me = this
  $App.connection.run({
    entity: me.entityName,
    method: 'getEmployeePositionInfo',
    employeePositionID: employeePositionID,
    onDate: me.getOnDate(),
    destOrganizationName: me.record.get('destOrganizationName')
  }).then(mParams => {
    for (const attr in mParams.result) {
      if (mParams.result.hasOwnProperty(attr)) {
        me.record.set(attr, mParams.result[attr])
      }
    }
    switch (mParams.result.emPos) {
      case UB.i18n('Лікарі'):
        me.down('[name=destOrganizationName]').setValue(UB.i18n('МОЗ'))
        break
      default:
        me.down('[name=destOrganizationName]').setValue('')
        break
    }
  })
}

function filterEmployeePosition () {
  const me = this
  if (me.isReadOnly) {
    return
  }
  const store = me.attr.employeePositionID.getStore()
  const req = store.ubRequest
  if (req.whereList) {
    return
  }

  let onDate = me.getOnDate()
  let orgID = me.orderForm ? me.orderForm.record.get('organizationID') : appAC.globalOrganization()
  req.whereList = {
    organizationID: {
      expression: '[organizationID]',
      condition: 'equal',
      value: orgID
    },
    dateForm: {
      expression: '[dateFrom]',
      condition: 'lessEqual',
      value: onDate
    },
    dateTo: {
      expression: '[dateTo]',
      condition: 'moreEqual',
      value: onDate
    }
  }
}

function setupView ({
  changedField,
  value
} = {}) {
  const me = this
  if (!changedField) {
    const certificationType = me.record.get('certificationType')
    // me.attr.dictSpecialtyID.setAllowBlank(certificationType !== 'ASSIGN')
    me.attr.accrualSum.setDisabled(certificationType !== 'ASSIGN')

    if (!me.isNewInstance) {
      const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
      if (notShowSalary) {
        me.attr.accrualSum.hide()
      }
    }

    me.attr.dictTarifCoeffID.setDisabled(certificationType !== 'ASSIGN')
    if (certificationType !== 'ASSIGN') {
      me.attr.dictTarifCoeffID.setAllowBlank(true)
    } else {
      me.attr.dictTarifCoeffID.setAllowBlank(AC.settings.get('hrCertificationObligAttrs', appAC.globalOrganization()) === '1')
    }
    me.down('[name=orderAccrualGridTab]').tab[certificationType === 'ASSIGN' ? 'show' : 'hide']()
    let dateFrom = me.getOnDate()
    if (AC.dateService.isValid(dateFrom)) {
      dateFrom = AC.dateService.shiftDate(dateFrom)
      me.attr.dictTarifCoeffID.getStore().ubRequest.whereList = {
        dateFrom: {
          expression: '[dateFrom]',
          condition: 'lessEqual',
          value: dateFrom
        },
        dateTo: {
          expression: '[dateTo]',
          condition: 'moreEqual',
          value: dateFrom
        }

      }
    }
    return
  }
  switch (changedField) {
    case me.attr.certificationType:
    {
      me.attr.dictTarifCoeffID.setDisabled(value !== 'ASSIGN')
      if (value !== 'ASSIGN') {
        me.attr.dictTarifCoeffID.setAllowBlank(true)
        me.attr.dictTarifCoeffID.setValue()
        me.attr.accrualSum.setValue()
      } else {
        me.attr.dictTarifCoeffID.setAllowBlank(AC.settings.get('hrCertificationObligAttrs', appAC.globalOrganization()) === '1')
      }
      me.attr.accrualSum.setDisabled(value !== 'ASSIGN')
      me.down('[name=orderAccrualGridTab]').tab[value === 'ASSIGN' ? 'show' : 'hide']()
      break
    }
  }
}

function initComponentStart () {
  let me = this
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('refresh', me.onFormRefresh, me)
  me.on('onBeforeSave', onBeforeSave, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)

  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else if (me.sender) {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  if (me.orderForm) {
    me.orderState = me.orderForm.record.get('orderState')
  }

  /* me.on('beforeClose', function (a) {
    AC.gridUtils.refreshSenderGrid(me)
  }) */
  me.errors = []
  me.canClose = true
  if (me.attr.dateFrom && me.attr.dateTo) {
    HR.orderManager.setDateChecker(me, {
      dateFrom: me.attr.dateFrom,
      dateTo: me.attr.dateTo
    })
  }
}

function onRecordLoaded () {
  const me = this
  if (me.isNewInstance) {
    if (me.orderForm) {
      me.record.set('orderID', me.orderForm.instanceID)
      me.record.set('organizationID', me.orderForm.record.get('organizationID'))
    }
    if (me.customParams.empOrderType) {
      me.record.set('empOrderType', me.customParams.empOrderType)
    }
  } else {
    let rawErrorText = me.record.get('errorText')
    if (rawErrorText) {
      me.errors = JSON.parse(rawErrorText)
      let errorText = HR.controlService.getFormErrorsText(me.errors)
      const errorLabel = me.down('[name=errorText]')
      if (errorLabel) {
        errorLabel.setText(errorText, false)
      }
    }
  }
  HR.orderManager.setDefaultValues(me)
}

function onFormDataReady () {
  const me = this
  me.enableControls()
  me.setupView()
  if (me.orderForm) {
    me.orderForm.makeReasonSelector(me, {
      reasonFieldName: 'reason',
      entityName: 'hr_dictOrderDetReason'
    })
  }
  me.attr.dictEmpCategoryID.setAllowBlank(AC.settings.get('hrCertificationObligAttrs', appAC.globalOrganization()) === '2')
  if (AC.settings.get('hrCertificationObligAttrs', appAC.globalOrganization()) === '3') {
    me.attr.dictSpecialtyID.setAllowBlank(false)
  }
  if (!me.isNewInstance) {
    const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
    if (notShowSalary) {
      me.attr.accrualSum.hide()
    }
  }
}

function onAfterRender () {
  const me = this
  HR.controlService.checkErrorsOnClose(me)
  me.on('controlChanged', onControlChanged, me)
  HR.orderManager.setNextRecordMaker(me, [{
    destOrganizationName: value => me.record.get('destOrganizationName'),
    destOrganizationID: value => me.record.get('destOrganizationID'),
    orderNumber: value => me.record.get('orderNumber'),
    orderDate: value => me.record.get('orderDate'),
    reason: value => me.record.get('reason')
  }], 5)
  me.disableContextMenu()
  me.filterEmployeePosition()
}

function onFormRefresh () {
  const me = this
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  let dummyAction = me.actions.dummyAction
  if (!dummyAction) {
    dummyAction = new Ext.Action({
      actionId: 'dummyAction',
      eventId: 'dummyAction',
      hidden: true,
      text: 'Dummy Action',
      iconCls: 'fa fa-clone',
      handler: function () {

      }
    })
    me.actions.dummyAction = dummyAction
  }
}

function enableControls () {
  const me = this
  if (me.orderForm) {
    me.isReadOnly = me.orderForm.enableParaControls(me)
    me.down('[name=destOrganizationName]').setReadOnly(me.isReadOnly)
  }
}

async function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.isInnerChange) {
    return
  }
  switch (field.name) {
    case 'certificationType':
    {
      if (value === 'ASSIGN') {
        me.attr.dictEmpCategoryID.clearValue()
      } else if (value === 'PROLONG') {
        const orderAccrualGrid = me.down('[name=orderAccrualGrid]')
        const store = orderAccrualGrid.getStore()
        await store.load()
        if (store.getCount()) {
          const isAgree = await $App.dialogYesNo(UB.i18n('Увага'), UB.i18n('Дані на сторінці Нарахування будуть видалені. Продовжити?'))
          if (isAgree) {
            await $App.connection.run({
              entity: me.entityName,
              method: 'deleteAccrual',
              ID: me.instanceID
            })
            store.loadData([])
          } else {
            me.isInnerChange = true
            me.record.set('certificationType', oldValue)
            me.isInnerChange = false
            return
          }
        }
      }

      break
    }
    case 'employeePositionID':
      value && me.fillFieldsByEmployeePosition(value)

      let payElID = field.getFieldValue('payElID')
      let positionType = field.getFieldValue('positionType')
      if (!payElID) {
        if (positionType) {
          payElID = UB.Repository('hr_positionTypeProps')
            .attrs(['payElID'])
            .where('positionType', '=', positionType)
            .selectSingle().then(payElID => {
              me.record.set('payElID', payElID.payElID)
              me.attr.payElID.setValue(payElID.payElID)
            })
        }
      } else {
        me.record.set('payElID', payElID)
        me.attr.payElID.setValue(payElID)
      }
      break
    case 'dateFrom':
      let dateFromTo = me.attr.dateFrom.getValue()
      if (AC.dateService.isValid(dateFromTo)) {
        dateFromTo.setDate(dateFromTo.getDate() - 1)
        dateFromTo.setFullYear(dateFromTo.getFullYear() + 5)
        me.attr.dateToEmpty.setValue(dateFromTo)
      }
      break
  }
  me.setupView({
    changedField: field,
    value: value
  })
}

async function onBeforeSave () {
  const me = this
  const grid = me.down('[name=orderAccrualGrid]')
  await HR.orderManager.checkEmpOrderAccDateFrom(me, grid)
}
