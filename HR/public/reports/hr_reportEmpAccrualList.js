/* global Ext UB AC appAC HR _ $App */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    const onDate4Sql = AC.dateService.shiftDate(reportParams.onDate)
    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(appAC.globalOrganization())
    // reportParams.includeChildOrgs = reportParams.departmentID ? false : reportParams.includeChildOrgs
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID) === true
    const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()

    const result = {
      showAddDescrPerson: showAddDescrPerson,
      useActualPositionName: useActualPositionName,
      colSpan: 7 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0),
      colSpan2: 3 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0),
      tableWidth: 970 + (showAddDescrPerson ? 200 : 0) + (useActualPositionName ? 250 : 0),
      data: [],
      fundName: '',
      accName: '',
      onDateStr: AC.dateService.formatDate(reportParams.onDate),
      roundTo: settingsOrg.roundTo || 'decimal2',
      roundToQuantity: settingsOrg.roundToQuantity || 'numberGroup',
      payElName: reportParams.payElName || '',
      payElType: '',
      staffCatName: (reportParams.dictStaffCatName || '') + (reportParams.dictStaffSubCatName && reportParams.dictStaffCatName ? ', ' : '') + (reportParams.dictStaffSubCatName || '')
    }

    const orgs = await HR.orgStructReportUtils.getOrganizationData(onDate4Sql, reportParams.organizationID, reportParams.includeChildOrgs)
    const childOrgIDs = orgs.map(itm => itm.mi_data_id)
    const orgNames = _.find(orgs, { 'mi_data_id': reportParams.organizationID })
    result.organizationName = orgNames ? HR.nameCase.cap(orgNames.name || '') : ''
    result.departmentName = await HR.reportUtils.getNameDepartment(onDate4Sql, reportParams.organizationID, reportParams.departmentID)

    const departments = await HR.orgStructReportUtils.getDepartmentIDs(onDate4Sql, childOrgIDs, reportParams.departmentID, reportParams.includeChildDepts)
    const orgStruct = await HR.orgStructReportUtils.getStaffUnitData(onDate4Sql, childOrgIDs, reportParams.departmentID, reportParams.includeChildDepts, departments)
    if (!orgStruct) {
      return result
    }

    const posData = await UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictStaffCatID', 'dictPositionID',
        'dictPositionID.fullName', 'dictPositionID.name', 'quantity', 'accrualSum', 'dictFundSourceID'])
      .where('orgID', 'in', childOrgIDs)
      .where('liquidate', '=', 0)
      .where('state', '=', 'ACTIVE')
      .whereIf(departments.length, 'parentUnitID', 'in', departments)
      .whereIf(reportParams.dictStaffCatID, 'dictStaffCatID', '=', reportParams.dictStaffCatID)
      .whereIf(reportParams.dictStaffSubCatID, 'dictStaffSubCatID', '=', reportParams.dictStaffSubCatID)
      .misc({ __mip_ondate: onDate4Sql })
      .selectAsObject({
        'dictTarifCoeffID.code': 'tarifCode'
      })

    function getEmpPosPromise () {
      return UB.Repository('hr_employeePositionSR')
        .attrs(['ID', 'employeeNumberID', 'employeeID', 'employeeID.fullFIO', 'positionID', 'mtCount', 'workPlace', 'factPosition',
          'dictTarifCoeffID', 'dictTarifCoeffID.code', 'workerType', 'dictFundSourceID', 'employeeNumberID.addDescrPerson'])
        .attrsIf(!notShowSalary, 'accrualSum')
        .where('isActive', '=', true)
        .where('organizationID', 'in', childOrgIDs)
        .whereIf(departments.length, 'departmentID', 'in', departments)
        .where('dateFrom', '<=', onDate4Sql)
        .where('dateTo', '>=', onDate4Sql)
        .where('employeeNumberID.dateFrom', '<=', onDate4Sql)
        .where('employeeNumberID.dateTo', '>=', onDate4Sql)
        .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
        .where('positionID.mi_dateFrom', '<=', onDate4Sql)
        .where('positionID.mi_dateTo', '>=', onDate4Sql)
        .where('positionID.state', '=', 'ACTIVE')
        .where('positionID.mi_deleteDate', '>=', '#maxdate')
        .whereIf(reportParams.dictStaffCatID, 'positionID.dictStaffCatID', '=', reportParams.dictStaffCatID)
        .whereIf(reportParams.dictStaffSubCatID, 'positionID.dictStaffSubCatID', '=', reportParams.dictStaffSubCatID)
    }

    const empPosData = await getEmpPosPromise().selectAsObject()

    if (reportParams.dictFundSourceID) {
      const fundSource = await UB.Repository('ac_dictFundSource')
        .attrs(['dictFundTypeID.name'].concat($App.domainInfo.entities.ac_dictFundSource.dictProgClassID ? ['dictProgClassID.description'] : []))
        .where('organizationID', '=', reportParams.organizationID)
        .where('fundSourceID', '=', reportParams.dictFundSourceID)
        .selectSingle()
      result.fundName = HR.nameCase.cap(fundSource && fundSource['dictFundTypeID.name'] ? fundSource['dictFundTypeID.name'] + UB.i18n(' фонд') : '')
      result.progClassName = HR.nameCase.cap((fundSource && fundSource['dictProgClassID.description']) || '')
    }

    const payEl = await UB.Repository('hr_payEl')
      .attrs('ID', 'calcAvgType', 'methodID.valuation', 'methodID.code', 'dictExperienceID')
      .selectById(reportParams.payElID) || {}

    result.accName = payEl && payEl.calcAvgType === 'AVG' ? UB.i18n('Середніх місячних заробітків') : result.accName
    result.accName = payEl && payEl.calcAvgType === 'PLAN' ? UB.i18n('Окладів') : result.accName
    result.accName = payEl && payEl['methodID.valuation'] === 'RATE' ? UB.i18n('Відсотоків') : result.accName
    result.accName = result.accName || UB.i18n('Відсотоків')
    payEl.payElType = (payEl && payEl.calcAvgType) || (payEl && payEl['methodID.valuation']) || ''
    payEl.methodCode = (payEl && payEl['methodID.code']) || ''

    const employeeAccrual = await UB.Repository('hr_employeeAccrual')
      .attrs(['ID', 'employeeNumberID', 'accrualSum', 'accrualRate'])
      .where('payElID', '=', reportParams.payElID)
      .where('dateFrom', '<=', onDate4Sql)
      .where('dateTo', '>=', onDate4Sql)
      .whereIf(!AC.entityUtils.verifyRightsMethod('hr_employeeNumber', 'employeeLimitedAccess'), 'employeeNumberID.limitedAccess', '=', 0)
      .where('mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()

    const payElExperience = payEl && payEl.methodCode === '6' ? await UB.Repository('hr_payElExperience')
      .attrs(['payElID', 'years', 'months', 'rate'])
      .where('payElID', '=', reportParams.payElID)
      .orderBy('years', 'desc')
      .orderBy('months', 'desc')
      .selectAsObject() : []

    const payPerm = await HR.accrualService.getOrgPayPerm(reportParams.organizationID, reportParams.payElID, reportParams.dictFundSourceID)

    const repCode = '07'
    const payelData = await HR.accrualService.accrualSumGetPayElData(onDate4Sql, repCode)
    const payelExpData = await HR.accrualService.getPayelExpData(onDate4Sql, repCode)

    const repParamPref = 'tariffing'
    const accrualData = HR.accrualService.accrualSumInitAccrualList(repParamPref)

    await HR.accrualService.accrualSumFill(accrualData, reportParams.organizationID, onDate4Sql, { repCode }, childOrgIDs)

    const empRanks = await HR.accrualService.accrualSumGetEmpRanks({ onDate: onDate4Sql, empPosPromise: getEmpPosPromise() })
    const dictSalaryRanks = await HR.accrualService.accrualSumGetDictSalaryRanks(onDate4Sql)
    const specPayMethods = HR.accrualService.accrualSumGetSpecPayMethods({ empRanks, dictSalaryRanks })
    const empExpData = await UB.Repository('hr_employeeExperience')
      .attrs(['employeeID', 'dictExperienceID', 'calcDate'])
      .exists(getEmpPosPromise().correlation('employeeID', 'employeeID'))
      .selectAsObject()

    result.roundTo = 'decimal2' // ???

    const tree = me.generateDataForReport(orgs, reportParams.departmentID || reportParams.organizationID, orgStruct, reportParams.dictFundSourceID || 0, posData, empPosData,
      employeeAccrual, payPerm, payElExperience,
      accrualData, payelData, specPayMethods, empExpData, payelExpData,
      payEl, onDate4Sql, result.roundTo, result.roundToQuantity, result.showTotals ? 2 : 1,
      result.colSpan, result.colSpan2, showAddDescrPerson, useActualPositionName)

    result.data = tree.data || []
    result.quantity = tree.quantity
    result.fundSum = tree.fundSum

    return result
  },
  onParamPanelConfig: function () {
    const accMainReportsSubOrg = AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox' },
          defaults: { labelWidth: 180 },
          items: [
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getOrgCombo({
                  labelWidth: 180,
                  width: 700,
                  flex: 1,
                  readOnly: !accMainReportsSubOrg,
                  ubRequest: {
                    entity: 'hr_organization',
                    fieldList: ['mi_data_id', 'description', 'mi_treePath'],
                    whereList: {
                      state: {
                        expression: '[state]',
                        condition: '=',
                        value: 'ACTIVE'
                      },
                      path: {
                        expression: accMainReportsSubOrg ? '[mi_treePath]' : '[mi_data_id]',
                        condition: accMainReportsSubOrg ? 'like' : '=',
                        value: accMainReportsSubOrg ? `/${appAC.globalOrganization()}/` : appAC.globalOrganization()
                      }
                    },
                    orderList: { orderBy: { expression: 'description' } },
                    __mip_ondate: appAC.globalApplicationDate()
                  },
                  listeners: {
                    change: function (ctrl) {
                      const form = ctrl.up('form')
                      HR.controlService.onChangeIncludeChildOrgs(form)
                    }
                  }
                }),
                HR.controlService.getIncludeChildOrgs(accMainReportsSubOrg)
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getDepCombo({
                  labelWidth: 180,
                  width: 700,
                  displayField: 'description',
                  flex: 1,
                  listeners: {
                    change: function (ctrl, value) {
                      const form = ctrl.up('form')
                      form.down('[name=includeChildDepts]').setReadOnly(!value)
                      if (!value) {
                        form.down('[name=includeChildDepts]').setValue()
                      }
                    }
                  }
                }),
                HR.controlService.getIncludeChildDepts()
              ]
            },
            {
              xtype: 'datefield',
              name: 'onDate',
              fieldLabel: UB.i18n('Станом на'),
              value: appAC.globalApplicationDate(),
              allowBlank: false,
              labelWidth: 180,
              width: 320,
              listeners: {
                change: function (ctrl) {
                  const form = ctrl.up('form')
                  const respPositionID = form.down('[name=respPositionID]')
                  const respEmpID = form.down('[name=respEmpID]')
                  const onDate = ctrl.getValue()
                  const onDateIsValid = AC.dateService.isValid(onDate)
                  if (onDateIsValid) {
                    AC.viewUtils.setWhereListProperty(respPositionID, [['mi_dateFrom', '<=', onDate], ['mi_dateTo', '>=', onDate]],
                      null, ['clearStore', 'clearValue'])
                    AC.viewUtils.setWhereListProperty(respEmpID, [['dateFrom', '<=', onDate], ['dateTo', '>=', onDate]],
                      null, ['clearStore', 'clearValue'])
                  }
                  respPositionID.setDisabled(!onDateIsValid)
                  respEmpID.setDisabled(!onDateIsValid)
                }
              }
            },
            {
              xtype: 'ubcombobox',
              name: 'payElID',
              fieldLabel: UB.i18n('Вид оплати'),
              allowBlank: false,
              labelWidth: 180,
              width: 700,
              hideEntityItemInContext: true,
              gridFieldList: ['ID', 'description'],
              valueField: 'ID',
              displayField: 'description',
              ubRequest: {
                entity: 'hr_payEl',
                method: 'select',
                fieldList: ['ID', 'description'],
                orderList: { orderBy: { expression: 'description' } }
              }
            },
            {
              xtype: 'ubcombobox',
              name: 'dictFundSourceID',
              fieldLabel: UB.i18n('Джерело фінансування'),
              labelWidth: 180,
              width: 700,
              hideEntityItemInContext: true,
              gridFieldList: ['ID', 'name', 'description'],
              valueField: 'ID',
              displayField: 'name',
              ubRequest: {
                entity: 'ac_fundSource',
                method: 'selectByOrg',
                fieldList: ['ID', 'name'],
                orderList: { orderBy: { expression: 'name' } }
              },
              listeners: {
                afterrender: function (ctrl) {
                  ctrl.store.ubRequest.orgID = appAC.globalOrganization()
                }
              }
            },
            {
              xtype: 'ubcombobox',
              name: 'dictStaffCatID',
              fieldLabel: UB.i18n('Категорія персоналу'),
              labelWidth: 180,
              width: 700,
              hideEntityItemInContext: true,
              gridFieldList: ['ID', 'description'],
              valueField: 'ID',
              displayField: 'description',
              ubRequest: {
                entity: 'hr_dictStaffCat',
                method: 'select',
                fieldList: ['ID', 'description', 'name'],
                orderList: { orderBy: { expression: 'description' } }
              },
              listeners: {
                change: function (ctrl) {
                  const form = ctrl.up('form')
                  const dictStaffSubCatID = form.down('[name=dictStaffSubCatID]')
                  const id = ctrl.getValue()
                  if (id) {
                    const whereList = [
                      ['dictStaffCatID', '=', id]
                    ]
                    AC.viewUtils.setWhereListProperty(dictStaffSubCatID, whereList, null, ['clearStore', 'clearWhereList', 'clearValue'])
                  } else { AC.viewUtils.deleteWhereListProperty(dictStaffSubCatID, 'dictStaffCatID', true) }
                }
              }
            },
            {
              xtype: 'ubcombobox',
              name: 'dictStaffSubCatID',
              fieldLabel: UB.i18n('Підкатегорія персоналу'),
              labelWidth: 180,
              width: 700,
              hideEntityItemInContext: true,
              gridFieldList: ['ID', 'description'],
              valueField: 'ID',
              displayField: 'description',
              ubRequest: {
                entity: 'hr_dictStaffSubCat',
                method: 'select',
                fieldList: ['ID', 'description', 'name'],
                orderList: { orderBy: { expression: 'description' } }
              }
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          organizationID: frm.findField('organizationID').getValue(),
          includeChildOrgs: frm.findField('includeChildOrgs').getValue(),
          departmentID: frm.findField('departmentID').getValue(),
          includeChildDepts: frm.findField('includeChildDepts').getValue(),
          payElID: frm.findField('payElID').getValue(),
          payElName: frm.findField('payElID').getRawValue(),
          dictFundSourceID: frm.findField('dictFundSourceID').getValue(),
          dictStaffSubCatID: frm.findField('dictStaffSubCatID').getValue(),
          dictStaffSubCatName: frm.findField('dictStaffSubCatID').getFieldValue('name') || frm.findField('dictStaffSubCatID').getRawValue(), // frm.findField('dictStaffSubCatID').getRawValue(),
          dictStaffCatID: frm.findField('dictStaffCatID').getValue(),
          dictStaffCatName: frm.findField('dictStaffCatID').getFieldValue('name') || frm.findField('dictStaffCatID').getRawValue(),
          onDate: frm.findField('onDate').getValue()
        }
      }
    })
    return paramForm
  },
  generateDataForReport: function (orgs, itemID, orgStruct, dictFundSourceID, positionData, empData, employeeAccrual, payPerm, payElExperience,
    accrualData, payelData, specPayMethods, empExpData, payelExpData,
    payEl, onDate, roundTo, roundToQuantity, showLevelTotals, colSpan, colSpan2, showAddDescrPerson, useActualPositionName) {
    if (!orgStruct || !orgStruct.length) return {}

    function getData (indexNpp, orgID, parentID, level = 1) {
      const result = {
        data: [],
        roundTo: roundTo,
        roundToQuantity: roundToQuantity,
        mtCount: 0,
        accrualSum: 0,
        indexNpp: indexNpp
      }
      const curStruct = orgStruct.filter(el => el.parentUnitID === parentID && el.orgID === orgID)
      const str = level === 1 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)
      const styleBegin = level === 1 ? '<font color="blue">' : level === 2 ? '<u>' : ''
      const styleEnd = level === 1 ? '</font>' : level === 2 ? '</u>' : ''

      curStruct.forEach(orgItem => {
        if (orgItem.mi_unityEntity !== 'hr_department') {
          const posItem = positionData ? _.find(positionData, { mi_data_id: orgItem.mi_data_id }) : undefined
          if (posItem) {
            const empPos = empData.filter(emp => emp.positionID === posItem.mi_data_id /* && emp.dateFrom <= onDate && emp.dateTo >= onDate */)
            const objs = []
            for (let i = 0; i < empPos.length; i++) {
              const empPosItem = empPos[i]
              const byFundSourceID = dictFundSourceID === 0 ? true : (empPosItem.dictFundSourceID || posItem.dictFundSourceID || 0) === dictFundSourceID
              if (byFundSourceID) {
                let accrualItem = _.find(employeeAccrual, { employeeNumberID: empPosItem.employeeNumberID })
                if (!accrualItem && payPerm && payPerm.length) {
                  const payPermItem = payPerm.filter(item => item.dateFrom <= onDate && item.dateTo >= onDate &&
                      (!item.dictFundSourceID || item.dictFundSourceID === (empPosItem.dictFundSourceID || posItem.dictFundSourceID || 0)) &&
                      (!item.category || !item.category.length || (item.category.includes(posItem.dictStaffCatID) && !item.excludeStaff) || (!item.category.includes(posItem.dictStaffCatID) && item.excludeStaff)) &&
                      (!item.empCategory || !item.empCategory.length || (item.empCategory.includes(posItem.dictEmpCategoryID) && !item.excludeEmpCategory) || (!item.empCategory.includes(posItem.dictEmpCategoryID) && item.excludeEmpCategory)) &&
                      (!item.workPlace || !item.workPlace.length || (item.workPlace.includes(empPosItem.workPlace) && !item.excludeWorkPlace) || (!item.workPlace.includes(empPosItem.workPlace) && item.excludeWorkPlace)) &&
                      (!item.workerType || !item.workerType.length || (item.workerType.includes(empPosItem.workerType) && !item.excludeWorkerType) || (!item.workerType.includes(empPosItem.workerType) && item.excludeWorkerType)) &&
                      (!item.department || !item.department.length || (item.department.includes(orgItem.parentUnitID) && !item.excludeDepartment) || (!item.department.includes(orgItem.parentUnitID) && item.excludeDepartment)) &&
                      (!item.position || !item.position.length || (item.position.includes(posItem.dictPositionID) && !item.excludePosition) || (!item.position.includes(posItem.dictPositionID) && item.excludePosition))
                  )
                  if (payPermItem && payPermItem.length) {
                    // payPermItem
                    accrualItem = {
                      accrualRate: payPermItem[0].rate,
                      accrualSum: payPermItem[0].paySum
                    }
                  }
                }
                if (accrualItem) {
                  const obj = {
                    employeeID: empPosItem.employeeID,
                    employeeNumberID: empPosItem.employeeNumberID,
                    basepay: empPosItem.accrualSum || 0,
                    indexNum: indexNpp++,
                    isDepartment: false,
                    isTotal: false,
                    empName: HR.reportUtils.formatFullName(empPosItem['employeeID.fullFIO'], false, [' ', '<br/>']),
                    addDescrPerson: empPosItem['employeeNumberID.addDescrPerson'] || '',
                    posName: HR.nameCase.cap(posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || ''),
                    actualPositionName: HR.nameCase.cap(empPosItem['factPosition'] || ''),
                    mtCount: !roundToQuantity ? empPosItem.mtCount || 0 : AC.currencyService.round(empPosItem.mtCount || 0, roundToQuantity === 'numberGroup' ? 0 : roundToQuantity === 'decimal1' ? 1 : 2),
                    accrualRate: accrualItem.accrualRate || 0,
                    accrualSum: accrualItem.accrualSum || 0,
                    roundTo: roundTo,
                    colSpan: colSpan,
                    colSpan2: colSpan2,
                    showAddDescrPerson: showAddDescrPerson,
                    useActualPositionName: useActualPositionName
                  }
                  obj.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(obj.mtCount)
                  objs.push(obj)
                }
              }
            }
            if (objs.length) {
              Object.keys(accrualData).forEach(key => {
                const accrualItem = accrualData[key]
                for (let i = 0; i < objs.length; i++) {
                  const obj = objs[i]
                  if (accrualItem.hasData) {
                    const empSum = HR.accrualService.accrualSumGetEmpSum({
                      accrualItem,
                      accumObj: obj,
                      employeeID: obj.employeeID,
                      employeeNumberID: obj.employeeNumberID,
                      empPosAccrualSum: obj.basepay || 0,
                      payelData,
                      specPayMethods,
                      empExpData,
                      payelExpData,
                      onDate
                    })
                    obj[key] = empSum
                  }
                }
              })

              // Обчислення ітогів
              objs.forEach(obj => {
                obj.basepaySum = HR.accrualService.accrualSumGetBasepayByObj(obj)
                let accrualSum = 0

                if (payEl.methodCode === '6') {
                  const empExpItem = empExpData.find(itm => itm.employeeID === obj.employeeID && itm.dictExperienceID === payEl.dictExperienceID)
                  if (empExpItem) {
                    const ymd = AC.dateService.getYmd(empExpItem.calcDate, onDate, true)
                    obj.accrualRate = HR.accrualService.getPercentByElmExp(payelExpData, payEl.ID, ymd.years, ymd.months)
                    accrualSum = obj.basepaySum * obj.accrualRate / 100
                  }
                } else if (payEl.methodCode === '5') {
                  const methodCfg = specPayMethods[payEl.methodCode]
                  if (methodCfg && methodCfg.getSum) {
                    const employeeID = obj.employeeID || 0
                    accrualSum = methodCfg.getSum({ employeeID })
                    obj.accrualRate = undefined
                  }
                } else if (payEl.payElType === 'SUM') {
                  accrualSum = obj.accrualSum || 0
                } else if (payEl.payElType === 'SUMRATE' && obj.accrualRate) {
                  accrualSum = obj.basepay * obj.accrualRate / 100
                } else if (payEl.payElType === 'SUMRATE' && !obj.accrualRate) {
                  accrualSum = obj.accrualSum || 0
                } else if (payEl.payElType === 'RATE') {
                  accrualSum = obj.basepay * obj.accrualRate / 100
                } else if (payEl.payElType === 'AVG') {
                  accrualSum = 0
                } else if (payEl.payElType === 'PLAN') {
                  accrualSum = obj.accrualSum * obj.mtCount
                }

                obj.accrualSum = accrualSum
                result.accrualSum += obj.accrualSum
                result.mtCount += obj.mtCount
                result.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(obj.mtCount)
                result.data.push(obj)
              })
            }
          }
        } else {
          const obj = {
            name: `${str}${styleBegin}${orgItem.code ? orgItem.code + ' ' : ''}${level === 1 ? (orgItem.name || '').toUpperCase() : HR.nameCase.cap(orgItem.name || '')}${styleEnd}`,
            unitName: `${orgItem.code ? orgItem.code + ' ' : ''}${HR.nameCase.cap(orgItem.name || '')}`,
            depType: orgItem.depType || '',
            isDepartment: true,
            isTotal: false,
            colSpan: colSpan,
            colSpan2: colSpan2,
            showAddDescrPerson: showAddDescrPerson,
            useActualPositionName: useActualPositionName
          }

          const subTree = getData(indexNpp, orgID, orgItem.mi_data_id, level + 1)
          if (subTree && subTree.data && subTree.data.length) {
            indexNpp = subTree.indexNpp || 1
            result.accrualSum += subTree.accrualSum
            result.mtCount += subTree.mtCount
            result.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(subTree.mtCount)

            result.data.push(obj)
            result.data.push(...subTree.data)

            if (showLevelTotals > 0 && (level === showLevelTotals || showLevelTotals === 2)) {
              const totalObj = {
                mi_data_id: orgItem.mi_data_id,
                name: UB.i18n(`{0}Всього по "{1}"`, str, obj.depType),
                isDepartment: false,
                isTotal: true,
                roundTo: roundTo,
                roundToQuantity: subTree.roundToQuantity,
                mtCount: subTree.mtCount,
                accrualSum: subTree.accrualSum,
                colSpan: colSpan,
                colSpan2: colSpan2,
                showAddDescrPerson: showAddDescrPerson,
                useActualPositionName: useActualPositionName
              }
              result.data.push(totalObj)
            }
          }
        }
      })

      result.indexNpp = indexNpp
      return result
    }

    const orgTree = {
      data: [],
      mtCount: 0,
      accrualSum: 0
    }

    let indexNpp = 1
    for (let i = 0; i < orgs.length; i++) {
      const aTree = getData(indexNpp, orgs[i].mi_data_id, i === 0 ? itemID : orgs[i].mi_data_id, 1)
      if (aTree && aTree.data && aTree.data.length) {
        if (orgs.length > 1) {
          const title = {
            textAlign: 'center',
            name: `<font color="blue">${orgs[i].name}</font>`,
            isDepartment: true,
            colSpan: colSpan,
            colSpan2: colSpan2,
            showAddDescrPerson: showAddDescrPerson,
            useActualPositionName: useActualPositionName
          }
          orgTree.data.push(title)
        }
        orgTree.data.push(...aTree.data)
        orgTree.mtCount += aTree.mtCount
        orgTree.accrualSum += aTree.accrualSum

        let tName = orgs[i].nameLoc || orgs[i].name
        if (i === 0 && itemID !== orgs[i].mi_data_id) {
          const tObj = _.find(orgStruct, { mi_data_id: itemID })
          tName = tObj && tObj.depType ? tObj.depType : ''
        }
        const orgTreeLastObj = {
          name: UB.i18n(`{0}Всього по "{1}"`, '', tName),
          isDepartment: false,
          isTotal: true,
          roundTo: roundTo,
          roundToQuantity: aTree.roundToQuantity,
          mtCount: aTree.mtCount,
          accrualSum: aTree.accrualSum,
          colSpan: colSpan,
          colSpan2: colSpan2,
          showAddDescrPerson: showAddDescrPerson,
          useActualPositionName: useActualPositionName
        }
        orgTree.data.push(orgTreeLastObj)
      }
      indexNpp = aTree.indexNpp || 1
    }

    if (orgs.length > 1) {
      orgTree.data.push({
        name: UB.i18n('Всього'),
        isDepartment: false,
        isTotal: true,
        roundTo: roundTo,
        roundToQuantity: roundToQuantity || HR.reportUtils.getQuantityFractional(orgTree.mtCount),
        mtCount: orgTree.mtCount,
        accrualSum: orgTree.accrualSum,
        colSpan: colSpan,
        colSpan2: colSpan2,
        showAddDescrPerson: showAddDescrPerson,
        useActualPositionName: useActualPositionName
      })
    }
    return orgTree || {}
  }

}
