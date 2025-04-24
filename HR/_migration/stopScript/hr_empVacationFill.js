const dateService = require('../../../AC/modules/dataServices/dateService')

module.exports.run = (conn) => {
  const onDate = dateService.currentDate()
  let newID
  let changedValues
  function getChangedValues (oldValues, empVacationID) {
    let res
    if (oldValues) {
      res = JSON.parse(oldValues)
    } else {
      res = { inserted: [], updated: [] }
    }
    let existedEmpVac = res.inserted.find(itm => itm.hr_employeeVacation && itm.hr_employeeVacation === empVacationID)
    if (!existedEmpVac) {
      res.inserted.push({ hr_employeeVacation: empVacationID })
    }
    return JSON.stringify(res)
  }

  // Наказ про надання відпустки (щорічна,група), Наказ про продовження, перенесення відпустки (щорічна), Наказ про відкликання з відпустки
  let empOrderTypes = ['VACATION', 'VACATIONPROLONG', 'VACATIONREVOKE']
  const vacations = conn.Repository('hr_empOrderVacationListDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'employeeNumberID.orgID', 'dictVacationKindID', 'empVacationPeriodID',
      'dateFrom', 'dateTo', 'dayCount', 'empOrderType', 'orderID', 'orderID.orderNumber', 'orderID.orderDate', 'orderID.periodID',
      'orderID.orderState', 'paraID', 'changedValues'])
    .where('empOrderType', 'in', empOrderTypes)
    .where('orderID.orderState', '!=', 'PROJECT')
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.orgID.state', '=', 'ACTIVE')
    .where('employeeNumberID.orgID.mi_dateFrom', '<=', onDate)
    .where('employeeNumberID.orgID.mi_dateTo', '>=', onDate)
    .where('employeeNumberID.orgID.mi_deleteDate', '>=', '#maxdate')
    .notExists(conn.Repository('hr_employeeVacation')
      .correlation('paraID', 'ID')
      .where('mi_deleteDate', '>=', '#maxdate'))
    .selectAsObject()
  if (vacations.length > 0) {
    const vacDet = conn.Repository('hr_empOrderVacationDet')
      .attrs(['ID', 'isMoneyHelp'])
      .selectAsObject()
    const vacProlongDet = conn.Repository('hr_empOrderVacationprolongDet')
      .attrs(['ID', 'isMovement'])
      .selectAsObject()
    vacations.forEach(vac => {
      let dayCount
      let cntDay
      let vacationStatus
      let isMoneyHelp = false
      let isMovement = false
      switch (vac.empOrderType) {
        case 'VACATIONPROLONG':
          let vacProlongDetItem = vacProlongDet.find(itm => itm.ID === vac.paraID)
          isMovement = vacProlongDetItem && vacProlongDetItem.isMovement
          if (isMovement) {
            vacationStatus = 'MOVE'
            dayCount = -vac.dayCount
            cntDay = dayCount
          } else {
            vacationStatus = 'PROLONG'
            dayCount = vac.dayCount
            cntDay = null
          }
          break
        case 'VACATIONREVOKE':
          dayCount = -vac.dayCount
          cntDay = dayCount
          vacationStatus = 'REVOKE'
          break
        default:
          dayCount = vac.dayCount
          cntDay = dayCount
          vacationStatus = 'GRANT'
          let vacDetItem = vacDet.find(itm => itm.ID === vac.paraID)
          isMoneyHelp = vacDetItem && vacDetItem.isMoneyHelp
          break
      }
      newID = conn.insert({
        entity: 'hr_employeeVacation',
        fieldList: ['ID'],
        execParams: {
          organizationID: vac['employeeNumberID.orgID'],
          orderNumber: vac['orderID.orderNumber'],
          orderDate: vac['orderID.orderDate'] || vac['orderID.entryDate'],
          orderID: vac.orderID,
          paraID: vac.ID,
          dictVacationKindID: vac.dictVacationKindID,
          employeeID: vac.employeeID,
          employeePositionID: vac.employeePositionID,
          employeeNumberID: vac.employeeNumberID,
          dayCount: dayCount,
          cntDay: cntDay,
          dateFrom: vac.dateFrom,
          dateTo: vac.dateTo,
          dictPeriodID: vac['orderID.periodID'],
          empVacationPeriodID: vac.empVacationPeriodID,
          avgSum: 0,
          vacationStatus: vacationStatus,
          orderState: vac['orderID.orderState'],
          isMoneyHelp: isMoneyHelp
        }
      })
      if (newID) {
        changedValues = getChangedValues(vac.changedValues, newID)
        conn.update({
          entity: 'hr_empOrderVacationListDet',
          execParams: {
            ID: vac.ID,
            changedValues: changedValues
          },
          __skipOptimisticLock: true
        })
      }
    })
  }

  // Наказ про надання відпустки (неперіодичної)
  const longvacations = conn.Repository('hr_empOrderVacationlongDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'employeeNumberID.orgID', 'dictVacationKindID',
      'dateFrom', 'dateTo', 'dayCount', 'orderID', 'orderID.orderNumber', 'orderID.orderDate', 'orderID.entryDate', 'orderID.periodID',
      'orderID.orderState', 'changedValues'])
    .where('orderID.orderState', '!=', 'PROJECT')
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.orgID.state', '=', 'ACTIVE')
    .where('employeeNumberID.orgID.mi_dateFrom', '<=', onDate)
    .where('employeeNumberID.orgID.mi_dateTo', '>=', onDate)
    .where('employeeNumberID.orgID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .notExists(conn.Repository('hr_employeeVacation')
      .correlation('paraID', 'ID')
      .where('mi_deleteDate', '>=', '#maxdate'))
    .selectAsObject()
  if (longvacations.length > 0) {
    longvacations.forEach(vac => {
      newID = conn.insert({
        entity: 'hr_employeeVacation',
        fieldList: ['ID'],
        execParams: {
          organizationID: vac['employeeNumberID.orgID'],
          orderNumber: vac['orderID.orderNumber'],
          orderDate: vac['orderID.orderDate'] || vac['orderID.entryDate'],
          orderID: vac.orderID,
          paraID: vac.ID,
          dictVacationKindID: vac.dictVacationKindID,
          employeeID: vac.employeeID,
          employeePositionID: vac.employeePositionID,
          employeeNumberID: vac.employeeNumberID,
          dayCount: vac.dayCount,
          cntDay: vac.dayCount,
          dateFrom: vac.dateFrom,
          dateTo: vac.dateTo,
          dictPeriodID: vac['orderID.periodID'],
          empVacationPeriodID: null,
          avgSum: 0,
          vacationStatus: 'GRANTLONG',
          orderState: vac['orderID.orderState']
        }
      })
      if (newID) {
        changedValues = getChangedValues(vac.changedValues, newID)
        conn.update({
          entity: 'hr_empOrderVacationlongDet',
          execParams: {
            ID: vac.ID,
            changedValues: changedValues
          },
          __skipOptimisticLock: true
        })
      }
    })
  }

  // Наказ про продовження відпустки (неперіодичної)
  const llongvacations = conn.Repository('hr_empOrderVacationprolonglDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'employeeNumberID.orgID', 'grantVacationParaID',
      'dateFrom', 'dateTo', 'dayCount', 'orderID', 'orderID.orderNumber', 'orderID.orderDate', 'orderID.entryDate', 'orderID.periodID',
      'orderID.orderState', 'changedValues'])
    .where('orderID.orderState', '!=', 'PROJECT')
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.orgID.state', '=', 'ACTIVE')
    .where('employeeNumberID.orgID.mi_dateFrom', '<=', onDate)
    .where('employeeNumberID.orgID.mi_dateTo', '>=', onDate)
    .where('employeeNumberID.orgID.mi_deleteDate', '>=', '#maxdate')
    .notExists(conn.Repository('hr_employeeVacation')
      .correlation('paraID', 'ID')
      .where('mi_deleteDate', '>=', '#maxdate'))
    .selectAsObject()
  const grantVacations = conn.Repository('hr_empOrderVacationlongDet')
    .attrs(['ID', 'dictVacationKindID'])
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.orgID.state', '=', 'ACTIVE')
    .where('employeeNumberID.orgID.mi_dateFrom', '<=', onDate)
    .where('employeeNumberID.orgID.mi_dateTo', '>=', onDate)
    .where('employeeNumberID.orgID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  if (llongvacations.length > 0) {
    llongvacations.forEach(vac => {
      let grantVac = grantVacations.find(itm => itm.ID === vac.grantVacationParaID)
      let dictVacationKindID = grantVac && grantVac.dictVacationKindID
      if (dictVacationKindID) {
        newID = conn.insert({
          entity: 'hr_employeeVacation',
          fieldList: ['ID'],
          execParams: {
            organizationID: vac['employeeNumberID.orgID'],
            orderNumber: vac['orderID.orderNumber'],
            orderDate: vac['orderID.orderDate'] || vac['orderID.entryDate'],
            orderID: vac.orderID,
            paraID: vac.ID,
            dictVacationKindID: dictVacationKindID,
            employeeID: vac.employeeID,
            employeePositionID: vac.employeePositionID,
            employeeNumberID: vac.employeeNumberID,
            dayCount: vac.dayCount,
            cntDay: vac.dayCount,
            dateFrom: vac.dateFrom,
            dateTo: vac.dateTo,
            dictPeriodID: vac['orderID.periodID'],
            empVacationPeriodID: null,
            avgSum: 0,
            vacationStatus: 'PROLONGL',
            orderState: vac['orderID.orderState']
          }
        })
        if (newID) {
          changedValues = getChangedValues(vac.changedValues, newID)
          conn.update({
            entity: 'hr_empOrderVacationprolonglDet',
            execParams: {
              ID: vac.ID,
              changedValues: changedValues
            },
            __skipOptimisticLock: true
          })
        }
      }
    })
  }

  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_employeeVacation
        set vacationStatus = 'PROLONGL'
      where vacationStatus = 'PROLONG'
      and exists (select 1 from hr_empOrderVacationprolonglDet lld
        where lld.id = hr_employeeVacation.paraID)`
  })

  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_employeeVacation
      set vacationStatus = 'MOVE'
      where vacationStatus = 'PROLONG'
      and exists (select 1 from hr_empOrderVacationprolongDet ld
        where ld.id = hr_employeeVacation.paraID
          and ld.isMovement = 1)`
  })

  // Наказ про вихід з довготривалої відпустки
  const retvacations = conn.Repository('hr_empOrderVacationretDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'employeeNumberID.orgID', 'empOrderVacationLongID',
      'dateFrom', 'dateTo', 'orderID', 'orderID.orderNumber', 'orderID.orderDate', 'orderID.entryDate', 'orderID.periodID',
      'orderID.orderState', 'changedValues'])
    .where('orderID.orderState', '!=', 'PROJECT')
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.orgID.state', '=', 'ACTIVE')
    .where('employeeNumberID.orgID.mi_dateFrom', '<=', onDate)
    .where('employeeNumberID.orgID.mi_dateTo', '>=', onDate)
    .where('employeeNumberID.orgID.mi_deleteDate', '>=', '#maxdate')
    .notExists(conn.Repository('hr_employeeVacation')
      .correlation('paraID', 'ID')
      .where('mi_deleteDate', '>=', '#maxdate'))
    .selectAsObject()
  const retLongVacations = conn.Repository('hr_empOrderVacationlongDet')
    .attrs(['ID', 'dictVacationKindID', 'dateTo'])
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.orgID.state', '=', 'ACTIVE')
    .where('employeeNumberID.orgID.mi_dateFrom', '<=', onDate)
    .where('employeeNumberID.orgID.mi_dateTo', '>=', onDate)
    .where('employeeNumberID.orgID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  if (retvacations.length > 0) {
    retvacations.forEach(vac => {
      let retLongVac = retLongVacations.find(itm => itm.ID === vac.empOrderVacationLongID)
      let dictVacationKindID
      let dateTo
      let dayCount
      if (retLongVac) {
        dictVacationKindID = retLongVac.dictVacationKindID
        dateTo = dateService.addDays(vac.dateFrom, -1)
        dayCount = dateService.dayDiff(dateTo, retLongVac.dateTo)
      }
      if (dictVacationKindID) {
        newID = conn.insert({
          entity: 'hr_employeeVacation',
          fieldList: ['ID'],
          execParams: {
            organizationID: vac['employeeNumberID.orgID'],
            orderNumber: vac['orderID.orderNumber'],
            orderDate: vac['orderID.orderDate'] || vac['orderID.entryDate'],
            orderID: vac.orderID,
            paraID: vac.ID,
            dictVacationKindID: dictVacationKindID,
            employeeID: vac.employeeID,
            employeePositionID: vac.employeePositionID,
            employeeNumberID: vac.employeeNumberID,
            dayCount: -dayCount,
            dateFrom: null,
            dateTo: dateTo,
            dictPeriodID: vac['orderID.periodID'],
            empVacationPeriodID: null,
            avgSum: 0,
            vacationStatus: 'RETURN',
            orderState: vac['orderID.orderState']
          }
        })
        if (newID) {
          changedValues = getChangedValues(vac.changedValues, newID)
          conn.update({
            entity: 'hr_empOrderVacationretDet',
            execParams: {
              ID: vac.ID,
              changedValues: changedValues
            },
            __skipOptimisticLock: true
          })
        }
      }
    })
  }

  // Наказ про компенсацію відпустки
  const vacComp = conn.Repository('hr_empOrderVacationcompListDet')
    .attrs(['ID', 'paraID', 'empVacationPeriodID', 'dayComp', 'grantParaID.employeeID', 'grantParaID.employeeNumberID',
      'grantParaID.employeePositionID', 'grantParaID.employeeNumberID.orgID', 'empVacationPeriodID.empVacationPlanID.dictVacationKindID',
      'grantParaID.dateFrom', 'orderID', 'orderID.orderNumber', 'orderID.orderDate', 'orderID.entryDate',
      'orderID.periodID', 'orderID.orderState', 'grantParaID.changedValues'])
    .where('orderID.orderState', '!=', 'PROJECT')
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('grantParaID.mi_deleteDate', '>=', '#maxdate')
    .where('grantParaID.employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .where('grantParaID.employeeNumberID.orgID.state', '=', 'ACTIVE')
    .where('grantParaID.employeeNumberID.orgID.mi_dateFrom', '<=', onDate)
    .where('grantParaID.employeeNumberID.orgID.mi_dateTo', '>=', onDate)
    .where('grantParaID.employeeNumberID.orgID.mi_deleteDate', '>=', '#maxdate')
    .notExists(conn.Repository('hr_employeeVacation')
      .correlation('paraID', 'paraID')
      .where('mi_deleteDate', '>=', '#maxdate'))
    .selectAsObject({
      'grantParaID.employeeID': 'employeeID',
      'grantParaID.employeeNumberID': 'employeeNumberID',
      'grantParaID.employeePositionID': 'employeePositionID',
      'grantParaID.employeeNumberID.orgID': 'orgID',
      'empVacationPeriodID.empVacationPlanID.dictVacationKindID': 'dictVacationKindID',
      'grantParaID.dateFrom': 'dateFrom',
      'orderID.orderNumber': 'orderNumber',
      'orderID.orderDate': 'orderDate',
      'orderID.entryDate': 'entryDate',
      'orderID.periodID': 'periodID',
      'orderID.orderState': 'orderState',
      'grantParaID.changedValues': 'changedValues'
    })
  if (vacComp.length > 0) {
    let changeValuesCache = {}
    vacComp.forEach(vac => {
      if (vac.dictVacationKindID) {
        newID = conn.insert({
          entity: 'hr_employeeVacation',
          fieldList: ['ID'],
          execParams: {
            organizationID: vac.orgID,
            orderNumber: vac.orderNumber,
            orderDate: vac.orderDate || vac.entryDate,
            orderID: vac.orderID,
            paraID: vac.paraID,
            dictVacationKindID: vac.dictVacationKindID,
            employeeID: vac.employeeID,
            employeePositionID: vac.employeePositionID,
            employeeNumberID: vac.employeeNumberID,
            dayCount: vac.dayComp,
            cntDay: vac.dayComp,
            dateFrom: vac.dateFrom,
            dateTo: null,
            dictPeriodID: vac.periodID,
            empVacationPeriodID: vac.empVacationPeriodID,
            avgSum: 0,
            vacationStatus: 'COMP',
            orderState: vac.orderState
          }
        })
        if (newID) {
          let changeValuesCacheItem = changeValuesCache[vac.paraID]
          let changedValues = changeValuesCacheItem || vac.changedValues
          changedValues = getChangedValues(changedValues, newID)
          conn.update({
            entity: 'hr_empOrderVacationcompDet',
            execParams: {
              ID: vac.paraID,
              changedValues: changedValues
            },
            __skipOptimisticLock: true
          })
          changeValuesCache[vac.paraID] = changedValues
        }
      }
    })
  }

  // Наказ про звільнення
  const vacDism = conn.Repository('hr_empOrderDismVac')
    .attrs(['orderDetID', 'empVacationPeriodID', 'dictVacationKindID', 'dayRestitute', 'dayRecalc', 'dayReturn',
      'orderDetID.organizationID', 'orderDetID.orderID', 'orderDetID.orderID.orderNumber', 'orderDetID.orderID.orderDate',
      'orderDetID.employeeID', 'orderDetID.employeePositionID', 'orderDetID.employeeNumberID', 'orderDetID.dateFrom',
      'orderDetID.orderID.periodID', 'orderDetID.orderID.orderState', 'orderDetID.changedValues'])
    .where('orderDetID.orderID.orderState', '!=', 'PROJECT')
    .where('orderDetID.mi_deleteDate', '>=', '#maxdate')
    .where('orderDetID.orderID.mi_deleteDate', '>=', '#maxdate')
    .where('orderDetID.employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .where('orderDetID.employeeNumberID.orgID.state', '=', 'ACTIVE')
    .where('orderDetID.employeeNumberID.orgID.mi_dateFrom', '<=', onDate)
    .where('orderDetID.employeeNumberID.orgID.mi_dateTo', '>=', onDate)
    .where('orderDetID.employeeNumberID.orgID.mi_deleteDate', '>=', '#maxdate')
    .notExists(conn.Repository('hr_employeeVacation')
      .correlation('paraID', 'orderDetID')
      .where('mi_deleteDate', '>=', '#maxdate'))
    .selectAsObject({
      'orderDetID.organizationID': 'organizationID',
      'orderDetID.orderID': 'orderID',
      'orderDetID.orderID.orderNumber': 'orderNumber',
      'orderDetID.orderID.orderDate': 'orderDate',
      'orderDetID.employeeID': 'employeeID',
      'orderDetID.employeePositionID': 'employeePositionID',
      'orderDetID.employeeNumberID': 'employeeNumberID',
      'orderDetID.dateFrom': 'dateFrom',
      'orderDetID.orderID.periodID': 'periodID',
      'orderDetID.orderID.orderState': 'orderState',
      'orderDetID.changedValues': 'changedValues'
    })
  if (vacDism.length > 0) {
    let changeValuesCache = {}
    vacDism.forEach(vac => {
      let dayCount
      let vacationStatus
      if (vac.dayRecalc) {
        dayCount = vac.dayRecalc
        vacationStatus = 'DISMRECALC'
      } else if (vac.dayReturn) {
        dayCount = vac.dayReturn
        vacationStatus = 'DISMRET'
      } else {
        dayCount = vac.dayRestitute
        vacationStatus = 'DISMCOMP'
      }
      newID = conn.insert({
        entity: 'hr_employeeVacation',
        fieldList: ['ID'],
        execParams: {
          organizationID: vac.organizationID,
          orderNumber: vac.orderNumber,
          orderDate: vac.orderDate || vac.entryDate,
          orderID: vac.orderID,
          paraID: vac.orderDetID,
          dictVacationKindID: vac.dictVacationKindID,
          employeeID: vac.employeeID,
          employeePositionID: vac.employeePositionID,
          employeeNumberID: vac.employeeNumberID,
          dayCount: dayCount,
          cntDay: dayCount,
          dateFrom: vac.dateFrom,
          dateTo: null,
          dictPeriodID: vac.periodID,
          empVacationPeriodID: vac.empVacationPeriodID,
          avgSum: 0,
          vacationStatus: vacationStatus,
          orderState: vac.orderState
        }
      })
      if (newID) {
        let changeValuesCacheItem = changeValuesCache[vac.orderDetID]
        let changedValues = changeValuesCacheItem || vac.changedValues
        changedValues = getChangedValues(changedValues, newID)
        conn.update({
          entity: 'hr_empOrderDismDet',
          execParams: {
            ID: vac.orderDetID,
            changedValues: changedValues
          },
          __skipOptimisticLock: true
        })
        changeValuesCache[vac.orderDetID] = changedValues
      }
    })
  }
}
