/* global $App AC UB */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID) {
    const data = await UB.Repository('hr_employeeInfoPortalVac')
      .attrs(['ID', 'dateProfile', 'fullFIO', 'document'])
      .where('ID', '=', ID)
      .selectSingle()
      .then((listRecparticipant) => {
        return listRecparticipant
      })
    if (!data.document) {
      throw new UB.UBError(`document is empty`)
    }
    const winner = await $App.connection.getDocument({
      entity: 'hr_employeeInfoPortalVac',
      attribute: 'document',
      id: ID
    }, {
      bypassCache: true,
      resultIsBinary: false
    })

    const result = {
      formatDateTime () {
        return function (text, render) {
          const str = render(text)
          const num = parseInt(str, 10)
          if (num > 0) {
            const date = new Date(num)
            return AC.dateService.getStringFormatDate(date, '', '')
          }
          return str
        }
      },
      info: {
        dateProfile: data.dateProfile && data.dateProfile.valueOf(),
        fullFIO: data.fullFIO,
        winner: winner
      }
    }

    return result
  }
}
