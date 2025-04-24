/* global UB AC $App _ appAC */

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => AC.reportService.generateReport(me.getParams(data, reportParams), me))
  },
  getData (reportParams) {
    const dictFundSourceIDs = reportParams.dictFundSourceIDs && reportParams.dictFundSourceIDs.length ? reportParams.dictFundSourceIDs.split(',').map(o => Number(o) || null) : []
    const dictProgClassIDs = reportParams.dictProgClassIDs && reportParams.dictProgClassIDs.length ? reportParams.dictProgClassIDs.split(',').map(o => Number(o) || null) : []
    return Promise.all([
      UB.Repository('hr_organization')
        .attrs(['name', 'shortName', 'fullName'])
        .where('state', '=', 'ACTIVE')
        .where('mi_deleteDate', '>=', '#maxdate')
        .where('mi_data_id', '=', reportParams.orgID)
        .selectSingle(),
      UB.Repository('trf_position')
        .attrs(['ID', 'workPlaceID.employeeNumberID.employeeID.fullFIO', 'workPlaceID.employeeNumberID.tabNum', 'dictPositionID.name', 'dictSubjectID.name', 'dictQualificationID.name', 'dictEducationLevelID.name', 'dictTarifCoeffID.code', 'rate', 'accrualSum', 'dictEducationRankID.name', 'posIndex'])
        .where('workPlaceID', '=', reportParams.instanceID)
        .where('mi_deleteDate', '>=', '#maxdate')
        .whereIf(dictFundSourceIDs.length, 'dictFundSourceID', 'in', dictFundSourceIDs)
        .whereIf(dictProgClassIDs.length, 'dictProgClassID', 'in', dictProgClassIDs)
        .selectAsObject({ 'dictPositionID.name': 'name', 'workPlaceID.employeeNumberID.employeeID.fullFIO': 'fullFIO', 'workPlaceID.employeeNumberID.tabNum': 'tabNum', 'dictSubjectID.name': 'subjectName', 'dictQualificationID.name': 'dictQualificationName', 'dictEducationLevelID.name': 'dictEducationLevel', 'dictTarifCoeffID.code': 'dictTarifCoeff', 'accrualSum': 'totalSum', 'dictEducationRankID.name': 'educationRank' }),
      $App.connection.run({
        entity: 'trf_constructorReports',
        method: 'calcEmployeeExperience',
        params: JSON.stringify([reportParams])
      })
    ]).then(([hrOrg, positions, experience]) => {
      return Promise.all([
        UB.Repository('trf_accrual')
          .attrs('positionID', 'positionID.workPlaceID.employeeNumberID.employeeID', 'positionID.dictFundSourceID', 'positionID.workPlaceID.documentID.orgID', 'payElID.name', 'accrualSum', 'payElID.methodID.code', 'positionID.dictPositionID.positionCategory', 'rate', 'hours', 'payElID.methodID.name', 'dictPupilID', 'dictPupilID.code', 'payElID.code')
          .where('positionID', 'in', positions.map(o => o.ID))
          .where('positionID.workPlaceID.documentID.orgID', '=', reportParams.orgID)
          .where('positionID.workPlaceID.dateFrom', '<=', AC.dateService.shiftDate(reportParams.issueDate))
          .where('positionID.workPlaceID.dateTo', '>=', AC.dateService.shiftDate(reportParams.issueDate))
          .where('positionID.workPlaceID.mi_deleteDate', '>=', '9999-12-31')
          .where('positionID.mi_deleteDate', '>=', '9999-12-31')
          .where('mi_deleteDate', '>=', '9999-12-31')
          .selectAsObject({ 'positionID.workPlaceID.employeeNumberID.employeeID': 'ID', 'payElID.name': 'rise', 'positionID.dictFundSourceID': 'dictFundSourceID', 'positionID.workPlaceID.documentID.orgID': 'orgID', 'positionID.dictPositionID.positionCategory': 'positionCategory', 'payElID.methodID.code': 'methodCode', 'payElID.methodID.name': 'methodName', 'dictPupilID.code': 'dictPupilCode', 'payElID.code': 'payElCode' })
      ]).then(([accrual]) => ({
        hrOrg,
        positions,
        experience,
        accrual
      }))
    })
  },
  getParams: function (data, reportParams) {
    const hrOrg = data.hrOrg ? data.hrOrg.shortName || data.hrOrg.name || data.hrOrg.fullName : appAC.globalOrganizationName()
    const issueDate = AC.dateService.formatDate(AC.dateService.currentDate())
    const dateFrom = AC.dateService.formatDate(reportParams.issueDate)
    const experience = JSON.parse(JSON.parse(data.experience.employeeExperience)[0].employeeExperience)
    let { positions } = data
    let fullFIO = (positions[0] && positions[0].fullFIO) || 'Вакансія'
    const { accrual } = data
    const allAccrual = positions.reduce((result, item) => (result + item.totalSum), 0)

    function isSortArr (arr) {
      const result = []
      const items = _.groupBy(arr, 'tabNumSort')
      _.forEach(items, specs => {
        const sortByPosIndex = _.sortBy(specs, 'posIndex')
        sortByPosIndex.forEach(o => {
          result.push(o)
        })
      })
      return result
    }
    positions.forEach(o => {
      const positionAccrual = accrual.filter(a => a.positionID === o.ID)
      o.dateFrom = dateFrom
      o.baseSum = positionAccrual.filter(p => ['1', '143'].includes(p.methodCode)).reduce((result, item) => (result + item.accrualSum), 0)
      o.experience = experience.length ? `${experience[0].years || 0} р. ${experience[0].months || 0} м. ${experience[0].days || 0}д.` : ''
      o.accrualAlt = positionAccrual.filter(p => ['144', '152'].includes(p.methodCode))
      o.accrualSum3 = positionAccrual.filter(p => p.methodCode === '145').reduce((result, item) => (result + item.accrualSum), 0)
      o.overpayPosition = positionAccrual.filter(p => !['1', '143', '145', '144', '152'].includes(p.methodCode))
      o.overpayPosition.forEach(p => {
        if (p.dictPupilID) {
          p.rise = `${p.rise} ${p.dictPupilCode} ${p.rate ? `(${p.rate} %)` : ''}`
        }
        if (p.hours || p.methodCode === '148') {
          p.rate = p.hours ? `${p.hours} год.` : `${p.rate} %` || null
        } else {
          p.rate = p.rate ? `${p.rate} %` : null
        }
      })
      o.overpayPosition.sort((a, b) => a.payElCode - b.payElCode)
      const maternityLeave = positionAccrual.find(p => ['14', '57', '140'].includes(p.methodCode))
      if (maternityLeave) {
        fullFIO = `${o.fullFIO} (${maternityLeave.methodName})`
      }
    })
    positions = isSortArr(positions)
    const result = {
      hrOrg,
      issueDate,
      positions,
      fullFIO,
      allAccrual
    }

    return AC.reportService.removeEmptyValues(result)
  }
}
