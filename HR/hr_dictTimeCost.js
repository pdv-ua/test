const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const calcService = require('../HR/modules/calcService')
const dateService = require('../AC/modules/dataServices/dateService')
me.on('delete:before', beforeDelete)
me.on('delete:after', afterDelete)
me.on('update:before', beforeUpdate)
me.on('insert:before', beforeUpdate)
me.entity.addMethod('copyRecord')

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.code || execParams.nameSmall) {
    const existsRow = UB.Repository(__entityName)
      .attrs(['ID', 'code', 'nameSmall'])
      .whereIf(execParams.code, 'code', '=', execParams.code, 'code')
      .whereIf(execParams.nameSmall, 'nameSmall', '=', execParams.nameSmall, 'nameSmall')
      .where('ID', '!=', execParams.ID)
      .logic(`${(execParams.code && execParams.nameSmall) ? '([code] OR [nameSmall])' : '(1=1)'}`)
      .selectSingle()
    if (existsRow) {
      throw new UB.UBAbort(`<<<${UB.i18n('Елемент обліку робочого часу з {0} вже існує! Збереження не можливо!"', existsRow.code === execParams.code ? `кодом "${execParams.code}"` : `короткою назвою "${execParams.nameSmall}"`)}>>>`)
    }
  }
}

function beforeDelete (ctx) {
  const execParams = ctx.mParams.execParams
  const empOrderDetConfig = UB.Repository('hr_empOrderDetConfig')
    .attrs(['empOrderType.name'])
    .where('dictTimeCostID', '=', execParams.ID)
    .selectAsArrayOfValues()

  const workScheduleDays = UB.Repository('hr_workScheduleDays')
    .attrs(['workScheduleID.description'])
    .where('dictTimeCostID', '=', execParams.ID)
    .selectAsArrayOfValues()

  const payEl = UB.Repository('hr_payEl')
    .attrs(['description'])
    .where('dictTimeCostID', '=', execParams.ID, 'dtc')
    .where('dictTimeCostWorkID', '=', execParams.ID, 'dtcw')
    .where('dictTimeCostAvgID', '=', execParams.ID, 'dtca')
    .logic('([dtc] or [dtcw] or [dtca])')
    .selectAsArrayOfValues()

  const store = UB.DataStore('tim_timeSheet')
  store.runSQL(`SELECT en.description, ts.dateWork "dateWork" FROM tim_timeSheet ts 
  JOIN hr_employeeNumber en ON en.ID = ts.employeeNumberID
  JOIN hr_dictPeriod dp ON dp.orgID = en.orgID and dp.dateFrom <= ts.dateWork and dp.dateTo>= ts.dateWork
  WHERE 
  (ts.planTimeCostID = :dictTimeCostID: or ts.factTimeCostID = :dictTimeCostID:) 
  AND (dp.isClosed = 1 or ts.isSchedule = 0)
  AND ts.isCanceled = 0 
  AND ts.mi_deleteDate >= '9999-12-31' 
  GROUP BY en.description, ts.dateWork`,
  {
    dictTimeCostID: execParams.ID
  })
  const timeSheet = store.getAsJsObject()

  store.runSQL(`SELECT CONCAT(ws.code, ' ', ws.name) description, p.dayDate "dayDate" FROM tim_plan p
   JOIN hr_dictPeriod dp ON dp.orgID = p.organizationID
   JOIN hr_workSchedule ws ON ws.ID = p.workScheduleID
   WHERE p.dictTimeCostID = :dictTimeCostID: AND 
    p.mi_deleteDate >= '9999-12-31' 
    GROUP BY ws.name, ws.code, p.dayDate`,
  {
    dictTimeCostID: execParams.ID
  })
  const plan = store.getAsJsObject()

  let wrnText = ''

  const getWrnText = (wrnCode) => {
    switch (wrnCode) {
      case 'empOrderDetConfig':
        wrnText += UB.i18n('у пунктах наказу ') + '"' + empOrderDetConfig.join('", "') + '";'
        break
      case 'workScheduleDays':
        wrnText += UB.i18n('у графіках роботи ') + '"' + workScheduleDays.join('", "') + '";'
        break
      case 'payEl':
        wrnText += UB.i18n('у видах оплати ') + '"' + payEl.join('", "') + '";'
        break
      case 'timeSheet':
        wrnText += UB.i18n('в табелі працівників ')
        timeSheet.forEach(el => {
          wrnText += `${el.description} за ${new Date(el.dateWork).getMonth() + 1}.${new Date(el.dateWork).getFullYear()}, `
        })
        wrnText = wrnText.slice(0, -2) + ';'
        break
      case 'plan':
        wrnText += UB.i18n('у розкладах роботи ')
        plan.forEach(el => {
          wrnText += `${el.description} за ${new Date(el.dayDate).getMonth() + 1}.${new Date(el.dayDate).getFullYear()}, `
        })
        wrnText = wrnText.slice(0, -2) + ';'
        break
    }
  }
  if (empOrderDetConfig.length) getWrnText('empOrderDetConfig')
  if (workScheduleDays.length) getWrnText('workScheduleDays')
  if (payEl.length) getWrnText('payEl')
  if (plan.length) getWrnText('plan')
  if (timeSheet.length) getWrnText('timeSheet')
  if (wrnText !== '') {
    throw new UB.UBAbort(`<<<${UB.i18n('Елемент обліку робочого часу не може бути видалений, бо використовується: ') + wrnText}>>>`)
  }
  // else {
  //   const store = UB.DataStore('hr_dictTimeCostInt')
  //   const data = getDictTimeCostData(execParams.ID)
  //   data.remove.forEach(ID => {
  //     store.run('delete', { execParams: { ID: ID } })
  //   })
  // }
}

function afterDelete () {
  calcService.addCalcPlanQueue({ entityName: 'hr_dictTimeCost' })
}

me.copyRecord = function (ctx) {
  const ID = JSON.parse(ctx.mParams.ID || null)
  if (ID) setCopy(ctx, getDictTimeCostData(ID))
}

function clearMiAttrs (attrs) {
  for (const attr in attrs) {
    if (attrs.hasOwnProperty(attr)) {
      if (attr.startsWith('mi_')) {
        delete attrs[attr]
      }
    }
  }
}

function getDictTimeCostData (ID) {
  const dictTimeCost = UB.Repository('hr_dictTimeCost')
    .attrs(['*'])
    .selectById(ID)
  if (dictTimeCost) {
    dictTimeCost.code = `${dictTimeCost.code} - ${UB.i18n('копія')}`
    dictTimeCost.nameSmall = `${dictTimeCost.nameSmall} - ${UB.i18n('копія')}`
  }
  const otherDictTimeCost = UB.Repository('hr_dictTimeCost')
    .attrs(['ID', 'name'])
    .where('ID', '<>', ID)
    .selectAsObject()
  const dictTimeCost1ID = UB.Repository('hr_dictTimeCostInt')
    .attrs(['*'])
    .where('dictTimeCost1ID', 'in', otherDictTimeCost.map(o => o.ID))
    .where('dictTimeCost2ID', '=', ID)
    .selectAsObject()
  const dictTimeCost2ID = UB.Repository('hr_dictTimeCostInt')
    .attrs(['*'])
    .where('dictTimeCost2ID', 'in', otherDictTimeCost.map(o => o.ID))
    .where('dictTimeCost1ID', '=', ID)
    .selectAsObject()
  return { dictTimeCost, dictTimeCost1ID, dictTimeCost2ID }
}

function setCopy (ctx, data) {
  const dictTimeCostIntStore = UB.DataStore('hr_dictTimeCostInt')
  const dictTimeCostStore = UB.DataStore('hr_dictTimeCost')

  const dictTimeCostID = dictTimeCostStore.generateID()
  clearMiAttrs(data.dictTimeCost)
  data.dictTimeCost.ID = dictTimeCostID

  dictTimeCostStore.run('insert', {
    execParams: data.dictTimeCost
  })

  data.dictTimeCost1ID.forEach(o => {
    clearMiAttrs(o)
    o.dictTimeCost2ID = dictTimeCostID
    delete o.ID
    dictTimeCostIntStore.run('insert', {
      execParams: o
    })
  })
  data.dictTimeCost2ID.forEach(o => {
    clearMiAttrs(o)
    o.dictTimeCost1ID = dictTimeCostID
    delete o.ID
    dictTimeCostIntStore.run('insert', {
      execParams: o
    })
  })
  ctx.mParams.instanceID = dictTimeCostID
}
