exports.reportCode = {
  buildReport: function (reportParams) {
    let reportData = this.buildHTML(reportParams)
    switch (this.reportType) {
      case 'pdf':
        reportData = this.transformToPdf(reportData)
        break
      case 'xlsx':
        reportData = this.buildXLSX(reportParams)
        break
    }
    return reportData
  }
}
