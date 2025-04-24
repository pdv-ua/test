/* global UB HR appAC $App _  AC  appAC $App appHR */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  addBaseActions,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  generateTabNum,
  activateTab,
  onBeforeSave,
  showInfoBeforeSave,
  onPrepareDataBeforeSave,
  getChangeData

}

function initComponentStart () {
  const me = this
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('beforesave', onPrepareDataBeforeSave, me)
  me.on('aftersave', onAfterSave, me)
  me.on('beforeclose', () => { me.notRefreshAfterSave = true })
  me.setIsDirty = function (value) {
    me.setActionDisabled('save', !value)
    me.setActionDisabled('saveAndClose', !value)
    me.record.dirty = value
  }
  me.isModifedTaxCode = false
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['ubdetailgrid'])
  _.forEach(me.attr, attr => {
    if (attr.formParams) {
      attr.on('change', (ctrl, value) => {
        if (ctrl.recordValue) {
          if (ctrl.xtype === 'checkboxfield') {
            if ((!!value) !== (!!me.startValue[ctrl.recordValue])) {
              me.setIsDirty(true)
            }
          } else if (ctrl.xtype === 'ubdatefield') {
            if ((!me.startValue[ctrl.recordValue] || (!value && me.startValue[ctrl.recordValue]) ||
                (value && !me.startValue[ctrl.recordValue]) ||
                (value && ctrl.isValid() && value.getTime() !== me.startValue[ctrl.recordValue].getTime()))) {
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
  me.attr['employeeID.taxCode'].on('change', (ctrl, value) => {
    let me = ctrl.up('form')

    if (me.isModifedTaxCode) {
      let newVal = value.toUpperCase()
      if ($App.connection.userData('appDefaultLang') === 'uk') {
        newVal = newVal.replace(/E/, UB.i18n('Е'))
        newVal = newVal.replace(/T/, UB.i18n('Т'))
        newVal = newVal.replace(/I/, 'І')
        newVal = newVal.replace(/O/, UB.i18n('О'))
        newVal = newVal.replace(/P/, UB.i18n('Р'))
        newVal = newVal.replace(/A/, UB.i18n('А'))
        newVal = newVal.replace(/H/, UB.i18n('Н'))
        newVal = newVal.replace(/K/, UB.i18n('К'))
        newVal = newVal.replace(/X/, UB.i18n('Х'))
        newVal = newVal.replace(/C/, UB.i18n('С'))
        newVal = newVal.replace(/B/, UB.i18n('В'))
        newVal = newVal.replace(/M/, UB.i18n('Щ'))
      }
      me.isModifedTaxCode = false
      ctrl.setValue(newVal)
    }
  })
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }

  allActions.menu.add({
    xtype: 'menuseparator'
  })

  allActions.menu.add({
    text: UB.i18n('Накази'),
    name: 'actionAllowEdit',
    hidden: !AC.entityUtils.verifyRightsMethod('hr_employeePosition', 'canEditOrders'),
    handler: function () {
      const editable = ['orderID', 'changeOrderID']
      editable.forEach(ctrlName => {
        me.attr[ctrlName].setReadOnly(false)
      })
    }
  })
}

function setStartData (me, data) {
  me.startValue = data.detail || {}
  const dateAttrs = [ 'dateFrom', 'dateTo', 'employeeID.birthDate', 'positionID.appointOrderDate', 'positionID.dateFrom',
    'positionID.dateTo', 'positionID.dismissOrderDate', 'positionID.raiseSalary', 'rankID.rankDateFrom', 'rankID.rankOrderDate',
    'employeeID.oathDate']
  dateAttrs.forEach(attrName => {
    if (me.startValue[attrName]) {
      me.startValue[attrName] = AC.dateService.unshiftDate(AC.dateService.truncTimeToUtcNull(new Date(me.startValue[attrName])))
    }
  })
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

function onRecordLoaded (record, data) {
  const me = this
  setStartData(me, data)
  const onDate = AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom'))
  if (!me.isNewInstance) {
    me.setTitle(`${UB.i18n('Таб. №')} ${me.record.get('employeeNumberID.tabNum')}, ${me.record.get('employeeID.fullFIO')}`)
    me.attr.employeeID.setReadOnly(true)
    me.down('[name=generateTabNumButton]').hide()
  }
  const departmentID = me.getField('departmentID')
  departmentID.store.ubRequest.__mip_ondate = onDate
  delete departmentID.store.ubRequest.__mip_recordhistory_all
  const positionID = me.getField('positionID')
  positionID.store.ubRequest.__mip_ondate = onDate
  delete positionID.store.ubRequest.__mip_recordhistory_all
  AC.viewUtils.setFilterValue(departmentID, {
    state: 'ACTIVE',
    orgID: me.record.get('organizationID') || appAC.globalOrganization()
  })
  AC.viewUtils.setFilterValue(positionID, Object.assign({
    state: 'ACTIVE',
    orgID: me.record.get('organizationID') || appAC.globalOrganization()
  }, departmentID.getValue() ? { parentUnitID: departmentID.getValue() } : {}))

  appHR.getPayOutList(me.record.get('organizationID') || appAC.globalOrganization()).then(payOutList => {
    AC.viewUtils.setFilterValue(me.attr.payOutID, { ID: payOutList })
  })

  AC.viewUtils.setWhereListProperty(me.attr.workScheduleID,
    [ ['organizationID', 'isNull', null, 'orgIsNull'],
      ['organizationID', '=', me.record.get('organizationID') || appAC.globalOrganization(), 'orgID']
    ],
    ['(([orgIsNull]) OR ([orgID]))'],
    ['clearWhereList']
  )
  me.record.store.on('update', (store, reco, oper, modified) => {
    if (modified.includes('positionID')) {
      const dictPositionID = me.getField('positionID').getFieldValue('dictPositionID')
      me.getField('dictPositionID').setValueById(dictPositionID)
    }
  })

  const orderStore = me.attr.orderID.getStore()
  orderStore.ubRequest.whereList = {
    exists: {
      expression: '',
      condition: 'subquery',
      subQueryType: 'Exists',
      value: {
        entity: 'hr_empOrderDet',
        fieldList: [],
        method: 'select',
        whereList: {
          cond: {
            expression: '[orderID]=[{master}.ID]',
            condition: 'custom'
          },
          employeeNumberID: {
            condition: 'equal',
            expression: '[employeeNumberID]',
            value: me.record.get('employeeNumberID')
          }
        }
      }
    },
    orderState: {
      expression: '[orderState]',
      condition: 'in',
      value: ['POSTED', 'PROCESSED']
    },
    empOrderType: {
      expression: '[empOrderType]',
      condition: '=',
      value: 'STAFFTABLE'
    }
  }
  orderStore.ubRequest.logicalPredicates = ['([orderState] AND ([exists] OR [empOrderType]))']
  const changeOrderStore = me.attr.changeOrderID.getStore()
  changeOrderStore.ubRequest.whereList = {
    exists: {
      expression: '',
      condition: 'subquery',
      subQueryType: 'Exists',
      value: {
        entity: 'hr_empOrderDet',
        fieldList: [],
        method: 'select',
        whereList: {
          cond: {
            expression: '[orderID]=[{master}.ID]',
            condition: 'custom'
          },
          employeeNumberID: {
            condition: 'equal',
            expression: '[employeeNumberID]',
            value: me.record.get('employeeNumberID')
          }
        }
      }
    },
    orderState: {
      expression: '[orderState]',
      condition: 'in',
      value: ['POSTED', 'PROCESSED']
    },
    empOrderType: {
      expression: '[empOrderType]',
      condition: '=',
      value: 'STAFFTABLE'
    }
  }
  changeOrderStore.ubRequest.logicalPredicates = ['([orderState] AND ([exists] OR [empOrderType]))']
}

function onAfterSave (me, data) {
  if (me.notRefreshAfterSave) {
    me.notRefreshAfterSave = true
  } else {
    setStartData(me, data)
  }
}

function onFormDataReady () {
  const me = this
  me.attr.employeeID.labelEl.addCls('x-label-required')
  if (me.isNewInstance) {
    me.startValue = {}
    me.setTitle(UB.i18n(`Створення особового рахунку`))
    me.attr.organizationID.setValueById(appAC.globalOrganization())
    UB.Repository('cdn_country').attrs('ID', 'code').where('code', '=', appAC.getDefaultCountryCode()).selectSingle().then(res => {
      if (res) {
        me.attr.citizenshipID.setValueById(res.ID)
      }
    })
    if (me.defaultValues) {
      Object.keys(me.defaultValues).forEach(item => {
        if (me.defaultValues[item]) me.attr[item][me.attr[item].xtype === 'ubcombobox' ? 'setValueById' : 'setValue'](me.defaultValues[item])
      })
      me.generateTabNum(me)
    }
  }
  me.attr.orderID.setAllowBlank(true)
  const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
  if (notShowSalary) {
    me.attr.accrualSum.hide()
  }
}

function onControlChanged (field, value) {
  const me = this
  if (field.name === 'positionID' && value) {
    const dictTarifCoeffID = field.getFieldValue('dictTarifCoeffID')
    if (dictTarifCoeffID && !me.attr.dictTarifCoeffID.getValue()) {
      me.attr.dictTarifCoeffID.setValueById(dictTarifCoeffID)
    }
    const workScheduleID = field.getFieldValue('workScheduleID')
    if (workScheduleID && !me.attr.workScheduleID.getValue()) {
      me.attr.workScheduleID.setValueById(workScheduleID)
    }
    const payElID = field.getFieldValue('payElID')
    if (payElID && !me.attr.payElID.getValue()) {
      me.attr.payElID.setValueById(payElID)
    }
    const accrualSum = field.getFieldValue('accrualSum')
    if (accrualSum && !me.attr.accrualSum.getValue()) {
      me.attr.accrualSum.setValue(accrualSum)
    }
  }
}

function addBaseActions () {
  let me = this
  me.callParent(arguments)
}

function onBeforeSave () {
  return Promise.resolve(true)
}
function showInfoBeforeSave (me) {
  return Promise.resolve(true)
}

function getChangeData (me) {
  const data = { employee: {}, position: {}, dism: {}, rank: {} }
  const changeData = []
  if (me.isNewInstance) {
    if (!me.attr.employeeID.getValue()) {
      data.employee.fullFIO = me.attr.employeeID.rawValue.replace(/  +/g, ' ').trim()
      changeData.push({ attrName: me.attr.employeeID.fieldLabel, oldValue: '', newValue: data.employee.fullFIO })
    } else {
      changeData.push({ attrName: me.attr.employeeID.fieldLabel, oldValue: '', newValue: me.attr.employeeID.getFieldValue('fullFIO') })
    }
  }
  function checkComboBox (attrName, section, ignoreChange) {
    if ((me.attr[attrName].getValue() || me.startValue[me.attr[attrName].recordValue]) && me.attr[attrName].getValue() !== me.startValue[me.attr[attrName].recordValue]) {
      section[attrName] = me.attr[attrName].getValue()
      if (!ignoreChange) {
        changeData.push({
          attrName: me.attr[attrName].fieldLabel,
          oldValue: me.startValue[`${me.attr[attrName].recordValue}Name`],
          newValue: me.attr[attrName].getFieldValue(me.attr[attrName].displayField)
        })
      }
    }
  }
  function checkBase (attrName, section, ignoreChange) {
    if ((me.attr[attrName].getValue() || me.startValue[me.attr[attrName].recordValue]) && me.attr[attrName].getValue() !== me.startValue[me.attr[attrName].recordValue]) {
      section[attrName] = me.attr[attrName].getValue()
      if (!ignoreChange) {
        changeData.push({
          attrName: me.attr[attrName].fieldLabel,
          oldValue: me.startValue[me.attr[attrName].recordValue],
          newValue: me.attr[attrName].getValue()
        })
      }
    }
  }
  function checkDate (attrName, section, ignoreChange) {
    if ((me.attr[attrName].getValue() && me.startValue[me.attr[attrName].recordValue] && me.attr[attrName].getValue().getTime() !== me.startValue[me.attr[attrName].recordValue].getTime()) ||
      (!me.attr[attrName].getValue() && me.startValue[me.attr[attrName].recordValue]) || (me.attr[attrName].getValue() && !me.startValue[me.attr[attrName].recordValue])
    ) {
      section[attrName] = me.attr[attrName].getValue() ? AC.dateService.shiftDate(me.attr[attrName].getValue()) : null
      if (!ignoreChange) {
        changeData.push({
          attrName: me.attr[attrName].fieldLabel,
          oldValue: me.startValue[me.attr[attrName].recordValue] ? AC.dateService.formatDate(me.startValue[me.attr[attrName].recordValue]) : '',
          newValue: me.attr[attrName].getValue() ? AC.dateService.formatDate(me.attr[attrName].getValue()) : ''
        })
      }
    }
  }
  function checkEnum (attrName, section, ignoreChange, paramName = 'name') {
    if ((me.attr[attrName].getValue() || me.startValue[me.attr[attrName].recordValue]) && me.attr[attrName].getValue() !== me.startValue[me.attr[attrName].recordValue]) {
      section[attrName] = me.attr[attrName].getValue()
      if (!ignoreChange) {
        changeData.push({
          attrName: me.attr[attrName].fieldLabel,
          oldValue: me.startValue[me.attr[attrName].recordValue] ? UB.core.UBEnumManager.getById(me.attr[attrName].enumGroupFilter, me.startValue[me.attr[attrName].recordValue]).get(paramName) : '',
          newValue: me.attr[attrName].getFieldValue(paramName)
        })
      }
    }
  }
  function checkCheckBox (attrName, section, ignoreChange) {
    if ((me.attr[attrName].getValue() || me.startValue[me.attr[attrName].recordValue]) && (!!me.attr[attrName].getValue()) !== (!!me.startValue[me.attr[attrName].recordValue])) {
      section[attrName] = me.attr[attrName].getValue()
      if (!ignoreChange) {
        changeData.push({
          attrName: me.attr[attrName].fieldLabel,
          oldValue: me.startValue[me.attr[attrName].recordValue] ? UB.i18n('Так') : UB.i18n('Ні'),
          newValue: me.attr[attrName].getValue() ? UB.i18n('Так') : UB.i18n('Ні')
        })
      }
    }
  }

  checkEnum('empTaxCodeType', data.employee, true)
  checkBase('taxCode', data.employee, true)
  checkEnum('sexType', data.employee, true)
  checkDate('birthDate', data.employee, true)
  checkDate('oathDate', data.employee, true)
  checkCheckBox('isCitizen', data.employee, true)
  checkBase('deputy', data.employee, true)
  checkBase('scientificWorks', data.employee, true)
  checkBase('civilOther', data.employee, true)
  checkCheckBox('isInitiated', data.employee, true)
  checkComboBox('citizenshipID', data.employee, true)

  checkDate('dateFrom', data.position)
  checkBase('appointOrderNumber', data.position)
  checkDate('appointOrderDate', data.position)

  checkEnum('workPlace', data.position, false, 'shortName')

  checkEnum('workerType', data.position, false, 'shortName')
  checkComboBox('departmentID', data.position)
  checkComboBox('positionID', data.position)
  checkComboBox('dictStaffCatID', data.position)
  checkComboBox('dictPositionID', data.position)
  checkComboBox('workScheduleID', data.position)
  checkComboBox('dictTarifCoeffID', data.position)
  checkComboBox('payElID', data.position)
  checkBase('mtCount', data.position)
  checkBase('accrualSum', data.position)
  checkDate('raiseSalary', data.position)
  checkCheckBox('isIndex', data.position)

  checkComboBox('dictCategoryECBID', data.position)
  checkComboBox('dictFundSourceID', data.position)
  checkComboBox('accountID', data.position)

  checkDate('dateTo', data.dism)
  checkComboBox('reasonDismID', data.dism)
  checkBase('dismissOrderNumber', data.dism)
  checkDate('dismissOrderDate', data.dism)
  checkComboBox('dictRankID', data.rank)
  checkDate('rankDateFrom', data.rank)
  checkBase('rankOrderNumber', data.rank)
  checkDate('rankOrderDate', data.rank)

  data.changeData = !!changeData.length

  me.changeDataForSave = { data, changeData }
}

function onPrepareDataBeforeSave (me, params) {
  params.isDirectUpdate = true
}

function generateTabNum (me) {
  $App.connection.run({
    entity: 'hr_employeeNumber',
    method: 'getNextTabNum',
    organizationID: me.record.get('organizationID') || appAC.globalOrganization(),
    employeeID: me.attr.employeeID.getValue()
  }).then(mParams => {
    me.down('[attributeName=tabNum]').setValue(String(mParams.tabNum))
  })
}

function activateTab (nodeId, me) {
  if (!nodeId || (me.isNewInstance && nodeId !== 'hr_basicInfo')) {
    return
  }
  const tabPanel = me.down('tabpanel')
  const tabs = tabPanel.items.items
  let tab = tabPanel.down('[nodeId=' + nodeId + ']')
  if (!tab) {
    tab = HR.numberTabs.getTabConfig(nodeId, me)
    if (!tab) {
      return
    }
    tab = tabPanel.add(tab)
  }
  tabs.forEach(function (item) {
    item.tab.hide()
  })
  if (nodeId === 'hr_employeeNumberPositionEdit') {
    const grid = tab.down('acGrid')
    grid.getStore().load()
  }

  tab.tab.show()
  tabPanel.setActiveTab(tab)
}
