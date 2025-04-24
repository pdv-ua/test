/* global Ext _ UB AC HR appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    let ID = reportParams.orderID
    let staffTableID = reportParams.staffTableID
    let onDate = reportParams.onDate
    let orderState
    let roundTo = reportParams.roundTo
    let result = {
      emblem: HR.reportUtils.getEmblem(),
      delunits: [],
      addunits: []
    }
    if (!ID) {
      return result
    }
    let organizationID
    if (staffTableID) {
      // Визов з меню "Накази за штатним розписом"
      const order = await HR.reportUtils.getEmpOrder(ID, ['orderState'])
      if (!order) {
        return result
      }
      organizationID = order.organizationID
      onDate = onDate || order.orderDate
      orderState = order.orderState

      result.organizationName = order['organizationID.name']
      result.organizationNameGen = order['organizationID.nameGen'] || result.organizationName
      result.orderDate = AC.dateService.getStringFormatDate(order.orderDate, '', '', UB.i18n(' р.'))

      let respPosInfo = await HR.reportUtils.getResponsiblesIncaseInfo(order.respEmployeePositionID, order.orderDate || order.entryDate)
      if (respPosInfo) {
        result.respName = respPosInfo && respPosInfo.respName || ''
      }
    } else {
      // визов з меню "Планування штатного розпису"
      staffTableID = ID
      let data = await UB.Repository('hr_staffTableOrgStructure')
        .attrs(['orgID', 'orderDate', 'orderState', 'orgID.name', 'orgID.nameGen'])
        .joinCondition('orgID.mi_dateFrom', '<=', onDate)
        .joinCondition('orgID.mi_dateTo', '>=', onDate)
        .joinCondition('orgID.mi_deleteDate', '>=', '#maxdate')
        .selectById(ID)
      if (data) {
        organizationID = data.orgID
        result.organizationName = data['orgID.name']
        result.organizationNameGen = data['orgID.nameGen'] || result.organizationName
        result.orderDate = AC.dateService.getStringFormatDate(data.orderDate, '', '', UB.i18n(' р.'))
        orderState = data.orderState
      }
    }
    if (roundTo === undefined) {
      roundTo = AC.settings.get('hrRoundAccrualStaffTable', organizationID) === '1' ? 2 : 0
    }
    result.roundTo = roundTo <= 0 ? 'numberGroup' : 'decimal2'

    await HR.reportUtils.getOrderPrintConfig(result, organizationID)
    let childOrgIDs = await HR.treeUtils.getChildOrgs(organizationID, onDate)

    let newOrgStruct = await UB.Repository('hr_staffUnit')
      .attrs(['mi_data_id', 'parentUnitID', 'code', 'fullName', 'mi_unityEntity', 'accrualSum', 'liquidate', 'mi_treePath',
        'staffOrderID', 'quantity', 'state'])
      .where('orgID', 'in', childOrgIDs)
      /* старі посади, що вже існували на дату onDate */
      .where('mi_dateFrom', '<=', onDate, 'dateFrom')
      .where('mi_dateTo', '>=', onDate, 'dateTo')
      .where('state', '=', 'ACTIVE', 'active')
      .where('liquidate', '=', 0, 'liqu')
      .notExists(UB.Repository('hr_staffUnit')
        .correlation('mi_data_id', 'mi_data_id')
        .where('staffOrderID', '=', staffTableID)
        .where('mi_deleteDate', '>=', '#maxdate'),
      'notExist')
      /* нові \ змінені \ видалені посади по плановому розпису staffTableID */
      .where('staffOrderID', '=', staffTableID, 'order')
      .logic('(([active] and [liqu] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
      .orderBy('idxNum')
      .selectAsObject()

    /* Старі посади на onDate. Вважається, що нові зміни будуть введені в дію датою onDate */
    let oldOnDate = (orderState === 'POSTED') ? AC.dateService.addDays(onDate, -1) : onDate
    let oldOrgStruct = await UB.Repository('hr_staffUnit')
      .attrs(['mi_data_id', 'parentUnitID', 'code', 'fullName', 'mi_unityEntity', 'accrualSum', 'liquidate', 'mi_treePath',
        'staffOrderID', 'quantity', 'state'])
      .where('orgID', 'in', childOrgIDs)
      .where('mi_dateFrom', '<=', oldOnDate)
      .where('mi_dateTo', '>=', oldOnDate)
      .where('state', '=', 'ACTIVE')
      .where('liquidate', '=', 0)
      .selectAsObject()
    let oldTotalQuantity = 0
    let oldTotalBasepay = 0
    let oldTotalFundpay = 0
    oldOrgStruct.forEach(orgItem => {
      if (orgItem.mi_unityEntity === 'hr_position') {
        let orgItemQuantity = orgItem.quantity || 0
        let orgItemAccrualSum = orgItem.accrualSum || 0
        oldTotalQuantity += orgItemQuantity
        oldTotalBasepay += orgItemAccrualSum
        oldTotalFundpay += orgItemQuantity * orgItemAccrualSum
      }
    })
    result.oldTotalQuantity = oldTotalQuantity
    result.roundToQuantityOld = HR.reportUtils.getQuantityFractional(oldTotalQuantity)
    result.oldTotalBasepay = AC.currencyService.round(oldTotalBasepay, roundTo)
    result.oldTotalFundpay = AC.currencyService.round(oldTotalFundpay, roundTo)

    let delUnits = newOrgStruct.filter(orgItem => orgItem.staffOrderID === staffTableID && orgItem.liquidate)
    let addUnits = newOrgStruct.filter(orgItem => orgItem.staffOrderID === staffTableID && !orgItem.liquidate)
    /* В addUnits знаходяться нові та змінені оргодиниці. Змінені оргодиниці з addUnits повинні також попадати в ліквідовані delUnits зі старими окладами */
    let changedUnits = []
    let changedUnitIds = [0]
    addUnits.forEach(addUnit => {
      let currDataID = addUnit.mi_data_id
      let oldUnit = _.find(oldOrgStruct, { mi_data_id: currDataID })
      if (oldUnit) {
        changedUnits.push(oldUnit)
        changedUnitIds.push(currDataID)
      }
    })

    let delTreeIds = HR.treeUtils.treePathAsArray(delUnits)
    let chgTreeIds = HR.treeUtils.treePathAsArray(changedUnits)
    let delStruct = []
    newOrgStruct.forEach(orgItem => {
      let currDataID = orgItem.mi_data_id
      let currDataIDStr = currDataID.toString()
      if (delTreeIds.includes(currDataIDStr)) {
        delStruct.push(orgItem)
      } else if (chgTreeIds.includes(currDataIDStr)) {
        let addUnitToDel = _.find(changedUnits, { mi_data_id: currDataID })
        if (addUnitToDel) {
          delStruct.push(addUnitToDel)
        } else {
          delStruct.push(orgItem)
        }
      }
    })
    let totalDelQuantity = 0
    let totalDelBasepay = 0
    let totalDelFundpay = 0
    if (delStruct.length) {
      let delPos = await UB.Repository('hr_position')
        .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID.fullName', 'dictPositionID.name', 'quantity'])
        .where('orgID', 'in', childOrgIDs)
        .where('staffOrderID', '=', staffTableID)
        .where('liquidate', '=', 1)
        .misc({ __mip_recordhistory_all: true })
        .orderBy('dictPositionID.fullName')
        .orderBy('dictPositionID.name')
        .selectAsObject()
      let chgPos = await UB.Repository('hr_position')
        .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID.fullName', 'dictPositionID.name', 'quantity'])
        .where('orgID', 'in', childOrgIDs)
        .where('staffOrderID', '=', staffTableID)
        .where('mi_data_id', 'in', changedUnitIds)
        .misc({ __mip_recordhistory_all: true })
        .orderBy('dictPositionID.fullName')
        .orderBy('dictPositionID.name')
        .selectAsObject()
      if (chgPos.length) {
        let chgOldPos = await UB.Repository('hr_position')
          .attrs(['mi_data_id', 'dictPositionID.fullName', 'dictPositionID.name', 'quantity'])
          .where('orgID', 'in', childOrgIDs)
          .where('mi_data_id', 'in', changedUnitIds)
          .where('state', '=', 'ACTIVE')
          .misc({ __mip_ondate: oldOnDate })
          .selectAsObject()
        // Для змінених вузлів назву та кількість треба брати з попереднього старого запису
        chgPos.forEach(chgPosItem => {
          let oldPosItem = _.find(chgOldPos, { mi_data_id: chgPosItem.mi_data_id })
          if (oldPosItem) {
            chgPosItem['dictPositionID.fullName'] = oldPosItem['dictPositionID.fullName']
            chgPosItem['dictPositionID.name'] = oldPosItem['dictPositionID.name']
            chgPosItem.quantity = oldPosItem.quantity
          }
        })
      }
      let indexNum = 0
      let orgStruct1 = delStruct.filter(orgItem => orgItem.parentUnitID === organizationID)
      let rootDelPos = delPos.filter(pos => pos.parentUnitID === organizationID)
      let rootChgPos = chgPos.filter(pos => pos.parentUnitID === organizationID)
      if (rootDelPos.length || rootChgPos.length) {
        let rootPosObjs = getPosItems(rootDelPos, rootChgPos, orgStruct1, indexNum, roundTo)
        result.delpos = rootPosObjs.data
        totalDelQuantity += rootPosObjs.quantity
        totalDelBasepay += rootPosObjs.basepay
        totalDelFundpay += rootPosObjs.fundpay
        indexNum = rootPosObjs.indexNum
      }

      for (let i = 0; i < orgStruct1.length; i++) {
        let orgUnit1 = orgStruct1[i]
        const orgUnits1 = delStruct.filter(orgItem => orgItem.parentUnitID === orgUnit1.mi_data_id)
        let posDelItems1 = delPos.filter(pos => pos.parentUnitID === orgUnit1.mi_data_id)
        let posChgItems1 = chgPos.filter(pos => pos.parentUnitID === orgUnit1.mi_data_id)
        if (orgUnits1.length || posDelItems1.length || posChgItems1.length) {
          let orgUnitItem1 = { delUnitName: `${orgUnit1.code} ${orgUnit1.fullName}`.toUpperCase(), delunits: [], delpos: undefined, roundTo: result.roundTo }
          let orgUnitQuantity1 = 0
          let orgUnitBasepay1 = 0
          let orgUnitFundpay1 = 0
          let posItemObjs1 = getPosItems(posDelItems1, posChgItems1, orgUnits1, indexNum, roundTo)
          orgUnitItem1.delpos = posItemObjs1.data
          orgUnitQuantity1 += posItemObjs1.quantity
          orgUnitBasepay1 += posItemObjs1.basepay
          orgUnitFundpay1 += posItemObjs1.fundpay
          indexNum = posItemObjs1.indexNum
          for (let j = 0; j < orgUnits1.length; j++) {
            let orgUnit2 = orgUnits1[j]
            let orgUnits2 = delStruct.filter(orgItem => orgItem.parentUnitID === orgUnit2.mi_data_id)
            let posDelItems2 = delPos.filter(pos => pos.parentUnitID === orgUnit2.mi_data_id)
            let posChgItems2 = chgPos.filter(pos => pos.parentUnitID === orgUnit2.mi_data_id)
            if (orgUnits2.length || posDelItems2.length || posChgItems2.length) {
              let orgUnitItem2 = { delUnitName: `${orgUnit2.code} ${orgUnit2.fullName}`, delunits: [], delpos: undefined, roundTo: result.roundTo }
              let orgUnitQuantity2 = 0
              let orgUnitBasepay2 = 0
              let orgUnitFundpay2 = 0
              let posItemObjs2 = getPosItems(posDelItems2, posChgItems2, orgUnits2, indexNum, roundTo)
              orgUnitItem2.delpos = posItemObjs2.data
              orgUnitQuantity2 += posItemObjs2.quantity
              orgUnitBasepay2 += posItemObjs2.basepay
              orgUnitFundpay2 += posItemObjs2.fundpay
              indexNum = posItemObjs2.indexNum
              for (let j2 = 0; j2 < orgUnits2.length; j2++) {
                let orgUnit3 = orgUnits2[j2]
                let orgUnits3 = delStruct.filter(orgItem => orgItem.parentUnitID === orgUnit3.mi_data_id)
                let posDelItems3 = delPos.filter(pos => pos.parentUnitID === orgUnit3.mi_data_id)
                let posChgItems3 = chgPos.filter(pos => pos.parentUnitID === orgUnit3.mi_data_id)
                if (orgUnits3.length || posDelItems3.length || posChgItems3.length) {
                  let orgUnitItem3 = { delUnitName: `${orgUnit3.code} ${orgUnit3.fullName}`, delunits: [], delpos: undefined, roundTo: result.roundTo }
                  let orgUnitQuantity3 = 0
                  let orgUnitBasepay3 = 0
                  let orgUnitFundpay3 = 0
                  let posItemObjs3 = getPosItems(posDelItems3, posChgItems3, orgUnits3, indexNum, roundTo)
                  orgUnitItem3.delpos = posItemObjs3.data
                  orgUnitQuantity3 += posItemObjs3.quantity
                  orgUnitBasepay3 += posItemObjs3.basepay
                  orgUnitFundpay3 += posItemObjs3.fundpay
                  indexNum = posItemObjs3.indexNum
                  for (let j3 = 0; j3 < orgUnits3.length; j3++) {
                    let orgUnit4 = orgUnits3[j3]
                    let orgUnits4 = delStruct.filter(orgItem => orgItem.parentUnitID === orgUnit4.mi_data_id)
                    let posDelItems4 = delPos.filter(pos => pos.parentUnitID === orgUnit4.mi_data_id)
                    let posChgItems4 = chgPos.filter(pos => pos.parentUnitID === orgUnit4.mi_data_id)
                    if (orgUnits4.length || posDelItems4.length || posChgItems4.length) {
                      let orgUnitItem4 = { delUnitName: `${orgUnit4.code} ${orgUnit4.fullName}`, delunits: [], delpos: undefined, roundTo: result.roundTo }
                      let orgUnitQuantity4 = 0
                      let orgUnitBasepay4 = 0
                      let orgUnitFundpay4 = 0
                      let posItemObjs4 = getPosItems(posDelItems4, posChgItems4, orgUnits4, indexNum, roundTo)
                      orgUnitItem4.delpos = posItemObjs4.data
                      orgUnitQuantity4 += posItemObjs4.quantity
                      orgUnitBasepay4 += posItemObjs4.basepay
                      orgUnitFundpay4 += posItemObjs4.fundpay
                      indexNum = posItemObjs4.indexNum
                      for (let j4 = 0; j4 < orgUnits4.length; j4++) {
                        let orgUnit5 = orgUnits4[j4]
                        let orgUnits5 = delStruct.filter(orgItem => orgItem.parentUnitID === orgUnit5.mi_data_id)
                        let posDelItems5 = delPos.filter(pos => pos.parentUnitID === orgUnit5.mi_data_id)
                        let posChgItems5 = chgPos.filter(pos => pos.parentUnitID === orgUnit5.mi_data_id)
                        if (orgUnits5.length || posDelItems5.length || posChgItems5.length) {
                          let orgUnitItem5 = { delUnitName: `${orgUnit5.code} ${orgUnit5.fullName}`, delunits: [], delpos: undefined, roundTo: result.roundTo }
                          let orgUnitQuantity5 = 0
                          let orgUnitBasepay5 = 0
                          let orgUnitFundpay5 = 0
                          let posItemObjs5 = getPosItems(posDelItems5, posChgItems5, orgUnits5, indexNum, roundTo)
                          orgUnitItem5.delpos = posItemObjs5.data
                          orgUnitQuantity5 += posItemObjs5.quantity
                          orgUnitBasepay5 += posItemObjs5.basepay
                          orgUnitFundpay5 += posItemObjs5.fundpay
                          indexNum = posItemObjs5.indexNum
                          for (let j5 = 0; j5 < orgUnits5.length; j5++) {
                            let orgUnit6 = orgUnits5[j5]
                            let orgUnits6 = delStruct.filter(orgItem => orgItem.parentUnitID === orgUnit6.mi_data_id)
                            let posDelItems6 = delPos.filter(pos => pos.parentUnitID === orgUnit6.mi_data_id)
                            let posChgItems6 = chgPos.filter(pos => pos.parentUnitID === orgUnit6.mi_data_id)
                            if (orgUnits6.length || posDelItems6.length || posChgItems6.length) {
                              let orgUnitItem6 = { delUnitName: `${orgUnit6.code} ${orgUnit6.fullName}`, delunits: [], delpos: undefined, roundTo: result.roundTo }
                              let orgUnitQuantity6 = 0
                              let orgUnitBasepay6 = 0
                              let orgUnitFundpay6 = 0
                              let posItemObjs6 = getPosItems(posDelItems6, posChgItems6, orgUnits6, indexNum, roundTo)
                              orgUnitItem6.delpos = posItemObjs6.data
                              orgUnitQuantity6 += posItemObjs6.quantity
                              orgUnitBasepay6 += posItemObjs6.basepay
                              orgUnitFundpay6 += posItemObjs6.fundpay
                              indexNum = posItemObjs6.indexNum
                              orgUnitItem6.orgUnitQuantity = orgUnitQuantity6
                              orgUnitItem6.orgUnitBasepay = AC.currencyService.round(orgUnitBasepay6, roundTo)
                              orgUnitItem6.orgUnitFundpay = AC.currencyService.round(orgUnitFundpay6, roundTo)
                              orgUnitItem5.delunits.push(orgUnitItem6)
                              orgUnitQuantity5 += orgUnitQuantity6
                              orgUnitBasepay5 += orgUnitBasepay6
                              orgUnitFundpay5 += orgUnitFundpay6
                            }
                          }
                          orgUnitItem5.orgUnitQuantity = orgUnitQuantity5
                          orgUnitItem5.orgUnitBasepay = AC.currencyService.round(orgUnitBasepay5, roundTo)
                          orgUnitItem5.orgUnitFundpay = AC.currencyService.round(orgUnitFundpay5, roundTo)
                          orgUnitItem4.delunits.push(orgUnitItem5)
                          orgUnitQuantity4 += orgUnitQuantity5
                          orgUnitBasepay4 += orgUnitBasepay5
                          orgUnitFundpay4 += orgUnitFundpay5
                        }
                      }
                      orgUnitItem4.orgUnitQuantity = orgUnitQuantity4
                      orgUnitItem4.orgUnitBasepay = AC.currencyService.round(orgUnitBasepay4, roundTo)
                      orgUnitItem4.orgUnitFundpay = AC.currencyService.round(orgUnitFundpay4, roundTo)
                      orgUnitItem3.delunits.push(orgUnitItem4)
                      orgUnitQuantity3 += orgUnitQuantity4
                      orgUnitBasepay3 += orgUnitBasepay4
                      orgUnitFundpay3 += orgUnitFundpay4
                    }
                  }
                  orgUnitItem3.orgUnitQuantity = orgUnitQuantity3
                  orgUnitItem3.orgUnitBasepay = AC.currencyService.round(orgUnitBasepay3, roundTo)
                  orgUnitItem3.orgUnitFundpay = AC.currencyService.round(orgUnitFundpay3, roundTo)
                  orgUnitItem2.delunits.push(orgUnitItem3)
                  orgUnitQuantity2 += orgUnitQuantity3
                  orgUnitBasepay2 += orgUnitBasepay3
                  orgUnitFundpay2 += orgUnitFundpay3
                }
              }
              orgUnitItem2.orgUnitQuantity = orgUnitQuantity2
              orgUnitItem2.orgUnitBasepay = AC.currencyService.round(orgUnitBasepay2, roundTo)
              orgUnitItem2.orgUnitFundpay = AC.currencyService.round(orgUnitFundpay2, roundTo)
              orgUnitItem1.delunits.push(orgUnitItem2)
              orgUnitQuantity1 += orgUnitQuantity2
              orgUnitBasepay1 += orgUnitBasepay2
              orgUnitFundpay1 += orgUnitFundpay2
            }
          }
          orgUnitItem1.orgUnitQuantity = orgUnitQuantity1
          orgUnitItem1.orgUnitBasepay = AC.currencyService.round(orgUnitBasepay1, roundTo)
          orgUnitItem1.orgUnitFundpay = AC.currencyService.round(orgUnitFundpay1, roundTo)
          result.delunits.push(orgUnitItem1)
          totalDelQuantity += orgUnitQuantity1
          totalDelBasepay += orgUnitBasepay1
          totalDelFundpay += orgUnitFundpay1
        }
      }

      result.delTotals = {
        totalDelQuantity: totalDelQuantity,
        roundToQuantityDel: HR.reportUtils.getQuantityFractional(totalDelQuantity),
        totalDelBasepay: AC.currencyService.round(totalDelBasepay, roundTo),
        totalDelFundpay: AC.currencyService.round(totalDelFundpay, roundTo),
        roundTo: result.roundTo
      }
    }

    let addTreeIds = HR.treeUtils.treePathAsArray(addUnits)
    let addStruct = []
    newOrgStruct.forEach(orgItem => {
      if (addTreeIds.includes(orgItem.mi_data_id.toString())) {
        addStruct.push(orgItem)
      }
    })
    let totalAddQuantity = 0
    let totalAddBasepay = 0
    let totalAddFundpay = 0
    if (addStruct.length) {
      let addPos = await UB.Repository('hr_position')
        .attrs(['ID', 'mi_data_id', 'parentUnitID', 'staffOrderID', 'idxNum', 'dictPositionID.fullName', 'dictPositionID.name', 'quantity'])
        .where('orgID', 'in', childOrgIDs)
        .where('staffOrderID', '=', staffTableID)
        .where('liquidate', '=', 0)
        .misc({ __mip_recordhistory_all: true })
        .orderBy('dictPositionID.fullName')
        .orderBy('dictPositionID.name')
        .selectAsObject()
      let indexNum = 0
      let orgStruct1 = addStruct.filter(orgItem => orgItem.parentUnitID === organizationID)
      let rootPos = addPos.filter(pos => pos.parentUnitID === organizationID)
      if (rootPos.length) {
        let rootPosObjs = getPosItems(rootPos, undefined, orgStruct1, indexNum, roundTo)
        result.addpos = rootPosObjs.data
        totalAddQuantity += rootPosObjs.quantity
        totalAddBasepay += rootPosObjs.basepay
        totalAddFundpay += rootPosObjs.fundpay
        indexNum = rootPosObjs.indexNum
      }

      for (let i = 0; i < orgStruct1.length; i++) {
        let orgUnit1 = orgStruct1[i]
        const orgUnits1 = addStruct.filter(orgItem => orgItem.parentUnitID === orgUnit1.mi_data_id)
        let posItems1 = addPos.filter(pos => pos.parentUnitID === orgUnit1.mi_data_id)
        if (orgUnits1.length || posItems1.length) {
          let orgUnitItem1 = { addUnitName: `${orgUnit1.code} ${orgUnit1.fullName}`.toUpperCase(), addunits: [], addpos: undefined, roundTo: result.roundTo }
          let orgUnitQuantity1 = 0
          let orgUnitBasepay1 = 0
          let orgUnitFundpay1 = 0
          let posItemObjs1 = getPosItems(posItems1, undefined, orgUnits1, indexNum, roundTo)
          orgUnitItem1.addpos = posItemObjs1.data
          orgUnitQuantity1 += posItemObjs1.quantity
          orgUnitBasepay1 += posItemObjs1.basepay
          orgUnitFundpay1 += posItemObjs1.fundpay
          indexNum = posItemObjs1.indexNum
          for (let j = 0; j < orgUnits1.length; j++) {
            let orgUnit2 = orgUnits1[j]
            let orgUnits2 = addStruct.filter(orgItem => orgItem.parentUnitID === orgUnit2.mi_data_id)
            let posItems2 = addPos.filter(pos => pos.parentUnitID === orgUnit2.mi_data_id)
            if (orgUnits2.length || posItems2.length) {
              let orgUnitItem2 = { addUnitName: `${orgUnit2.code} ${orgUnit2.fullName}`, addunits: [], addpos: undefined, roundTo: result.roundTo }
              let orgUnitQuantity2 = 0
              let orgUnitBasepay2 = 0
              let orgUnitFundpay2 = 0
              let posItemObjs2 = getPosItems(posItems2, undefined, orgUnits2, indexNum, roundTo)
              orgUnitItem2.addpos = posItemObjs2.data
              orgUnitQuantity2 += posItemObjs2.quantity
              orgUnitBasepay2 += posItemObjs2.basepay
              orgUnitFundpay2 += posItemObjs2.fundpay
              indexNum = posItemObjs2.indexNum
              for (let j2 = 0; j2 < orgUnits2.length; j2++) {
                let orgUnit3 = orgUnits2[j2]
                let orgUnits3 = addStruct.filter(orgItem => orgItem.parentUnitID === orgUnit3.mi_data_id)
                let posItems3 = addPos.filter(pos => pos.parentUnitID === orgUnit3.mi_data_id)
                if (orgUnits3.length || posItems3.length) {
                  let orgUnitItem3 = { addUnitName: `${orgUnit3.code} ${orgUnit3.fullName}`, addunits: [], addpos: undefined, roundTo: result.roundTo }
                  let orgUnitQuantity3 = 0
                  let orgUnitBasepay3 = 0
                  let orgUnitFundpay3 = 0
                  let posItemObjs3 = getPosItems(posItems3, undefined, orgUnits3, indexNum, roundTo)
                  orgUnitItem3.addpos = posItemObjs3.data
                  orgUnitQuantity3 += posItemObjs3.quantity
                  orgUnitBasepay3 += posItemObjs3.basepay
                  orgUnitFundpay3 += posItemObjs3.fundpay
                  indexNum = posItemObjs3.indexNum
                  for (let j3 = 0; j3 < orgUnits3.length; j3++) {
                    let orgUnit4 = orgUnits3[j3]
                    let orgUnits4 = addStruct.filter(orgItem => orgItem.parentUnitID === orgUnit4.mi_data_id)
                    let posItems4 = addPos.filter(pos => pos.parentUnitID === orgUnit4.mi_data_id)
                    if (orgUnits4.length || posItems4.length) {
                      let orgUnitItem4 = { addUnitName: `${orgUnit4.code} ${orgUnit4.fullName}`, addunits: [], addpos: undefined, roundTo: result.roundTo }
                      let orgUnitQuantity4 = 0
                      let orgUnitBasepay4 = 0
                      let orgUnitFundpay4 = 0
                      let posItemObjs4 = getPosItems(posItems4, undefined, orgUnits4, indexNum, roundTo)
                      orgUnitItem4.addpos = posItemObjs4.data
                      orgUnitQuantity4 += posItemObjs4.quantity
                      orgUnitBasepay4 += posItemObjs4.basepay
                      orgUnitFundpay4 += posItemObjs4.fundpay
                      indexNum = posItemObjs4.indexNum
                      for (let j4 = 0; j4 < orgUnits4.length; j4++) {
                        let orgUnit5 = orgUnits4[j4]
                        let orgUnits5 = addStruct.filter(orgItem => orgItem.parentUnitID === orgUnit5.mi_data_id)
                        let posItems5 = addPos.filter(pos => pos.parentUnitID === orgUnit5.mi_data_id)
                        if (orgUnits5.length || posItems5.length) {
                          let orgUnitItem5 = { addUnitName: `${orgUnit5.code} ${orgUnit5.fullName}`, addunits: [], addpos: undefined, roundTo: result.roundTo }
                          let orgUnitQuantity5 = 0
                          let orgUnitBasepay5 = 0
                          let orgUnitFundpay5 = 0
                          let posItemObjs5 = getPosItems(posItems5, undefined, orgUnits5, indexNum, roundTo)
                          orgUnitItem5.addpos = posItemObjs5.data
                          orgUnitQuantity5 += posItemObjs5.quantity
                          orgUnitBasepay5 += posItemObjs5.basepay
                          orgUnitFundpay5 += posItemObjs5.fundpay
                          indexNum = posItemObjs5.indexNum
                          for (let j5 = 0; j5 < orgUnits5.length; j5++) {
                            let orgUnit6 = orgUnits5[j5]
                            let orgUnits6 = addStruct.filter(orgItem => orgItem.parentUnitID === orgUnit6.mi_data_id)
                            let posItems6 = addPos.filter(pos => pos.parentUnitID === orgUnit6.mi_data_id)
                            if (orgUnits6.length || posItems6.length) {
                              let orgUnitItem6 = { addUnitName: `${orgUnit6.code} ${orgUnit6.fullName}`, addunits: [], addpos: undefined, roundTo: result.roundTo }
                              let orgUnitQuantity6 = 0
                              let orgUnitBasepay6 = 0
                              let orgUnitFundpay6 = 0
                              let posItemObjs6 = getPosItems(posItems6, undefined, orgUnits6, indexNum, roundTo)
                              orgUnitItem6.addpos = posItemObjs6.data
                              orgUnitQuantity6 += posItemObjs6.quantity
                              orgUnitBasepay6 += posItemObjs6.basepay
                              orgUnitFundpay6 += posItemObjs6.fundpay
                              indexNum = posItemObjs6.indexNum
                              orgUnitItem6.orgUnitQuantity = orgUnitQuantity6
                              orgUnitItem6.orgUnitBasepay = AC.currencyService.round(orgUnitBasepay6, roundTo)
                              orgUnitItem6.orgUnitFundpay = AC.currencyService.round(orgUnitFundpay6, roundTo)
                              orgUnitItem5.addunits.push(orgUnitItem6)
                              orgUnitQuantity5 += orgUnitQuantity6
                              orgUnitBasepay5 += orgUnitBasepay6
                              orgUnitFundpay5 += orgUnitFundpay6
                            }
                          }
                          orgUnitItem5.orgUnitQuantity = orgUnitQuantity5
                          orgUnitItem5.orgUnitBasepay = AC.currencyService.round(orgUnitBasepay5, roundTo)
                          orgUnitItem5.orgUnitFundpay = AC.currencyService.round(orgUnitFundpay5, roundTo)
                          orgUnitItem4.addunits.push(orgUnitItem5)
                          orgUnitQuantity4 += orgUnitQuantity5
                          orgUnitBasepay4 += orgUnitBasepay5
                          orgUnitFundpay4 += orgUnitFundpay5
                        }
                      }
                      orgUnitItem4.orgUnitQuantity = orgUnitQuantity4
                      orgUnitItem4.orgUnitBasepay = AC.currencyService.round(orgUnitBasepay4, roundTo)
                      orgUnitItem4.orgUnitFundpay = AC.currencyService.round(orgUnitFundpay4, roundTo)
                      orgUnitItem3.addunits.push(orgUnitItem4)
                      orgUnitQuantity3 += orgUnitQuantity4
                      orgUnitBasepay3 += orgUnitBasepay4
                      orgUnitFundpay3 += orgUnitFundpay4
                    }
                  }
                  orgUnitItem3.orgUnitQuantity = orgUnitQuantity3
                  orgUnitItem3.orgUnitBasepay = AC.currencyService.round(orgUnitBasepay3, roundTo)
                  orgUnitItem3.orgUnitFundpay = AC.currencyService.round(orgUnitFundpay3, roundTo)
                  orgUnitItem2.addunits.push(orgUnitItem3)
                  orgUnitQuantity2 += orgUnitQuantity3
                  orgUnitBasepay2 += orgUnitBasepay3
                  orgUnitFundpay2 += orgUnitFundpay3
                }
              }
              orgUnitItem2.orgUnitQuantity = orgUnitQuantity2
              orgUnitItem2.orgUnitBasepay = AC.currencyService.round(orgUnitBasepay2, roundTo)
              orgUnitItem2.orgUnitFundpay = AC.currencyService.round(orgUnitFundpay2, roundTo)
              orgUnitItem1.addunits.push(orgUnitItem2)
              orgUnitQuantity1 += orgUnitQuantity2
              orgUnitBasepay1 += orgUnitBasepay2
              orgUnitFundpay1 += orgUnitFundpay2
            }
          }
          orgUnitItem1.orgUnitQuantity = orgUnitQuantity1
          orgUnitItem1.orgUnitBasepay = AC.currencyService.round(orgUnitBasepay1, roundTo)
          orgUnitItem1.orgUnitFundpay = AC.currencyService.round(orgUnitFundpay1, roundTo)
          result.addunits.push(orgUnitItem1)
          totalAddQuantity += orgUnitQuantity1
          totalAddBasepay += orgUnitBasepay1
          totalAddFundpay += orgUnitFundpay1
        }
      }

      result.addTotals = {
        totalAddQuantity: totalAddQuantity,
        roundToQuantityAdd: HR.reportUtils.getQuantityFractional(totalAddQuantity),
        totalAddBasepay: AC.currencyService.round(totalAddBasepay, roundTo),
        totalAddFundpay: AC.currencyService.round(totalAddFundpay, roundTo),
        roundTo: result.roundTo
      }
    }

    let newTotalQuantity = oldTotalQuantity - totalDelQuantity + totalAddQuantity
    let newTotalBasepay = oldTotalBasepay - totalDelBasepay + totalAddBasepay
    let newTotalFundpay = oldTotalFundpay - totalDelFundpay + totalAddFundpay
    result.newTotalQuantity = newTotalQuantity
    result.roundToQuantityNew = HR.reportUtils.getQuantityFractional(newTotalQuantity)
    result.newTotalBasepay = AC.currencyService.round(newTotalBasepay, roundTo)
    result.newTotalFundpay = AC.currencyService.round(newTotalFundpay, roundTo)

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
              name: 'empOrderID',
              fieldLabel: UB.i18n('Наказ штатного розпису'),
              labelWidth: 180,
              gridFieldList: ['description'],
              displayField: 'description',
              allowBlank: false,
              ubRequest: {
                entity: 'hr_empOrder',
                fieldList: ['ID', 'description', 'staffTableID'],
                whereList: {
                  organizationID: {
                    expression: '[organizationID]',
                    condition: 'in',
                    values: {
                      value: [0]
                    }
                  },
                  empOrderType: {
                    expression: '[empOrderType]',
                    condition: '=',
                    values: {
                      value: 'STAFFLIST'
                    }
                  }
                },
                orderList: { orderBy: { expression: 'description' } }
              },
              listeners: {
                render: function (ctrl) {
                  let orgID = appAC.globalOrganization()
                  let onDate = appAC.globalApplicationDate()
                  HR.treeUtils.getChildOrgsPromise(orgID, onDate).then(data => {
                    let childOrgIDs = [orgID]
                    data.forEach(orgItem => {
                      childOrgIDs.push(orgItem.mi_data_id)
                    })
                    ctrl.store.ubRequest.whereList.organizationID.values.value = childOrgIDs
                    ctrl.store.on('load', () => {
                      if (!ctrl.store.isLoaded) {
                        ctrl.store.isLoaded = true
                        let staffTableID = incomeParams.staffTableID
                        if (staffTableID) {
                          ctrl.setValueById(incomeParams.orderID)
                        } else {
                          staffTableID = incomeParams.orderID
                          let storeItems = ctrl.store.data.items
                          let selItem = _.find(storeItems, { data: { staffTableID: staffTableID } })
                          if (selItem) {
                            ctrl.setValue(selItem.data.ID)
                          }
                        }
                      }
                    })
                    ctrl.store.load()
                  })
                }
              }
            },
            HR.reportUtils.roundToCombo({ labelWidth: 180 })
          ]
        }
      ],
      getParameters: function (owner) {
        let frm = owner.getForm()
        let empOrderID = frm.findField('empOrderID')
        let reco = AC.gridUtils.getCurrentRecord(empOrderID)
        let staffTableID = reco && reco.get('staffTableID')
        let onDate = reco && reco.get('orderDate')
        let roundTo = frm.findField('roundToCombo').getValue()
        return {
          orderID: empOrderID.getValue() || 0,
          staffTableID: staffTableID || 0,
          onDate: onDate,
          roundTo: (roundTo === undefined) ? 2 : roundTo
        }
      }
    })
    return paramForm
  }
}

function getPosItems (posItems, posItems2, orgData, indexNum, roundTo) {
  let result = {
    data: [],
    quantity: 0,
    roundToQuantity: 'numberGroup',
    roundTo: roundTo <= 0 ? 'numberGroup' : 'decimal2',
    basepay: 0,
    fundpay: 0,
    indexNum: indexNum
  }
  if (posItems.length || (posItems2 && posItems2.length)) {
    addPosItems(posItems, orgData, result, roundTo)
    addPosItems(posItems2, orgData, result, roundTo)

    result.data = _.orderBy(result.data, ['indexNum', 'basepay'], ['asc', 'desc'])
    result.data.forEach(item => {
      item.indexNum = ++indexNum
      // item.quantity = HR.reportUtils.formatAsNumberStr(item.quantity)
      item.roundToQuantity = HR.reportUtils.getQuantityFractional(item.quantity)
      item.basepay = AC.currencyService.round(item.basepay, roundTo)
      item.fundpay = AC.currencyService.round(item.fundpay, roundTo)
      item.roundTo = roundTo <= 0 ? 'numberGroup' : 'decimal2'
    })
    result.indexNum = indexNum
  }
  return result
}

function addPosItems (posItems, orgData, resultObj, roundTo) {
  if (posItems && posItems.length) {
    for (let i = 0; i < posItems.length; i++) {
      let posItem = posItems[i]
      let posName = posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || ''
      let qnt = posItem.quantity || 0
      let idxNum = posItem.idxNum || 99999999
      let orgItem = orgData ? _.find(orgData, { mi_data_id: posItem.mi_data_id }) : undefined
      let basepay = orgItem ? orgItem.accrualSum : 0
      let fundpay = qnt * basepay
      let foundItem = _.find(resultObj.data, { posName: posName, basepay: basepay })
      if (!foundItem) {
        foundItem = {
          indexNum: idxNum,
          posName: posName,
          quantity: qnt,
          roundToQuantity: HR.reportUtils.getQuantityFractional(qnt),
          basepay: basepay,
          fundpay: fundpay,
          roundTo: roundTo <= 0 ? 'numberGroup' : 'decimal2'
        }
        resultObj.data.push(foundItem)
      } else {
        foundItem.indexNum = (foundItem.indexNum > idxNum) ? idxNum : foundItem.indexNum
        foundItem.quantity += qnt
        foundItem.roundToQuantity = HR.reportUtils.getQuantityFractional(foundItem.quantity)
        foundItem.basepay += basepay
        foundItem.fundpay += fundpay
      }
      resultObj.quantity += qnt
      resultObj.roundToQuantity = HR.reportUtils.getQuantityFractional(resultObj.quantity)
      resultObj.basepay += basepay
      resultObj.fundpay += fundpay
    }
  }
}
