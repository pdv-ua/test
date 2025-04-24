/* global Ext _ UB AC appAC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    let staffTableID = reportParams.staffTableID
    let onDate = reportParams.onDate
    let roundTo = reportParams.roundTo
    let result = {
      orgUnits: []
    }
    if (!onDate) {
      const staffTable = await UB.Repository('hr_staffTableOrgStructure')
        .attrs(['orderDate'])
        .misc({ __mip_recordhistory_all: true })
        .selectById(staffTableID)
      if ((staffTable && staffTable.orderDate)) {
        onDate = AC.dateService.shiftDate(staffTable.orderDate)
      } else {
        onDate = appAC.globalApplicationDate()
      }
    }
    const organizationID = appAC.globalOrganization()
    const orgData = await UB.Repository('hr_organization')
      .attrs(['name'])
      .where('mi_data_id', '=', organizationID)
      .misc({ __mip_ondate: onDate })
      .selectAsObject()
    result.year = onDate.getFullYear()
    result.orgName = orgData.length && orgData[0].name
    result.onDate = AC.dateService.getStringFormatDate(onDate, '', '', UB.i18n(' р.'))

    let childOrgIDs = await HR.treeUtils.getChildOrgs(organizationID, onDate)
    let orgStruct = await HR.treeUtils.getOrgPlanUnits(staffTableID, childOrgIDs, onDate)
    if (!orgStruct) {
      return result
    }

    let posData = await UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID.fullName', 'dictPositionID.name', 'quantity'])
      .where('orgID', 'in', childOrgIDs)
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
      .orderBy('dictPositionID.fullName')
      .orderBy('dictPositionID.name')
      .selectAsObject()

    let indexNum = 0
    let totalQuantity = 0
    let totalBasepay = 0
    let totalFunsSum = 0
    let orgStruct1 = orgStruct.filter(orgItem => orgItem.parentUnitID === organizationID)
    let rootPos = posData.filter(pos => pos.parentUnitID === organizationID)
    if (rootPos.length) {
      let rootPosObjs = getPosItems(rootPos, orgStruct1, indexNum, roundTo)
      result.pos = rootPosObjs.data
      totalQuantity += rootPosObjs.quantity
      totalBasepay += rootPosObjs.basepay
      totalFunsSum += rootPosObjs.fundSum
      indexNum = rootPosObjs.indexNum
    }

    for (let i = 0; i < orgStruct1.length; i++) {
      let orgUnit1 = orgStruct1[i]
      const orgUnits1 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit1.mi_data_id)
      let posItems1 = posData.filter(pos => pos.parentUnitID === orgUnit1.mi_data_id)
      if (orgUnits1.length || posItems1.length || orgUnit1.staffOrderID === staffTableID) {
        let orgUnitHeader = [{ orgUnitName: `${orgUnit1.code} ${orgUnit1.fullName}`.toUpperCase() }]
        let orgUnitItem1 = { header: orgUnitHeader, units: [], pos: undefined }
        let orgUnitQuantity1 = 0
        let orgUnitBasepay1 = 0
        let orgUnitFundSum1 = 0
        let posItemObjs1 = getPosItems(posItems1, orgUnits1, indexNum, roundTo)
        orgUnitItem1.pos = posItemObjs1.data
        orgUnitQuantity1 += posItemObjs1.quantity
        orgUnitBasepay1 += posItemObjs1.basepay
        orgUnitFundSum1 += posItemObjs1.fundSum
        indexNum = posItemObjs1.indexNum
        for (let j = 0; j < orgUnits1.length; j++) {
          let orgUnit2 = orgUnits1[j]
          let orgUnits2 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit2.mi_data_id)
          let posItems2 = posData.filter(pos => pos.parentUnitID === orgUnit2.mi_data_id)
          if (orgUnits2.length || posItems2.length || orgUnit2.staffOrderID === staffTableID) {
            let orgUnitItem2 = { orgUnitName: `${orgUnit2.code} ${orgUnit2.fullName}`, units: [], pos: undefined }
            let orgUnitQuantity2 = 0
            let orgUnitBasepay2 = 0
            let orgUnitFundSum2 = 0
            let posItemObjs2 = getPosItems(posItems2, orgUnits2, indexNum, roundTo)
            orgUnitItem2.pos = posItemObjs2.data
            orgUnitQuantity2 += posItemObjs2.quantity
            orgUnitBasepay2 += posItemObjs2.basepay
            orgUnitFundSum2 += posItemObjs2.fundSum
            indexNum = posItemObjs2.indexNum
            for (let j2 = 0; j2 < orgUnits2.length; j2++) {
              let orgUnit3 = orgUnits2[j2]
              let orgUnits3 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit3.mi_data_id)
              let posItems3 = posData.filter(pos => pos.parentUnitID === orgUnit3.mi_data_id)
              if (orgUnits3.length || posItems3.length || orgUnit3.staffOrderID === staffTableID) {
                let orgUnitItem3 = { orgUnitName: `${orgUnit3.code} ${orgUnit3.fullName}`, units: [], pos: undefined }
                let orgUnitQuantity3 = 0
                let orgUnitBasepay3 = 0
                let orgUnitFundSum3 = 0
                let posItemObjs3 = getPosItems(posItems3, orgUnits3, indexNum, roundTo)
                orgUnitItem3.pos = posItemObjs3.data
                orgUnitQuantity3 += posItemObjs3.quantity
                orgUnitBasepay3 += posItemObjs3.basepay
                orgUnitFundSum3 += posItemObjs3.fundSum
                indexNum = posItemObjs3.indexNum
                for (let j3 = 0; j3 < orgUnits3.length; j3++) {
                  let orgUnit4 = orgUnits3[j3]
                  let orgUnits4 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit4.mi_data_id)
                  let posItems4 = posData.filter(pos => pos.parentUnitID === orgUnit4.mi_data_id)
                  if (orgUnits4.length || posItems4.length || orgUnit4.staffOrderID === staffTableID) {
                    let orgUnitItem4 = { orgUnitName: `${orgUnit4.code} ${orgUnit4.fullName}`, units: [], pos: undefined }
                    let orgUnitQuantity4 = 0
                    let orgUnitBasepay4 = 0
                    let orgUnitFundSum4 = 0
                    let posItemObjs4 = getPosItems(posItems4, orgUnits4, indexNum, roundTo)
                    orgUnitItem4.pos = posItemObjs4.data
                    orgUnitQuantity4 += posItemObjs4.quantity
                    orgUnitBasepay4 += posItemObjs4.basepay
                    orgUnitFundSum4 += posItemObjs4.fundSum
                    indexNum = posItemObjs4.indexNum
                    for (let j4 = 0; j4 < orgUnits4.length; j4++) {
                      let orgUnit5 = orgUnits4[j4]
                      let orgUnits5 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit5.mi_data_id)
                      let posItems5 = posData.filter(pos => pos.parentUnitID === orgUnit5.mi_data_id)
                      if (orgUnits5.length || posItems5.length || orgUnit5.staffOrderID === staffTableID) {
                        let orgUnitItem5 = { orgUnitName: `${orgUnit5.code} ${orgUnit5.fullName}`, units: [], pos: undefined }
                        let orgUnitQuantity5 = 0
                        let orgUnitBasepay5 = 0
                        let orgUnitFundSum5 = 0
                        let posItemObjs5 = getPosItems(posItems5, orgUnits5, indexNum, roundTo)
                        orgUnitItem5.pos = posItemObjs5.data
                        orgUnitQuantity5 += posItemObjs5.quantity
                        orgUnitBasepay5 += posItemObjs5.basepay
                        orgUnitFundSum5 += posItemObjs5.fundSum
                        indexNum = posItemObjs5.indexNum
                        for (let j5 = 0; j5 < orgUnits5.length; j5++) {
                          let orgUnit6 = orgUnits5[j5]
                          let orgUnits6 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit6.mi_data_id)
                          let posItems6 = posData.filter(pos => pos.parentUnitID === orgUnit6.mi_data_id)
                          if (orgUnits6.length || posItems6.length || orgUnit6.staffOrderID === staffTableID) {
                            let orgUnitItem6 = { orgUnitName: `${orgUnit6.code} ${orgUnit6.fullName}`, units: [], pos: undefined }
                            let orgUnitQuantity6 = 0
                            let orgUnitBasepay6 = 0
                            let orgUnitFundSum6 = 0
                            let posItemObjs6 = getPosItems(posItems6, orgUnits6, indexNum, roundTo)
                            orgUnitItem6.pos = posItemObjs6.data
                            orgUnitQuantity6 += posItemObjs6.quantity
                            orgUnitBasepay6 += posItemObjs6.basepay
                            orgUnitFundSum6 += posItemObjs6.fundSum
                            indexNum = posItemObjs6.indexNum
                            orgUnitItem6.orgUnitQuantity = HR.reportUtils.formatAsNumberStr(orgUnitQuantity6)
                            orgUnitItem6.orgUnitBasepay = HR.reportUtils.formatAsCurrencyStr(orgUnitBasepay6, roundTo)
                            orgUnitItem6.orgUnitFundSum = HR.reportUtils.formatAsCurrencyStr(orgUnitFundSum6, roundTo)
                            orgUnitItem5.units.push(orgUnitItem6)
                            orgUnitQuantity5 += orgUnitQuantity6
                            orgUnitBasepay5 += orgUnitBasepay6
                            orgUnitFundSum5 += orgUnitFundSum6
                          }
                        }
                        orgUnitItem5.orgUnitQuantity = HR.reportUtils.formatAsNumberStr(orgUnitQuantity5)
                        orgUnitItem5.orgUnitBasepay = HR.reportUtils.formatAsCurrencyStr(orgUnitBasepay5, roundTo)
                        orgUnitItem5.orgUnitFundSum = HR.reportUtils.formatAsCurrencyStr(orgUnitFundSum5, roundTo)
                        orgUnitItem4.units.push(orgUnitItem5)
                        orgUnitQuantity4 += orgUnitQuantity5
                        orgUnitBasepay4 += orgUnitBasepay5
                        orgUnitFundSum4 += orgUnitFundSum5
                      }
                    }
                    orgUnitItem4.orgUnitQuantity = HR.reportUtils.formatAsNumberStr(orgUnitQuantity4)
                    orgUnitItem4.orgUnitBasepay = HR.reportUtils.formatAsCurrencyStr(orgUnitBasepay4, roundTo)
                    orgUnitItem4.orgUnitFundSum = HR.reportUtils.formatAsCurrencyStr(orgUnitFundSum4, roundTo)
                    orgUnitItem3.units.push(orgUnitItem4)
                    orgUnitQuantity3 += orgUnitQuantity4
                    orgUnitBasepay3 += orgUnitBasepay4
                    orgUnitFundSum3 += orgUnitFundSum4
                  }
                }
                orgUnitItem3.orgUnitQuantity = HR.reportUtils.formatAsNumberStr(orgUnitQuantity3)
                orgUnitItem3.orgUnitBasepay = HR.reportUtils.formatAsCurrencyStr(orgUnitBasepay3, roundTo)
                orgUnitItem3.orgUnitFundSum = HR.reportUtils.formatAsCurrencyStr(orgUnitFundSum3, roundTo)
                orgUnitItem2.units.push(orgUnitItem3)
                orgUnitQuantity2 += orgUnitQuantity3
                orgUnitBasepay2 += orgUnitBasepay3
                orgUnitFundSum2 += orgUnitFundSum3
              }
            }
            orgUnitItem2.orgUnitQuantity = HR.reportUtils.formatAsNumberStr(orgUnitQuantity2)
            orgUnitItem2.orgUnitBasepay = HR.reportUtils.formatAsCurrencyStr(orgUnitBasepay2, roundTo)
            orgUnitItem2.orgUnitFundSum = HR.reportUtils.formatAsCurrencyStr(orgUnitFundSum2, roundTo)
            orgUnitItem1.units.push(orgUnitItem2)
            orgUnitQuantity1 += orgUnitQuantity2
            orgUnitBasepay1 += orgUnitBasepay2
            orgUnitFundSum1 += orgUnitFundSum2
          }
        }
        orgUnitItem1.footer = [
          {
            orgUnitName: `${orgUnit1.code} ${orgUnit1.fullName}`,
            orgUnitQuantity: HR.reportUtils.formatAsNumberStr(orgUnitQuantity1),
            orgUnitBasepay: HR.reportUtils.formatAsCurrencyStr(orgUnitBasepay1, roundTo),
            orgUnitFundSum: HR.reportUtils.formatAsCurrencyStr(orgUnitFundSum1, roundTo)
          }
        ]
        result.orgUnits.push(orgUnitItem1)
        totalQuantity += orgUnitQuantity1
        totalBasepay += orgUnitBasepay1
        totalFunsSum += orgUnitFundSum1
      }
    }
    result.totalQuantity = HR.reportUtils.formatAsNumberStr(totalQuantity)
    result.totalBasepay = HR.reportUtils.formatAsCurrencyStr(totalBasepay, roundTo)
    result.totalFunsSum = HR.reportUtils.formatAsCurrencyStr(totalFunsSum, roundTo)

    return result
  },
  onParamPanelConfig: function () {
    let report = this
    let incomeParams = report.incomeParams
    let paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            {
              xtype: 'ubcombobox',
              name: 'staffTableID',
              fieldLabel: UB.i18n('Планування структури'),
              labelWidth: 140,
              gridFieldList: ['description', 'orderState', 'entryDate'],
              displayField: 'description',
              allowBlank: false,
              ubRequest: {
                entity: 'hr_staffTableOrgStructure',
                fieldList: ['ID', 'description'],
                whereList: {
                  orgID: {
                    expression: '[orgID]',
                    condition: '=',
                    values: {
                      value: appAC.globalOrganization()
                    }
                  }
                },
                orderList: { orderBy: { expression: 'description' } }
              },
              listeners: {
                render: function (ctrl) {
                  const paramForm = ctrl.up('form')
                  const tabForm = paramForm.ownerCt
                  tabForm.globalOrganizationChange = () => {
                    AC.viewUtils.setWhereListProperty(ctrl, [
                      ['orgID', '=', appAC.globalOrganization()]
                    ], null, ['clearStore', 'clearWhereList', 'clearValue'])
                  }
                  if (incomeParams && incomeParams.staffTableID) {
                    ctrl.store.on('load', () => {
                      if (!ctrl.store.isLoaded) {
                        ctrl.store.isLoaded = true
                        ctrl.setValueById(incomeParams.staffTableID)
                      }
                    })
                    ctrl.store.load()
                  }
                }
              }
            },
            HR.reportUtils.roundToCombo({ labelWidth: 140 })
          ]
        }
      ],
      getParameters: function (owner) {
        let frm = owner.getForm()
        let incomeParams = this.incomeParams
        let onDate = incomeParams && incomeParams.onDate
        let roundTo = frm.findField('roundToCombo').getValue()
        return {
          staffTableID: frm.findField('staffTableID').getValue() || 0,
          onDate: onDate,
          roundTo: (roundTo === undefined) ? 2 : roundTo
        }
      }
    })
    return paramForm
  }
}

function getPosItems (posItems, orgData, indexNum, roundTo) {
  let result = {
    data: [],
    quantity: 0,
    indexNum: indexNum
  }
  if (posItems.length) {
    let qntAll = 0
    let basepayAll = 0
    let fundSumAll = 0
    for (let i = 0; i < posItems.length; i++) {
      let posItem = posItems[i]
      let posName = posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || ''
      let qnt = posItem.quantity || 0
      let idxNum = posItem.idxNum || 99999999
      let orgItem = orgData ? _.find(orgData, { mi_data_id: posItem.mi_data_id }) : undefined
      let basepay = orgItem ? orgItem.accrualSum : 0
      let fundSum = qnt * basepay
      let foundItem = _.find(result.data, { posName: posName, basepay: basepay })
      if (!foundItem) {
        foundItem = {
          indexNum: idxNum,
          posName: posName,
          quantity: qnt,
          basepay: basepay,
          fundSum: fundSum
        }
        result.data.push(foundItem)
      } else {
        foundItem.indexNum = (foundItem.indexNum > idxNum) ? idxNum : foundItem.indexNum
        foundItem.quantity += qnt
      }
      qntAll += qnt
      basepayAll += basepay
      fundSumAll += fundSum
    }
    result.data = _.orderBy(result.data, ['indexNum', 'basepay'], ['asc', 'desc'])
    result.quantity = qntAll
    result.basepay = basepayAll
    result.fundSum = fundSumAll
    result.data.forEach(item => {
      item.indexNum = ++indexNum
      item.quantity = HR.reportUtils.formatAsNumberStr(item.quantity)
      item.basepay = HR.reportUtils.formatAsCurrencyStr(item.basepay, roundTo)
      item.fundSum = HR.reportUtils.formatAsCurrencyStr(item.fundSum, roundTo)
    })
    result.indexNum = indexNum
  }
  return result
}
