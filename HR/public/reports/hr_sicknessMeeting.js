/* global AC appAC $App */

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => AC.reportService.generateReport(me.getParams(data), me))
  },

  getData (reportParams) {
    return $App.connection.run({
      entity: 'hr_sicknessMeeting',
      method: 'getPrintData',
      instanceID: reportParams.instanceID,
      onDate: appAC.globalApplicationDate()
    }).then(response => {
      return (response)
    })
  },
  getParams: function (data) {
    const resultData = JSON.parse(data.resultData)

    let params = resultData
    return AC.reportService.removeEmptyValues(params)
  }

}
