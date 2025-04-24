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

    let empPosData
    let employeeIDs = []
    let employeeNumberIDs = []
    if (empPosIDs.length) {
      const ids = _.chunk(empPosIDs, 1000)
      empPosData = []
      for (let i = 0; i < ids.length; i++) {
        const data = await getEmployeeNumberPromise(AC.dateService.addDays(dateFromSql, -1))
          .attrs(['ID', 'employeePositionID.positionID', 'employeePositionID', 'dateFrom', 'dateTo',
            'employeePositionID.positionID.dictPositionID', 'mi_deleteDate', 'dictStaffCatID', // 'dictStaffCatName',
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
          'employeePositionID.positionID.dictPositionID', 'mi_deleteDate', 'dictStaffCatID', // 'dictStaffCatName',
          'employeePositionID.positionID.positionCategory', 'employeePositionID.positionID.dictPositionID.positionCategory',
          'employeeID', 'employeeID.birthDate', 'employeeID.sexType'])
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

    HR.reportUtils.addAgeCol(empPosData, dateTo)

    empPosData.forEach(empPosItem => {
      empPosItem.dateFrom = AC.dateService.unshiftDate(empPosItem.dateFrom)
      empPosItem.dateTo = AC.dateService.unshiftDate(empPosItem.dateTo)
    })
    // HR.reportUtils.addAgeCol(empPosData, onDate)

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

    let empAcceptInPeriodData = [] // принятые в период
    let empAcceptData = []
    let empDismPosData = [] // уволенные в период
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
          .attrs(['employeeID', 'dictReasonDismID'])
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
          .attrs(['employeeID', 'dictReasonDismID'])
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
        .attrs(['employeeID', 'dictReasonDismID'])
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
        .attrs(['employeeID', 'dictReasonDismID'])
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

    const dictCategory = await UB.Repository('hr_dictStaffCat')
      .attrs(['ID', 'name', 'code'])
      .orderBy('code')
      .selectAsObject() || []
    dictCategory.push({
      ID: -1,
      name: UB.i18n('Не визначено'),
      code: ''
    })

    cellIDs = {}
    paramRep = {
      onDate: onDate.toString(),
      orgName: orgName,
      withChildOrgsText: withChildOrgsText,
      onDepsText: depID ? onDepsText : '',
      onDepsHtml: depID ? '<br/>' + onDepsText : '',
      dateFrom: AC.dateService.formatDate(dateFrom),
      dateTo: AC.dateService.formatDate(dateTo),
      rows: [],
      colNums: [],
      tableWidth: 1160,
      colCount: 12
    }

    let ids = _.uniq(_.compact(empAppointData.map(el => el.dictAppointKindID)))
    paramRep.appNames = ids ? await UB.Repository('hr_dictAppointKind')
      .attrs(['ID', 'name', 'code'])
      .where('ID', 'in', ids)
      .orderBy('code')
      .selectAsObject() : []
    ids = _.uniq(_.compact(empDismData.map(el => el.dictReasonDismID)))
    paramRep.dismNames = await UB.Repository('hr_dictReasonDism')
      .attrs(['ID', 'name', 'code'])
      .where('ID', 'in', ids)
      .orderBy('code')
      .selectAsObject()
    paramRep.appCount = paramRep.appNames.length + 1
    paramRep.dismCount = paramRep.dismNames.length + 1
    paramRep.tableWidth += 90 * (paramRep.appCount + paramRep.dismCount)
    paramRep.colCount += paramRep.appCount + paramRep.dismCount
    paramRep.appWidth = 90 * paramRep.appCount
    paramRep.dismWidth = 90 * paramRep.dismCount

    for (let i = 1; i <= paramRep.colCount; i++) {
      paramRep.colNums.push({ name: i, border: i === 1 ? 'border-left: 1px solid; ' : '' })
    }

    function getObj (name, code, ID) {
      const aObj = {
        ID: ID,
        name: name,
        code: code || '',
        appValues: [],
        dismValues: []
      }
      for (let i = 3; i <= 14; i++) {
        aObj[`col${i}`] = 0
      }
      for (let i = 0; i < paramRep.appNames.length; i++) {
        aObj.appValues.push({ col131: 0, kindID: paramRep.appNames[i].ID })
      }
      for (let i = 0; i < paramRep.dismNames.length; i++) {
        aObj.dismValues.push({ col141: 0, kindID: paramRep.dismNames[i].ID })
      }
      return aObj
    }

    empAcceptData = empAcceptData.length ? _.groupBy(empAcceptData, 'dictStaffCatID') : {}
    empAcceptInPeriodData = empAcceptInPeriodData.length ? _.groupBy(empAcceptInPeriodData, 'dictStaffCatID') : {}
    empDismPosData = empDismPosData.length ? _.groupBy(empDismPosData, 'dictStaffCatID') : {}

    _.forEach(empAcceptData, items => {
      const dictCategoryItem = dictCategory.find(e => e.ID === (items[0].dictStaffCatID || -1))
      const obj = getObj((dictCategoryItem ? dictCategoryItem.code : '') + ' ' + (dictCategoryItem ? dictCategoryItem.name : UB.i18n('Не визначено')), dictCategoryItem ? dictCategoryItem.code : '', dictCategoryItem ? dictCategoryItem.ID : -1)
      paramRep.rows.push(obj)
      obj.col3 = countData(items, items[0].dictStaffCatID || -1, 'col3')
      obj.col4 = countData(items.filter(itm => itm.age > 0 && itm.age < 35), items[0].dictStaffCatID || -1, 'col4')
      obj.col5 = countData(items.filter(itm => itm.age >= 35 && itm.age < 50), items[0].dictStaffCatID || -1, 'col5')
      obj.col6 = countData(items.filter(itm => itm.age >= 50), items[0].dictStaffCatID || -1, 'col6')
      obj.col7 = countData(items.filter(itm => itm.age >= 60 && itm.sex === 'W'), items[0].dictStaffCatID || -1, 'col7')
      obj.col8 = countData(items.filter(itm => itm.age >= 60 && itm.sex === 'M'), items[0].dictStaffCatID || -1, 'col8')
      obj.col9 = countData(items.filter(itm => employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['3', '4'].includes(edu.eduLevel)).length), items[0].dictStaffCatID || -1, 'col9')
      obj.col10 = countData(items.filter(itm => employeeEducation[itm.employeeID] && employeeEducation[itm.employeeID].filter(edu => ['1', '2'].includes(edu.eduLevel)).length), items[0].dictStaffCatID || -1, 'col10')
      obj.col11 = countData(items.filter(itm => itm.sex === 'W'), items[0].dictStaffCatID || -1, 'col11')
      obj.col12 = countData(items.filter(itm => empScienceData.find(sItem => sItem.employeeID === itm.employeeID)), items[0].dictStaffCatID || -1, 'col12')
    })

    _.forEach(empAcceptInPeriodData, items => {
      let obj = paramRep.rows.find(e => e.ID === (items[0].dictStaffCatID || -1))
      if (!obj) {
        const dictCategoryItem = dictCategory.find(e => e.ID === (items[0].dictStaffCatID || -1))
        obj = getObj((dictCategoryItem ? dictCategoryItem.code : '') + ' ' + (dictCategoryItem ? dictCategoryItem.name : UB.i18n('Не визначено')), dictCategoryItem ? dictCategoryItem.code : '', dictCategoryItem ? dictCategoryItem.ID : -1)
        paramRep.rows.push(obj)
      }
      obj.col13 = countData(items.filter(itm => empAppointData.find(wbItem => wbItem.employeeID === itm.employeeID)), obj.ID, 'col13')
      // obj.col13 = countData(items.filter(itm => empWorkbookAppoint.find(wbItem => wbItem.employeeID === itm.employeeID)), obj.ID, 'col13')
      for (let i = 0; i < paramRep.appNames.length; i++) {
        obj.appValues[i].col131 = countData(items.filter(itm => empAppointData.find(apntItem => apntItem.employeeID === itm.employeeID && paramRep.appNames[i].ID === apntItem.dictAppointKindID)), obj.ID, 'col13', paramRep.appNames[i].ID)
      }
    })

    _.forEach(empDismPosData, items => {
      let obj = paramRep.rows.find(e => e.ID === (items[0].dictStaffCatID || -1))
      if (!obj) {
        const dictCategoryItem = dictCategory.find(e => e.ID === (items[0].dictStaffCatID || -1))
        obj = getObj((dictCategoryItem ? dictCategoryItem.code : '') + ' ' + (dictCategoryItem ? dictCategoryItem.name : UB.i18n('Не визначено')), dictCategoryItem ? dictCategoryItem.code : '', dictCategoryItem ? dictCategoryItem.ID : -1)
        paramRep.rows.push(obj)
      }
      obj.col14 = countData(items.filter(itm => empDismData.find(wbItem => wbItem.employeeID === itm.employeeID)), obj.ID, 'col14')
      // obj.col14 = countData(items.filter(itm => empWorkbookDism.find(wbItem => wbItem.employeeID === itm.employeeID)), obj.ID,'col14')
      for (let i = 0; i < paramRep.dismNames.length; i++) {
        obj.dismValues[i].col141 = countData(items.filter(itm => empDismData.find(dismItem => dismItem.employeeID === itm.employeeID && paramRep.dismNames[i].ID === dismItem.dictReasonDismID)), obj.ID, 'col14', paramRep.dismNames[i].ID)
      }
    })

    paramRep.rows = paramRep.rows.sort((a, b) => {
      let res = 0
      if (a.ID === -1) {
        res = 1
      } else if (b.ID === -1) {
        res = -1
      } else {
        res = a.code < b.code ? -1 : a.code > b.code ? 1 : 0
      }
      return res
    })
    const totalObj = getObj('Всього працівників', '', -2)
    totalObj.bold = 'font-weight: bold;'
    paramRep.rows.forEach((obj, npp) => {
      obj.npp = npp + 1
      for (let i = 3; i <= 14; i++) {
        totalObj[`col${i}`] += obj[`col${i}`]
      }
      for (let i = 0; i < totalObj.appValues.length; i++) {
        totalObj.appValues[i].col131 += obj.appValues[i].col131
      }
      for (let i = 0; i < totalObj.dismValues.length; i++) {
        totalObj.dismValues[i].col141 += obj.dismValues[i].col141
      }
    })
    paramRep.rows.push(totalObj)

    return paramRep
  },
  onReportClick: function (e) {
    const cellInfo = UBS.UBReport.cellInfo(e)
    if (cellInfo.cell.innerText === '0') {
      $App.dialogInfo(UB.i18n('Працівники відсутні'))
    } else {
      const catid = cellInfo.row.dataset.catid ? parseInt(cellInfo.row.dataset.catid, 10) : -1
      drillDown(catid, cellInfo.row.dataset.catname || '', e.target.dataset['cellcode'], cellInfo.colIndex, e.target.dataset['kindid'])
    }
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
                      /*
                      store.on('load', () => {
                        const reportViewer = this.up('form').ownerCt
                        reportViewer.exportToXLSX = exportToXLSX
                      })
                       */
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

function countData (items, dictStaffCatID, cellCode, kindID) {
  const cnt = items.length
  if (cnt) {
    let IDs = cellIDs[`${cellCode}_${dictStaffCatID}${kindID ? '_' + kindID : ''}`] = []
    let totalsIDs
    if (cellIDs[`${cellCode}_${-2}${kindID ? '_' + kindID : ''}`]) {
      totalsIDs = cellIDs[`${cellCode}_${-2}${kindID ? '_' + kindID : ''}`]
    } else {
      totalsIDs = cellIDs[`${cellCode}_${-2}${kindID ? '_' + kindID : ''}`] = []
    }
    items.forEach(itm => {
      IDs.push(itm.ID)
      totalsIDs.push(itm.ID)
    })
  }
  return cnt
}

function drillDown (id, name, cellCode, colIndex, kindID) {
  let windowTitle = UB.i18n('Форма 1-к') + (name ? ', ' + name : '')
  if (colIndex > 2) {
    windowTitle += `, ${UB.i18n('колонка')} ${colIndex + 1}`
  }

  const cell = `${cellCode}_${id}${kindID ? '_' + kindID : ''}`
  const IDs = cellIDs[cell] && cellIDs[cell].length > 0 ? cellIDs[cell] : [0]
  const fieldList = [
    // { name: 'ID', description: 'ID'},
    { name: 'employeeNumberID.tabNum', description: UB.i18n('Таб. №'), config: { align: 'center', width: 100 } },
    { name: 'employeeID.fullFIO', description: UB.i18n('ПІБ'), config: { width: 250 } },
    { name: 'posName', description: UB.i18n('Посада'), config: { width: 250 } },
    { name: 'depName', description: UB.i18n('Підрозділ'), config: { width: 250 } },
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
