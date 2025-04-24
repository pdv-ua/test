/* global $App AC _ appAC UB appHR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  onPrepareDataBeforeSave,
  onBeforeSave,
  onAfterDelete
}

function initComponentStart () {
  let me = this
  me.on('recordloaded', onRecordLoaded, me)
  me.on('aftersave', onAfterSave, me)
  me.on('afterdelete', onAfterDelete, me)
  me.on('beforesave', onPrepareDataBeforeSave, me)
  me.on('beforeclose', () => { me.notRefreshAfterSave = true })
  me.on('controlChanged', onControlChanged, me)
  me.on('formDataReady', onFormDataReady, me)
  me.setIsDirty = function (value) {
    me.setActionDisabled('save', !value)
    me.setActionDisabled('saveAndClose', !value)
    me.record.dirty = value
  }
  me.gridConfig = {
    detailGrids: ['positionFundSourceDt']
  }
}

async function getAccrualSumByDictPosition (dictPositionID, onDate) {
  if (!dictPositionID) { return null }
  if (!onDate) { return null }
  const dictPositionDt = await UB.Repository('hr_dictPositionDt')
    .attrs('accrualSum')
    .where('dictPositionID', '=', dictPositionID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('dictPositionID.paymentType', '=', 'ACCRUAL')
    .selectSingle()
    .then(data => {
      return data ? data.accrualSum : null
    })
  return dictPositionDt
}

function setDictStWorkPlaceTypeWList (me) {
  const whereDepend = appHR.getPayElIDDependency() // [ dictStaffCatID, workPlace, workerType, payElID ]
  const depend = [
    {
      dictStaffCatID: '1',
      fields: { dateFrom: 1, departmentID: 1, positionID: 1, workScheduleID: 1, mtCount: 1, accrualSum: 1, raiseSalary: 1, isIndex: 1 }
    },
    {
      dictStaffCatID: '2',
      fields: { dateFrom: 1, departmentID: 1, positionID: 1, workScheduleID: 1, mtCount: 1, accrualSum: 1, raiseSalary: 1, isIndex: 1 }
    },
    {
      dictStaffCatID: '3',
      fields: { dateFrom: 1, departmentID: 1, positionID: 1, workScheduleID: 1, mtCount: 1, accrualSum: 1, raiseSalary: 1, isIndex: 1 }
    },
    {
      dictStaffCatID: '4',
      fields: { dateFrom: 1, departmentID: 1, positionID: 1, workScheduleID: 1, mtCount: 1, accrualSum: 1, raiseSalary: 1, isIndex: 1 }
    },
    {
      dictStaffCatID: '5',
      fields: { dateFrom: 1, departmentID: 1, positionID: 1, workScheduleID: 1, mtCount: 1, accrualSum: 1, raiseSalary: 1, isIndex: 1 }
    },
    {
      dictStaffCatID: '6',
      fields: { dateFrom: 1, departmentID: 1, positionID: 0, workScheduleID: 0, mtCount: 1, accrualSum: 1, raiseSalary: 0, isIndex: 0 }
    },
    {
      dictStaffCatID: '7',
      fields: { dateFrom: 1, departmentID: 1, positionID: 0, workScheduleID: 0, mtCount: 0, accrualSum: 0, raiseSalary: 0, isIndex: 0 }
    }
  ]
  const fieldTabList = {
    fields: [
      'dateFrom',
      'departmentID',
      'positionID',
      'workScheduleID',
      'mtCount',
      'accrualSum',
      'raiseSalary',
      'isIndex'
    ]
  }

  function setDependWhereList () {
    const hrStaffCatByPosition = AC.settings.get('hrStaffCatByPosition', appAC.globalOrganization())
    const hrUseStaffingTable = AC.settings.get('hrUseStaffingTable', appAC.globalOrganization())
    const accCategory = (hrStaffCatByPosition
      ? appHR.getAccCategoryByPositionType(me.attr.dictPositionID.getFieldValue('positionType'))
      : me.attr.dictStaffCatID.getFieldValue('accCategory')) || '1'

    const fVal = {
      dictStaffCatID: {
        val: accCategory,
        byField: 'accCategory'
      },
      workPlace: {
        val: me.attr.workPlace.getValue() || '1',
        byField: 'code'
      },
      workerType: {
        val: me.attr.workerType.getValue() || '1',
        byField: 'code'
      },
      payElID: {
        val: AC.gridUtils.getCurrentRecord(me.attr.payElID),
        byField: 'methodID.code'
      }
    }

    fVal.payElID.val = (fVal.payElID.val ? fVal.payElID.val.get('methodID.code') : false) || '1'

    Object.keys(fVal).forEach((field, index) => {
      const curWhereDepend = whereDepend.filter(dep =>
        Object.keys(fVal).every((fld, ind) => fld === field || dep[ind] === fVal[fld].val))
      if (curWhereDepend.length) {
        const whereVal = curWhereDepend.map(dep => dep[index])
        AC.viewUtils.setWhereListProperty(me.attr[field], [[fVal[field].byField, 'in', whereVal, field]], null, ['clearStore'])
      }
    })

    const curDepend = depend.find(dep => dep.dictStaffCatID === fVal.dictStaffCatID.val)
    if (curDepend) {
      fieldTabList.fields.forEach(item => me.attr[item][curDepend.fields[item] ? 'show' : 'hide']())
    }

    me.attr.dictStaffCatID[hrStaffCatByPosition ? 'hide' : 'show']()
    me.attr.positionID[hrUseStaffingTable ? 'show' : 'hide']()
    const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
    if (notShowSalary) {
      me.attr.accrualSum.hide()
    }
  }
  setDependWhereList()

  me.attr.dictStaffCatID.on('change', (ctrl, value) => {
    if (!ctrl.noChange) {
      setDependWhereList()
      if (!value && !me.attr.workPlace.getValue() && !me.attr.workerType.getValue()) {
        fieldTabList.fields.forEach(item => {
          me.attr[item].show()
        })
      }
    } else {
      ctrl.noChange = false
    }
  })
  me.attr.workPlace.on('change', (ctrl, value) => {
    if (!ctrl.noChange) {
      setDependWhereList()

      if (!value && !me.attr.dictStaffCatID.getValue() && !me.attr.workerType.getValue() && !me.attr.payElID.getValue()) {
        fieldTabList.fields.forEach(item => {
          me.attr[item].show()
        })
      }
    } else {
      ctrl.noChange = false
    }
  })
  me.attr.workerType.on('change', (ctrl, value) => {
    if (!ctrl.noChange) {
      setDependWhereList()

      if (!value && !me.attr.workPlace.getValue() && !me.attr.dictStaffCatID.getValue() && !me.attr.payElID.getValue()) {
        fieldTabList.fields.forEach(item => {
          me.attr[item].show()
        })
      }
    } else {
      ctrl.noChange = false
    }
  })
  me.attr.payElID.on('change', (ctrl, value) => {
    if (!ctrl.noChange) {
      setDependWhereList()

      if (!value && !me.attr.workPlace.getValue() && !me.attr.dictStaffCatID.getValue() && !me.attr.workerType.getValue()) {
        fieldTabList.fields.forEach(item => {
          me.attr[item].show()
        })
      }
    } else {
      ctrl.noChange = false
    }
  })
  me.attr.dateFrom.on('change', (ctrl, value) => {
    setPayElWhereListDate(me)
  })
  me.attr.dateTo.on('change', (ctrl, value) => {
    setPayElWhereListDate(me)
  })
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['accountDimensionsControl', 'acGrid'])
  _.forEach(me.attr, attr => {
    if (attr.formParams) {
      attr.on('change', (ctrl, value) => {
        if (ctrl.recordValue) {
          if (ctrl.xtype === 'checkboxfield') {
            if ((!!value) !== (!!me.startValue[ctrl.recordValue])) {
              me.setIsDirty(true)
            }
          } else if (ctrl.xtype === 'ubdatefield') {
            if ((!me.startValue[ctrl.recordValue] || (value && ctrl.isValid() && value.getTime() !== me.startValue[ctrl.recordValue].getTime()))) {
              me.setIsDirty(true)
            }
          } else if (value !== me.startValue[ctrl.recordValue]) {
            me.setIsDirty(true)
          }
        } else {
          me.setIsDirty(true)
        }
      })
    }
  })
  me.attr.positionFundSourceDt.on('changeData', (grid) => {
    const me = grid.up('form')
    const mtCountTotal = grid.getStore().data.items.reduce((sum, item) => {
      return sum + AC.currencyService.round(item.get('mtCount'))
    }, 0)
    if (grid.getStore().data.items.length) me.record.set('mtCount', AC.currencyService.round(mtCountTotal))
    me.setIsDirty(true)
  })

  me.attr['dateFrom'].on('blur', changeParams)
  me.attr['dateFrom'].on('keypress', onAttrKeypress)
  me.attr['dateTo'].on('blur', changeParams)
  me.attr['dateTo'].on('keypress', onAttrKeypress)
  me.attr['mtCount'].on('blur', changeParams)
  me.attr['mtCount'].on('keypress', onAttrKeypress)
  if (AC.settings.get('hrOrderAllowSelectDictPosition', appAC.globalOrganization())) {
    me.attr.posNameAddition.show()
  }
  me.attr.factPosName[AC.settings.get('hrOrderActualPositionName', appAC.globalOrganization()) ? 'show' : 'hide']()
}

function onAttrKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    changeParams(ctrl)
  }
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  const value = ctrl.getValue()
  if (ctrl.name === 'mtCount') {
    recalcPositionFundSource(me)
  } else if ((!me.startValue[ctrl.recordValue] || !value || (value && ctrl.isValid() && value.getTime() !== me.startValue[ctrl.recordValue].getTime()))) {
    me.setIsDirty(true)
  }
}

function onRecordLoaded (record, data) {
  const me = this
  if (me.isNewInstance && me.formData) {
    _.forEach(me.formData, (value, name) => {
      if (name === 'fundSources') {
        if (value) {
          value.forEach(row => {
            row.employeePositionID = me.instanceID
          })
          me.attr.positionFundSourceDt.setLocalStoreData(value)
        }
      } else {
        me.record.set(name, value)
      }
    })
    me.record.set('dateFrom', AC.dateService.todayDate())
    me.record.set('dateTo', null)
  }
  setStartData(me, data)
  me.actions.fDelete.hide()

  switch (me.record.get('orderID.orderClass.entityName')) {
    case 'hr_empOrder':
      ['orderDate', 'dateFrom', 'orderNumber',
        'departmentID', 'positionID'].forEach(fld => {
        me.attr[fld].setReadOnly(true)
      })
      break
    case 'trf_workPlace':
      ['orderDate', 'orderNumber',
        'departmentID', 'positionID', 'dictQualificationID', 'dictProgClassID', 'dictTarifCoeffID',
        'accrualSum', 'mtCount', 'positionFundSourceDt', 'dictPositionID'].forEach(fld => {
        me.attr[fld].setReadOnly(true)
      })
      break
  }

  me.detail = data.detail ? JSON.parse(data.detail) : []
  if (_.get(me, 'detail.positionFundSourceDt.length')) {
    me.attr.positionFundSourceDt.setLocalStoreData(me.detail.positionFundSourceDt)
  }
  me.attr.factPosName.setReadOnly(true)
}

function onAfterDelete () {
  const me = this
  me.gridSender.getStore().load()
}

function onAfterSave (me, data) {
  if (me.notRefreshAfterSave) {
    me.notRefreshAfterSave = true
  } else {
    setStartData(me, data)
    me.detail = data.detail ? JSON.parse(data.detail) : []
    if (_.get(me, 'detail.positionFundSourceDt.length')) {
      me.attr.positionFundSourceDt.setLocalStoreData(me.detail.positionFundSourceDt)
    }
  }
  if (me.gridSender) {
    me.gridSender.getStore().load()
    me.gridSender.up('form').onRefresh()
  }
}

function onFormDataReady () {
  const me = this
  me.senderForm = me.gridSender ? me.gridSender.up('form') : null
  if (me.isNewInstance && me.gridSender) {
    me.attr.organizationID.setValueById(me.senderForm.record.get('orgID'))
    me.attr.employeeID.setValueById(me.senderForm.record.get('employeeID'))
    me.attr.employeeNumberID.setValueById(me.senderForm.instanceID)
  }
  const entryDate = me.record.get('dateFrom') ? AC.dateService.shiftDate(me.record.get('dateFrom')) : AC.dateService.todayDate()
  me.attr.departmentID.store.ubRequest.__mip_ondate = entryDate
  delete me.attr.departmentID.store.ubRequest.__mip_recordhistory_all
  me.attr.positionID.store.ubRequest.__mip_ondate = entryDate
  delete me.attr.positionID.store.ubRequest.__mip_recordhistory_all
  AC.viewUtils.setFilterValue(me.attr.departmentID, { orgID: me.record.get('organizationID') || me.senderForm.record.get('orgID') })

  AC.viewUtils.setWhereListProperty(me.attr.positionID, [
    ['parentUnitID', '=', me.record.get('departmentID')],
    [ 'orgID', '=', me.record.get('organizationID') || me.senderForm.record.get('orgID') ]
  ], null, [])

  let workPlace = me.attr.workPlace.getValue()
  let workScheduleWhereList = [
    ['organizationID', '=', me.record.get('organizationID') || me.senderForm.record.get('orgID'), 'org'],
    ['organizationID', 'isNull', null, 'orgNull']
  ]
  if (!workPlace || workPlace !== '5') {
    workScheduleWhereList.push(['isOnlyForPositions', '=', 0])
  }
  AC.viewUtils.setWhereListProperty(me.attr.workScheduleID,
    workScheduleWhereList,
    ['(([org]) OR ([orgNull]))'],
    ['clearWhereList']
  )
  me.attr.dictCategoryECBID.setAllowBlank(me.record.get('employeeNumberID.empWorkPlace') === '5')
  if (me.record.get('payElID.methodID.code') === '2') {
    me.attr.accrualSum.setFieldLabel(UB.i18n('Тариф'))
  } else {
    me.attr.accrualSum.setFieldLabel(UB.i18n('Оклад'))
  }

  setDictStWorkPlaceTypeWList(me)
  const hrTariffingEducational = AC.settings.get('hrTariffingEducational', appAC.globalOrganization())
  // Категорія персоналу визначається типом посади
  me.attr.dictStaffCatID[AC.settings.get('hrStaffCatByPosition', appAC.globalOrganization()) ? 'hide' : 'show']()
  // Використовувати штатний розпис
  if (AC.settings.get('hrUseStaffingTable', appAC.globalOrganization())) {
    me.attr.positionID.show()
  } else {
    me.attr.positionID.hide()
    me.attr.dictPositionID.show()
  }
  // Розподіл зарплати за КПК
  me.attr.dictProgClassID[(AC.settings.get('hrProgClassAcc', appAC.globalOrganization()) && !hrTariffingEducational) ? 'show' : 'hide']()
  me.attr.dictEmpCategoryID[!hrTariffingEducational ? 'show' : 'hide']()
  me.attr.dictQualificationID[hrTariffingEducational ? 'show' : 'hide']()
  // Розподіл зарплати за джерелами фінансування АБО Розподіл зарплати за проєктами
  if (AC.settings.get('hrFundSourceAcc', appAC.globalOrganization()) || AC.settings.get('hrProjectAcc', appAC.globalOrganization()) || AC.settings.get('hrProgClassAcc', appAC.globalOrganization())) {
    me.down('[name=fundSourcePanel]').show()
    AC.gridUtils.setGridColumnVisible(me.attr.positionFundSourceDt, ['dictFundSourceID.description'], AC.settings.get('hrFundSourceAcc', appAC.globalOrganization()))
    AC.gridUtils.setGridColumnVisible(me.attr.positionFundSourceDt, ['dictProjectID.description'], AC.settings.get('hrProjectAcc', appAC.globalOrganization()))
    AC.gridUtils.setGridColumnVisible(me.attr.positionFundSourceDt, ['dictProgClassID.description'], AC.settings.get('hrProgClassAcc', appAC.globalOrganization()))
  } else {
    if (!me.detail || !me.detail.positionFundSourceDt || !me.detail.positionFundSourceDt.length) {
      me.down('[name=fundSourcePanel]').hide()
    }
  }
  setPayElWhereListDate(me)
  if (me.isNewInstance) {
    UB.Repository('hr_employeeNumberS').attrs(['empWorkPlace']).selectById(me.record.get('employeeNumberID')).then(empData => {
      if (empData && empData.empWorkPlace === '5') {
        me.attr.dictCategoryECBID.setAllowBlank(true)
      }
    })
  }
}

function setStartData (me, data) {
  me.startValue = {
    dateFrom: me.record.get('dateFrom') ? AC.dateService.unshiftDate(me.record.get('dateFrom')) : null,
    dateTo: me.record.get('dateTo') && AC.dateService.unshiftDate(me.record.get('dateTo')).getFullYear() !== 9999 ? AC.dateService.unshiftDate(me.record.get('dateTo')) : null,
    orderDate: me.record.get('orderID.orderDate') ? AC.dateService.unshiftDate(me.record.get('orderID.orderDate')) : null,
    orderNumber: me.record.get('orderID.orderNumber')
  }
  me.attr.dimControl.setValue(me.record.getData())

  _.forEach(me.attr, attr => {
    if (attr.recordValue) {
      if (attr.setValueById) {
        attr.setValueById(me.startValue[attr.recordValue])
      } else {
        attr.setValue(me.startValue[attr.recordValue])
      }
    }
  })
}

async function onBeforeSave () {
  const me = this
  const mtCountTotal = AC.currencyService.round(me.attr.positionFundSourceDt.getStore().data.items.reduce((sum, item) => {
    return sum + AC.currencyService.round(item.get('mtCount'))
  }, 0))
  if (me.record.get('mtCount') && me.attr.positionFundSourceDt.getStore().data.items.length && Math.abs(mtCountTotal - me.record.get('mtCount')) > 0.005) {
    await $App.dialogError(UB.i18n('Загальна кількість ставок не дорівнює кількості ставок по джерелам фінансування.'))
    return false
  }
  const dimValue = me.attr.dimControl.getValue(true)
  _.forEach(dimValue, (value, key) => {
    if (me.record.get(key) !== value) {
      me.record.set(key, value)
    }
  })
  if (me.isNewInstance && me.formData && me.baseFieldList.every(o => me.record.get(o) === me.formData[o])) {
    return $App.dialogYesNo('Попередження', `Нове призначення не змінює попереднє,  що діє з 
    ${AC.dateService.getStringFormatDate(me.formData.dateFrom)}! Створити нове призначення?`)
  } else {
    return true
  }
}

function onPrepareDataBeforeSave (me, params) {
  const formData = {}
  function checkDate (attrName, data) {
    if (me.isNewInstance ||
      (me.attr[attrName].getValue() && me.startValue[me.attr[attrName].recordValue] && me.attr[attrName].getValue().getTime() !== me.startValue[me.attr[attrName].recordValue].getTime()) ||
      (!me.attr[attrName].getValue() && me.startValue[me.attr[attrName].recordValue]) || (me.attr[attrName].getValue() && !me.startValue[me.attr[attrName].recordValue])
    ) {
      data[attrName] = me.attr[attrName].getValue() ? AC.dateService.shiftDate(me.attr[attrName].getValue()) : null
    }
  }
  function checkBase (attrName, data) {
    if (me.isNewInstance || ((me.attr[attrName].getValue() || me.startValue[me.attr[attrName].recordValue]) && me.attr[attrName].getValue() !== me.startValue[me.attr[attrName].recordValue])) {
      data[attrName] = me.attr[attrName].getValue()
    }
  }
  checkDate('dateFrom', formData)
  checkDate('dateTo', formData)
  checkDate('orderDate', formData)
  checkBase('orderNumber', formData)
  params.formData = formData
  if (me.gridConfig.detailGrids) {
    const details = {}
    me.gridConfig.detailGrids.forEach((item) => {
      let grid = me.down(`[name=${item}]`)
      details[item] = grid.getAttributeData()
    })
    params.details = JSON.stringify(details)
  }
}

function setPayElWhereListDate (me) {
  let payElStore = me.attr.payElID.getStore()

  let dateFrom = (me.attr.dateFrom.isValid() && me.attr.dateFrom.getValue()) || (me.attr.dateTo.isValid() && me.attr.dateTo.getValue()) || null
  let dateTo = (me.attr.dateTo.isValid() && me.attr.dateTo.getValue()) || (me.attr.dateFrom.isValid() && me.attr.dateFrom.getValue()) || null
  if (dateFrom && dateTo) {
    AC.viewUtils.setFilterValue(me.attr.payElID, {
      dateFrom: { value: dateTo, condition: '<=' },
      dateTo: { value: dateFrom, condition: '>=' }
    })
  } else {
    if (payElStore.ubRequest.whereList.dateFrom) delete payElStore.ubRequest.whereList.dateFrom
    if (payElStore.ubRequest.whereList.dateTo) delete payElStore.ubRequest.whereList.dateTo
  }
}

async function onControlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'workPlace':
        let workPlace = me.attr.workPlace.getValue()
        const isOnlyForPositions = me.attr.workScheduleID.getFieldValue('isOnlyForPositions')
        let workScheduleWhereList = [
          ['organizationID', '=', me.record.get('organizationID') || me.senderForm.record.get('orgID'), 'org'],
          ['organizationID', 'isNull', null, 'orgNull']
        ]
        if (!workPlace || workPlace !== '5') {
          workScheduleWhereList.push(['isOnlyForPositions', '=', 0])
        }
        if ((workPlace === '5' && !isOnlyForPositions) || (workPlace !== '5' && isOnlyForPositions)) {
          me.attr.workScheduleID.clearValue()
        }
        AC.viewUtils.setWhereListProperty(me.attr.workScheduleID,
          workScheduleWhereList,
          ['(([org]) OR ([orgNull]))'],
          ['clearWhereList']
        )
        break
      case 'payElID':
        if (me.attr.payElID.getFieldValue('methodID.code') === '2') {
          me.attr.accrualSum.setFieldLabel(UB.i18n('Тариф'))
        } else {
          me.attr.accrualSum.setFieldLabel(UB.i18n('Оклад'))
        }
        break
      case 'departmentID':
        AC.viewUtils.setWhereListProperty(me.attr.positionID, [
          ['parentUnitID', '=', me.attr.departmentID.getValue()],
          ['state', '=', 'ACTIVE'],
          ['orgID', '=', me.record.get('organizationID')]
        ], null, ['clearWhereList', 'clearValue', 'clearStore'])
        me.attr.positionID.isChanged = !field.isChanged
        field.isChanged = false
        break
      case 'positionID':
        me.attr.dictPositionID.setValueById(field.getFieldValue('dictPositionID'))
        if (!field.isChanged && field.getFieldValue('parentUnitID') !== me.attr.departmentID.getValue()) {
          me.attr.departmentID.setValueById(field.getFieldValue('parentUnitID'))
          me.attr.departmentID.isChanged = true
        }
        me.attr.dateNew.setValue()
        break
      case 'dictPositionID':
        if (value) {
          const entryDate = AC.dateService.shiftDate(me.attr.dateFrom.getValue()) || appAC.globalApplicationDate()
          const accrualSum = await getAccrualSumByDictPosition(value, entryDate)
          if (accrualSum && me.attr.accrualSum.getValue() !== accrualSum) {
            me.attr.accrualSum.setValue(accrualSum)
            me.setIsDirty(true)
          }
        }
        break
      case 'dictTarifCoeffID':
        if (value) {
          const entryDate = AC.dateService.shiftDate(me.attr.dateFrom.getValue()) || appAC.globalApplicationDate()
          UB.Repository('hr_dictTarifCoeffDet')
            .attrs('accrualSum')
            .where('dictTarifCoeffID', '=', value)
            .where('dateFrom', '<=', entryDate)
            .where('dateTo', '>=', entryDate)
            .selectSingle()
            .then(data => {
              if (data) {
                me.attr.accrualSum.setValue(data.accrualSum)
              } else {
                me.attr.accrualSum.setValue()
              }
            })
        }
        break
    }
  }
}

function recalcPositionFundSource (me) {
  if (me.attr.positionFundSourceDt.getStore().count() > 0) {
    const mtCountTotal = AC.currencyService.round(me.attr.positionFundSourceDt.getData().reduce((sum, item) => {
      return sum + AC.currencyService.round(item['mtCount'])
    }, 0))
    const mtCount = me.attr.mtCount.getValue() || 0
    let delta = AC.currencyService.round(mtCountTotal - mtCount)
    if (delta > 0) {
      me.setIsDirty(true)
      for (let idx = me.attr.positionFundSourceDt.getStore().count() - 1; idx >= 0; idx--) {
        if (delta > 0) {
          const reco = me.attr.positionFundSourceDt.getStore().getAt(idx)
          const curValue = reco.get('mtCount')
          if (curValue > delta) {
            reco.set('mtCount', AC.currencyService.round(curValue - delta))
          } else {
            reco.set('mtCount', 0)
          }
          delta = AC.currencyService.round(delta - curValue)
        }
      }
    } else if (delta < 0) {
      const reco = me.attr.positionFundSourceDt.getStore().getAt(0)
      reco.set('mtCount', AC.currencyService.round((reco.get('mtCount') || 0) - delta))
      me.setIsDirty(true)
    }
    me.attr.positionFundSourceDt.getView().refresh()
    me.attr.positionFundSourceDt.GridSummary.dataBind()
  }
}
