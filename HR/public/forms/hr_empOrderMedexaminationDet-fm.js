/* global HR AC  $App UB appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  enableControls,
  onControlChanged,
  onAfterRender,
  beforeSave,
  onBeforeClose,
  filterEmployeePosition,
  validateEmployeeInput,
  clearErrors,
  findOrderAttrConfig,
  onCheckValidBeforeSaveForm
}

const defReasonText = UB.i18n('згідно табелю за виробничою потребою')

function initComponentStart () {
  const me = this
  me.gridConfig = {
    detailGrids: ['empOrderMedexaminationListDet']
  }
  me.on('formDataReady', me.onFormDataReady, me)
  me.on('recordloaded', me.onRecordLoaded, me)
  me.on('controlChanged', me.onControlChanged, me)
  me.on('beforesave', me.beforeSave, me)
  me.on('beforeClose', me.onBeforeClose, me)
  AC.acEditGridManager.init(me)
}

function initComponentDone () {
  const me = this
  me.errors = []

  AC.viewUtils.setAttr(me)
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
}

function onRecordLoaded () {
  const me = this
  me.enableValidators = true
  if (me.isNewInstance) {
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    me.record.set('empOrderType', me.customParams.empOrderType)
    me.record.set('reason', defReasonText)
    me.record.set('empMedExText', UB.i18n('за час проходження медичних оглядів в ... поточного року'))
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
    case 'payElID':
      if (value) {
        me.attr.dictVacationKindID.setValue(null)
        me.attr.dictVacationKindID.setDisabled(true)
      } else {
        me.attr.dictVacationKindID.setDisabled(false)
      }
      break
  }
}

function enableControls () {
  const me = this
  if (me.isDestroyed) return
  const orderState = me.record.get('orderID.orderState') || 'PROJECT'
  let enabled = orderState === 'PROJECT'
  const gridEmp = me.down('[name=empOrderMedexaminationListDet]')
  const config = me.findOrderAttrConfig()
  me.orderForm.enableParaControls(this)
  if (me.attr.payElID.value) { me.attr.dictVacationKindID.setDisabled(true) }
}

function onAfterRender () {
  const me = this
  HR.controlService.checkErrorsOnClose(me)
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

/* Перевірки при збереженні форми */
function onCheckValidBeforeSaveForm (showMessage = true) {
  const me = this
  let errors = []
  let result = true
  const errorTag = 0

  if (me.enableValidators) {
    const detGrid = me.down('[name=empOrderMedexaminationListDet]')
    const listStore = detGrid.store
    let isListCheckErr = listStore.getCount() === 0
    if (isListCheckErr) {
      errors.push({
        tag: 0,
        code: 'listExistCheck',
        msg: UB.i18n('Не додано інформацію про працівників')
      })
      result = false
    }
  }

  if (!me.attr.payElID.value && !me.attr.dictVacationKindID.value) {
    errors.push({
      tag: 0,
      code: 'PayElOrDictVacKindCheck',
      msg: UB.i18n('Необхідно задати "Вид оплати" або "Вид відпустки (компенсація)"!')
    })
    result = false
  }

  return Promise.resolve(true).then(res => {
    if (showMessage === undefined) {
      showMessage = !me.isClosing
    }
    me.errors = HR.controlService.setFormErrors(me, me.errors, errors, errorTag, showMessage, 'errorText')
    me.isClosing = false
    me.canClose = me.errors.length === 0
    return result
  })
}

function validateEmployeeInput (editor, ctx) {
  const me = this
  let result = true

  const df = editor.query(`[name=dateFrom]`)[0].value
  const dt = editor.query(`[name=dateTo]`)[0].value
  if (df > dt) {
    $App.dialogInfo(UB.i18n('Дата початку більш дати закінчення'), UB.i18n('Увага'))
    result = false
  }

  if (result) {
    const dnext = editor.query(`[name=dateNextMedEx]`)[0].value
    if (dnext && dt >= dnext) {
      $App.dialogInfo(UB.i18n('Дата закінчення більш дати наступного медогляду'), UB.i18n('Увага'))
      result = false
    }
  }

  return Promise.resolve(result)
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
