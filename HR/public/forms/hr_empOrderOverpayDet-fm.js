/* global  HR AC  $App UB */
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
  findOrderAttrConfig,
  filterEmployeePosition
}

function filterEmployeePosition ({
  ctrlToFilter
}) {
  let store = ctrlToFilter.getStore()
  let me = this
  store.ubRequest.whereList = {
    organizationID: {
      expression: '[organizationID]',
      condition: 'equal',
      value: me.record.get('organizationID')
    },
    dateFrom: {
      expression: '[dateFrom]',
      condition: 'lessEqual',
      value: me.record.get('dateTo')

    },
    dateTo: {
      expression: '[dateTo]',
      condition: 'moreEqual',
      value: me.record.get('dateFrom')

    }
  }
}
function gridEditing (mode) {
  let me = this
  me.gridEditingMode = mode
  me.getField('periodID').setDisabled(mode === 'start')
}

function setupView () {
  let me = this
  let grid = me.down('[name=hr_empOrderChgSalEmpDet]')
  grid.down('[dataIndex=newValue]').setText(UB.i18n('Кількість годин переробітку'))
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
    entity: 'hr_empOrderOverpayDet',
    method: 'loadEmployeeList',
    organizationID: me.record.get('organizationID'),
    onDate: AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom')),
    dateFrom: AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom')),
    dateTo: AC.dateService.truncTimeToUtcNull(me.record.get('dateTo')),
    paraID: me.record.get('ID'),
    reason: me.record.get('reason') || UB.i18n('доповідна записка'),
    payElID: me.record.get('payElID'),
    orderID: me.record.get('orderID'),
    empOrderType: me.getEmpOrderType(),
    isDeleteExisting: isDelete,
    records: data.map(o => o.employeePositionID) || []
  }
  $App.connection.run(execParams)
    .then((mParams) => {
      let insCount = mParams.insCount || 0
      if (insCount === 0) {
        $App.dialogInfo(UB.i18n('За такими умовами відбору не знайдено працівників, які мають переробіток'), UB.i18n('Увага'))
      }
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

  if (empOrderType === 'OVERPAY') {
    if (me.isNewInstance) {
      const config = me.findOrderAttrConfig()
      const payElCtrl = me.getField('payElID')
      if (config) {
        payElCtrl.setValueById(config.payElIDMain)
      } else {
        // Доплата за роботу в надурочний час
        UB.Repository('hr_payEl')
          .attrs('ID')
          .where('code', '=', '9').limit(1)
          .selectSingle()
          .then(data => {
            if (data) {
              me.record.set('payElID', data.ID)
            } else {
              UB.Repository('hr_payEl')
                .attrs('ID').limit(1)
                .selectSingle()
                .then(data => {
                  me.record.set('payElID', data.ID)
                })
            }
          })
      }
    }
  }
  let payElID = me.getField('payElID')
  if (!payElID) {
    return
  }

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
      .where('methodID.code', '=', '12').limit(1)
      .selectSingle().then(rec => {
        if (rec) {
          payElID.setValueById(rec.ID)
        }
      })
  }
}

function enableControls () {
  const me = this
  me.orderForm.enableParaControls(me, [me.down('[ubID=btnAddEmp]') || {}])
  const config = me.findOrderAttrConfig()
  const payElCtrl = me.getField('payElID')
  if (config) {
    payElCtrl.setDisabled(!config.canEditPayElMain)
  } else {
    payElCtrl.setDisabled(true)
  }
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
      break
  }
}

function initComponentDone () {
  let me = this
  let sender = me.sender

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
      me.record.set('dateFrom', ctrl.getFieldValue('dateFrom'))
      me.record.set('dateTo', ctrl.getFieldValue('dateTo'))
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
  /*

        */

  me.on('recordloaded', async function (a) {
    let
      me = this
    if (me.isNewInstance) {
      me.record.set('orderID', me.masterForm.instanceID)
      me.record.set('reason', UB.i18n('доповідна записка'))
      // me.record.set('dateFrom', AC.dateService.todayDate())
      me.record.set('organizationID', me.masterForm.record.get('organizationID'))
      me.record.set('roundUpTo', '1')
      me.record.set('empOrderType', me.customParams.empOrderType)
    }
    me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
    me.setPeriodID()
    me.setDepartmentID()
    me.setPayElID()
    HR.orderManager.setTitleByOrderType(me)
    me.onBeforeSave = () => {
      return Promise.resolve(true)
    }

    HR.orderManager.setDefaultValues(me)
    // me.masterForm.makeReasonSelector(me)
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    me.enableControls()
    me.setupView()
  })
  me.on('formDataReady', () => {
    if (me.getField('payElID')) {
      HR.orderManager.disableContextMenuItems(me.getField('payElID'), ['addItem', 'editItem'])
    }
  })
  this.on('beforeSaveForm', function (a) {})
  me.on('aftersave', function (a) {
    let grid = me.down('[name=hr_empOrderChgSalEmpDet]')
    grid.actions.refresh.setDisabled(true)
  })
  this.on('beforeDelete', function (a) {})
  this.on('afterDelete', function (a) {})
  this.on('beforeClose', function (a) {})
}

function findOrderAttrConfig () {
  return (this.orderAttrConfigList && this.orderAttrConfigList.length) ? this.orderAttrConfigList[0] : null
}
