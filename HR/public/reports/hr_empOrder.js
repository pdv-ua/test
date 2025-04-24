/* global AC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams.caller).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  }
}
