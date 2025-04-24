const dateService = require('../../../AC/modules/dataServices/dateService')

module.exports.run = (conn) => {
  let onDate = dateService.shiftDate(new Date(2020, 11, 31))
  const orgID = conn.Repository('hr_organization')
    .attrs(['mi_data_id'])
    .where('EDRPOUCode', '=', '01994089') // Охмадит
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: onDate })
    .selectScalar()
  if (!orgID) {
    return
  }
  // Внутрішні сумісники, дата закінчення призначення більша за 31.12.2020
  const plPosData4Close = conn.Repository('hr_empOrderPluralistDet')
    .attrs(['employeePositionID'])
    .where('organizationID', '=', orgID)
    .where('orderID.orderState', '!=', 'PROJECT')
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('employeePositionID.workPlace', '=', '2')
    .where('employeePositionID.mi_deleteDate', '>=', '#maxdate')
    .where('employeePositionID.dateFrom', '<=', onDate)
    .where('employeePositionID.dateTo', '>', onDate)
    .selectAsObject()
  plPosData4Close.forEach(plItem => {
    conn.update({
      entity: 'hr_employeePosition',
      __skipOptimisticLock: true,
      execParams: {
        ID: plItem.employeePositionID,
        dateTo: onDate
      }
    })
  })

  onDate = dateService.shiftDate(new Date(2021, 0, 1))
  // Внутрішні сумісники, дата початку призначення більша за 01.01.2021
  const plPosData4Del = conn.Repository('hr_empOrderPluralistDet')
    .attrs(['employeePositionID'])
    .where('organizationID', '=', orgID)
    .where('orderID.orderState', '!=', 'PROJECT')
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('employeePositionID.workPlace', '=', '2')
    .where('employeePositionID.mi_deleteDate', '>=', '#maxdate')
    .where('employeePositionID.dateFrom', '>', onDate)
    .selectAsObject()
  plPosData4Del.forEach(plItem => {
    conn.run({
      entity: 'hr_employeePosition',
      method: 'delete',
      execParams: { ID: plItem.employeePositionID },
      __skipOptimisticLock: true
    })
  })
}
