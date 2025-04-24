module.exports.run = (conn) => {
  const notAvgQuantityAllID = conn.Repository('hr_reportParam')
    .attrs('ID')
    .where('reportCode', '=', 'S0301012')
    .where('listParamID.code', '=', 'notAvgQuantityAll')
    .selectScalar()
  if (notAvgQuantityAllID) {
    conn.run({
      entity: 'hr_reportParam',
      method: 'delete',
      execParams: { ID: notAvgQuantityAllID },
      __skipOptimisticLock: true
    })
  }

  const averageStatisticsReportID = conn.Repository('hr_reportParam')
    .attrs('ID')
    .where('reportCode', '=', 'AverageStatisticsReport')
    .where('listParamID.code', '=', 'ZKV')
    .selectScalar()
  if (!averageStatisticsReportID) {
    const zkvID = conn.Repository('hr_listParam')
      .attrs('ID')
      .where('code', '=', 'ZKV')
      .selectScalar()
    conn.insert({
      entity: 'hr_reportParam',
      execParams: {
        reportCode: 'AverageStatisticsReport',
        listParamID: zkvID
      }
    })
  }
}
