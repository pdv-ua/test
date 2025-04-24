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
  filterDepartment,
  filterEmployeePosition,
  validateForm,
  validateVacList,
  validate,
  clearErrors,
  findOrderAttrConfig
}

function initComponentStart () {
  const me = this
  me.gridConfig = {
    detailGrids: ['empOrderDowntimeListDet']
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
}

function onRecordLoaded () {
  const me = this
  me.enableValidators = true
  if (me.isNewInstance) {
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    me.record.set('empOrderType', me.customParams.empOrderType)
    UB.Repository('hr_dictTimeCost')
      .attrs(['ID'])
      .where('code', '=', appAC.langCodei18n('Прст'))
      .selectScalar().then(id => {
        if (id) {
          me.record.set('dictTimeCostID', id)
        }
      })
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
  me.filterDepartment()
  HR.orderManager.setDefaultValues(me)
}

async function onFormDataReady () {
  const me = this
  me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
  me.orderConfig = me.findOrderAttrConfig()
  if (me.isNewInstance) {
    if (me.orderConfig) {
      me.attr.payElID.setValueById(me.orderConfig.payElIDMain)
      me.attr.dictTimeCostID.setValueById(me.orderConfig.dictTimeCostID)
      if (me.orderConfig.payElIDMain) {
        const payEl = await UB.Repository('hr_payEl').attrs('dictTimeCostID').selectById(me.orderConfig.payElIDMain)
        if (payEl && payEl.dictTimeCostID) {
          me.attr.dictTimeCostID.setValueById(payEl.dictTimeCostID)
          me.attr.dictTimeCostID.setDisabled(true)
        }
      }
    }
  }
  me.enableControls()
}

function findOrderAttrConfig () {
  return this.orderAttrConfigList.length ? this.orderAttrConfigList[0] : null
}

function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.isInnerChange) {
    return
  }
  switch (field.name) {
    case 'departmentID':
      const grid = me.down('[name=empOrderDowntimeListDet]')
      if (grid.getStore().getCount() > 0) {
        $App.dialogYesNo('Попередження', UB.i18n('Список працівників буде очищено. Продовжити?'))
          .then(res => {
            if (res) {
              me.clearEmployees()
            } else {
              me.isInnerChange = true
              field.setValueById(oldValue, undefined, () => {
                me.isInnerChange = false
              })
            }
          })
      }
      break
    case 'payElID':
      const dictTimeCostID = field.getFieldValue('dictTimeCostID')
      if (dictTimeCostID) {
        me.attr.dictTimeCostID.setValueById(dictTimeCostID)
        me.attr.dictTimeCostID.setDisabled(true)
      } else {
        me.attr.dictTimeCostID.setDisabled(!me.orderConfig.canEditPayElMain)
      }
      break
  }
}

function enableControls () {
  const me = this
  const orderState = me.record.get('orderID.orderState') || 'PROJECT'
  let enabled = orderState === 'PROJECT'
  const gridEmp = me.down('[name=empOrderDowntimeListDet]')
  const fillPersonsAction = gridEmp.down('[actionId=fillPersons]')
  if (fillPersonsAction) {
    fillPersonsAction.setDisabled(!enabled)
  }
  const clearPersonsAction = gridEmp.down('[actionId=clearPersons]')
  if (clearPersonsAction) {
    clearPersonsAction.setDisabled(!enabled)
  }
  if (me.orderConfig) {
    me.attr.payElID.setDisabled(!me.orderConfig.canEditPayElMain)
    if (!me.attr.dictTimeCostID.disabled) {
      me.attr.dictTimeCostID.setDisabled(!me.orderConfig.canEditPayElMain)
    }
  } else {
    me.attr.payElID.setDisabled(true)
    me.attr.dictTimeCostID.setDisabled(true)
  }
  me.orderForm.enableParaControls(this)
  HR.orderManager.disableContextMenuItems(me.attr.dictTimeCostID, ['addItem', 'editItem'])
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
  AC.gridUtils.setDetailGridsFormData(me, params)
}

function onAfterSave () {
  const me = this
  const grid = me.down('[name=empOrderDowntimeListDet]')
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
  let depTreePath = me.getField('departmentID').getFieldValue('mi_treePath')
  if (depTreePath) {
    let dep = await UB.Repository('hr_department')
      .attrs('mi_data_id')
      .where('mi_treePath', 'startWith', depTreePath)
      .where('state', '=', 'ACTIVE')
      .misc({
        __mip_ondate: onDate
      })
      .selectAsObject()
    whereList.department = {
      expression: '',
      condition: 'subquery',
      subQueryType: 'exists',
      value: {
        entity: 'hr_position',
        method: 'select',
        fieldList: [
          'mi_data_id'
        ],
        whereList: {
          dep: {
            expression: '[parentUnitID]',
            condition: 'in',
            value: dep.map(rec => rec.mi_data_id)
          },
          dateFrom: {
            expression: '[mi_dateFrom]',
            condition: 'lessEqual',
            value: onDate
          },
          dateTo: {
            expression: '[mi_dateTo]',
            condition: 'moreEqual',
            value: onDate
          },
          notDeleted: {
            expression: '[mi_deleteDate]',
            condition: 'equal',
            value: '#maxdate'
          },
          state: {
            expression: '[state]',
            condition: 'equal',
            value: 'ACTIVE'
          },
          correlat: {
            expression: '[mi_data_id]=[{master}.positionID]',
            condition: 'custom'
          }
        }
      }
    }
  }
  ctrl.getStore().ubRequest.whereList = whereList
  return ctrl.getStore().load()
}

function loadEmployees (data, isDelete) {
  const me = this
  if (data.length) {
    const grid = me.down('[name=empOrderDowntimeListDet]')
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
          depName: item.depName,
          posName: item.posName,
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
  const grid = me.down('[name=empOrderDowntimeListDet]')
  grid.getStore().removeAll()
  HR.orderManager.setIsDirty(me, true)
}

function filterDepartment () {
  const me = this
  const ctrl = me.getField('departmentID')
  if (!ctrl) {
    return
  }
  const onDate = me.orderForm.record.get('orderDate') || me.orderForm.record.get('entryDate')
  AC.viewUtils.setWhereListProperty(ctrl, [
    ['orgID', '=', me.record.get('organizationID')],
    ['mi_dateFrom', '<=', onDate],
    ['mi_dateTo', '>=', onDate],
    ['state', '=', 'ACTIVE']
  ])
}

/* Перевірки при збереженні форми */
function validateForm (showMessage) {
  const me = this
  let result = true
  let errors = []
  const errorTag = 0
  let posIDCheckPromise
  // me.dontCloseOnError = false

  if (me.enableValidators) {
    const empOrderDowntimeListDet = me.down('[name=empOrderDowntimeListDet]')
    const listStore = empOrderDowntimeListDet.store
    let isListCheckErr = listStore.getCount() === 0
    if (isListCheckErr) {
      errors.push({
        tag: 0,
        code: 'listExistCheck',
        msg: UB.i18n('Не додано інформацію про працівників')
      })
      result = false
      // me.dontCloseOnError = true
    }

    let empPosIDs4Check = []
    listStore.data.items.forEach(rec => {
      if (!rec.get('employeePositionID.positionID')) {
        let empPosID = rec.get('employeePositionID')
        empPosID && empPosIDs4Check.push(empPosID)
      }
    })
    if (empPosIDs4Check.length) {
      posIDCheckPromise = UB.Repository('hr_employeePositionS')
        .attrs(['positionID', 'description'])
        .where('ID', 'in', empPosIDs4Check)
    }
  }

  return Promise.resolve(true)
    .then(res => {
      if (posIDCheckPromise) {
        return posIDCheckPromise.selectAsObject()
      } else {
        return Promise.resolve(false)
      }
    }).then(data => {
      if (data) {
        data.forEach(item => {
          if (!item.positionID) {
            errors.push({
              tag: 0,
              code: 'empTableCheck',
              msg: UB.i18n(`Працівник {0} не має табелювання`, item.description)
            })
          }
        })
      }
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
  const grid = me.down('[name=empOrderDowntimeListDet]')
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
