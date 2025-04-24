/* global AC HR _ $App UB appAC appHR */
exports.formCode = {
  initComponentStart,
  onFormDataReady,
  onControlChanged,
  onCheckValidBeforeSaveOrder,
  addBaseActions,
  postInit
}

function initComponentStart () {
  const me = this
  HR.orderManager.init(me)
}

function postInit (me) {
  me.attr.dictFundSourceID.store.ubRequest.method = 'selectByOrg'
  me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('orderRegistryID.organizationID') || appAC.globalOrganization()
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
    me.record.set('flagsRec', 2)
    me.record.set('flagsFix', 1)
  }
  const globalOrganization = appAC.globalOrganization()
  appHR.getCurrentPeriod(globalOrganization).then(response => {
    let payElStore = me.attr.payElID.getStore()
    if (response) {
      AC.viewUtils.setFilterValue(me.attr.payElID, {
        'methodID.code': '3',
        'dateTo': { value: response.dateFrom, condition: '>=' },
        'dateFrom': { value: response.dateTo, condition: '<=' }
      })
    }
    payElStore.load()
  })
  AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
    ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
    ['dateTo', '<', '#maxdate', 'dismDateTo'],
    ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
    ['dateTo', '>=', AC.dateService.shiftDate(me.record.get('orderDate')), 'dateTo'],
    ['dateFrom', '<=', AC.dateService.shiftDate(me.record.get('orderDate')), 'dateFrom']
  ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
  AC.viewUtils.setFilterValue(me.attr.employeeCPHID, { employeeNumberID: me.record.get('employeeNumberID') })
  me.setActionDisabled('fDelete', me.record.get('orderState') === 'POSTED')
}

function onControlChanged (me, field, value) {
  let employeeID
  if (me.formDataReady) {
    switch (field.name) {
      case 'employeePositionID':
        employeeID = field.getFieldValue('employeeID')
        me.attr.employeeNumberID.setValue(field.getFieldValue('employeeNumberID'))
        me.attr.employeeID.setValue(employeeID)
        const periodDateTo = AC.dateService.lastDayOfMonth(me.record.get('orderRegistryID.periodID.dateFrom'))
        AC.viewUtils.setFilterValue(me.attr.employeeCPHID, {
          employeeNumberID: field.getFieldValue('employeeNumberID'),
          dateFrom: { value: periodDateTo, condition: '<=' }
        }, ['clearValue'])
        break
      case 'dateFrom':
        if (AC.dateService.isValid(value) && me.attr.dateFrom.rawValue.length === 10) {
          AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
            ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
            ['dateTo', '<', '#maxdate', 'dismDateTo'],
            ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
            ['dateTo', '>=', AC.dateService.shiftDate(me.record.get('orderDate')), 'dateTo'],
            ['dateFrom', '<=', AC.dateService.shiftDate(me.record.get('orderDate')), 'dateFrom']
          ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
        }
        break
    }
  }
}

function onCheckValidBeforeSaveOrder () {
  const me = this
  const employeeCPHID = me.record.get('employeeCPHID')
  if (!employeeCPHID) {
    return Promise.resolve(true)
  }
  const dogPaySum = me.attr.employeeCPHID.getFieldValue('paySum')
  return UB.Repository('hr_docRegDogCPHPay')
    .attrs(['SUM([paySum])'])
    .where('employeeCPHID', '=', employeeCPHID)
    .where('ID', 'notEqual', me.record.get('ID'))
    .selectScalar()
    .then(paidSum => {
      const maxPaySum = AC.currencyService.round(dogPaySum - (paidSum || 0), 2)
      if (me.record.get('paySum') > maxPaySum) {
        paidSum = me.record.get('paySum') + (paidSum || 0)
        return $App.dialogYesNo(UB.i18n('Увага'), UB.i18n(`За договором сума {0}, а актів внесено на суму {1}. Зберігати?`, AC.currencyService.formatAsCurrency(dogPaySum), AC.currencyService.formatAsCurrency(paidSum || 0)))
      } else {
        return Promise.resolve(true)
      }
    })
}

function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['fDelete', 'postingAction', 'cancelPostingAction'],
    state: {
      PROJECT: { action: ['postingAction', 'fDelete'] },
      POSTED: { action: ['cancelPostingAction'] }
    }
  }
  me.callParent(arguments)
  HR.orderManager.addOrderAction(me)
}
