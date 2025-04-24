/* global UB AC appAC HR JsBarcode QRious */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const params = {
      resumeText: ''
    }

    const data = await UB.Repository('hr_contenderPosition')
      .attrs('resume')
      .selectById(reportParams.instanceID)

    params.resumeText = data.resume || ''
    return params
  }
}
