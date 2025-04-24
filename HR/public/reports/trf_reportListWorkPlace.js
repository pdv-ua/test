/* global AC $App UB */

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => {
      return AC.reportService.generateReport(me.getParams(data), me)
    })
  },

  getData (reportParams) {
    return $App.connection.run({
      entity: 'trf_constructorReports',
      method: 'getListWorkPlace',
      reportParams
    }).then(response => {
      return (response)
    })
  },

  getParams: function (data) {
    const params = {}
    params.resultData = JSON.parse(data.resultData).report
    params.experience = data.reportParams.experience
    return AC.reportService.removeEmptyValues(params)
  }
}
