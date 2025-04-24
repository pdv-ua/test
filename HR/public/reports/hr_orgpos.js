/* global Ext _ UB AC HR appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    const organizationID = reportParams.organizationID || appAC.globalOrganization()
    const departmentID = reportParams.departmentID || 0
    const onDate = AC.dateService.unshiftDate(reportParams.onDate)
    const showPosBasePay = reportParams.showPosBasePay || false
    const dictFundSourceID = reportParams.dictFundSourceID || 0

    if (reportParams.roundTo === undefined) {
      const roundValue = AC.settings.get('hrRoundAccrualStaffTable', organizationID)
      reportParams.roundTo = roundValue && roundValue === '1' ? 2
        : roundValue && roundValue === '2' ? 1
          : roundValue ? 2 : 0
    }

    const result = {
      roundTo: (reportParams.roundTo || 0) <= 0 ? 'numberGroup' : 'decimal2',
      orgUnits: [],
      fundSourceName: reportParams.dictFundSourceName || '',
      progClassName: reportParams.dictProgClass || '',
      fundName: reportParams.dictFundTypeName ? reportParams.dictFundTypeName + UB.i18n(' фонд') : '',
      showPosBasePay: showPosBasePay,
      showCategory: (reportParams.showCategory !== undefined) ? reportParams.showCategory : true,
      showWokers: (reportParams.showWokers !== undefined) ? reportParams.showWokers : true
    }
    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(organizationID)
    result.showTotals = settingsOrg.showTotals
    result.showCategory = settingsOrg.hrFuncOrgType !== '2' ? result.showCategory : false
    result.showWokers = settingsOrg.hrFuncOrgType !== '2' ? result.showWokers : false
    result.showRank = settingsOrg.hrFuncOrgType === '2'
    result.namePosition = settingsOrg.namePosition
    result.tableWidth = 1170 + (result.showPosBasePay ? 130 : 0) + (result.showRank ? 140 : 0)
    result.colSpan = 8 + (result.showPosBasePay ? 1 : 0) + (result.showRank ? 1 : 0)
    result.colSpan2 = result.showPosBasePay ? 4 : 3
    result.colSpan3 = result.showRank ? 5 : 4
    result.colSpan4 = result.showPosBasePay ? 3 : 2
    result.colNums = []
    for (let i = 1; i <= result.colSpan; i++) {
      result.colNums.push({ name: i })
    }

    const onDate4Sql = AC.dateService.shiftDate(onDate)
    const orgName = await UB.Repository('hr_organization')
      .attrs(['nameGen', 'name'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate4Sql })
      .selectAsObject()
    if (orgName && orgName.length) {
      result.organizationName = orgName[0].nameGen || orgName[0].name || ''
    }
    if (departmentID) {
      const depNames = await UB.Repository('hr_department')
        .attrs(['nameGen', 'name'])
        .where('mi_data_id', '=', departmentID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: onDate4Sql })
        .selectSingle()
      result.departmentName = HR.nameCase.cap((depNames && (depNames.nameGen || depNames.name)) || '')
    }
    result.onDate = AC.dateService.getStringFormatDate(onDate, '', '', UB.i18n(' р.'))

    let orgStruct = UB.Repository('hr_staffUnit')
      .attrs(['mi_data_id', 'parentUnitID', 'code', 'name', 'mi_unityEntity'])
      .where('liquidate', '=', 0)
      .where('state', '=', 'ACTIVE')
      /* в hr_staffUnit.meta не встановлено аттрибут dataHistory, тому __mip_ondate не працює */
      .where('mi_dateFrom', '<=', onDate4Sql)
      .where('mi_dateTo', '>=', onDate4Sql)
      .whereIf(organizationID, 'orgID', '=', organizationID)
      .whereIf(!organizationID, 'parentUnitID', 'isNotNull')
      .orderBy('idxNum')

    if (departmentID && reportParams.includeChildDepts) {
      orgStruct
        .where('mi_treePath', 'like', '/' + departmentID + '/', 'u1')
        .where('mi_data_id', '=', departmentID, 'u2')
        .logic('([u1] or [u2])')
    }
    if (departmentID && !reportParams.includeChildDepts) {
      orgStruct
        .where('parentUnitID', '=', departmentID, 'u1')
        .where('mi_data_id', '=', departmentID, 'u2')
        .where('mi_unityEntity', '=', 'hr_position', 'u3')
        .logic('(([u1] and [u3]) or [u2])')
    }
    orgStruct = await orgStruct.selectAsObject()

    if (!orgStruct) {
      return result
    }

    const posData = await UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'name', 'accrualSum', 'dictPositionID.fullName', 'dictPositionID.name',
        'positionCategory', 'positionCategory.sortOrder', 'positionCategory.name'])
      .misc({ __mip_ondate: onDate4Sql })
      .where('state', '=', 'ACTIVE')
      .whereIf(organizationID, 'orgID', '=', organizationID)
      .whereIf(dictFundSourceID, 'fundSourcePositionID.dictFundSourceID', '=', dictFundSourceID)
      .orderBy('name')
      .selectAsObject()

    const empData = await UB.Repository('hr_employeePositionS')
      .attrs(['positionID', 'employeeID', 'employeeNumberID', 'dateFrom', 'dateTo', 'employeeID.fullFIO', 'employeeID.birthDate',
        'accrualSum', 'orderID.orderNumber', 'orderID.orderDate', 'orderID.empOrderType', 'orderID.description',
        'changeOrderID.orderNumber', 'changeOrderID.orderDate', 'changeOrderID.empOrderType', 'changeOrderID.description',
        'vacancyDateFrom', 'vacancyDateTo', 'workPlace', 'orderID', 'orderID.orderState', 'employeeID.empOrderAppoint'
      ])
      .where('isActive', '=', true)
      .where('employeeID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('orderID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('changeOrderID.mi_deleteDate', '>=', '#maxdate')
      .whereIf(organizationID, 'positionID.orgID', '=', organizationID)
      .whereIf(organizationID, 'positionID.state', '=', 'ACTIVE')
      .whereIf(organizationID, 'positionID.mi_dateFrom', '<=', onDate4Sql)
      .whereIf(organizationID, 'positionID.mi_dateTo', '>=', onDate4Sql)
      .whereIf(organizationID, 'positionID.mi_deleteDate', '>=', '#maxdate')
      .whereIf(dictFundSourceID, 'fundSourceEmpPosID.dictFundSourceID', '=', dictFundSourceID)
      .orderBy('positionID')
      .orderBy('employeeID.fullFIO')
      .selectAsObject()

    let rankData = UB.Repository('hr_publServRang')
      .attrs(['employeeID', 'dictRankID.name', 'dateFrom'])
      .where('dateFrom', '<=', onDate4Sql)
      .where('dateTo', '>=', onDate4Sql)
      .where('dictRankID.mi_deleteDate', '>=', '#maxdate')
    if (organizationID) {
      rankData = rankData.exists(UB.Repository('hr_employeePositionS')
        .correlation('employeeID', 'employeeID')
        .where('dateFrom', '<=', onDate4Sql)
        .where('dateTo', '>=', onDate4Sql)
        .where('isActive', '=', true)
        .where('mi_deleteDate', '>=', '#maxdate')
        .where('positionID.orgID', '=', organizationID)
        .where('positionID.state', '=', 'ACTIVE')
        .where('positionID.mi_dateFrom', '<=', onDate4Sql)
        .where('positionID.mi_dateTo', '>=', onDate4Sql)
        .where('positionID.mi_deleteDate', '>=', '#maxdate'))
    }
    rankData = await rankData.orderBy('employeeID')
      .selectAsObject()

    const employeeIDs = _.compact(_.uniq(empData.map(el => el.employeeID)))
    let employeeWorkbook = await UB.Repository('hr_employeeWorkbook')
      .attrs(['ID', 'isOrgAppoint', 'dateFrom', 'employeeID', 'appointOrder'])
      .whereIf(employeeIDs && employeeIDs.length > 0, 'employeeID', 'in', employeeIDs)
      .whereIf(!employeeIDs || employeeIDs.length === 0, 'employeeID', '=', 0)
      .where('organizationID', '=', organizationID)
      .where('isOrgAppoint', '=', 1)
      .where('dateFrom', 'isNotNull')
      .orderBy('dateFrom', 'desc')
      .selectAsObject()
    employeeWorkbook = employeeWorkbook && employeeWorkbook.length ? _.groupBy(employeeWorkbook, 'employeeID') : []

    let firstAppointMove = await UB.Repository('hr_empOrderAppointDet')
      .attrs(['orderID'])
      .whereIf(employeeIDs && employeeIDs.length > 0, 'employeeID', 'in', employeeIDs)
      .whereIf(!employeeIDs || employeeIDs.length === 0, 'employeeID', '=', 0)
      .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
      .where('organizationID', '=', organizationID)
      .where('empOrderType', '=', 'APPOINT_MOVE')
      .where('isMove', '=', 1)
      .selectAsArray()
    firstAppointMove = (firstAppointMove && firstAppointMove.resultData && firstAppointMove.resultData.data) || []

    const config = {
      roundTo: result.roundTo,
      roundToQuantity: result.roundToQuantity,
      showPosBasePay: result.showPosBasePay,
      showLevelTotals: result.showTotals ? 2 : 1,
      showWokers: result.showWokers,
      namePosition: result.namePosition,
      showRank: result.showRank,
      colSpan: result.colSpan,
      colSpan2: result.colSpan2,
      colSpan3: result.colSpan3,
      colSpan4: result.colSpan4
    }
    const tree = me.generateDataForReport(organizationID, departmentID || organizationID, orgStruct, posData, empData, employeeWorkbook, rankData, firstAppointMove, onDate,
      config)
    result.data = tree && tree.data ? tree.data : []

    const dataPC = []
    _.forEach(result.data, items => {
      dataPC.push(items)
      if (items.emp && items.emp.length) {
        dataPC.push(...items.emp)
      }
    })
    result.dataPC = result.showCategory
      ? HR.reportUtils.generateDataForStructReportByPositionCategory(dataPC, ['basepay'], result.roundTo, result.roundToQuantity, [{ name: 'colSpan3', value: result.colSpan3 }, { name: 'colSpan4', value: result.colSpan4 }])
      : []

    return result
  },
  onParamPanelConfig: function () {
    const funcOrgType = AC.settings.get('hrFuncOrgType', appAC.globalOrganization())
    const incomeParams = this.incomeParams || {}
    const me = this
    me.paramForm = Ext.create('UBS.ReportParamForm', {
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
            HR.controlService.getOrgCombo({
              labelWidth: 190,
              width: 540,
              readOnly: true,
              listeners: {
                change: function (ctrl) {
                  const form = ctrl.up('form')
                  const departmentID = form.down('[name=departmentID]')
                  const orgID = ctrl.getValue()
                  const whereList = [
                    ['orgID', '=', orgID || 0],
                    ['state', '=', 'ACTIVE']
                  ]
                  AC.viewUtils.setWhereListProperty(departmentID, whereList, null, ['clearStore', 'clearWhereList', 'clearValue'])
                  departmentID.setDisabled(!orgID)
                }
              }
            }),
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getDepCombo({
                  labelWidth: 190,
                  width: 540,
                  filterByGlobalOrg: true,
                  flex: 1,
                  displayField: 'description',
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
              xtype: 'ubcombobox',
              name: 'dictFundSourceID',
              fieldLabel: UB.i18n('Джерело фінансування'),
              labelWidth: 190,
              width: 500,
              hideEntityItemInContext: true,
              gridFieldList: ['ID', 'name', 'description'],
              valueField: 'ID',
              displayField: 'name',
              ubRequest: {
                entity: 'ac_fundSource',
                method: 'selectByOrg',
                fieldList: ['ID', 'name', 'dictFundTypeName', 'dictProgClass']
              },
              listeners: {
                afterrender: function (ctrl) {
                  ctrl.store.ubRequest.orgID = appAC.globalOrganization()
                }
              }
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  labelWidth: 190,
                  width: 310,
                  fieldLabel: UB.i18n('Станом на'),
                  value: appAC.globalApplicationDate()
                },
                {
                  xtype: 'checkboxfield',
                  name: 'showPosBasePay',
                  fieldLabel: UB.i18n('Вивести оклад посади'),
                  labelWidth: 190,
                  width: 200,
                  value: false
                },
                HR.reportUtils.roundToCombo({ labelWidth: 140, width: 340, defaultValue: 0, simpleRound: true })
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'checkboxfield',
                  name: 'showCategory',
                  fieldLabel: UB.i18n('Формувати підсумки по категоріям'),
                  labelWidth: 190,
                  value: funcOrgType !== '2', /* Сфера діяльності організації = Державна служба */
                  hidden: funcOrgType === '2'
                }, {
                  xtype: 'checkboxfield',
                  name: 'showWokers',
                  fieldLabel: UB.i18n('Окремо підсумки по робітникам'),
                  labelWidth: 230,
                  value: funcOrgType !== '2', /* Сфера діяльності організації = Державна служба */
                  hidden: funcOrgType === '2'
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const roundTo = frm.findField('roundToCombo').getValue()
        const dictFundSourceID = frm.findField('dictFundSourceID')
        const reco = AC.gridUtils.getCurrentRecord(dictFundSourceID)
        const dictFundTypeName = reco && reco.get('dictFundTypeName')
        const dictProgClass = reco && reco.get('dictProgClass')
        const params = {
          organizationID: frm.findField('organizationID').getValue() || 0,
          departmentID: frm.findField('departmentID').getValue() || 0,
          includeChildDepts: frm.findField('includeChildDepts').getValue() || false,
          onDate: frm.findField('onDate').getValue() || AC.dateService.todayDate(),
          showPosBasePay: frm.findField('showPosBasePay').getValue(),
          roundTo: (roundTo === undefined || roundTo > 2) ? 2 : roundTo,
          showCategory: frm.findField('showCategory').getValue() === true,
          showWokers: frm.findField('showWokers').getValue() === true,
          dictFundSourceID: frm.findField('dictFundSourceID').getValue(),
          dictFundSourceName: frm.findField('dictFundSourceID').getRawValue(),
          dictFundTypeName: dictFundTypeName,
          dictProgClass: dictProgClass
        }
        // помилка в UBReport.prototype.makeReport, при експорті в Excel параметри беруться з incomeParams, а не з getParameters()
        owner.ownerCt.report.incomeParams = params
        return params
      }
    })
    me.paramForm.on('afterrender', () => {
      if (incomeParams.dictFundSourceID) {
        me.paramForm.down('[name=dictFundSourceID]').setValueById(incomeParams.dictFundSourceID)
      }
    })
    return me.paramForm
  },
  generateDataForReport: function (organizationID, itemID, orgStruct, positionData, empData, employeeWorkbook, rankData, firstAppointMove,
    onDate, config) {
    if (!orgStruct || !orgStruct.length) return {}
    const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()

    function setConfigData (obj) {
      for (let key in config) {
        obj[key] = config[key]
      }
    }

    function getEmpPosData (empItem) {
      const empID = empItem.employeeID
      const isTempVac = HR.reportUtils.isTempVac(empItem.vacancyDateFrom, empItem.vacancyDateTo, onDate)
      const vacancyDateFromStr = empItem.vacancyDateFrom ? UB.i18n(' з ') + AC.dateService.formatDate(empItem.vacancyDateFrom) + '<br/>' : ''
      const vacancyDateToStr = empItem.vacancyDateTo ? UB.i18n(' по ') + AC.dateService.formatDate(empItem.vacancyDateTo) : ''
      const notes = isTempVac ? UB.i18n(`відсутність<br/>{0}{1}`, vacancyDateFromStr, vacancyDateToStr) : null
      const rankItem = _.find(rankData, { employeeID: empID })
      const rankName = rankItem ? rankItem['dictRankID.name'] + ' ' + AC.dateService.formatDate(rankItem.dateFrom) : ''
      const workbook = employeeWorkbook[empItem.employeeID] ? _.sortBy(employeeWorkbook[empItem.employeeID], 'dateFrom').reverse()[0] : undefined

      let orderTitle
      let acceptNumDate = empItem['employeeID.empOrderAppoint'] || ''
      if (!acceptNumDate) {
        let acceptItems = empData.filter(emp => emp.employeeNumberID === empItem.employeeNumberID && emp.positionID === empItem.positionID &&
          ['POSTED', 'PROCESSED'].includes(emp['orderID.orderState']) &&
          emp.dateFrom <= onDate && ['APPOINT', 'MOVE', 'APPOINT_MOVE'].includes(emp['orderID.empOrderType']) && !firstAppointMove.includes(emp.orderID))
        if (!acceptItems || !acceptItems.length) {
          if (empItem.workPlace === '2') {
            acceptItems = empData.filter(emp => emp.employeeNumberID === empItem.employeeNumberID && emp.positionID === empItem.positionID &&
              ['POSTED', 'PROCESSED'].includes(emp['orderID.orderState']) &&
              emp.dateFrom <= onDate && (emp['orderID.empOrderType'] === 'PLURALIST' || emp['orderID.empOrderType'] === null))
          } else {
            acceptItems = empData.filter(emp => emp.employeeNumberID === empItem.employeeNumberID && emp.positionID === empItem.positionID &&
              emp.dateFrom <= onDate && emp['orderID.empOrderType'] === null)
          }
        }
        const acceptItem = acceptItems && acceptItems.length ? _.orderBy(acceptItems, ['dateFrom'], ['desc'])[0] : []
        let empOrderType
        if (acceptItem) {
          empOrderType = acceptItem['orderID.empOrderType']
          if (empOrderType) {
            orderTitle = empOrderType === 'MOVE' ? UB.i18n('Наказ на переміщення') : (empOrderType === 'APPOINT' || empOrderType === 'APPOINT_MOVE' ? UB.i18n('Наказ про прийом') : UB.i18n('Наказ про сумісництво'))
            const orderNumber = acceptItem['orderID.orderNumber'] ? `<br/>№ ${acceptItem['orderID.orderNumber']}` : ''
            const orderDate = acceptItem['orderID.orderDate'] ? UB.i18n(` від {0}`, AC.dateService.formatDate(acceptItem['orderID.orderDate'])) : ''
            acceptNumDate = ['APPOINT', 'MOVE', 'PLURALIST', 'APPOINT_MOVE'].includes(empOrderType) ? `${orderTitle}${orderNumber}${orderDate}` : ''
          } else {
            acceptNumDate = acceptItem['orderID.description'] || ''
          }
        }
        if (!acceptNumDate && workbook) {
          acceptNumDate = `${AC.dateService.formatDate(workbook.dateFrom)}${workbook.appointOrder ? '; ' + workbook.appointOrder : ''}`
        }
      }

      let fireNumDate = ''
      let fireItems = empData.filter(emp => emp.employeeNumberID === empItem.employeeNumberID && emp.positionID === empItem.positionID &&
          ['POSTED', 'PROCESSED'].includes(emp['orderID.orderState']) &&
          emp.dateFrom <= onDate && (['MOVE', 'DISM'].includes(emp['changeOrderID.empOrderType'])))
      if (fireItems.length > 1) {
        fireItems = _.orderBy(fireItems, ['dateFrom'], ['desc'])
      }
      const fireItem = fireItems[0]
      let empChangeOrderType
      if (fireItem) {
        empChangeOrderType = fireItems['changeOrderID.empOrderType']
        if (empChangeOrderType) {
          orderTitle = empChangeOrderType === 'MOVE' ? UB.i18n('Наказ на переміщення') : UB.i18n('Наказ про звільнення')
          const orderNumber = fireItem['changeOrderID.orderNumber'] ? `<br/>№ ${fireItem['changeOrderID.orderNumber']}` : ''
          const orderDate = fireItem['changeOrderID.orderDate'] ? UB.i18n(` від {0}`, AC.dateService.formatDate(fireItem['changeOrderID.orderDate'])) : ''
          fireNumDate = ['MOVE', 'DISM'].includes(empChangeOrderType) ? `${orderTitle}${orderNumber}${orderDate}` : ''
        } else {
          fireNumDate = fireItem['changeOrderID.description'] || ''
        }
      }
      return {
        empName: HR.reportUtils.formatFullName(empItem['employeeID.fullFIO'], false, [' ', '<br/>']),
        birthDate: empItem['employeeID.birthDate'] ? AC.dateService.formatDate(empItem['employeeID.birthDate']) : '',
        basepay: notShowSalary ? 0 : AC.currencyService.round(empItem.accrualSum || 0, config.roundTo === 'numberGroup' ? 0 : 2),
        rankName: rankName,
        acceptNumDate: acceptNumDate,
        fireNumDate: fireNumDate,
        notes: notes,
        isTempVac: isTempVac
      }
    }

    function getData (indexNpp, parentID, level = 1) {
      const result = {
        data: [],
        roundTo: config.roundTo,
        basepay: 0
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
        if (orgItem.mi_unityEntity !== 'hr_department') {
          const posItem = positionData ? _.find(positionData, { mi_data_id: orgItem.mi_data_id }) : undefined
          if (posItem) {
            const empItems = empData.filter(emp => emp.positionID === posItem.mi_data_id && emp.dateFrom <= onDate && emp.dateTo >= onDate)
            if (empItems.length) {
              let empItem = empItems[0]
              let empPosData = getEmpPosData(empItem)
              const resPos = Object.assign(empPosData, {
                indexNum: indexNpp++,
                isDepartment: false,
                isTotal: false,
                name: config.namePosition
                  ? HR.nameCase.cap(posItem['name'] || '')
                  : HR.nameCase.cap(posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || ''),
                pospay: notShowSalary ? 0 : AC.currencyService.round(posItem.accrualSum, config.roundTo === 'numberGroup' ? 0 : 2),
                positionCategorySortOrder: posItem['positionCategory.sortOrder'] || 9999999,
                positionCategory: posItem['positionCategory'] || '',
                positionCategoryName: posItem['positionCategory.name'] || '',
                emp: []
              })
              setConfigData(resPos)
              if (!empPosData.isTempVac) {
                result.basepay += empPosData.basepay
              } else {
                resPos.basepayStr = HR.reportUtils.quantityToString(empPosData.basepay, config.roundTo)
              }

              for (let j = 1; j < empItems.length; j++) {
                empItem = empItems[j]
                empPosData = getEmpPosData(empItem)
                empPosData = Object.assign(empPosData, {
                  pospay: notShowSalary ? 0 : AC.currencyService.round(posItem.accrualSum, config.roundTo === 'numberGroup' ? 0 : 2),
                  positionCategorySortOrder: posItem['positionCategory.sortOrder'] || 9999999,
                  positionCategory: posItem['positionCategory'] || '',
                  positionCategoryName: posItem['positionCategory.name'] || ''
                })
                setConfigData(empPosData)
                if (!empPosData.isTempVac) {
                  result.basepay += empPosData.basepay
                } else {
                  empPosData.basepayStr = HR.reportUtils.quantityToString(empPosData.basepay, config.roundTo)
                }
                resPos.emp.push(empPosData)
              }
              result.data.push(resPos)
            } else {
              const obj = {
                indexNum: indexNpp++,
                isDepartment: false,
                isTotal: false,
                name: config.namePosition
                  ? HR.nameCase.cap(posItem['name'] || '')
                  : HR.nameCase.cap(posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || ''),
                pospay: notShowSalary ? 0 : AC.currencyService.round(posItem.accrualSum, config.roundTo === 'numberGroup' ? 0 : 2),
                basepay: null,
                birthDate: null,
                rankName: '',
                acceptNumDate: null,
                fireNumDate: null,
                notes: null,
                isTempVac: false,
                tempBasePay: null,
                positionCategorySortOrder: 9999999,
                positionCategory: '',
                positionCategoryName: '',
                emp: []
              }
              setConfigData(obj)
              result.data.push(obj)
            }
          }
        } else {
          const obj = {
            name: `${str}${styleBegin}${orgItem.code ? orgItem.code + ' ' : ''}${level === 1 ? (orgItem.name || '').toUpperCase() : HR.nameCase.cap(orgItem.name || '')}${styleEnd}`,
            unitName: `${orgItem.code ? orgItem.code + ' ' : ''}${HR.nameCase.cap(orgItem.name || '')}`,
            isDepartment: true,
            isTotal: false
          }
          setConfigData(obj)
          result.data.push(obj)

          const subTree = getData(indexNpp, orgItem.mi_data_id, level + 1)
          if (subTree && subTree.data && subTree.data.length) {
            indexNpp = subTree.indexNpp || 1
            result.basepay += subTree.basepay
            result.data.push(...subTree.data)

            if (config.showLevelTotals > 0 && (level === config.showLevelTotals || config.showLevelTotals === 2)) {
              const totalObj = {
                mi_data_id: orgItem.mi_data_id,
                name: UB.i18n(`{0}Всього по "{1}"`, str, obj.unitName),
                isDepartment: false,
                isTotal: true,
                basepay: subTree.basepay
              }
              setConfigData(totalObj)
              result.data.push(totalObj)

              if (config.showWokers) {
                const totalObj = {
                  mi_data_id: orgItem.mi_data_id,
                  name: UB.i18n(`{0}в т.ч. робітники`, str),
                  isDepartment: false,
                  isTotal: true,
                  basepay: 0
                }
                setConfigData(totalObj)
                _.forEach(subTree.data, subItem => {
                  if (((subItem.positionCategoryName || '').toLowerCase()).indexOf('робітник') !== -1 && !subItem.isDepartment && !subItem.isTotal) {
                    totalObj.basepay += subItem.basepay + subItem.emp.reduce((res, item) => res + item.basepay, 0)
                  }
                })

                if (totalObj.basepay) {
                  result.data.push(totalObj)
                }
              }
            }
          }
        }
      })

      result.indexNpp = indexNpp
      return result
    }

    let tName = UB.i18n('ВСЬОГО')
    if (organizationID !== itemID) {
      const tObj = _.find(orgStruct, { mi_data_id: itemID })
      tName = tObj && tObj.name ? tObj.name : ''
      tName = UB.i18n(`{0}Всього по {1}`, '', tName)
    }
    const orgTree = getData(1, itemID)
    const totalObj = {
      name: tName,
      empName: '',
      isDepartment: false,
      isTotal: true,
      basepay: orgTree.basepay
    }
    setConfigData(totalObj)
    orgTree.data.push(totalObj)
    if (organizationID !== itemID && config.showWokers) {
      const totalObj = {
        name: UB.i18n(`{0}в т.ч. робітники`, ''),
        isDepartment: false,
        isTotal: true,
        basepay: 0
      }
      setConfigData(totalObj)
      _.forEach(orgTree.data, subItem => {
        if (((subItem.positionCategoryName || '').toLowerCase()).indexOf('робітник') !== -1 && !subItem.isDepartment && !subItem.isTotal) {
          totalObj.basepay += subItem.basepay + subItem.emp.reduce((res, item) => res + item.basepay, 0)
        }
      })

      if (totalObj.basepay) {
        orgTree.data.push(totalObj)
      }
    }

    return orgTree || []
  }
}
