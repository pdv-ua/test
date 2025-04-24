/* global _ UB AC HR appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    if (me.incomeParams && reportParams) {
      // для корректной выгрузки в Excel
      me.incomeParams = reportParams
    }
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    const staffTableID = reportParams.instanceID || 0
    const onDate = reportParams.onDate || appAC.globalApplicationDate()
    const showCurrentAccrual = reportParams.showCurrentAccrual === undefined ? true : reportParams.showCurrentAccrual

    const result = {
      sumPerson: 0,
      numberPerson: 0,
      positions: [],
      cntColumn: showCurrentAccrual ? 5 : 4,
      showCurrentAccrual: showCurrentAccrual
    }

    const staffTableData = await UB.Repository('hr_staffTable')
      .attrs(['orgID', 'orderDate', 'orderState', 'orgID.name', 'orgID.nameGen', 'entryOrderID.entryDate', 'changeListNumber',
        'groupJobsPrint', 'departmentID', 'departmentID.name', 'entryOrderEntryDate', 'accrualChangeKind'])
      .joinCondition('orgID.mi_dateFrom', '<=', onDate)
      .joinCondition('orgID.mi_dateTo', '>=', onDate)
      .joinCondition('orgID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('departmentID.mi_dateFrom', '<=', onDate)
      .joinCondition('departmentID.mi_dateTo', '>=', onDate)
      .joinCondition('departmentID.mi_deleteDate', '>=', '#maxdate')
      .selectById(staffTableID)
    if (!staffTableData) {
      return result
    }

    const organizationID = staffTableData.orgID
    result.organizationName = staffTableData['orgID.name'] || ''
    result.organizationNameGen = staffTableData['orgID.nameGen'] || staffTableData['orgID.name'] || ''
    result.orderDate = staffTableData.orderDate || staffTableData['entryOrderID.entryDate']
    result.entryOrderEntryDate = staffTableData.entryOrderEntryDate || staffTableData.orderDate ? UB.i18n('Вводиться з {0}&nbsp;р.', AC.dateService.formatDate(staffTableData.entryOrderEntryDate || staffTableData.orderDate)) : UB.i18n('Вводиться з') + ' __________________________'
    const departmentID = staffTableData.departmentID || null
    const departments = departmentID ? await HR.orgStructReportUtils.getDepartmentIDs(onDate, [organizationID], departmentID, true) : []

    const orgIDs = [organizationID]
    const orgStruct = await HR.treeUtils.getOrgPlanUnits(staffTableID, [organizationID], onDate, undefined, false, departmentID)
    if (!orgStruct) {
      return result
    }
    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(organizationID)
    result.roundTo = settingsOrg.roundTo

    const posData = await UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID', 'dictPositionID.fullName', 'dictPositionID.name', 'dictStatePayID',
        'positionType', 'quantity', 'mi_dateTo'])
      .where('orgID', 'in', orgIDs)
      .where('liquidate', '=', 0)
      .where('mi_dateFrom', '<=', onDate, 'dateFrom')
      .where('mi_dateTo', '>=', onDate, 'dateTo')
      .where('state', '=', 'ACTIVE', 'active')
      .where('staffOrderID', '=', staffTableID, 'order')
      .notExists(UB.Repository('hr_staffUnit')
        .correlation('mi_data_id', 'mi_data_id')
        .where('staffOrderID', '=', staffTableID)
        .where('mi_deleteDate', '>=', '#maxdate'),
      'notExist')
      .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
      .misc({ __mip_recordhistory_all: true })
      .orderBy('treePath')
      .selectAsObject()

    const accrualData = await UB.Repository('hr_staffTableAccrual')
      .attrs(['dictPositionID', 'dictStatePayID', 'positionType', 'accrualSum', 'staffTableAccrualID', 'positionID', 'previousAccrualSum'])
      .where('staffTableID', '=', staffTableID)
      .where('accrualSum', '>', 0)
      .selectAsObject()

    const oldOnDate = ((staffTableData.orderState || '') === 'POSTED') ? AC.dateService.addDays(onDate, -1) : onDate
    const empData = await UB.Repository('hr_employeePositionS')
      .attrs(['positionID', 'tabNum', 'employeeID.fullFIO', 'dateFrom', 'dateTo', 'accrualSum'])
      .where('isActive', '=', true)
      .where('employeeID.mi_deleteDate', '>=', '#maxdate')
      .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .where('employeeNumberID.dateTo', '>=', onDate) // чтобы не было уволенных
      .where('dateFrom', '<=', oldOnDate)
      .where('dateTo', '>=', oldOnDate)
      .whereIf(departments.length, 'departmentID', 'in', departments)
      .selectAsObject()

    const oldOrgStruct = ((staffTableData.orderState || '') === 'POSTED') ? await UB.Repository('hr_staffUnit')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'code', 'name', 'mi_unityEntity', 'accrualSum', 'liquidate', 'mi_treePath',
        'staffOrderID', 'quantity', 'state'])
      .where('orgID', '=', organizationID)
      .where('mi_dateFrom', '<=', oldOnDate)
      .where('mi_dateTo', '>=', oldOnDate)
      .where('state', '=', 'ACTIVE')
      .where('liquidate', '=', 0)
      .orderBy('treePath')
      .selectAsObject() : []

    const data = staffTableData.accrualChangeKind !== 'SKIP'
      ? me.generateDataForReport(staffTableID, departmentID || organizationID, departmentID ? staffTableData['departmentID.name'] || '' : result.organizationName,
        orgStruct, posData, empData, accrualData, result.orderDate,
        (staffTableData.orderState || '') === 'POSTED', oldOrgStruct, result.roundTo, result.cntColumn, result.showCurrentAccrual, staffTableData.accrualChangeKind)
      : {
        data: [],
        accrualSum: 0
      }
    result.positions = data.positions || []
    result.sumPersonStr = HR.reportUtils.quantityToString(data.sumPerson, result.roundTo)
    result.sumPerson = data.sumPerson
    result.numberPerson = data.numberPerson
    return result
  },
  generateDataForReport: function (staffTableID, organizationID, organizationName, orgStruct, posData, empData, accrualData,
    dateFrom, posted, oldOrgStruct, roundTo, cntColumn, showCurrentAccrual, accrualChangeKind) {
    function getPosItems (posItems) {
      const result = {
        data: [],
        accrualSum: 0
      }

      const currDate = appAC.globalApplicationDate()
      if (posItems.length) {
        for (let i = 0; i < posItems.length; i++) {
          const posName = posItems[i]['dictPositionID.fullName'] || posItems[i]['dictPositionID.name'] || ''
          let orgItem = orgStruct ? _.find(orgStruct, { mi_data_id: posItems[i].mi_data_id }) : undefined

          let posItemsID = posItems[i].ID
          if (posted) {
            orgItem = oldOrgStruct ? _.find(oldOrgStruct, { mi_data_id: posItems[i].mi_data_id }) || orgItem : orgItem
            posItemsID = orgItem.ID || posItemsID
          }

          let accrualItem = accrualData.find(item => item.dictPositionID === posItems[i].dictPositionID &&
            item.positionID === posItemsID && item.staffTableAccrualID &&
            ((posItems[i].dictStatePayID && item.dictStatePayID === posItems[i].dictStatePayID && item.positionType === posItems[i].positionType) ||
              (!posItems[i].dictStatePayID && !item.dictStatePayID && item.positionType === posItems[i].positionType)))

          accrualItem = accrualItem || accrualData.find(item => item.dictPositionID === posItems[i].dictPositionID &&
            !item.staffTableAccrualID &&
            ((posItems[i].dictStatePayID && item.dictStatePayID === posItems[i].dictStatePayID && item.positionType === posItems[i].positionType) ||
              (!posItems[i].dictStatePayID && !item.dictStatePayID && item.positionType === posItems[i].positionType)))

          orgItem.accrualSum = orgItem.accrualSum || 0 // if old value is null
          if (accrualItem && _.isNumber(accrualItem.accrualSum) && _.isNumber(orgItem.accrualSum) && accrualItem.accrualSum !== orgItem.accrualSum) {
            const empItems = empData.filter(e => e.positionID === posItems[i].mi_data_id /*&& e.accrualSum === (orgItem.accrualSum || 0)*/)
            empItems.forEach(emp => {
              if (accrualChangeKind === 'ALL' || emp.accrualSum === orgItem.accrualSum || 0) {
                const obj = {
                  cntColumn: cntColumn,
                  showCurrentAccrual: showCurrentAccrual,
                  roundTo: roundTo,
                  nameDep: HR.nameCase.cap(posName),
                  name: HR.nameCase.cap(emp['employeeID.fullFIO']),
                  dateFrom: dateFrom && emp.dateFrom && emp.dateFrom > dateFrom ? AC.dateService.formatDate(emp.dateFrom) : '',
                  dateTo: dateFrom && emp.dateTo && emp.dateTo > dateFrom && emp.dateTo < currDate ? AC.dateService.formatDate(emp.dateTo) : '',
                  // dateTo: !emp.dateTo || (emp.dateTo && AC.dateService.formatDate(emp.dateTo) === '31.12.9999') ? '' : AC.dateService.formatDate(emp.dateTo),
                  previousAccrualSum: accrualItem.previousAccrualSum || 0,
                  oldValue: orgItem.accrualSum || 0,
                  newValue: accrualItem.accrualSum || 0
                }
                if (obj.dateTo && emp.dateFrom) {
                  obj.dateFrom = dateFrom > emp.dateFrom ? AC.dateService.formatDate(dateFrom) : AC.dateService.formatDate(emp.dateFrom)
                }
                result.data.push(obj)
                result.accrualSum += obj.newValue
              }
            })
          }
        }
      }
      return result
    }

    function getData (parentID, parentName) {
      const result = {
        positions: [],
        numberPerson: 0,
        sumPerson: 0
      }
      const positems = posData.filter(pos => pos.parentUnitID === parentID)
      if (positems.length) {
        const obj = getPosItems(positems)
        if (obj && obj.data.length) {
          result.positions.push({
            department: parentName || '',
            total: obj.data.length,
            items: obj.data
          })
          result.numberPerson += obj.data.length
          result.sumPerson += obj.accrualSum
        }
      }
      const curStruct = orgStruct.filter(orgItem => orgItem.parentUnitID === parentID)
      curStruct.forEach(orgItem => {
        if (orgItem.mi_unityEntity !== 'hr_position') {
          const subData = getData(orgItem.mi_data_id, orgItem.name)
          result.positions.push(...subData.positions)
          result.numberPerson += subData.numberPerson
          result.sumPerson += subData.sumPerson
        }
      })
      return result
    }

    return getData(organizationID, organizationName)
  }
}
