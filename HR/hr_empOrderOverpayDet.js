const __entityName = __filename.slice(__dirname.length + 1, -3)
const UB = require('@unitybase/ub')
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('loadEmployeeList')

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  const fields = ebs.getCompositeAttributeValue(ctx, 'description', ['periodID.name'], '^', true).split('^')
  execParams.description = fields[0]
  execParams.title = '..'
}

function beforeInsert (ctx) {
  global.hr_empOrderDet.setItemIdx(ctx)
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  // const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (execParams.payElID || execParams.periodID || execParams.payRate !== undefined) {
    const emp = UB.Repository('hr_empOrderChgSalEmpDet')
      .attrs(['ID'])
      .where('paraID', '=', execParams.ID)
      .selectAsObject()
    const ds = UB.DataStore('hr_empOrderChgSalEmpDet')
    emp.forEach(item => {
      ds.run('delete', {
        execParams: {
          ID: item.ID
        }
      })
    })
  }
  setDescription(ctx)
}

function getOverTime (employeeNumberList, dateFrom, dateTo) {
  const employeeNumberListSql = employeeNumberList.join(',')
  const sql = `
      select employeeNumberID "employeeNumberID", 
             factHourTotal - case when factHour > planHour then planHour else factHour end  "overTime"
      from (
      select 
           employeeNumberID,
           sum( tim_timeSheet.factHour) factHourTotal,
           sum(tim_timeSheet.factHour) factHour, 
           sum(tim_timeSheet.planHour) planHour
      from tim_timeSheet tim_timeSheet
      left join hr_dictTimeCost  hr_dictTimeCost on hr_dictTimeCost.ID = tim_timeSheet.factTimeCostID and hr_dictTimeCost.timeCostType = 'FREE'
      JOIN tim_plan tim_plan ON tim_plan.ID=tim_timeSheet.planID
      JOIN hr_workSchedule hr_workSchedule ON hr_workSchedule.ID=tim_plan.workScheduleID and hr_workSchedule.isSummarized = 1
      where  (tim_timeSheet.factHour > 0 or hr_dictTimeCost.timeCostType = 'FREE')
      and tim_timeSheet.employeeNumberID in (${employeeNumberListSql})
      and tim_timeSheet.isActive = 1
      and  tim_timeSheet.dateWork between :dateFrom: and :dateTo:
      group by employeeNumberID
      ) a
      where factHourTotal - case when factHour > planHour then planHour else factHour end > 0
`
  const store = UB.DataStore(__entityName)
  store.runSQL(sql, {
    dateFrom: dateFrom,
    dateTo: dateTo
  })
  const data = store.getAsJsObject()
  store.freeNative()
  return data
}

me.loadEmployeeList = function (ctx) {
  const mParams = ctx.mParams
  const ds = UB.DataStore('hr_empOrderChgSalEmpDet')
  if (mParams.isDeleteExisting) {
    const existing = UB.Repository('hr_empOrderChgSalEmpDet').attrs('ID')
      .where('paraID', '=', mParams.paraID)
      .select()
    while (!existing.eof) {
      ds.run('delete', { execParams: { ID: existing.get('ID') } })
      existing.next()
    }
  }
  // const empOrderType = mParams.empOrderType
  const employeePosition = UB.Repository('hr_employeePositionS')
    .attrs('ID', 'employeeNumberID', 'positionID', 'organizationID')
    .where('ID', 'in', mParams.records)
    .selectAsObject()
  const employeeNumberList = employeePosition.map(item => item.employeeNumberID)
  let overWork = getOverTime(employeeNumberList, mParams.dateFrom, mParams.dateTo)
  let i = 0
  employeePosition.filter(item => item.positionID !== null).forEach(item => {
    const overWorkItem = overWork.find(o => o.employeeNumberID === item.employeeNumberID)
    if (!overWorkItem) {
      return
    }
    const isRecordNotExists = mParams.isDeleteExisting || UB.Repository('hr_empOrderChgSalEmpDet').attrs('ID')
      .where('paraID', '=', mParams.paraID)
      .where('employeeNumberID', '=', item.employeeNumberID)
      .select()
      .eof
    if (isRecordNotExists) {
      ds.run('insert', {
        execParams: {
          empOrderType: mParams.empOrderType,
          employeePositionID: item.ID,
          employeeNumberID: item.employeeNumberID,
          positionID: item.positionID,
          payElID: mParams.payElID,
          orderID: mParams.orderID,
          paraID: mParams.paraID,
          dateFrom: mParams.dateFrom,
          dateTo: mParams.dateTo,
          newValue: overWorkItem.overTime,
          orderText: UB.i18n(`додатково роботу у кількості {0} год. згідно табелю за виробничою потребою.`, overWorkItem.overTime),
          reason: mParams.reason
        }
      })
      i++
    }
  })
  mParams.insCount = i
}
