module.exports.run = conn => {
  const posList = conn.Repository('hr_position')
    .attrs(['ID', 'mi_data_id', 'staffOrderID', 'mi_dateFrom', 'mi_dateTo'])
    .where('state', '=', 'ACTIVE')
    .exists(conn.Repository('hr_positionAccrual')
      .attrs('ID')
      .correlation('positionID', 'mi_data_id')
      .where('mi_deleteDate', '>=', '#maxdate'))
    .notExists(conn.Repository('hr_positionAccrual')
      .attrs('ID')
      .correlation('positionID', 'ID')
      .where('mi_deleteDate', '>=', '#maxdate'))
    .misc({
      __mip_recordhistory_all: true
    })
    .selectAsObject()

  posList.forEach(pos => {
    const accruals = conn.Repository('hr_positionAccrual')
      .attrs([
        'payElID',
        'accrualSum',
        'accrualRate',
        'dateFrom',
        'dateTo',
        'staffOrderID'
      ])
      .where('positionID', '=', pos.mi_data_id)
      .selectAsObject()
    accruals.forEach(item => {
      conn.insert({
        entity: 'hr_positionAccrual',
        execParams: {
          positionID: pos.ID,
          payElID: item.payElID,
          accrualSum: item.accrualSum,
          accrualRate: item.accrualRate,
          dateFrom: pos.mi_dateFrom,
          dateTo: pos.mi_dateTo,
          staffOrderID: pos.staffOrderID
        }
      })
    })
  })
}
