
exports.reportCode = {
  /**
   * Generate report data and render report. Function should:
   *  - prepare reportData - a JavaScript object passed to mustache template
   *  - call this.buildHTML(reportData) to render mustache template
   *  - optionally call this.transformToPdf(htmlReport) where htmlReport is HTML from prev. step
   *  - for server side returned value should be string, for client - Promise resolved to string
   *
   * @cfg {function} buildReport
   * @params {[]|{}} reportParams
   * @returns {Promise|Object}
   */
  buildReport: function (reportParams) {
    let reportData

    switch (this.reportType) {
      case 'pdf':
        reportData = this.transformToPdf(this.buildHTML(reportParams))
        break
      case 'html':
        reportData = this.buildHTML(reportParams)
        break
      case 'xlsx':
        reportData = this.buildXLSX(reportParams)
        break
    }
    return reportData
  }
}
