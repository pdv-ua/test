/* global UB Ext HR appAC $App _  AC saveAs Blob appAC COA appHR */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  addBaseActions,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  generateTabNum,
  activateTab,
  treepanelSelect,
  checkNodeSelection,
  onBeforeSave,
  showInfoBeforeSave,
  onPrepareDataBeforeSave,
  getChangeData,
  checkDismFieldState
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

function setTreeItemVisible (tree, elementName, isVisible) {
  if (isVisible) {
    const index = tree.filters.findIndex(f => f === elementName)
    tree.filters.splice(index, 1)
  } else {
    tree.filters.push(elementName)
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

function setDictStWorkPlaceTypeWList (me, tree) {
  const whereDepend = appHR.getPayElIDDependency() // [ dictStaffCatID, workPlace, workerType, payElID ]

  const depend = [
    {
      dictStaffCatID: '1',
      fields: { dateFrom: 1,
        testDateTo: 1,
        planDateTo: 1,
        dateTo: 1,
        departmentID: 1,
        positionID: 1,
        workScheduleID: 1,
        mtCount: 1,
        accrualSum: 1,
        raiseSalary: 1,
        dictRankID: 0,
        rankDateFrom: 0,
        rankOrderNumber: 0,
        rankOrderDate: 0,
        isIndex: 1 },
      tabs: {
        'hr_employeeTaxLimit': 1,
        'hr_employeeSickLimit': 1,
        'hr_employeeDisability': 1,
        'hr_employeeNumberPosition': 1,
        'hr_employeeNumberPositionEdit': 1,
        'hr_employeeNumber': 1,
        'hr_orderRegistryDt': 1,
        'hr_accrualBalance': 1,
        'hr_employeeAccrualEdit': 1,
        'hr_payRetention': 1,
        'hr_payOut': 1,
        'hr_employeeCPH': 1,
        'hr_employeeExperience': 1,
        'hr_employeeWorkbook': 1,
        'hr_employeeNumberServ': 0,
        'hr_employeeNumberDipl': 0,
        'hr_employeeNumberContactAddress': 1,
        'hr_employeeDocs': 1,
        'hr_employeeFamily': 1,
        'hr_empOrder': 1
      }
    },
    {
      dictStaffCatID: '2',
      fields: { dateFrom: 1,
        testDateTo: 1,
        planDateTo: 1,
        dateTo: 1,
        departmentID: 1,
        positionID: 1,
        workScheduleID: 1,
        mtCount: 1,
        accrualSum: 1,
        raiseSalary: 1,
        dictRankID: 1,
        rankDateFrom: 1,
        rankOrderNumber: 1,
        rankOrderDate: 1,
        isIndex: 1 },
      tabs: {
        'hr_employeeTaxLimit': 1,
        'hr_employeeSickLimit': 1,
        'hr_employeeDisability': 1,
        'hr_employeeNumberPosition': 1,
        'hr_employeeNumberPositionEdit': 1,
        'hr_employeeNumber': 1,
        'hr_orderRegistryDt': 1,
        'hr_accrualBalance': 1,
        'hr_employeeAccrualEdit': 1,
        'hr_payRetention': 1,
        'hr_payOut': 1,
        'hr_employeeCPH': 0,
        'hr_employeeExperience': 1,
        'hr_employeeWorkbook': 1,
        'hr_employeeNumberServ': 1,
        'hr_employeeNumberDipl': 0,
        'hr_employeeNumberContactAddress': 1,
        'hr_employeeDocs': 1,
        'hr_employeeFamily': 1,
        'hr_empOrder': 1
      }
    },
    {
      dictStaffCatID: '3',
      fields: { dateFrom: 1,
        testDateTo: 1,
        planDateTo: 1,
        dateTo: 1,
        departmentID: 1,
        positionID: 1,
        workScheduleID: 1,
        mtCount: 1,
        accrualSum: 1,
        raiseSalary: 1,
        dictRankID: 0,
        rankDateFrom: 0,
        rankOrderNumber: 0,
        rankOrderDate: 0,
        isIndex: 1 },
      tabs: {
        'hr_employeeTaxLimit': 1,
        'hr_employeeSickLimit': 1,
        'hr_employeeDisability': 1,
        'hr_employeeNumberPosition': 1,
        'hr_employeeNumberPositionEdit': 1,
        'hr_employeeNumber': 1,
        'hr_orderRegistryDt': 1,
        'hr_accrualBalance': 1,
        'hr_employeeAccrualEdit': 1,
        'hr_payRetention': 1,
        'hr_payOut': 1,
        'hr_employeeCPH': 0,
        'hr_employeeExperience': 1,
        'hr_employeeWorkbook': 1,
        'hr_employeeNumberServ': 0,
        'hr_employeeNumberDipl': 0,
        'hr_employeeNumberContactAddress': 1,
        'hr_employeeDocs': 1,
        'hr_employeeFamily': 1,
        'hr_empOrder': 1
      }
    },
    {
      dictStaffCatID: '4',
      fields: { dateFrom: 1,
        testDateTo: 1,
        planDateTo: 1,
        dateTo: 1,
        departmentID: 1,
        positionID: 1,
        workScheduleID: 1,
        mtCount: 1,
        accrualSum: 1,
        raiseSalary: 1,
        dictRankID: 0,
        rankDateFrom: 0,
        rankOrderNumber: 0,
        rankOrderDate: 0,
        isIndex: 1 },
      tabs: {
        'hr_employeeTaxLimit': 1,
        'hr_employeeSickLimit': 1,
        'hr_employeeDisability': 1,
        'hr_employeeNumberPosition': 1,
        'hr_employeeNumberPositionEdit': 1,
        'hr_employeeNumber': 1,
        'hr_orderRegistryDt': 1,
        'hr_accrualBalance': 1,
        'hr_employeeAccrualEdit': 1,
        'hr_payRetention': 1,
        'hr_payOut': 1,
        'hr_employeeCPH': 0,
        'hr_employeeExperience': 1,
        'hr_employeeWorkbook': 0,
        'hr_employeeNumberServ': 0,
        'hr_employeeNumberDipl': 0,
        'hr_employeeNumberContactAddress': 1,
        'hr_employeeDocs': 1,
        'hr_employeeFamily': 1,
        'hr_empOrder': 1
      }
    },
    {
      dictStaffCatID: '5',
      fields: { dateFrom: 1,
        testDateTo: 1,
        planDateTo: 1,
        dateTo: 1,
        departmentID: 1,
        positionID: 1,
        workScheduleID: 1,
        mtCount: 1,
        accrualSum: 1,
        raiseSalary: 1,
        dictRankID: 1,
        rankDateFrom: 1,
        rankOrderNumber: 1,
        rankOrderDate: 1,
        isIndex: 1 },
      tabs: {
        'hr_employeeTaxLimit': 1,
        'hr_employeeSickLimit': 1,
        'hr_employeeDisability': 1,
        'hr_employeeNumberPosition': 1,
        'hr_employeeNumberPositionEdit': 1,
        'hr_employeeNumber': 1,
        'hr_orderRegistryDt': 1,
        'hr_accrualBalance': 1,
        'hr_employeeAccrualEdit': 1,
        'hr_payRetention': 1,
        'hr_payOut': 1,
        'hr_employeeCPH': 0,
        'hr_employeeExperience': 1,
        'hr_employeeWorkbook': 1,
        'hr_employeeNumberServ': 1,
        'hr_employeeNumberDipl': 1,
        'hr_employeeNumberContactAddress': 1,
        'hr_employeeDocs': 1,
        'hr_employeeFamily': 1,
        'hr_empOrder': 1
      }
    },
    {
      dictStaffCatID: '6',
      fields: { dateFrom: 1,
        testDateTo: 0,
        planDateTo: 0,
        dateTo: 1,
        departmentID: 1,
        positionID: 0,
        workScheduleID: 0,
        mtCount: 1,
        accrualSum: 1,
        raiseSalary: 0,
        dictRankID: 0,
        rankDateFrom: 0,
        rankOrderNumber: 0,
        rankOrderDate: 0,
        isIndex: 0 },
      tabs: {
        'hr_employeeTaxLimit': 1,
        'hr_employeeSickLimit': 0,
        'hr_employeeDisability': 1,
        'hr_employeeNumberPosition': 1,
        'hr_employeeNumberPositionEdit': 1,
        'hr_employeeNumber': 1,
        'hr_orderRegistryDt': 0,
        'hr_accrualBalance': 1,
        'hr_employeeAccrualEdit': 0,
        'hr_payRetention': 1,
        'hr_payOut': 1,
        'hr_employeeCPH': 1,
        'hr_employeeExperience': 0,
        'hr_employeeWorkbook': 0,
        'hr_employeeNumberServ': 0,
        'hr_employeeNumberDipl': 0,
        'hr_employeeNumberContactAddress': 1,
        'hr_employeeDocs': 1,
        'hr_employeeFamily': 0,
        'hr_empOrder': 1
      }
    },
    {
      dictStaffCatID: '7',
      fields: { dateFrom: 1,
        testDateTo: 0,
        planDateTo: 0,
        dateTo: 1,
        departmentID: 1,
        positionID: 0,
        workScheduleID: 0,
        mtCount: 0,
        accrualSum: 0,
        raiseSalary: 0,
        dictRankID: 0,
        rankDateFrom: 0,
        rankOrderNumber: 0,
        rankOrderDate: 0,
        isIndex: 0 },
      tabs: {
        'hr_employeeTaxLimit': 1,
        'hr_employeeSickLimit': 0,
        'hr_employeeDisability': 1,
        'hr_employeeNumberPosition': 1,
        'hr_employeeNumberPositionEdit': 1,
        'hr_employeeNumber': 1,
        'hr_orderRegistryDt': 0,
        'hr_accrualBalance': 1,
        'hr_employeeAccrualEdit': 1,
        'hr_payRetention': 1,
        'hr_payOut': 1,
        'hr_employeeCPH': 1,
        'hr_employeeExperience': 0,
        'hr_employeeWorkbook': 0,
        'hr_employeeNumberServ': 0,
        'hr_employeeNumberDipl': 0,
        'hr_employeeNumberContactAddress': 1,
        'hr_employeeDocs': 1,
        'hr_employeeFamily': 0,
        'hr_empOrder': 1
      }
    }
  ]
  const fieldTabList = {
    fields: ['dateFrom', 'testDateTo', 'planDateTo', 'dateTo', 'departmentID', 'positionID', 'workScheduleID', 'mtCount',
      'accrualSum', 'raiseSalary', 'dictRankID', 'rankDateFrom', 'rankOrderNumber', 'rankOrderDate', 'isIndex'],
    tabs: [
      'hr_employeeTaxLimit',
      'hr_employeeSickLimit',
      'hr_employeeDisability',
      'hr_employeeNumberPosition',
      'hr_employeeNumberPositionEdit',
      'hr_employeeNumber',
      'hr_orderRegistryDt',
      'hr_accrualBalance',
      'hr_employeeAccrualEdit',
      'hr_payRetention',
      'hr_payOut',
      'hr_employeeCPH',
      'hr_employeeExperience',
      'hr_employeeWorkbook',
      'hr_employeeNumberServ',
      'hr_employeeNumberDipl',
      'hr_employeeNumberContactAddress',
      'hr_employeeDocs',
      'hr_employeeFamily',
      'hr_empOrder'
    ]
  }

  me.treeKeyBy = {}
  function getTreeNodes (nodes) {
    nodes.forEach(item => {
      me.treeKeyBy[item.raw.nodeId] = item
      if (item.childNodes && item.childNodes.length) getTreeNodes(item.childNodes)
    })
  }
  getTreeNodes(tree.getRootNode().childNodes)

  function setDependWhereList () {
    const hrStaffCatByPosition = AC.settings.get('hrStaffCatByPosition', appAC.globalOrganization())
    const hrUseStaffingTable = AC.settings.get('hrUseStaffingTable', appAC.globalOrganization())
    const hrTariffingEducational = AC.settings.get('hrTariffingEducational', appAC.globalOrganization())
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

    if (!depend.some(dep => dep.dictStaffCatID === fVal.dictStaffCatID.val)) fVal.dictStaffCatID.val = '1'
    fVal.payElID.val = (fVal.payElID.val ? fVal.payElID.val.get('methodID.code') : false) || '1'

    Object.keys(fVal).forEach((field, index) => {
      const curWhereDepend = whereDepend.filter(dep =>
        Object.keys(fVal).every((fld, ind) => fld === field || dep[ind] === fVal[fld].val))
      if (curWhereDepend.length) {
        const whereVal = curWhereDepend.map(dep => dep[index])
        AC.viewUtils.setWhereListProperty(me.attr[field], [[fVal[field].byField, 'in', whereVal, field]], null, ['clearStore'])
      } else {
        AC.viewUtils.deleteWhereListProperty(me.attr[field], fVal[field].byField, true)
      }
    })

    const curDepend = depend.find(dep => dep.dictStaffCatID === fVal.dictStaffCatID.val)
    fieldTabList.fields.forEach(item => me.attr[item][curDepend.fields[item] ? 'show' : 'hide']())

    const treeFilters = []
    fieldTabList.tabs.forEach(item => !curDepend.tabs[item] && treeFilters.push(item))
    if (!(!tree.filters.length && !treeFilters.length)) {
      tree.filters = treeFilters
      tree.updateNodes()
    }

    me.attr.dictStaffCatID[hrStaffCatByPosition ? 'hide' : 'show']()
    me.attr.positionID[hrUseStaffingTable ? 'show' : 'hide']()
    if (hrTariffingEducational) {
      me.attr.rankDateFrom.hide()
      me.attr.rankOrderNumber.hide()
      me.attr.rankOrderDate.hide()
      me.attr.dictProgClassID.hide()
      me.attr.dictEmpCategoryID.hide()
      me.attr.dictQualificationID.show()
    } else {
      me.attr.dictEmpCategoryID.show()
      me.attr.dictQualificationID.hide()
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

        tree.filters = []
        tree.updateNodes()
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

        tree.filters = []
        tree.updateNodes()
      }
      let workPlace = me.attr.workPlace.getValue()
      const isOnlyForPositions = me.attr.workScheduleID.getFieldValue('isOnlyForPositions')
      let workScheduleWhereList = [
        ['organizationID', '=', me.record.get('orgID') || appAC.globalOrganization(), 'orgID'],
        ['organizationID', 'isNull', null, 'orgIsNull']
      ]
      if (!workPlace || workPlace !== '5') {
        workScheduleWhereList.push(['isOnlyForPositions', '=', 0])
      }
      if ((workPlace === '5' && !isOnlyForPositions) || (workPlace !== '5' && isOnlyForPositions)) {
        me.attr.workScheduleID.clearValue()
      }
      AC.viewUtils.setWhereListProperty(me.attr.workScheduleID,
        workScheduleWhereList,
        ['(([orgID]) OR ([orgIsNull]))'],
        ['clearWhereList']
      )
    } else {
      ctrl.noChange = false
    }
  })
  me.attr.dictCostTypeID.on('change', (ctrl) => {
    if (!ctrl.noChange) {
      me.attr.accountID.setValueById(ctrl.getFieldValue('accountID'))
    } else {
      ctrl.noChange = false
    }
  })

  me.attr.dictPositionID.on('change', (ctrl, value) => {
    if (!ctrl.noChange) {
      setDependWhereList()
      if (value) {
        const entryDate = appAC.globalApplicationDate()
        const accrualSum = getAccrualSumByDictPosition(value, entryDate)
        if (accrualSum && me.attr.accrualSum.getValue() !== accrualSum) {
          me.attr.accrualSum.setValue(accrualSum)
          me.setIsDirty(true)
        }
      }
    }
  })

  me.attr.dictTarifCoeffID.on('change', (ctrl, value) => {
    if (!ctrl.noChange) {
      if (value) {
        const entryDate = appAC.globalApplicationDate()
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

        tree.filters = []
        tree.updateNodes()
      }
    } else {
      ctrl.noChange = false
    }
  })
  me.attr.payElID.on('change', (ctrl, value) => {
    if (!ctrl.noChange) {
      setDependWhereList()

      if (me.attr.payElID.getFieldValue('methodID.code') === '2') {
        me.attr.accrualSum.setFieldLabel(UB.i18n('Тариф'))
      } else {
        me.attr.accrualSum.setFieldLabel(UB.i18n('Оклад'))
      }

      if (!value && !me.attr.workPlace.getValue() && !me.attr.dictStaffCatID.getValue() && !me.attr.workerType.getValue()) {
        fieldTabList.fields.forEach(item => {
          me.attr[item].show()
        })

        tree.filters = []
        tree.updateNodes()
      }
    } else {
      ctrl.noChange = false
    }
  })
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['ubdetailgrid', 'acGrid'])
  const tree = me.down('[ubID=treeInfo]')
  tree.view.up('[ubId=menuPanel]').activateTab(me.targetTab || 'hr_basicInfo', me)
  tree.updateNodes()
  me.actions.fDelete.hide()

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
  me.attr.departmentID.on('change', (ctrl, value) => {
    if (value !== me.startValue[ctrl.recordValue]) {
      value ? AC.viewUtils.setFilterValue(me.attr.positionID, {
        state: ['ACTIVE', 'CHANGES'],
        orgID: me.record.get('orgID') || appAC.globalOrganization(),
        parentUnitID: value }, ctrl.isChanged ? [] : ['clearValue'])
        : AC.viewUtils.removeFilterValue(me.attr.positionID, 'parentUnitID', 1)
      me.attr.positionID.isChanged = !ctrl.isChanged
      if (!ctrl.isChanged) me.attr.dictPositionID.clearValue()
    }
    ctrl.isChanged = false
  })
  me.attr.positionID.on('change', async (ctrl, value) => {
    if (value !== me.startValue[ctrl.recordValue] || (value && !me.attr.dictPositionID.getValue())) {
      me.attr.dictPositionID.setValueById(ctrl.getFieldValue('dictPositionID'))
      if (!ctrl.isChanged && ctrl.getFieldValue('parentUnitID') !== me.attr.departmentID.getValue()) {
        me.attr.departmentID.setValueById(ctrl.getFieldValue('parentUnitID'))
        me.attr.departmentID.isChanged = true
      }
      me.attr.dictPositionID.setReadOnly(!!value)
    }
  })

  me.attr.dictRankID.on('change', (ctrl, value) => {
    if (value !== me.startValue[ctrl.recordValue]) {
      me.attr.rankDateFrom.setValue(null)
      me.attr.rankOrderNumber.setValue(null)
      me.attr.rankOrderDate.setValue(null)
    }
  })

  if (me.isNewInstance) {
    me.attr.taxCode.on('blur', ctrl => {
      if (me.isNewInstance && !me.attr.employeeID.getValue() && ctrl.getValue()) {
        let empTaxCodeType = me.down('[name=empTaxCodeType]').getValue()
        if (empTaxCodeType) {
          UB.Repository('hr_employee')
            .attrs(['ID', 'taxCode', 'empTaxCodeType.name', 'fullFIO'])
            .where('taxCode', '=', ctrl.getValue())
            .where('empTaxCodeType', '=', empTaxCodeType)
            .where('mi_deleteDate', '>=', '#maxdate')
            .selectSingle().then(data => {
              if (data) {
                UB.Repository('ac_employeeOrg')
                  .attrs(['ID'])
                  .where('employeeID', '=', data.ID)
                  .where('organizationID', '=', appAC.globalOrganization())
                  .where('mi_deleteDate', '>=', '#maxdate')
                  .selectSingle().then(dataOrg => {
                    if (!dataOrg) {
                      $App.dialogInfo(UB.i18n(`Особа {0} не доступна в поточній організації!`, data.fullFIO))
                    } else {
                      if (me.isEditMode) {
                        $App.dialogInfo(UB.i18n(`Існує запис для {0} з вказаним {1}!`, data.fullFIO, data['empTaxCodeType.name']))
                      }
                      if (me.isNewInstance) {
                        $App.dialogYesNo('Попередження', UB.i18n(`Існує запис для {0} з вказаним {1}! Вибрати його?`, data.fullFIO, data['empTaxCodeType.name']))
                          .then(res => {
                            if (res) {
                              me.attr.employeeID.setValueById(data.ID)
                            } else {
                              ctrl.setValue(null)
                            }
                          })
                      }
                    }
                  })
              }
            })
        }
      }
    })
  }
  me.attr.positionFundSourceDt.on('changeData', (grid) => {
    const me = grid.up('form')
    const mtCountTotal = grid.getStore().data.items.reduce((sum, item) => {
      return sum + AC.currencyService.round(item.get('mtCount'))
    }, 0)
    if (grid.getStore().data.items.length) me.attr.mtCount.setValue(AC.currencyService.round(mtCountTotal))
    me.setIsDirty(true)
  })
  me.attr.birthDate.on('change', (ctrl, value) => {
    function calcAge (dateString) {
      let birthday = new Date(dateString)

      birthday = +birthday
      return ~~((Date.now() - birthday) / (31557600000)) || null
    }
    const age = value && value instanceof Date ? calcAge(value) : null
    me.attr.employeeAge.setValue(!age || age < 1 ? null : age)
  })

  me.attr.parentEmpNumberID.on('change', (ctrl, value) => {
    me.attr.employeePrevOrg.setValue(value && me.attr.parentEmpNumberID.getFieldValue('orgName') ? me.attr.parentEmpNumberID.getFieldValue('orgName') : null)
  })

  me.attr.taxCode.on('change', (ctrl, value) => {
    let me = ctrl.up('form')
    // delete me.attr.employeeID.getStore().ubRequest.whereList.taxCode
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

      if (newVal !== value) {
        ctrl.setValue(newVal)
        return
      }
    }

    if (AC.entityUtils.verifyRightsMethod('hr_employeeNumber', 'setFormReadOnly') && !$App.connection.userData().roles.toUpperCase().split(',').includes('ADMIN')) {
      Object.keys(me.attr).forEach(attr => me.attr[attr].setReadOnly(true))
    }
    if (me.attr.taxCode.isValid() && value.length === 10 && me.attr.empTaxCodeType.getValue() === 'TAXCODE') {
      const { sex, birthday } = HR.nameCase.decyptionRNOKPP(value)
      me.attr.sexType.setValueById(sex, true)
      if (birthday) {
        if (birthday < AC.dateService.currentDate()) {
          me.attr.birthDate.setValue(birthday)
        } else {
          $App.dialogInfo(UB.i18n(`Перевірте коректність вводу РНОКПП, дата народження з РНОКПП {0}`, AC.dateService.formatDate(birthday)), 'Інформація')
        }
      }
    }

    if (value !== '') {
      me.attr.employeeID.getStore().ubRequest.whereList.taxCode = {
        condition: 'LIKE',
        expression: '[taxCode]',
        value: `%${value}%`
      }
    } else {
      delete me.attr.employeeID.getStore().ubRequest.whereList.taxCode
    }
    if (!me.attr.taxCode.skipChange) {
      me.attr.employeeID.skipChange = true
      me.attr.employeeID.clearValue()

      me.attr.employeeID.store.load()
    }
    me.attr.taxCode.skipChange = false
    me.isModifedTaxCode = true
  })
  const useSingleTabNum = AC.settings.get('hrUseSingleEmployeeTabNum', appAC.globalOrganization())
  if (useSingleTabNum) {
    me.attr.tabNum.vtype = 'tabNumExtraValidator'
  }

  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (allActions) {
    allActions.menu.add({
      xtype: 'menuseparator'
    })
    allActions.menu.add({
      text: UB.i18n('Редагувати тип картки'),
      name: 'actionEditCardKind',
      handler: function () {
        $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Змінити тип картки на "Студента"?'))
          .then(function (choice) {
            if (choice) {
              $App.connection.run({
                entity: 'hr_employeeNumber',
                method: 'setCardKind',
                employeeNumberID: me.instanceID,
                kind: 'STUD'
              }).then(() => {
                $App.dialogInfo('Статус картки успішно змінено!')
                me.close()
              })
            }
          })
      }
    })
  }
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
  if (me.startValue.factPosition) {
    me.down('[name=factPositionLabel]').setText(me.startValue.factPosition)
  }
  if (!AC.settings.get('hrOrderActualPositionName', appAC.globalOrganization())) {
    me.down('[name=factPositionLabel]').hide()
  }
  me.startValue['dateFrom'] = AC.dateService.shiftDate(AC.dateService.truncTimeToUtcNull(new Date(me.startValue['dateFrom'])))
  if (me.startValue['positionID.appointOrderClassName'] === 'hr_empOrder') {
    me.attr.dictAppointKindID.setReadOnly(true)
    me.attr.appointOrderNumber.setReadOnly(true)
    me.attr.appointOrderDate.setReadOnly(true)
  }
  if (me.startValue['positionID.dismissOrderClassName'] === 'hr_empOrder') {
    me.attr.reasonDismID.setReadOnly(true)
    me.attr.dismissOrderNumber.setReadOnly(true)
    me.attr.dismissOrderDate.setReadOnly(true)
  }
  if (me.startValue.positionFundSourceDt) {
    me.attr.positionFundSourceDt.setLocalStoreData(JSON.parse(me.startValue.positionFundSourceDt))
  }
  Object.keys(me.attr)
    .filter(key => me.attr[key].recordValue && !me.attr[key].setValueById)
    .forEach(key => me.attr[key].setValue(me.startValue[me.attr[key].recordValue]))
  return Promise.all(Object.keys(me.attr)
    .filter(key => me.attr[key].recordValue && me.attr[key].setValueById)
    .map(key => new Promise(resolve => me.attr[key].setValueById(me.startValue[me.attr[key].recordValue], false, resolve)))
  )
}

function onRecordLoaded (record, data) {
  const me = this
  setStartData(me, data).then(() => {
    const tree = me.down('[ubID=treeInfo]')
    setDictStWorkPlaceTypeWList(me, tree)
    setTreeItemVisible(tree, 'trf_position', AC.settings.get('hrTariffingEducational', appAC.globalOrganization()))
    setTreeItemVisible(tree, 'hr_employeeKpi', AC.settings.get('hrKPI', appAC.globalOrganization()))
    tree.updateNodes()
    if (!me.isNewInstance) {
      const tabNum = me.record.get('tabNum')
      const fullFIO = me.record.get('employeeID.fullFIO')
      const isUseStaffingTable = AC.settings.get('hrUseStaffingTable', appAC.globalOrganization())
      const positionName = (isUseStaffingTable ? me.startValue['positionID.positionIDName'] : me.startValue['positionID.dictPositionIDName']) || ''
      me.setTitle(`${UB.i18n('Таб. №')} ${tabNum}, ${fullFIO}, ${positionName}`)
      me.attr.employeeID.setReadOnly(true)
      me.down('[name=generateTabNumButton]').hide()
    }
    me.attr.departmentID.store.ubRequest.__mip_ondate = appAC.globalApplicationDate()
    delete me.attr.departmentID.store.ubRequest.__mip_recordhistory_all
    me.attr.positionID.store.ubRequest.__mip_ondate = appAC.globalApplicationDate()
    delete me.attr.positionID.store.ubRequest.__mip_recordhistory_all
    AC.viewUtils.setFilterValue(me.attr.departmentID, {
      state: ['ACTIVE', 'CHANGES'],
      orgID: me.record.get('orgID') || appAC.globalOrganization()
    })
    AC.viewUtils.setFilterValue(me.attr.positionID, Object.assign({
      state: ['ACTIVE', 'CHANGES'],
      orgID: me.record.get('orgID') || appAC.globalOrganization()
    }, me.attr.departmentID.getValue() ? { parentUnitID: me.attr.departmentID.getValue() } : {}))

    let workPlace = me.attr.workPlace.getValue()
    let workScheduleWhereList = [
      ['organizationID', '=', me.record.get('orgID') || appAC.globalOrganization(), 'orgID'],
      ['organizationID', 'isNull', null, 'orgIsNull']
    ]
    if (!workPlace || workPlace !== '5') {
      workScheduleWhereList.push(['isOnlyForPositions', '=', 0])
    }
    AC.viewUtils.setWhereListProperty(me.attr.workScheduleID,
      workScheduleWhereList,
      ['(([orgID]) OR ([orgIsNull]))'],
      ['clearWhereList']
    )

    if (me.startValue['orderEntityName'] && me.startValue['orderEntityName'] === 'trf_workPlace') {
      ['accrualSum', 'mtCount', 'dictEmpCategoryID', 'dictTarifCoeffID', 'dictPositionID', 'dictQualificationID', 'positionFundSourceDt'].forEach(fld => {
        me.attr[fld].setReadOnly(true)
      })
    }
  })
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
  if (me.attr.employeeID.labelEl) {
    me.attr.employeeID.labelEl.addCls('x-label-required')
  }
  if (me.isNewInstance) {
    me.startValue = {}
    me.setTitle(UB.i18n(`Створення особового рахунку`))
    me.attr.orgID.setValueById(appAC.globalOrganization())
    UB.Repository('cdn_country').attrs('ID', 'code').where('code', '=', appAC.getDefaultCountryCode()).limit(1).selectSingle().then(res => {
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
    if (me.sender) {
      let masterForm = me.sender.up('[customParams]')
      if (masterForm && masterForm.customParams.mode === 'NOSTAFF') {
        me.attr.workPlace.setValueById('4')
      }
    }
  }
  const isEmpWorkPlace = me.record.get('empWorkPlace') === '5'
  if (isEmpWorkPlace || (me.record.get('dateTo') && me.record.get('dateTo').getFullYear() === 9999)) {
    me.attr.reasonDismID.setReadOnly(true)
    me.attr.dismissOrderNumber.setReadOnly(true)
    me.attr.dismissOrderDate.setReadOnly(true)
  }
  me.attr.dateTo.setReadOnly(isEmpWorkPlace)
  me.attr.dictCategoryECBID.setAllowBlank(isEmpWorkPlace)
  UB.Repository('hr_organization')
    .attrs('mi_treePath')
    .where('mi_data_id', '=', me.isNewInstance ? appAC.globalOrganization() : me.record.get('orgID'))
    .where('state', '=', 'ACTIVE')
    .orderBy('mi_dateFrom', 'desc')
    .selectSingle()
    .then(orgData => {
      const treePath = orgData ? orgData.mi_treePath.split('/').filter(o => o) : []
      AC.viewUtils.setWhereListProperty(me.attr.parentEmpNumberID, [
        ['employeeID', '=', me.record.get('employeeID') || 0],
        ['ID', '!=', me.instanceID],
        ['dateTo', '<', AC.dateService.shiftDate(me.record.get('dateFrom') || AC.dateService.todayDate())],
        ['orgID.mi_treePath', 'startWith', `/${treePath.length ? treePath[0] : appAC.globalOrganization()}/%`],
        ['orgID.state', '=', 'ACTIVE'],
        ['orgID.mi_dateFrom', '<=', appAC.globalApplicationDate()],
        ['orgID.mi_dateTo', '>=', appAC.globalApplicationDate()]
      ], undefined, ['clearWhereList'])
    })
  AC.viewUtils.setWhereListProperty(me.attr.mainEmpNumberID, [
    ['employeeID', '=', me.record.get('employeeID') || 0],
    ['ID', '!=', me.instanceID],
    ['dateFrom', '>=', AC.dateService.shiftDate(me.record.get('dateFrom') || AC.dateService.todayDate())],
    ['dateTo', '<=', AC.dateService.shiftDate(me.record.get('dateTo') || AC.dateService.todayDate())],
    ['orgID', '=', me.isNewInstance ? appAC.globalOrganization() : me.record.get('orgID')]
  ], undefined, ['clearWhereList'])
  me.attr.employeeID.getStore().ubRequest.whereList.exist.value.whereList.orgID = {
    condition: 'equal',
    expression: '[organizationID]',
    value: appAC.globalOrganization()
  }

  if (me.attr.payElID.getFieldValue('methodID.code') === '2') {
    me.attr.accrualSum.setFieldLabel(UB.i18n('Тариф'))
  } else {
    me.attr.accrualSum.setFieldLabel(UB.i18n('Оклад'))
  }

  // Категорія персоналу визначається типом посади
  me.attr.dictStaffCatID[AC.settings.get('hrStaffCatByPosition', appAC.globalOrganization()) ? 'hide' : 'show']()
  // Використовувати штатний розпис
  if (AC.settings.get('hrUseStaffingTable', appAC.globalOrganization())) {
    me.attr.positionID.show()
    me.attr.dictPositionID.setReadOnly(!!me.attr.positionID.getValue())
  } else {
    me.attr.positionID.hide()
  }
  // Розподіл зарплати за КПК
  me.attr.dictProgClassID[AC.settings.get('hrProgClassAcc', appAC.globalOrganization()) ? 'show' : 'hide']()

  // Розподіл зарплати за джерелами фінансування АБО Розподіл зарплати за проєктами
  if (AC.settings.get('hrFundSourceAcc', appAC.globalOrganization()) || AC.settings.get('hrProjectAcc', appAC.globalOrganization()) || AC.settings.get('hrProgClassAcc', appAC.globalOrganization())) {
    me.down('[name=fundSourcePanel]').show()
    AC.gridUtils.setGridColumnVisible(me.attr.positionFundSourceDt, ['dictFundSourceID.description'], AC.settings.get('hrFundSourceAcc', appAC.globalOrganization()))
    AC.gridUtils.setGridColumnVisible(me.attr.positionFundSourceDt, ['dictProjectID.description'], AC.settings.get('hrProjectAcc', appAC.globalOrganization()))
    AC.gridUtils.setGridColumnVisible(me.attr.positionFundSourceDt, ['dictProgClassID.description'], AC.settings.get('hrProgClassAcc', appAC.globalOrganization()))
  } else {
    me.down('[name=fundSourcePanel]').hide()
  }
  if (AC.settings.get('hrOrderAllowSelectDictPosition', appAC.globalOrganization())) {
    me.attr.posNameAddition.show()
  } else {
    me.attr.posNameAddition.hide()
  }

  const numbersGrid = me.down('[name=employeeNumberGrid]')
  if (numbersGrid) {
    if (me.record.get('parentEmpNumberID')) {
      Object.assign(numbersGrid.store.ubRequest.whereList, {
        parentID: {
          expression: '[ID]',
          condition: 'equal',
          value: me.record.get('parentEmpNumberID')
        }
      })
      numbersGrid.store.ubRequest.logicalPredicates = ['([orgID] OR [parentID])']
    } else {
      delete numbersGrid.store.ubRequest.whereList.parentID
      delete numbersGrid.store.ubRequest.logicalPredicates
    }
    numbersGrid.getStore().load()
  }
  me.attr.dictCostTypeID[COA.dims.ac_dictCostType ? 'show' : 'hide']()
  me.attr.limitedAccess[AC.entityUtils.verifyRightsMethod('hr_employeeNumber', 'employeeLimitedAccess') ? 'show' : 'hide']()
  if (!me.currentPeriod) {
    appHR.getCurrentPeriod(appAC.globalOrganization()).then(response => {
      me.currentPeriod = response
      AC.viewUtils.setFilterValue(me.attr.payElID, {
        dateFrom: { value: response.dateTo, condition: '<=' },
        dateTo: { value: response.dateFrom, condition: '>=' }
      })
    })
  }

  appHR.getPayOutList(me.record.get('orgID') || appAC.globalOrganization()).then(payOutList => {
    AC.viewUtils.setFilterValue(me.attr.payOutID, { ID: payOutList })
  })
}

function onControlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'employeeID':
      if (!me.attr.employeeID.skipChange) {
        me.attr.empTaxCodeType.setValueById(me.attr.employeeID.getFieldValue('empTaxCodeType'))
        me.attr.taxCode.skipChange = true
        me.attr.taxCode.setValue(me.attr.employeeID.getFieldValue('taxCode'))
        me.attr.sexType.setValueById(me.attr.employeeID.getFieldValue('sexType'))
        me.attr.birthDate.setValue(me.attr.employeeID.getFieldValue('birthDate'))
        me.attr.citizenshipID.setValue(me.attr.employeeID.getFieldValue('citizenshipID'))
        AC.viewUtils.setFilterValue(me.attr.parentEmpNumberID, {
          employeeID: value || 0,
          ID: { value: me.instanceID, condition: '!=' },
          dateTo: { value: AC.dateService.shiftDate(me.record.get('dateFrom') || AC.dateService.todayDate()), condition: '<' }
        })
      }
      me.attr.employeeID.skipChange = false
      break
  }
}

function addBaseActions () {
  let me = this
  me.callParent(arguments)
  let printAction = me.actions.printAction
  if (!printAction) {
    const menu = []

    let refList = HR.refSettings.getRefList(appAC.globalOrganization())
    let dictUniversalRef = refList.addRefList
    let dictRef = refList.refList
    let empRefSettings = HR.refSettings.getSettings(appAC.globalOrganization())

    const settingsData = empRefSettings.settingsData
    const printCofig = {}

    _.forEach(settingsData, (settingsValue, refCode) => {
      if (settingsValue.empNumValue) {
        let ref = dictRef.find(ref => ref.code === refCode) || dictUniversalRef.find(ref => ref.code === refCode)
        if (ref) printCofig[refCode] = { name: ref.name, refParams: ref.refParams || {} }
      }
    })

    _.forEach(printCofig, (value, refCode) => {
      menu.push({
        text: value.name,
        code: refCode,
        type: value.refParams.type || null,
        reportCode: value.refParams.reportCode || null,
        handler: function (btn) {
          if ((me.employeeNumberID || me.instanceID) && dictUniversalRef.map(o => o.code).includes(btn.code)) {
            appHR.getPrintUniRef(me, refCode, me.record.data.employeeID, me.instanceID)
          } else {
            appHR.getPrintDocument(me, refCode, value, me.record.data.employeeID, me.instanceID)
          }
        }
      })
    })

    /* _.forEach(printCofig, (value, name) => {
      menu.push({
        text: value.name,
        code: name,
        type: value.type,
        reportCode: value.reportCode,
        handler: function () {
          getPrintDocument(me, name, value.type, value.reportCode)
        }
      })
    })

    _.forEach(printCofig2, (value, name) => {
      menu.push({
        text: value.name,
        code: name,
        type: value.type,
        reportCode: value.reportCode,
        handler: function () {
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_accrual-report',
            tabId: name + Date.now(),
            target: $App.getViewport().centralPanel,
            cmpInitConfig: {
              defaultEmployeeNumberID: me.record.get('ID')
            },
            cmdData: {
              reportCode: value.reportCode,
              reportOptions: { allowExportToExcel: value.allowExportToExcel }
            }
          })
        }
      })
    }) */

    printAction = new Ext.Action({
      iconCls: 'fas fa-print',
      cls: 'blue-action',
      actionId: 'printAction',
      text: UB.i18n('Друкувати'),
      eventId: 'printAction',
      menu: menu,
      hidden: false
    })
    me.actions.printAction = printAction
  }
  let rlAction = me.actions.rlAction
  if (!rlAction) {
    rlAction = new Ext.Action({
      actionId: 'rlAction',
      eventId: 'rlAction',
      iconCls: 'el-icon-tickets',
      cls: 'blue-action',
      tooltip: UB.i18n('Розрахунковий лист'),
      text: UB.i18n('Розрахунковий лист'),
      handler: function () {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_rl',
          entity: 'hr_rl',
          cmpInitConfig: {
            defaultValues: {
              employeeNumberID: me.instanceID
            }
          },
          tabId: `hr_rl${me.instanceID}`,
          target: $App.getViewport().centralPanel
        })
      },
      scope: me
    })
    me.actions.rlAction = rlAction
  }
  let timeSheetAction = me.actions.timeSheetAction
  if (!timeSheetAction) {
    timeSheetAction = new Ext.Action({
      actionId: 'timeSheetAction',
      eventId: 'timeSheetAction',
      iconCls: 'far fa-calendar-alt',
      cls: 'fill-action',
      tooltip: UB.i18n('Табель'),
      text: UB.i18n('Табель'),
      handler: function () {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'tim_timeSheet',
          entity: 'tim_timeSheet',
          cmpInitConfig: {
            defaultValues: {
              employeeNumberID: me.instanceID
            }
          },
          tabId: UB.i18n(`tim_timeSheet{0}`, me.instanceID),
          target: $App.getViewport().centralPanel
        })
      },
      scope: me
    })
    me.actions.timeSheetAction = timeSheetAction
  }
}

function checkDismFieldState (field) {
  const me = this
  const isReadOnly = me.record.get('empWorkPlace') === '5' || !field.isValid() || !field.getValue()
  me.attr.reasonDismID.setReadOnly(isReadOnly)
  me.attr.dismissOrderNumber.setReadOnly(isReadOnly)
  me.attr.dismissOrderDate.setReadOnly(isReadOnly)
  if (isReadOnly) {
    me.attr.reasonDismID.setValue()
    me.attr.dismissOrderNumber.setValue()
    me.attr.dismissOrderDate.setValue()
  }
}

function onBeforeSave () {
  const me = this
  const errorMessages = []
  const checkParams = {}
  return new Promise(resolve => {
    if (me.isNewInstance) {
      if (!me.attr.employeeID.getValue() && (!me.attr.employeeID.rawValue || me.attr.employeeID.rawValue.replace(/  +/g, ' ').trim().split(' ').length < 2)) {
        errorMessages.push(UB.i18n('Невірно заповнено Прізвище І. Б.'))
      }
    }
    if (me.attr.taxCode.getValue() !== me.record.get('employeeID.taxCode')) {
      checkParams.taxCode = me.attr.taxCode.getValue()
    }
    if (errorMessages.length) {
      $App.dialogInfo(errorMessages.join('<br>'))
      resolve(false)
    } else {
      const mtCountTotal = me.attr.positionFundSourceDt.getStore().data.items.reduce((sum, item) => {
        return sum + item.get('mtCount')
      }, 0)
      if (me.attr.mtCount.getValue() && me.attr.positionFundSourceDt.getStore().data.items.length && Math.abs(mtCountTotal - me.attr.mtCount.getValue()) > 0.005) {
        $App.dialogError(UB.i18n('Загальна кількість ставок не дорівнює кількості ставок по джерелам фінансування.'))
        resolve(false)
      }
      me.getChangeData(me)

      if (me.changeDataForSave.changeData.length) {
        me.showInfoBeforeSave(me).then(showResult => {
          Object.assign(me.changeDataForSave.data, showResult)
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_employeeNumberSave',
            isClosable: false,
            isModal: true,
            cmpInitConfig: {
              orgID: me.record.get('organizationID'),
              entryDate: showResult.newAppointOrder ? me.changeDataForSave.data.position.dateFrom || me.changeDataForSave.data.dism.dateTo || me.changeDataForSave.data.rank.rankDateFrom || null : (me.startValue.dateFrom || null),
              orderNumber: showResult.newAppointOrder ? (me.changeDataForSave.data.position.appointOrderNumber || me.changeDataForSave.data.dism.dismissOrderNumber || me.changeDataForSave.data.rank.rankOrderNumber || null) : me.startValue['positionID.appointOrderNumber'],
              orderDate: showResult.newAppointOrder ? (me.changeDataForSave.data.position.appointOrderDate || me.changeDataForSave.data.dism.dismissOrderDate || me.changeDataForSave.data.rank.rankOrderDate || null) : me.startValue['positionID.appointOrderDate'],
              changeData: me.changeDataForSave.changeData,
              newOrder: showResult.newAppointOrder,
              onSaveData: data => {
                if (!data.result) {
                  resolve(data.result)
                } else {
                  if (me.isNewInstance) {
                    me.record.set('dateFrom', data.entryDate)
                  }
                  me.changeDataForSave.data.entryDate = data.entryDate
                  me.changeDataForSave.data.orderDate = data.orderDate
                  me.changeDataForSave.data.orderNumber = data.orderNumber
                  me.changeDataForSave.data.dateToPosition = data.dateToPosition
                  if (Object.keys(checkParams).length) {
                    checkParams.instanceID = me.instanceID
                    checkParams.employeeID = me.attr.employeeID.getValue()
                    $App.connection.run({
                      entity: 'hr_employeeNumber',
                      method: 'checkParams',
                      params: checkParams
                    }).then(response => {
                      const messages = JSON.parse(response.errorMessages)
                      if (messages.length) {
                        $App.dialogInfo(messages.join('<br>'))
                        resolve(false)
                      } else {
                        resolve(true)
                      }
                    })
                  } else {
                    resolve(true)
                  }
                }
              }
            }
          })
        })
      } else {
        resolve(true)
      }
    }
  })
}
function showInfoBeforeSave (me) {
  return new Promise(resolve => {
    checkEmployeeNumberInputs(me)
    const result = {
      newAppointOrder: true,
      newRankOrder: true
    }
    if (me.isNewInstance) {
      resolve(result)
    } else {
      if (Object.keys((me.changeDataForSave.data.position).length ||
          Object.keys(me.changeDataForSave.data.changeData).length) && me.startValue['positionID.orderID']) {
        $App.dialogYesNo('Попередження', UB.i18n('Створити нове призначення?'))
          .then(choice => {
            result.newAppointOrder = !!choice
            if (Object.keys(me.changeDataForSave.data.rank).length && me.startValue['rankID.dictRankID']) {
              $App.dialogYesNo('Попередження', UB.i18n('Створити нове призначення рангу?'))
                .then(choice => {
                  result.newRankOrder = !!choice
                  resolve(result)
                })
            } else {
              resolve(result)
            }
          })
      } else {
        if (Object.keys(me.changeDataForSave.data.rank).length && me.startValue['rankID.dictRankID']) {
          $App.dialogYesNo('Попередження', UB.i18n('Створити нове призначення рангу?'))
            .then(choice => {
              result.newRankOrder = !!choice
              resolve(result)
            })
        } else {
          resolve(result)
        }
      }
    }
  })
}
function checkEmployeeNumberInputs (me) {
  const dialogInfoArr = [UB.i18n('підставу прийому на роботу'), UB.i18n('дату прийому на роботу')]
  const checkingValues = []
  checkingValues.push(me.attr.dictAppointKindID.getValue())
  const dateOfDismissal = me.attr.dateTo.getValue()
  const reasonDismID = me.attr.reasonDismID.getValue()
  checkingValues.push(me.attr.dateFrom.getValue())
  checkingValues.forEach((elem, index) => {
    if (!elem) {
      $App.dialogInfo(UB.i18n(`Не визначено {0}. Використовується у звіті ЕСВ`, dialogInfoArr[index]))
    }
  })
  if (dateOfDismissal && new Date(dateOfDismissal) < new Date('9999.12.31')) {
    if (!reasonDismID) {
      $App.dialogInfo(UB.i18n(`Не визначено підставу звільнення. Використовується у звіті ЕСВ`))
    }
  }
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
          oldValue: me.startValue[me.attr[attrName].recordValue] ? (UB.core.UBEnumManager.getById(me.attr[attrName].enumGroupFilter, me.startValue[me.attr[attrName].recordValue]) ? UB.core.UBEnumManager.getById(me.attr[attrName].enumGroupFilter, me.startValue[me.attr[attrName].recordValue]).get(paramName) : '') : '',
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
  function checkGridPositionFundSource (grid) {
    const startValues = JSON.parse(me.startValue.positionFundSourceDt || '[]')
    let allRecord = grid.getStore().snapshot || grid.getStore().data
    const hrFundSourceAcc = AC.settings.get('hrFundSourceAcc', appAC.globalOrganization())
    const hrProjectAcc = AC.settings.get('hrProjectAcc', appAC.globalOrganization())
    const hrProgClassAcc = AC.settings.get('hrProgClassAcc', appAC.globalOrganization())
    allRecord.items.forEach(function (item) {
      let rowData = item.getData()
      if (!rowData.ID) {
        if (hrFundSourceAcc) {
          changeData.push({
            attrName: UB.i18n('Джерело фінансування'),
            oldValue: '',
            newValue: `${rowData['dictFundSourceID.description']} ${rowData.mtCount}`
          })
        }
        if (hrProgClassAcc) {
          changeData.push({
            attrName: UB.i18n('КПК'),
            oldValue: '',
            newValue: `${rowData['dictProgClassID.description']} ${rowData.mtCount}`
          })
        }
        if (hrProjectAcc) {
          changeData.push({
            attrName: UB.i18n('Проєкт'),
            oldValue: '',
            newValue: `${rowData['dictProjectID.description']} ${rowData.mtCount}`
          })
        }
      } else if (item.dirty) {
        const startValue = startValues.find(o => o.ID === rowData.ID)
        if (hrFundSourceAcc) {
          changeData.push({
            attrName: UB.i18n('Джерело фінансування'),
            oldValue: `${startValue['dictFundSourceID.description'] || ''} ${startValue.mtCount || ''}`,
            newValue: `${rowData['dictFundSourceID.description'] || startValue['dictFundSourceID.description'] || ''} ${rowData.mtCount || startValue.mtCount || ''}`
          })
        }
        if (hrProgClassAcc) {
          changeData.push({
            attrName: UB.i18n('КПК'),
            oldValue: `${startValue['dictProgClassID.description'] || ''} ${startValue.mtCount || ''}`,
            newValue: `${rowData['dictProgClassID.description'] || startValue['dictProgClassID.description'] || ''} ${rowData.mtCount || startValue.mtCount || ''}`
          })
        }
        if (hrProjectAcc) {
          changeData.push({
            attrName: UB.i18n('Проєкт'),
            oldValue: `${startValue['dictProjectID.description'] || ''} ${startValue.mtCount || ''}`,
            newValue: `${rowData['dictProjectID.description'] || startValue['dictProjectID.description'] || ''} ${rowData.mtCount || startValue.mtCount || ''}`
          })
        }
      }
    })
    grid.getStore().getRemovedRecords().forEach(function (item) {
      if (item.ID) {
        const startValue = startValues.find(o => o.ID === item.ID)
        if (hrFundSourceAcc) {
          changeData.push({
            attrName: UB.i18n('Джерело фінансування'),
            oldValue: `${startValue['dictFundSourceID.description'] || ''} ${startValue.mtCount || ''}`,
            newValue: ``
          })
        }
        if (hrProgClassAcc) {
          changeData.push({
            attrName: UB.i18n('КПК'),
            oldValue: `${startValue['dictProgClassID.description'] || ''} ${startValue.mtCount || ''}`,
            newValue: ``
          })
        }
        if (hrProjectAcc) {
          changeData.push({
            attrName: UB.i18n('Проєкт'),
            oldValue: `${startValue['dictProjectID.description'] || ''} ${startValue.mtCount || ''}`,
            newValue: ``
          })
        }
      }
    })
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
  checkComboBox('dictAppointKindID', data.position)
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
  checkBase('posNameAddition', data.position)
  checkDate('raiseSalary', data.position)
  checkCheckBox('isIndex', data.position)
  checkCheckBox('isFactWorkSchedule', data.position)
  checkComboBox('dictEmpCategoryID', data.position)
  checkComboBox('dictQualificationID', data.position)
  checkComboBox('dictCategoryECBID', data.position)
  checkComboBox('accountID', data.position)
  checkComboBox('dictCostTypeID', data.position)
  checkDate('dateTo', data.dism)
  checkComboBox('reasonDismID', data.dism)
  checkBase('dismissOrderNumber', data.dism)
  checkDate('dismissOrderDate', data.dism)
  checkComboBox('dictRankID', data.rank)
  checkDate('rankDateFrom', data.rank)
  checkBase('rankOrderNumber', data.rank)
  checkDate('rankOrderDate', data.rank)

  data.changeData = !!changeData.length
  const positionFundSourceDt = me.attr.positionFundSourceDt.getAttributeData()
  data.position.positionFundSourceDt = JSON.stringify(positionFundSourceDt)
  data.position.positionFundSource = JSON.stringify(me.attr.positionFundSourceDt.getData())
  checkGridPositionFundSource(me.attr.positionFundSourceDt)
  me.changeDataForSave = { data, changeData }
}

function onPrepareDataBeforeSave (me, params) {
  params.formData = me.changeDataForSave.data
}

function generateTabNum (me) {
  $App.connection.run({
    entity: 'hr_employeeNumber',
    method: 'getNextTabNum',
    organizationID: me.record.get('orgID') || appAC.globalOrganization(),
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

function treepanelSelect (tree, record) {
  const me = tree.view.up('form')
  tree.view.up('[ubId=menuPanel]').activateTab(record.raw.nodeId, me)
  if (tree.current) {
    tree.current.set('cls', '')
  }
  tree.current = record
  tree.current.set('cls', 'biz-person-tree-selected-text')
}

function checkNodeSelection (tree, me) {
  const nodeId = me.customParams && me.customParams.nodeId
  if (!nodeId) {
    return
  }
  tree.getSelectionModel().select(tree.findNodeId(nodeId))
}
