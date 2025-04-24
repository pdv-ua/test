const dateService = require('../../../AC/modules/dataServices/dateService')

module.exports.run = (conn) => {
  const onDate = dateService.currentDate()
  const orgID = conn.Repository('hr_organization')
    .attrs(['mi_data_id'])
    .where('EDRPOUCode', '=', '01994089') // Охмадит
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: onDate })
    .selectScalar()
  if (!orgID) {
    return
  }
  // Внутрішні сумісники
  const plPosData = conn.Repository('hr_empOrderPluralistDet')
    .attrs(['employeeID', 'employeeNumberID', '[employeePositionID.dateFrom]', '[employeePositionID.dateTo]'])
    .where('organizationID', '=', orgID)
    .where('orderID.orderState', '!=', 'PROJECT')
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('employeePositionID.workPlace', '=', '2')
    .where('employeePositionID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.dateTo', '>=', onDate)
    .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .groupBy(['employeeID', 'employeeNumberID', '[employeePositionID.dateFrom]', '[employeePositionID.dateTo]'])
    .selectAsObject({
      '[employeePositionID.dateFrom]': 'dateFrom',
      '[employeePositionID.dateTo]': 'dateTo'
    })
  if (plPosData.length === 0) {
    return
  }
  const plPosDataGrp = conn.Repository('hr_empOrderPluralistDet')
    .attrs(['employeeID', 'employeeNumberID'])
    .where('organizationID', '=', orgID)
    .where('orderID.orderState', '!=', 'PROJECT')
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('employeePositionID.workPlace', '=', '2')
    .where('employeePositionID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.dateTo', '>=', onDate)
    .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .groupBy(['employeeID', 'employeeNumberID'])
    .selectAsObject()
  const plPlan = conn.Repository('hr_empVacationPlan')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'dictVacationKindID', 'dateFrom', 'dateTo', 'dayCount'])
    .where('employeeNumberID', 'in', plPosData.map(itm => itm.employeeNumberID))
    .orderBy('employeeID')
    .orderBy('dictVacationKindID')
    .orderBy('dateFrom', 'desc')
    .selectAsObject()
  const plPeriods = conn.Repository('hr_empVacationPeriod')
    .attrs(['empVacationPlanID', 'MIN([dateFrom])', 'MAX([dateTo])'])
    .where('empVacationPlanID.employeeNumberID', 'in', plPosData.map(itm => itm.employeeNumberID))
    .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
    .groupBy(['empVacationPlanID'])
    .selectAsObject({
      'MIN([dateFrom])': 'dateFrom',
      'MAX([dateTo])': 'dateTo'
    })
  // Основне місце роботи
  const basePosData = conn.Repository('hr_employeePosition')
    .attrs(['ID', 'employeeID', 'employeeNumberID'])
    .where('organizationID', '=', orgID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('workPlace', '=', '1')
    .where('employeeID', 'in', plPosData.map(itm => itm.employeeID))
    .selectAsObject()
  const basePlan = conn.Repository('hr_empVacationPlan')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'dictVacationKindID', 'dictVacationKindID.isProportional', 'dateFrom',
      'dateTo', 'dayCount', 'isPause'])
    .where('employeeNumberID', 'in', basePosData.map(itm => itm.employeeNumberID))
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>', onDate)
    .where('dictVacationKindID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject({
      'dictVacationKindID.isProportional': 'isProportional'
    })
  const basePeriods = conn.Repository('hr_empVacationPeriod')
    .attrs(['ID', 'empVacationPlanID', 'dateFrom', 'dateTo', 'dayCountPlan'])
    .where('empVacationPlanID.employeeNumberID', 'in', basePosData.map(itm => itm.employeeNumberID))
    .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
    .orderBy('dateFrom')
    .selectAsObject({
      'empVacationPlanID.dictVacationKindID.isProportional': 'isProportional'
    })
  basePlan.forEach(basePlanItem => {
    let plPosItems
    if (basePlanItem.isProportional) {
      plPosItems = plPosData.filter(itm => itm.employeeID === basePlanItem.employeeID)
    } else {
      plPosItems = plPosDataGrp.filter(itm => itm.employeeID === basePlanItem.employeeID)
    }
    plPosItems.forEach(plPosItem => {
      let plPlanItem = plPlan.find(itm => itm.employeeNumberID === plPosItem.employeeNumberID && itm.dictVacationKindID === basePlanItem.dictVacationKindID)
      if (!plPlanItem) {
        let newPlanID = conn.run({
          entity: 'hr_empVacationPlan',
          method: 'getNewID'
        })
        plPlanItem = {
          ID: newPlanID.newID,
          employeeID: basePlanItem.employeeID,
          employeeNumberID: plPosItem.employeeNumberID,
          dictVacationKindID: basePlanItem.dictVacationKindID,
          dateFrom: basePlanItem.dateFrom,
          dateTo: basePlanItem.dateTo,
          dayCount: basePlanItem.dayCount,
          isPause: basePlanItem.isPause
        }
        conn.insert({
          entity: 'hr_empVacationPlan',
          execParams: plPlanItem,
          isImportOperation: true
        })
        plPlan.push(plPlanItem)
      }
      let basePers = basePeriods.filter(itm => itm.empVacationPlanID === basePlanItem.ID)
      let plPers = plPeriods.filter(itm => itm.empVacationPlanID === plPlanItem.ID)
      let plPerItem
      let newPerItem
      if (basePlanItem.isProportional) {
        plPerItem = plPers.find(itm => itm.dateFrom === plPosItem.dateFrom)
        if (!plPerItem) {
          let plPosItemDateFrom = dateService.shiftDate(plPosItem.dateFrom)
          let plPosItemDateTo = dateService.shiftDate(plPosItem.dateTo)
          let yearDateTo = dateService.addDays(dateService.addYears(plPosItemDateFrom, 1), -1)
          if (plPosItemDateTo > yearDateTo) {
            plPosItemDateTo = yearDateTo
          }
          plPerItem = plPers[0]
          if (plPerItem) {
            let plPrevDateTo = dateService.addDays(dateService.shiftDate(plPerItem.dateFrom), -1)
            if (plPosItemDateTo > plPrevDateTo) {
              plPosItemDateTo = plPrevDateTo
            }
          }
          if (plPosItemDateFrom <= plPosItemDateTo) {
            let perYears = dateService.yearsDiff(plPosItem.dateFrom, plPosItem.dateTo)
            let dayCountPlan = perYears === 0 ? Math.round((plPlanItem.dayCount / 12) * (dateService.dateDiff(plPosItem.dateFrom, plPosItem.dateTo) / 30.44)) : plPlanItem.dayCount
            newPerItem = {
              empVacationPlanID: plPlanItem.ID,
              dateFrom: plPosItemDateFrom,
              dateTo: plPosItemDateTo,
              dayCountPlan: dayCountPlan
            }
            conn.insert({
              entity: 'hr_empVacationPeriod',
              execParams: newPerItem
            })
          }
        }
      } else {
        let vacData = conn.run({
          entity: 'hr_empVacationPlan',
          method: 'getDataReq',
          orgID: orgID,
          employeeNumberID: basePlanItem.employeeNumberID,
          dictVacationKindID: basePlanItem.dictVacationKindID,
          onDate: onDate,
          isGrouped: false
        })
        vacData = JSON.parse(vacData.resultData)
        vacData = vacData.filter(itm => itm.daysDiff > 0)
        if (vacData.length > 0) {
          vacData.forEach(vacItem => {
            let basePerItem = basePers.find(itm => itm.ID === vacItem.ID)
            plPerItem = plPers.find(itm => itm.dateFrom === basePerItem.dateFrom)
            if (!plPerItem) {
              let baseDateFrom = dateService.shiftDate(basePerItem.dateFrom)
              let baseDateTo = dateService.shiftDate(basePerItem.dateTo)
              let yearDateTo = dateService.addDays(dateService.addYears(baseDateFrom, 1), -1)
              if (baseDateTo > yearDateTo) {
                baseDateTo = yearDateTo
              }
              plPerItem = plPers[0]
              if (plPerItem) {
                let plPrevDateTo = dateService.addDays(dateService.shiftDate(plPerItem.dateFrom), -1)
                if (baseDateTo > plPrevDateTo) {
                  baseDateTo = plPrevDateTo
                }
              }
              if (baseDateFrom <= baseDateTo) {
                newPerItem = {
                  empVacationPlanID: plPlanItem.ID,
                  dateFrom: baseDateFrom,
                  dateTo: baseDateTo,
                  dayCountPlan: vacItem.daysDiff
                }
                conn.insert({
                  entity: 'hr_empVacationPeriod',
                  execParams: newPerItem
                })
              }
            }
          })
        } else {
          if (plPers.length === 0) {
            let planDateFrom = dateService.shiftDate(plPlanItem.dateFrom)
            let planDateTo = dateService.shiftDate(plPlanItem.dateTo)
            let yearDateTo = dateService.addDays(dateService.addYears(planDateFrom, 1), -1)
            if (planDateTo > yearDateTo) {
              planDateTo = yearDateTo
            }
            let basePerItem = basePers.length > 0 && basePers[basePers.length - 1]
            newPerItem = {
              empVacationPlanID: plPlanItem.ID,
              dateFrom: (basePerItem && basePerItem.dateFrom) || plPlanItem.dateFrom,
              dateTo: (basePerItem && basePerItem.dateTo) || planDateTo,
              dayCountPlan: 0
            }
            conn.insert({
              entity: 'hr_empVacationPeriod',
              execParams: newPerItem
            })
          }
        }
      }
      newPerItem && plPeriods.push(newPerItem)
    })
  })
}
