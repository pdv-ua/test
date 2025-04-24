/* global _ UB AC appAC HR $App */
exports.reportCode = {

  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const roundTo = 2
    const organizationID = appAC.globalOrganization()
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', organizationID) === true

    const result = {
      colNums: [],
      orgUnits: [],
      showAddDescrPerson,
      useActualPositionName,
      colSpan: 5 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0),
      tableWidth: 690 + (showAddDescrPerson ? 200 : 0) + (useActualPositionName ? 200 : 0)
    }

    for (let i = 1; i <= result.colSpan; i++) {
      result.colNums.push({ name: i })
    }

    const orgData = await UB.Repository('hr_organization')
      .attrs(['name'])
      .where('mi_data_id', '=', organizationID)
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: reportParams.onDate })
      .orderBy('mi_dateFrom', 'desc')
      .selectSingle()
    result.year = reportParams.onDate.getFullYear()
    result.orgName = orgData.name
    result.onDate = AC.dateService.getStringFormatDate(reportParams.onDate, '', '', UB.i18n(' р.'))

    const orgStructRes = await $App.connection.run({
      entity: 'hr_staffUnit',
      method: 'selectLastDeps',
      orgID: organizationID
    })
    const orgStruct = JSON.parse(orgStructRes.resultData).data

    if (!orgStruct) {
      return result
    }

    const alias = reportParams.fullPosName ? { 'posFullNameNom': 'posName' } : {}
    const posData = await UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeID', 'employeeID.shortFIO', 'empOrderType', 'positionID', 'posDateTo', 'posIdxNum', 'posParentUnitID', 'posAccrualSum'])
      .attrsIf(!reportParams.fullPosName, ['posName'])
      .attrsIf(reportParams.fullPosName, ['posFullNameNom'])
      .attrsIf(showAddDescrPerson, ['employeeNumberID.addDescrPerson'])
      .attrsIf(useActualPositionName, ['factPosition'])
      .where('organizationID', '=', organizationID)
      .where('dateFrom', '<=', reportParams.onDate)
      .where('dateTo', '>=', reportParams.onDate)
      .where('posDateTo', '<', reportParams.onDate)
      .selectAsObject(alias)

    let indexNum = 0
    const orgStruct1 = orgStruct.filter(orgItem => orgItem.parentUnitID === organizationID)

    const rootPos = posData.filter(pos => pos['posParentUnitID'] === organizationID && pos['empOrderType'] !== 'APPOINT_LIQ')

    if (rootPos.length) {
      const rootPosObjs = getPosItems(rootPos, orgStruct1, indexNum, roundTo, showAddDescrPerson, useActualPositionName)
      if (rootPosObjs.data.length > 0) {
        result.pos = rootPosObjs.data
        indexNum = rootPosObjs.indexNum || '' || ''
      }
    }

    for (let i = 0; i < orgStruct1.length; i++) {
      const orgUnit1 = orgStruct1[i]
      const orgUnits1 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit1.mi_data_id)
      const posItems1 = posData.filter(pos => pos['posParentUnitID'] === orgUnit1.mi_data_id)
      if (orgUnits1.length || posItems1.length || orgUnit1.mi_unityEntity !== 'hr_position') {
        const orgUnitHeader = [{ orgUnitName: `${orgUnit1.code} ${orgUnit1.fullName}`.toUpperCase() }]
        const orgUnitItem1 = { header: orgUnitHeader, units: [], pos: undefined }

        const posItemObjs1 = getPosItems(posItems1, orgUnits1, indexNum, roundTo, showAddDescrPerson, useActualPositionName)
        orgUnitItem1.pos = posItemObjs1.data

        indexNum = posItemObjs1.indexNum || ''
        for (let j = 0; j < orgUnits1.length; j++) {
          const orgUnit2 = orgUnits1[j]
          const orgUnits2 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit2.mi_data_id)
          const posItems2 = posData.filter(pos => pos['posParentUnitID'] === orgUnit2.mi_data_id)
          if (orgUnits2.length || posItems2.length || orgUnit2.mi_unityEntity !== 'hr_position') {
            const orgUnitItem2 = { orgUnitName: `${orgUnit2.code} ${orgUnit2.fullName}`, units: [], pos: undefined }

            const posItemObjs2 = getPosItems(posItems2, orgUnits2, indexNum, roundTo, showAddDescrPerson, useActualPositionName)
            orgUnitItem2.pos = posItemObjs2.data

            indexNum = posItemObjs2.indexNum || ''
            for (let j2 = 0; j2 < orgUnits2.length; j2++) {
              const orgUnit3 = orgUnits2[j2]
              const orgUnits3 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit3.mi_data_id)
              const posItems3 = posData.filter(pos => pos['posParentUnitID'] === orgUnit3.mi_data_id)
              if (orgUnits3.length || posItems3.length || orgUnit3.mi_unityEntity !== 'hr_position') {
                const orgUnitItem3 = { orgUnitName: `${orgUnit3.code} ${orgUnit3.fullName}`, units: [], pos: undefined }

                const posItemObjs3 = getPosItems(posItems3, orgUnits3, indexNum, roundTo, showAddDescrPerson, useActualPositionName)
                orgUnitItem3.pos = posItemObjs3.data

                indexNum = posItemObjs3.indexNum || ''
                for (let j3 = 0; j3 < orgUnits3.length; j3++) {
                  const orgUnit4 = orgUnits3[j3]
                  const orgUnits4 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit4.mi_data_id)
                  const posItems4 = posData.filter(pos => pos['posParentUnitID'] === orgUnit4.mi_data_id)
                  if (orgUnits4.length || posItems4.length || orgUnit4.mi_unityEntity !== 'hr_position') {
                    const orgUnitItem4 = { orgUnitName: `${orgUnit4.code} ${orgUnit4.fullName}`, units: [], pos: undefined }

                    const posItemObjs4 = getPosItems(posItems4, orgUnits4, indexNum, roundTo, showAddDescrPerson, useActualPositionName)
                    orgUnitItem4.pos = posItemObjs4.data

                    indexNum = posItemObjs4.indexNum || ''
                    for (let j4 = 0; j4 < orgUnits4.length; j4++) {
                      const orgUnit5 = orgUnits4[j4]
                      const orgUnits5 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit5.mi_data_id)
                      const posItems5 = posData.filter(pos => pos['posParentUnitID'] === orgUnit5.mi_data_id)
                      if (orgUnits5.length || posItems5.length || orgUnit5.mi_unityEntity !== 'hr_position') {
                        const orgUnitItem5 = { orgUnitName: `${orgUnit5.code} ${orgUnit5.fullName}`, units: [], pos: undefined }

                        const posItemObjs5 = getPosItems(posItems5, orgUnits5, indexNum, roundTo, showAddDescrPerson, useActualPositionName)
                        orgUnitItem5.pos = posItemObjs5.data

                        indexNum = posItemObjs5.indexNum || ''
                        for (let j5 = 0; j5 < orgUnits5.length; j5++) {
                          const orgUnit6 = orgUnits5[j5]
                          const orgUnits6 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit6.mi_data_id)
                          const posItems6 = posData.filter(pos => pos['posParentUnitID'] === orgUnit6.mi_data_id)
                          if (orgUnits6.length || posItems6.length || orgUnit6.mi_unityEntity !== 'hr_position') {
                            const orgUnitItem6 = { orgUnitName: `${orgUnit6.code} ${orgUnit6.fullName}`, units: [], pos: undefined }

                            const posItemObjs6 = getPosItems(posItems6, orgUnits6, indexNum, roundTo, showAddDescrPerson, useActualPositionName)
                            orgUnitItem6.pos = posItemObjs6.data
                            indexNum = posItemObjs6.indexNum || ''

                            if (posItemObjs6.pos.length) {
                              orgUnitItem5.units.push(orgUnitItem6)
                            }
                          }
                        }
                        if (orgUnitItem5.pos.length || orgUnitItem5.units.length) {
                          orgUnitItem4.units.push(orgUnitItem5)
                        }
                      }
                    }
                    if (orgUnitItem4.pos.length || orgUnitItem4.units.length) {
                      orgUnitItem3.units.push(orgUnitItem4)
                    }
                  }
                }
                if (orgUnitItem3.pos.length || orgUnitItem3.units.length) {
                  orgUnitItem2.units.push(orgUnitItem3)
                }
              }
            }
            if (orgUnitItem2.pos.length || orgUnitItem2.units.length) {
              orgUnitItem1.units.push(orgUnitItem2)
            }
          }
        }

        if (orgUnitItem1.pos.length || orgUnitItem1.units.length) {
          result.orgUnits.push(orgUnitItem1)
        }
      }
    }

    const liqOrderPos = posData.filter(pos => pos['empOrderType'] === 'APPOINT_LIQ')
    if (liqOrderPos.length > 0) {
      const orgUnitHeader = [{ orgUnitName: UB.i18n('Призначені на ліквідовані посади') }]
      const orgUnitItemLiq = { header: orgUnitHeader, units: [], pos: undefined }

      const posItemObjsLiq = getPosItems(liqOrderPos, orgStruct, indexNum, roundTo, showAddDescrPerson, useActualPositionName)
      orgUnitItemLiq.pos = posItemObjsLiq.data

      // indexNum = posItemObjsLiq.indexNum
      result.orgUnits.push(orgUnitItemLiq)
    }
    return result
  },
  onParamPanelConfig: function () {
    const incomeParams = this.incomeParams || {}
    let paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox' },
          items: [
            {
              xtype: 'panel',
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'checkboxfield',
                  name: 'fullPosName',
                  fieldLabel: UB.i18n('Повна назва посади'),
                  margin: '4 0 0 50',
                  labelWidth: 160,
                  width: 440,
                  checked: false
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        let frm = owner.getForm()
        incomeParams.fullPosName = frm.findField('fullPosName').getValue()
        owner.ownerCt.report.incomeParams = incomeParams
        return incomeParams
      }
    })
    return paramForm
  }
}

function getPosItems (posItems, orgData, indexNum, roundTo, showAddDescrPerson, useActualPositionName) {
  const result = {
    data: [],
    indexNum: indexNum
  }

  if (posItems.length) {
    for (let i = 0; i < posItems.length; i++) {
      const posItem = posItems[i]
      const posName = posItem['posName'] || ''
      const idxNum = posItem['posIdxNum'] || 99999999
      const empFIO = posItem['employeeID.shortFIO'] || ''
      const posDateTo = posItem['posDateTo'] && AC.dateService.formatDate(posItem['posDateTo']) !== '31.12.9999' ? AC.dateService.formatDate(posItem['posDateTo']) : ''
      const orgItem = orgData ? _.find(orgData, { mi_data_id: posItem.positionID }) : undefined

      const accrualSum = orgItem ? orgItem.accrualSum : posItem.posAccrualSum

      let foundItem = _.find(result.data, { posName: posName, accrualSum: accrualSum, empFIO: empFIO, dateTo: posDateTo })
      if (!foundItem) {
        foundItem = {
          showAddDescrPerson: showAddDescrPerson,
          indexNum: idxNum,
          posName: posName,
          accrualSum: accrualSum,
          empFIO: empFIO,
          posDateTo: posDateTo,
          addDescrPerson: showAddDescrPerson ? posItem['employeeNumberID.addDescrPerson'] || '' : '',
          useActualPositionName,
          actualPositionName: useActualPositionName ? posItem.factPosition || '' : ''
        }
        result.data.push(foundItem)
      } else {
        foundItem.indexNum = (foundItem.indexNum > idxNum) ? idxNum : foundItem.indexNum
      }
    }
    result.data = _.orderBy(result.data, ['indexNum', 'accrualSum'], ['asc', 'desc'])

    result.data.forEach(item => {
      item.indexNum = ++indexNum
      item.accrualSum = HR.reportUtils.formatAsCurrencyStr(item.accrualSum, roundTo)
    })
    result.indexNum = indexNum
  }
  return result
}
