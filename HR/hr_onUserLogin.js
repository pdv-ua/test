const UB = require('@unitybase/ub')
const Session = UB.Session
const dateService = require('../AC/modules/dataServices/dateService')

Session.on('login', function onUserLogin () {
  const data = Session.uData
  try {
    const employeeNumber = UB.Repository('uba_user')
      .attrs(['employeeNumberID', 'employeeNumberID.orgID', 'employeeNumberID.employeeID'])
      .selectById(data.userID)
    data.employeeNumberID = employeeNumber && employeeNumber.employeeNumberID ? employeeNumber.employeeNumberID : null
    data.orgID = employeeNumber && employeeNumber['employeeNumberID.orgID'] ? employeeNumber['employeeNumberID.orgID'] : null
    data.hrEmployeeID = employeeNumber && employeeNumber['employeeNumberID.employeeID'] ? employeeNumber['employeeNumberID.employeeID'] : null
    const employeePosition = data.employeeNumberID ? UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'positionID', 'dictPositionID', 'departmentID'])
      .where('employeeNumberID', '=', data.employeeNumberID)
      .where('dateFrom', '<=', dateService.todayDate())
      .where('dateTo', '>=', dateService.todayDate())
      .limit(1)
      .selectSingle() || {} : {}
    data.employeePositionID = employeePosition.ID || null
    data.positionID = employeePosition.positionID || null
    data.departmentID = employeePosition.departmentID || null
    data.dictPositionID = employeePosition.dictPositionID || null
  } catch (error) {}
})
