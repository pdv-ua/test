/* global Ext _ UB $App AC HR UBS */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    const onDate = reportParams.onDate || AC.dateService.todayDate()
    const result = {
      onDateStr: AC.dateService.getStringFormatDate(onDate, '', '', UB.i18n(' р.')),
      onDate: onDate.toString(),
      organizationID: reportParams.organizationID || 0,
      departmentID: reportParams.departmentID || 0,
      roundTo: (reportParams.roundTo || 0) <= 0 ? 'numberGroup' : 'decimal2',
      data: [],
      organizationNameDat: '',
      monthName: AC.dateService.formatDate(onDate, 'mmmm')
    }
    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(reportParams.organizationID)
    result.roundToQuantity = settingsOrg.roundToQuantity
    result.hrFuncOrgType = settingsOrg.hrFuncOrgType || ''
    result.orgType2 = settingsOrg.hrFuncOrgType === '2' // Державна служба

    const onDate4Sql = AC.dateService.shiftDate(onDate)
    const orgData = await UB.Repository('hr_organization')
      .attrs(['name', 'nameDat', 'mi_treePath', 'mi_data_id'])
      .whereIf(reportParams.includeChildOrgs, 'mi_treePath', 'like', `/${reportParams.organizationID}/`)
      .whereIf(!reportParams.includeChildOrgs, 'mi_data_id', '=', reportParams.organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate4Sql })
      .selectAsObject()
    if (orgData.length) {
      orgData.forEach(orgDataItem => {
        if (orgDataItem.mi_data_id === reportParams.organizationID) {
          result.organizationName = orgDataItem.name || ''
        }
        orgDataItem.organizationNameDat = orgDataItem.nameDat || orgDataItem.name ? UB.i18n(' по ') + (orgDataItem.nameDat || orgDataItem.name).toUpperCase() : ''
      })
    } else {
      return result
    }
    const childOrgIDs = orgData.map(itm => itm.mi_data_id)

    result.departmentName = reportParams.departmentID ? await UB.Repository('hr_department')
      .attrs(['name'])
      .where('mi_data_id', '=', reportParams.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate4Sql })
      .selectScalar() : ''

    let orgStruct = UB.Repository('hr_staffUnit')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'code', 'name', 'mi_unityEntity', 'orgID'])
      .where('state', '=', 'ACTIVE')
      .where('mi_dateFrom', '<=', reportParams.onDate)
      .where('mi_dateTo', '>=', reportParams.onDate)
      .whereIf(childOrgIDs.length <= 1, 'orgID', '=', reportParams.organizationID)
      .whereIf(childOrgIDs.length > 1, 'orgID', 'in', childOrgIDs)
      .orderBy('idxNum')
    if (reportParams.departmentID) {
      orgStruct
        .where('mi_treePath', 'like', '/' + reportParams.departmentID + '/', 'u1')
        .where('mi_data_id', '=', reportParams.departmentID, 'u2')
        .logic('([u1] or [u2])')
    }
    orgStruct = await orgStruct.selectAsObject()

    if (!orgStruct) {
      return result
    }

    let posVacData = []
    for (let i = 0; i < orgData.length; i++) {
      const posVacObj = await $App.connection.run({
        entity: 'hr_positionVac',
        method: 'selectVacanciesWithVacFrom',
        dictFundSourceID: undefined,
        orgID: orgData[i].mi_data_id, // reportParams.organizationID,
        departmentID: reportParams.departmentID,
        onDate: reportParams.onDate
      })
      const posVacDataByOrg = JSON.parse(posVacObj.resultData)
      if (posVacDataByOrg.length) {
        posVacData.push(...posVacDataByOrg)
      }
    }
    posVacData = posVacData ? _.groupBy(posVacData, 'mi_data_id') : {}

    const employeeData = await UB.Repository('hr_employeePositionS')
      .attrs(['employeeNumberID', 'departmentID', 'positionID', 'mtCount', 'organizationID'])
      .where('dateFrom', '<=', onDate4Sql)
      .where('dateTo', '>=', onDate4Sql)
      .where('isActive', '=', true)
      .whereIf(childOrgIDs.length <= 1, 'organizationID', '=', reportParams.organizationID)
      .whereIf(childOrgIDs.length > 1, 'organizationID', 'in', childOrgIDs)
      .where('employeeID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()

    let posData4AllCateg = UB.Repository('hr_position')
      .attrs(['mi_data_id', 'parentUnitID', 'quantity', 'mi_dateFrom', 'mi_dateTo', 'orgID'])
      .attrsIf(result.orgType2, ['positionType', 'positionType.name', 'psCategory', 'psCategory.name'])
      .attrsIf(!result.orgType2, ['dictStaffCatID', 'dictStaffCatID.name', 'dictStaffCatID.code'])
      .whereIf(childOrgIDs.length <= 1, 'orgID', '=', reportParams.organizationID)
      .whereIf(childOrgIDs.length > 1, 'orgID', 'in', childOrgIDs)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_recordhistory_all: true })
    if (result.orgType2) {
      posData4AllCateg
        .where('positionType', '=', '1', 'isStateWorker')
        .where('positionType', '!=', '1', 'isNotStateWorker')
        .where('positionType.mi_deleteDate', '>=', '#maxdate')
        .where('psCategory', 'isNotNull', undefined, 'categIsNotNull')
        .logic('(([isStateWorker] AND [categIsNotNull]) OR ([isNotStateWorker]))')
    }
    posData4AllCateg = await posData4AllCateg.selectAsObject()

    const positionData = posData4AllCateg.filter(posItem => posItem.mi_dateFrom <= onDate4Sql && posItem.mi_dateTo >= onDate4Sql)
    const positionIDs = _.uniq(positionData.map(e => e.mi_data_id))
    // поищем ликвидированные посады, на которых есть назначения
    const LiqPositionIDs = _.uniq(employeeData.filter(e => e.positionID && !positionIDs.includes(e.positionID)).map(e => e.positionID))
    LiqPositionIDs.forEach(posItemID => {
      const posItem = _.find(posData4AllCateg, el => el.mi_data_id === posItemID)
      if (posItem) {
        // ликвидированные посады не учитываем quantity
        posItem.liq = true
        posItem.quantity = 0
        positionData.push(posItem)
      }
    })

    /* Для посад не державного службовця групувати дані по типу positionType без psCategory */
    let posData = []
    positionData.forEach(posItem => {
      const vacItems = posVacData[posItem.mi_data_id]
      posItem.vacCount = vacItems ? vacItems.reduce((result, item) => (result + item.vacCount > 0 ? item.vacCount : 0), 0) : 0

      let existedItem = !result.orgType2
        ? posData.find(itm => itm.parentUnitID === posItem.parentUnitID && itm.dictStaffCatID === posItem.dictStaffCatID)
        : posItem.positionType === '1'
          ? posData.find(itm => itm.parentUnitID === posItem.parentUnitID && itm.positionType === posItem.positionType && itm.psCategory === posItem.psCategory)
          : posData.find(itm => itm.parentUnitID === posItem.parentUnitID && itm.positionType === posItem.positionType)

      if (!existedItem) {
        posData.push({
          orgID: posItem.orgID,
          name: result.orgType2
            ? (posItem.positionType === '1' ? posItem['psCategory.name'] : posItem['positionType.name'])
            : (posItem['dictStaffCatID.name'] || UB.i18n('Не визначено')),
          parentUnitID: posItem.parentUnitID,
          positionType: result.orgType2 ? posItem.positionType : null,
          psCategory: result.orgType2 ? posItem.psCategory : null,
          dictStaffCatID: result.orgType2 ? null : posItem.dictStaffCatID,
          dictStaffCatCode: result.orgType2 ? null : posItem['dictStaffCatID.code'],
          quantity: posItem.quantity,
          vacCount: posItem.vacCount,
          ids: [posItem.mi_data_id]
        })
      } else {
        existedItem.quantity += posItem.quantity
        existedItem.vacCount += posItem.vacCount
        existedItem.ids.push(posItem.mi_data_id)
      }
    })
    posData = result.orgType2 ? _.sortBy(posData, ['positionType', 'psCategory']) : _.sortBy(posData, 'dictStaffCatCode')

    /*
    let empPosData = await $App.connection.run({
      entity: 'hr_reportOrgcountsByCateg',
      method: 'getGrouppedByParentUnitAndCategData',
      orgs: [reportParams.organizationID],
      onDate: onDate4Sql
    })
    empPosData = JSON.parse(empPosData.resultData)
    */

    const limitedAccess = !!reportParams.departmentID && !AC.entityUtils.verifyRightsMethod('hr_employeeNumber', 'employeeLimitedAccess')
    for (let i = 0; i < orgData.length; i++) {
      const employeeDataByOrg = employeeData.filter(el => el.organizationID === orgData[i].mi_data_id)
      let employeeNumberIDs = _.compact(_.uniq(employeeDataByOrg.map(el => el.employeeNumberID)))
      let accrualData = []
      const dFrom = AC.dateService.firstDayOfMonth(onDate)
      const dTo = AC.dateService.lastDayOfMonth(onDate)
      if (employeeNumberIDs.length) {
        employeeNumberIDs = _.chunk(employeeNumberIDs, 1000)
        for (let i = 0; i < employeeNumberIDs.length; i++) {
          const ids = employeeNumberIDs[i]
          const accruals = await UB.Repository('hr_accrual')
            .attrs(['sum([paySum])', 'employeeNumberID', 'employeeNumberID.limitedAccess'])
            .where('periodCalc', '>=', dFrom, 'pc1')
            .where('periodCalc', '<=', dTo, 'pc2')
            .where('periodSalary', '<=', dTo, 'pc3')
            .where('periodSalary', '>=', dFrom, 'ps1')
            .where('periodSalary', '<=', dTo, 'ps2')
            .where('periodCalc', '<', dFrom, 'ps3')
            .logic('(([pc1] and [pc2] and [pc3]) or ([ps1] and [ps2] and [ps3]))')
            .where('employeeNumberID', 'in', ids)
            .where('employeeNumberID.orgID', '=', orgData[i].mi_data_id)
            .where('flagsRecSum', '!=', 8192)
            .whereIf(limitedAccess, 'employeeNumberID.limitedAccess', '=', 0) // limitedAccess
            .exists(UB.Repository('hr_idParam')
              .correlation('valuesID', 'payElID')
              .where('listParamID.code', 'in', ['FOZP', 'FDZP', 'ZKV'])
              .where('listParamID.tableName', '=', 'hr_payEl')
              .where('orgID', '=', reportParams.organizationID)
              .where('mi_deleteDate', '>=', '#maxdate'))
            .groupBy(['employeeNumberID', 'employeeNumberID.limitedAccess'])
            .selectAsObject({
              'sum([paySum])': 'paySum',
              'employeeNumberID.limitedAccess': 'limitedAccess'
            })
          if (accruals && accruals.length) {
            accrualData.push(...accruals)
          }
        }
      }

      const parametrs = {
        orgID: orgData[i].mi_data_id,
        dateFrom: onDate4Sql,
        dateTo: onDate4Sql,
        avgCount: true,
        departmentID: reportParams.departmentID,
        includeChildDepts: true
      }
      const query = {
        entity: 'hr_report',
        method: 'getAvgListEmpCount',
        params: JSON.stringify(parametrs)
      }

      const [
        { resultData: aList }
      ] = await UB.connection.runTransAsObject([query])

      const avgListData = aList && aList.length ? JSON.parse(aList) : undefined
      employeeDataByOrg.forEach(empPosItem => {
        empPosItem.cnt = 0
        if (avgListData && avgListData.employeeNumbers[empPosItem.employeeNumberID]) {
          empPosItem.cnt = avgListData.employeeNumbers[empPosItem.employeeNumberID].dayCount || 0
        }
        empPosItem.paySum = 0
        if (empPosItem.cnt > 0 && accrualData[empPosItem.employeeNumberID]) {
          empPosItem.paySum = accrualData[empPosItem.employeeNumberID].reduce((result, item) => (result + item.paySum || 0), 0)
        }
      })

      const data = me.generateDataForReport(reportParams.departmentID || orgData[i].mi_data_id, orgData[i].mi_data_id,
        reportParams.departmentID ? (result.departmentName || '').toUpperCase() : orgData[i].organizationNameDat,
        orgStruct.filter(el => el.orgID === orgData[i].mi_data_id),
        posData.filter(el => el.orgID === orgData[i].mi_data_id),
        employeeDataByOrg, result.roundTo, result.roundToQuantity)
      if (data && data.length) {
        result.data.push(...data)
      }
    }
    return result
  },
  onReportClick: function (e) {
    const cellInfo = UBS.UBReport.cellInfo(e)
    const organizationID = cellInfo.row.dataset.organizationid ? parseInt(cellInfo.row.dataset.organizationid, 10) : 0
    const onDate = new Date(cellInfo.table.dataset.ondate)
    const orgType2 = cellInfo.table.dataset.hrfuncorgtype === '2'
    const rowType = cellInfo.row.dataset.rowtype ? parseInt(cellInfo.row.dataset.rowtype, 10) : 0

    drillDown(orgType2, rowType, onDate, organizationID, e.target.dataset.depts, e.target.dataset.depid,
      e.target.dataset.col, e.target.dataset.postype, e.target.dataset.categ, e.target.dataset.staffcat)
    e.preventDefault()
  },
  onParamPanelConfig: function () {
    const accMainReportsSubOrg = AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')

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
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getOrgCombo({
                  labelWidth: 140,
                  width: 700,
                  readOnly: !accMainReportsSubOrg,
                  orgFilter: accMainReportsSubOrg ? 'WITH_CHILDS' : 'CURRENT',
                  listeners: {
                    change: function (ctrl) {
                      const form = ctrl.up('form')
                      const departmentID = form.down('[name=departmentID]')
                      const orgID = ctrl.getValue()
                      const depWhereList = [
                        ['orgID', '=', orgID || 0],
                        ['state', '=', 'ACTIVE']
                      ]
                      AC.viewUtils.setWhereListProperty(departmentID, depWhereList, null, ['clearStore', 'clearWhereList', 'clearValue'])
                      departmentID.setDisabled(!orgID)
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
                  labelWidth: 140,
                  width: 700,
                  displayField: 'description'
                })
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  labelWidth: 140,
                  width: 260,
                  fieldLabel: UB.i18n('Станом на'),
                  value: AC.dateService.todayDate()
                },
                HR.reportUtils.roundToCombo({ labelWidth: 140, width: 320 })
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const roundTo = frm.findField('roundToCombo').getValue()
        return {
          organizationID: frm.findField('organizationID').getValue() || 0,
          includeChildOrgs: frm.findField('includeChildOrgs').getValue() || false,
          departmentID: frm.findField('departmentID').getValue() || 0,
          onDate: AC.dateService.shiftDate(frm.findField('onDate').getValue() || AC.dateService.todayDate()),
          roundTo: (roundTo === undefined) ? 2 : roundTo
        }
      }
    })
    return paramForm
  },

  getPositions: function (organizationID, orgItemID, posData, employeeData, roundTo, roundToQuantity) {
    const result = {
      data: [],
      quantity: 0,
      vacCount: 0,
      empCount: 0,
      empCalcCount: 0,
      fundFact: 0
    }
    const posItems = posData.filter(pos => pos.parentUnitID === orgItemID)
    const empUnitCntData = organizationID === orgItemID
      ? employeeData.filter(item => !item.departmentID)
      : employeeData.filter(item => item.departmentID === orgItemID)

    posItems.forEach(posItem => {
      // const isStateWorker = posItem.positionType === '1'
      const quantity = !roundToQuantity ? posItem.quantity || 0 : AC.currencyService.round(posItem.quantity || 0, roundToQuantity === 'numberGroup' ? 0 : roundToQuantity === 'decimal1' ? 1 : 2)
      let empCount = 0
      let empCalcCount = 0
      let fundFact = 0
      if (posItem.dictStaffCatID || posItem.positionType || posItem.psCategory) {
        const empCntItem = empUnitCntData.filter(el => posItem.ids.indexOf(el.positionID) !== -1)
        if (empCntItem) {
          empCount = empCntItem.reduce((result, item) => (result + item.mtCount || 0), 0)
          fundFact = empCntItem.reduce((result, item) => (result + item.paySum), 0)
          empCalcCount = empCntItem.reduce((result, item) => (result + item.cnt), 0)
          empCalcCount = !roundToQuantity ? empCalcCount || 0 : AC.currencyService.round(empCalcCount || 0, roundToQuantity === 'numberGroup' ? 0 : roundToQuantity === 'decimal1' ? 1 : 2)
        }
      }
      const resItem = {
        organizationID,
        rowType: 3,
        font: '',
        roundTo: roundTo,
        code: '',
        name: posItem.name,
        quantity: quantity,
        vacCount: !roundToQuantity ? posItem.vacCount || 0 : AC.currencyService.round(posItem.vacCount || 0, roundToQuantity === 'numberGroup' ? 0 : roundToQuantity === 'decimal1' ? 1 : 2),
        empCount: empCount,
        empCalcCount: empCalcCount,
        fundFact: fundFact,
        depID: orgItemID,
        deptIDs: [orgItemID],
        parentUnitID: orgItemID || 0,
        positionType: posItem.positionType || '0',
        psCategory: posItem.psCategory || '0',
        dictStaffCatID: posItem.dictStaffCatID,
        roundToEmpCalcCount: 'decimal3'
      }
      result.data.push(resItem)

      result.quantity += resItem.quantity
      result.vacCount += resItem.vacCount
      result.empCount += resItem.empCount
      result.empCalcCount += resItem.empCalcCount
      result.fundFact += resItem.fundFact
    })
    result.roundToEmpCalcCount = 'decimal3' // roundToQuantity || HR.reportUtils.getQuantityFractional(result.empCalcCount)
    return result
  },

  generateDataForReport: function (itemID, organizationID, name, orgStruct, posData, employeeData, roundTo, roundToQuantity) {
    const me = this
    if (!orgStruct || !orgStruct.length) return []

    function getData (parentID, level = 1, orgStructTree) {
      const result = {
        deptIDs: [],
        data: [],
        quantity: 0,
        vacCount: 0,
        empCount: 0,
        empCalcCount: 0,
        fundFact: 0
      }
      if (!orgStructTree || !orgStructTree.length) return result

      const curStruct = orgStructTree.filter(el => el.parentUnitID === parentID)
      const str = level === 1 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)
      const styleBegin = level === 2 ? '<u>' : ''
      const styleEnd = level === 2 ? '</u>' : ''

      curStruct.forEach(orgItem => {
        if (orgItem.mi_unityEntity === 'hr_department') {
          const obj = {
            organizationID,
            rowType: 2,
            roundTo: roundTo,
            font: 'font-weight: bold; ' + (level === 1 ? 'color: blue;' : ''),
            code: orgItem.idxNum,
            name: orgItem.name ? `${str}${styleBegin}${orgItem.code} ${level === 1 ? orgItem.name.toUpperCase() : HR.nameCase.cap(orgItem.name)}${styleEnd}` : '',
            depID: orgItem.mi_data_id,
            deptIDs: [orgItem.mi_data_id],
            parentUnitID: parentID,
            quantity: 0,
            vacCount: 0,
            empCount: 0,
            empCalcCount: 0,
            fundFact: 0
          }
          result.data.push(obj)

          const posInfo = me.getPositions(organizationID, orgItem.mi_data_id, posData, employeeData, roundTo, roundToQuantity)
          obj.quantity += posInfo.quantity
          obj.vacCount += posInfo.vacCount
          obj.empCount += posInfo.empCount
          obj.empCalcCount += posInfo.empCalcCount
          obj.fundFact += posInfo.fundFact
          result.data.push(...posInfo.data)

          const subTree = getData(orgItem.mi_data_id, level + 1, orgStructTree)
          if (subTree && subTree.data && subTree.data.length) {
            result.data.push(...subTree.data)
            obj.quantity += subTree.quantity
            obj.vacCount += subTree.vacCount
            obj.empCount += subTree.empCount
            obj.empCalcCount += subTree.empCalcCount
            obj.fundFact += subTree.fundFact
            obj.deptIDs.push(...subTree.deptIDs)
          }
          obj.roundToEmpCalcCount = 'decimal3'

          result.quantity += obj.quantity
          result.vacCount += obj.vacCount
          result.empCount += obj.empCount
          result.empCalcCount += obj.empCalcCount
          result.fundFact += obj.fundFact
          result.deptIDs.push(...obj.deptIDs)
        }
      })

      return result
    }

    const data = []
    let tree
    // должности, которые на прямую подчиняются организации/подразделению выводим первым в отчете
    const item = itemID === organizationID ? undefined : orgStruct.find(el => el.mi_data_id === itemID)

    const totalObj = {
      organizationID,
      rowType: itemID === organizationID ? 1 : 2,
      isTotal: itemID === organizationID,
      roundTo: roundTo,
      font: 'font-weight: bold; color: blue;',
      code: itemID !== organizationID && item ? item.idxNum : '',
      name: (itemID === organizationID ? UB.i18n('ВСЬОГО') : '') + name,
      depID: itemID === organizationID ? undefined : itemID,
      deptIDs: itemID === organizationID ? [] : [itemID],
      parentUnitID: organizationID,
      quantity: 0,
      vacCount: 0,
      empCount: 0,
      empCalcCount: 0,
      fundFact: 0
    }
    data.push(totalObj)

    const posInfo = me.getPositions(organizationID, itemID, posData, employeeData, roundTo, roundToQuantity)
    totalObj.quantity += posInfo.quantity
    totalObj.vacCount += posInfo.vacCount
    totalObj.empCount += posInfo.empCount
    totalObj.empCalcCount += posInfo.empCalcCount
    totalObj.fundFact += posInfo.fundFact
    data.push(...posInfo.data)

    tree = getData(itemID, itemID === organizationID ? 1 : 2, orgStruct.filter(el => !(el.parentUnitID === organizationID && el.mi_unityEntity === 'hr_position')))
    data.push(...tree.data)
    totalObj.quantity += tree.quantity
    totalObj.vacCount += tree.vacCount
    totalObj.empCount += tree.empCount
    totalObj.empCalcCount += tree.empCalcCount
    totalObj.fundFact += tree.fundFact
    totalObj.roundToEmpCalcCount = 'decimal3'
    if (itemID !== organizationID) {
      totalObj.deptIDs.push(...tree.deptIDs)
    }

    return data
  }

}

function drillDown (orgType2, rowType, onDate, orgID, deptIDs, depid, col, positionType, psCategory, dictStaffCatID) {
  onDate = AC.dateService.shiftDate(onDate)
  const deptIDList = deptIDs ? AC.dataService.getNumberArray(deptIDs) : [0]
  const whereList = {}

  if (rowType > 1) {
    if (deptIDs) {
      whereList.parentUnitID = {
        expression: '[parentUnitID]',
        condition: 'in',
        values: { value: deptIDList }
      }
    }

    if (rowType > 2) {
      if (orgType2) {
        if (positionType) {
          whereList.positionType = {
            expression: '[positionType]',
            condition: '=',
            values: { value: positionType }
          }
        }
        if (positionType === '1') {
          whereList.psCategory = {
            expression: '[psCategory]',
            condition: '=',
            values: { value: psCategory }
          }
        }
      } else {
        whereList.dictStaffCatID = {
          expression: '[dictStaffCatID]',
          condition: dictStaffCatID ? '=' : 'isNull',
          values: { value: dictStaffCatID }
        }
      }
    }
  }

  let notZeroFields
  switch (col) {
    case '3':
      notZeroFields = ['quantity']
      break
    case '4':
      notZeroFields = ['vacCount']
      break
    case '5':
      notZeroFields = ['mtCount']
      break
  }
  const toShowEmpData = true // ['5'].includes(col)
  // const toShowVacMtCount = ['4', '5'].includes(col)
  $App.doCommand({
    cmdType: 'showList',
    isModal: true,
    description: UB.i18n(`Перелік посад та працівників станом на {0}`, AC.dateService.formatDate(onDate)),
    hideActions: ['addNew', 'addNewByCurrent', 'del', 'edit', 'itemSelect'],
    cmdData: {
      params: [{
        entity: 'hr_reportOrgcountsByCateg',
        method: 'selectEmpPosData',
        fieldList: [
          { name: 'idxNum', description: UB.i18n('№ з/п'), config: { align: 'center', width: 80 } },
          { name: 'name', description: UB.i18n('Назва структурного підрозділу та посади'), config: { width: toShowEmpData ? 300 : 500 } },
          { name: 'quantity', description: UB.i18n('Кількість посад'), config: { align: 'center', width: 140 }, format: '0.00' },
          { name: 'vacCount', description: UB.i18n('Вакантних ставок'), config: { align: 'center', width: 140 }, format: '0.00' },
          { name: 'mtCount', description: UB.i18n('Зайнятих ставок'), config: { align: 'center', width: 140 }, format: '0.00' },
          { name: 'shortFIO', description: UB.i18n('Прізвище, ім’я, по батькові'), config: { width: 200 } },
          { name: 'fundSum', description: UB.i18n('Фонд заробітної плати'), config: { align: 'right', width: 180 } }
        ],
        whereList: whereList,
        orgs: [orgID],
        depts: deptIDList,
        depid: depid,
        onDate: onDate,
        notZeroFields: notZeroFields,
        isCateg: rowType === 3,
        toSumMtCount: col === '4'
      }]
    },
    cmpInitConfig: {
      dfm: {
        size: {
          width: 1200,
          height: 600
        }
      },
      sortableColumns: false,
      enableColumnHide: false,
      disableSearchBar: true,
      afterInit: function () {
        const grid = this
        AC.gridUtils.tuneGridColumns(grid, {
          fundSum: {
            renderer: AC.gridUtils.rendererToCurrency
          }
        })
      },
      optimizeColumnWidth: function () {
        // eslint-disable-next-line no-unused-expressions
        /!* do nothing for manual column width tunning *!/
      },
      /* cancel context menu */
      onItemContextMenu: function (grid, record, item, index, event) {
        event.stopEvent()
      }
    }
  })
}
