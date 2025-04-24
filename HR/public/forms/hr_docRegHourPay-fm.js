/* global AC HR _ UB $App Ext appHR appAC */
exports.formCode = {
  initComponentStart,
  initOrderComponentDone,
  postInit,
  onFormDataReady,
  onControlChanged,
  addBaseActions,
  setDateFrom,
  setTariff,
  setHourWork,
  setEmployeeData,
  beforePosting
}

function initComponentStart () {
  const me = this
  HR.orderManager.init(me)
}

function onAttrKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    changeParams(ctrl)
  }
}

function initOrderComponentDone (me) {
  ['baseSum', 'hours'].forEach(attrName => {
    me.attr[attrName].on('blur', changeParams)
    me.attr[attrName].on('keypress', onAttrKeypress)
  })
}

function postInit (me) {
  me.attr.dictFundSourceID.store.ubRequest.method = 'selectByOrg'
  me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('orderRegistryID.organizationID') || appAC.globalOrganization()
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  if (me.record.get('orderState') === 'POSTED' || ctrl.readOnly) {
    return
  }
  let flagsFix = me.record.get('flagsFix')
  const value = ctrl.getValue()
  switch (ctrl.name) {
    case 'baseSum' :
    case 'hours' :
      if (ctrl.calcValue !== value) {
        if (value && ctrl.isValid()) {
          me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        } else {
          me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
        }
        calcHourPay(me)
      }
      break
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.attr.periodSalaryID.setValueById(me.record.get('orderRegistryID.periodID'))
    if (me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        me.record.set(name, value)
      })
    }
    me.record.set('flagsRec', 2)
    me.record.set('flagsFix', 0)
  }
  AC.viewUtils.setFilterValue(me.attr.periodSalaryID, { orgID: me.record.get('orderRegistryID.organizationID') })
  me.attr.baseSum.calcValue = me.record.get('baseSum')
  const globalOrganization = appAC.globalOrganization()
  appHR.getCurrentPeriod(globalOrganization).then(response => {
    let payElStore = me.attr.payElID.getStore()
    if (response) {
      AC.viewUtils.setFilterValue(me.attr.payElID, {
        'methodID.code': '4',
        'dateTo': { value: response.dateFrom, condition: '>=' },
        'dateFrom': { value: response.dateTo, condition: '<=' }
      })
    }
    payElStore.load()
  })
  AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
    ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
    // ['payElID.methodID.code', '=', '63'],
    ['dateTo', '>=', AC.dateService.shiftDate(me.record.get('dateFrom') || me.record.get('orderRegistryID.periodID.dateFrom'))],
    ['dateFrom', '<=', AC.dateService.shiftDate(me.record.get('dateFrom') || me.record.get('orderRegistryID.periodID.dateTo'))],
    (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
  ])

  me.attr.workPlaceOnly[AC.settings.get('hrTariffingEducational', appAC.globalOrganization()) ? 'show' : 'hide']()

  const hrProgClassAcc = AC.settings.get('hrProgClassAcc', me.record.get('orderRegistryID.organizationID'))
  me.attr.dictProgClassID[hrProgClassAcc ? 'show' : 'hide']()
  const readOnlyAttr = ['dateFrom', 'employeePositionID', 'dictWorkTypeID', 'payElID', 'periodSalaryID', 'baseSum', 'hours']
  const isReadOnly = me.record.get('orderState') === 'POSTED' || !!me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })
  me.actions.calcHourPay.setDisabled(isReadOnly)
  HR.orderManager.setSourceOrderDescription(me)
  setHourWork(me)
  setEmployeeData(me)
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'workPlaceOnly':
      me.attr.baseSum.setValue()
      me.attr.hours.setValue()
      me.attr.paySum.setValue()
      AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
        (value ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
      ], null, ['clearValue', 'clearStore'])
      break
    case 'employeePositionID':
      me.attr.employeeNumberID.setValue(field.getFieldValue('employeeNumberID'))
      me.attr.employeeID.setValue(field.getFieldValue('employeeID'))
      me.setDateFrom(me)
      setHourWork(me)
      setEmployeeData(me)
      if (value) {
        calcHourPay(me)
      }
      break
    case 'periodSalaryID':
      if (value) {
        AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
          ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
          // ['payElID.methodID.code', '=', '63'],
          ['dateTo', '>=', AC.dateService.shiftDate(me.attr.dateFrom.getValue() || field.getFieldValue('dateFrom'))],
          ['dateFrom', '<=', AC.dateService.shiftDate(me.attr.dateFrom.getValue() || field.getFieldValue('dateTo'))],
          (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
        ])
      }
      me.setDateFrom(me)
      setHourWork(me)
      break
    case 'dateFrom':
      if (field.isValid() && value) {
        AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
          ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
          // ['payElID.methodID.code', '=', '63'],
          ['dateTo', '>=', AC.dateService.shiftDate(value || me.attr.periodSalaryID.getFieldValue('dateFrom'))],
          ['dateFrom', '<=', AC.dateService.shiftDate(value || me.attr.periodSalaryID.getFieldValue('dateTo'))],
          (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
        ])
        me.setTariff(me)
      }
      break
    case 'dictWorkTypeID':
      me.attr.payElID.setValueById(me.attr.dictWorkTypeID.getFieldValue('payElID'))
      me.setTariff(me)
      break
    case 'baseSum':
      if (me.attr.baseSum.isValid() && me.attr.hours.isValid()) {
        calcHourPay(me)
      }
      break
    case 'dictFundSourceID':
    case 'dictProgClassID':
      calcHourPay(me)
      break
  }
}

function setDateFrom (me) {
  if (me.attr.employeePositionID.getValue() && me.attr.periodSalaryID.getValue()) {
    me.attr.dateFrom.setValue()
    me.attr.dateFrom.setValue(new Date(Math.min(new Date(Math.max(me.attr.periodSalaryID.getFieldValue('dateFrom'),
      me.attr.employeePositionID.getFieldValue('employeeNumberID.dateFrom'))),
    me.attr.employeePositionID.getFieldValue('employeeNumberID.dateTo'))))
  } else if (!me.attr.employeePositionID.getValue() && me.attr.periodSalaryID.getValue()) {
    me.attr.dateFrom.setValue()
    me.attr.dateFrom.setValue(new Date(me.attr.periodSalaryID.getFieldValue('dateFrom')))
  }
}

function setTariff (me) {
  if (!(me.record.get('flagsFix') & 1 << 0) && me.attr.dateFrom.getValue() && me.attr.dateFrom.isValid() && me.attr.dictWorkTypeID.getValue()) {
    UB.Repository('hr_dictWorkTypeTariff')
      .attrs(['tariffSum'])
      .where('dictWorkTypeID', '=', me.attr.dictWorkTypeID.getValue())
      .where('dateFrom', '<=', me.attr.dateFrom.getValue())
      .where('dateTo', '>=', me.attr.dateFrom.getValue())
      .selectScalar().then(baseSum => {
        me.attr.baseSum.setValue(baseSum)
      })
  }
}

function setHourWork (me) {
  const periodSalaryID = me.attr.periodSalaryID.getValue() || me.record.get('periodSalaryID')
  const employeeNumberID = me.attr.employeeNumberID.getValue()
  if (employeeNumberID && periodSalaryID && me.attr.employeePositionID.getFieldValue('payElID.methodID.code') === '63') {
    UB.Repository('hr_docRegHourPay')
      .attrs(['sum([hours])'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('orderState', '=', 'POSTED', 'orderStatePOSTED')
      .where('orderState', '=', 'PROJECT', 'orderStatePROJECT')
      .where('orderRegistryID', '=', me.record.get('orderRegistryID'), 'orderRegistryID')
      .where('ID', '!=', me.instanceID)
      .logic('(([orderStatePOSTED]) OR (([orderStatePROJECT]) AND ([orderRegistryID])))')
      .selectScalar().then(resp => {
        me.attr.hourWork.setValue((resp || 0) + (me.attr.hours.getValue() || 0))
      })
  } else {
    me.attr.hourWork.setValue()
  }
}

function calcHourPay (me) {
  if (me.record.get('orderState') === 'POSTED' || !me.attr.baseSum.getValue() || !me.attr.hours.getValue() || !me.attr.periodSalaryID.getValue()) {
    return
  }
  me.setLoading(true)
  const params = {
    orgID: me.record.get('orderRegistryID.organizationID'),
    orderNumber: me.record.get('orderNumber'),
    orderDate: me.record.get('orderDate'),
    orderRegistryID: me.record.get('orderRegistryID'),
    periodCalcID: me.record.get('orderRegistryID.periodID'),
    periodSalaryID: me.attr.periodSalaryID.getValue(),
    employeeNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID'),
    payElID: me.attr.payElID.getValue(),
    dictFundSourceID: me.attr.dictFundSourceID.getValue(),
    dictProgClassID: me.attr.dictProgClassID.getValue(),
    flagsRec: me.record.get('flagsRec'),
    flagsFix: me.record.get('flagsFix'),
    baseSum: me.attr.baseSum.getValue(),
    hours: me.attr.hours.getValue()
  }
  $App.connection.run({
    entity: 'hr_docRegHourPay',
    method: 'calc',
    params: JSON.stringify(params)
  }).then(response => {
    let data = JSON.parse(response.resultData)
    me.attr.paySum.setValue(data.paySum)
    me.attr.accrualDt.setValue(data.accrualDt)
    setHourWork(me)
    me.setIsDirty(true)
    me.setLoading(false)
  }, err => {
    me.setLoading(false)
    throw err
  })
}
function setEmployeeData (me) {
  me.attr.posName.setValue(me.attr.employeePositionID.getFieldValue('posName'))
  me.attr.depName.setValue(me.attr.employeePositionID.getFieldValue('depName'))
  me.attr.positionDateFrom.setValue(AC.dateService.unshiftDate(me.attr.employeePositionID.getFieldValue('dateFrom')))
  me.attr.positionDateTo.setValue(AC.dateService.unshiftDate(me.attr.employeePositionID.getFieldValue('dateTo')))
  me.attr.hourRight.setValue(me.attr.employeePositionID.getFieldValue('planHours'))
  const employeeID = me.attr.employeePositionID.getFieldValue('employeeID') || me.record.get('employeeID')
  if (employeeID) {
    Promise.all([
      UB.Repository('hr_empAcademStatus')
        .attrs(['docDate', 'dictAcademStatusID.name'])
        .where('employeeID', '=', employeeID)
        .orderByDesc('docDate')
        .selectAsObject(),
      UB.Repository('hr_empRangeScience')
        .attrs(['docDate', 'dictDegreeID.name'])
        .where('employeeID', '=', employeeID)
        .orderByDesc('docDate')
        .selectAsObject()
    ]).then(([empAcademStatus, empRangeScience]) => {
      let data = `<style type="text/css">
                         .table { width: 100%; padding:10px; }
                         #td { text-indent: 20px;}
                         .span { color: #0D47A1}
                        </style>
                        <table width= 400px border=1px bordercolor=#0D47A1 cellspacing="0" cellpadding="0px">
                          <tr>
                            <td valign="top" align="center" height="20" width="30%"><span class = "span">${UB.i18n('З')}</span></td>
                            <td valign="top" align="center" height="20" width="70%" colspan="2"><span class = "span">${UB.i18n('Вчене звання')}</span></td>
                          </tr>`
      empAcademStatus.forEach(row => {
        data = `${data} <tr>
                            <td valign="top" align="center" height="20" width="30%">${row.docDate ? AC.dateService.formatDate(row.docDate) : ''}</td>
                            <td valign="top" align="left" height="20" width="70%" colspan="2">${row['dictAcademStatusID.name']}</td>
                          </tr>`
      })
      data = `${data}  </table></br><table width=400px border=1px bordercolor=#0D47A1 cellspacing="0" cellpadding="0px"><tr>
                            <td valign="top" align="center" height="20" width="30%"><span class = "span">${UB.i18n('З')}</span></td>
                            <td valign="top" align="center" height="20" width="70%" colspan="2"><span class = "span">${UB.i18n('Науковий ступень')}</span></td>
                          </tr>`
      empRangeScience.forEach(row => {
        data = `${data} <tr>
                            <td valign="top" align="center" height="20" width="30%">${row.docDate ? AC.dateService.formatDate(row.docDate) : ''}</td>
                            <td valign="top" align="left" height="20" width="70%" colspan="2">${row['dictDegreeID.name']}</td>
                          </tr>`
      })
      data = `${data}  </table><table width="100%">`

      me.down('[name=employeeData]').update(data)
    })
  }
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
  if (!me.actions.calcHourPay) {
    me.actions.calcHourPay = new Ext.Action({
      iconCls: 'fas fa-calculator',
      cls: 'fill-action',
      actionId: 'calcBtn',
      text: UB.i18n('Розрахувати'),
      eventId: 'calcBtn',
      handler: function () {
        calcHourPay(me)
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
                typeData: 'orderRegistryDt'
              }
            })
          })
        }
      }
    })
  }
}

function beforePosting () {
  const me = this
  me.setLoading(true)
  return $App.connection.run({
    entity: 'hr_docRegHourPay',
    method: 'checkBeforePosting',
    params: JSON.stringify({ IDs: [me.instanceID] })
  }).then((resp) => {
    const resultData = JSON.parse(resp.resultData)
    me.setLoading(false)
    if (resultData && resultData.errorMessages && resultData.errorMessages.length) {
      return $App.dialogYesNo(UB.i18n('Попередження'), resultData.errorMessages.join('<br/>'))
    } else {
      return true
    }
  }, (err) => {
    me.setLoading(false)
    throw err
  })
}
