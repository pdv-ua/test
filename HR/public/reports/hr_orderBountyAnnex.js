/* global _ UB AC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    let result = {
      orgUnits: []
    }

    let onDate = reportParams.onDate
    let onDateSql = AC.dateService.shiftDate(onDate)
    let orgID = reportParams.orgID
    let orgStruct = await UB.Repository('hr_staffUnit')
      .attrs(['mi_data_id', 'parentUnitID', 'code', 'fullName', 'mi_unityEntity'])
      .where('state', '=', 'ACTIVE')
      .where('mi_dateFrom', '<=', onDateSql)
      .where('mi_dateTo', '>=', onDateSql)
      .where('orgID', '=', orgID)
      .orderBy('idxNum')
      .selectAsObject()
    let bounty = await UB.Repository('hr_empOrderChgSalEmpDet')
      .attrs(['bountyParaID.periodID.dateFrom', 'bountyParaID.periodID.dateTo', 'newValue', 'positionID.parentUnitID',
        'positionID.idxNum', 'positionID.name', 'employeeID.fullFIO', 'positionID.mi_treePath',
        'employeePositionID.dateFrom', 'employeePositionID.dateTo', 'bountyParaID.roundUpTo'])
      .where('orderID', '=', reportParams.instanceID)
      .orderBy('itemIdx')
      .selectAsObject()
    let bountyOrgIds = []
    bounty.forEach(item => {
      let miTreePath = item['positionID.mi_treePath']
      let itemIds = miTreePath.split('/')
      for (let i = 1; i < itemIds.length - 2; i++) {
        bountyOrgIds.push(itemIds[i])
      }
    })

    let roundUpTo = (bounty[0] && bounty[0]['bountyParaID.roundUpTo'])
    let roundTo = roundUpTo ? HR.reportUtils.getRoundToByCode(roundUpTo) : 2
    let indexNum = 0
    let totalBounty = 0
    let rootBounty = bounty.filter(item => item['positionID.parentUnitID'] === orgID)
    let orgStruct1 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgID)

    if (rootBounty && rootBounty.length) {
      let rootBountyObjs = getBountyItems(rootBounty, indexNum, onDate, roundTo)
      result.pos = rootBountyObjs.data
      totalBounty += rootBountyObjs.bounty
      indexNum = rootBountyObjs.indexNum
    }

    for (let i = 0; i < orgStruct1.length; i++) {
      let orgUnit1 = orgStruct1[i]
      const orgUnits1 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit1.mi_data_id)
      let posItems1 = bounty.filter(pos => pos['positionID.parentUnitID'] === orgUnit1.mi_data_id)
      if ((orgUnits1.length && bountyOrgIds.includes(orgUnit1.mi_data_id.toString())) || posItems1.length) {
        let orgUnitHeader = [{ orgUnitName: `${orgUnit1.code} ${orgUnit1.fullName}`.toUpperCase() }]
        let orgUnitItem1 = { header: orgUnitHeader, units: [], pos: undefined }
        let orgUnitBounty1 = 0
        let posItemObjs1 = getBountyItems(posItems1, indexNum, onDate, roundTo)
        orgUnitItem1.pos = posItemObjs1.data
        orgUnitBounty1 += posItemObjs1.bounty
        indexNum = posItemObjs1.indexNum
        for (let j = 0; j < orgUnits1.length; j++) {
          let orgUnit2 = orgUnits1[j]
          let orgUnits2 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit2.mi_data_id)
          let posItems2 = bounty.filter(pos => pos['positionID.parentUnitID'] === orgUnit2.mi_data_id)
          if ((orgUnits2.length && bountyOrgIds.includes(orgUnit2.mi_data_id.toString())) || posItems2.length) {
            let orgUnitItem2 = { orgUnitName: `${orgUnit2.code} ${orgUnit2.fullName}`, units: [], pos: undefined }
            let orgUnitBounty2 = 0
            let posItemObjs2 = getBountyItems(posItems2, indexNum, onDate, roundTo)
            orgUnitItem2.pos = posItemObjs2.data
            orgUnitBounty2 += posItemObjs2.bounty
            indexNum = posItemObjs2.indexNum
            for (let j2 = 0; j2 < orgUnits2.length; j2++) {
              let orgUnit3 = orgUnits2[j2]
              let orgUnits3 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit3.mi_data_id)
              let posItems3 = bounty.filter(pos => pos['positionID.parentUnitID'] === orgUnit3.mi_data_id)
              if ((orgUnits3.length && bountyOrgIds.includes(orgUnit3.mi_data_id.toString())) || posItems3.length) {
                let orgUnitItem3 = { orgUnitName: `${orgUnit3.code} ${orgUnit3.fullName}`, units: [], pos: undefined }
                let orgUnitBounty3 = 0
                let posItemObjs3 = getBountyItems(posItems3, indexNum, onDate, roundTo)
                orgUnitItem3.pos = posItemObjs3.data
                orgUnitBounty3 += posItemObjs3.bounty
                indexNum = posItemObjs3.indexNum
                for (let j3 = 0; j3 < orgUnits3.length; j3++) {
                  let orgUnit4 = orgUnits3[j3]
                  let orgUnits4 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit4.mi_data_id)
                  let posItems4 = bounty.filter(pos => pos['positionID.parentUnitID'] === orgUnit4.mi_data_id)
                  if ((orgUnits4.length && bountyOrgIds.includes(orgUnit4.mi_data_id.toString())) || posItems4.length) {
                    let orgUnitItem4 = { orgUnitName: `${orgUnit4.code} ${orgUnit4.fullName}`, units: [], pos: undefined }
                    let orgUnitBounty4 = 0
                    let posItemObjs4 = getBountyItems(posItems4, indexNum, onDate, roundTo)
                    orgUnitItem4.pos = posItemObjs4.data
                    orgUnitBounty4 += posItemObjs4.bounty
                    indexNum = posItemObjs4.indexNum
                    for (let j4 = 0; j4 < orgUnits4.length; j4++) {
                      let orgUnit5 = orgUnits4[j4]
                      let orgUnits5 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit5.mi_data_id)
                      let posItems5 = bounty.filter(pos => pos['positionID.parentUnitID'] === orgUnit5.mi_data_id)
                      if ((orgUnits5.length && bountyOrgIds.includes(orgUnit5.mi_data_id.toString())) || posItems5.length) {
                        let orgUnitItem5 = { orgUnitName: `${orgUnit5.code} ${orgUnit5.fullName}`, units: [], pos: undefined }
                        let orgUnitBounty5 = 0
                        let posItemObjs5 = getBountyItems(posItems5, indexNum, onDate, roundTo)
                        orgUnitItem5.pos = posItemObjs5.data
                        orgUnitBounty5 += posItemObjs5.bounty
                        indexNum = posItemObjs5.indexNum
                        for (let j5 = 0; j5 < orgUnits5.length; j5++) {
                          let orgUnit6 = orgUnits5[j5]
                          let posItems6 = bounty.filter(pos => pos['positionID.parentUnitID'] === orgUnit6.mi_data_id)
                          if (posItems6.length) {
                            let orgUnitItem6 = { orgUnitName: `${orgUnit6.code} ${orgUnit6.fullName}`, units: [], pos: undefined }
                            let orgUnitBounty6 = 0
                            let posItemObjs6 = getBountyItems(posItems6, indexNum, onDate, roundTo)
                            orgUnitItem6.pos = posItemObjs6.data
                            orgUnitBounty6 += posItemObjs6.bounty
                            indexNum = posItemObjs6.indexNum
                            orgUnitItem6.orgUnitBounty = HR.reportUtils.formatAsCurrency(orgUnitBounty6, roundTo)
                            orgUnitItem5.units.push(orgUnitItem6)
                            orgUnitBounty5 += orgUnitBounty6
                          }
                        }
                        orgUnitItem5.orgUnitBounty = HR.reportUtils.formatAsCurrency(orgUnitBounty5, roundTo)
                        orgUnitItem4.units.push(orgUnitItem5)
                        orgUnitBounty4 += orgUnitBounty5
                      }
                    }
                    orgUnitItem4.orgUnitBounty = HR.reportUtils.formatAsCurrency(orgUnitBounty4, roundTo)
                    orgUnitItem3.units.push(orgUnitItem4)
                    orgUnitBounty3 += orgUnitBounty4
                  }
                }
                orgUnitItem3.orgUnitBounty = HR.reportUtils.formatAsCurrency(orgUnitBounty3, roundTo)
                orgUnitItem2.units.push(orgUnitItem3)
                orgUnitBounty2 += orgUnitBounty3
              }
            }
            orgUnitItem2.orgUnitBounty = HR.reportUtils.formatAsCurrency(orgUnitBounty2, roundTo)
            orgUnitItem1.units.push(orgUnitItem2)
            orgUnitBounty1 += orgUnitBounty2
          }
        }
        orgUnitItem1.footer = [{ orgUnitName: `${orgUnit1.code} ${orgUnit1.fullName}`,
          orgUnitBounty: HR.reportUtils.formatAsCurrency(orgUnitBounty1, roundTo) }]
        result.orgUnits.push(orgUnitItem1)
        totalBounty += orgUnitBounty1
      }
    }
    result.totalBounty = HR.reportUtils.formatAsCurrency(totalBounty, roundTo)

    return result
  }
}

function getBountyItems (bountyItems, indexNum, onDate, roundTo) {
  let result = {
    data: [],
    bounty: 0,
    indexNum: indexNum
  }
  if (bountyItems.length) {
    let bountyAll = 0
    for (let i = 0; i < bountyItems.length; i++) {
      let bountyItem = bountyItems[i]
      let idxNum = bountyItem['positionID.idxNum'] || 99999999
      let posName = bountyItem['positionID.name'] || ''
      let empName = bountyItem['employeeID.fullFIO'] || ''
      let bounty = bountyItem.newValue
      let dateFrom = bountyItem['bountyParaID.periodID.dateFrom']
      let dateTo = bountyItem['bountyParaID.periodID.dateTo']
      let posDateFrom = bountyItem['employeePositionID.dateFrom']
      let posDateTo = bountyItem['employeePositionID.dateTo']
      let note = ''
      if (dateFrom && dateTo) {
        if (posDateFrom) {
          if (posDateFrom >= dateFrom && posDateFrom <= dateTo) {
            note += UB.i18n('З ') + AC.dateService.formatDate(posDateFrom)
          }
        }
        if (posDateTo && !AC.dateService.isMaxDate(posDateTo)) {
          if (posDateTo >= dateFrom && posDateTo <= dateTo) {
            note += UB.i18n(' по ') + AC.dateService.formatDate(posDateTo)
          }
        }
      }
      let dataItem = {
        indexNum: idxNum,
        posName: posName,
        empName: empName,
        bounty: HR.reportUtils.formatAsCurrency(bounty, roundTo),
        note: note
      }
      bountyAll += bounty
      result.data.push(dataItem)
    }
    result.data = _.orderBy(result.data, ['indexNum'], ['asc'])
    result.bounty = bountyAll
    result.data.forEach(item => {
      item.indexNum = ++indexNum
    })
    result.indexNum = indexNum
  }
  return result
}
