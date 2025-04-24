/* global  HR AC $App UB appAC */
exports.formCode = {
  initComponentStart,
  createActions,
  addBaseActions,
  initUBComponent,
  enableControls,
  filterDepartment,
  initComponentDone,
  onBeforeGridEdit,
  buildPositionQuery,
  onControlChanged,
  setAccrualCtrlFilter
}

async function onControlChanged (field, value, oldValue) {
  let me = this
  switch (field.name) {
    case 'payElID':
      if (field.skipOnChanged) {
        delete field.skipOnChanged
        return
      }

      const grid = me.down('[name=hr_empOrderChgSalEmpDet]')
      if (grid.getStore().getCount() !== 0) {
        let agree = await $App.dialogYesNo('Попередження', UB.i18n('Список працівників буде очищено.Продовжити?'))
        if (agree) {
          grid.getStore().loadData([])
          // grid.actions.refresh.setDisabled(true)
          $App.connection.run({
            entity: 'hr_empOrderAddsalaryDet',
            method: 'clearEmployees',
            ID: me.instanceID
          })
        } else {
          field.skipOnChanged = true
          field.setValueById(oldValue)
        }
      }
      break
  }
}
function buildPositionQuery () {
  let me = this
  let payElID = me.record.get('payElID')
  let departmentID = me.getField('departmentID').getFieldValue('mi_data_id')
  let organizationID = me.record.get('organizationID')
  let dateFrom = AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom'))

  let repo = UB.Repository('hr_employeePositionS').attrs('ID')
    .where('organizationID', '=', organizationID)
    .where('dateFrom', '<=', dateFrom)
    .where('dateTo', '>=', dateFrom)
    .whereIf(!AC.entityUtils.verifyRightsMethod('hr_employeeNumber', 'employeeLimitedAccess'), 'employeeNumberID.limitedAccess', '=', 0)

  if (departmentID) {
    repo = repo.where('departmentID', '=', departmentID)
  }
  repo = repo.exists(
    UB.Repository('hr_employeeAccrual')
      .attrs('ID')
      .correlation('employeeNumberID', 'employeeNumberID')
      .where('payElID', '=', payElID)
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateFrom)
      .where('mi_deleteDate', '>=', '#maxdate')
  )
  return repo.ubql()
}

function setAccrualCtrlFilter (ctrl, params = {}, modes) {
  const me = this
  if (!modes.includes('clearWhereList')) modes.push('clearWhereList')
  AC.viewUtils.setWhereListProperty(ctrl, [
    ['payElID', '=', me.record.get('payElID')],
    ['employeeNumberID', '=', params.employeeNumberID],
    ['dateFrom', '<=', params.dateFrom],
    ['dateTo', '>=', params.dateFrom]
  ], undefined, modes)

  const store = ctrl.getStore()
  store.ubRequest.whereList.notExists = {
    expression: '',
    condition: 'subquery',
    subQueryType: 'notExists',
    value: {
      entity: 'hr_empOrderChgSalEmpDet',
      fieldList: [],
      method: 'select',
      whereList: {
        cond: {
          expression: '[accrualID]=[{master}.ID]',
          condition: 'custom'
        },
        para: {
          expression: '[paraID]',
          condition: 'equal',
          value: me.instanceID
        },
        miDeleteDate: {
          expression: '[mi_deleteDate]',
          condition: 'equal',
          value: '#maxdate'
        }
      }
    }
  }
  if (params.accrualID) {
    store.ubRequest.whereList.accrual = {
      expression: '[ID]',
      condition: '=',
      value: params.accrualID
    }
    store.ubRequest.logicalPredicates = ['([accrual] OR [notExists])']
  }
  store.load()
}

function onBeforeGridEdit (rowEditor, context) {
  let me = this
  if (context.grid.isEditDisabled || me.orderForm.record.get('orderState') === 'POSTED') {
    return false
  }

  let editor = rowEditor.editor
  let reco = context.record
  let dateFrom = AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom'))
  let empPos = editor.query(`[name=employeePositionID.description]`)[0]
  let accrualIDCtrl = editor.query(`[name=accrualID.descriptionExt]`)[0]
  const dateToEmpty = editor.query(`[name=dateToEmpty]`)[0]
  const removeAccrual = editor.query(`[name=removeAccrual]`)[0]
  let isNewInstance = reco.phantom
  if (isNewInstance) {
    reco.set('payElID', me.record.get('payElID'))
    reco.set('dateToEmpty', dateFrom)
    reco.set('empOrderType', me.record.get('empOrderType'))
  }
  empPos.getStore().ubRequest.whereList = me.buildPositionQuery().whereList
  empPos.getStore().load()
  me.setAccrualCtrlFilter(accrualIDCtrl, {
    employeeNumberID: reco.get('employeePositionID.employeeNumberID'),
    dateFrom,
    accrualID: reco.get('accrualID')
  }, ['clearWhereList'])
  empPos.on('change', (ctrl, curValue, oldValue) => {
    let value = ctrl.getFieldValue('ID')
    if (value) {
      const modes = ['clearStore', 'clearWhereList']
      if (value !== reco.get('employeePositionID')) modes.push('clearValue')
      me.setAccrualCtrlFilter(accrualIDCtrl, {
        employeeNumberID: ctrl.getFieldValue('employeeNumberID'),
        dateFrom,
        accrualID: reco.get('accrualID')
      }, modes)
    }
  })
  accrualIDCtrl.on('change', ctrl => {
    reco.set('dateFrom', AC.dateService.shiftDate(ctrl.getFieldValue('dateFrom')))
    removeAccrual.setValue(dateToEmpty.getValue() && accrualIDCtrl.getFieldValue('dateFrom') &&
      AC.dateService.shiftDate(dateToEmpty.getValue()).getTime() === AC.dateService.shiftDate(accrualIDCtrl.getFieldValue('dateFrom')).getTime())
  })
  dateToEmpty.on('change', ctrl => {
    removeAccrual.setValue(dateToEmpty.getValue() && accrualIDCtrl.getFieldValue('dateFrom') &&
      AC.dateService.shiftDate(dateToEmpty.getValue()).getTime() === AC.dateService.shiftDate(accrualIDCtrl.getFieldValue('dateFrom')).getTime())
  })
  return true
}

function initComponentStart () {
  let me = this
  me.on('controlChanged', onControlChanged, me)
}

function createActions () {
}

function addBaseActions () {
  this.createActions()
  this.callParent(arguments)
}

function initUBComponent () { // Вызывается после окончания привязки данных к элементам формы. Непосредственно перед formDataReady  и перед снятием блокировки формы (затемнение) .

}

function enableControls () {
  let isDisabled = this.orderForm.enableParaControls(this)
  this.down('[actionId=fillData]').setDisabled(isDisabled)
}

function filterDepartment ({
  isReload = false,
  isClear = false
} = {}) {
  let me = this
  return me.orderForm.filterDepartment({
    form: me,
    isReload: true,
    isClear: isClear,
    ctrl: me.getField('departmentID')
  })
}

function initComponentDone () {
  let
    me = this

  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.orderState = me.orderForm.record.get('orderState')
  me.onBeforeSave = () => {
    return Promise.resolve(true)
  }

  me.on('beforeClose', function (a) {
    AC.gridUtils.refreshSenderUBGrid(me)
  })
  me.on('recordloaded', function (a) {
    let
      me = this
    if (me.isNewInstance) {
      me.record.set('orderID', me.orderForm.instanceID)
      me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(appAC.globalApplicationDate()))
      me.record.set('organizationID', me.orderForm.record.get('organizationID'))
    }

    HR.orderManager.setDefaultValues(me)
    // me.masterForm.makeReasonSelector(me)
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    me.enableControls()
    me.filterDepartment()
  })
  me.on('afterrender', ctx => {
    AC.viewUtils.setWhereListProperty(me.getField('payElID'), [
      ['methodID.methodGroupID.code', '=', '2', 'isSalary'],
      ['methodID.code', '=', '137', 'isDownTime']
    ], ['([isSalary] OR [isDownTime])'])
    HR.orderManager.disableContextMenuItems(me.getField('payElID'), ['addItem', 'editItem'])
    me.orderForm.makeReasonSelector(me)
  })

  this.on('beforeSaveForm', function (a) {})
  this.on('aftersave', function (a) {})
  this.on('beforeDelete', function (a) {})
  this.on('afterDelete', function (a) {})
  this.on('beforeClose', function (a) {})
}
