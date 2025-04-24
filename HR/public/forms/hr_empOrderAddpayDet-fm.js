/* global HR AC  $App UB appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  enableControls,
  onControlChanged,
  onAfterRender,
  onFormRefresh,
  onBeforeSave,
  beforeSave,
  onAfterSave,
  onBeforeClose,
  loadEmployees,
  clearEmployees,
  filterEmployeePosition,
  validateForm,
  validateVacList,
  validate,
  clearErrors,
  findOrderAttrConfig
}

const defReasonText = UB.i18n('згідно табелю за виробничою потребою')

function initComponentStart () {
  const me = this
  me.gridConfig = {
    detailGrids: ['empOrderAddpayListDet']
  }
  me.on('formDataReady', me.onFormDataReady, me)
  me.on('recordloaded', me.onRecordLoaded, me)
  me.on('controlChanged', me.onControlChanged, me)
  me.on('beforesave', me.beforeSave, me)
  me.on('beforeClose', me.onBeforeClose, me)
  me.on('refresh', me.onFormRefresh, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.errors = []
  me.canClose = true
  me.attr.dictFundSourceID.store.ubRequest.method = 'selectByOrg'
  me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('organizationID') || me.masterForm.record.get('organizationID') || appAC.globalOrganization()
}

function onRecordLoaded () {
  const me = this
  me.enableValidators = true
  if (me.isNewInstance) {
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    me.record.set('empOrderType', me.customParams.empOrderType)
    me.record.set('reason', defReasonText)
  } else {
    if (!me.isInternalRefresh) {
      let rawErrorText = me.record.get('errorText')
      if (rawErrorText) {
        me.errors = JSON.parse(rawErrorText)
        let errorText = HR.controlService.getFormErrorsText(me.errors)
        const errorLabel = me.down('[name=errorText]')
        errorLabel.setText(errorText, false)
      }
    } else {
      me.isInternalRefresh = false
    }
  }
  HR.orderManager.setDefaultValues(me)
  me.orderForm.makeReasonSelector(me)
}

async function onFormDataReady () {
  const me = this
  me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
  if (me.isNewInstance) {
    const config = me.findOrderAttrConfig()
    if (config) {
      me.attr.payElID.setValueById(config.payElIDMain)
    }
  }
  me.enableControls()
}

function onControlChanged (field, value, oldValue) {
  const me = this
  switch (field.name) {
    case 'isTimeWork':
      me.attr.reason.setValue(value ? defReasonText : '')
      break
    case 'payElID':
      if (value && field.getFieldValue('dictFundSourceID')) {
        me.attr.dictFundSourceID.setValueById(field.getFieldValue('dictFundSourceID'))
      }
      break
  }
}

function enableControls () {
  const me = this
  if (me.isDestroyed) return
  const orderState = me.record.get('orderID.orderState') || 'PROJECT'
  let enabled = orderState === 'PROJECT'
  const gridEmp = me.down('[name=empOrderAddpayListDet]')
  const fillPersonsAction = gridEmp && gridEmp.down('[actionId=fillPersons]')
  if (fillPersonsAction) {
    fillPersonsAction.setDisabled(!enabled)
  }
  const clearPersonsAction = gridEmp && gridEmp.down('[actionId=clearPersons]')
  if (clearPersonsAction) {
    clearPersonsAction.setDisabled(!enabled)
  }
  const config = me.findOrderAttrConfig()
  me.attr.payElID && me.attr.payElID.setDisabled(config ? !config.canEditPayElMain : true)
  me.orderForm.enableParaControls(this)
}

function onAfterRender () {
  const me = this
  HR.controlService.checkErrorsOnClose(me)
}

function onFormRefresh () {
  const me = this
  me.validate()
}

function onBeforeSave () {
  const me = this
  return me.validateForm()
}

function beforeSave (me, params) {
  const formData = { detail: {} }
  if (me.gridConfig.detailGrids) {
    me.gridConfig.detailGrids.forEach((item) => {
      let grid = me.down(`[name=${item}]`)
      formData.detail[item] = grid.getAttributeData()
    })
    params.formData = JSON.stringify(formData)
  }
}

function onAfterSave () {
  const me = this
  const grid = me.down('[name=empOrderAddpayListDet]')
  grid.getStore().load()
}

function onBeforeClose () {
  const me = this
  AC.gridUtils.refreshSenderUBGrid(me)
  return true
}

async function filterEmployeePosition (ctrl) {
  const me = this
  const onDate = AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate') || me.orderForm.record.get('entryDate'))
  const whereList = {
    orgID: {
      expression: '[organizationID]',
      condition: 'equal',
      value: me.record.get('organizationID')
    },
    dateFrom: {
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
  ctrl.getStore().ubRequest.whereList = whereList
  return ctrl.getStore().load()
}

function loadEmployees (data, isDelete) {
  const me = this
  if (data.length) {
    const grid = me.down('[name=empOrderAddpayListDet]')
    const gridStore = grid.getStore()
    let gridItems = gridStore.data.items
    const orgID = me.record.get('organizationID')
    const paraID = me.instanceID
    const orderID = me.record.get('orderID')
    const empOrderType = me.record.get('empOrderType')
    let itemIdx = 1
    let rows = []
    if (isDelete) {
      gridStore.removeAll()
      gridItems = []
    }
    let hasGridItems = gridItems.length > 0
    data.forEach(item => {
      let existItem = hasGridItems && gridItems.find(rec => rec.get('employeePositionID') === item.employeePositionID)
      if (!existItem) {
        rows.push({
          itemIdx: itemIdx++,
          employeePositionID: item.employeePositionID,
          'employeePositionID.description': item.description,
          posName: item.posName,
          depName: item.depName,
          organizationID: orgID,
          paraID: paraID,
          orderID: orderID,
          empOrderType: empOrderType
        })
      }
    })
    AC.gridUtils.insert(grid, rows)
    me.validate()
  }
}

function clearEmployees () {
  const me = this
  const grid = me.down('[name=empOrderAddpayListDet]')
  grid.getStore().removeAll()
  HR.orderManager.setIsDirty(me, true)
}

/* Перевірки при збереженні форми */
function validateForm (showMessage) {
  const me = this
  let result = true
  let errors = []
  const errorTag = 0

  if (me.enableValidators) {
    const empOrderAddpayListDet = me.down('[name=empOrderAddpayListDet]')
    const listStore = empOrderAddpayListDet.store
    let isListCheckErr = listStore.getCount() === 0
    if (isListCheckErr) {
      errors.push({
        tag: 0,
        code: 'listExistCheck',
        msg: UB.i18n('Не додано інформацію про працівників')
      })
      result = false
    }

    const dateFrom = me.attr.dateFrom.getValue()
    const dateTo = me.attr.dateTo.getValue()
    if (AC.dateService.isValid(dateFrom) && AC.dateService.isValid(dateTo) && dateFrom > dateTo) {
      errors.push({
        tag: 0,
        code: 'datesCheck',
        msg: UB.i18n('Дата початку роботи не може бути більшою за дату закінчення')
      })
      result = false
    }
  }

  return Promise.resolve(true).then(res => {
    if (showMessage === undefined) {
      showMessage = !me.isClosing
    }
    me.errors = HR.controlService.setFormErrors(me, me.errors, errors, errorTag, showMessage, 'errorText')
    me.record.set('errorText', me.errors.length ? JSON.stringify(me.errors) : '')
    me.isClosing = false
    me.canClose = me.errors.length === 0
    return result
  })
}

function validateVacList (editor, ctx) {
  const me = this
  let result = true
  const employeePositionIDCtrl = editor.query(`[name=employeePositionID.description]`)[0]
  const employeePositionID = employeePositionIDCtrl.getFieldValue('ID')
  const grid = me.down('[name=empOrderAddpayListDet]')
  const gridItems = grid.getStore().data.items
  if (gridItems.length > 0) {
    let existItem = gridItems.find(rec => rec.get('employeePositionID') === employeePositionID)
    if (existItem) {
      $App.dialogInfo(UB.i18n('Даного працівника вже додано'), UB.i18n('Увага'))
      result = false
    }
  }
  return Promise.resolve(result)
}

/* Всі перевірки, errorTag: 0 - всі перевірки, 1 - перевірки змін форми */
function validate (errorTag = 0, showMessage = false) {
  const me = this
  me.clearErrors()
  me.isInternalRefresh = true
  return me.validateForm(showMessage)
}

function clearErrors (errorTag = 0) {
  const me = this
  const formErrors = errorTag === 0 ? [] : me.errors
  if (me.errors.length) {
    me.errors = HR.controlService.setFormErrors(me, formErrors, [], errorTag, false, 'errorText')
  }
}

function findOrderAttrConfig () {
  return this.orderAttrConfigList.length ? this.orderAttrConfigList[0] : null
}
