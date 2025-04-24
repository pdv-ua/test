const dateService = require('../../../AC/modules/dataServices/dateService')
module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `delete from hr_empLongTermAbsc where orderID is not null`
  })

  // періодичні відпустки
  const empOrderVacation = conn.Repository('hr_empOrderVacationDet')
    .attrs(['ID', 'orderID', 'orderID.organizationID', 'employeeNumberID', 'dateFrom', 'dateTo', 'changedValues'])
    .where('orderID.empOrderType', 'in', ['VACATIONLONG', 'VACATION'])
    .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
    .where('orderID.mi_deleteUser', 'isNull')
    .where('cancelParaID', 'isNull')
    .where('dictVacationKindID.isTempVacancy', '=', true)
    .selectAsObject()
  empOrderVacation.forEach(row => {
    const execParams = {
      organizationID: row['orderID.organizationID'],
      employeeNumberID: row.employeeNumberID,
      dateFrom: row.dateFrom,
      dateTo: row.dateTo,
      orderID: row.orderID,
      paraID: row.ID
    }
    execParams.ID = conn.insert({
      entity: 'hr_empLongTermAbsc',
      fieldList: ['ID'],
      execParams
    })
    const changedValues = row.changedValues ? JSON.parse(row.changedValues) : [{ inserted: [], updated: [] }]
    if (!changedValues.inserted) {
      changedValues.inserted = []
    }
    let empLongTermAbsc = changedValues.inserted.find(o => o['hr_empLongTermAbsc'])
    if (empLongTermAbsc) {
      empLongTermAbsc.hr_empLongTermAbsc = execParams.ID
    } else {
      changedValues.inserted.push({ hr_empLongTermAbsc: execParams.ID })
    }
    conn.run({
      entity: 'hr_empOrderVacationDet',
      method: 'update',
      isOrderOperation: true,
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        changedValues: JSON.stringify(changedValues)
      }
    })
  })

  // довготривалої, неперіодичної відпустки
  const empOrderVacationlong = conn.Repository('hr_empOrderVacationlongDet')
    .attrs(['ID', 'orderID', 'orderID.organizationID', 'employeeNumberID', 'dateFrom', 'dateTo', 'changedValues'])
    .where('orderID.empOrderType', 'in', ['VACATIONLONG', 'VACATION'])
    .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
    .where('orderID.mi_deleteUser', 'isNull')
    .where('cancelParaID', 'isNull')
    .where('dictVacationKindID.isTempVacancy', '=', true)
    .selectAsObject()
  empOrderVacationlong.forEach(row => {
    const execParams = {
      organizationID: row['orderID.organizationID'],
      employeeNumberID: row.employeeNumberID,
      dateFrom: row.dateFrom,
      dateTo: row.dateTo,
      orderID: row.orderID,
      paraID: row.ID
    }
    execParams.ID = conn.insert({
      entity: 'hr_empLongTermAbsc',
      fieldList: ['ID'],
      execParams
    })
    const changedValues = row.changedValues ? JSON.parse(row.changedValues) : [{ inserted: [], updated: [] }]
    if (!changedValues.inserted) {
      changedValues.inserted = []
    }
    let empLongTermAbsc = changedValues.inserted.find(o => o['hr_empLongTermAbsc'])
    if (empLongTermAbsc) {
      empLongTermAbsc.hr_empLongTermAbsc = execParams.ID
    } else {
      changedValues.inserted.push({ hr_empLongTermAbsc: execParams.ID })
    }
    conn.run({
      entity: 'hr_empOrderVacationlongDet',
      method: 'update',
      isOrderOperation: true,
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        changedValues: JSON.stringify(changedValues)
      }
    })
  })
  // продовження довготривалої, неперіодичної відпустки
  const empOrderVacationprolongl = conn.Repository('hr_empOrderVacationprolonglDet')
    .attrs(['ID', 'orderID', 'orderID.organizationID', 'employeeNumberID', 'dateFrom', 'dateTo', 'changedValues'])
    .where('orderID.empOrderType', '=', 'VACATIONPROLONGL')
    .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
    .where('orderID.mi_deleteUser', 'isNull')
    .where('cancelParaID', 'isNull')
    // .where('grantVacationParaID.dictVacationKindID.isTempVacancy', '=', true)
    .selectAsObject()
  empOrderVacationprolongl.forEach(row => {
    const execParams = {
      organizationID: row['orderID.organizationID'],
      employeeNumberID: row.employeeNumberID,
      dateFrom: row.dateFrom,
      dateTo: row.dateTo,
      orderID: row.orderID,
      paraID: row.ID
    }
    execParams.ID = conn.insert({
      entity: 'hr_empLongTermAbsc',
      fieldList: ['ID'],
      execParams
    })
    const changedValues = row.changedValues ? JSON.parse(row.changedValues) : [{ inserted: [], updated: [] }]
    if (!changedValues.inserted) {
      changedValues.inserted = []
    }
    let empLongTermAbsc = changedValues.inserted.find(o => o['hr_empLongTermAbsc'])
    if (empLongTermAbsc) {
      empLongTermAbsc.hr_empLongTermAbsc = execParams.ID
    } else {
      changedValues.inserted.push({ hr_empLongTermAbsc: execParams.ID })
    }
    conn.run({
      entity: 'hr_empOrderVacationprolonglDet',
      method: 'update',
      isOrderOperation: true,
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        changedValues: JSON.stringify(changedValues)
      }
    })
  })

  // Вихід з довготривалої, неперіодичної відпустки
  const empOrderVacationret = conn.Repository('hr_empOrderVacationretDet')
    .attrs(['ID', 'orderID', 'orderID.organizationID', 'employeeNumberID', 'dateFrom', 'dateTo', 'empOrderVacationLongID', 'changedValues'])
    .where('orderID.empOrderType', '=', 'VACATIONRET')
    .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
    .where('orderID.mi_deleteUser', 'isNull')
    .where('cancelParaID', 'isNull')
    .selectAsObject()
  empOrderVacationret.forEach(ret => {
    const empLong = conn.Repository('hr_empLongTermAbsc')
      .attrs(['ID', 'dateFrom', 'dateTo'])
      .where('employeeNumberID', '=', ret.employeeNumberID)
      .where('paraID', '=', ret.empOrderVacationLongID)
      .selectSingle()
    if (empLong) {
      const execParams = {
        ID: empLong.ID,
        dateTo: dateService.addDays(ret.dateFrom, -1),
        changeOrderID: ret.orderID,
        changeParaID: ret.ID
      }
      conn.run({
        entity: 'hr_empLongTermAbsc',
        method: 'update',
        __skipOptimisticLock: true,
        execParams
      })
      const changedValues = ret.changedValues ? JSON.parse(ret.changedValues) : [{ inserted: [], updated: [] }]
      if (!changedValues.updated) {
        changedValues.updated = []
      }
      let empLongTermAbsc = changedValues.updated.find(o => o['hr_empLongTermAbsc'])
      execParams.dateTo = dateService.shiftDate(empLong.dateTo)
      execParams.changeOrderID = null
      execParams.changeParaID = null
      if (empLongTermAbsc) {
        empLongTermAbsc.hr_empLongTermAbsc = execParams
      } else {
        changedValues.updated.push({ hr_empLongTermAbsc: execParams })
      }
      conn.run({
        entity: 'hr_empOrderVacationretDet',
        method: 'update',
        isOrderOperation: true,
        __skipOptimisticLock: true,
        execParams: {
          ID: ret.ID,
          changedValues: JSON.stringify(changedValues)
        }
      })
    }
  })

  // Війскова служба
  const empOrderMilservice = conn.Repository('hr_empOrderMilserviceDet')
    .attrs(['ID', 'orderID', 'orderID.organizationID', 'employeeNumberID', 'dateFrom', 'dateTo', 'changedValues'])
    .where('orderID.empOrderType', '=', 'MILSERVICE')
    .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
    .where('orderID.mi_deleteUser', 'isNull')
    .where('cancelParaID', 'isNull')
    .selectAsObject()
  empOrderMilservice.forEach(row => {
    const execParams = {
      organizationID: row['orderID.organizationID'],
      employeeNumberID: row.employeeNumberID,
      dateFrom: row.dateFrom,
      dateTo: row.dateTo,
      orderID: row.orderID,
      paraID: row.ID
    }
    execParams.ID = conn.insert({
      entity: 'hr_empLongTermAbsc',
      fieldList: ['ID'],
      execParams
    })
    const changedValues = row.changedValues ? JSON.parse(row.changedValues) : [{ inserted: [], updated: [] }]
    if (!changedValues.inserted) {
      changedValues.inserted = []
    }
    let empLongTermAbsc = changedValues.inserted.find(o => o['hr_empLongTermAbsc'])
    if (empLongTermAbsc) {
      empLongTermAbsc.hr_empLongTermAbsc = execParams.ID
    } else {
      changedValues.inserted.push({ hr_empLongTermAbsc: execParams.ID })
    }
    conn.run({
      entity: 'hr_empOrderMilserviceDet',
      method: 'update',
      isOrderOperation: true,
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        changedValues: JSON.stringify(changedValues)
      }
    })
  })
  // Повернення з Війскова служба
  const empOrderMilserviceret = conn.Repository('hr_empOrderMilserviceretDet')
    .attrs(['ID', 'orderID', 'orderID.organizationID', 'employeeNumberID', 'dateFrom', 'dateTo', 'sourceParaID', 'changedValues'])
    .where('orderID.empOrderType', '=', 'MILSERVICERET')
    .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
    .where('orderID.mi_deleteUser', 'isNull')
    .where('cancelParaID', 'isNull')
    .selectAsObject()
  empOrderMilserviceret.forEach(ret => {
    const empLong = conn.Repository('hr_empLongTermAbsc')
      .attrs(['ID', 'dateFrom', 'dateTo'])
      .where('employeeNumberID', '=', ret.employeeNumberID)
      .where('paraID', '=', ret.sourceParaID)
      .selectSingle()
    if (empLong) {
      const execParams = {
        ID: empLong.ID,
        dateTo: dateService.addDays(ret.dateFrom, -1),
        changeOrderID: ret.orderID,
        changeParaID: ret.ID
      }
      conn.run({
        entity: 'hr_empLongTermAbsc',
        method: 'update',
        __skipOptimisticLock: true,
        execParams
      })
      const changedValues = ret.changedValues ? JSON.parse(ret.changedValues) : [{ inserted: [], updated: [] }]
      if (!changedValues.updated) {
        changedValues.updated = []
      }
      let empLongTermAbsc = changedValues.updated.find(o => o['hr_empLongTermAbsc'])
      execParams.dateTo = dateService.shiftDate(empLong.dateTo)
      execParams.changeOrderID = null
      execParams.changeParaID = null
      if (empLongTermAbsc) {
        empLongTermAbsc.hr_empLongTermAbsc = execParams
      } else {
        changedValues.updated.push({ hr_empLongTermAbsc: execParams })
      }
      conn.run({
        entity: 'hr_empOrderMilserviceretDet',
        method: 'update',
        isOrderOperation: true,
        __skipOptimisticLock: true,
        execParams: {
          ID: ret.ID,
          changedValues: JSON.stringify(changedValues)
        }
      })
    }
  })
}
