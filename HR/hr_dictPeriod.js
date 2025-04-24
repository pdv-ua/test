
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const App = UB.App
const dateService = require('../AC/modules/dataServices/dateService')
const periodService = require('../HR/modules/periodService')

me.on('update:before', beforeUpdate)
me.on('insert:before', beforeInsert)
me.on('delete:before', beforeDelete)

me.entity.addMethod('getCurrentPeriodData')
me.entity.addMethod('calcPeriodData')
me.entity.addMethod('closePeriod')
me.entity.addMethod('openPeriod')

function beforeDelete (ctx) {
  throw new UB.UBAbort(`<<<${UB.i18n('Заборонено видаляти період')}>>>`)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.formData) {
    setStatePeriod(ctx)
  }
  setPeriod(ctx)
}

function beforeInsert (ctx) {
  setPeriod(ctx)
}

function setPeriod (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || { }
  const execParams = ctx.mParams.execParams
  let month = UB.Repository('ac_dictMonth').attrs(['code', 'name']).selectById(execParams.dictMonthID || instanceData.dictMonthID)
  if (execParams.pYear || execParams.dictMonthID) {
    let date = new Date(execParams.pYear || instanceData.pYear, month.code, 0)
    execParams.dateFrom = dateService.shiftDate(new Date(execParams.pYear || instanceData.pYear, month.code - 1, 1, 0, 0, 0))
    execParams.dateTo = dateService.shiftDate(new Date(execParams.pYear || instanceData.pYear, month.code - 1, date.getDate(), 0, 0, 0))
  }
  let suffix = `${(execParams.isCurrent || (execParams.isCurrent === undefined && instanceData.isCurrent))
    ? UB.i18n('Поточний') : ''}${(execParams.isClosed || (execParams.isClosed === undefined && instanceData.isClosed)) ? UB.i18n('Закритий') : ''}${(execParams.isBlock ||
    (execParams.isBlock === undefined && instanceData.isBlock)) ? `, ${UB.i18n('Заблокований')}` : ''}`
  if (suffix) suffix = ` (${suffix})`
  execParams.description = `${month.name} ${execParams.pYear || instanceData.pYear}${suffix}`
  execParams.name = `${month.name} ${execParams.pYear || instanceData.pYear}`
}
me.getCurrentPeriodData = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_dictPeriod')
  store.runSQL(` SELECT p.ID "ID", p.isClosed "isClosed", p.isCurrent "isCurrent", p.isBlock "isBlock", p.name as "periodName",
  (select count(*) from hr_orderRegistry hor where hor.organizationID = :orgID: and hor.periodID = p.ID and hor.mi_deleteDate >= :maxdate:) AS "orderRegCount",  
  (select count(*) from hr_orderRegistry hor where hor.organizationID = :orgID: and hor.periodID = p.ID and hor.mi_deleteDate >= :maxdate: and hor.orderState = 'PROJECT') AS "orderRegCountNotPost",  
  (select count(*) from hr_payRoll hpr where hpr.organizationID = :orgID: and hpr.periodCalcID = p.ID and hpr.mi_deleteDate >= :maxdate:) AS "payRollCount",  
  (select count(*) from hr_payRoll hpr where hpr.organizationID = :orgID: and hpr.periodCalcID = p.ID and hpr.mi_deleteDate >= :maxdate: and hpr.orderState = 'PROJECT') AS "payRollCountNotPost"  
   FROM hr_dictPeriod p where p.orgID = :orgID: and p.isCurrent = 1`,
  {
    orgID: mParams.orgID,
    maxdate: dateService.maxDate()
  })
  const data = store.getAsJsObject()
  store.freeNative()
  Object.assign(mParams, data.length ? data[0]
    : {
      periodName: '',
      orderRegCount: 0,
      orderRegCountNotPost: 0,
      payRollCount: 0,
      payRollCountNotPost: 0
    }
  )
}

me.calcPeriodData = function (ctx) {
  const mParams = ctx.mParams
  const orgID = mParams.orgID
  const period = periodService.getCurrentPeriod(orgID)
  if (period && !period.isCurrent) {
    throw new UB.UBAbort(`<<<${UB.i18n('Немає поточного періода')}>>>`)
  }
}

function setStatePeriod (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || { }
  const periodHistoryStore = UB.DataStore('hr_dictPeriodHistory')
  const period = UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'orgID', 'isClosed', 'isCurrent', 'priorPeriodID', 'nextPeriodID', 'dateFrom', 'dateTo',
      'priorPeriodID.isClosed', 'priorPeriodID.isCurrent', 'nextPeriodID.isClosed', 'nextPeriodID.isCurrent' ])
    .selectById(execParams.ID)
  period.dateFrom = dateService.shiftDate(period.dateFrom)
  period.dateTo = dateService.shiftDate(period.dateTo)
  if (instanceData.isCurrent && mParams.formData.isClosed) {
    execParams.isClosed = 1
    execParams.isCurrent = 0
    // periodService.closeCurrentPeriod(period)
    periodHistoryStore.run('insert', {
      execParams: {
        periodID: period.ID,
        dateFrom: new Date(),
        periodState: 'CLOSE',
        appVersion: App.domainInfo.models.HR.version,
        platformVersion: process.version
      }
    })
  } else if (!instanceData.isCurrent && !instanceData.isClosed && mParams.formData.isClosed) {
    const closedPeriods = UB.Repository('hr_dictPeriod')
      .attrs(['name'])
      .where('orgID', '=', period.orgID)
      .where('isClosed', '=', 1)
      .selectSingle()
    if (closedPeriods && !period['priorPeriodID.isClosed']) {
      throw new UB.UBAbort(`<<<${UB.i18n('Необхідно закрити попередній період')}>>>`)
    }
    execParams.isClosed = 1
    execParams.isCurrent = 0
    // periodService.closeCurrentPeriod(period)
    periodHistoryStore.run('insert', {
      execParams: {
        periodID: period.ID,
        dateFrom: new Date(),
        periodState: 'CLOSE',
        appVersion: App.domainInfo.models.HR.version,
        platformVersion: process.version
      }
    })
  } else if ((instanceData.isClosed || instanceData.isCurrent) && !mParams.formData.isClosed && !mParams.formData.isCurrent) {
    if (period['nextPeriodID.isClosed'] || period['nextPeriodID.isCurrent']) {
      throw new UB.UBAbort(`<<<${UB.i18n('Наступний період має бути в стані "Відкритий"')}>>>`)
    }
    execParams.isClosed = 0
    execParams.isCurrent = 0
    periodHistoryStore.run('insert', {
      execParams: {
        periodID: period.ID,
        dateFrom: new Date(),
        periodState: 'OPEN',
        appVersion: App.domainInfo.models.HR.version,
        platformVersion: process.version
      }
    })
    /* if (instanceData.isCurrent) {
      periodService.openCurrentPeriod(period)
    } */
  } if (instanceData.isClosed && mParams.formData.isCurrent) {
    execParams.isClosed = 0
    execParams.isCurrent = 1
    const dictPeriod = UB.Repository('hr_dictPeriod')
      .attrs('description')
      .where('orgID', '=', period.orgID)
      .where('isCurrent', '=', 1)
      .where('ID', '!=', execParams.ID)
      .selectSingle()
    if (dictPeriod) {
      throw new UB.UBAbort(`<<<${UB.i18n('Вже існує поточний період {0}', dictPeriod.description)}>>>`)
    }
    periodHistoryStore.run('insert', {
      execParams: {
        periodID: period.ID,
        dateFrom: new Date(),
        periodState: 'CURRENT',
        appVersion: App.domainInfo.models.HR.version,
        platformVersion: process.version
      }
    })
  } else if (!instanceData.isClosed && !instanceData.isCurrent && mParams.formData.isCurrent) {
    execParams.isClosed = 0
    execParams.isCurrent = 1
    const dictPeriod = UB.Repository('hr_dictPeriod')
      .attrs('description')
      .where('orgID', '=', instanceData.orgID)
      .where('isCurrent', '=', 1)
      .where('ID', '!=', execParams.ID)
      .selectSingle()
    if (dictPeriod) {
      throw new UB.UBAbort(`<<<${UB.i18n('Вже існує поточний період {0}', dictPeriod.description)}>>>`)
    }
    const closedPeriods = UB.Repository('hr_dictPeriod')
      .attrs(['name'])
      .where('orgID', '=', period.orgID)
      .where('isClosed', '=', 1)
      .selectSingle()
    if (closedPeriods && !period['priorPeriodID.isClosed']) {
      throw new UB.UBAbort(`<<<${UB.i18n('Необхідно закрити попередній період')}>>>`)
    }

    periodHistoryStore.run('insert', {
      execParams: {
        periodID: period.ID,
        dateFrom: new Date(),
        periodState: 'CURRENT',
        appVersion: App.domainInfo.models.HR.version,
        platformVersion: process.version
      }
    })
  }
}

me.closePeriod = function (ctx) {
  const mParams = ctx.mParams
  const orgID = mParams.orgID
  const period = periodService.getCurrentPeriod(orgID)
  if (mParams.period.ID === period.ID && period.isCurrent && (new Date(period.mi_modifyDate)).getTime() === (new Date(mParams.period.mi_modifyDate)).getTime()) {
    periodService.closePeriod(period)
  } else {
    throw new UB.UBAbort(`<<<${UB.i18n('Немає поточного періода')} ${UB.i18n('або стан періода змінено')}>>>`)
  }
}

me.openPeriod = function (ctx) {
  const mParams = ctx.mParams
  const orgID = mParams.orgID
  const period = periodService.getCurrentPeriod(orgID)
  if (period && mParams.period.nextPeriodID === period.ID && period.isCurrent) {
    period['nextPeriodID.mi_modifyDate'] = mParams.period.mi_modifyDate
    periodService.openPeriod(period)
  } else {
    throw new UB.UBAbort(`<<<${UB.i18n('Немає поточного періода')} ${UB.i18n('або стан періода змінено')}>>>`)
  }
}
