/* global $App AC UB */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const onDate4Sql = AC.dateService.shiftDate(reportParams.onDate)
    let result = {
      data: [],
      title: []
    }

    result.title.push({ text: UB.i18n(`Перелік посад організації {0} на {1} року`, reportParams.organizationName, AC.dateService.formatDate(reportParams.onDate)) })

    if (reportParams.departmentName) {
      result.title.push({ text: reportParams.departmentName })
    }

    if (reportParams.positionTypeName) {
      result.title.push({ text: UB.i18n('Тип посади') + ': ' + reportParams.positionTypeName })
    }

    if (reportParams.positionCategoryName) {
      result.title.push({ text: UB.i18n('Категорія посади') + ': ' + reportParams.positionCategoryName })
    }

    if (reportParams.dictPositionKindName) {
      result.title.push({ text: UB.i18n('Вид посади') + ': ' + reportParams.dictPositionKindName })
    }

    if (reportParams.dictPositionGroupName) {
      result.title.push({ text: UB.i18n('Група посади') + ': ' + reportParams.dictPositionGroupName })
    }

    if (reportParams.dictEmpCategoryName) {
      result.title.push({ text: UB.i18n('Кваліфікаційна категорія') + ': ' + reportParams.dictEmpCategoryName })
    }

    if (reportParams.dictTarifCoeffName) {
      result.title.push({ text: UB.i18n('Тарифний розряд') + ': ' + reportParams.dictTarifCoeffName })
    }

    if (reportParams.dictWagePayName) {
      result.title.push({ text: UB.i18n('Тип посади держслужбовця') + ': ' + reportParams.dictWagePayName })
    }

    result.data = await UB.Repository('hr_position')
      .attrs(['ID', 'code', 'name', 'quantity', 'fullName', 'dictPositionID.name', 'parentUnitID.name',
        'payElID.name', 'orgID.name', 'positionCategory.name', 'dictCostTypeID.name', 'dictTarifCoeffID.name',
        'dictEmpCategoryID.name', 'dictPositionGroupID.name', 'fundBasePay', 'fundAddPay', 'fundOtherPay', 'fundTotal'])
      .where('state', '=', 'ACTIVE')
      .whereIf(reportParams.organizationIDs.length, 'orgID', 'in', reportParams.organizationIDs.split(','))
      .whereIf(reportParams.departmentIDs.length, 'parentUnitID', 'in', reportParams.departmentIDs.split(','))
      .whereIf(reportParams.dictStaffCatID && reportParams.dictStaffCatID > -1, 'dictStaffCatID', '=', reportParams.dictStaffCatID)
      .whereIf(reportParams.dictStaffCatID && reportParams.dictStaffCatID === -1, 'dictStaffCatID', 'isNull')
      .whereIf(reportParams.positionType, 'positionType', '=', reportParams.positionType)
      .whereIf(reportParams.positionCategory, 'positionCategory', '=', reportParams.positionCategory)
      .whereIf(reportParams.dictPositionKindID, 'dictPositionKindID', '=', reportParams.dictPositionKindID)
      .whereIf(reportParams.dictPositionGroupID, 'dictPositionGroupID', '=', reportParams.dictPositionGroupID)
      .whereIf(reportParams.dictEmpCategoryID, 'dictEmpCategoryID', '=', reportParams.dictEmpCategoryID)
      .whereIf(reportParams.dictTarifCoeffID, 'dictTarifCoeffID', '=', reportParams.dictTarifCoeffID)
      .whereIf(reportParams.dictWagePayID, 'dictWagePayID', '=', reportParams.dictWagePayID)
      .misc({ __mip_ondate: onDate4Sql })
      .joinCondition('parentUnitID.mi_dateFrom', '<=', onDate4Sql)
      .joinCondition('parentUnitID.mi_dateTo', '>=', onDate4Sql)
      .joinCondition('parentUnitID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('parentUnitID.state', '=', 'ACTIVE')
      .joinCondition('positionType.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('positionCategory.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('dictPositionKindID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('dictPositionGroupID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('dictEmpCategoryID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('dictTarifCoeffID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('dictWagePayID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('orgID.state', '=', 'ACTIVE')
      .joinCondition('orgID.mi_dateFrom', '<=', onDate4Sql)
      .joinCondition('orgID.mi_dateTo', '>=', onDate4Sql)
      .joinCondition('orgID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject({
        'dictPositionID.name': 'dictPositionName',
        'parentUnitID.name': 'parentUnitName',
        'payElID.name': 'payElName',
        'positionCategory.name': 'positionCategoryName',
        'dictCostTypeID.name': 'dictCostTypeName',
        'dictTarifCoeffID.name': 'dictTarifCoeffName',
        'dictEmpCategoryID.name': 'dictEmpCategoryName',
        'dictPositionGroupID.name': 'dictPositionGroupName',
        'orgID.name': 'orgName'
      })

    return result
  },
  onReportClick: function (e) {
    e.preventDefault()
    $App.doCommand({
      cmdType: 'showForm',
      entity: 'hr_position',
      instanceID: parseInt(e.target.dataset.id, 10)
    })
  }
}
