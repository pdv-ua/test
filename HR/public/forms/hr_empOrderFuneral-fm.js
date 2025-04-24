/* global AC HR _ UB appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  initOrderComponentDone,
  onFormDataReady,
  onControlChanged,
  addBaseActions
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    hideEditDocNumber: true,
    hideEditPeriodID: true
  }
  HR.orderManager.init(me)
}

function initComponentDone () {
  const me = this
  me.onBeforeSave = () => {
    if (me.attr.employeeFuneralID.getFieldValue('workPlace') === '4') { // поза штатом
      me.attr.dead.setValue(UB.i18n(`Працівник {0}`, me.attr.employeePositionID.getFieldValue('employeeID.fullFIO') || ''))
    } else {
      me.attr.dead.setValue(UB.i18n(`Родич(ка) {0} {1}`, me.attr.employeeFamilyID.getFieldValue('dictKinshipKindID.name') || '', me.attr.employeeFamilyID.getFieldValue('peopleID.fullFIO') || ''))
    }
    me.attr.description.setValue(UB.i18n(`{0} за свідоцтвом {1} {2} `, me.attr.employeeFuneralID.getFieldValue('employeeID.fullFIO'), me.attr.seriaDoc.getValue(), me.attr.numberDoc.getValue()))
    return Promise.resolve(true)
  }
}

function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['fDelete', 'postingAction', 'cancelPostingAction'],
    state: {
      PROJECT: { action: ['postingAction', 'fDelete'] },
      POSTED: { action: ['cancelPostingAction'] },
      PROCESSED: { action: [] }
    }
  }

  me.callParent(arguments)
  HR.orderManager.addOrderAction(me)
}

function onAttrKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    changeParams(ctrl)
  }
}

function initOrderComponentDone (me) {
  ['paySum'].forEach(attrName => {
    me.attr[attrName].on('blur', changeParams)
    me.attr[attrName].on('keypress', onAttrKeypress)
  })
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  if (me.record.get('orderState') === 'POSTED' || ctrl.readOnly) {
    return
  }
  let flagsFix = me.record.get('flagsFix')
  const value = ctrl.getValue()
  switch (ctrl.name) {
    case 'paySum' :
      if (ctrl.calcValue !== value) {
        if (value && ctrl.isValid()) {
          me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        } else {
          me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
        }
        calcFuneral(me)
      }
      break
  }
}

function getSumFuneral (me, date) {
  if (!date) {
    return 0
  }
  const d = AC.dateService.shiftDate(date)
  const sumFuneral = me.dictSprSti.find(o => AC.dateService.shiftDate(o.dateFrom) <= d && AC.dateService.shiftDate(o.dateTo) >= d)
  return sumFuneral ? sumFuneral.suma : null
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.attr.organizationID.setValueById(appAC.globalOrganization())
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  me.attr.paySum.calcValue = me.record.get('paySum')
  if (me.record.get('orderDate')) {
    AC.viewUtils.setFilterValue(me.attr.employeeFuneralID, {
      organizationID: me.record.get('organizationID') || appAC.globalOrganization(),
      dateTo: { value: me.record.get('orderDate'), condition: '>=' },
      dateFrom: { value: me.record.get('orderDate'), condition: '<=' }
    })
  }
  if (me.record.get('employeeFuneralID.workPlace') !== '4') { // у штаті
    me.attr.employeeFamilyID.setVisible(true)
    me.attr.employeeFamilyID.setAllowBlank(false)
    AC.viewUtils.setFilterValue(me.attr.employeeFamilyID, {
      employeeID: me.record.get('employeeFuneralID.employeeID')
    })
    me.attr.employeePositionID.setAllowBlank(true)
  } else {
    me.attr.employeePositionID.setVisible(true)
    if (me.record.get('orderDate')) {
      /*
      AC.viewUtils.setFilterValue(me.attr.employeePositionID, {
        organizationID: me.record.get('organizationID') || appAC.globalOrganization(),
        dateTo: { value: me.record.get('orderDate'), condition: '>=' },
        dateFrom: { value: me.record.get('orderDate'), condition: '<=' }
      })
      */
      AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
        ['organizationID', '=', me.record.get('organizationID') || appAC.globalOrganization()],
        ['dateTo', '<', '#maxdate', 'dismDateTo'],
        ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
        ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
        ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom']
      ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
    }
    me.attr.employeePositionID.setAllowBlank(false)
  }
  UB.Repository('hr_dictSumFuneral')
    .attrs(['dateFrom', 'dateTo', 'suma'])
    .orderByDesc('dateFrom')
    .selectAsObject().then(result => {
      me.dictSprSti = result
      if (me.record.get('dateDeath')) {
        me.attr.sumOnDateDeath.setValue(getSumFuneral(me, me.record.get('dateDeath')))
      }
      if (me.record.get('dateFuneral')) {
        me.attr.sumOnDateFuneral.setValue(getSumFuneral(me, me.record.get('dateFuneral')))
      }
    })
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'employeeFuneralID':
      me.attr.employeeNumberID.setValueById(field.getFieldValue('employeeNumberID'))
      me.attr.employeeID.setValueById(field.getFieldValue('employeeID'))
      if (me.attr.employeeFuneralID.getFieldValue('workPlace') === '4') { // поза штатом
        me.attr.employeeFamilyID.setVisible(false)
        me.attr.employeeFamilyID.setAllowBlank(true)
        me.attr.employeeFamilyID.setValue()
        me.attr.employeePositionID.setVisible(true)
        me.attr.employeePositionID.setAllowBlank(false)
        /*
        AC.viewUtils.setFilterValue(me.attr.employeePositionID, {
          organizationID: me.record.get('organizationID'),
          dateTo: { value: me.record.get('orderDate'), condition: '>=' },
          dateFrom: { value: me.record.get('orderDate'), condition: '<=' }
        })
        */
        AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
          ['organizationID', '=', me.record.get('organizationID') || appAC.globalOrganization()],
          ['dateTo', '<', '#maxdate', 'dismDateTo'],
          ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
          ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
          ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom']
        ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
      } else {
        me.attr.employeePositionID.setVisible(false)
        me.attr.employeePositionID.setValue()
        me.attr.employeeFamilyID.setVisible(true)
        me.attr.employeeFamilyID.setAllowBlank(false)
        me.attr.employeePositionID.setAllowBlank(true)
        AC.viewUtils.setFilterValue(me.attr.employeeFamilyID, {
          'employeeID': field.getFieldValue('employeeID')
        }, ['clearValue'])
      }
      me.attr.paySum.setValue()
      calcFuneral(me)
      break
    case 'orderDate':
      if (field.isValid()) {
        me.attr.paySum.setValue()
        const orderDate = AC.dateService.truncTimeToUtcNull(value)
        AC.viewUtils.setFilterValue(me.attr.employeeFuneralID, {
          organizationID: me.record.get('organizationID'),
          dateTo: { value: orderDate, condition: '>=' },
          dateFrom: { value: orderDate, condition: '<=' }
        }, ['setDisabled', 'clearValue'])
      }
      break
    case 'dateDeath':
      me.attr.sumOnDateDeath.setValue((field.isValid() && value) ? getSumFuneral(me, value) : null)
      if (field.isValid()) {
        calcFuneral(me)
      }
      break
    case 'dateFuneral':
      me.attr.sumOnDateFuneral.setValue((field.isValid() && value) ? getSumFuneral(me, value) : null)
      if (field.isValid()) {
        calcFuneral(me)
      }
      break
    case 'seriaDoc':
    case 'numberDoc':
      break
  }
}

function calcFuneral (me) {
  if (me.record.get('orderState') === 'POSTED' || !me.attr.employeeFuneralID.getValue() ||
    me.record.get('flagsFix') & 1 << 1
  ) {
    return
  }
  const paySum = Math.max(getSumFuneral(me, me.attr.dateDeath.getValue()), getSumFuneral(me, me.attr.dateFuneral.getValue()))
  me.attr.paySum.calcValue = paySum
  me.attr.paySum.setValue(paySum)
}
