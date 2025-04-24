/* global UB AC HR Ext */
let reportObj

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    if (reportParams.instanceID) {
      const staffTariffingOrder = await UB.Repository('hr_staffTariffing')
        .attrs(['entryDate', 'orgID', 'respEmployeeNumID', 'respPositionID', 'respEmployeePositionID',
          'respPosition2ID', 'respEmployeePosition2ID', 'respPosition3ID', 'respEmployeePosition3ID',
          'respPosition4ID', 'respEmployeePosition4ID', 'respPosition5ID', 'respEmployeePosition5ID',
          'departmentID'
        ])
        .selectById(reportParams.instanceID)
      if (staffTariffingOrder) {
        reportParams.onDate = AC.dateService.shiftDate(staffTariffingOrder.entryDate)
        reportParams.orgID = staffTariffingOrder.orgID
        reportParams.respPositionID1 = staffTariffingOrder.respPositionID
        reportParams.respEmp1 = staffTariffingOrder.respEmployeePositionID
        reportParams.respPositionID2 = staffTariffingOrder.respPosition2ID
        reportParams.respEmp2 = staffTariffingOrder.respEmployeePosition2ID
        reportParams.childDepID = reportParams.childDepID || staffTariffingOrder.departmentID

        const orgUnit = await UB.Repository('hr_organization')
          .attrs('name', 'nameGen', 'nameDat')
          .where('mi_data_id', '=', staffTariffingOrder.orgID)
          .where('state', '=', 'ACTIVE')
          .orderBy('mi_dateFrom', 'desc')
          .limit(1)
          .selectSingle()
        if (orgUnit) {
          reportParams.orgName = (orgUnit['nameGen'] || '').trim() || orgUnit['name']
          reportParams.orgNameDat = (orgUnit['nameDat'] || '').trim() || orgUnit['name']
        }
        if (staffTariffingOrder.departmentID) {
          const depUnit = await UB.Repository('hr_department')
            .attrs('name')
            .where('mi_data_id', '=', staffTariffingOrder.departmentID)
            .where('state', '=', 'ACTIVE')
            .misc({ __mip_ondate: reportParams.onDate })
            .limit(1)
            .selectSingle()
          reportParams.childDepName = depUnit ? depUnit.name : null
        }
      }
    }
    const result = await HR.staffTariffing.getReportData(reportParams, 'plan')
    reportObj = result
    return result
  },
  onParamPanelConfig: function () {
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      listeners: {
        render: function (form) {
          const reportViewer = form.ownerCt
          reportViewer.exportToXLSX = exportToXLSX
        }
      },
      items: [
      ]
    })
    reportObj = undefined
    return paramForm
  }
}

function exportToXLSX () {
  if (!reportObj) {
    AC.viewUtils.showToast(UB.i18n('Увага'), UB.i18n('Не сформовано звіт'))
    return
  }
  HR.reportUtils.generateExcelReport('hr_report', 'runTariffing', 'Tariffing.xlsx', reportObj, this)
}
