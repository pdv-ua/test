/* global Ext _ UB AC appAC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    const organizationID = reportParams.organizationID || 0
    // const staffTableID = reportParams.staffTableID || 0
    const onDate = reportParams.onDate || AC.dateService.todayDate()
    const coefficient = reportParams.coefficient || 0
    const bossID = reportParams.bossID || 0
    const accID = reportParams.accID || 0
    const structDepID = reportParams.structDepID || 0
    const structDepName = reportParams.structDepName || ''
    const childDepID = reportParams.childDepID || 0
    const childDepName = reportParams.childDepName || ''

    const result = {
      bossName: '',
      bossPosName: '',
      accName: '',
      depName1: structDepName || childDepName || '',
      depNameButtom1: structDepName ? UB.i18n('(cтруктурний підрозділ)') : (childDepName ? UB.i18n('(підрозділ)') : ''),
      depName2: structDepName ? childDepName || '' : '',
      depNameButtom2: structDepName && childDepName ? UB.i18n('(підрозділ)') : '',
      showCategory: (reportParams.showCategory !== undefined) ? reportParams.showCategory : true,
      showWokers: (reportParams.showWokers !== undefined) ? reportParams.showWokers : true,
      orgUnits: []
    }
    const depFilter = childDepID || structDepID
    const depIDs = []
    structDepID && depIDs.push(structDepID)
    childDepID && depIDs.push(childDepID)

    const orgData = await UB.Repository('hr_organization')
      .attrs(['name'])
      .where('state', '=', 'ACTIVE')
      .where('mi_data_id', '=', organizationID)
      .misc({ __mip_ondate: onDate })
      .selectAsObject()
    result.year = onDate.getFullYear()
    result.orgName = orgData.length && orgData[0].name
    result.onDate = AC.dateService.getStringFormatDate(onDate, '', '', UB.i18n(' р.'))

    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(organizationID)
    result.showTotals = settingsOrg.showTotals
    result.roundTo = settingsOrg.roundTo
    result.roundToQuantity = settingsOrg.roundToQuantity
    result.showCategory = settingsOrg.hrFuncOrgType !== '2' ? result.showCategory : false
    result.showWokers = settingsOrg.hrFuncOrgType !== '2' ? result.showWokers : false

    let orgStruct = UB.Repository('hr_staffUnit')
      .attrs(['mi_data_id', 'parentUnitID', 'code', 'name', 'mi_unityEntity', 'accrualSum', 'staffOrderID', 'idxNum'])
      .where('orgID', '=', organizationID)
      .where('liquidate', '=', 0)
      .where('mi_dateFrom', '<=', onDate)
      .where('mi_dateTo', '>=', onDate)
      .where('state', '=', 'ACTIVE')
      .orderBy('idxNum')

    if (depFilter) {
      orgStruct = orgStruct
        .where('mi_treePath', 'like', `%/${depFilter}/%`, 'treePath')
        .where('mi_data_id', 'in', depIDs, 'IDs')
        .logic('([treePath] OR [IDs])')
    }

    orgStruct = await orgStruct.selectAsObject()
    if (!orgStruct) {
      return result
    }

    const posData = await UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID.fullName', 'dictPositionID.name', 'accrualSum', 'quantity',
        'paymentType', 'positionCategory', 'positionCategory.sortOrder', 'positionCategory.name'])
      .where('orgID', '=', organizationID)
      .where('liquidate', '=', 0)
      .where('mi_dateFrom', '<=', onDate)
      .where('mi_dateTo', '>=', onDate)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_recordhistory_all: true })
      .orderBy('dictPositionID.fullName')
      .orderBy('dictPositionID.name')
      .selectAsObject()

    let respPosInfo = await UB.Repository('hr_employeePositionS')
      .attrs('ID', 'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'positionID')
      .where('ID', 'in', [bossID, accID])
      .where('employeeID.mi_deleteDate', '>=', '#maxdate')
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_dateFrom', '<=', onDate)
      .where('positionID.mi_dateTo', '>=', onDate)
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()
    respPosInfo = respPosInfo ? _.groupBy(respPosInfo, 'ID') : []
    if (respPosInfo[bossID]) {
      result.bossName = respPosInfo[bossID][0]['employeeID.firstName'] ? respPosInfo[bossID][0]['employeeID.firstName'].substr(0, 1) + ' . ' : ''
      result.bossName += respPosInfo[bossID][0]['employeeID.middleName'] ? respPosInfo[bossID][0]['employeeID.middleName'].substr(0, 1) + ' . ' : ''
      result.bossName += respPosInfo[bossID][0]['employeeID.lastName']

      if (respPosInfo[bossID][0].positionID) {
        result.bossPosName = await UB.Repository('hr_position')
          .attrs(['fullName'])
          .where('mi_data_id', '=', respPosInfo[bossID][0].positionID || 0)
          .where('state', '=', 'ACTIVE')
          .misc({ __mip_ondate: onDate })
          .selectScalar() || ''
      }
    }
    if (respPosInfo[accID]) {
      result.accName = respPosInfo[accID][0]['employeeID.firstName'] ? respPosInfo[accID][0]['employeeID.firstName'].substr(0, 1) + ' . ' : ''
      result.accName += respPosInfo[accID][0]['employeeID.middleName'] ? respPosInfo[accID][0]['employeeID.middleName'].substr(0, 1) + ' . ' : ''
      result.accName += respPosInfo[accID][0]['employeeID.lastName']
    }

    const positionAccrualData = await UB.Repository('hr_positionAccrual')
      .attrs(['positionID', 'positionID.parentUnitID', 'accrualSum', 'accrualRate', 'calcSum', 'payElID.methodID.methodGroupID.code'])
      .whereIf(organizationID, 'positionID.orgID', 'in', organizationID)
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_dateFrom', '<=', onDate)
      .where('positionID.mi_dateTo', '>=', onDate)
      // .where('dateFrom', '<=', onDate)
      // .where('dateTo', '>=', onDate)
      .where('payElID.methodID.methodGroupID.code', '=', '1')
      .selectAsObject({
        'positionID.parentUnitID': 'parentUnitID',
        'payElID.methodID.methodGroupID.code': 'code'
      })

    let store
    for (let i = 1; i <= 2; i++) {
      store = me.getPositionAccrualPromise(i, organizationID, onDate) // , orderState)
      store = await store.selectAsObject({
        'positionID.parentUnitID': 'parentUnitID'
      })
      store.forEach(item => {
        item.code = 2
      })
      positionAccrualData.push(...store)
    }

    for (let i = 5; i <= 6; i++) {
      store = me.getPositionAccrualPromise(i, organizationID, onDate) //, orderState)
      store = await store.selectAsObject({
        'positionID.parentUnitID': 'parentUnitID'
      })
      store.forEach(item => {
        item.code = i
      })
      positionAccrualData.push(...store)
    }

    const tree = me.generateDataForReport(organizationID, depFilter || organizationID, orgStruct, posData, positionAccrualData, coefficient, result.roundTo, result.roundToQuantity, result.showTotals ? 2 : 1, result.showWokers)
    result.data = (tree && tree.data) || []
    result.totalQuantityStr = HR.reportUtils.quantityToString(tree.quantity, tree.roundToQuantity)
    result.totalFunsSumStr = HR.reportUtils.quantityToString(tree.fundSum, result.roundTo)

    result.dataPC = result.showCategory ? HR.reportUtils.generateDataForStructReportByPositionCategory(result.data, ['basepay', 'basepay5', 'basepay6', 'fundSum', 'fundSum12'], result.roundTo, result.roundToQuantity) : []

    return result
  },
  onParamPanelConfig: function () {
    const funcOrgType = AC.settings.get('hrFuncOrgType', appAC.globalOrganization())
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      listeners: {
        afterrender: function () {
          HR.orderManager.disableContextMenuItems(this.down('[name=organizationID]'), ['editItem', 'showLookup', 'addItem', 'clearValue'])
        }
      },
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            HR.controlService.getCollapseInfoPanel('Звіт формується по даним по окладу та нарахуванням, які взяті з карток посад штатної книги станом на вказану дату.'),
            HR.controlService.getOrgCombo({
              labelWidth: 140,
              width: 540,
              readOnly: true,
              listeners: {
                /*
              change: function (ctrl) {
                const form = ctrl.up('form')
                const staffID = form.down('[name=staffTableID]')
                const orgID = ctrl.getValue()
                const whereList = [['orgID', '=', orgID || 0], ['orderState', '!=', 'PROJECT']]
                AC.viewUtils.setWhereListProperty(staffID, whereList, null, ['clearStore', 'clearWhereList', 'clearValue'])
                staffID.setDisabled(!orgID)
                }
                 */
              }
            }),
            HR.controlService.get2DepCombo({
              labelWidth: 140,
              width: 540
            }),
            {
              xtype: 'datefield',
              name: 'onDate',
              labelWidth: 140,
              width: 270,
              fieldLabel: UB.i18n('Станом на'),
              allowBlank: false,
              value: appAC.globalApplicationDate()
            },
            /*
            {
              xtype: 'ubcombobox',
              name: 'staffTableID',
              fieldLabel: UB.i18n('Штатний розпис'),
              labelWidth: 140,
              width: 540,
              gridFieldList: ['description', 'orderState', 'entryDate'],
              displayField: 'description',
              allowBlank: false,
              ubRequest: {
                entity: 'hr_staffTable',
                fieldList: ['ID', 'description'],
                whereList: {
                  orgID: {
                    expression: '[orgID]',
                    condition: '=',
                    values: {
                      value: appAC.globalOrganization()
                    }
                  },
                  orderState: {
                    expression: '[orderState]',
                    condition: '!=',
                    value: 'PROJECT'
                  }
                },
                orderList: { orderBy: { expression: 'orderDate' } }
              }
            },
             */
            {
              xtype: 'numberfield',
              name: 'coefficient',
              labelWidth: 140,
              width: 240,
              fieldLabel: UB.i18n('Коефіцієнт індексації'),
              vtype: 'floatValidator',
              value: 1,
              hideTrigger: true
            },
            HR.controlService.getRespEmpCombo({
              name: 'bossID',
              fieldLabel: UB.i18n('Керівник'),
              labelWidth: 140,
              width: 540,
              allowBlank: true,
              defaultOrgBoss: true
            }),
            HR.controlService.getRespEmpCombo({
              name: 'accID',
              fieldLabel: UB.i18n('Керівник служби'),
              labelWidth: 140,
              width: 540,
              allowBlank: true
            }),
            {
              xtype: 'checkboxfield',
              name: 'showCategory',
              fieldLabel: UB.i18n('Формувати підсумки по категоріям'),
              labelWidth: 140,
              value: funcOrgType !== '2', /* Сфера діяльності організації = Державна служба */
              hidden: funcOrgType === '2'
            }, {
              xtype: 'checkboxfield',
              name: 'showWokers',
              fieldLabel: UB.i18n('Окремо підсумки по робітникам'),
              labelWidth: 140,
              value: funcOrgType !== '2', /* Сфера діяльності організації = Державна служба */
              hidden: funcOrgType === '2'
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          coefficient: frm.findField('coefficient').getValue() || 1,
          organizationID: frm.findField('organizationID').getValue() || 0,
          // staffTableID: frm.findField('staffTableID').getValue() || 0,
          onDate: AC.dateService.shiftDate(frm.findField('onDate').getValue() || AC.dateService.todayDate()),
          bossID: frm.findField('bossID').getValue() || 0,
          accID: frm.findField('accID').getValue() || 0,
          structDepID: frm.findField('structDepID').getValue() || 0,
          structDepName: frm.findField('structDepID').getRawValue(),
          childDepID: frm.findField('childDepID').getValue() || 0,
          childDepName: frm.findField('childDepID').getRawValue(),
          showCategory: frm.findField('showCategory').getValue() === true,
          showWokers: frm.findField('showWokers').getValue() === true
        }
      }
    })
    return paramForm
  },

  getPositionAccrualPromise: function (type, organizationID, onDate) {
    const aPromise = UB.Repository('hr_positionAccrual')
      .attrs(['positionID', 'positionID.parentUnitID', 'calcSum', 'payElID.code'])
      .whereIf(organizationID, 'positionID.orgID', 'in', organizationID)
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_dateFrom', '<=', onDate)
      .where('positionID.mi_dateTo', '>=', onDate)
      // .where('dateFrom', '<=', onDate)
      // .where('dateTo', '>=', onDate)
      .whereIf(type === 1 || type === 2, 'payElID.methodID.methodGroupID.code', '!=', '1')
      .whereIf(type === 1, 'payElID.code', '!=', '1')
      .exists(UB.Repository('hr_repSetElement')
        .correlation('elementID', 'payElID')
        .where('mi_deleteDate', '>=', '#maxdate')
        .whereIf(type === 1, 'repSetParamID.code', '=', 'FOP_BASE')
        .whereIf(type === 2, 'repSetParamID.code', 'in', ['FOP_ADD', 'FOP_OTHER'])
        .whereIf(type === 5 || type === 6, 'repSetParamID.code', 'like', 'tOrgPlan%')
        .whereIf(type === 5 || type === 6, 'repSetParamID.reportNumStr', '=', type.toString())
        .whereIf(type === 1 || type === 2, 'elementSetTypeID.code', '=', 'hr_payEl')
        .where('dateFrom', '<=', onDate, 'dateFromOnDate')
        .where('dateFrom', 'isNull', undefined, 'dateFromIsNull')
        .where('dateTo', '>=', onDate, 'dateToOnDate')
        .where('dateTo', 'isNull', undefined, 'dateToIsNull')
        .logic('([dateFromIsNull] or [dateFromOnDate]) and ([dateToIsNull] or [dateToOnDate])'))

    return aPromise
  },

  generateDataForReport: function (organizationID, itemID, orgStruct, positionData, paData, coefficient, roundTo, roundToQuantity, showLevelTotals = 0, showWokers) {
    if (!orgStruct || !orgStruct.length) return {}

    function getData (indexNpp, parentID, level = 1) {
      const result = {
        data: [],
        roundTo: roundTo,
        quantity: 0,
        basepay: 0,
        basepay5: 0,
        basepay5Quantity: 0,
        basepay6: 0,
        basepay6Quantity: 0,
        fundSum: 0,
        fundSum12: 0
      }
      const curStruct = orgStruct.filter(el => el.parentUnitID === parentID)
      const str = level === 1 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)
      let styleBegin = ''
      let styleEnd = ''
      if (level === 1) {
        styleBegin = '<font color="blue">'
        styleEnd = '</font>'
      }
      if (level === 2) {
        styleBegin = '<u>'
        styleEnd = '</u>'
      }
      curStruct.forEach(orgItem => {
        let obj = {
          parentID: parentID,
          needAdd: true,
          mi_data_id: orgItem.mi_data_id,
          name: orgItem.mi_unityEntity === 'hr_department' ? `${str}${styleBegin}${orgItem.code ? orgItem.code + ' '
            : ''}${level === 1 ? (orgItem.name || '').toUpperCase() : HR.nameCase.cap(orgItem.name || '')}${styleEnd}` : '',
          unitName: orgItem.mi_unityEntity === 'hr_department' ? `${orgItem.code ? orgItem.code + ' ' : ''}${HR.nameCase.cap(orgItem.name || '')}` : '',
          isDepartment: orgItem.mi_unityEntity === 'hr_department',
          isTotal: false,
          quantity: 0,
          roundTo: roundTo,
          basepay: 0,
          basepay5: 0,
          basepay6: 0,
          fundSum: 0,
          fundSum12: 0,
          positionCategorySortOrder: 9999999,
          positionCategory: '',
          positionCategoryName: ''
        }

        if (!obj.isDepartment) {
          const posItem = positionData ? _.find(positionData, { mi_data_id: orgItem.mi_data_id }) : undefined
          if (posItem) {
            const posName = posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || ''
            const qnt = !roundToQuantity ? posItem.quantity || 0 : AC.currencyService.round(posItem.quantity || 0, roundToQuantity === 'numberGroup' ? 0 : roundToQuantity === 'decimal1' ? 1 : 2)
            const basepayPos = posItem.accrualSum || 0

            let basepay = paData.map(item => item.positionID === posItem.ID && item.code && item.code === 1 ? item.accrualSum : 0).reduce((result, value) => result + value, 0)
            basepay = basepay && basepay !== 0 ? basepay : basepayPos
            //  Тип оплати = За трудовою угодою, то  такая сумма должна быть равна нулю.
            basepay = posItem.paymentType === 'CONTRACT' ? 0 : basepay
            basepay = AC.currencyService.round(basepay || 0, roundTo === 'numberGroup' ? 0 : 2)

            basepay = coefficient * basepay
            let basepay5 = paData.map(item => item.positionID === posItem.ID && item.code && item.code === 5 ? item.calcSum || 0 : 0).reduce((result, value) => result + value, 0)
            let basepay5Quantity = paData.map(item => item.positionID === posItem.ID && item.code && item.code === 5 ? (item.calcSum || 0) * qnt : 0).reduce((result, value) => result + value, 0)

            //  Тип оплати = За трудовою угодою, то  такая сумма должна быть равна нулю.
            basepay5 = posItem.paymentType === 'CONTRACT' ? 0 : AC.currencyService.round(coefficient * basepay5, roundTo === 'numberGroup' ? 0 : 2)
            basepay5Quantity = posItem.paymentType === 'CONTRACT' ? 0 : AC.currencyService.round(coefficient * basepay5Quantity, roundTo === 'numberGroup' ? 0 : 2)

            let basepay6 = paData.map(item => item.positionID === posItem.ID && item.code && item.code === 6 ? item.calcSum || 0 : 0).reduce((result, value) => result + value, 0)
            let basepay6Quantity = paData.map(item => item.positionID === posItem.ID && item.code && item.code === 6 ? (item.calcSum || 0) * qnt : 0).reduce((result, value) => result + value, 0)

            //  Тип оплати = За трудовою угодою, то  такая сумма должна быть равна нулю.
            basepay6 = posItem.paymentType === 'CONTRACT' ? 0 : AC.currencyService.round(coefficient * basepay6, roundTo === 'numberGroup' ? 0 : 2)
            basepay6Quantity = posItem.paymentType === 'CONTRACT' ? 0 : AC.currencyService.round(coefficient * basepay6Quantity, roundTo === 'numberGroup' ? 0 : 2)

            // let fundSum = paData.map(item => item.positionID === posItem.mi_data_id && item.code && item.code === 2
            //  ? getSum(item.accrualSum, item.accrualRate, basepay, qnt) : 0).reduce((result, value) => result + value, 0)
            const fundSum = basepay * qnt + basepay5Quantity + basepay6Quantity
            const fundSum12 = AC.currencyService.round(12 * fundSum, roundTo === 'numberGroup' ? 0 : 2)

            obj.name = posName
            const foundItem = _.find(result.data, { parentID: parentID, name: posName, basepay: basepay, basepay5: basepay5, basepay6: basepay6 })
            if (foundItem) {
              obj = foundItem
              obj.needAdd = false
            } else {
              obj.paymentType = posItem.paymentType === 'CONTRACT' ? UB.i18n('Згідно умов трудового договору') : ''
              obj.basepay = basepay
              obj.basepay5 = basepay5
              obj.basepay5Quantity = basepay5Quantity
              obj.basepay6 = basepay6
              obj.basepay6Quantity = basepay6Quantity
              obj.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(obj.quantity)
              obj.positionCategorySortOrder = posItem['positionCategory.sortOrder'] || 9999999
              obj.positionCategory = posItem['positionCategory'] || ''
              obj.positionCategoryName = posItem['positionCategory.name'] || ''
            }
            obj.quantity += qnt
            obj.fundSum += fundSum
            obj.fundSum12 += fundSum12

            result.quantity += qnt
            result.basepay += basepay
            result.basepay5 += basepay5
            result.basepay5Quantity += basepay5Quantity
            result.basepay6 += basepay6
            result.basepay6Quantity += basepay6Quantity
            result.fundSum += fundSum
            result.fundSum12 += fundSum12
          } else {
            obj.needAdd = false
          }
        }

        if (obj.needAdd) {
          obj.indexNum = obj.isDepartment ? '' : indexNpp++
          result.data.push(obj)
        }
        if (obj.isDepartment) {
          result.quantity += obj.quantity

          const subTree = getData(indexNpp, orgItem.mi_data_id, level + 1)
          if (subTree && subTree.data && subTree.data.length) {
            indexNpp = subTree.indexNpp || 1
            result.data.push(...subTree.data)

            if (showLevelTotals > 0 && (level === showLevelTotals || showLevelTotals === 2)) {
              const totalObj = {
                needAdd: true,
                mi_data_id: orgItem.mi_data_id,
                indexNum: '',
                name: UB.i18n(`{0}Всього по "{1}"`, str, obj.unitName),
                isDepartment: false,
                isTotal: true,
                quantity: subTree.quantity || 0,
                roundToQuantity: subTree.roundToQuantity || HR.reportUtils.getQuantityFractional(subTree.quantity || 0),
                roundTo: roundTo,
                basepay: subTree.basepay,
                basepay5: subTree.basepay5Quantity,
                basepay6: subTree.basepay6Quantity,
                fundSum: subTree.fundSum,
                fundSum12: subTree.fundSum12
              }
              result.data.push(totalObj)
              if (showWokers) {
                const workers = subTree.data.filter(item => ((item.positionCategoryName || '').toLowerCase()).indexOf('робітник') !== -1 && !item.isDepartment && !item.isTotal)
                const totalObj = {
                  needAdd: true,
                  mi_data_id: orgItem.mi_data_id,
                  indexNum: '',
                  name: UB.i18n(`{0}в т.ч. робітники`, str),
                  isDepartment: false,
                  isTotal: true,
                  quantity: workers.reduce((res, item) => res + item.quantity, 0),
                  roundTo: roundTo,
                  basepay: workers.reduce((res, item) => res + item.basepay, 0),
                  basepay5: workers.reduce((res, item) => res + item.basepay5Quantity, 0),
                  basepay6: workers.reduce((res, item) => res + item.basepay6Quantity, 0),
                  fundSum: workers.reduce((res, item) => res + item.fundSum, 0),
                  fundSum12: workers.reduce((res, item) => res + item.fundSum12, 0)
                }
                totalObj.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(totalObj.quantity)
                if (totalObj.quantity || totalObj.fundSum || totalObj.fundSum12 ||
                    totalObj.basepay || totalObj.basepay5 || totalObj.basepay6) {
                  result.data.push(totalObj)
                }
              }
            }
            result.quantity += subTree.quantity
            result.basepay += subTree.basepay
            result.basepay5 += subTree.basepay5
            result.basepay5Quantity += subTree.basepay5Quantity
            result.basepay6 += subTree.basepay6
            result.basepay6Quantity += subTree.basepay6Quantity
            result.fundSum += subTree.fundSum
            result.fundSum12 += subTree.fundSum12
          }
        }
      })

      result.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(result.quantity)
      result.indexNpp = indexNpp
      return result
    }

    const orgTree = getData(1, itemID)
    let tName = UB.i18n('ВСЬОГО')
    if (organizationID !== itemID) {
      const tObj = _.find(orgStruct, { mi_data_id: itemID })
      tName = tObj && tObj.name ? tObj.name : ''
      tName = UB.i18n(`{0}Всього по {1}`, '', tName)
    }
    orgTree.data.push({
      mi_data_id: itemID,
      name: tName,
      isDepartment: false,
      isTotal: true,
      quantity: orgTree.quantity || 0,
      roundToQuantity: orgTree.roundToQuantity || HR.reportUtils.getQuantityFractional(orgTree.quantity || 0),
      roundTo: roundTo,
      basepay: orgTree.basepay,
      basepay5: orgTree.basepay5Quantity,
      basepay6: orgTree.basepay6Quantity,
      fundSum: orgTree.fundSum,
      fundSum12: orgTree.fundSum12
    })
    if (organizationID !== itemID && showWokers) {
      const workers = orgTree.data.filter(item => ((item.positionCategoryName || '').toLowerCase()).indexOf('робітник') !== -1 && !item.isDepartment && !item.isTotal)
      const totalObj = {
        indexNum: '',
        name: UB.i18n(`{0}в т.ч. робітники`, ''),
        isDepartment: false,
        isTotal: true,
        quantity: workers.reduce((res, item) => res + item.quantity, 0),
        roundTo: roundTo,
        basepay: workers.reduce((res, item) => res + item.basepay, 0),
        basepay5: workers.reduce((res, item) => res + item.basepay5Quantity, 0),
        basepay6: workers.reduce((res, item) => res + item.basepay6Quantity, 0),
        fundSum: workers.reduce((res, item) => res + item.fundSum, 0),
        fundSum12: workers.reduce((res, item) => res + item.fundSum12, 0)
      }
      totalObj.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(totalObj.quantity)
      if (totalObj.quantity || totalObj.fundSum || totalObj.fundSum12 ||
        totalObj.basepay || totalObj.basepay5 || totalObj.basepay6) {
        orgTree.data.push(totalObj)
      }
    }
    return orgTree || []
  }
}
