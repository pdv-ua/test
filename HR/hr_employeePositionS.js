const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const _ = require('lodash')
const dateService = require('../AC/modules/dataServices/dateService')
const storeService = require('../AC/modules/dataServices/localStoreService')

me.entity.addMethod('getTempExecution')
me.entity.addMethod('getAcceptEmployee')
me.entity.addMethod('getAcceptEmployeeExternal')
me.entity.addMethod('selectPosGroups')

me.getTempExecution = ctx => {
  let sql = `select hep.ID "ID", hep.description, hep.positionID "positionID", hep.employeeID "employeeID", hep.employeeNumberID "employeeNumberID" 
    from hr_employeePosition hep
    where (hep.employeeNumberID in (
              SELECT ep.employeeNumberID FROM hr_dictTempExecution dte  
                INNER JOIN hr_employeePosition ep ON ep.ID=dte.employeePositionID                 
                WHERE dte.positionTempID = :positionID:  and dte.mi_deleteDate >= '9999-12-31'                 
                and :onDate: between coalesce(dte.dateFrom, '2000-01-01') and coalesce(dte.dateTo, '9999-12-31')             
              UNION ALL
              SELECT  act.employeeNumberID
              FROM hr_empOrderActingDet act  
                INNER JOIN hr_empOrderDet det ON det.ID=act.paraID  
                INNER JOIN hr_empOrder o ON o.ID=act.orderID  
                LEFT JOIN hr_position pos ON pos.ID=det.positionID  
                WHERE (o.orderState='POSTED' OR o.orderState='PROCESSED') AND act.mi_deleteDate>='9999-12-31' 
                  AND pos.mi_data_id=:positionID:                 
                  AND :onDate: between coalesce(act.dateFrom, '2000-01-01') and coalesce(act.dateTo, '9999-12-31')                 
      ) 
      or 
      (
        hep.positionID = :positionID: 
        and NOT EXISTS (
        SELECT elta.employeeNumberID from hr_empLongTermAbsc elta
          WHERE elta.employeeNumberID = hep.employeeNumberID
          AND :onDate: between coalesce(elta.dateFrom, '2000-01-01') and coalesce(elta.dateTo, '9999-12-31')       
        )
      )    
    )
    and  :onDate: between hep.dateFrom and hep.dateTo
    and  hep.mi_deleteDate >= '9999-12-31'`
  const store = UB.DataStore(__entityName)
  store.runSQL(sql, {
    positionID: ctx.mParams.positionID,
    onDate: ctx.mParams.onDate || new Date()
  })
  const data = store.getAsJsObject()
  store.freeNative()
  ctx.dataStore.initialize(data)
  return data
}

me.getAcceptEmployeeExternal = ctx => {
  let limit = ctx.mParams.options.limit
  let start = ctx.mParams.options.start
  let onDate = dateService.shiftDate(ctx.mParams.onDate)
  let empOrderType = ctx.mParams.empOrderType
  let whereList = ctx.mParams.whereList
  let whereClause = ''
  if (whereList) {
    let value = whereList[Object.keys(whereList)[0]].value
    let expr = whereList[Object.keys(whereList)[0]].expression
    if (expr === '[description]') {
      whereClause = `and pos.description like '%${value}%'`
    } else if (expr === '[ID]') {
      whereClause = `and pos.ID = ${value}`
    }
  }
  if (!onDate || !empOrderType) {
    throw new UB.UBAbort('hr_employeePosition.js->getAcceptEmployeeExternal: необхідно вказати тип наказу та дату')
  }
  let top = start ? '' : (' top ' + limit)
  let lim = start ? `OFFSET  ${start} ROWS FETCH NEXT ${limit} ROWS ONLY` : ''
  let sqlText = `select ${top} pos.ID "ID", 
                  CONCAT(pos.description, ' ', org.name) "description",
                  pos.dateFrom "dateFrom",
                  pos.dateTo "dateTo"
            from hr_acceptEmployee ae
            join hr_employeePosition pos on pos.ID = ae.employeePositionID and pos.isActive = 1 and :onDate: between pos.dateFrom  and pos.dateTo and pos.mi_deleteDate >= '9999-12-31'
            join hr_organization org on org.mi_data_id = pos.organizationID and :onDate: between org.mi_dateFrom  and org.mi_dateTo and org.state = 'ACTIVE' and org.mi_deleteDate >= '9999-12-31' 
            where ae.mi_deleteDate >= '9999-12-31' and ae.empOrderType = :empOrderType:
            ${whereClause} order by pos.description+ ' '+org.name ${lim}`

  const store = UB.DataStore(__entityName)
  store.runSQL(sqlText, {
    empOrderType: empOrderType,
    onDate: onDate
  })
  const data = store.getAsJsObject()
  store.freeNative()
  ctx.dataStore.initialize(data)
}

me.getAcceptEmployee = ctx => {
  let organizationID = ctx.mParams.organizationID
  let limit = ctx.mParams.options.limit
  let start = ctx.mParams.options.start
  let onDate = dateService.shiftDate(ctx.mParams.onDate)
  let empOrderType = ctx.mParams.empOrderType
  let whereList = ctx.mParams.whereList
  let whereClause = ''
  if (whereList) {
    let value = whereList[Object.keys(whereList)[0]].value
    let expr = whereList[Object.keys(whereList)[0]].expression
    if (expr === '[description]') {
      whereClause = `where description like '%${value}%'`
    } else if (expr === '[ID]') {
      whereClause = `where ID = ${value}`
    }
  }
  if (!organizationID || !onDate || !empOrderType) {
    throw new UB.UBAbort('hr_employeePosition.js->getAcceptEmployee: необхідно вказати тип наказу, дату та організацію')
  }
  let top = start ? '' : (' top ' + limit)
  let lim = start ? `OFFSET  ${start} ROWS FETCH NEXT ${limit} ROWS ONLY` : ''
  let sqlText = `select ${top} * from (
              select ${top} pos.ID "ID", 
                    pos.description,
                    dateFrom "dateFrom",
                    dateTo "dateTo"
             from hr_employeePosition pos
             where pos.organizationID = :organizationID: and pos.isActive = 1 
             and :onDate: between dateFrom  and dateTo
             and pos.mi_deleteDate >= '9999-12-31'
          ) a ${whereClause} order by description ${lim}`

  const store = UB.DataStore(__entityName)
  store.runSQL(sqlText, {
    organizationID: organizationID,
    empOrderType: empOrderType,
    onDate: onDate
  })
  const data = store.getAsJsObject()
  store.freeNative()
  ctx.dataStore.initialize(data)
}

/** Виборка посад, згрупована по посаді, щоб враховуалися лише призначення та переміщення і не враховуалися зміна окладу та графіку роботи
 * @param {object} ctx контекст
 * @param {array} ctx.mParams.fieldList масив полів
 * @param {object} ctx.mParams.whereList об'єкт фільтрації where
 * @param {object} ctx.mParams.orderList об'єкт для сортування
 * @param {array} ctx.mParams.joinAs масив умов, що будуть зв'язуватися в блоці JOIN
 * @return {date} __mip_ondate на дату
 * @return {array} orgIDs вибрані організації
 */
me.selectPosGroups = ctx => {
  const mParams = ctx.mParams
  const oldFieldList = _.clone(mParams.fieldList)
  const fieldList = _.clone(mParams.fieldList)
  const filters = mParams.filters && JSON.parse(mParams.filters)
  if (!fieldList.includes('ID')) {
    fieldList.push('ID')
  }
  if (!fieldList.includes('employeeNumberID')) {
    fieldList.push('employeeNumberID')
  }
  if (!fieldList.includes('positionID')) {
    fieldList.push('positionID')
  }
  mParams.fieldList = fieldList
  const posHist = UB.Repository(__entityName)
    .attrs(['ID', 'employeeNumberID', 'positionID', 'dateFrom', 'dateTo'])
    .where('organizationID', 'in', mParams.orgIDs)
    .orderBy('employeeNumberID', 'dateFrom')
    .selectAsObject()
  let data = storeService.repositorySelect(ctx, __entityName)
  data.forEach(dataItem => {
    let histItems = posHist.filter(itm => itm.employeeNumberID === dataItem.employeeNumberID)
    if (histItems.length > 0) {
      histItems = _.orderBy(histItems, ['dateFrom'], ['asc'])
      let isCurrPosPassed = false
      for (let i = 0; i < histItems.length; i++) {
        let histItem = histItems[i]
        if (!isCurrPosPassed && histItem.ID === dataItem.ID) {
          isCurrPosPassed = true
        } else {
          if (histItem.positionID === dataItem.positionID) {
            dataItem.dateTo = histItem.dateTo
            dataItem.dateToEmpty = dateService.isMaxDate(histItem.dateTo) ? null : histItem.dateTo
          } else {
            break
          }
        }
      }
    }
  })
  let filteredData = storeService.filter(data, filters)
  mParams.fieldList = oldFieldList
  /* Уникнення помилки, що в fieldList немає полів, які є в whereList та orderList */
  mParams.whereList = {}
  mParams.orderList = {}
  filteredData = storeService.formDataByFieldList(filteredData, oldFieldList)
  storeService.initArrayToStore(ctx.dataStore, filteredData, mParams)
  mParams.__totalRecCount = filteredData.length
  ctx.inherited = false
  return true
}
