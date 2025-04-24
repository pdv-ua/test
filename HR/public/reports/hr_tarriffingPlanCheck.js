/* global UB AC HR $App */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const staffTariffingOrder = await UB.Repository('hr_staffTariffing')
      .attrs(['entryDate', 'orgID', 'orderNumber', 'orderDate', 'name', 'description'])
      .selectById(reportParams.instanceID)
    const orgUnit = await UB.Repository('hr_organization')
      .attrs('name', 'nameGen', 'nameDat')
      .where('mi_data_id', '=', staffTariffingOrder.orgID)
      .where('state', '=', 'ACTIVE')
      .limit(1)
      .selectSingle()

    const resultData = await $App.connection.run({
      entity: 'hr_staffTariffing',
      method: 'checkData',
      staffTariffingID: reportParams.instanceID
    }).then(mParams => {
      return JSON.parse(mParams.resultData)
    })
    return {
      orderNumber: staffTariffingOrder['orderNumber'],
      orderDate: AC.dateService.formatDate(staffTariffingOrder['orderDate']),
      entryDate: AC.dateService.formatDate(staffTariffingOrder['entryDate']),
      orderName: staffTariffingOrder['name'],
      orderDescription: staffTariffingOrder['description'],
      data1: resultData.check1data,
      data2: resultData.check2data,
      data3: resultData.check3data,
      orgName: (orgUnit['nameGen'] || '').trim() || orgUnit['name']
    }
  }
}
