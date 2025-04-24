const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const dateService = require('../AC/modules/dataServices/dateService')

me.getTempExecutionA = ctx => {
  let { positionID, onDate, isSelectAll } = ctx.mParams
  onDate = dateService.shiftDate(onDate || new Date())
  let data = UB.Repository('hr_empOrderActingDet')
    .attrs(['ID', 'dateFrom', 'dateTo', 'paraID.employeePositionID', 'paraID.positionID', 'employeeID.fullFIO', 'employeeID', 'employeeNumberID', 'employeeNumberID.tabNum', 'orderID.empOrderType'])
    .where('employeePositionID.dateFrom', '<=', onDate)
    .where('employeePositionID.dateTo', '>=', onDate)
    .where('employeePositionID.mi_deleteDate', '>=', '#maxdate')
    .where('paraID.positionID', '=', positionID)

  if (!isSelectAll) {
    data = data.where('dateFrom', '<=', onDate).where('dateTo', '>=', onDate)
  }
  data = data.selectAsObject({
    'paraID.empOrderType': 'empOrderType',
    'paraID.employeePositionID': 'employeePositionID',
    'paraID.positionID': 'positionID',
    'employeeID.fullFIO': 'tempFullFIO',
    'employeeNumberID': 'tempEmployeeNumberID',
    'employeeNumberID.tabNum': 'tempTabNum',
    'employeeID': 'tempEmployeeID',
    'orderID.empOrderType': 'empOrderType'

  })
  let dataEx = UB.Repository('hr_dictTempExecution')
    .attrs(['ID', 'dateFrom', 'dateTo', 'employeePositionID', 'employeePositionID.positionID', 'employeePositionTempID.employeeID.fullFIO', 'employeePositionTempID.employeeID',
      'employeePositionTempID.employeeNumberID', 'employeePositionTempID.employeeNumberID.tabNum'])
    .where('employeePositionTempID.dateFrom', '<=', onDate)
    .where('employeePositionTempID.dateTo', '>=', onDate)
    .where('employeePositionTempID.mi_deleteDate', '>=', '#maxdate')
    .where('employeePositionTempID.positionID', '=', positionID)
    .joinCondition('employeePositionID.positionID.mi_dateFrom', '<=', onDate)
    .joinCondition('employeePositionID.positionID.mi_dateTo', '>=', onDate)
    .joinCondition('employeePositionID.positionID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('employeePositionID.positionID.state', '=', 'ACTIVE')

  if (!isSelectAll) {
    dataEx = dataEx.where('dateFrom', '<=', onDate).where('dateTo', '>=', onDate)
  }
  dataEx = dataEx.selectAsObject({
    'employeePositionID.positionID': 'positionID',
    'employeePositionTempID.employeeID.fullFIO': 'tempFullFIO',
    'employeePositionTempID.employeeNumberID': 'tempEmployeeNumberID',
    'employeePositionTempID.employeeNumberID.tabNum': 'tempTabNum',
    'employeePositionTempID.employeeID': 'tempEmployeeID',
    'mi_unityEntity': 'hr_dictTempExecution'

  })
  dataEx.forEach(item => { item.empOrderType = 'TEMPEXECUTION' })
  ctx.mParams.resultData = JSON.stringify(data.concat(dataEx))
}
