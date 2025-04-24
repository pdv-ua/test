const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.entity.addMethod('updatePayElEntry')
me.entity.addMethod('checkPayElEntry')
me.entity.addMethod('normalizePayElEntry')

me.on('delete:before', beforeDelete)

function findPayElEntry (ID, taxIndividID, dateFrom, dateTo) {
  return UB.Repository('hr_payElTaxIndivid')
    .attrs('ID', 'taxIndividID', 'taxIndividID.name', 'payElID.description')
    .where('payElID', '=', ID, 'payEl')
    .where('taxIndividID', '!=', taxIndividID, 'taxIndivid')
    .where('taxIndividID.dateTo', '>=', dateFrom, 'dateTo1')
    .where('taxIndividID.dateTo', '<=', dateTo, 'dateTo2')
    .where('taxIndividID.dateFrom', '>=', dateFrom, 'dateFrom1')
    .where('taxIndividID.dateFrom', '<=', dateTo, 'dateFrom2')
    .where('taxIndividID.dateFrom', '<=', dateFrom, 'dateFrom3')
    .where('taxIndividID.dateTo', '>=', dateTo, 'dateTo3')
    .where('taxIndividID.mi_deleteDate', '>=', '#maxdate', 'deleteDate')
    .logic('([payEl] AND [taxIndivid] AND [deleteDate]) AND (([dateTo1] AND [dateTo2]) OR ([dateFrom1] AND [dateFrom2]) OR ([dateFrom3] AND [dateTo3]))')
    .selectAsObject()
}

function checkPayElList (data, taxIndividID) {
  const errors = []
  const taxIndivid = UB.Repository('hr_dictTaxIndivid').attrs('dateFrom', 'dateTo').selectById(taxIndividID)

  data.add.forEach(ID => {
    const payElEntryList = findPayElEntry(ID, taxIndividID, taxIndivid.dateFrom, taxIndivid.dateTo)
    payElEntryList.forEach(payElEntry => {
      errors.push({ ID: payElEntry.ID, payElID: ID, taxIndivid: payElEntry['taxIndividID.name'], name: payElEntry['payElID.description'] })
    })
  })
  return errors
}
function beforeDelete (ctx) {
  const { mParams } = ctx
  const { execParams } = mParams
  let store = UB.DataStore('hr_taxIndividAcc')
  store.runSQL(`
  select p.ID, p.name from hr_dictTaxIndivid t
  join hr_payElTaxIndivid dt on dt.taxIndividID = t.ID
  join hr_payEl pe on pe.ID = dt.payElID
  join hr_accrual a on a.payElID = dt.payElID
  join hr_dictPeriod p on p.ID = a.periodCalcID
  where p.isClosed = 1
  and t.ID = :taxIndividID:
  and dt.mi_deleteDate = '9999-12-31'
  group by p.name, p.ID`, {
    taxIndividID: execParams.ID
  })
  let data = store.getAsJsObject()

  store.runSQL(`
  select pe.ID, pe.name from hr_dictTaxIndivid t
  join hr_payElTaxIndivid dt on dt.taxIndividID = t.ID
  join hr_payEl pe on pe.ID = dt.payElID
  join hr_accrual a on a.payElID = dt.payElID
  join hr_dictPeriod p on p.ID = a.periodCalcID
  where (a.flagsRec & 1 != 1)
  and p.isCurrent = 1
  and dt.mi_deleteDate = '9999-12-31'
  and t.ID = :taxIndividID:
  group by pe.ID, pe.name`, {
    taxIndividID: execParams.ID
  })
  let currentPeriodData = store.getAsJsObject()
  const errorStr = 'Є нарахування по вказаному виду доходу у закритих періодах {0}! Видалити не можливо!'
  const curPeriodErrorStr = 'Є нарахування по вказаному виду доходу в поточному періоді, що додані вручну або документом {0}! Видалити не можливо!'

  if (data.length && !currentPeriodData.length) throw new UB.UBAbort(`<<<${UB.i18n(errorStr, data.map(o => o.name).join(', '))}>>>`)
  if (!data.length && currentPeriodData.length) throw new UB.UBAbort(`<<<${UB.i18n(curPeriodErrorStr, currentPeriodData.map(o => o.name).join(', '))}>>>`)
  if (data.length && currentPeriodData.length) throw new UB.UBAbort(`<<<${UB.i18n(`${UB.i18n(errorStr, data.map(o => o.name).join(', '))}; ${UB.i18n(curPeriodErrorStr, currentPeriodData.map(o => o.name).join(', '))}`)}>>>`)
}
me.updatePayElEntry = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_payElTaxIndivid')
  const errors = checkPayElList(data, mParams.taxIndividID)
  if (errors.length) {
    if (mParams.movePayEls) {
      errors.forEach(o => {
        data.remove.push(o.ID)
      })
    } else {
      throw new UB.UBAbort(`<<<${UB.i18n('Вид оплати "{0}" входить до виду доходів "{1}"!', errors[0].name, errors[0].taxIndivid)}>>>`)
    }
  }

  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })

  data.add.forEach(ID => {
    store.run('insert', { execParams: { taxIndividID: mParams.taxIndividID, payElID: ID } })
  })
}

me.checkPayElEntry = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const errors = checkPayElList(data, mParams.taxIndividID)
  ctx.mParams.errors = JSON.stringify(errors)
}

me.normalizePayElEntry = function (ctx) {
  const payElEntryDel = UB.Repository('hr_payElTaxIndivid')
    .attrs(['ID', 'taxIndividID', 'taxIndividID.code', 'taxIndividID.name', 'payElID', 'payElID.code', 'payElID.name'])
    .where('taxIndividID.mi_deleteDate', '!=', '#maxdate')
    .selectAsObject()
  const payElEntryStore = UB.DataStore('hr_payElTaxIndivid')
  payElEntryDel.forEach(item => {
    payElEntryStore.run(
      'delete',
      {
        execParams: {
          ID: item.ID
        }
      }
    )
  })
  const dictTaxIndivid = UB.Repository(__entityName)
    .attrs(['ID', 'code'])
    .orderBy('code', 'desc')
    .selectAsObject()
  const result = []
  dictTaxIndivid.forEach(item => {
    const payElEntry = UB.Repository('hr_payElTaxIndivid')
      .attrs(['ID', 'taxIndividID', 'taxIndividID.code', 'taxIndividID.name', 'payElID', 'payElID.code', 'payElID.name'])
      .where('taxIndividID', '=', item.ID)
      .exists(
        UB.Repository('hr_payElTaxIndivid')
          .attrs('ID')
          .correlation('payElID', 'payElID')
          .where('taxIndividID.code', '>', item.code)
          .where('mi_deleteDate', '>=', '#maxdate')
          .where('taxIndividID.mi_deleteDate', '>=', '#maxdate')
      )
      .selectAsObject()
    result.push(...payElEntry)
  })
  result.forEach(item => {
    payElEntryStore.run(
      'delete',
      {
        execParams: {
          ID: item.ID
        }
      }
    )
  })
}
