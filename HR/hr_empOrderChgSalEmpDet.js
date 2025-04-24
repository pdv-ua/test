const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const moment = require('moment')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.entity.addMethod('fillCancelSalary')
me.entity.addMethod('fillAddSalary')

function setDescription (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  if (execParams.employeePositionID) {
    const pos = UB.Repository('hr_employeePositionS')
      .attrs([
        'employeeNumberID',
        'employeeID',
        'employeeID.firstName',
        'employeeID.lastName',
        'employeeID.middleName',
        'departmentID',
        'positionID',
        'positionID.name',
        'employeeNumberID.tabNum',
        'departmentID.name',
        'description',
        'dictPositionID.name'
      ])
      .where('ID', '=', execParams.employeePositionID)
      .select()
    execParams.firstName = pos.get('employeeID.firstName')
    execParams.lastName = pos.get('employeeID.lastName')
    execParams.middleName = pos.get('employeeID.middleName')

    let order
    if (!execParams.empOrderType && !instanceData.empOrderType && execParams.orderID) {
      order = UB.Repository('hr_empOrder').attrs(['empOrderType', 'organizationID']).where('ID', '=', execParams.orderID).select()
      execParams.empOrderType = order.get('empOrderType')
    }
    if (!execParams.organizationID && !instanceData.organizationID && execParams.orderID) {
      order = order || UB.Repository('hr_empOrder').attrs(['empOrderType', 'organizationID']).where('ID', '=', execParams.orderID).select()
      execParams.organizationID = order.get('organizationID')
    }

    execParams.employeeID = pos.get('employeeID')
    execParams.departmentID = pos.get('departmentID')
    execParams.positionID = pos.get('positionID')
    execParams.employeeNumberID = pos.get('employeeNumberID')
    const posName = pos.get('positionID.name') || pos.get('dictPositionID.name') || ''

    if (pos.get('departmentID.name')) {
      execParams.title = `${posName} ${pos.get('departmentID.name')}  [${pos.get('employeeNumberID.tabNum')}]`
    } else {
      execParams.title = `${posName}  [${pos.get('employeeNumberID.tabNum')}]`
    }
    execParams.description = pos.get('description')
  }
  let payName = ''
  let newValue = execParams.newValue || execParams.accrualRate || execParams.avgCount || execParams.accrualCount

  const empOrderType = execParams.empOrderType || instanceData.empOrderType

  if (execParams.payElID || (execParams.payElID === undefined && instanceData.accrualRate) || newValue !== undefined) {
    if (newValue === undefined) {
      newValue = instanceData.newValue || instanceData.accrualRate || instanceData.avgCount || instanceData.accrualCount
    }
    if (newValue) {
      newValue = newValue.toFixed(2)
    } else {
      newValue = ''
    }
    if (empOrderType === 'OVERPAY') {
      execParams.description = 'Понаднормова праця, ' + newValue + ' годин'
    } else {
      const payEl = UB.Repository('hr_payEl').attrs(['description', 'methodID.valuation']).selectById(execParams.payElID || instanceData.payElID)
      payName = payEl.description
      let vName = execParams.newValue ? ' грн.' : (execParams.accrualRate || (execParams.accrualRate === undefined && instanceData.accrualRate))
        ? ' %' : (execParams.avgCount || (execParams.avgCount === undefined && instanceData.avgCount))
          ? ' середніх' : (execParams.accrualCount || (execParams.accrualCount === undefined && instanceData.accrualCount)) ? ' окладів' : ''
      /* if (!vName) {
        vName = instanceData.newValue ? ' грн.' : instanceData.accrualRate ? ' %' : instanceData.avgCount ? ' середніх' : instanceData.accrualCount ? ' окладів' : ''
      } */
      if ((execParams.empOrderType || instanceData.empOrderType) === 'RISKPAY') { vName = ' годин' }
      execParams.description = `${payName}, ${newValue}${vName}`
      if ((execParams.empOrderType || instanceData.empOrderType) === 'CANCELSALARY') {
        const dateFrom = moment(execParams.dateFrom || instanceData.dateFrom).format('DD.MM.YYYY')
        execParams.descriptionLocal = UB.i18n(`Діє з {0}, {1} {2}`, dateFrom, newValue, execParams.newValue ? UB.i18n(`грн`) : (execParams.accrualRate || instanceData.accrualRate) ? '%' : '')
      }
    }
  }
  if (['BOUNTY', 'BOUNTY_HELP', 'ADDSALARYGOV', 'RISKPAY', 'ADDSALARY'].includes(empOrderType)) {
    let entityName = ''
    switch (empOrderType) {
      case 'BOUNTY':
      case 'BOUNTY_HELP':
        entityName = 'hr_empOrderBountyDet'
        break
      case 'ADDSALARYGOV':
        entityName = 'hr_empOrderAddsalarygovDet'
        break
      case 'ADDSALARY':
        entityName = 'hr_empOrderAddsalaryDet'
        break
      case 'RISKPAY':
        entityName = 'hr_empOrderRiskpayDet'
        break
    }
    const paraID = execParams.paraID || instanceData.paraID
    const item = UB.Repository(entityName)
      .attrs(['dictFundSourceID', 'dictFundSourceID.name', 'dictFundSourceID.nominalName'])
      .selectById(paraID)
    const fundSourceName = item ? (item['dictFundSourceID.nominalName'] || item['dictFundSourceID.name']) : null
    if (fundSourceName) {
      execParams.description = `${execParams.description}, ${UB.i18n('дж. фін.')}: ${fundSourceName}`
    }
    execParams.dictFundSourceID = item ? (item['dictFundSourceID']) : null
  }
}

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.employeePositionID) {
    let empos = UB.Repository('hr_employeePositionS')
      .attrs('posName', 'depName')
      .selectById(ctx.mParams.execParams.employeePositionID)
    execParams.posName = empos.posName
    execParams.depName = empos.depName
  }
  global.hr_empOrderDet.setItemIdx(ctx)
  if (!ctx.mParams.isOrderOperation) {
    ctx.mParams.method = 'insert'
    ebs.setDateTo(ctx)
    setDescription(ctx)
  }
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.employeePositionID) {
    let empos = UB.Repository('hr_employeePositionS')
      .attrs('posName', 'depName')
      .selectById(ctx.mParams.execParams.employeePositionID)
    execParams.posName = empos.posName
    execParams.depName = empos.depName
  }
  if (!ctx.mParams.isOrderOperation) {
    ebs.setDateTo(ctx)
    setDescription(ctx)
  }
}

me.fillCancelSalary = ctx => {
  const mParams = ctx.mParams
  const payElID = mParams.payElID
  const departmentID = mParams.departmentID
  const organizationID = mParams.organizationID
  const orderID = mParams.orderID
  const paraID = mParams.paraID
  const dateFrom = dateService.shiftDate(mParams.dateFrom)
  const empOrderType = 'CANCELSALARY'

  const store = UB.DataStore(__entityName)

  const details = UB.Repository('hr_empOrderChgSalEmpDet')
    .attrs('ID')
    .where('paraID', '=', paraID)
    .selectAsObject()
  details.forEach(det => {
    store.run('delete', {
      execParams: {
        ID: det.ID
      }
    })
  })

  let repo = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeNumberID', 'positionID'])
    .where('organizationID', '=', organizationID)
    .where('positionID', 'isNotNull')
    .where('dateFrom', '<=', dateFrom)
    .where('dateTo', '>=', dateFrom)
    .whereIf(!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess'), 'employeeNumberID.limitedAccess', '=', 0)
  if (departmentID) {
    repo = repo.where('departmentID', '=', departmentID)
  }
  repo = repo.exists(
    UB.Repository('hr_employeeAccrual')
      .attrs('ID')
      .correlation('employeeNumberID', 'employeeNumberID')
      .where('payElID', '=', payElID)
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateFrom)
      .where('mi_deleteDate', '>=', '#maxdate')
  )
  const data = repo.selectAsObject()
  let count = 0
  data.forEach(item => {
    const accruals = UB.Repository('hr_employeeAccrual')
      .attrs(['dateFrom', 'dateTo', 'dateToEmpty', 'accrualSum', 'accrualRate', 'ID'])
      .where('payElID', '=', payElID)
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateFrom)
      .where('employeeNumberID', '=', item.employeeNumberID)
      .selectAsObject()
    accruals.forEach(accr => {
      const sum = accr.accrualSum || null
      const rate = accr.accrualRate || null
      store.run('insert', {
        execParams: {
          employeePositionID: item.ID,
          accrualID: accr.ID,
          newValue: sum,
          positionID: item.positionID,
          accrualRate: rate,
          dateToEmpty: dateFrom,
          dateFrom: accr.dateFrom,
          orderID: orderID,
          paraID: paraID,
          payElID: payElID,
          empOrderType: empOrderType,
          removeAccrual: dateFrom.getTime() === dateService.shiftDate(accr.dateFrom).getTime()
        }
      })
      count++
    })
  })
  mParams.count = count
}

me.fillAddSalary = ctx => {
  const mParams = ctx.mParams
  const payElID = mParams.payElID
  const orderID = mParams.orderID
  const paraID = mParams.paraID
  const dateFrom = dateService.shiftDate(mParams.dateFrom)
  const accrualValue = mParams.accrualValue
  const dateTo = dateService.shiftDate(mParams.dateTo)
  const payType = mParams.payType
  const empOrderType = mParams.empOrderType
  const data = JSON.parse(mParams.data)
  const ds = UB.DataStore(__entityName)
  if (!accrualValue) {
    throw new Error(`<<<${UB.i18n('Не вказано розмір надбавки')}>>>`)
  }
  if (mParams.isDeleteExisting) {
    const existsData = UB.Repository('hr_empOrderChgSalEmpDet')
      .attrs('ID')
      .where('paraID', '=', paraID)
      .selectAsObject()
    existsData.forEach(item => {
      if (UB.Repository('hr_empOrderChgSalEmpDet').attrs('ID').selectById(item.ID)) {
        ds.run('delete', {
          execParams: {
            ID: item.ID
          }
        })
      }
    })
  }
  let repo = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeNumberID', 'positionID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo',
      'dictPositionID', 'dictPositionValue'])
    .where('ID', 'in', data.map(item => item.employeePositionID))
    .orderBy('employeeNumberID')
    .orderBy('dateFrom', 'desc')
  // .where('positionID', 'isNotNull')
  repo = repo.notExists(
    UB.Repository('hr_empOrderChgSalEmpDet')
      .attrs('ID')
      .correlation('employeeNumberID', 'employeeNumberID')
      .where('payElID', '=', payElID)
      .where('orderID', '=', orderID)
      .where('mi_deleteDate', '>=', '#maxdate')
  )
  repo = repo.selectAsObject()
  let count = 0
  const addedEmpNums = []
  repo.forEach(item => {
    if (!addedEmpNums.includes(item.employeeNumberID)) {
      const enDateFrom = dateService.shiftDate(item['employeeNumberID.dateFrom'])
      UB.DataStore(__entityName).run('insert', {
        execParams: {
          employeePositionID: item.ID,
          positionID: item.positionID,
          newValue: payType === 'SUM' ? accrualValue : null,
          accrualRate: payType !== 'SUM' ? accrualValue : null,
          dateToEmpty: dateTo || '#maxdate',
          dateFrom: enDateFrom > dateFrom ? enDateFrom : dateFrom,
          orderID: orderID,
          paraID: paraID,
          payElID: payElID,
          empOrderType: empOrderType,
          dictPositionID: item.dictPositionID,
          dictPositionValue: item.dictPositionValue
        }
      })
      count++
      addedEmpNums.push(item.employeeNumberID)
    }
  })
  mParams.count = count
}
