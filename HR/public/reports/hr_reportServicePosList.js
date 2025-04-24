/* global UB AC appAC $App */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams.orgID = appAC.globalOrganization()
    return me.getData(reportParams)
      .then(data => {
        return AC.reportService.generateReport(me.getParams(data), me)
      }
      )
  },

  getData: async function (reportParams) {
    const me = this

    return $App.connection.run({
      entity: 'hr_reportServicePosList',
      method: 'search',
      orgID: reportParams.orgID,
      orderDate: reportParams.orderDate,
      staffTableID: reportParams.staffTableID
    })
      .then(response => {
        return me.getAllData(response, reportParams.orgID)
      })
  },

  getAllData: async function (result, orgID) {
    const orgName = await UB.Repository('hr_organization')
      .attrs(['fullName'])
      .where('mi_data_id', '=', orgID)
      .where('state', '=', 'ACTIVE')
      .selectScalar()
    result.orgName = orgName
    return result
  },

  getParams: function (data) {
    const resData = data.resultData.data

    const params = {
      posTable: [],
      totalQuantity: 0
    }

    const tableFields = data.resultData.fields

    // set fields names
    data.resultData.fields.forEach(item => {
      params[item] = item
    })

    // set data for personTable
    if (!resData) {
      for (let i = 1; i < 6; i++) {
        const obj = {}
        obj['pn'] = i
        tableFields.forEach(item => {
          obj[item] = ' '
        })
        params.posTable.push(obj)
      }
    } else {
      let k = 1
      resData.forEach(item => {
        const obj = {}
        let j = 0
        obj['pn'] = k
        tableFields.forEach(attr => {
          obj[attr] = item[j]
          j++
        })
        params.totalQuantity += obj.quantity
        params.posTable.push(obj)
        k++
      })
    }
    return AC.reportService.removeEmptyValues(params)
  }

}
