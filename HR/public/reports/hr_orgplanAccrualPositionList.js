/* global _ UB AC HR appAC Ext */
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
    const staffTableID = reportParams.instanceID || 0
    const onDate = reportParams.onDate || appAC.globalApplicationDate()
    const showCurrentAccrual = reportParams.showCurrentAccrual === undefined ? true : reportParams.showCurrentAccrual

    const result = {
      appDate: AC.dateService.formatDate(appAC.globalApplicationDate()),
      numberPositions: 0,
      positions: [],
      colSpan: showCurrentAccrual ? 5 : 4,
      showCurrentAccrual: showCurrentAccrual
    }

    const staffTableData = await UB.Repository('hr_staffTable')
      .attrs(['orgID', 'orderDate', 'orderState', 'orgID.name', 'orgID.nameGen', 'entryOrderID.entryDate', 'changeListNumber',
        'groupJobsPrint'])
      .joinCondition('orgID.mi_dateFrom', '<=', onDate)
      .joinCondition('orgID.mi_dateTo', '>=', onDate)
      .joinCondition('orgID.mi_deleteDate', '>=', '#maxdate')
      .selectById(staffTableID)
    if (!staffTableData) {
      return result
    }

    const organizationID = staffTableData.orgID
    result.organizationName = staffTableData['orgID.name'] || ''
    result.organizationNameGen = staffTableData['orgID.nameGen'] || staffTableData['orgID.name'] || ''
    result.orderDate = staffTableData.orderDate || staffTableData['entryOrderID.entryDate']

    const orgIDs = [organizationID]
    const orgStruct = await HR.treeUtils.getOrgPlanUnits(staffTableID, [organizationID], onDate)
    if (!orgStruct) {
      return result
    }
    const orgStructForAppDate = await HR.treeUtils.getOrgPlanUnits(staffTableID, [organizationID], appAC.globalApplicationDate())

    const posData = await UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID', 'dictPositionID.fullName', 'dictPositionID.name', 'dictStatePayID',
        'positionType', 'quantity'])
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
      .selectAsObject()

    const oldOnDate = ((staffTableData.orderState || '') === 'POSTED') ? AC.dateService.addDays(onDate, -1) : onDate
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

    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(organizationID)
    result.roundTo = settingsOrg.roundTo

    const orgStruct1 = orgStruct.filter(orgItem => orgItem.parentUnitID === organizationID)
    const orgStructForAppDate1 = orgStructForAppDate.filter(orgItem => orgItem.parentUnitID === organizationID)
    const rootPos = posData.filter(pos => pos.parentUnitID === organizationID)
    if (rootPos.length) {
      const rootPosObjs = getPosItems(rootPos, orgStruct1, accrualData, result.orderDate, orgStructForAppDate1, result.roundTo, (staffTableData.orderState || '') === 'POSTED', oldOrgStruct)
      if (rootPosObjs && rootPosObjs.length) {
        result.positions.push({
          colSpan: result.colSpan,
          showCurrentAccrual: result.showCurrentAccrual,
          department: result.organizationName,
          total: rootPosObjs.length,
          items: rootPosObjs
        })
        result.numberPositions += rootPosObjs.length
      }
    }

    for (let i = 0; i < orgStruct1.length; i++) {
      const orgUnit1 = orgStruct1[i]
      const orgUnits1 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit1.mi_data_id)
      const orgStructForAppDate1 = orgStructForAppDate.filter(orgItem => orgItem.parentUnitID === orgUnit1.mi_data_id)
      const posItems1 = posData.filter(pos => pos.parentUnitID === orgUnit1.mi_data_id)
      if (orgUnits1.length || posItems1.length || (orgUnit1.staffOrderID === staffTableID && orgUnit1.mi_unityEntity !== 'hr_position')) {
        const posItemObjs1 = getPosItems(posItems1, orgUnits1, accrualData, result.orderDate, orgStructForAppDate1, result.roundTo, (staffTableData.orderState || '') === 'POSTED', oldOrgStruct)
        if (posItemObjs1 && posItemObjs1.length) {
          result.positions.push({
            colSpan: result.colSpan,
            showCurrentAccrual: result.showCurrentAccrual,
            department: orgUnit1.name || '',
            total: posItemObjs1.length,
            items: posItemObjs1
          })
          result.numberPositions += posItemObjs1.length
        }

        for (let j = 0; j < orgUnits1.length; j++) {
          const orgUnit2 = orgUnits1[j]
          const orgUnits2 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit2.mi_data_id)
          const orgStructForAppDate2 = orgStructForAppDate.filter(orgItem => orgItem.parentUnitID === orgUnit2.mi_data_id)
          const posItems2 = posData.filter(pos => pos.parentUnitID === orgUnit2.mi_data_id)
          if (orgUnits2.length || posItems2.length || (orgUnit2.staffOrderID === staffTableID && orgUnit2.mi_unityEntity !== 'hr_position')) {
            const posItemObjs2 = getPosItems(posItems2, orgUnits2, accrualData, result.orderDate, orgStructForAppDate2, result.roundTo, (staffTableData.orderState || '') === 'POSTED', oldOrgStruct)
            if (posItemObjs2 && posItemObjs2.length) {
              result.positions.push({
                colSpan: result.colSpan,
                showCurrentAccrual: result.showCurrentAccrual,
                department: orgUnit2.name || '',
                total: posItemObjs2.length,
                items: posItemObjs2
              })
              result.numberPositions += posItemObjs2.length
            }

            for (let j2 = 0; j2 < orgUnits2.length; j2++) {
              const orgUnit3 = orgUnits2[j2]
              const orgUnits3 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit3.mi_data_id)
              const orgStructForAppDate3 = orgStructForAppDate.filter(orgItem => orgItem.parentUnitID === orgUnit3.mi_data_id)
              const posItems3 = posData.filter(pos => pos.parentUnitID === orgUnit3.mi_data_id)
              if (orgUnits3.length || posItems3.length || (orgUnit3.staffOrderID === staffTableID && orgUnit3.mi_unityEntity !== 'hr_position')) {
                const posItemObjs3 = getPosItems(posItems3, orgUnits3, accrualData, result.orderDate, orgStructForAppDate3, result.roundTo, (staffTableData.orderState || '') === 'POSTED', oldOrgStruct)
                if (posItemObjs3 && posItemObjs3.length) {
                  result.positions.push({
                    colSpan: result.colSpan,
                    showCurrentAccrual: result.showCurrentAccrual,
                    department: orgUnit3.name || '',
                    total: posItemObjs3.length,
                    items: posItemObjs3
                  })
                  result.numberPositions += posItemObjs3.length
                }

                for (let j3 = 0; j3 < orgUnits3.length; j3++) {
                  const orgUnit4 = orgUnits3[j3]
                  const orgUnits4 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit4.mi_data_id)
                  const orgStructForAppDate4 = orgStructForAppDate.filter(orgItem => orgItem.parentUnitID === orgUnit4.mi_data_id)
                  const posItems4 = posData.filter(pos => pos.parentUnitID === orgUnit4.mi_data_id)
                  if (orgUnits4.length || posItems4.length || (orgUnit4.staffOrderID === staffTableID && orgUnit4.mi_unityEntity !== 'hr_position')) {
                    const posItemObjs4 = getPosItems(posItems4, orgUnits4, accrualData, result.orderDate, orgStructForAppDate4, result.roundTo, (staffTableData.orderState || '') === 'POSTED', oldOrgStruct)
                    if (posItemObjs4 && posItemObjs4.length) {
                      result.positions.push({
                        colSpan: result.colSpan,
                        showCurrentAccrual: result.showCurrentAccrual,
                        department: orgUnit4.name || '',
                        total: posItemObjs4.length,
                        items: posItemObjs4
                      })
                      result.numberPositions += posItemObjs4.length
                    }

                    for (let j4 = 0; j4 < orgUnits4.length; j4++) {
                      const orgUnit5 = orgUnits4[j4]
                      const orgUnits5 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit5.mi_data_id)
                      const orgStructForAppDate5 = orgStructForAppDate.filter(orgItem => orgItem.parentUnitID === orgUnit5.mi_data_id)
                      const posItems5 = posData.filter(pos => pos.parentUnitID === orgUnit5.mi_data_id)
                      if (orgUnits5.length || posItems5.length || (orgUnit5.staffOrderID === staffTableID && orgUnit5.mi_unityEntity !== 'hr_position')) {
                        const posItemObjs5 = getPosItems(posItems5, orgUnits5, accrualData, result.orderDate, orgStructForAppDate5, result.roundTo, (staffTableData.orderState || '') === 'POSTED', oldOrgStruct)
                        if (posItemObjs5 && posItemObjs5.length) {
                          result.positions.push({
                            colSpan: result.colSpan,
                            showCurrentAccrual: result.showCurrentAccrual,
                            department: orgUnit5.name || '',
                            total: posItemObjs5.length,
                            items: posItemObjs5
                          })
                          result.numberPositions += posItemObjs5.length
                        }

                        for (let j5 = 0; j5 < orgUnits5.length; j5++) {
                          const orgUnit6 = orgUnits5[j5]
                          const orgUnits6 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit6.mi_data_id)
                          const orgStructForAppDate6 = orgStructForAppDate.filter(orgItem => orgItem.parentUnitID === orgUnit6.mi_data_id)
                          const posItems6 = posData.filter(pos => pos.parentUnitID === orgUnit6.mi_data_id)
                          if (orgUnits6.length || posItems6.length || (orgUnit6.staffOrderID === staffTableID && orgUnit6.mi_unityEntity !== 'hr_position')) {
                            const posItemObjs6 = getPosItems(posItems6, orgUnits6, accrualData, result.orderDate, orgStructForAppDate6, result.roundTo, (staffTableData.orderState || '') === 'POSTED', oldOrgStruct)
                            if (posItemObjs6 && posItemObjs6.length) {
                              result.positions.push({
                                colSpan: result.colSpan,
                                showCurrentAccrual: result.showCurrentAccrual,
                                department: orgUnit6.name || '',
                                total: posItemObjs6.length,
                                items: posItemObjs6
                              })
                              result.numberPositions += posItemObjs6.length
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return result
  },
  onParamPanelConfig: function () {
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            {
              xtype: 'checkboxfield',
              fieldLabel: UB.i18n('Відображати актуальні оклади з ШР'),
              labelWidth: 270,
              name: 'showCurrentAccrual',
              value: true
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          showCurrentAccrual: frm.findField('showCurrentAccrual').getValue()
        }
      }
    })
    return paramForm
  }
}

function getPosItems (posItems, orgData, accrualData, dateFrom, orgStructForAppDate, roundTo, posted, oldOrgStruct) {
  const result = []

  if (posItems.length) {
    for (let i = 0; i < posItems.length; i++) {
      const posName = posItems[i]['dictPositionID.fullName'] || posItems[i]['dictPositionID.name'] || ''
      let orgItem = orgData ? _.find(orgData, { mi_data_id: posItems[i].mi_data_id }) : undefined
      const orgItemForAppDate = orgStructForAppDate ? _.find(orgStructForAppDate, { mi_data_id: posItems[i].mi_data_id }) : undefined

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
        const obj = {
          roundTo: roundTo,
          name: HR.nameCase.cap(posName),
          dateFrom: dateFrom ? AC.dateService.formatDate(dateFrom) : '',
          previousAccrualSum: accrualItem.previousAccrualSum || 0,
          oldValue: orgItemForAppDate ? orgItemForAppDate.accrualSum || 0 : 0,
          newValue: accrualItem.accrualSum || 0
        }
        if (result.length === 0 || !_.find(result, { name: obj.name, dateFrom: obj.dateFrom, oldValue: obj.oldValue, newValue: obj.newValue })) {
          result.push(obj)
        }
      }
    }
  }
  return result
}
