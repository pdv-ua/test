const dateService = require('../../../AC/modules/dataServices/dateService')

module.exports.run = (conn) => {
  const trialPeriods = []

  const appointDet = conn.Repository('hr_empOrderAppointDet')
    .attrs(['employeeNumberID', 'employeePositionID', 'employeePositionID.positionID', 'orderID',
      'orderID.orderNumber', 'orderID.orderDate', 'dateFrom', 'dateTrialEnd', 'dictTrialPeriodID'])
    .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
    .where('dateTrialEnd', 'isNotNull')
    .orderBy('dateFrom', 'asc')
    .selectAsObject()

  appointDet.forEach(item => {
    trialPeriods.push({
      employeeNumberID: item['employeeNumberID'],
      employeePositionID: item['employeePositionID'],
      orderID: item['orderID'],
      dateFrom: dateService.shiftDate(item['dateFrom']),
      dateTrialEnd: dateService.shiftDate(item['dateTrialEnd']),
      positionID: item['employeePositionID.positionID'],
      dictTrialPeriodID: item['dictTrialPeriodID'],
      orderNumber: item['orderID.orderNumber'],
      orderDate: item['orderID.orderDate']
    })
  })
  const moveDet = conn.Repository('hr_empOrderMoveDet')
    .attrs(['employeeNumberID', 'employeePositionID', 'employeePositionID.positionID', 'orderID',
      'orderID.orderNumber', 'orderID.orderDate', 'dateFrom', 'dateTrialEnd', 'dictTrialPeriodID'])
    .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
    .where('dateTrialEnd', 'isNotNull')
    .orderBy('dateFrom', 'asc')
    .selectAsObject()

  moveDet.forEach(item => {
    trialPeriods.push({
      employeeNumberID: item['employeeNumberID'],
      employeePositionID: item['employeePositionID'],
      orderID: item['orderID'],
      dateFrom: dateService.shiftDate(item['dateFrom']),
      dateTrialEnd: dateService.shiftDate(item['dateTrialEnd']),
      positionID: item['employeePositionID.positionID'],
      dictTrialPeriodID: item['dictTrialPeriodID'],
      orderNumber: item['orderID.orderNumber'],
      orderDate: item['orderID.orderDate']
    })
  })

  const trialProlongDet = conn.Repository('hr_empOrderTrialprolongDet')
    .attrs(['employeeNumberID', 'employeePositionID', 'employeePositionID.positionID', 'orderID',
      'orderID.orderNumber', 'orderID.orderDate', 'dateFrom', 'dateTo'])
    .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
    .orderBy('dateFrom', 'asc')
    .selectAsObject()

  trialProlongDet.forEach(item => {
    trialPeriods.push({
      employeeNumberID: item['employeeNumberID'],
      employeePositionID: item['employeePositionID'],
      orderID: item['orderID'],
      dateFrom: dateService.shiftDate(item['dateFrom']),
      dateTrialEnd: dateService.shiftDate(item['dateTo']),
      positionID: item['employeePositionID.positionID'],
      dictTrialPeriodID: null,
      orderNumber: item['orderID.orderNumber'],
      orderDate: item['orderID.orderDate']
    })
  })

  trialPeriods.forEach(item => {
    const etp = conn.Repository('hr_employeeTrialPeriod')
      .attrs('ID', 'dateTo')
      .where('employeeNumberID', '=', item['employeeNumberID'])
      .where('employeePositionID', '=', item['employeePositionID'])
      .where('dateFrom', '<=', item['dateFrom'])
      .where('dateTo', '>=', item['dateFrom'])
      .selectSingle()
    if (etp) {
      conn.update({
        entity: 'hr_employeeTrialPeriod',
        __skipOptimisticLock: true,
        execParams: {
          ID: etp.ID,
          dateTo: dateService.addDays(item['dateFrom'], -1)
        }
      })
    }
    conn.insert({
      entity: 'hr_employeeTrialPeriod',
      __skipOptimisticLock: true,
      execParams: {
        employeeNumberID: item['employeeNumberID'],
        employeePositionID: item['employeePositionID'],
        orderID: item['orderID'],
        dateFrom: item['dateFrom'],
        dateTo: item['dateTrialEnd'],
        dateTrialEnd: item['dateTrialEnd'],
        positionID: item['positionID'],
        dictTrialPeriodID: item['dictTrialPeriodID'],
        orderNumber: item['orderNumber'],
        orderDate: item['orderDate']
      }
    })
  })
}
