/* global Ext UB $App AC HR _ */
let paramRep
let paramForm
let cellIDs = {}

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const orgID = reportParams.orgID
    const orgName = reportParams.orgName
    const empPosIDs = reportParams.empPosIDs
    const depID = empPosIDs.length ? undefined : reportParams.depID
    const depName = empPosIDs.length ? '' : reportParams.depName
    const dateFrom = reportParams.dateFrom
    const dateTo = reportParams.dateTo
    const dateFromSql = AC.dateService.shiftDate(dateFrom)
    const dateToSql = AC.dateService.shiftDate(dateTo)
    let onDate = await HR.timeService.getLastWorkDayBefore(dateToSql, orgID)
    onDate = AC.dateService.shiftDate(onDate)
    const withChildOrgs = reportParams.withChildOrgs
    const orgIDs = withChildOrgs ? await HR.treeUtils.getChildOrgs(orgID, onDate) : [orgID]
    const withChildOrgsText = withChildOrgs ? ` ${UB.i18n('(з підпорядкованими організаціями)')}` : ''
    const withChildDeps = reportParams.withChildDeps
    const onDepsText = depID ? `${depName}${withChildDeps ? ` ${UB.i18n('(з підпорядкованими)')}` : ''}` : ''
    const scienceInStr = ['кандидат', 'доктор']
    const repCode = 'f1k'

    const setElementsData = await HR.reportUtils.getSetElements(repCode, onDate)
    const row1aElements = HR.reportUtils.getSetElementIDs(setElementsData, 'F1k_row1a')
    const row1bElements = HR.reportUtils.getSetElementIDs(setElementsData, 'F1k_row1b')
    const row1vElements = HR.reportUtils.getSetElementIDs(setElementsData, 'F1k_row1v')
    const row1gElements = HR.reportUtils.getSetElementIDs(setElementsData, 'F1k_row1g')
    const row1dElements = HR.reportUtils.getSetElementIDs(setElementsData, 'F1k_row1d')
    const col14Elements = HR.reportUtils.getSetElementIDs(setElementsData, 'F1k_col14')
    const col16Elements = HR.reportUtils.getSetElementIDs(setElementsData, 'F1k_col16')
    const col17Elements = HR.reportUtils.getSetElementIDs(setElementsData, 'F1k_col17')
    const col18Elements = HR.reportUtils.getSetElementIDs(setElementsData, 'F1k_col18')
    const col19Elements = HR.reportUtils.getSetElementIDs(setElementsData, 'F1k_col19')
    const col20Elements = HR.reportUtils.getSetElementIDs(setElementsData, 'F1k_col20')

    function getEmpPosPromise (dateFrom = dateFromSql) {
      let result = UB.Repository('hr_employeePositionS')
        .where('dateFrom', '<=', dateToSql)
        .where('dateTo', '>=', dateFrom)
        .where('isActive', '=', true)
        .where('organizationID', 'in', orgIDs)
        .where('workPlace', '=', '1') // за основним місцем роботи
        .where('contractType', '!=', '2', 'ct1') // Не "Договір ЦПХ"
        .where('contractType', 'isNull', '', 'ct2') // может быть пусто для PostgreSQL
        .logic('([ct1] or [ct2])')
        .joinCondition('positionID.state', '=', 'ACTIVE')
        .joinCondition('positionID.mi_deleteDate', '=', '#maxdate')
        .joinCondition('positionID.mi_dateFrom', '<=', dateToSql)
        .joinCondition('positionID.mi_dateTo', '>=', dateToSql) // dateFromSql
      if (depID) {
        if (withChildDeps) {
          result = result.where('departmentID.mi_treePath', 'like', `/${depID}/`)
            .joinCondition('departmentID.state', '=', 'ACTIVE')
            .joinCondition('departmentID.mi_deleteDate', '=', '#maxdate')
            .joinCondition('[departmentID.mi_dateTo] = [departmentID.mi_maxDateTo]', 'custom')
        } else {
          result = result.where('departmentID', '=', depID)
        }
      }
      return result
    }

    function getEmployeeNumberPromise (dateFrom = dateFromSql) {
      let result = UB.Repository('hr_employeeNumberS')
        .where('dateFrom', '<=', dateToSql)
        .where('dateTo', '>=', dateFrom)
        .where('employeePositionID', 'notNull')
        .where('orgID', 'in', orgIDs)
        .where('workPlaceCode', '=', '1') // за основним місцем роботи
        .where('employeePositionID.contractType', '!=', '2', 'ct1') // Не "Договір ЦПХ"
        .where('employeePositionID.contractType', 'isNull', '', 'ct2') // может быть пусто для PostgreSQL
        .logic('([ct1] or [ct2])')
        .joinCondition('employeePositionID.positionID.state', '=', 'ACTIVE')
        .joinCondition('employeePositionID.positionID.mi_deleteDate', '=', '#maxdate')
        .joinCondition('employeePositionID.positionID.mi_dateFrom', '<=', dateToSql)
        .joinCondition('employeePositionID.positionID.mi_dateTo', '>=', dateToSql) // dateFromSql
      if (depID) {
        if (withChildDeps) {
          result = result.where('employeePositionID.departmentID.mi_treePath', 'like', `/${depID}/`)
            .joinCondition('employeePositionID.departmentID.state', '=', 'ACTIVE')
            .joinCondition('employeePositionID.departmentID.mi_deleteDate', '=', '#maxdate')
            .joinCondition('[employeePositionID.departmentID.mi_dateTo] = [employeePositionID.departmentID.mi_maxDateTo]', 'custom')
        } else {
          result = result.where('depID', '=', depID)
        }
      }
      return result
    }

    // let empPosData
    let employeeIDs = []
    let employeeNumberIDs = []
    /*
    if (empPosIDs.length) {
      const ids = _.chunk(empPosIDs, 1000)
      empPosData = []
      for (let i = 0; i < ids.length; i++) {
        const data = await getEmpPosPromise(AC.dateService.addDays(dateFromSql, -1))
          .attrs(['ID', 'positionID', 'employeeNumberID', 'employeeID', 'dateFrom', 'dateTo', 'positionID.mi_dateFrom',
            'positionID.mi_dateTo', 'positionID.dictPositionID', 'mi_deleteDate',
            'positionID.positionCategory', 'positionID.dictPositionID.positionCategory',
            'employeeID.age', 'employeeID.sexType'])
          .where('ID', 'in', ids[i])
          .orderBy('employeeID')
          .orderBy('dateFrom')
          .orderBy('positionID.mi_dateFrom')
          .selectAsObject({
            'positionID.mi_dateFrom': 'posDateFrom',
            'positionID.mi_dateTo': 'posDateTo',
            'positionID.dictPositionID': 'dictPositionID',
            'employeeID.age': 'age',
            'employeeID.sexType': 'sex'
          })
        empPosData.push(...data)
        employeeIDs.push(...data.map(el => el.employeeID))
        employeeNumberIDs.push(...data.filter(el => AC.dateService.formatDate(el.mi_deleteDate) === '31.12.9999').map(el => el.employeeNumberID))
      }
    } else {
      empPosData = await getEmpPosPromise(AC.dateService.addDays(dateFromSql, -1))
        .attrs(['ID', 'positionID', 'employeeNumberID', 'employeeID', 'dateFrom', 'dateTo', 'positionID.mi_dateFrom',
          'positionID.mi_dateTo', 'positionID.dictPositionID', 'mi_deleteDate', 'employeeID.birthDate',
          'positionID.positionCategory', 'positionID.dictPositionID.positionCategory', 'employeeID.sexType'])
        .orderBy('employeeID')
        .orderBy('dateFrom')
        .orderBy('positionID.mi_dateFrom')
        .selectAsObject({
          'positionID.mi_dateFrom': 'posDateFrom',
          'positionID.mi_dateTo': 'posDateTo',
          'positionID.dictPositionID': 'dictPositionID',
          'employeeID.birthDate': 'birthDate',
          'employeeID.sexType': 'sex'
        })
    }
    */
    /*
    if (empPosIDs.length) {
      const ids = _.chunk(empPosIDs, 1000)
      empPosData = []
      for (let i = 0; i < ids.length; i++) {
        const data = await getEmployeeNumberPromise(AC.dateService.addDays(dateFromSql, -1))
          .attrs(['ID', 'employeePositionID.positionID', 'employeePositionID', 'dateFrom', 'dateTo',
            'employeePositionID.positionID.dictPositionID', 'mi_deleteDate',
            'employeePositionID.positionID.positionCategory', 'employeePositionID.positionID.dictPositionID.positionCategory',
            'employeeID', 'employeeID.birthDate', 'employeeID.sexType'])
          .where('employeePositionID', 'in', ids[i])
          .selectAsObject({
            'ID': 'employeeNumberID',
            'employeePositionID': 'ID',
            'employeePositionID.positionID.positionCategory': 'positionID.positionCategory',
            'employeePositionID.positionID.dictPositionID.positionCategory': 'positionID.dictPositionID.positionCategory',
            'employeePositionID.positionID.dictPositionID': 'dictPositionID',
            'employeeID.birthDate': 'birthDate',
            'employeeID.sexType': 'sex'
          })
        empPosData.push(...data)
        employeeIDs.push(...data.map(el => el.employeeID))
        employeeNumberIDs.push(...data.filter(el => AC.dateService.formatDate(el.mi_deleteDate) === '31.12.9999').map(el => el.employeeNumberID))
      }
    } else {
      empPosData = await getEmployeeNumberPromise(AC.dateService.addDays(dateFromSql, -1))
        .attrs(['ID', 'employeePositionID.positionID', 'employeePositionID', 'dateFrom', 'dateTo',
          'employeePositionID.positionID.dictPositionID', 'mi_deleteDate',
          'employeePositionID.positionID.positionCategory', 'employeePositionID.positionID.dictPositionID.positionCategory',
          'employeeID', 'employeeID.birthDate', 'employeeID.sexType'])
        .where('employeeID', '=', 3000738962887)
        .selectAsObject({
          'ID': 'employeeNumberID',
          'employeePositionID': 'ID',
          'employeePositionID.positionID.positionCategory': 'positionID.positionCategory',
          'employeePositionID.positionID.dictPositionID.positionCategory': 'positionID.dictPositionID.positionCategory',
          'employeePositionID.positionID.dictPositionID': 'dictPositionID',
          'employeeID.birthDate': 'birthDate',
          'employeeID.sexType': 'sex'
        })
    }
    */

    const rowsQuery = Object.assign({
      entity: 'hr_employeePosition',
      method: 'selectForK1'
    }, {
      dateFrom: AC.dateService.addDays(dateFromSql, -1),
      dateTo: dateToSql,
      orgIDs: orgIDs,
      empPosIDs: empPosIDs,
      departmentID: depID,
      includeChildDepts: withChildDeps
    })

    const [
      { resultData: empPosDataJson }
    ] = await UB.connection.runTransAsObject([rowsQuery])

    const empPosData = JSON.parse(empPosDataJson)
    // HR.reportUtils.addAgeCol(empPosData, dateTo)

    const dateFields = ['birthDate', 'dateFrom', 'dateTo', 'mi_deleteDate']
    empPosData.forEach(empPosItem => {
      dateFields.forEach(field => {
        empPosItem[field] = empPosItem[field] ? AC.dateService.unshiftDate(new Date(empPosItem[field])) : undefined
      })

      empPosItem.age = AC.dateService.yearsDiff(empPosItem.birthDate, dateTo)

      // empPosItem.dateFrom = AC.dateService.unshiftDate(empPosItem.dateFrom)
      // empPosItem.dateTo = AC.dateService.unshiftDate(empPosItem.dateTo)
      // empPosItem.posDateFrom = AC.dateService.unshiftDate(empPosItem.posDateFrom)
      // empPosItem.posDateTo = AC.dateService.unshiftDate(empPosItem.posDateTo)

      empPosItem.profCode = ''
      // const positionCategory = empPosItem['positionID.dictPositionID.positionCategory'] || empPosItem['positionID.positionCategory'] || ''
      const positionCategory = empPosItem.dictPositionCategory || empPosItem.positionCategory || ''
      switch (positionCategory) {
        case '1':
          empPosItem.profCode = '1'
          break
        case '2':
          empPosItem.profCode = '2'
          break
        case '3':
          empPosItem.profCode = '3'
          break
        case '4':
          empPosItem.profCode = '4'
          break
        case '5':
        case '6':
        case '7':
        case '8':
          empPosItem.profCode = '5'
          break
        case '9':
          empPosItem.profCode = '6'
          break
      }
    })
    // HR.reportUtils.addAgeCol(empPosData, onDate)

    if (empPosIDs.length) {
      employeeIDs.push(...empPosData.map(el => el.employeeID))
      employeeNumberIDs.push(...empPosData.filter(el => AC.dateService.formatDate(el.mi_deleteDate) === '31.12.9999').map(el => el.employeeNumberID))
    }

    let employeeEducationAll = []
    if (employeeIDs.length) {
      const ids = _.chunk(employeeIDs, 1000)
      for (let i = 0; i < ids.length; i++) {
        const data = await UB.Repository('hr_employeeEducation')
          .attrs(['ID', 'employeeID', 'dictEducationLevelID.highEducationLevel', 'isMain'])
          .where('employeeID', 'in', ids[i])
          .where('dictEducationLevelID.highEducationLevel', 'isNotNull')
          .selectAsObject({
            'dictEducationLevelID.highEducationLevel': 'eduLevel'
          })
        employeeEducationAll.push(...data)
      }
    } else {
      employeeEducationAll = await UB.Repository('hr_employeeEducation')
        .attrs(['ID', 'employeeID', 'dictEducationLevelID.highEducationLevel', 'isMain'])
        .exists(getEmpPosPromise().correlation('employeeID', 'employeeID'))
        .where('dictEducationLevelID.highEducationLevel', 'isNotNull')
        .selectAsObject({
          'dictEducationLevelID.highEducationLevel': 'eduLevel'
        })
    }
    employeeEducationAll = employeeEducationAll && employeeEducationAll.length ? _.groupBy(employeeEducationAll, 'employeeID') : {}
    let employeeEducation = {}
    _.forEach(employeeEducationAll, educationItems => {
      if (educationItems.length === 1) {
        employeeEducation[educationItems[0].employeeID] = educationItems
      } else {
        const mainEdu = educationItems.find(el => el.isMain === true)
        if (mainEdu) {
          employeeEducation[educationItems[0].employeeID] = [mainEdu]
        } else {
          educationItems.sort((a, b) => (a.ID > b.ID) ? -1 : 1)
          employeeEducation[educationItems[0].employeeID] = [educationItems[0]]
        }
      }
    })

    const empAcceptInPeriodData = [] // принятые в период
    const empAcceptData = []
    const empDismPosData = [] // уволенные в период
    empAcceptData.push(...empPosData.filter(empPos => empPos.dateTo >= dateTo))
    empAcceptInPeriodData.push(...empPosData.filter(empPos => empPos.dateFrom >= dateFrom && empPos.dateFrom <= dateTo))
    empDismPosData.push(...empPosData.filter(empPos => empPos.dateTo < dateTo))

    employeeIDs = empPosIDs.length ? empPosData.filter(el => AC.dateService.formatDate(el.mi_deleteDate) === '31.12.9999').map(el => el.employeeID) : []
    let empRangeScience = []
    if (employeeIDs.length) {
      const ids = _.chunk(employeeIDs, 1000)
      for (let i = 0; i < ids.length; i++) {
        const data = await UB.Repository('hr_empRangeScience')
          .attrs(['employeeID', 'dictDegreeID.name'])
          .where('employeeID', 'in', ids[i])
          .orderBy('employeeID')
          .selectAsObject({
            'dictDegreeID.name': 'degree'
          })
        empRangeScience.push(...data)
      }
    } else {
      empRangeScience = await UB.Repository('hr_empRangeScience')
        .attrs(['employeeID', 'dictDegreeID.name'])
        .exists(getEmpPosPromise()
          .correlation('employeeID', 'employeeID')
          .where('mi_deleteDate', '=', '#maxdate'))
        .orderBy('employeeID')
        .selectAsObject({
          'dictDegreeID.name': 'degree'
        })
    }
    const empScienceData = empRangeScience.filter(itm => itm.degree && scienceInStr.includes(itm.degree.toLowerCase()))

    let empWorkbookAppoint = []
    if (employeeIDs.length) {
      const ids = _.chunk(employeeIDs, 1000)
      for (let i = 0; i < ids.length; i++) {
        const data = await UB.Repository('hr_employeeWorkbook')
          .attrs(['employeeID'])
          .where('organizationID', 'in', orgIDs)
          .where('isOrgAppoint', '=', 1)
          .where('empWorkPlace', '=', '1')
          .where('dateFrom', '>=', dateFromSql)
          .where('dateFrom', '<=', onDate)
          .where('employeeID', 'in', ids[i])
          .orderBy('employeeID')
          .selectAsObject()
        empWorkbookAppoint.push(...data)
      }
    } else {
      empWorkbookAppoint = await UB.Repository('hr_employeeWorkbook')
        .attrs(['employeeID'])
        .where('organizationID', 'in', orgIDs)
        .where('isOrgAppoint', '=', 1)
        .where('empWorkPlace', '=', '1')
        .where('dateFrom', '>=', dateFromSql)
        .where('dateFrom', '<=', onDate)
        .exists(getEmpPosPromise()
          .correlation('employeeID', 'employeeID')
          .where('mi_deleteDate', '=', '#maxdate'))
        .orderBy('employeeID')
        .selectAsObject()
    }

    let empAppointData = []
    if (employeeNumberIDs.length) {
      const ids = _.chunk(employeeNumberIDs, 1000)
      for (let i = 0; i < ids.length; i++) {
        const data = await UB.Repository('hr_empOrderAppointDet')
          .attrs(['employeeID', 'employeeNumberID', 'dictAppointKindID'])
          .where('organizationID', 'in', orgIDs)
          .where('dateFrom', '>=', dateFromSql)
          .where('dateFrom', '<=', onDate)
          .where('orderID.orderState', '!=', 'PROJECT')
          .where('orderID.mi_deleteDate', '=', '#maxdate')
          .where('employeeNumberID', 'in', ids[i])
          .selectAsObject()
        empAppointData.push(...data)
      }
    } else {
      empAppointData = await UB.Repository('hr_empOrderAppointDet')
        .attrs(['employeeID', 'employeeNumberID', 'dictAppointKindID'])
        .where('organizationID', 'in', orgIDs)
        .where('dateFrom', '>=', dateFromSql)
        .where('dateFrom', '<=', onDate)
        .where('orderID.orderState', '!=', 'PROJECT')
        .where('orderID.mi_deleteDate', '=', '#maxdate')
        .exists(getEmpPosPromise()
          .correlation('employeeNumberID', 'employeeNumberID')
          .where('mi_deleteDate', '=', '#maxdate'))
        .selectAsObject()
    }

    /* для кол. 13 включаємо прийнятих по трудовій книжці або по наказу */
    empAppointData.forEach(acptItem => {
      let acptPos = empAcceptData.find(itm => itm.employeeNumberID === acptItem.employeeNumberID) || empAcceptInPeriodData.find(itm => itm.employeeNumberID === acptItem.employeeNumberID)
      if (acptPos) {
        let wbItem = empWorkbookAppoint.find(itm => itm.employeeID === acptItem.employeeID)
        if (!wbItem) {
          empWorkbookAppoint.push({
            employeeID: acptItem.employeeID,
            employeeNumberID: acptItem.employeeNumberID,
            dictAppointKindID: acptItem.dictAppointKindID
          })
        } else {
          wbItem.employeeNumberID = acptItem.employeeNumberID
          wbItem.dictAppointKindID = acptItem.dictAppointKindID
        }
      }
    })

    let empWorkbookDism = []
    if (employeeIDs.length) {
      const ids = _.chunk(employeeIDs, 1000)
      for (let i = 0; i < ids.length; i++) {
        const data = await UB.Repository('hr_employeeWorkbook')
          .attrs(['employeeID'])
          .where('organizationID', 'in', orgIDs)
          .where('isOrgDismiss', '=', 1)
          .where('empWorkPlace', '=', '1')
          .where('dateTo', '>=', AC.dateService.addDays(dateFromSql, -1))
          .where('dateTo', '<=', onDate)
          .where('employeeID', 'in', ids[i])
          .orderBy('employeeID')
          .selectAsObject()
        empWorkbookDism.push(...data)
      }
    } else {
      empWorkbookDism = await UB.Repository('hr_employeeWorkbook')
        .attrs(['employeeID'])
        .where('organizationID', 'in', orgIDs)
        .where('isOrgDismiss', '=', 1)
        .where('empWorkPlace', '=', '1')
        .where('dateTo', '>=', AC.dateService.addDays(dateFromSql, -1))
        .where('dateTo', '<=', onDate)
        .exists(getEmpPosPromise(AC.dateService.addDays(dateFromSql, -1))
          .correlation('employeeID', 'employeeID')
          .where('mi_deleteDate', '=', '#maxdate'))
        .orderBy('employeeID')
        .selectAsObject()
    }

    let empDismData = []
    if (employeeNumberIDs.length) {
      const ids = _.chunk(employeeNumberIDs, 1000)
      for (let i = 0; i < ids.length; i++) {
        let data = await UB.Repository('hr_empOrderDismDet')
          .attrs(['employeeID', 'employeeNumberID', 'dictReasonDismID'])
          .where('organizationID', 'in', orgIDs)
          // .where('dateFrom', '>=', dateFromSql)
          .where('dateFrom', '>=', AC.dateService.addDays(dateFromSql, -1))
          .where('dateFrom', '<=', onDate)
          .where('orderID.orderState', '!=', 'PROJECT')
          .where('orderID.mi_deleteDate', '=', '#maxdate')
          .where('employeeNumberID', 'in', ids[i])
          .selectAsObject()
        empDismData.push(...data)

        data = await UB.Repository('hr_empOrderTransferDet')
          .attrs(['employeeID', 'employeeNumberID', 'dictReasonDismID'])
          .where('organizationID', 'in', orgIDs)
          // .where('dateFrom', '>=', dateFromSql)
          .where('dateFrom', '>=', AC.dateService.addDays(dateFromSql, -1))
          .where('dateFrom', '<=', onDate)
          .where('orderID.orderState', '!=', 'PROJECT')
          .where('orderID.mi_deleteDate', '=', '#maxdate')
          .where('employeeNumberID', 'in', ids[i])
          .selectAsObject()
        empDismData.push(...data)
      }
    } else {
      empDismData = await UB.Repository('hr_empOrderDismDet')
        .attrs(['employeeID', 'employeeNumberID', 'dictReasonDismID'])
        .where('organizationID', 'in', orgIDs)
        // .where('dateFrom', '>=', dateFromSql)
        .where('dateFrom', '>=', AC.dateService.addDays(dateFromSql, -1))
        .where('dateFrom', '<=', onDate)
        .where('orderID.orderState', '!=', 'PROJECT')
        .where('orderID.mi_deleteDate', '=', '#maxdate')
        .exists(getEmpPosPromise(AC.dateService.addDays(dateFromSql, -1))
          .correlation('employeeNumberID', 'employeeNumberID')
          .where('mi_deleteDate', '=', '#maxdate'))
        .selectAsObject()
      const data = await UB.Repository('hr_empOrderTransferDet')
        .attrs(['employeeID', 'employeeNumberID', 'dictReasonDismID'])
        .where('organizationID', 'in', orgIDs)
        // .where('dateFrom', '>=', dateFromSql)
        .where('dateFrom', '>=', AC.dateService.addDays(dateFromSql, -1))
        .where('dateFrom', '<=', onDate)
        .where('orderID.orderState', '!=', 'PROJECT')
        .where('orderID.mi_deleteDate', '=', '#maxdate')
        .exists(getEmpPosPromise(AC.dateService.addDays(dateFromSql, -1))
          .correlation('employeeNumberID', 'employeeNumberID')
          .where('mi_deleteDate', '=', '#maxdate'))
        .selectAsObject()
      empDismData.push(...data)
    }

    /* для кол. 15 включаємо звільнених по трудовій книжці або по наказу */
    empDismData.forEach(dismItem => {
      let dismPos = empDismPosData.find(itm => itm.employeeNumberID === dismItem.employeeNumberID)
      if (dismPos) {
        let wbItem = empWorkbookDism.find(itm => itm.employeeID === dismItem.employeeID)
        if (!wbItem) {
          empWorkbookDism.push({ employeeID: dismItem.employeeID })
        } else {
          wbItem.dictReasonDismID = dismItem.dictReasonDismID
        }
      }
    })

    cellIDs = {}
    paramRep = {
      onDate: onDate.toString(),
      page0: {
        orgName: orgName,
        withChildOrgsText: withChildOrgsText,
        onDepsText: depID ? onDepsText : '',
        onDepsHtml: depID ? '<br/>' + onDepsText : '',
        dateFrom: AC.dateService.formatDate(dateFrom),
        dateTo: AC.dateService.formatDate(dateTo),

        /* колонка 3 */
        row1col3: countData(empAcceptData, function (itm) { return itm.profCode === '1' ? 1 : 0 }, 'row1col3'),
        row1acol3: countData(empAcceptData, function (itm) { return itm.profCode === '1' && row1aElements.includes(itm.dictPositionID) ? 1 : 0 }, 'row1acol3'),
        row1bcol3: countData(empAcceptData, function (itm) { return itm.profCode === '1' && row1bElements.includes(itm.dictPositionID) ? 1 : 0 }, 'row1bcol3'),
        row1vcol3: countData(empAcceptData, function (itm) { return itm.profCode === '1' && row1vElements.includes(itm.dictPositionID) ? 1 : 0 }, 'row1vcol3'),
        row1gcol3: countData(empAcceptData, function (itm) { return itm.profCode === '1' && row1gElements.includes(itm.dictPositionID) ? 1 : 0 }, 'row1gcol3'),
        row1dcol3: countData(empAcceptData, function (itm) { return itm.profCode === '1' && row1dElements.includes(itm.dictPositionID) ? 1 : 0 }, 'row1dcol3'),
        row2col3: countData(empAcceptData, function (itm) { return itm.profCode === '2' ? 1 : 0 }, 'row2col3'),
        row3col3: countData(empAcceptData, function (itm) { return itm.profCode === '3' ? 1 : 0 }, 'row3col3'),
        row4col3: countData(empAcceptData, function (itm) { return itm.profCode === '4' ? 1 : 0 }, 'row4col3'),
        row5col3: countData(empAcceptData, function (itm) { return itm.profCode === '5' ? 1 : 0 }, 'row5col3'),
        row6col3: countData(empAcceptData, function (itm) { return itm.profCode === '6' ? 1 : 0 }, 'row6col3'),

        /* колонка 4 */
        row1col4: countData(empAcceptData, function (itm) { return itm.profCode === '1' && itm.age > 0 && itm.age < 35 ? 1 : 0 }, 'row1col4'),
        row1acol4: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age > 0 && itm.age < 35 && row1aElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1acol4'),
        row1bcol4: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age > 0 && itm.age < 35 && row1bElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1bcol4'),
        row1vcol4: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age > 0 && itm.age < 35 && row1vElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1vcol4'),
        row1gcol4: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age > 0 && itm.age < 35 && row1gElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1gcol4'),
        row1dcol4: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age > 0 && itm.age < 35 && row1dElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1dcol4'),
        row2col4: countData(empAcceptData, function (itm) { return itm.profCode === '2' && itm.age > 0 && itm.age < 35 ? 1 : 0 }, 'row2col4'),
        row3col4: countData(empAcceptData, function (itm) { return itm.profCode === '3' && itm.age > 0 && itm.age < 35 ? 1 : 0 }, 'row3col4'),
        row4col4: countData(empAcceptData, function (itm) { return itm.profCode === '4' && itm.age > 0 && itm.age < 35 ? 1 : 0 }, 'row4col4'),
        row5col4: countData(empAcceptData, function (itm) { return itm.age > 0 && itm.age < 35 && itm.profCode === '5' ? 1 : 0 }, 'row5col4'),
        row6col4: countData(empAcceptData, function (itm) { return itm.profCode === '6' && itm.age > 0 && itm.age < 35 ? 1 : 0 }, 'row6col4'),

        /* колонка 5 */
        row1col5: countData(empAcceptData, function (itm) { return itm.profCode === '1' && itm.age >= 35 && itm.age < 50 ? 1 : 0 }, 'row1col5'),
        row1acol5: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 35 && itm.age < 50 && row1aElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1acol5'),
        row1bcol5: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 35 && itm.age < 50 && row1bElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1bcol5'),
        row1vcol5: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 35 && itm.age < 50 && row1vElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1vcol5'),
        row1gcol5: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 35 && itm.age < 50 && row1gElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1gcol5'),
        row1dcol5: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 35 && itm.age < 50 && row1dElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1dcol5'),
        row2col5: countData(empAcceptData, function (itm) { return itm.profCode === '2' && itm.age >= 35 && itm.age < 50 ? 1 : 0 }, 'row2col5'),
        row3col5: countData(empAcceptData, function (itm) { return itm.profCode === '3' && itm.age >= 35 && itm.age < 50 ? 1 : 0 }, 'row3col5'),
        row4col5: countData(empAcceptData, function (itm) { return itm.profCode === '4' && itm.age >= 35 && itm.age < 50 ? 1 : 0 }, 'row4col5'),
        row5col5: countData(empAcceptData, function (itm) { return itm.age >= 35 && itm.age < 50 && itm.profCode === '5' ? 1 : 0 }, 'row5col5'),
        row6col5: countData(empAcceptData, function (itm) { return itm.profCode === '6' && itm.age >= 35 && itm.age < 50 ? 1 : 0 }, 'row6col5'),

        /* колонка 6 */
        row1col6: countData(empAcceptData, function (itm) { return itm.profCode === '1' && itm.age >= 50 ? 1 : 0 }, 'row1col6'),
        row1acol6: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 50 && row1aElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1acol6'),
        row1bcol6: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 50 && row1bElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1bcol6'),
        row1vcol6: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 50 && row1vElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1vcol6'),
        row1gcol6: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 50 && row1gElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1gcol6'),
        row1dcol6: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 50 && row1dElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1dcol6'),
        row2col6: countData(empAcceptData, function (itm) { return itm.profCode === '2' && itm.age >= 50 ? 1 : 0 }, 'row2col6'),
        row3col6: countData(empAcceptData, function (itm) { return itm.profCode === '3' && itm.age >= 50 ? 1 : 0 }, 'row3col6'),
        row4col6: countData(empAcceptData, function (itm) { return itm.profCode === '4' && itm.age >= 50 ? 1 : 0 }, 'row4col6'),
        row5col6: countData(empAcceptData, function (itm) { return itm.age >= 50 && itm.profCode === '5' ? 1 : 0 }, 'row5col6'),
        row6col6: countData(empAcceptData, function (itm) { return itm.profCode === '6' && itm.age >= 50 ? 1 : 0 }, 'row6col6'),

        /* колонка 7 */
        row1col7: countData(empAcceptData, function (itm) { return itm.profCode === '1' && itm.age >= 60 && itm.sex === 'W' ? 1 : 0 }, 'row1col7'),
        row1acol7: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 60 && itm.sex === 'W' && row1aElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1acol7'),
        row1bcol7: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 60 && itm.sex === 'W' && row1bElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1bcol7'),
        row1vcol7: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 60 && itm.sex === 'W' && row1vElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1vcol7'),
        row1gcol7: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 60 && itm.sex === 'W' && row1gElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1gcol7'),
        row1dcol7: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 60 && itm.sex === 'W' && row1dElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1dcol7'),
        row2col7: countData(empAcceptData, function (itm) { return itm.profCode === '2' && itm.age >= 60 && itm.sex === 'W' ? 1 : 0 }, 'row2col7'),
        row3col7: countData(empAcceptData, function (itm) { return itm.profCode === '3' && itm.age >= 60 && itm.sex === 'W' ? 1 : 0 }, 'row3col7'),
        row4col7: countData(empAcceptData, function (itm) { return itm.profCode === '4' && itm.age >= 60 && itm.sex === 'W' ? 1 : 0 }, 'row4col7'),
        row5col7: countData(empAcceptData, function (itm) { return itm.age >= 60 && itm.sex === 'W' && itm.profCode === '5' ? 1 : 0 }, 'row5col7'),
        row6col7: countData(empAcceptData, function (itm) { return itm.profCode === '6' && itm.age >= 60 && itm.sex === 'W' ? 1 : 0 }, 'row6col7'),

        /* колонка 8 */
        row1col8: countData(empAcceptData, function (itm) { return itm.profCode === '1' && itm.age >= 60 && itm.sex === 'M' ? 1 : 0 }, 'row1col8'),
        row1acol8: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 60 && itm.sex === 'M' && row1aElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1acol8'),
        row1bcol8: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 60 && itm.sex === 'M' && row1bElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1bcol8'),
        row1vcol8: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 60 && itm.sex === 'M' && row1vElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1vcol8'),
        row1gcol8: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 60 && itm.sex === 'M' && row1gElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1gcol8'),
        row1dcol8: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.age >= 60 && itm.sex === 'M' && row1dElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1dcol8'),
        row2col8: countData(empAcceptData, function (itm) { return itm.profCode === '2' && itm.age >= 60 && itm.sex === 'M' ? 1 : 0 }, 'row2col8'),
        row3col8: countData(empAcceptData, function (itm) { return itm.profCode === '3' && itm.age >= 60 && itm.sex === 'M' ? 1 : 0 }, 'row3col8'),
        row4col8: countData(empAcceptData, function (itm) { return itm.profCode === '4' && itm.age >= 60 && itm.sex === 'M' ? 1 : 0 }, 'row4col8'),
        row5col8: countData(empAcceptData, function (itm) { return itm.age >= 60 && itm.sex === 'M' && itm.profCode === '5' ? 1 : 0 }, 'row5col8'),
        row6col8: countData(empAcceptData, function (itm) { return itm.profCode === '6' && itm.age >= 60 && itm.sex === 'M' ? 1 : 0 }, 'row6col8'),

        /* колонка 9 */
        row1col9: countData(empAcceptData, function (itm) { return itm.profCode === '1' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['3', '4'].includes(edu.eduLevel)).length ? 1 : 0) }, 'row1col9'),
        row1acol9: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['3', '4'].includes(edu.eduLevel)).length ? 1 : 0) && row1aElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1acol9'),
        row1bcol9: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['3', '4'].includes(edu.eduLevel)).length ? 1 : 0) && row1bElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1bcol9'),
        row1vcol9: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['3', '4'].includes(edu.eduLevel)).length ? 1 : 0) && row1vElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1vcol9'),
        row1gcol9: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['3', '4'].includes(edu.eduLevel)).length ? 1 : 0) && row1gElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1gcol9'),
        row1dcol9: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['3', '4'].includes(edu.eduLevel)).length ? 1 : 0) && row1dElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1dcol9'),
        row2col9: countData(empAcceptData, function (itm) { return itm.profCode === '2' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['3', '4'].includes(edu.eduLevel)).length ? 1 : 0) }, 'row2col9'),
        row3col9: countData(empAcceptData, function (itm) { return itm.profCode === '3' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['3', '4'].includes(edu.eduLevel)).length ? 1 : 0) }, 'row3col9'),
        row4col9: countData(empAcceptData, function (itm) { return itm.profCode === '4' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['3', '4'].includes(edu.eduLevel)).length ? 1 : 0) }, 'row4col9'),
        row5col9: countData(empAcceptData, function (itm) {
          return (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['3', '4'].includes(edu.eduLevel)).length ? 1 : 0) && itm.profCode === '5' ? 1 : 0
        }, 'row5col9'),
        row6col9: countData(empAcceptData, function (itm) { return itm.profCode === '6' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['3', '4'].includes(edu.eduLevel)).length ? 1 : 0) }, 'row6col9'),

        /* колонка 10 */
        row1col10: countData(empAcceptData, function (itm) { return itm.profCode === '1' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['1', '2'].includes(edu.eduLevel)).length ? 1 : 0) }, 'row1col10'),
        row1acol10: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['1', '2'].includes(edu.eduLevel)).length ? 1 : 0) && row1aElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1acol10'),
        row1bcol10: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['1', '2'].includes(edu.eduLevel)).length ? 1 : 0) && row1bElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1bcol10'),
        row1vcol10: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['1', '2'].includes(edu.eduLevel)).length ? 1 : 0) && row1vElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1vcol10'),
        row1gcol10: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['1', '2'].includes(edu.eduLevel)).length ? 1 : 0) && row1gElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1gcol10'),
        row1dcol10: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['1', '2'].includes(edu.eduLevel)).length ? 1 : 0) && row1dElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1dcol10'),
        row2col10: countData(empAcceptData, function (itm) { return itm.profCode === '2' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['1', '2'].includes(edu.eduLevel)).length ? 1 : 0) }, 'row2col10'),
        row3col10: countData(empAcceptData, function (itm) { return itm.profCode === '3' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['1', '2'].includes(edu.eduLevel)).length ? 1 : 0) ? 1 : 0 }, 'row3col10'),
        row4col10: countData(empAcceptData, function (itm) { return itm.profCode === '4' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['1', '2'].includes(edu.eduLevel)).length ? 1 : 0) ? 1 : 0 }, 'row4col10'),
        row5col10: countData(empAcceptData, function (itm) {
          return (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['1', '2'].includes(edu.eduLevel)).length ? 1 : 0) && itm.profCode === '5' ? 1 : 0
        }, 'row5col10'),
        row6col10: countData(empAcceptData, function (itm) { return itm.profCode === '6' && (employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['1', '2'].includes(edu.eduLevel)).length ? 1 : 0) ? 1 : 0 }, 'row6col10'),

        /* колонка 11 */
        row1col11: countData(empAcceptData, function (itm) { return itm.profCode === '1' && itm.sex === 'W' ? 1 : 0 }, 'row1col11'),
        row1acol11: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.sex === 'W' && row1aElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1acol11'),
        row1bcol11: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.sex === 'W' && row1bElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1bcol11'),
        row1vcol11: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.sex === 'W' && row1vElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1vcol11'),
        row1gcol11: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.sex === 'W' && row1gElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1gcol11'),
        row1dcol11: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && itm.sex === 'W' && row1dElements.includes(itm.dictPositionID) ? 1 : 0
        }, 'row1dcol11'),
        row2col11: countData(empAcceptData, function (itm) { return itm.profCode === '2' && itm.sex === 'W' ? 1 : 0 }, 'row2col11'),
        row3col11: countData(empAcceptData, function (itm) { return itm.profCode === '3' && itm.sex === 'W' ? 1 : 0 }, 'row3col11'),
        row4col11: countData(empAcceptData, function (itm) { return itm.profCode === '4' && itm.sex === 'W' ? 1 : 0 }, 'row4col11'),
        row5col11: countData(empAcceptData, function (itm) { return itm.sex === 'W' && itm.profCode === '5' ? 1 : 0 }, 'row5col11'),
        row6col11: countData(empAcceptData, function (itm) { return itm.profCode === '6' && itm.sex === 'W' ? 1 : 0 }, 'row6col11'),

        /* колонка 12 */
        row1col12: countData(empAcceptData, function (itm) { return itm.profCode === '1' && empScienceData.find(sItem => sItem.employeeID === itm.employeeID) ? 1 : 0 }, 'row1col12'),
        row1acol12: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && row1aElements.includes(itm.dictPositionID) &&
            empScienceData.find(sItem => sItem.employeeID === itm.employeeID) ? 1 : 0
        }, 'row1acol12'),
        row1bcol12: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && row1bElements.includes(itm.dictPositionID) &&
            empScienceData.find(sItem => sItem.employeeID === itm.employeeID) ? 1 : 0
        }, 'row1bcol12'),
        row1vcol12: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && row1vElements.includes(itm.dictPositionID) &&
            empScienceData.find(sItem => sItem.employeeID === itm.employeeID) ? 1 : 0
        }, 'row1vcol12'),
        row1gcol12: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && row1gElements.includes(itm.dictPositionID) &&
            empScienceData.find(sItem => sItem.employeeID === itm.employeeID) ? 1 : 0
        }, 'row1gcol12'),
        row1dcol12: countData(empAcceptData, function (itm) {
          return itm.profCode === '1' && row1dElements.includes(itm.dictPositionID) &&
            empScienceData.find(sItem => sItem.employeeID === itm.employeeID) ? 1 : 0
        }, 'row1dcol12'),
        row2col12: countData(empAcceptData, function (itm) { return itm.profCode === '2' && empScienceData.find(sItem => sItem.employeeID === itm.employeeID) ? 1 : 0 }, 'row2col12'),
        row3col12: countData(empAcceptData, function (itm) { return itm.profCode === '3' && empScienceData.find(sItem => sItem.employeeID === itm.employeeID) ? 1 : 0 }, 'row3col12'),
        row4col12: countData(empAcceptData, function (itm) { return itm.profCode === '4' && empScienceData.find(sItem => sItem.employeeID === itm.employeeID) ? 1 : 0 }, 'row4col12'),
        row5col12: countData(empAcceptData, function (itm) {
          return itm.profCode === '5' && empScienceData.find(sItem => sItem.employeeID === itm.employeeID) ? 1 : 0
        }, 'row5col12'),
        row6col12: countData(empAcceptData, function (itm) { return itm.profCode === '6' && empScienceData.find(sItem => sItem.employeeID === itm.employeeID) ? 1 : 0 }, 'row6col12'),

        /* колонка 13 */
        row1col13: countData(empAcceptInPeriodData, function (itm) { return itm.profCode === '1' && empWorkbookAppoint.find(wbItem => wbItem.employeeID === itm.employeeID) ? 1 : 0 }, 'row1col13'),
        row1acol13: countData(empAcceptInPeriodData, function (itm) {
          return itm.profCode === '1' && row1aElements.includes(itm.dictPositionID) &&
            empWorkbookAppoint.find(wbItem => wbItem.employeeID === itm.employeeID) ? 1 : 0
        }, 'row1acol13'),
        row1bcol13: countData(empAcceptInPeriodData, function (itm) {
          return itm.profCode === '1' && row1bElements.includes(itm.dictPositionID) &&
            empWorkbookAppoint.find(wbItem => wbItem.employeeID === itm.employeeID) ? 1 : 0
        }, 'row1bcol13'),
        row1vcol13: countData(empAcceptInPeriodData, function (itm) {
          return itm.profCode === '1' && row1vElements.includes(itm.dictPositionID) &&
            empWorkbookAppoint.find(wbItem => wbItem.employeeID === itm.employeeID) ? 1 : 0
        }, 'row1vcol13'),
        row1gcol13: countData(empAcceptInPeriodData, function (itm) {
          return itm.profCode === '1' && row1gElements.includes(itm.dictPositionID) &&
            empWorkbookAppoint.find(wbItem => wbItem.employeeID === itm.employeeID) ? 1 : 0
        }, 'row1gcol13'),
        row1dcol13: countData(empAcceptInPeriodData, function (itm) {
          return itm.profCode === '1' && row1dElements.includes(itm.dictPositionID) &&
            empWorkbookAppoint.find(wbItem => wbItem.employeeID === itm.employeeID) ? 1 : 0
        }, 'row1dcol13'),
        row2col13: countData(empAcceptInPeriodData, function (itm) { return itm.profCode === '2' && empWorkbookAppoint.find(wbItem => wbItem.employeeID === itm.employeeID) ? 1 : 0 }, 'row2col13'),
        row3col13: countData(empAcceptInPeriodData, function (itm) { return itm.profCode === '3' && empWorkbookAppoint.find(wbItem => wbItem.employeeID === itm.employeeID) ? 1 : 0 }, 'row3col13'),
        row4col13: countData(empAcceptInPeriodData, function (itm) { return itm.profCode === '4' && empWorkbookAppoint.find(wbItem => wbItem.employeeID === itm.employeeID) ? 1 : 0 }, 'row4col13'),
        row5col13: countData(empAcceptInPeriodData, function (itm) {
          return itm.profCode === '5' &&
            empWorkbookAppoint.find(wbItem => wbItem.employeeID === itm.employeeID) ? 1 : 0
        }, 'row5col13'),
        row6col13: countData(empAcceptInPeriodData, function (itm) { return itm.profCode === '6' && empWorkbookAppoint.find(wbItem => wbItem.employeeID === itm.employeeID) ? 1 : 0 }, 'row6col13'),

        /* колонка 14 */
        row1col14: countData(empAcceptInPeriodData, function (itm) {
          return itm.profCode === '1' && empAppointData.find(apntItem => apntItem.employeeNumberID === itm.employeeNumberID && col14Elements.includes(apntItem.dictAppointKindID)) ? 1 : 0
        }, 'row1col14'),
        row1acol14: countData(empAcceptInPeriodData, function (itm) {
          return itm.profCode === '1' && row1aElements.includes(itm.dictPositionID) &&
            empAppointData.find(apntItem => apntItem.employeeNumberID === itm.employeeNumberID && col14Elements.includes(apntItem.dictAppointKindID)) ? 1 : 0
        }, 'row1acol14'),
        row1bcol14: countData(empAcceptInPeriodData, function (itm) {
          return itm.profCode === '1' && row1bElements.includes(itm.dictPositionID) &&
            empAppointData.find(apntItem => apntItem.employeeNumberID === itm.employeeNumberID && col14Elements.includes(apntItem.dictAppointKindID)) ? 1 : 0
        }, 'row1bcol14'),
        row1vcol14: countData(empAcceptInPeriodData, function (itm) {
          return itm.profCode === '1' && row1vElements.includes(itm.dictPositionID) &&
            empAppointData.find(apntItem => apntItem.employeeNumberID === itm.employeeNumberID && col14Elements.includes(apntItem.dictAppointKindID)) ? 1 : 0
        }, 'row1vcol14'),
        row1gcol14: countData(empAcceptInPeriodData, function (itm) {
          return itm.profCode === '1' && row1gElements.includes(itm.dictPositionID) &&
            empAppointData.find(apntItem => apntItem.employeeNumberID === itm.employeeNumberID && col14Elements.includes(apntItem.dictAppointKindID)) ? 1 : 0
        }, 'row1gcol14'),
        row1dcol14: countData(empAcceptInPeriodData, function (itm) {
          return itm.profCode === '1' && row1dElements.includes(itm.dictPositionID) &&
            empAppointData.find(apntItem => apntItem.employeeNumberID === itm.employeeNumberID && col14Elements.includes(apntItem.dictAppointKindID)) ? 1 : 0
        }, 'row1dcol14'),
        row2col14: countData(empAcceptInPeriodData, function (itm) {
          return itm.profCode === '2' && empAppointData.find(apntItem => apntItem.employeeNumberID === itm.employeeNumberID && col14Elements.includes(apntItem.dictAppointKindID)) ? 1 : 0
        }, 'row2col14'),
        row3col14: countData(empAcceptInPeriodData, function (itm) {
          return itm.profCode === '3' && empAppointData.find(apntItem => apntItem.employeeNumberID === itm.employeeNumberID && col14Elements.includes(apntItem.dictAppointKindID)) ? 1 : 0
        }, 'row3col14'),
        row4col14: countData(empAcceptInPeriodData, function (itm) {
          return itm.profCode === '4' && empAppointData.find(apntItem => apntItem.employeeNumberID === itm.employeeNumberID && col14Elements.includes(apntItem.dictAppointKindID)) ? 1 : 0
        }, 'row4col14'),
        row5col14: countData(empAcceptInPeriodData, function (itm) {
          return itm.profCode === '5' &&
            empAppointData.find(apntItem => apntItem.employeeNumberID === itm.employeeNumberID && col14Elements.includes(apntItem.dictAppointKindID)) ? 1 : 0
        }, 'row5col14'),
        row6col14: countData(empAcceptInPeriodData, function (itm) {
          return itm.profCode === '6' && empAppointData.find(apntItem => apntItem.employeeNumberID === itm.employeeNumberID && col14Elements.includes(itm.dictAppointKindID)) ? 1 : 0
        }, 'row6col14'),

        /* колонка 15 */
        row1col15: countData(empDismPosData, function (itm) { return itm.profCode === '1' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID) ? 1 : 0 }, 'row1col15'),
        row1acol15: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1aElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID) ? 1 : 0
        }, 'row1acol15'),
        row1bcol15: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1bElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID) ? 1 : 0
        }, 'row1bcol15'),
        row1vcol15: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1vElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID) ? 1 : 0
        }, 'row1vcol15'),
        row1gcol15: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1gElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID) ? 1 : 0
        }, 'row1gcol15'),
        row1dcol15: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1dElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID) ? 1 : 0
        }, 'row1dcol15'),
        row2col15: countData(empDismPosData, function (itm) { return itm.profCode === '2' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID) ? 1 : 0 }, 'row2col15'),
        row3col15: countData(empDismPosData, function (itm) { return itm.profCode === '3' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID) ? 1 : 0 }, 'row3col15'),
        row4col15: countData(empDismPosData, function (itm) { return itm.profCode === '4' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID) ? 1 : 0 }, 'row4col15'),
        row5col15: countData(empDismPosData, function (itm) { return itm.profCode === '5' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID) ? 1 : 0 }, 'row5col15'),
        row6col15: countData(empDismPosData, function (itm) { return itm.profCode === '6' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID) ? 1 : 0 }, 'row6col15'),

        /* колонка 16 */
        row1col16: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col16Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1col16'),
        row1acol16: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1aElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col16Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1acol16'),
        row1bcol16: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1bElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col16Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1bcol16'),
        row1vcol16: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1vElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col16Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1vcol16'),
        row1gcol16: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1gElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col16Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1gcol16'),
        row1dcol16: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1dElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col16Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1dcol16'),
        row2col16: countData(empDismPosData, function (itm) {
          return itm.profCode === '2' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col16Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row2col16'),
        row3col16: countData(empDismPosData, function (itm) {
          return itm.profCode === '3' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col16Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row3col16'),
        row4col16: countData(empDismPosData, function (itm) {
          return itm.profCode === '4' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col16Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row4col16'),
        row5col16: countData(empDismPosData, function (itm) {
          return itm.profCode === '5' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col16Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row5col16'),
        row6col16: countData(empDismPosData, function (itm) {
          return itm.profCode === '6' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col16Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row6col16'),

        /* колонка 17 */
        row1col17: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col17Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1col17'),
        row1acol17: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1aElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col17Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1acol17'),
        row1bcol17: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1bElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col17Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1bcol17'),
        row1vcol17: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1vElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col17Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1vcol17'),
        row1gcol17: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1gElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col17Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1gcol17'),
        row1dcol17: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1dElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col17Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1dcol17'),
        row2col17: countData(empDismPosData, function (itm) {
          return itm.profCode === '2' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col17Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row2col17'),
        row3col17: countData(empDismPosData, function (itm) {
          return itm.profCode === '3' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col17Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row3col17'),
        row4col17: countData(empDismPosData, function (itm) {
          return itm.profCode === '4' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col17Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row4col17'),
        row5col17: countData(empDismPosData, function (itm) {
          return itm.profCode === '5' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col17Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row5col17'),
        row6col17: countData(empDismPosData, function (itm) {
          return itm.profCode === '6' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col17Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row6col17'),

        /* колонка 18 */
        row1col18: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col18Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1col18'),
        row1acol18: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1aElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col18Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1acol18'),
        row1bcol18: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1bElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col18Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1bcol18'),
        row1vcol18: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1vElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col18Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1vcol18'),
        row1gcol18: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1gElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col18Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1gcol18'),
        row1dcol18: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1dElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col18Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1dcol18'),
        row2col18: countData(empDismPosData, function (itm) {
          return itm.profCode === '2' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col18Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row2col18'),
        row3col18: countData(empDismPosData, function (itm) {
          return itm.profCode === '3' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col18Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row3col18'),
        row4col18: countData(empDismPosData, function (itm) {
          return itm.profCode === '4' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col18Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row4col18'),
        row5col18: countData(empDismPosData, function (itm) {
          return itm.profCode === '5' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col18Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row5col18'),
        row6col18: countData(empDismPosData, function (itm) {
          return itm.profCode === '6' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col18Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row6col18'),

        /* колонка 19 */
        row1col19: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col19Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1col19'),
        row1acol19: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1aElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col19Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1acol19'),
        row1bcol19: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1bElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col19Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1bcol19'),
        row1vcol19: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1vElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col19Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1vcol19'),
        row1gcol19: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1gElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col19Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1gcol19'),
        row1dcol19: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1dElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col19Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1dcol19'),
        row2col19: countData(empDismPosData, function (itm) {
          return itm.profCode === '2' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col19Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row2col19'),
        row3col19: countData(empDismPosData, function (itm) {
          return itm.profCode === '3' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col19Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row3col19'),
        row4col19: countData(empDismPosData, function (itm) {
          return itm.profCode === '4' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col19Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row4col19'),
        row5col19: countData(empDismPosData, function (itm) {
          return itm.profCode === '5' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col19Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row5col19'),
        row6col19: countData(empDismPosData, function (itm) {
          return itm.profCode === '6' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col19Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row6col19'),

        /* колонка 20 */
        row1col20: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col20Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1col20'),
        row1acol20: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1aElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col20Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1acol20'),
        row1bcol20: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1bElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col20Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1bcol20'),
        row1vcol20: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1vElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col20Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1vcol20'),
        row1gcol20: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1gElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col20Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1gcol20'),
        row1dcol20: countData(empDismPosData, function (itm) {
          return itm.profCode === '1' && row1dElements.includes(itm.dictPositionID) && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID &&
            col20Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row1dcol20'),
        row2col20: countData(empDismPosData, function (itm) {
          return itm.profCode === '2' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col20Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row2col20'),
        row3col20: countData(empDismPosData, function (itm) {
          return itm.profCode === '3' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col20Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row3col20'),
        row4col20: countData(empDismPosData, function (itm) {
          return itm.profCode === '4' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col20Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row4col20'),
        row5col20: countData(empDismPosData, function (itm) {
          return itm.profCode === '5' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col20Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row5col20'),
        row6col20: countData(empDismPosData, function (itm) {
          return itm.profCode === '6' && empDismData.find(dismItem => dismItem.employeeNumberID === itm.employeeNumberID && col20Elements.includes(dismItem.dictReasonDismID)) ? 1 : 0
        }, 'row6col20')
      }
    }
    // формули
    for (let i = 3; i <= 20; i++) {
      // Рядок 1e = Всього - 1a -1b - 1v -1g -1d
      let cell1e = 'row1ecol' + i
      let cell1All = 'row1col' + i
      let ids1e = [...cellIDs[cell1All]]
      let sum1eRows = ['row1acol', 'row1bcol', 'row1vcol', 'row1gcol', 'row1dcol']
      let chiefSum = paramRep.page0[cell1All]
      sum1eRows.forEach(rowCode => {
        let rowCodeI = rowCode + i
        chiefSum -= paramRep.page0[rowCodeI]
        ids1e = ids1e.filter(el => !cellIDs[rowCodeI].includes(el))
      })
      cellIDs[cell1e] = ids1e
      paramRep.page0[cell1e] = chiefSum > 0 ? chiefSum : 0
      // Рядок всього = рядок 1 + 2 + 3 + 4 + 5 + 6
      let cellTotal = 'rowTotalcol' + i
      let idsTotal = cellIDs[cellTotal] = []
      paramRep.page0[cellTotal] = 0
      let sumTotalRows = ['row1col', 'row2col', 'row3col', 'row4col', 'row5col', 'row6col']
      sumTotalRows.forEach(rowCode => {
        let rowCodeI = rowCode + i
        paramRep.page0[cellTotal] += paramRep.page0[rowCodeI]
        let rowIDs = cellIDs[rowCodeI]
        rowIDs.length > 0 && idsTotal.push(...rowIDs)
      })
    }
    return paramRep
  },
  onReportClick: function (e) {
    drillDown(e.target.dataset['cellcode'], e.target.dataset['ondate'])
    e.preventDefault()
  },
  onParamPanelConfig: function () {
    const accMainReportsSubOrg = AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')
    paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getOrgCombo({
                  labelWidth: 120,
                  flex: 1,
                  addFields: ['nameDat', 'name'],
                  orgFilter: accMainReportsSubOrg ? 'WITH_CHILDS' : 'CURRENT',
                  readOnly: !accMainReportsSubOrg,
                  listeners: {
                    afterrender: function (crtl) {
                      const store = crtl.getStore()
                      store.on('load', () => {
                        const reportViewer = this.up('form').ownerCt
                        reportViewer.exportToXLSX = exportToXLSX
                      })
                    },
                    change: function (ctrl) {
                      const form = ctrl.up('form')
                      HR.controlService.onChangeIncludeChildOrgs(form)

                      const me = paramForm.getForm()
                      const o = me.findField('organizationID').getValue()
                      const f = me.findField('dateFrom').getValue()
                      const t = me.findField('dateTo').getValue()
                      const b = paramForm.down('[name=addEmplButton]')
                      if (!o || !f || !t) {
                        b.setDisabled(true)
                      } else {
                        b.setDisabled(false)
                      }
                    }
                  }
                }),
                HR.controlService.getIncludeChildOrgs(accMainReportsSubOrg, {
                  labelWidth: 120,
                  checked: accMainReportsSubOrg
                })
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getDepCombo({
                  labelWidth: 120,
                  flex: 1,
                  displayField: 'description',
                  addFields: ['nameDat', 'name'],
                  listeners: {
                    change: function (ctrl, value) {
                      const form = ctrl.up('form')
                      form.down('[name=includeChildDepts]').setReadOnly(!value)
                      if (!value) {
                        form.down('[name=includeChildDepts]').setValue()
                      }
                    }
                  }
                }),
                HR.controlService.getIncludeChildDepts({
                  labelWidth: 120
                })
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'dateFrom',
                  labelWidth: 120,
                  width: 260,
                  fieldLabel: UB.i18n('Період з'),
                  allowBlank: false,
                  value: new Date((new Date()).getFullYear(), 0, 1, 0, 0, 0, 0),
                  listeners: {
                    change: function (ctrl) {
                      const me = paramForm.getForm()
                      const o = me.findField('organizationID').getValue()
                      const f = me.findField('dateFrom').getValue()
                      const t = me.findField('dateTo').getValue()
                      const b = paramForm.down('[name=addEmplButton]')
                      if (!o || !f || !t) {
                        b.setDisabled(true)
                      } else {
                        b.setDisabled(false)
                      }
                    }
                  },
                  validator: function () {
                    const me = paramForm.getForm()
                    const f = me.findField('dateFrom').getValue()
                    const t = me.findField('dateTo').getValue()
                    return (f > t) ? UB.i18n('Дата кінця періоду повинна перевищувати дату початку') : true
                  }
                },
                {
                  xtype: 'datefield',
                  name: 'dateTo',
                  labelWidth: 40,
                  width: 160,
                  fieldLabel: UB.i18n('по'),
                  allowBlank: false,
                  value: new Date((new Date()).getFullYear(), 11, 31, 0, 0, 0, 0),
                  listeners: {
                    change: function (ctrl) {
                      const me = paramForm.getForm()
                      const o = me.findField('organizationID').getValue()
                      const f = me.findField('dateFrom').getValue()
                      const t = me.findField('dateTo').getValue()
                      const b = paramForm.down('[name=addEmplButton]')
                      if (!o || !f || !t) {
                        b.setDisabled(true)
                      } else {
                        b.setDisabled(false)
                      }
                    }
                  },
                  validator: function () {
                    const me = paramForm.getForm()
                    const f = me.findField('dateFrom').getValue()
                    const t = me.findField('dateTo').getValue()
                    return (f > t) ? UB.i18n('Дата кінця періоду повинна перевищувати дату початку') : true
                  }
                }
              ]
            },
            {
              xtype: 'panel',
              name: 'panelInfo',
              collapsible: true,
              collapsed: true,
              cls: 'panel-bordered-light',
              // iconCls: 'iconInfo',
              title: UB.i18n('Вибрати працівників'),
              layout: {
                type: 'vbox'
              },
              width: 700,
              margin: '5 10 5 15',
              header: { style: 'background-color: rgba(0,0,0,.0); cursor: pointer; padding: 10px; color: #818181' },
              listeners: {
                render: function (panel) {
                  panel.header.on('click', function () {
                    if (panel.collapsed) {
                      panel.expand()
                    } else {
                      panel.collapse()
                    }
                  })
                }
              },
              items: [
                {
                  xtype: 'acGrid',
                  name: 'empGrid',
                  stateId: UB.core.UBLocalStorageManager.getKeyUI('hr_form1k_grid'),
                  flex: 1,
                  height: 280,
                  region: 'center',
                  autoScroll: true,
                  storeType: 'local',
                  disablePaging: true,
                  showToolBar: true,
                  cellEditing: false,
                  hideActions: ['addNew', 'addNewByCurrent', 'edit'],
                  // hideDefaultAction: true,
                  pagerConfig: { pageSize: 1000 },
                  customToolBarActions: [
                    {
                      xtype: 'button',
                      name: 'addEmplButton',
                      tooltip: UB.i18n('Вибрати працівників'),
                      iconCls: 'fas fa-angle-double-down',
                      cls: 'fill-action',
                      width: 30,
                      // margin: '5 0 5 0',
                      handler: async function () {
                        const me = paramForm.getForm()
                        const organizationID = me.findField('organizationID').getValue()
                        const onDate = me.findField('dateTo').getValue()
                        let department = []
                        if (me.findField('includeChildDepts').getValue()) {
                          const depTreePath = me.findField('departmentID').getFieldValue('mi_treePath')
                          if (depTreePath) {
                            department = await UB.Repository('hr_department')
                              .attrs('mi_data_id', 'description', 'name')
                              .where('mi_treePath', 'startWith', depTreePath)
                              .where('state', '=', 'ACTIVE')
                              .misc({ __mip_ondate: onDate })
                              .selectAsObject({
                                'mi_data_id': 'value'
                              })
                          }
                        } else {
                          if (me.findField('departmentID').getValue()) {
                            department.push({
                              value: me.findField('departmentID').getValue(),
                              description: me.findField('departmentID').getFieldValue('description')
                            })
                          }
                        }
                        /*
                        const cType = []
                        UB.core.UBEnumManager.getArrayStore('HR_CONTRACT_TYPE').data.items.forEach(item => {
                          if (item.get('code') !== '2') {
                            cType.push({
                              value: item.get('code'),
                              description: item.get('name')
                            })
                          }
                        })
                         */
                        const grid = paramForm.down('[name=empGrid]')
                        const empPosIDs = grid.getStore().data.items.map(el => el.get('employeePositionID'))

                        HR.orderManager.empOrderEmployeeSearch({
                          selected: empPosIDs,
                          orgID: organizationID,
                          onDate: onDate,
                          department: department,
                          // contractType: cType,
                          workPlace: [{ value: '1', description: UB.i18n('Основне') }],
                          onSelectData: function (data, isDelete) {
                            const grid = paramForm.down('[name=empGrid]')
                            if (isDelete) {
                              grid.getStore().removeAll()
                            }
                            const dataGrid = []
                            grid.getStore().data.items.forEach(item => {
                              dataGrid.push({
                                employeePositionID: item.get('employeePositionID'),
                                tabNum: item.get('tabNum') || '',
                                lastName: item.get('lastName') || '',
                                firstName: item.get('firstName') || '',
                                middleName: item.get('middleName') || '',
                                posName: item.get('posName') || '',
                                depName: item.get('depName') || ''
                              })
                            })
                            data.forEach(item => {
                              if ((item.workPlace || '') === '1' && (item.contractType || '') !== '2') {
                                dataGrid.push({
                                  employeePositionID: item.employeePositionID,
                                  tabNum: item.tabNum || '',
                                  lastName: item['employeeID.lastName'] || '',
                                  firstName: item['employeeID.firstName'] || '',
                                  middleName: item['employeeID.middleName'] || '',
                                  posName: item.posName || '',
                                  depName: item.depName || ''
                                })
                              }
                            })
                            grid.setLocalStoreData(dataGrid)
                            if (dataGrid.length) {
                              me.findField('departmentID').setValue()
                            }
                          }
                        })
                      }
                    },
                    {
                      xtype: 'button',
                      tooltip: UB.i18n('Очистити'),
                      iconCls: 'fas fa-eraser',
                      cls: 'fill-action',
                      width: 30,
                      handler: async function () {
                        const grid = paramForm.down('[name=empGrid]')
                        grid.getStore().removeAll()
                      }
                    }
                  ],
                  fields: [
                    { name: 'tabNum', columnConfig: { text: UB.i18n('Таб. №'), width: 80, filterBy: 'string' } },
                    { name: 'lastName', columnConfig: { text: UB.i18n('Прізвище'), width: 100, flex: 1, filterBy: 'string' } },
                    { name: 'firstName', columnConfig: { text: UB.i18n('Ім\'я'), width: 100, flex: 1, filterBy: 'string' } },
                    { name: 'middleName', columnConfig: { text: UB.i18n('По батькові'), width: 100, flex: 1, filterBy: 'string' } },
                    { name: 'posName', columnConfig: { text: UB.i18n('Посада'), width: 200, flex: 1, filterBy: 'string' } },
                    { name: 'depName', columnConfig: { text: UB.i18n('Підрозділ'), width: 200, flex: 1, filterBy: 'string' } },
                    { name: 'employeePositionID' }
                  ]
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const orgCtrl = frm.findField('organizationID')
        const depCtrl = frm.findField('departmentID')
        const grid = owner.down('[name=empGrid]')
        const empPosIDs = grid.getStore().data.items.map(el => el.get('employeePositionID'))
        return {
          orgID: orgCtrl.getValue() || 0,
          orgName: orgCtrl.getFieldValue('nameDat') || orgCtrl.getFieldValue('name'),
          empPosIDs: empPosIDs || [],
          withChildOrgs: frm.findField('includeChildOrgs').getValue(),
          depID: depCtrl.getValue() || 0,
          depName: depCtrl.getFieldValue('nameDat') || depCtrl.getFieldValue('name'),
          withChildDeps: frm.findField('includeChildDepts').getValue(),
          dateFrom: frm.findField('dateFrom').getValue(),
          dateTo: frm.findField('dateTo').getValue()
        }
      }
    })
    paramRep = undefined
    return paramForm
  }
}

function countData (itmData, func, cellCode) {
  let cnt = 0
  let IDs = cellIDs[cellCode] = []
  itmData.forEach(itm => {
    let cntToAdd = func(itm)
    if (cntToAdd > 0) {
      IDs.push(itm.ID)
      cnt += cntToAdd
    }
  })
  return cnt
}

function drillDown (cellCode, onDate) {
  onDate = AC.dateService.shiftDate(onDate)
  let windowTitle = UB.i18n('Форма 1-к')
  const replaceCodeStr = {
    'a': UB.i18n('а'),
    'b': UB.i18n('б'),
    'v': UB.i18n('в'),
    'g': UB.i18n('г'),
    'd': UB.i18n('д'),
    'e': UB.i18n('е')
  }
  let rw
  let cl
  if (cellCode) {
    let colIdx = cellCode.indexOf('col')
    if (colIdx > 2) {
      rw = cellCode.substr(3, colIdx - 3)
      if (rw === 'Total') {
        rw = `"${UB.i18n('Всього')}"`
      } else if (rw.startsWith('1') && rw.length > 1) {
        let strToReplace = rw.substr(1)
        let strReplaceWith = replaceCodeStr[strToReplace]
        if (strReplaceWith) {
          rw = rw.replace(strToReplace, strReplaceWith)
        }
      }
      cl = cellCode.substr(colIdx + 3)
      windowTitle += `, ${UB.i18n('рядок')} ${rw}, ${UB.i18n('колонка')} ${cl}`
    }
  }
  if (cl === '2') {
    /* Налагодження рядка */
    const cell2ParamCode = {
      'row1acol2': 'F1k_row1a',
      'row1bcol2': 'F1k_row1b',
      'row1vcol2': 'F1k_row1v',
      'row1gcol2': 'F1k_row1g',
      'row1dcol2': 'F1k_row1d'
    }
    let paramCode = cell2ParamCode[cellCode] || ''
    UB.Repository('hr_repSetParam')
      .attrs(['ID'])
      .where('dictStReportID.code', '=', 'f1k')
      .where('code', '=', paramCode)
      .selectSingle()
      .then(repSetParam => {
        if (repSetParam && repSetParam.ID) {
          $App.doCommand({
            cmdType: 'showList',
            isModal: true,
            description: windowTitle,
            cmpInitConfig: {
              dfm: {
                size: {
                  width: 1000,
                  height: 500
                }
              },
              customParams: {
                repSetParamID: repSetParam.ID
              }
            },
            hideActions: ['itemSelect'],
            cmdData: {
              params: [{
                entity: 'hr_repSetElement',
                fieldList: [
                  { name: 'elementSetTypeID.name', description: UB.i18n('Вид елемента'), config: { width: 100 } },
                  { name: 'elementInfo', description: UB.i18n('Значення елемента'), config: { width: 250 } },
                  { name: 'dateFrom', format: 'd.m.Y', config: { align: 'center', width: 150 } },
                  { name: 'dateToEmpty', format: 'd.m.Y', config: { align: 'center', width: 150 } }
                ],
                whereList: {
                  repSetParamID: {
                    expression: '[repSetParamID]',
                    condition: '=',
                    value: repSetParam.ID
                  },
                  paramCode: {
                    expression: '[repSetParamID.code]',
                    condition: '=',
                    value: paramCode
                  },
                  dateFrom: {
                    expression: '[dateFromNotEmpty]',
                    condition: '<=',
                    value: onDate
                  },
                  dateTo: {
                    expression: '[dateToNotEmpty]',
                    condition: '>=',
                    value: onDate
                  },
                  repDateFrom: {
                    expression: '[repSetParamID.dateFrom]',
                    condition: '<=',
                    value: onDate
                  },
                  repDateTo: {
                    expression: '[repSetParamID.dateTo]',
                    condition: '>=',
                    value: onDate
                  },
                  repDeleteDate: {
                    expression: '[repSetParamID.mi_deleteDate]',
                    condition: '=',
                    value: '#maxdate'
                  }
                },
                orderList: {
                  elmName: {
                    expression: '[elementSetTypeID.name]',
                    order: 'asc'
                  }
                }
              }]
            }
          })
        }
      })
  } else {
    const IDs = cellIDs[cellCode] && cellIDs[cellCode].length > 0 ? cellIDs[cellCode] : [0]
    const fieldList = [
      { name: 'employeeNumberID.tabNum', description: UB.i18n('Таб. №'), config: { align: 'center', width: 100 } },
      { name: 'employeeID.fullFIO', description: UB.i18n('ПІБ'), config: { width: 250 } },
      { name: 'positionID.name', description: UB.i18n('Посада'), config: { width: 250 } },
      { name: 'positionID.parentUnitID.name', description: UB.i18n('Підрозділ'), config: { width: 250 } },
      { name: 'mtCount', description: UB.i18n('Кільк. ставок'), config: { width: 100, align: 'center' }, format: '0.0' },
      { name: 'employeeNumberID.ID', visibility: false },
      { name: 'employeeID.ID', visibility: false }
    ]
    $App.doCommand({
      cmdType: 'showList',
      isModal: true,
      description: windowTitle,
      cmpInitConfig: {
        dfm: {
          size: {
            width: 1000,
            height: 500
          }
        },
        onItemDblClick: function (grid, record) {
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_employee',
            entity: 'hr_employee',
            instanceID: record.get('employeeID.ID'),
            cmpInitConfig: {
              employeeNumberID: record.get('employeeNumberID.ID')
            }
          })
        }
      },
      hideActions: ['addNew', 'addNewByCurrent', 'del', 'edit', 'itemSelect'],
      cmdData: {
        params: [{
          entity: 'hr_employeePositionS',
          fieldList: fieldList,
          whereList: {
            ID: {
              expression: '[ID]',
              condition: 'in',
              values: {
                value: IDs
              }
            },
            posDateTo: {
              expression: '[positionID.mi_dateTo] = [positionID.mi_maxDateTo]',
              condition: 'custom'
            },
            posState: {
              expression: '[positionID.state]',
              condition: '=',
              value: 'ACTIVE'
            },
            posDateDelete: {
              expression: '[positionID.mi_deleteDate]',
              condition: '=',
              value: '#maxdate'
            },
            depDateTo: {
              expression: '[positionID.parentUnitID.mi_dateTo] = [positionID.parentUnitID.mi_maxDateTo]',
              condition: 'custom'
            },
            depState: {
              expression: '[positionID.parentUnitID.state]',
              condition: '=',
              value: 'ACTIVE'
            },
            depDateDelete: {
              expression: '[positionID.parentUnitID.mi_deleteDate]',
              condition: '=',
              value: '#maxdate'
            }
          },
          orderList: {
            empName: {
              expression: '[employeeID.fullFIO]',
              order: 'asc'
            }
          }
        }]
      }
    })
  }
}

function exportToXLSX () {
  if (!paramRep) {
    AC.viewUtils.showToast(UB.i18n('Увага'), UB.i18n('Не сформовано звіт'))
    return
  }
  HR.reportUtils.runExcelReport('form1k.xlsx', paramRep)
}
