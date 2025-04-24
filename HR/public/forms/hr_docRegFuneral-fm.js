/* global AC HR _ UB $App Ext appAC appHR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  initOrderComponentDone,
  onFormDataReady,
  onControlChanged,
  addBaseActions,
  postInit
}

function initComponentStart () {
  const me = this
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
    return Promise.resolve(true)
  }
}

function postInit (me) {
  me.attr.dictFundSourceID.store.ubRequest.method = 'selectByOrg'
  me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('orderRegistryID.organizationID') || appAC.globalOrganization()
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
  me.baseDoc = me.record.get('empOrderID')
  if (me.isNewInstance) {
    if (me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        me.record.set(name, value)
      })
    }
    me.record.set('flagsRec', 2)
    me.record.set('flagsFix', 0)
  }

  me.attr.paySum.calcValue = me.record.get('paySum')
  const globalOrganization = appAC.globalOrganization()
  appHR.getCurrentPeriod(globalOrganization).then(response => {
    let payElStore = me.attr.payElID.getStore()
    if (response) {
      AC.viewUtils.setFilterValue(me.attr.payElID, {
        'methodID.code': '38',
        'dateTo': { value: response.dateFrom, condition: '>=' },
        'dateFrom': { value: response.dateTo, condition: '<=' }
      })
    }
    payElStore.load()
  })
  AC.viewUtils.setFilterValue(me.attr.employeeFuneralID, {
    organizationID: me.record.get('orderRegistryID.organizationID'),
    dateTo: { value: me.record.get('orderDate'), condition: '>=' },
    dateFrom: { value: me.record.get('orderDate'), condition: '<=' }
  })
  if (me.record.get('employeeFuneralID.workPlace') !== '4') { // у штаті
    me.attr.employeeFamilyID.setVisible(true)
    AC.viewUtils.setFilterValue(me.attr.employeeFamilyID, {
      employeeID: me.record.get('employeeFuneralID.employeeID')
    })
    me.attr.employeePositionID.setAllowBlank(true)
    me.attr.employeeFamilyID.setAllowBlank(false)
  } else {
    me.attr.employeePositionID.setVisible(true)
    if (me.record.get('orderDate')) {
      AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
        ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
        ['dateTo', '<', '#maxdate', 'dismDateTo'],
        ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
        ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
        ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom']
      ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
    }
    me.attr.employeePositionID.setAllowBlank(false)
    me.attr.employeeFamilyID.setAllowBlank(true)
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
  const isReadOnly = me.record.get('orderState') === 'POSTED' || !!me.baseDoc
  const baseDepended = ['orderDate', 'employeeFuneralID', 'employeePositionID', 'employeeFamilyID', 'dateDeath', 'dateFuneral', 'seriaDoc', 'numberDoc', 'dateDoc', 'addDoc']
  baseDepended.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })
  me.actions.calcFuneral.setDisabled(isReadOnly)
  HR.orderManager.setSourceOrderDescription(me)
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'employeeFuneralID':
      if (me.attr.employeeFuneralID.getFieldValue('workPlace') === '4') { // поза штатом
        me.attr.employeeFamilyID.setVisible(false)
        me.attr.employeeFamilyID.setAllowBlank(true)
        me.attr.employeeFamilyID.setValue()
        me.attr.employeePositionID.setVisible(true)
        me.attr.employeePositionID.setAllowBlank(false)
        AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
          ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
          ['dateTo', '<', '#maxdate', 'dismDateTo'],
          ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
          ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
          ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom']
        ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
      } else {
        me.attr.employeePositionID.setVisible(false)
        me.attr.employeeFamilyID.setAllowBlank(false)
        me.attr.employeePositionID.setValue()
        me.attr.employeeFamilyID.setVisible(true)
        me.attr.employeePositionID.setAllowBlank(true)
        AC.viewUtils.setFilterValue(me.attr.employeeFamilyID, {
          'employeeID': field.getFieldValue('employeeID')
        }, ['clearValue'])
      }
      me.attr.employeeNumberID.setValueById(field.getFieldValue('employeeNumberID'))
      me.attr.employeeID.setValueById(field.getFieldValue('employeeID'))
      me.attr.paySum.setValue()
      calcFuneral(me)
      break
    case 'payElID':
      me.attr.paySum.setValue()
      calcFuneral(me)
      break
    case 'orderDate':
      if (field.isValid()) {
        me.attr.paySum.setValue()
        const orderDate = AC.dateService.truncTimeToUtcNull(value)
        AC.viewUtils.setFilterValue(me.attr.employeeFuneralID, {
          organizationID: me.record.get('orderRegistryID.organizationID'),
          dateTo: { value: orderDate, condition: '>=' },
          dateFrom: { value: orderDate, condition: '<=' }
        }, ['clearValue'])
      }
      break
    case 'seriaDoc':
    case 'numberDoc':
      me.attr.orderNumber.setValue(`${me.attr.seriaDoc.getValue() || ''}${me.attr.numberDoc.getValue() || ''}`)
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
    case 'dictFundSourceID':
      calcFuneral(me)
      break
  }
}

function calcFuneral (me) {
  if (me.record.get('orderState') === 'POSTED' || !me.attr.employeeFuneralID.getValue() || !me.attr.payElID.getValue()) {
    return
  }
  const paySum = me.record.get('flagsFix') & 1 << 1
    ? me.attr.paySum.getValue()
    : Math.max(getSumFuneral(me, me.attr.dateDeath.getValue()), getSumFuneral(me, me.attr.dateFuneral.getValue()))
  me.setLoading(true)
  me.attr.paySum.calcValue = paySum
  me.attr.paySum.setValue(paySum)
  let flagsFix = me.record.get('flagsFix')
  if (me.attr.dictFundSourceID.getValue()) {
    me.record.set('flagsFix', flagsFix | 1 << 14)
  } else {
    me.record.set('flagsFix', flagsFix & ~(1 << 14))
  }

  const params = {
    orgID: me.record.get('orderRegistryID.organizationID'),
    orderNumber: me.record.get('orderNumber'),
    orderDate: me.record.get('orderDate'),
    orderRegistryID: me.record.get('orderRegistryID'),
    periodCalcID: me.record.get('orderRegistryID.periodID'),
    employeeNumberID: me.attr.employeeFuneralID.getFieldValue('employeeNumberID'),
    payElID: me.attr.payElID.getValue(),
    dictFundSourceID: me.attr.dictFundSourceID.getValue(),
    flagsRec: me.record.get('flagsRec'),
    flagsFix: me.record.get('flagsFix'),
    paySum
  }
  $App.connection.run({
    entity: 'hr_docRegFuneral',
    method: 'calc',
    params: JSON.stringify(params)
  }).then(response => {
    let data = JSON.parse(response.resultData)
    me.attr.accrualDt.setValue(data.accrualDt)
    me.setIsDirty(true)
    me.setLoading(false)
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
  if (!me.actions.calcFuneral) {
    me.actions.calcFuneral = new Ext.Action({
      iconCls: 'fas fa-calculator',
      cls: 'fill-action',
      actionId: 'calcBtn',
      text: UB.i18n('Розрахувати'),
      eventId: 'calcBtn',
      handler: function () {
        calcFuneral(me)
      }
    })
  }
  if (!me.actions.analytic) {
    me.actions.analytic = new Ext.Action({
      iconCls: 'el-icon-notebook-2',
      cls: 'blue-action',
      actionId: 'analyticBtn',
      text: UB.i18n('Аналітика'),
      eventId: 'analyticBtn',
      handler: function (context) {
        const accrualDt = me.record.get('accrualDt')
        if (accrualDt) {
          $App.connection.run({
            entity: 'hr_rl',
            method: 'getDimension',
            params: typeof accrualDt === 'object' ? JSON.stringify(accrualDt) : accrualDt,
            orgID: me.record.get('orderRegistryID.organizationID')
          }).then(response => {
            const data = JSON.parse(response.resultData)
            $App.doCommand({
              cmdType: 'showForm',
              formCode: 'hr_rlDimension',
              isModal: true,
              cmpInitConfig: {
                defaultValues: data,
                typeData: 'orderRegistryDt',
                readOnly: me.record.get('orderState') === 'POSTED',
                paySum: me.record.get('paySum'),
                orgID: me.record.get('orderRegistryID.organizationID'),
                employeeNumberID: me.attr.employeeNumberID.getValue(),
                onSave: (accrualDt) => {
                  me.record.set('flagsFix', me.record.get('flagsFix') | 1 << 14 | 1 << 15 | 1 << 16 | 1 << 17)
                  me.record.set('accrualDt', JSON.stringify(accrualDt))
                }
              }
            })
          })
        }
      }
    })
  }
}
