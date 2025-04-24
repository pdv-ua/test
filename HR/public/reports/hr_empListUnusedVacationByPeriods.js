/* global $App AC UB HR _ */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    const onDate4Sql = AC.dateService.shiftDate(reportParams.dateFrom)
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID)
    let result = {
      showAddDescrPerson,
      useActualPositionName,
      colSpan: 7 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0),
      tableWidth: 1290 + (showAddDescrPerson ? 150 : 0) + (useActualPositionName ? 200 : 0),
      orgUnits: [],
      positionCategory: '',
      onDate: AC.dateService.getStringFormatDate(reportParams.dateFrom, '', '', UB.i18n(' р.'))
    }
    reportParams.includeChildOrgs = reportParams.departmentID ? false : reportParams.includeChildOrgs

    const orgs = await HR.orgStructReportUtils.getOrganizationData(onDate4Sql, reportParams.organizationID, reportParams.includeChildOrgs)
    const childOrgIDs = orgs.map(itm => itm.mi_data_id)
    const orgNames = _.find(orgs, { 'mi_data_id': reportParams.organizationID })
    result.organizationName = orgNames ? HR.nameCase.cap(orgNames.name || '') : ''

    result.departmentName = reportParams.departmentID ? await UB.Repository('hr_department')
      .attrs(['name'])
      .where('mi_data_id', '=', reportParams.departmentID)
      .where('orgID', '=', reportParams.organizationID)
      .where('state', '=', 'ACTIVE')
      .where('mi_deleteDate', '>=', '#maxdate')
      .misc({ __mip_ondate: onDate4Sql })
      .selectScalar() : ''

    const vacationKind = reportParams.vacKindID ? await UB.Repository('hr_dictVacationKind')
      .attrs(['name'])
      .where('ID', 'in', reportParams.vacKindID.split(','))
      .misc({ __mip_ondate: onDate4Sql })
      .selectAsObject() : null

    const dictStaffCat = reportParams.dictStaffCatID ? await UB.Repository('hr_dictStaffCat')
      .attrs(['name'])
      .where('ID', '=', reportParams.dictStaffCatID)
      .selectAsObject() : null

    result.vacationKind = vacationKind ? UB.i18n(`Вид відпустки: {0}`, vacationKind.map(el => el.name).join(', ')) : ''
    result.positionType = reportParams.positionType ? UB.i18n(`Тип посади: {0}`, UB.core.UBEnumManager.getStore('HR_POSITION_TYPE').getById(reportParams.positionType).get('name') || '') : ''
    result.psCategory = reportParams.psCategory ? UB.i18n(`Категорія: {0}`, UB.core.UBEnumManager.getStore('HR_POSITION_PSCATEGORY').getById(reportParams.psCategory).get('name') || '') : ''
    result.workPlace = reportParams.workPlace ? UB.i18n(`Місце роботи: {0}`, UB.core.UBEnumManager.getStore('HR_WORKER_PLACE').getById(reportParams.workPlace).get('name') || '') : ''
    result.dictStaffCat = dictStaffCat ? UB.i18n(`Категорія персоналу: {0}`, dictStaffCat[0].name || '') : ''

    if (reportParams.catChiefs && !reportParams.catOthers) {
      result.positionCategory = UB.i18n(`Категорія: Керівники`)
    } else if (!reportParams.catChiefs && reportParams.catOthers) {
      result.positionCategory = UB.i18n(`Категорія: Інші`)
    }

    const fieldList = ['posName', 'posID', 'tabNum', 'fullFIO', 'dayRest', 'dayToUse', 'periodValue', 'lossDate', 'depID', 'organizationID']
    if (showAddDescrPerson) fieldList.push('addDescrPerson')
    if (useActualPositionName) fieldList.push('actualPositionName')
    const empVacData = await $App.connection.run({
      entity: 'hr_empListUnusedVacation',
      method: 'search',
      fieldList: fieldList,
      organizationID: reportParams.organizationID,
      includeChildOrgs: reportParams.includeChildOrgs,
      departmentID: reportParams.departmentID,
      includeChildDepts: reportParams.includeChildDepts,
      dateFrom: reportParams.dateFrom,
      vacKindID: reportParams.vacKindID,
      catChiefs: reportParams.catChiefs,
      catOthers: reportParams.catOthers,
      workPlace: reportParams.workPlace,
      showDetails: true
    })
    let empData = UB.LocalDataStore.selectResultToArrayOfObjects(empVacData)
    if (empData && empData.length && !reportParams.showOverUsedVac) {
      empData = empData.filter(el => (el.dayRest || 0) > 0)
    }

    if (!empData || empData.length === 0) {
      return result
    }

    const orgStruct = await HR.orgStructReportUtils.getStaffUnitData(onDate4Sql, childOrgIDs, reportParams.departmentID, reportParams.includeChildDepts, [], false)
    if (!orgStruct) {
      return result
    }
    let flr = empData.filter(el => !orgStruct.map(e => e.mi_data_id).includes(el.posID))
    flr.forEach(el => {
      el.posID = null
    })

    flr = empData.filter(el => el.depID && !orgStruct.map(e => e.parentUnitID).includes(el.depID))
    flr.forEach(el => {
      el.depID = el.organizationID
    })
    const tree = me.generateData(orgs, reportParams.departmentID || reportParams.organizationID, orgStruct, empData, result.colSpan, showAddDescrPerson, useActualPositionName)
    result.data = tree && tree.data ? tree.data : []

    return result
  },
  generateData: function (orgs, itemID, orgStruct, empVac, colSpan, showAddDescrPerson, useActualPositionName) {
    if (!orgStruct || !orgStruct.length) return {}

    function getData (orgID, parentID, level = 1) {
      const result = {
        data: []
      }

      const curStruct = orgStruct.filter(el => el.parentUnitID === parentID && el.orgID === orgID)
      const str = level === 1 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)
      const styleBegin = level === 1 ? '<font color="blue">' : level === 2 ? '<u>' : ''
      const styleEnd = level === 1 ? '</font>' : level === 2 ? '</u>' : ''

      curStruct.forEach(orgItem => {
        if (orgItem.mi_unityEntity !== 'hr_position') {
          const obj = {
            colSpan,
            showAddDescrPerson,
            useActualPositionName,
            isDepartment: true,
            textAlign: 'left',
            name: `${str}${styleBegin}${orgItem.code ? orgItem.code + ' ' : ''}${level === 1 ? (orgItem.name || '').toUpperCase() : HR.nameCase.cap(orgItem.name || '')}${styleEnd}`
          }

          const subTree = getData(orgID, orgItem.mi_data_id, level + 1)
          const subTreeHasData = (subTree.data && subTree.data.length)
          if (subTree && subTreeHasData) {
            result.data.push(obj)
            subTreeHasData && result.data.push(...subTree.data)
          }
        } else {
          const empItems = empVac.filter(el => el.posID === orgItem.mi_data_id)
          _.forEach(empItems, item => {
            const obj = {
              colSpan,
              showAddDescrPerson,
              useActualPositionName,
              isDepartment: false,
              textAlign: 'left',
              posName: item.posName,
              empName: item.fullFIO,
              tabNum: item.tabNum,
              dayRest: item.dayRest || 0,
              dayToUse: item.dayToUse || 0,
              addDescrPerson: item.addDescrPerson || '',
              actualPositionName: item.actualPositionName || '',
              periodValue: item.periodValue || '',
              lossVacation: item.lossDate ? AC.dateService.formatDate(item.lossDate, 'mmmm yyyy') : ''
            }
            result.data.push(obj)
          })
        }
      })
      const empItems = empVac.filter(el => !el.posID && el.depID === parentID)
      _.forEach(empItems, item => {
        const obj = {
          colSpan,
          showAddDescrPerson,
          useActualPositionName,
          isDepartment: false,
          textAlign: 'left',
          posName: item.posName,
          empName: item.fullFIO,
          tabNum: item.tabNum,
          dayRest: item.dayRest || 0,
          dayToUse: item.dayToUse || 0,
          addDescrPerson: item.addDescrPerson || '',
          actualPositionName: item.actualPositionName || '',
          periodValue: item.periodValue || '',
          lossVacation: item.lossDate ? AC.dateService.formatDate(item.lossDate, 'mmmm yyyy') : ''
        }
        result.data.push(obj)
      })

      return result
    }

    const orgTree = {
      data: []
    }

    for (let i = 0; i < orgs.length; i++) {
      const aTree = getData(orgs[i].mi_data_id, i === 0 ? itemID : orgs[i].mi_data_id, 1)
      if (aTree && aTree.data && aTree.data.length) {
        if (orgs.length > 1) {
          const title = {
            colSpan,
            showAddDescrPerson,
            useActualPositionName,
            textAlign: 'center',
            name: `<font color="blue">${orgs[i].name}</font>`,
            isDepartment: true
          }
          orgTree.data.push(title)
        }
        orgTree.data.push(...aTree.data)
      }
    }

    return orgTree || {}
  }
}
