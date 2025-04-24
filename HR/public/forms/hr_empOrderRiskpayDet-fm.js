/* global  HR AC  $App UB appAC */
/* jshint maxerr: 10000 */
exports.formCode = {
  initComponentStart,
  createActions,
  addBaseActions,
  initUBComponent,
  setPayElID,
  setPeriodID,
  enableControls,
  initComponentDone,
  getEmpOrderType,
  setupView,
  gridEditing,
  loadEmployeers,
  onControlChanged,
  setDepartmentID,
  filterEmployeePosition
}

async function filterEmployeePosition (ctrl) {
  const me = this
  const onDate = AC.dateService.truncTimeToUtcNull(appAC.globalApplicationDate())
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
      'subQueryType': 'exists',
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

function gridEditing (mode) {
  let me = this
  me.gridEditingMode = mode
  me.getField('payElID').setDisabled(mode === 'start')
  me.getField('periodID').setDisabled(mode === 'start')
  me.getField('payRate').setDisabled(mode === 'start')
  me.getField('departmentID').setDisabled(mode === 'start')
}

function setupView () {
  let me = this
  let grid = me.down('[name=hr_empOrderChgSalEmpDet]')
  grid.down('[dataIndex=newValue]').setText(UB.i18n('Кількість годин роботи у шкідливих умовах'))
}

function initComponentStart () { // Вызывается прямо перед запуском инициализации формы.
  // В этом событии  можно изменить конфигурацию формы.
  let me = this
  me.on('afterrender', function () {})

  me.on('aftersave', () => {
    setTimeout(function () {
      let grid = me.down('[name=hr_empOrderChgSalEmpDet]')
      if (!grid) { // Зберегти та закрити
        return
      }
      grid.actions.refresh.setDisabled(false)
      let editor = grid.editingPlugin.editor
      if (editor && !editor.hidden) {
        return
      }
      grid.getStore().load()
    }, 1000)
  }, me)
  me.on('controlChanged', onControlChanged, me)
}

function createActions () {

}

function loadEmployeers (data, isDelete) {
  const me = this
  me.setLoading(true)
  const gridEmp = me.down('[name=hr_empOrderChgSalEmpDet]')
  const execParams = {
    entity: 'hr_empOrderRiskpayDet',
    method: 'loadEmployeeList',
    organizationID: me.record.get('organizationID'),
    onDate: AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom')),
    dateFrom: AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom')),
    dateTo: AC.dateService.truncTimeToUtcNull(me.record.get('dateTo')),
    paraID: me.record.get('ID'),
    payElID: me.record.get('payElID'),
    orderID: me.record.get('orderID'),
    dictFundSourceID: me.record.get('dictFundSourceID'),
    empOrderType: me.getEmpOrderType(),
    accrualRate: me.record.get('payRate'),
    newValue: 0,
    isDeleteExisting: isDelete,
    records: data.map(o => o.employeePositionID) || []
  }
  $App.connection.run(execParams)
    .then(() => {
      gridEmp.getStore().load()
      me.setLoading(false)
    })
}

function addBaseActions () {
  this.createActions()
  this.callParent(arguments)
}

function initUBComponent () { // Вызывается после окончания привязки данных к элементам формы. Непосредственно перед formDataReady  и перед снятием блокировки формы (затемнение) .
}

function setPeriodID () {
  const me = this
  const ctrl = me.getField('periodID')
  if (!ctrl) {
    return
  }
  AC.viewUtils.setWhereListProperty(ctrl, [
    ['orgID', '=', me.record.get('organizationID')]
  ])
  if (me.isNewInstance) {
    UB.Repository('hr_dictPeriod')
      .attrs('ID')
      .where('orgID', '=', me.record.get('organizationID'))
      .where('isCurrent', '=', 1)
      .selectSingle()
      .then(data => {
        if (data) {
          ctrl.setValueById(data.ID)
        }
      })
  }
}

function setDepartmentID () {
  const me = this
  const ctrl = me.getField('departmentID')
  if (!ctrl) {
    return
  }
  const onDate = AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate') || me.orderForm.record.get('entryDate'))
  AC.viewUtils.setWhereListProperty(ctrl, [
    ['orgID', '=', me.record.get('organizationID')],
    ['mi_dateFrom', '<=', onDate],
    ['mi_dateTo', '>=', onDate],
    ['state', '=', 'ACTIVE']
  ])
}

function getEmpOrderType () {
  return this.customParams.empOrderType || this.record.get('empOrderType')
}

function setPayElID () {
  let me = this
  let empOrderType = me.getEmpOrderType()
  let payElCode
  let payElID = me.getField('payElID')
  if (empOrderType === 'BOUNTY') {
    payElCode = '12'
    AC.viewUtils.setWhereListProperty(payElID, [
      ['methodID.methodGroupID.code', '=', '3']
    ])
  } else if (empOrderType === 'BOUNTY_HELP') {
    payElCode = null
    AC.viewUtils.setWhereListProperty(payElID, [
      ['dictFundSourceID.dictFundTypeID.code', '<>', '02'],
      ['methodID.methodGroupID.code', '=', '7']
    ])
  }
  if (!payElCode) {
    return
  }
  if (empOrderType === 'BOUNTY' && me.isNewInstance) {
    UB.Repository('hr_payEl')
      .attrs('ID')
      .where('methodID.code', '=', '12')
      .selectSingle().then(rec => {
        if (rec) {
          payElID.setValueById(rec.ID)
        }
      })
  }
}

function enableControls () {
  this.isReadOnly = this.orderForm.enableParaControls(this)
}

async function onControlChanged (field, value, oldValue) {
  let me = this
  if (field.skipChanged) {
    delete field.skipChanged
    return
  }
  switch (field.name) {
    case 'payElID':
    case 'periodID':
    case 'departmentID':
      let grid = me.down('[name=hr_empOrderChgSalEmpDet]')
      if (grid.getStore().getCount() !== 0) {
        let agree = await $App.dialogYesNo('Попередження', UB.i18n('Список працівників буде очищено.Продовжити?'))
        if (agree) {
          grid.actions.refresh.setDisabled(true)
          grid.getStore().loadData([])
        } else {
          field.skipChanged = true
          if (['payElID', 'periodID', 'departmentID'].includes(field.name)) {
            field.setValueById(oldValue)
          } else {
            field.setValue(oldValue)
          }
        }
      }
      if (field.name === 'payElID' && field.getFieldValue('dictFundSourceID')) {
        me.attr.dictFundSourceID.setValueById(field.getFieldValue('dictFundSourceID'))
      }
      break
  }
}

function initComponentDone () {
  let me = this
  let sender = me.sender
  AC.viewUtils.setAttr(me)

  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  if (sender) {
    let reco = AC.gridUtils.getCurrentRecord(sender)
    if (reco) {
      let tab = me.down(`[name=${reco.get('mi_unityEntity')}]`)
      if (tab) {
        tab.show()
      }
    }
  }
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    if (modified.includes('periodID')) {
      let ctrl = me.getField('periodID')
      me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(ctrl.getFieldValue('dateFrom')))
      me.record.set('dateTo', AC.dateService.truncTimeToUtcNull(ctrl.getFieldValue('dateTo')))
    }
  })
  me.orderState = me.masterForm.record.get('orderState')
  me.on('beforeClose', function (a) {
    if (sender) {
      let grid = sender.onRefresh ? me.sender : (sender.panel && sender.panel.onRefresh) ? sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  })

  me.on('recordloaded', async function (a) {
    let
      me = this
    me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
      HR.orderManager.showIf(me)
      HR.orderManager.requiredIf(me)
    })
    if (me.isNewInstance) {
      me.record.set('orderID', me.masterForm.instanceID)
      me.record.set('organizationID', me.masterForm.record.get('organizationID'))
      me.record.set('roundUpTo', '1')
      me.record.set('empOrderType', me.customParams.empOrderType)
      const orderConfig = await UB.Repository('hr_empOrderDetConfig')
        .attrs(['payElIDMain', 'canEditPayElMain'])
        .where('empOrderType', '=', me.customParams.empOrderType || null)
        .where('organizationID', '=', me.record.get('organizationID'))
        .selectSingle()
      if (orderConfig) {
        if (orderConfig.payElIDMain) me.record.set('payElID', orderConfig.payElIDMain)
        const ctrlPayElID = me.down('[name=payElID]')
        if (ctrlPayElID) ctrlPayElID.setDisabled(!orderConfig.canEditPayElMain)
      }
    }
    me.setPeriodID()
    me.setDepartmentID()
    me.setPayElID()
    HR.orderManager.setTitleByOrderType(me)
    me.onBeforeSave = () => {
      return Promise.resolve(true)
    }

    HR.orderManager.setDefaultValues(me)
    me.orderForm.makeReasonSelector(me, {
      reasonFieldName: 'reason',
      entityName: 'hr_dictReasonRiskPay'
    })
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    me.enableControls()
    me.setupView()
  })
  me.on('formDataReady', ctx => {
    HR.orderManager.disableContextMenuItems(me.getField('payElID'), ['addItem', 'editItem'])
  })
  this.on('beforeSaveForm', function (a) {})
  me.on('aftersave', function (a) {
    let grid = me.down('[name=hr_empOrderChgSalEmpDet]')
    grid.actions.refresh.setDisabled(true)
  })
  this.on('beforeDelete', function (a) {})
  this.on('afterDelete', function (a) {})
  this.on('beforeClose', function (a) {})
  me.attr.dictFundSourceID.store.ubRequest.method = 'selectByOrg'
  me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('organizationID') || me.masterForm.record.get('organizationID') || appAC.globalOrganization()
}
