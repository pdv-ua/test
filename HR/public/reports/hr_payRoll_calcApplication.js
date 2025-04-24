exports.reportCode = {
  buildReport: function (reportParams) {
    let reportData = this.buildHTML(reportParams)
    if (this.reportType === 'pdf') {
      reportData = this.transformToPdf(reportData)
    }
    return reportData
  }

}
