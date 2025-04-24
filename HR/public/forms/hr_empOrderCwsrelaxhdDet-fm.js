/* global HR AC UB $App */
exports.formCode = {
  getEmpOrderType,
  initComponentStart,
  filterOrderPara,
  initComponentDone,
  enableControls,
  enableGridActions,
  // setDictTimeCostID,
  onBeforeSave,
  beforeSave,
  onAfterSave,
  onAfterOrderSave,
  fillPeriodList,
  addPeriod,
  validateForm
}

function initComponentStart () {
  const me = this
  me.gridConfig = {
    detailGrids: ['empOrderVacationListDet']
  }
  me.on('beforesave', me.beforeSave, me)
  me.on('afterrender', function () {
    me.orderConfig = {
      detailGrids: []
    }
  })
  me.on('formDataReady', function () {
    HR.orderManager.disableContextMenuItems(me.getField('employeePositionID'), ['addItem', 'editItem'])
    HR.orderManager.disableContextMenuItems(me.down('[attributeName=sourceParaID]'), ['editItem', 'addItem'])
    // HR.orderManager.disableContextMenuItems(me.down('[attributeName=dictTimeCostID]'), ['editItem', 'addItem'])
    HR.orderManager.disableContextMenuItems(me.down('[name=sourceParaDescription]'), ['editItem', 'addItem'])
  })
  me.on('recordloaded', async function (a) {
    let me = this
    me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
    if (me.isNewInstance) {
      me.record.set('orderID', me.masterForm.instanceID)
      me.record.set('organizationID', me.masterForm.record.get('organizationID'))
      me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.masterForm.record.get('orderDate')))
      me.record.set('orderID', me.masterForm.instanceID)
      me.record.set('empOrderType', me.customParams.empOrderType)
      const config = me.orderAttrConfigList.length ? me.orderAttrConfigList[0] : null
      if (config) {
        me.record.set('payElID', config.payElIDMain)
        // me.record.set('dictTimeCostID', config.dictTimeCostID)
      }
      /* if (!me.record.get('dictTimeCostID')) {
        me.setDictTimeCostID()
      } */
    } else {
      me.customParams.empOrderType = me.record.get('empOrderType')
      me.filterOrderPara({
        employeeNumberID: me.record.get('employeePositionID.employeeNumberID'),
        isClear: false,
        isReload: false
      })
      let para = me.down('[name=sourceParaDescription]')
      para.disableChangeEvent = true
      para.setValue(me.record.get('sourceParaDescription'))
      para.disableChangeEvent = false
    }
    me.masterForm.filterEmployeePosition(me, {
      attrToFilter: 'employeePositionID'
    })

    me.enableControls()
    HR.orderManager.setDefaultValues(me)
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    HR.orderManager.setTitleByOrderType(me)
  })
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  me.vacKindCode = 'dWeekWork'
  me.errors = []
  me.canClose = true
  if (me.customParams.orderForm) {
    me.orderForm = me.orderForm = me.masterForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {

  })
  me.orderState = me.orderForm.record.get('orderState')
  if (me.orderState === 'PROJECT') {
    HR.orderManager.setNextRecordMaker(me, [{
      organizationID: value => me.orderForm.record.get('organizationID'),
      empOrderType: value => value,
      orderID: value => value,
      dateFrom: value => AC.dateService.truncTimeToUtcNull(value),
      isPaymentProp: value => value
    }], 4)
  }
  AC.viewUtils.setAttr(me)
}

function onBeforeSave () {
  const me = this
  return me.validateForm(true).then(res => {
    me.record.set('errorText', me.errors.length ? JSON.stringify(me.errors) : '')
    if (res) {
      me.errorsIsNotSaved = false
    }
    return res
  })
}

function beforeSave (me, params) {
  AC.gridUtils.setDetailGridsFormData(me, params)
}

function onAfterSave () {
  const me = this
  const grid = me.down('[name=empOrderVacationListDet]')
  grid.getStore().load()
  grid.deletedID = null
}

function onAfterOrderSave () {
  const me = this
  me.enableControls()
}

function getEmpOrderType () {
  return this.customParams.empOrderType || this.record.get('empOrderType')
}

/* function setDictTimeCostID () {
  let me = this
  let dictTimeCostID = me.getField('dictTimeCostID')
  UB.Repository('hr_dictTimeCost')
    .attrs('ID')
    .where('code', '=', appAC.langCodei18n('НеявкаДог'))
    .selectSingle().then(rec => {
      if (rec) {
        dictTimeCostID.setValueById(rec.ID)
      }
    })
} */

function filterOrderPara ({
  employeeNumberID,
  isClear = false,
  isReload = false
} = {}) {
  let me = this
  let para = me.down('[name=sourceParaDescription]')
  AC.viewUtils.setWhereListProperty(para, [
    ['employeeNumberID', '=', employeeNumberID]
  ])
  if (isClear) {
    para.setValue()
  }
  if (isReload) {
    para.getStore().load()
  }
  para.setDisabled(!employeeNumberID)
  // me.getField('sourceParaID').setDisabled(!employeeNumberID)
}

function enableControls () {
  const me = this
  const isDisabled = me.masterForm.enableParaControls(this)
  me.down('[name=sourceParaDescription]').setDisabled(isDisabled)

  // const dictTimeCostID = me.getField('dictTimeCostID')
  const payElID = me.getField('payElID')
  const config = me.orderAttrConfigList.length ? me.orderAttrConfigList[0] : null
  if (config) {
    payElID.setDisabled(!config.canEditPayElMain)
    // dictTimeCostID.setDisabled(!config.canEditDictTimeCost)
  } else {
    payElID.setDisabled(true)
    // dictTimeCostID.setDisabled(true)
  }
  me.enableGridActions()
  return isDisabled
}

function enableGridActions (grid, event) {
  const me = this
  const orderState = me.record.get('orderState')
  const isProject = !orderState || orderState === 'PROJECT'

  grid = grid || me.down('[name=empOrderVacationListDet]')
  const rec = AC.gridUtils.getCurrentRecord(grid)
  const id = rec && rec.get('ID')
  if (id) {
    grid.inserted = false
  }
  const vacListItemCount = grid.store.getCount()
  const enableActions = !!(isProject && (vacListItemCount === 0 || (event && event === 'cancelEdit' && grid.inserted && vacListItemCount === 1)))
  if (enableActions) {
    grid.enableAction('addNew')
  } else {
    grid.disableAction('addNew')
  }
  AC.gridUtils.enableCustomAction(grid, 'addPeriods', enableActions)
}

function onControlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'employeePositionID':
      me.filterOrderPara({
        employeeNumberID: field.getFieldValue('employeeNumberID'),
        isClear: true,
        isReload: true
      })
      break
  }
}

function fillPeriodList () {
  const me = this
  const dateRest = me.attr.dateFrom.getValue()
  delete me.periodList
  return UB.Repository('hr_empVacationPeriod')
    .attrs(['ID'])
    .where('empVacationPlanID.employeeNumberID', '=', me.attr.employeePositionID.getFieldValue('employeeNumberID'))
    .where('empVacationPlanID.dictVacationKindID.code', '=', me.vacKindCode)
    .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
    .where('[dayDiff]', '>', 0)
    .whereIf(dateRest, '[dateFrom]', '<=', dateRest)
    // monkey request prevention
    .where('ID', '!=', AC.dataService.getUniqueInt())
    .selectAsObject().then(data => {
      me.periodList = data.map(item => item.ID)
      return Promise.resolve(true)
    })
}

function addPeriod (grid) {
  const me = this
  if (!grid) {
    grid = me.down('[name=empOrderVacationListDet]')
  }
  if (!grid.getStore().data.length) {
    const dateRest = me.attr.dateFrom.getValue()
    $App.connection.run({
      entity: 'hr_empOrderCwsrelaxhdDet',
      method: 'addPeriods',
      paraID: me.instanceID,
      orgID: me.record.get('organizationID'),
      orderID: me.record.get('orderID'),
      employeeNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID'),
      dictVacationKindCode: me.vacKindCode,
      dateFrom: dateRest,
      dateTo: dateRest
    }).then((mParams) => {
      if (mParams.addedPeriods) {
        const addedPeriods = JSON.parse(mParams.addedPeriods)
        if (addedPeriods.length > 0) {
          grid.addNewRecord(addedPeriods[0])
          grid.inserted = false
          HR.orderManager.setIsDirty(me, true)
          me.enableGridActions(grid)
        }
      }
    })
  }
}

function validateForm (showMessage = false) {
  const me = this
  let result = true
  let errors = []
  const errorTag = 1

  const grid = me.down('[name=empOrderVacationListDet]')
  const gridData = grid.getStore().data
  const paraID = me.instanceID
  const employeePositionID = me.attr.employeePositionID.getValue()
  const employeeNumberID = me.attr.employeePositionID.getFieldValue('employeeNumberID')
  const dateFrom = me.attr.dateFrom.getValue()
  const dateTo = me.attr.dateTo.getValue()
  const sourceParaID = me.attr.sourceParaID.getValue()
  const orgID = me.record.get('organizationID')
  const orderID = me.record.get('orderID') || 0
  let listDetID
  let vacDateFrom
  let vacDateTo
  let vacDayCount
  let vacPeriodID
  if (gridData.length) {
    let item0 = gridData.items[0]
    listDetID = item0.get('ID') || grid.deletedID || 0
    vacDateFrom = item0.get('dateFrom')
    vacDateTo = item0.get('dateTo')
    vacDayCount = item0.get('dayCount')
    vacPeriodID = item0.get('empVacationPeriodID')
  }

  if (dateFrom && dateTo && dateFrom <= dateTo) {
    errors.push({
      tag: errorTag,
      code: 'vacDateCheck',
      msg: UB.i18n('День відпочінку не може бути раніше або той же, що відпрацьований вихідний день. Змініть день відпочинку')
    })
    result = false
  }

  if (!me.isInternalSave) {
    if (!gridData.length) {
      errors.push({
        tag: errorTag,
        code: 'vacListCheck',
        msg: UB.i18n('Необхідно додати вид відпочинку')
      })
      result = false
    }
  }

  /* Перевірка на перетин з іншими відпустками працівника */
  let checkVacationCrossPeriodParams
  if (employeeNumberID && employeePositionID && orgID && vacDateFrom && vacDateTo) {
    checkVacationCrossPeriodParams = {
      entity: 'hr_empOrderVacationListDet',
      method: 'checkVacationCrossPeriod',
      execParams: {
        employeeNumberID: employeeNumberID,
        employeePositionID: employeePositionID,
        dateFrom: vacDateFrom,
        dateTo: vacDateTo,
        orderID: orderID,
        listDetID: listDetID
      },
      // monkey request prevention
      currTime: Date.now()
    }
  }

  /* Перевірка, щоб тривалість днів відпустки не перевищувала доступні дні з урахуванням всіх пунктів даного наказу */
  let checkPeriodDayDiffParams
  if (orgID && vacPeriodID && vacDayCount) {
    checkPeriodDayDiffParams = {
      entity: 'hr_empOrderVacationListDet',
      method: 'checkPeriodDayDiff',
      execParams: {
        orgID: orgID,
        orderID: orderID,
        listDetID: listDetID,
        empVacationPeriodID: vacPeriodID,
        dayCount: vacDayCount
      },
      // monkey request prevention
      currTime: Date.now()
    }
  }

  /* Перевірка на використання наказу про роботу в іншому наказі \ пункті наказу */
  let checkSourceParaIDCrossParams
  if (employeePositionID && sourceParaID && orderID) {
    checkSourceParaIDCrossParams = {
      entity: 'hr_empOrderCwsrelaxhdDet',
      method: 'checkSourceParaIDCross',
      execParams: {
        employeePositionID: employeePositionID,
        sourceParaID: sourceParaID,
        orderID: orderID,
        paraID: paraID
      },
      // monkey request prevention
      currTime: Date.now()
    }
  }

  const resPromise = checkVacationCrossPeriodParams ? $App.connection.run(checkVacationCrossPeriodParams) : Promise.resolve({})
  return resPromise
    .then(mParams => {
      if (mParams && mParams.msg) {
        errors.push({
          tag: errorTag,
          code: 'vacationCrossPeriodCheck',
          msg: mParams.msg
        })
        result = false
      }
      if (checkSourceParaIDCrossParams) {
        return $App.connection.run(checkSourceParaIDCrossParams)
      } else {
        return Promise.resolve({})
      }
    }).then(mParams => {
      if (mParams && mParams.msg) {
        errors.push({
          tag: errorTag,
          code: 'SourceParaIDCrossCheck',
          msg: mParams.msg
        })
        result = false
      }
      if (checkPeriodDayDiffParams) {
        return $App.connection.run(checkPeriodDayDiffParams)
      } else {
        return Promise.resolve({})
      }
    }).then(mParams => {
      if (mParams && mParams.msg) {
        errors.push({
          tag: errorTag,
          code: 'periodDayDiffCheck',
          msg: mParams.msg
        })
        result = false
      }

      me.errors = HR.controlService.setFormErrors(me, me.errors, errors, errorTag, showMessage && !me.isClosing, 'errorText')
      me.isClosing = false
      me.canClose = result
      return result
    })
}
