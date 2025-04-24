
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
    switch (this.reportType) {
      case 'html' :
        return this.buildHTML(reportParams)
      case 'xlsx':
        return this.buildXLSX(reportParams)
      default:
    }
  }
  /** optional report click event handler
   * see click)sample report inside UBS model
   */
  // onReportClick: function (e) {
  //   // prevent default action
  //   e.preventDefault()
  //   // get table/cell/roe based on event target
  //   let cellInfo = UBS.UBReport.cellInfo(e)
  //   ...
  // }
}
