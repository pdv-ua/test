/* global  HR AC Ext $App UB */
exports.formCode = {
  initComponentStart,
  createActions,
  addBaseActions,
  addActions,
  initUBComponent,
  enableControls,
  initComponentDone,
  onControlChanged,
  gridEditing,
  onPayTypeChanged,
  onAccrualValueChanged,
  validateRankAccrualSum,
  loadEmployeers,
  setPayElFilter
}
function loadEmployeers (data, isDelete) {
  const me = this
  me.setLoading(true)
  const gridEmp = me.down('[name=hr_empOrderChgSalEmpDet]')
  const store = gridEmp.getStore()
  $App.connection.run({
    entity: 'hr_empOrderChgSalEmpDet',
    method: 'fillAddSalary',
    data: JSON.stringify(data),
    orderID: me.record.get('orderID'),
    payElID: me.record.get('payElID'),
    paraID: me.instanceID,
    payType: me.record.get('payType'),
    departmentID: null,
    accrualValue: me.record.get('accrualValue'),
    organizationID: me.record.get('organizationID'),
    dateFrom: me.record.get('dateFrom'),
    dateTo: me.record.get('dateTo'),
    empOrderType: me.record.get('empOrderType'),
    isDeleteExisting: isDelete
  }).then(mParams => {
    me.setLoading(false)
    store.load().then(() => {
      AC.viewUtils.showToast(mParams.count ? UB.i18n(`Завантажено {0} записів`, mParams.count) : 'Нічого не завантажено')
    })
  }).catch(e => {
    me.setLoading(false)
    AC.viewUtils.showToast(UB.i18n('Помилка'), e.message)
  })
}
async function onPayTypeChanged (field, newVal, oldVal) {
  let me = this
  me.down('[name=payTypeSign]').update(newVal === 'PRC' ? '%' : UB.i18n('грн'))
  if (field.skipOnChanged) {
    delete field.skipOnChanged
  } else {
    if (newVal === 'SUM' && me.getField('payElID').getFieldValue('methodID.code') === '5') {
      me.validateRankAccrualSum(me.record.get('accrualValue'))
    }
  }
}

function onAccrualValueChanged (ctrl) {
  const me = this
  if (me.record.get('payType') === 'SUM' && me.getField('payElID').getFieldValue('methodID.code') === '5') {
    me.validateRankAccrualSum(ctrl.getValue())
  }
}

function validateRankAccrualSum (value) {
  const me = this
  const onDate = me.record.get('dateFrom') || AC.dateService.currentDate()
  UB.Repository('hr_dictSalaryRank')
    .attrs('ID')
    .where('paySum', '=', value)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectSingle().then(data => {
      if (!data) {
        AC.viewUtils.showToast(UB.i18n('Увага! Невірна сума надбавки за ранг! Уточніть можливі значення надбавки у довіднику "Надбавки за ранги держслужбовців"'))
      }
    })
}

function gridEditing (mode) {
  let me = this
  me.gridEditingMode = mode
  me.getField('payElID').setDisabled(mode === 'start')
  me.getField('dateFrom').setDisabled(mode === 'start')
  me.getField('payType').setDisabled(mode === 'start')
  me.getField('accrualValue').setDisabled(mode === 'start')
  let valuation = me.getField('payElID').getFieldValue('methodID.valuation')
  me.getField('payType').setDisabled(mode === 'start' || valuation !== 'SUMRATE')
}

async function onControlChanged (field, value, oldValue) {
  let me = this
  switch (field.name) {
    case 'payElID':
      if (field.skipOnChanged) {
        delete field.skipOnChanged
        return
      }

      if (value && field.getFieldValue('dictFundSourceID')) {
        me.getField('dictFundSourceID').setValueById(field.getFieldValue('dictFundSourceID'))
      }
      const grid = me.down('[name=hr_empOrderChgSalEmpDet]')
      if (me.record.get('empOrderType') === 'ADDSALARY' && grid.getStore().getCount() !== 0) {
        let agree = await $App.dialogYesNo('Попередження', UB.i18n('Список працівників буде очищено.Продовжити?'))
        if (agree) {
          grid.getStore().loadData([])
          // grid.actions.refresh.setDisabled(true)
          $App.connection.run({
            entity: me.entityName,
            method: 'clearEmployees',
            ID: me.instanceID
          })
        } else {
          field.skipOnChanged = true
          field.setValueById(oldValue)
          return
        }
      }
      let valuation = field.getFieldValue('methodID.valuation')
      let payType = me.getField('payType')
      if (valuation !== 'SUMRATE') {
        me.record.set('payType', valuation === 'SUM' ? 'SUM' : 'PRC')
      }
      payType.setDisabled(valuation === 'RATE' || valuation === 'SUM' || me.gridEditingMode === 'start')
      break
  }
}

function initComponentStart () { // Вызывается прямо перед запуском инициализации формы.
  let me = this
  me.on('controlChanged', onControlChanged, me)
  me.on('afterrender', () => {
    me.orderForm.makeReasonSelector(me)
  })
}

function createActions () {
  let me = this
  if (!me.actions.recalc) {
    me.actions.recalc = new Ext.Action({
      actionId: 'recalc',
      eventId: 'recalc',
      text: UB.i18n('Перерахувати'),
      iconCls: 'fa fa-calculator',
      handler: async item => {
        if (await me.saveForm() === -1) {
          return
        }
        me.setLoading(UB.i18n('Виконується перерахунок...'))
        $App.connection.run({
          entity: me.entityName,
          method: 'recalc',
          ID: me.instanceID
        }).then(mParams => {
          me.down('[name=hr_empOrderChgSalEmpDet]').onRefresh()
        }).finally(() => {
          me.setLoading(false)
        })
      }
    })
  }
}

function addBaseActions () {
  this.createActions()
  this.callParent(arguments)
}

function initUBComponent () { // Вызывается после окончания привязки данных к элементам формы. Непосредственно перед formDataReady  и перед снятием блокировки формы (затемнение) .
  const me = this
  me.on('formDataReady', () => {
    const payType = me.record.get('payType')
    me.down('[name=payTypeSign]').update(payType === 'PRC' ? '%' : payType === 'SUM' ? UB.i18n('грн') : '?')
  })
}

function enableControls () {
  let isPosted = this.masterForm.enableParaControls(this)

  isPosted && this.actions.recalc.hide()
  this.isReadOnly = isPosted
}

function initComponentDone () {
  let
    me = this

  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.orderState = me.masterForm.record.get('orderState')
  me.on('beforeClose', function (a) {
    AC.gridUtils.refreshSenderUBGrid(me)
  })
  me.on('formDataReady', async function (a) {
    const me = this
    me.enableControls()
    if (!me.isReadOnly) {
      me.setPayElFilter()
    }
    me.down('[actionId=fillData]').setDisabled(me.isReadOnly)
    let valuation = me.getField('payElID').getFieldValue('methodID.valuation')
    if (me.isNewInstance) {
      me.record.set('orderID', me.masterForm.instanceID)
      me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate')))
      me.record.set('organizationID', me.masterForm.record.get('organizationID'))
      me.record.set('payType', 'PRC')
    }
    me.getField('payType').setDisabled(valuation === 'SUM' || valuation === 'RATE' || me.gridEditingMode === 'start' || me.isReadOnly)
    HR.orderManager.setDefaultValues(me)
    // me.masterForm.makeReasonSelector(me)
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    HR.orderManager.disableContextMenuItems(me.getField('payElID'), ['addItem', 'editItem'])
    if (!me.isReadOnly) {
      me.empNumbers = []
      me.setLoading(true)
      me.empNumbers = await UB.Repository('hr_empOrderChgSalEmpDet')
        .attrs(['ID', 'employeePositionID', 'employeePositionID.description', 'payElID', 'cancelPrevAccrual'])
        .where('orderID', '=', me.masterForm.instanceID)
        .where('paraID', '!=', me.instanceID)
        .selectAsObject()
      me.setLoading(false)
    }
    HR.orderManager.findMasterRecord(me, me.down('[name=hr_empOrderChgSalEmpDet]'), 'employeePositionID')
  })
  /*
  this.on('beforeSaveForm', function (a) {
    const grid = this.down('[name=hr_empOrderChgSalEmpDet]')
    grid.isEditDisabled = true
  })
  this.on('aftersave', function (a) {
    const grid = this.down('[name=hr_empOrderChgSalEmpDet]')
    grid.getStore().load().then(() => {
      if (grid.isStartEdit) {
        grid.isEditDisabled = false
        grid.addNewRecord(null, true)
      }
      grid.actions.refresh.setDisabled(false)
    })
  })
  */
  me.addActions()
}

function addActions () {
  const me = this
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }

  allActions.menu.add({
    xtype: 'menuseparator'
  })

  allActions.menu.add({
    text: UB.i18n('Інші види оплати'),
    name: 'actionClearPayElFilter',
    checked: false,
    hidden: me.isReadOnly,
    handler: function (btn) {
      me.setPayElFilter(btn.checked)
    }
  })
}

function setPayElFilter (isAll = false) {
  const me = this
  const btn = me.down('[name=actionClearPayElFilter]')
  if (isAll || (btn && btn.checked)) {
    AC.viewUtils.setWhereListProperty(me.getField('payElID'), [
      ['methodID.methodGroupID.groupType', '=', 'PAYMENT']
    ], undefined, ['clearStore', 'clearWhereList'])
  } else {
    AC.viewUtils.setWhereListProperty(me.getField('payElID'), [
      ['methodID.methodGroupID.code', '=', '2', 'isSalary'],
      ['methodID.code', '=', '74', 'isTariffMethod']
    ], ['([isSalary] OR [isTariffMethod])'], ['clearStore', 'clearWhereList'])
  }
}
