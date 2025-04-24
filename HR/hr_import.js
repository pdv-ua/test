const UB = require('@unitybase/ub')
const moment = require('moment')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const impModule = require('../AC/modules/importData/types/emp.js')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const me = global[__entityName]

me.entity.addMethod('loadOrgStructure')
me.entity.addMethod('fakeRefresh')
me.entity.addMethod('makeAppointOrder')
me.entity.addMethod('getProgress')
me.entity.addMethod('addVacancyPeriodMain')
me.entity.addMethod('addVacancyPeriodGov')
me.entity.addMethod('addVacancyPeriod')
me.entity.addMethod('updateVacation')
me.entity.addMethod('updateTabNumber')
me.entity.addMethod('updateWorkbook')
me.entity.addMethod('createServiceOrderAppoint')
me.entity.addMethod('deleteServiceOrderAppoint')
me.entity.addMethod('fixExperience')
me.entity.addMethod('setNotUpdateExisting')

me.setNotUpdateExisting = function (ctx) {
  const mParams = ctx.mParams
  const filterParams = JSON.parse(mParams.filterParams)
  const employee = mParams.employee ? JSON.parse(mParams.employee) : mParams.employee
  let data
  if (!employee) {
    const bulder = UB.Repository('hr_employee').attrs(['ID'])
    filterParams.forEach(filter => {
      bulder.where(filter.expression, filter.condition, filter.value)
    })

    data = bulder.selectAsObject()
  }
  const employeeIDs = employee || data.map(o => o.ID)
  if (employeeIDs) {
    const store = UB.DataStore('hr_employee')
    store.execSQL(`update hr_employee set impIsNotUpdateExisting = :impIsNotUpdateExisting: where ID
    ${entityBaseService.getInExpression('employeeIDs')}`,
    { impIsNotUpdateExisting: mParams.impIsNotUpdateExisting ? 1 : 0, employeeIDs })
  }
  ctx.mParams.message = 'Оновлено записів: ' + employeeIDs.length
}
me.fixExperience = function (ctx) {
  const dateFixExperience = new Date()
  const onDate = dateService.shiftDate(dateFixExperience)
  const impSourceID = ctx.mParams.organizationID
  const organizationName = ctx.mParams.organizationName

  if (!impSourceID) {
    return
  }
  const respEmployeeFIO = UB.Repository('hr_employeeNumberS')
    .attrs('description')
    .where('ID', '=', UB.Session.uData.employeeNumberID)
    .selectScalar() || ''

  //  [{"ID":3000000122305,"name":"Загальний стаж","employeeID":3000000134152,"employeeExperienceID":3000003136343,"onDate":"2020-01-22T22:00:00.000Z","calcDate":"2014-10-16T00:00:00.000Z","years":5,"months":3,"days":8},
  //  {"ID":3000000122314,"name":"Страховий стаж","employeeID":3000000134152,"employeeExperienceID":3000003136345,"onDate":"2020-01-22T22:00:00.000Z","calcDate":"2017-10-16T00:00:00.000Z","years":2,"months":3,"days":8},
  //  {"ID":3000000122320,"name":"Стаж державної служби","employeeID":3000000134152,"employeeExperienceID":3000003136347,"onDate":"2020-01-22T22:00:00.000Z","calcDate":"2017-11-26T00:00:00.000Z","years":2,"months":1,"days":29}]
  let employeeIDs = UB.Repository('ac_employeeOrg')
    .attrs('employeeID')
    .where('organizationID', '=', impSourceID)
    .selectAsObject()
  let exp = UB.Repository('hr_employeeExperience')
    .attrs(['ID', 'calcDate', 'employeeID', 'dictExperienceID.name', 'dictExperienceID'])
    // .where('impSourceID', '=', impSourceID)
    .where('employeeID', 'in', employeeIDs.map(o => o.employeeID))
    .orderBy('employeeID')
    .selectAsObject()
  let employeeCount = 0
  if (exp.length) {
    let fixStore = UB.DataStore('hr_employeeExperienceFix')
    employeeCount = 1
    let currEmployeeID = exp[0].employeeID
    let descriptionExperience = []
    exp.forEach(item => {
      let exp
      if (item.employeeID !== currEmployeeID) {
        employeeCount++
        fixStore.run('insert', {
          execParams: {
            employeeID: currEmployeeID,
            dateFixExperience: dateFixExperience,
            expOnDate: onDate,
            orderFixExperienceNum: null,
            orderFixExperienceDate: null,
            comment: 'Зафіксовано під час міграції',
            reason: 'Зафіксовано під час міграції',
            reasonDoc: '',
            descriptionExperience: JSON.stringify(descriptionExperience),
            respEmployeeNumID: UB.Session.uData.employeeNumberID,
            respEmployeeFIO: respEmployeeFIO,
            organizationID: impSourceID,
            organizationName: organizationName
          }
        })
        currEmployeeID = item.employeeID
        descriptionExperience = []
      }
      exp = dateService.getYmd(dateService.shiftDate(item.calcDate), onDate, true)
      exp.ID = item.dictExperienceID
      exp.name = item['dictExperienceID.name']
      exp.employeeID = currEmployeeID
      exp.onDate = onDate
      exp.calcDate = item.calcDate
      exp.employeeExperienceID = item.ID
      descriptionExperience.push(exp)
    })
    if (descriptionExperience.length) {
      fixStore.run('insert', {
        execParams: {
          employeeID: currEmployeeID,
          dateFixExperience: dateFixExperience,
          expOnDate: onDate,
          orderFixExperienceNum: null,
          orderFixExperienceDate: null,
          comment: 'Зафіксовано під час міграції',
          reason: 'Зафіксовано під час міграції',
          reasonDoc: '',
          descriptionExperience: JSON.stringify(descriptionExperience),
          respEmployeeNumID: UB.Session.uData.employeeNumberID,
          respEmployeeFIO: respEmployeeFIO,
          organizationID: impSourceID,
          organizationName: organizationName
        }
      })
    }
  }

  ctx.mParams.count = exp.length
  ctx.mParams.employeeCount = employeeCount
}

me.updateTabNumber = function (ctx) {
  const data = UB.Repository('hr_employeeWorkbook').attrs('employeeID', 'max([dateFrom])', 'organizationID')
    .where('isOrgAppoint', '=', true)
    .where('impSourceID', 'isNotNull')
    .groupBy(['employeeID', 'organizationID'])
    .orderBy('organizationID')
    .orderBy('employeeID')
    .selectAsObject({
      'max([dateFrom])': 'dateFrom'
    })
  if (!data.length) {
    return
  }
  let updateSql = []
  const store = UB.DataStore('hr_employeeNumber')
  data.forEach((item, i) => {
    let tabNumID = UB.Repository('hr_employeeNumberS').attrs('ID')
      .where('orgID', '=', item.organizationID)
      .where('dateFrom', '>', item.dateFrom)
      .where('employeeID', '=', item.employeeID)
      .selectScalar()
    if (tabNumID) {
      updateSql.push(`update hr_employeeNumber set dateFrom = '${moment(item.dateFrom).format('YYYY-MM-DD')}' where ID = ${tabNumID}`)
    }
    if (updateSql.length >= 100) {
      store.execSQL(updateSql.join('\r\n'), {})
      // console.log(updateSql.join('\r\n'))
      updateSql = []
    }
  })
  if (updateSql.length) {
    // console.log(updateSql.join('\r\n'))
    store.execSQL(updateSql.join('\r\n'), {})
  }
}

me.updateWorkbook = function (ctx) {
  let data = UB.Repository('hr_employeeWorkbook').attrs(['ID', 'employeeID', 'dateFrom', 'dateTo', 'organizationID'])
    // .where('impSourceID', 'isNotNull')
    .exists(
      UB.Repository('hr_employeeWorkbook')
        .correlation('employeeID', 'employeeID')
        // .where('impSourceID', 'isNotNull')
        .where('mi_deleteDate', '>=', '#maxdate')
        .where('organizationID', 'isNotNull')
    )
    .orderBy('employeeID')
    .orderBy('dateFrom')
  if (ctx.mParams.organizationID) {
    data = data.where('organizationID', '=', ctx.mParams.organizationID)
  }
  data = data.selectAsObject()
  if (!data.length) {
    return
  }
  let updateSql = []
  const store = UB.DataStore('hr_employeeWorkbook')
  data.forEach((item, i) => {
    let execParams = { ID: item.ID }
    let dateToYear = new Date(item.dateTo).getFullYear()
    let prevRow = (data[i - 1] && data[i - 1].employeeID === item.employeeID) ? data[i - 1] : null
    let nextRow = (data[i + 1] && data[i + 1].employeeID === item.employeeID) ? data[i + 1] : null
    execParams.isOrgAppoint = !item.organizationID ? 0 : (!prevRow || prevRow.organizationID !== item.organizationID)
    execParams.isOrgDismiss = !item.organizationID ? 0 : ((!nextRow || nextRow.organizationID !== item.organizationID) && dateToYear !== 9999)
    updateSql.push(`update hr_employeeWorkbook set isOrgAppoint = ${execParams.isOrgAppoint ? 1 : 0}, isOrgDismiss = ${execParams.isOrgDismiss ? 1 : 0} where ID = ${execParams.ID}`)
    if (updateSql.length >= 100) {
      store.execSQL(updateSql.join('\r\n'), {})
      updateSql = []
    }
  })
  if (updateSql.length) {
    store.execSQL(updateSql.join('\r\n'), {})
  }
}

me.updateVacation = function (ctx) {
  const checkDate = dateService.shiftDate(new Date(2016, 4, 1))
  const impSourceID = ctx.mParams.organizationID
  if (!impSourceID) {
    return
  }
  function getDayCount (dateFrom, expYears) {
    const checkYears = [
      // eslint-disable-next-line no-irregular-whitespace
      { /* якщо період відпустки від '01.05.2017' до '01.05.2018' та стаж на початок періоду =16 то кількість днів відпустки 13 */
        startYear: 2017,
        endYear: 2018,
        expYears: 16,
        dayCount: 13
      },
      // eslint-disable-next-line no-irregular-whitespace
      { // інакше якщо період відпустки від '01.05.2016' до '01.05.2017' та  стаж на початок періоду = 15 то кількість днів відпустки 13
        startYear: 2016,
        endYear: 2017,
        expYears: 15,
        dayCount: 13
      },
      // eslint-disable-next-line no-irregular-whitespace
      { // інакше якщо період відпустки від '01.05.2016' до '01.05.2017' та  стаж на початок періоду = 14 то кількість днів відпустки 11
        startYear: 2016,
        endYear: 2017,
        expYears: 14,
        dayCount: 11
      },
      // eslint-disable-next-line no-irregular-whitespace
      { // інакше якщо період відпустки від '01.05.2016' до '01.05.2017' та  стаж на початок періоду = 16 то кількість днів відпустки 15
        startYear: 2016,
        endYear: 2017,
        expYears: 16,
        dayCount: 15
      },
      // eslint-disable-next-line no-irregular-whitespace
      { // інакше якщо період відпустки від '01.05.2016' до '01.05.2018' та  стаж на початок періоду  = 17,  то кількість днів відпустки 15
        startYear: 2016,
        endYear: 2018,
        expYears: 17,
        dayCount: 15
      },
      // eslint-disable-next-line no-irregular-whitespace
      { // інакше якщо період відпустки від '01.05.2016' до '01.05.2018' та  стаж на початок періоду  = 18,  то кількість днів відпустки 15
        startYear: 2016,
        endYear: 2018,
        expYears: 18,
        dayCount: 15
      },
      // eslint-disable-next-line no-irregular-whitespace
      { // інакше якщо період відпустки від '01.05.2018' до '01.05.2019' та  стаж на початок періоду = 18 то кількість днів відпустки 15
        startYear: 2018,
        endYear: 2019,
        expYears: 18,
        dayCount: 15
      }
    ]
    let aDateFrom = dateService.shiftDate(dateFrom)
    let result = 0
    if (aDateFrom < checkDate) {
      result = expYears < 10 ? 0
        : expYears === 10 ? 5
          : expYears === 11 ? 7
            : expYears === 12 ? 9
              : expYears === 13 ? 11
                : expYears === 14 ? 13
                  : expYears >= 15 ? 15 : 0
    } else
    if (expYears >= 5 && expYears < 40) {
      result = Math.min(expYears - 4, 15)
    }
    for (let i = 0, len = checkYears.length; i < len; i++) {
      const item = checkYears[i]
      const sDate = dateService.shiftDate(new Date(item.startYear, 4, 1))
      const eDate = dateService.shiftDate(new Date(item.endYear, 4, 1))
      if (aDateFrom >= sDate && aDateFrom <= eDate && expYears === item.expYears) {
        return item.dayCount
      }
    }
    return result
  }
  /*
  const impSourceID = UB.Repository('hr_organization')
    .attrs('mi_data_id')
    .where('EDRPOUCode', '=', '00013480')
    .selectScalar()
  if (!impSourceID) {
    return
  }
*/
  const data = UB.Repository('hr_empVacationPeriod')
    .attrs('ID', 'dayCountPlan', 'dateFrom', 'dateTo', 'empVacationPlanID.employeeID', 'empVacationPlanID.employeeNumberID')
    .where('impSourceID', '=', impSourceID)
    .where('impDictVacationKindName', 'isNull')
    .where('[mi_modifyDate]=[mi_createDate]', 'custom')
    .where('empVacationPlanID.dictVacationKindID.code', '=', 'dState')
    .orderBy('empVacationPlanID.employeeID')
    .orderBy('dateFrom')
    .selectAsObject({
      'empVacationPlanID.employeeID': 'employeeID'
    })
  let expData = UB.Repository('hr_employeeExperience')
    .attrs(['employeeID.impSourceID', 'employeeID', 'calcDate', 'startCalcDate'])
    .where('dictExperienceID.code', '=', '6')
    .where('employeeID.impSourceID', '=', impSourceID)
    .selectAsObject()
  let store = UB.DataStore('hr_empVacationPeriod')
  data.forEach((item, i) => {
    let expItem = expData.find(e => e.employeeID === item.employeeID)
    if (!expItem) {
      return
    }
    let calcDate = new Date(expItem.calcDate)
    let expYears = dateService.yearsDiff(calcDate, item.dateFrom)
    let dayCountPlan = getDayCount(item.dateFrom, expYears)
    let prevRow = data[i - 1]
    if (prevRow && prevRow.employeeID === item.employeeID) {
      if (prevRow.dayCountPlan > dayCountPlan) {
        dayCountPlan = prevRow.dayCountPlan
      }
    }
    if (dayCountPlan !== item.dayCountPlan) {
      store.run('update', {
        __skipOptimisticLock: true,
        __skipSelectAfterUpdate: true,
        execParams: {
          ID: item.ID,
          dayCountPlan: dayCountPlan
        }
      })
      console.log(`********************** Update Vacancies Day Count ****** ${item.dayCountPlan}->${dayCountPlan}`)
      item.dayCountPlan = dayCountPlan
    }
  })
}

me.createServiceOrderAppoint = ctx => {
  /*
    update hr_employeePosition set orderID = (select max(ID) from hr_orderPay) where orderID in (select id from hr_employeePosition)
  delete from hr_employeeWorkbookDt where employeeWorkbookID in (select id from hr_employeePosition)
  delete from hr_employeeWorkbook where ID in (select id from hr_employeePosition)
  delete from hr_attachEntity where ID in (select id from hr_employeePosition)
  delete from hr_empOrderAppointDet where orderID in (select id from hr_employeePosition)
  delete from hr_employeeOrder where orderID in (select id from hr_employeePosition)
  update dbo.hr_empVacationPlan set orderDetID = null where orderDetID in (select id from hr_employeePosition)
  delete from hr_empOrderDet where orderID in (select id from hr_employeePosition)
  delete from hr_order where id in (select id from hr_employeePosition)
  delete from hr_empOrder where isService = 1

 */
  const mParams = ctx.mParams
  /* if (UB.Repository('hr_empOrder').attrs('ID').where('isService', '=', 1).where('organizationID', '=', mParams.orgID).selectScalar()) {
    return
  } */
  let departments = null
  if (mParams.departmentID) {
    departments = UB.Repository('hr_department')
      .attrs(['mi_data_id'])
      .where('orgID', '=', mParams.orgID)
      .where('mi_treePath', 'like', `%/${mParams.departmentID}/%`)
      .where('state', '=', 'ACTIVE')
      .selectAsObject().map(o => o.mi_data_id)
  }
  let onDate = dateService.shiftDate(new Date())
  let store = UB.DataStore('hr_employeePosition')
  store.runSQL(`
    select ep.ID "ID" from hr_employeePosition ep
      left join hr_empOrder o on o.ID = ep.orderID   
      where ep.organizationID = :orgID: and ep.mi_deleteDate >= '9999-12-31' and ep.positionID is not null and ep.workPlace = '1' 
      and :onDate: BETWEEN ep.dateFrom AND ep.dateTo
      AND (o.isService <> 1 OR o.ID is null)
      ${departments ? ` AND ep.departmentID${entityBaseService.getInExpression('departments')}` : ''}
        AND ep.dateFrom = (SELECT MAX(dateFrom) FROM hr_employeePosition p WHERE p.employeeNumberID = ep.employeeNumberID AND p.positionID is not null 
          and p.workPlace = '1' and p.mi_deleteDate >= '9999-12-31' and p.organizationID = :orgID:)      
  `, { orgID: mParams.orgID, onDate: onDate, departments })
  const IDs = store.getAsJsObject().map(item => item.ID)
  let contractType = '1'
  let dictContractKindID = UB.Repository('hr_dictContractKind').attrs('ID').where('code', '=', '01').selectScalar()
  let orderClass = UB.Repository('hr_orderClass').attrs('ID').where('entityName', '=', 'hr_empOrder').select().get(0)
  let pos = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'organizationID', 'organizationID.name', 'departmentID', 'departmentID.name', 'positionID', 'positionID.name', 'positionID.psCategory.name', 'positionID.positionType',
      'employeeNumberID', 'employeeID', 'dateFrom', 'dateTo', 'workScheduleID', 'mtCount', 'dictStaffCatID', 'workPlace', 'accrualSum', 'payElID', 'employeeNumberID.tabNum',
      'employeeID.firstName', 'employeeID.lastName', 'employeeID.middleName', 'employeeID.fullFIO', 'employeeNumberID.dateFrom',
      'employeeNumberID.appointmentDate', 'employeeNumberID.appointmentOrderDate', 'employeeNumberID.appointmentOrderNumber'
    ])
    .joinCondition('organizationID.mi_dateFrom', '<=', onDate)
    .joinCondition('organizationID.mi_dateTo', '>=', onDate)
    .joinCondition('organizationID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('organizationID.state', '=', 'ACTIVE')
    .joinCondition('departmentID.mi_dateFrom', '<=', onDate)
    .joinCondition('departmentID.mi_dateTo', '>=', onDate)
    .joinCondition('departmentID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('departmentID.state', '=', 'ACTIVE')
    .joinCondition('positionID.mi_dateFrom', '<=', onDate)
    .joinCondition('positionID.mi_dateTo', '>=', onDate)
    .joinCondition('positionID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('positionID.state', '=', 'ACTIVE')

    .where('ID', 'in', IDs)
    .selectAsObject({
      'employeeID.firstName': 'firstName',
      'employeeID.lastName': 'lastName',
      'employeeID.middleName': 'middleName',
      'employeeID.fullFIO': 'fullFIO',
      'employeeNumberID.appointmentDate': 'appointmentDate',
      'employeeNumberID.appointmentOrderDate': 'appointmentOrderDate',
      'employeeNumberID.appointmentOrderNumber': 'appointmentOrderNumber'
    })
  store = UB.DataStore('hr_empOrder')
  let sqlHead = 'insert into hr_empOrder (ID, organizationID, masterOrganizationID, empOrderType, orderDate, orderNumber, orderNumberFull, entryDate, orderState, description, mi_modifyUser, mi_createUser, mi_owner, mi_modifyDate, mi_createDate, isService, orderClass) values ('
  let sql = []
  let orderCount = 0
  pos.forEach(item => {
    const orderNumber = item.appointmentOrderNumber ? item.appointmentOrderNumber.trim().replace(/'/g, '`') : (++orderCount).toString()
    const orderDate = moment(item.appointmentOrderDate || item.dateFrom).format('YYYY-MM-DD')
    item.orderDescription = UB.i18n(`Наказ про призначення № {0} від {1}`, orderNumber, moment(item.appointmentOrderDate || item.dateFrom).format('DD-MM-YYYY'))
    const sqlTail = `${item.ID}, ${item.organizationID}, ${item.organizationID}, 'APPOINT_MOVE', '${orderDate}', '${orderNumber}', '${orderNumber}', '${orderDate}', 'POSTED', '${item.orderDescription}', 10, 10, 10, current_timestamp, current_timestamp, 1,  ${orderClass});`
    sql.push(sqlHead + sqlTail)
    sql.push(`
    insert into hr_order (ID, organizationID, masterOrganizationID, orderNumber, orderDate, entryDate, orderState, description, orderClass, empOrderType)
    select ID, organizationID, masterOrganizationID, orderNumber, orderDate, entryDate, orderState, description, orderClass, empOrderType from hr_empOrder where ID = ${item.ID};
    `)
    if (sql.length >= 1000) {
      store.execSQL(sql.join('\r\n'), {})
      sql = []
    }
  })
  if (sql.length) {
    store.execSQL(sql.join('\r\n'), {})
    sql = []
  }

  store = UB.DataStore('hr_empOrderAppointDet')
  sqlHead = ` (ID, itemIdx, orderID, organizationID, departmentID, positionID, firstName, lastName, middleName, empOrderType, 
              description, title, 
              employeeID, employeeNumberID, employeePositionID,
              dateFrom, dateTo, 
              mi_modifyUser, mi_createUser, mi_owner, mi_modifyDate, mi_createDate, 
             `
  let sqlAppointHeadAppendix = `
        workScheduleID,
        mtCount,
        dictStaffCatID,
        workPlace,
        accrualSum,
        payElID,
        contractType,
        dictContractKindID,
        tabNum,
        isAppoint,
        isMove`
  pos.forEach(item => {
    let entity = 'insert into hr_empOrderDet'
    const descr = `${(item.departmentID ? item['departmentID.name'] : '')} ${item['positionID.name']}  ${item['employeeNumberID.tabNum']}`.trim().replace(/'/g, '`')
    let sqlTail = ` ${item.ID}, 1,  ${item.ID}, ${item.organizationID} , ${item.departmentID}, ${item.positionID}, '${item.firstName.replace(/'/g, '`')}', '${item.lastName.replace(/'/g, '`')}', '${(item.middleName || '').replace(/'/g, '`')}', 'APPOINT_MOVE', 
                      '${descr}', '${descr}',
                      ${item.employeeID}, ${item.employeeNumberID}, ${item.ID},
                      '${moment(item.dateFrom).format('YYYY-MM-DD')}', '${moment(item.dateTo).format('YYYY-MM-DD')}',
                      10, 10, 10, current_timestamp, current_timestamp,
                      `
    sql.push(entity + sqlHead + ' mi_unityEntity, isExternal, isGroup, paraID) values (' + sqlTail + `'hr_empOrderAppointDet', 0, 0, ${item.ID});`)
    sqlTail += `${item.workScheduleID}, ${item.mtCount || 1}, ${item.dictStaffCatID}, ${item.workPlace},${item.accrualSum},${item.payElID},'${contractType}',${dictContractKindID},'${item['employeeNumberID.tabNum']}', ${dateService.shiftDate(item.dateFrom).getTime() === dateService.shiftDate(item['employeeNumberID.dateFrom']).getTime() ? '1, 0' : '0, 1'} `
    entity = 'insert into hr_empOrderAppointDet'
    sql.push(entity + sqlHead + sqlAppointHeadAppendix + ') values (' + sqlTail + ');')

    sql.push(`insert into hr_employeeOrder (ID, orderID, employeeID, employeeNumberID, employeePositionID, mi_unityEntity, mi_owner, mi_createUser, mi_modifyUser, mi_createDate, mi_modifyDate)  values(
              ${item.ID}, ${item.ID}, ${item.employeeID}, ${item.employeeNumberID}, ${item.ID}, 'hr_empOrderAppointDet', 10, 10, 10, current_timestamp, current_timestamp);`)

    sql.push(`insert into hr_attachEntity (ID, entityName, mi_unityEntity, mi_owner, mi_createUser, mi_modifyUser, mi_createDate, mi_modifyDate)  values(
              ${item.ID}, 'hr_employeeWorkbook', 'hr_employeeWorkbook', 10, 10, 10, current_timestamp, current_timestamp);`)

    sql.push(`insert into hr_employeeWorkbook (ID, organizationID, workPlace, workPosition, dateFrom, dateTo, employeePositionID, employeeID, appointOrder, positionType, positionCategory, mi_owner, mi_createUser, mi_modifyUser, mi_createDate, mi_modifyDate, description)  values(
              ${item.ID}, ${item.organizationID}, '${item['organizationID.name'].replace(/'/g, '`')}', '${(item['positionID.name'] || '').replace(/'/g, '`')}',
              '${moment(item.appointmentDate || item.dateFrom).format('YYYY-MM-DD')}', '${moment(item.dateTo).format('YYYY-MM-DD')}', 
              ${item.ID}, ${item.employeeID}, '${item.orderDescription}', '${item['positionID.positionType']}', ${item['positionID.positionType'] === '1' ? `'${item['positionID.psCategory.name']}'` : 'null'},  
              10, 10, 10, current_timestamp, current_timestamp, 'Створення наказів призначення з даних ЗП');`)

    if (sql.length >= 1000) {
      store.execSQL(sql.join('\r\n'), {})
      sql = []
    }
  })
  if (sql.length) {
    store.execSQL(sql.join('\r\n'), {})
    sql = []
  }
  store.execSQL(`update hr_employeePosition set orderID = ID where ID in (select ID from hr_empOrder where isService = 1);`, {})
}

me.deleteServiceOrderAppoint = ctx => {
  const mParams = ctx.mParams
  const orderStore = UB.DataStore('hr_orderPay')
  const orderPayID = orderStore.generateID()
  orderStore.run('insert', {
    execParams: {
      ID: orderPayID,
      orderState: 'POSTED',
      empOrderType: 'APPOINT',
      entryDate: dateService.currentDate(),
      orderDate: dateService.currentDate(),
      description: 'Імпортовані дані'
    }
  })

  const empOrders = UB.Repository('hr_empOrder')
    .attrs('ID')
    .where('isService', '=', 1)
    .where('empOrderType', '=', 'APPOINT_MOVE')
    .where('organizationID', '=', mParams.orgID)
    .selectAsObject()

  const store = UB.DataStore('hr_empOrder')

  empOrders.forEach(order => {
    try {
      const empPos = UB.Repository('hr_employeePositionS')
        .attrs('ID')
        .where('orderID', '=', order.ID)
        .selectAsObject()
      empPos.forEach(pos => {
        store.execSQL(`update hr_employeePosition set orderID = :orderID: where ID = :ID:`, {
          orderID: orderPayID,
          ID: pos.ID
        })
      })
      store.execSQL(`DELETE FROM hr_employeeWorkbook WHERE ID = :ID:`, { ID: order.ID })
      store.execSQL(`DELETE FROM hr_attachEntity WHERE ID = :ID:`, { ID: order.ID })
      store.execSQL(`DELETE FROM hr_employeeOrder WHERE ID = :ID:`, { ID: order.ID })
      store.execSQL(`DELETE FROM hr_empOrderAppointDet WHERE orderID = :orderID:`, { orderID: order.ID })
      store.execSQL(`DELETE FROM hr_empOrderDet WHERE orderID = :orderID:`, { orderID: order.ID })
      store.execSQL(`DELETE FROM hr_empOrder WHERE ID = :ID:`, { ID: order.ID })
      store.execSQL(`DELETE FROM hr_order WHERE ID = :ID:`, { ID: order.ID })
    } catch (e) {
      console.log(e.message)
    }
  })
}

me.addVacancyPeriod = function (ctx) {
  ctx.mParams.countMain = me.addVacancyPeriodMain(ctx)
  ctx.mParams.countGov = me.addVacancyPeriodGov(ctx)
  me.updateVacation(ctx)
}

me.addVacancyPeriodMain = function (ctx) {
  let currYear = new Date().getFullYear()
  let vacKindID = UB.Repository('hr_dictVacationKind').attrs('ID').where('code', '=', 'dYear').selectScalar()
  ctx.mParams.count = 0

  let vacPlan = UB.Repository('hr_empVacationPlan').attrs('ID', 'dateFrom', 'dayCount', 'impSourceID', 'employeeID', 'impDateAppoint')
    .where('dictVacationKindID', '=', vacKindID)
    .where('impSourceID', '=', ctx.mParams.organizationID)
    .selectAsObject()
  vacPlan.forEach(planItem => {
    let lastRecord = UB.Repository('hr_empVacationPeriod').attrs('ID', 'dateFrom')
      .where('empVacationPlanID', '=', planItem.ID)
      .where('employeeID', '=', planItem.employeeID)
      .orderByDesc('dateFrom')
      .selectSingle()
    if (!lastRecord) {
      return
    }
    let dateFrom = dateService.shiftDate(new Date(lastRecord.dateFrom))
    dateFrom = dateService.addYears(dateFrom, 1)
    let dateLast = dateService.shiftDate(new Date(dateFrom))
    dateLast.setFullYear(currYear)
    while (dateFrom.getFullYear() <= dateLast.getFullYear()) {
      if (!UB.Repository('hr_empVacationPeriod').attrs('ID', 'dateFrom', 'dayCountPlan')
        .where('empVacationPlanID', '=', planItem.ID)
        .where('year([dateFrom]) = ' + dateFrom.getFullYear(), 'custom')
        .where('employeeID', '=', planItem.employeeID).selectSingle()) {
        let execParams = {
          empVacationPlanID: planItem.ID,
          dateFrom: dateFrom,
          dateTo: dateService.addDays(dateService.addYears(dateFrom, 1), -1),
          dayCountPlan: planItem.dayCount,
          impSourceID: planItem.impSourceID,
          employeeID: planItem.employeeID
        }
        UB.DataStore('hr_empVacationPeriod').run('insert', { execParams: execParams })
        ctx.mParams.count++
      }
      dateFrom = dateService.addYears(dateFrom, 1)
    }
  })
  return ctx.mParams.count
}
function getDayCount (dateFrom, expYears) {
  let getCheckDate = year => {
    return dateService.shiftDate(new Date(year, 4, 1))
  }
  let aDateFrom = dateService.shiftDate(dateFrom)
  if (aDateFrom < getCheckDate(2016)) {
    if (expYears < 10) {
      return 0
    }
    if (expYears >= 15) {
      return 15
    }
    return (expYears - 10) * 2 + 5
  } else if (aDateFrom < getCheckDate(2018) && expYears === 12) {
    return 9
  } else if (aDateFrom < getCheckDate(2019) && (expYears === 13 || expYears === 14)) {
    return 11
  } else if (aDateFrom < getCheckDate(2020) && (expYears === 14 || expYears === 15 || expYears === 16)) {
    return 13
  } else if (aDateFrom < getCheckDate(2021) && (expYears === 15 || expYears === 16 || expYears === 17 || expYears === 18)) {
    return 15
  }
  return (expYears >= 19) ? 15 : (expYears < 5 ? 0 : (expYears - 5 + 1))
}

me.addVacancyPeriodGov = function (ctx) {
  ctx.mParams.count = 0
  let currYear = new Date().getFullYear()
  let vacKindID = UB.Repository('hr_dictVacationKind').attrs('ID').where('code', '=', 'dState').selectScalar()
  let exp = UB.Repository('hr_employeeExperience')
    .attrs(['employeeID.impSourceID', 'employeeID', 'calcDate', 'startCalcDate'])
    .where('dictExperienceID.code', '=', '6')
    .where('impSourceID', '=', ctx.mParams.organizationID)
    .selectAsObject()
  exp.forEach(expItem => {
    let employeeID = expItem.employeeID
    let impSourceID = expItem['employeeID.impSourceID']
    let calcDate = new Date(expItem.calcDate)
    let dateFrom = dateService.shiftDate(dateService.addYears(calcDate, 5))
    let pos = UB.Repository('hr_employeePositionS')
      .attrs(['dateFrom', 'employeeNumberID', 'employeeID.impID', 'empOrderID.impDateAppoint', 'positionID.positionType'])
      .where('employeeNumberID.employeeID', '=', employeeID)
      .where('employeeID.impSourceID', '=', ctx.mParams.organizationID)
      .where('empOrderID.impDateAppoint', 'isNotNull')
      .selectSingle()
    if (!pos || pos['positionID.positionType'] !== '1') {
      return ctx.mParams.count
    }
    let impDateAppoint = dateService.shiftDate(new Date(pos['empOrderID.impDateAppoint']))
    while (dateFrom < impDateAppoint) {
      dateFrom = dateService.addYears(dateFrom, 1)
    }
    let vacPlan = UB.Repository('hr_empVacationPlan').attrs('ID', 'dateFrom', 'dayCount', 'impSourceID')
      .where('dictVacationKindID', '=', vacKindID)
      .where('employeeNumberID', '=', pos.employeeNumberID).selectSingle()

    if (!vacPlan) {
      let store = UB.DataStore('hr_empVacationPlan')
      vacPlan = {
        ID: store.generateID(),
        employeeID: employeeID,
        employeeNumberID: pos.employeeNumberID,
        dictVacationKindID: vacKindID,
        dateFrom: dateFrom,
        dayCount: 0,
        reason: 'Імпортований запис',
        impEmployeeID: pos['employeeID.impID'],
        impSourceID: impSourceID
      }
      try {
        store.run('insert', {
          isImportOperation: true,
          execParams: vacPlan
        })
      } catch (e) {
        throw new Error(e.message)
      }
    }
    // let expYears = dateService.yearsDiff(calcDate, new Date(expItem.startCalcDate))
    let dateLast = new Date(dateFrom)
    dateLast.setFullYear(currYear)
    while (dateFrom.getFullYear() <= dateLast.getFullYear()) {
      if (!UB.Repository('hr_empVacationPeriod').attrs('ID', 'dateFrom', 'dayCountPlan')
        .where('dateFrom', '=', dateFrom)
        .where('empVacationPlanID', '=', vacPlan.ID)
        .selectSingle()) {
        let expYears = dateService.yearsDiff(calcDate, dateFrom)
        let dayCountPlan = getDayCount(dateFrom, expYears)
        if (dayCountPlan) {
          let execParams = {
            empVacationPlanID: vacPlan.ID,
            dateFrom: dateFrom,
            dateTo: dateService.addDays(dateService.addYears(dateFrom, 1), -1),
            dayCountPlan: dayCountPlan,
            impSourceID: vacPlan.impSourceID,
            employeeID: employeeID
          }
          UB.DataStore('hr_empVacationPeriod').run('insert', { execParams: execParams })
          ctx.mParams.count++
        }
      }
      dateFrom = dateService.addYears(dateFrom, 1)
    }
  })
  return ctx.mParams.count
}

me.fakeRefresh = ctx => {
  if (ctx.mParams.customMethod) {
    me[ctx.mParams.customMethod](ctx)
  }
  if (!ctx.mParams.result) {
    ctx.mParams.result = 'OK'
  }
}

function prepareData (entityName, data) {
  let attrs = global[entityName].entity.attributes
  data.forEach(item => {
    Object.keys(attrs).forEach(attrName => {
      if (item[attrName] === null && attrs[attrName].dataType === 'String') {
        item[attrName] = ''
      }
    })
  })
}

function globalProgress (impSourceID, message) {
  let key = 'HR_' + impSourceID.toString()
  let storedMsg = App.globalCacheGet(key)
  if (message === 'get') {
    return storedMsg
  }
  if (message === 'free') {
    App.globalCachePut(key, '')
    return ''
  }
  App.globalCachePut(key, message)
  return message
}

me.getProgress = function (ctx) {
  let msg = globalProgress(ctx.mParams.impSourceID, 'get')
  if (!msg) {
    ctx.mParams.message = 'DONE'
  } else {
    ctx.mParams.message = msg
  }
}
me.makeAppointOrder = function (ctx) {
  // let mParams = ctx.mParams
  let errors = []

  let appointData = UB.Repository('imp_hr_appoint').attrs('*').selectAsObject()
  console.log('*****************************************************************************')
  console.log(appointData)
  if (appointData.length === 0) {
    errors.push('Не завантажені дані про призначення з CSV-файлу')
  }
  ctx.mParams.errors = errors
}
me.loadOrgStructure = function (ctx) {
  ctx.mParams.errors = []
  let params = ctx.mParams.params
  let topOrgID
  if (!params.orderDate) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не вказана дата наказу')}>>>`)
  }
  if (!params.orderText) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не вказаний текст наказу')}>>>`)
  }

  let staffOrderID
  let errors = ctx.mParams.errors
  let impSourceID = ctx.mParams.impSourceID
  let impSource = UB.Repository('hr_import').attrs('name', 'code').selectById(impSourceID)
  let orderNumber = params.orderNumber || ('IMP' + impSource.code)
  let staffOrder = UB.Repository('hr_staffOrder')
    .attrs('ID', 'orderState', 'notes')
    .where('orderNumber', '=', orderNumber).selectSingle()
  if (staffOrder) {
    if (staffOrder.orderState !== 'PROJECT') {
      throw new UB.UBAbort(`<<<${UB.i18n('Наказ штатного розкладу по джерелу імпорту {0} вже проведено', impSource.name)}>>>`)
    }
    staffOrderID = staffOrder.ID
  }
  let countryID = UB.Repository('cdn_country').attrs('ID').where('code', '=', 'UKR').selectScalar()
  if (!countryID) {
    countryID = UB.Repository('cdn_country').attrs('ID').where('name', '=', 'Україна').selectScalar()
  }
  if (!staffOrderID) {
    let store = UB.DataStore('hr_staffOrder')
    staffOrderID = store.generateID()
    store.run('insert', {
      isImportOperation: true,
      execParams: {
        ID: staffOrderID,
        orderNumber: orderNumber,
        orderDate: dateService.shiftDate(params.orderDate),
        entryDate: dateService.shiftDate(params.orderDate),
        orderState: 'PROJECT',
        textOrder: params.orderText,
        description: UB.i18n('Наказ ШР ') + orderNumber + ' від ' + dateService.formatDate(new Date(params.orderDate), 'dd.mm.yyyy'),
        notes: 'IMPORT'
      }
    })
  }
  let currentUnitEntity = 'hr_organization'
  let store = UB.DataStore(currentUnitEntity)
  let orgData = UB.Repository('imp_' + currentUnitEntity).attrs('*').where('impSourceID', '=', impSourceID).selectAsObject()
  prepareData('imp_' + currentUnitEntity, orgData)
  let hrDictParentUnitType = UB.Repository('hr_dictParentUnitType').attrs(['ID', 'code']).selectAsObject()
  let delayed = []

  let orgDataOld = UB.Repository(currentUnitEntity)
    .attrs('*')
    .where('impID', 'in', orgData.map(i => i.ORGAN_ID))
    .where('impSourceID', '=', impSourceID)
    .misc({ __mip_recordhistory_all: true })
    .selectAsObject()
  let count = 0
  orgData.forEach(item => {
    let oldRec = orgDataOld.find(i => String(i.impID) === item.ORGAN_ID)
    if (oldRec) {
      item.ID = oldRec.ID
      item.skipInsert = true
    } else {
      item.ID = store.generateID()
    }
  })
  orgData.forEach(item => {
    let parentUnitID = (orgData.find(i => i.ORGAN_ID === item.PARENT_ID) || { ID: null }).ID
    item.parentUnitID = parentUnitID
    if (!parentUnitID) {
      topOrgID = item.ID
    }
    item.impID = item.ORGAN_ID
    if (item.skipInsert) {
      return
    }
    let execParams = {
      ID: item.ID,
      code: item.SORT,
      name: item.ORGAN_NAME.substring(0, 120),
      fullName: item.ORGAN_NAME,
      parentUnitID: parentUnitID,
      mi_dateFrom: new Date(item.DATE_CREATION),
      mi_dateTo: '#maxdate',
      orgID: item.ID,
      state: 'NEW',
      EDRPOUCode: item.CODE_OR,
      staffOrderID: staffOrderID,
      idxNum: item.SORT,
      impSourceID: impSourceID,
      parentUnitTypeID: hrDictParentUnitType.find(i => i.code === (parentUnitID ? '2' : '1')).ID,
      nameNom: item.ORGAN_NAME.substring(0, 120),
      nameGen: item.NAME_GENITIVE.substring(0, 120),
      nameDat: item.NAME_DATIVE.substring(0, 120),
      nameAcc: item.ORGAN_NAME.substring(0, 120),
      nameOr: item.ORGAN_NAME.substring(0, 120),
      nameLoc: item.ORGAN_NAME.substring(0, 120),
      nameVoc: item.ORGAN_NAME.substring(0, 120),
      fullNameNom: item.ORGAN_NAME.substring(0, 120),
      fullNameGen: item.NAME_GENITIVE,
      fullNameDat: item.NAME_DATIVE,
      fullNameOr: item.ORGAN_NAME,
      fullNameLoc: item.ORGAN_NAME,
      fullNameVoc: item.ORGAN_NAME,
      liquidate: 0,
      powerBranch: 2,
      impID: item.impID
    }
    if (!parentUnitID) {
      store.run('insert', {
        isImportOperation: true,
        execParams: execParams
      })
      if (item.ADDRESS && countryID) {
        UB.DataStore('ac_address').run('insert', {
          isImportOperation: true,
          execParams: {
            ownerID: item.ID,
            address: item.ADDRESS,
            addressType: '2', // Юридичний,
            countryID: countryID
          }
        })
      }
      globalProgress(impSourceID, 'Завантаження організацій...' + ++count)
    } else {
      execParams.ADDRESS = item.ADDRESS
      delayed.push(execParams)
    }
  })
  delayed.forEach(item => {
    let address = item.ADDRESS
    delete item.ADDRESS
    store.run('insert', {
      isImportOperation: true,
      execParams: item
    })
    if (address && countryID) {
      UB.DataStore('ac_address').run('insert', {
        isImportOperation: true,
        execParams: {
          ownerID: item.ID,
          address: item.ADDRESS,
          addressType: '2', // Юридичний
          countryID: countryID
        }
      })
    }
    globalProgress(impSourceID, 'Завантаження організацій...' + ++count)
  })
  // ******************************************** hr_department ********************************************************
  count = 0
  delayed = []
  currentUnitEntity = 'hr_department'
  store = UB.DataStore(currentUnitEntity)
  let depData = UB.Repository('imp_' + currentUnitEntity).attrs('*').where('impSourceID', '=', impSourceID).selectAsObject()
  prepareData('imp_' + currentUnitEntity, depData)
  let depDataOld = UB.Repository(currentUnitEntity)
    .attrs('*')
    .where('impSourceID', '=', impSourceID)
    .where('impID', 'in', depData.map(i => i.STAFF_ID))
    .misc({ __mip_recordhistory_all: true })
    .selectAsObject()
  depData.forEach(item => {
    let oldRec = depDataOld.find(oldItem => oldItem.impID === item.STAFF_ID && oldItem.impSourceID === impSourceID)
    if (oldRec) {
      item.ID = oldRec.ID
      item.skipInsert = true
    } else {
      item.ID = store.generateID()
    }
  })
  depData.forEach(item => {
    let pparent = depData.find(i => i.STAFF_ID === item.PARENT_ID)
    let parentUnitID = null
    if (pparent) {
      if (pparent.IS_ORGAN === 'Y') {
        parentUnitID = orgData.find(i => i.ORGAN_ID === item.ORGAN_ID).ID
      } else {
        parentUnitID = pparent.ID
      }
    } else {
      pparent = orgData.find(i => i.ORGAN_ID === item.ORGAN_ID)
      if (!pparent) {
        errors.push(UB.i18n(`Не можу знайти батьківський елемент для підрозділу STAFF_ID = {0} PARENT_ID = {1}`, item.STAFF_ID, item.PARENT_ID))
        return
      }
      parentUnitID = pparent.ID
    }
    let orgID = orgData.find(i => i.ORGAN_ID === item.ORGAN_ID)
    item.orgID = orgID.ID
    item.impID = item.STAFF_ID
    if (item.IS_ORGAN === 'Y' || !item.ORGAN_ID || item.skipInsert) {
      return
    }
    let execParams = {
      ID: item.ID,
      code: item.CODE || item.SORT_ORDER,
      name: item.NAME.substring(0, 255),
      fullName: item.NAME,
      mi_dateFrom: item.CREATE_DATE ? new Date(item.CREATE_DATE) : new Date(2011, 6, 18),
      mi_dateTo: item.FINISH_DATE ? new Date(item.FINISH_DATE) : null,
      // dateToEmpty: item.FINISH_DATE ? item.FINISH_DATE : '#maxdate',
      parentUnitID: parentUnitID,
      orgID: orgID.ID,
      state: 'NEW',
      staffOrderID: staffOrderID,
      entryOrderID: staffOrderID,
      impSourceID: impSourceID,
      idxNum: item.SORT_ORDER,
      nameNom: item.NAME.substring(0, 200),
      nameGen: item.NAME_GENITIVE.substring(0, 200),
      nameDat: item.NAME_DATIVE.substring(0, 200),
      nameOr: item.NAME.substring(0, 200),
      nameLoc: item.NAME_PREPOSITIONAL.substring(0, 200),
      nameVoc: item.NAME.substring(0, 200),
      fullNameNom: item.NAME,
      fullNameGen: item.NAME_GENITIVE,
      fullNameDat: item.NAME_DATIVE,
      fullNameAcc: item.NAME,
      fullNameOr: item.NAME,
      fullNameLoc: item.NAME_PREPOSITIONAL,
      fullNameVoc: item.NAME,
      liquidate: 0,
      impID: item.impID
    }
    let parentLoaded = UB.Repository('hr_staffUnit').attrs('ID').misc({ __mip_recordhistory_all: true }).selectById(parentUnitID)
    if (parentLoaded /* parentUnitID !== pparent.ID */) {
      try {
        store.run('insert', {
          isImportOperation: true,
          execParams: execParams
        })
        globalProgress(impSourceID, 'Завантаження підрозділів...' + ++count)
      } catch (e) {
        throw new UB.UBAbort(UB.i18n(`Помилка при додаванні підрозділу - {0}. Підрозділ {1}, STAFF_ID = {2}, PARENT_ID = {3}`, e.message, item.NAME, item.STAFF_ID, item.PARENT_ID))
      }
    } else {
      delayed.push(execParams)
    }
  })
  let loadDataCalls = 0
  let loadData = execParamsList => {
    let delayed = []
    if (!execParamsList.length) {
      return
    }
    loadDataCalls++
    execParamsList.forEach(item => {
      let parentLoaded = UB.Repository('hr_staffUnit').attrs('ID').misc({ __mip_recordhistory_all: true }).selectById(item.parentUnitID)
      let store = UB.DataStore('hr_department')
      if (parentLoaded) {
        store.run('insert', {
          isImportOperation: true,
          execParams: item
        })
        globalProgress(impSourceID, 'Завантаження підрозділів...' + ++count)
      } else {
        delayed.push(item)
      }
    })
    if (delayed.length) {
      loadData(delayed)
    }
  }
  loadData(delayed)
  console.debug(loadDataCalls)
  /*
  delayed.forEach(item => {
    store.run('insert', {
      isImportOperation: true,
      execParams: item
    })
    globalProgress(impSourceID, 'Завантаження підрозділів...' + ++count)
  })
*/

  // ******************************************** hr_position ********************************************************
  count = 0
  currentUnitEntity = 'hr_position'
  store = UB.DataStore(currentUnitEntity)
  let hrDictStaffCat = UB.Repository('hr_dictStaffCat').attrs(['ID', 'code']).selectAsObject()
  hrDictStaffCat.forEach(item => {
    hrDictStaffCat[item.code] = item.ID
  })
  let payElID = UB.Repository('hr_payEl').attrs('min([ID])').where('methodID.code', '=', '1').select().get(0)
  let posData = UB.Repository('imp_' + currentUnitEntity)
    .attrs('*')
    .where('impSourceID', '=', impSourceID)
    .notExists(UB.Repository(currentUnitEntity)
      .correlation('impID', 'POS_ID')
      .where('impSourceID', '=', impSourceID)
      .misc({ __mip_recordhistory_all: true })
    ).selectAsObject()
  prepareData('imp_' + currentUnitEntity, posData)
  posData.forEach(item => {
    let parentUnitID = null
    let orgID
    let parent = depData.find(i => i.impID === item.STAFF_ID)
    if (parent) {
      if (parent.IS_ORGAN === 'Y') {
        parent = orgData.find(i => i.impID === parent.ORGAN_ID)
        orgID = parent.ID
      } else {
        orgID = parent.orgID
      }
    }
    if (!parent) {
      parent = { ID: topOrgID }
      orgID = topOrgID
    }
    parentUnitID = parent.ID
    item.STATUS = item.status.toUpperCase()
    let execParams = {
      ID: store.generateID(),
      code: item.SORT_ORDER,
      name: item.NAME.substring(0, 256),
      fullName: item.NAME.substring(0, 256),
      mi_dateFrom: new Date(item.CREATE_DATE),
      mi_dateTo: item.FINISH_DATE ? impModule.makeDate(item.FINISH_DATE) : '#maxdate',
      parentUnitID: parentUnitID,
      orgID: orgID,
      state: 'NEW',
      staffOrderID: staffOrderID,
      entryOrderID: staffOrderID,
      impSourceID: impSourceID,
      idxNum: item.SORT_ORDER,
      // positionCategory: item.K29_NAME === 'РОБІТНИК' ? 5 : item.K29_NAME === 'СПЕЦІАЛІСТ' ? 3 : item.K29_NAME === 'КЕРІВНИК' ? 1 : null,
      psCategory: item.psCategory,
      positionType: item.positionType,
      dictStaffCatID: (item.STATUS === 'ДЕРЖАВНИЙ СЛУЖБОВЕЦЬ' ? hrDictStaffCat['01'] : item.STATUS === 'СЛУЖБОВЕЦЬ' ? hrDictStaffCat['02'] : item.STATUS === 'РОБІТНИК' ? hrDictStaffCat['03'] : hrDictStaffCat['05']) || null,
      dictWagePayID: item.dictWagePayID,
      quantity: item.POS_COEF || 1,
      accrualSum: item.SALARY_FACT,
      payElID: payElID,
      nameNom: item.NAME.substring(0, 200),
      nameGen: item.NAME_GENITIVE.substring(0, 200),
      nameDat: item.NAME_DATIVE.substring(0, 200),
      nameOr: item.NAME_ABLATIVE.substring(0, 200),
      nameLoc: item.NAME.substring(0, 200),
      nameVoc: item.NAME.substring(0, 200),
      fullNameNom: item.NAME.substring(0, 500),
      fullNameGen: item.NAME_GENITIVE.substring(0, 500),
      fullNameDat: item.NAME_DATIVE.substring(0, 500),
      fullNameAcc: item.NAME.substring(0, 500),
      fullNameOr: item.NAME_ABLATIVE.substring(0, 500),
      fullNameLoc: item.NAME.substring(0, 500),
      fullNameVoc: item.NAME.substring(0, 500),
      liquidate: 0,
      // dictProfessionID: item.dictProfessionID,
      dictPositionID: item.dictPositionID,
      dictStatePayID: item.dictStatePayID,
      impID: item.POS_ID
    }
    // console.log(execParams)
    try {
      store.run('insert', {
        isImportOperation: true,
        execParams: execParams
      })
      globalProgress(impSourceID, 'Завантаження посад...' + ++count)
    } catch (e) {
      globalProgress(impSourceID, 'free')
      throw new UB.UBAbort(`${execParams.name} ${item.POS_ID} ---${e.message}`)
    }
  })
  globalProgress(impSourceID, 'free')
}
