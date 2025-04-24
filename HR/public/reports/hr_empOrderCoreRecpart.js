/* global AC HR UB */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID) {
    const result = {
      emblem: HR.reportUtils.getEmblem(),
      items: []
    }
    const order = await HR.reportUtils.getEmpOrder(ID)
    if (!order) {
      return result
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    result.recpart = await HR.reportUtils.buildRecpartData(ID, order.respEmployeeNumID, order.orderDate, order.empOrderType === 'APPOINT')
    if (result.recpart.fams && result.recpart.fams.length === 1 && result.recpart.fams[0].famSexType === 'W') {
      result.recpart.famsTitle = UB.i18n('Ознайомлена:')
    } else if (result.recpart.fams && result.recpart.fams.length === 1 && result.recpart.fams[0].famSexType !== 'W') {
      result.recpart.famsTitle = UB.i18n('Ознайомлений:')
    } else if (result.recpart.fams && result.recpart.fams.length > 0) {
      result.recpart.famsTitle = UB.i18n('Ознайомлені:')
    } else {
      result.recpart.famsTitle = ''
    }
    if (result.recpart.recsVerification && result.recpart.recsVerification.length > 0) {
      result.recpart.recsVerificationTitle = UB.i18n('Перевірено на відповідність законодавству:')
    }
    if (!result.rec1NameDep && result.recpart.rec1Name.length > 0) {
      result.recpart.rec1Title = UB.i18n('Підготовлено:')
    }
    if (result.recpart.recs && result.recpart.recs.length > 0) {
      result.recpart.recsTitle = UB.i18n('Погоджено:')
    }
    return result
  }
}
