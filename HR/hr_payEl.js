const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const calcService = require('../HR/modules/calcService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.on('delete:before', beforeDelete)
me.on('update:before', beforeUpdate)
me.on('insert:before', beforeInsert)

me.entity.addMethod('updatePayElEntry')
me.entity.addMethod('updateTimeCostEntry')
me.entity.addMethod('updateWorkPlaceEntry')
me.entity.addMethod('updateFundSource')
me.entity.addMethod('updateEntryEl')
me.entity.addMethod('restoreRecord')
me.entity.addMethod('checkDependency')
me.entity.addMethod('deleteRecord')
me.entity.addMethod('copyRecord')

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.code) {
    const codeList = String(execParams.code || '0').match(/\d+/g) || ['0']
    execParams.codeSort = Number(`${(codeList[0] || '0').substring(0, 12)}.${((codeList[1] || '0').padStart(6, '0')).substring(0, 6)}`)
  }
  if (execParams.comment) {
    execParams.comment = execParams.comment.replace(new RegExp(/\n/, 'g'), ' ').replace(new RegExp(/ {2}/, 'g'), ' ').trim()
  }
  if (execParams.methodID) {
    const store = UB.DataStore('hr_payElEntry')
    store.execSQL(`DELETE from hr_payElEntry WHERE payElID = :payElID: and entryType${entityBaseService.getInExpression('entryType')}`,
      { payElID: execParams.ID, entryType: ['SUM', 'TIME', 'PLANSUM', 'MINSUM', 'ADDRETENTION'] })
    store.execSQL(`DELETE from hr_payFundBase WHERE payElID = :payElID:`, { payElID: execParams.ID })
    store.execSQL(`DELETE from hr_payElTaxIndivid WHERE payElID = :payElID:`, { payElID: execParams.ID })
    store.execSQL(`DELETE from hr_payElDepend WHERE payElID = :payElID:`, { payElID: execParams.ID })
    store.execSQL(`DELETE from hr_idParam WHERE valuesID = :payElID:`, { payElID: execParams.ID })
    store.freeNative()
  }
}

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.code) {
    const codeList = String(execParams.code || '0').match(/\d+/g) || ['0']
    execParams.codeSort = Number(`${(codeList[0] || '0').substring(0, 12)}.${((codeList[1] || '0').padStart(6, '0')).substring(0, 6)}`)
  }
  if (execParams.comment) {
    execParams.comment = execParams.comment.replace(new RegExp(/\n/, 'g'), ' ').replace(new RegExp(/ {2}/, 'g'), ' ').trim()
  }
}

me.updatePayElEntry = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_payElEntry')
  data.remove.forEach(row => {
    store.run('delete', { execParams: { ID: row.ID } })
  })
  data.update.forEach(row => {
    store.run('update', {
      __skipOptimisticLock: true,
      skipUpdate: true,
      execParams: {
        ID: row.ID,
        dateFromEmpty: dateService.shiftDate(row.dateFrom),
        dateToEmpty: dateService.shiftDate(row.dateTo)
      }
    })
  })
  data.add.forEach(row => {
    store.run('insert', {
      skipUpdate: true,
      execParams: {
        payElID: mParams.payElID,
        payElBaseID: row.payElBaseID,
        entryType: mParams.entryType,
        dateFromEmpty: dateService.shiftDate(row.dateFrom),
        dateToEmpty: dateService.shiftDate(row.dateTo)
      }
    })
  })
  const res = UB.Repository('hr_payEl').attrs(['methodID.methodGroupID.groupType']).misc({ __allowSelectSafeDeleted: true }).selectById(mParams.payElID)
  if (res['methodID.methodGroupID.groupType'] !== 'FORPAY') {
    calcService.addCalcQueue({ allOrganization: true, description: `Змінено дані hr_payElEntry` })
  }
}

me.updateTimeCostEntry = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_payElTimeCost')
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })
  data.add.forEach(ID => {
    store.run('insert', {
      execParams: {
        payElID: mParams.payElID,
        dictTimeCostID: ID,
        entryType: mParams.entryType,
        dateFromEmpty: null,
        dateToEmpty: null
      }
    })
  })
  const res = UB.Repository('hr_payEl').attrs(['methodID.methodGroupID.groupType']).misc({ __allowSelectSafeDeleted: true }).selectById(mParams.payElID)
  if (res['methodID.methodGroupID.groupType'] !== 'FORPAY') {
    calcService.addCalcQueue({ allOrganization: true, description: `Змінено дані hr_payElTimeCost` })
  }
}

me.updateWorkPlaceEntry = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_payElWorkPlace')
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })
  data.add.forEach(ID => {
    store.run('insert', {
      execParams: {
        payElID: mParams.payElID,
        workPlace: ID
      }
    })
  })
  const res = UB.Repository('hr_payEl').attrs(['methodID.methodGroupID.groupType']).misc({ __allowSelectSafeDeleted: true }).selectById(mParams.payElID)
  if (res['payElID.methodID.methodGroupID.groupType'] !== 'FORPAY') {
    calcService.addCalcQueue({ allOrganization: true, description: `Змінено дані hr_payElWorkPlace` })
  }
}

me.updateFundSource = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_payElFundSource')
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })
  data.add.forEach(ID => {
    store.run('insert', {
      execParams: {
        payElID: mParams.payElID,
        dictFundSourceID: ID,
        dateFromEmpty: null,
        dateToEmpty: null
      }
    })
  })
  const res = UB.Repository('hr_payEl').attrs(['methodID.methodGroupID.groupType']).misc({ __allowSelectSafeDeleted: true }).selectById(mParams.payElID)
  if (res['methodID.methodGroupID.groupType'] !== 'FORPAY') {
    calcService.addCalcQueue({ allOrganization: true, description: `Змінено дані hr_payElFundSource` })
  }
}

me.updateEntryEl = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  Object.keys(data).forEach(settingsKey => {
    switch (settingsKey) {
      case 'payElEntrySum':
      case 'payElEntryTime':
      case 'payElEntryPlanSum':
      case 'payElEntryMinSum': {
        const store = UB.DataStore('hr_payElEntry')
        if (data[settingsKey].length) {
          const entryType = settingsKey === 'payElEntrySum' ? 'SUM' : settingsKey === 'payElEntryTime' ? 'TIME' : settingsKey === 'payElEntryPlanSum' ? 'PLANSUM' : 'MINSUM'
          data[settingsKey].forEach(row => {
            if (row.isChecked) {
              const entryPeriodData = UB.Repository('hr_payElEntry')
                .attrs(['max([dateFrom])', 'max([dateTo])'])
                .where('payElID', '=', row.ID)
                .where('dateTo', '=', '#maxdate')
                .where('entryType', '=', entryType)
                .selectSingle()
              store.run('insert', {
                execParams: {
                  payElID: row.ID,
                  payElBaseID: mParams.payElID,
                  entryType,
                  dateFromEmpty: entryPeriodData['max([dateFrom])'] ? dateService.unshiftDate(entryPeriodData['max([dateFrom])']) : dateService.minDate(),
                  dateToEmpty: entryPeriodData['max([dateTo])'] ? dateService.shiftDate(entryPeriodData['max([dateTo])']) : dateService.maxDate()
                }
              })
            } else {
              store.run('delete', {
                execParams: {
                  ID: row.sourceID
                }
              })
            }
          })
        }
        break
      }
      case 'payFundBase': {
        const store = UB.DataStore('hr_payFundBase')
        if (data[settingsKey].length) {
          data[settingsKey].forEach(row => {
            if (row.isChecked) {
              store.run('insert', {
                execParams: {
                  payFundID: row.ID,
                  payElID: mParams.payElID
                }
              })
            } else {
              store.run('delete', {
                execParams: {
                  ID: row.sourceID
                }
              })
            }
          })
        }
        break
      }
      case 'payElTaxIndivid': {
        const store = UB.DataStore('hr_payElTaxIndivid')
        if (data[settingsKey].length) {
          data[settingsKey].forEach(row => {
            if (row.isChecked) {
              store.run('insert', {
                execParams: {
                  taxIndividID: row.ID,
                  payElID: mParams.payElID
                }
              })
            } else {
              store.run('delete', {
                execParams: {
                  ID: row.sourceID
                }
              })
            }
          })
        }
        break
      }
      case 'payElDepend': {
        const store = UB.DataStore('hr_payElDepend')
        if (data[settingsKey].length) {
          data[settingsKey].forEach(row => {
            if (row.isChecked) {
              store.run('insert', {
                execParams: {
                  ownerID: row.ID,
                  payElID: mParams.payElID,
                  dateFromEmpty: null,
                  dateToEmpty: null
                }
              })
            } else {
              store.run('delete', {
                execParams: {
                  ID: row.sourceID
                }
              })
            }
          })
        }
        break
      }
      case 'idParam': {
        const store = UB.DataStore('hr_idParam')
        if (data[settingsKey].length) {
          data[settingsKey].forEach(row => {
            if (row.isChecked) {
              store.run('insert', {
                execParams: {
                  listParamID: row.ID,
                  valuesID: mParams.payElID,
                  orgID: mParams.orgID
                }
              })
            } else {
              store.run('delete', {
                execParams: {
                  ID: row.sourceID
                }
              })
            }
          })
        }
        break
      }
    }
  })
}

function beforeDelete (ctx) {
  /* let store = UB.DataStore('hr_payElAlimonyLimit')
  UB.Repository('hr_payElAlimonyLimit').attrs(['ID']).where('payElID', '=', ctx.mParams.execParams.ID)
    .selectAsObject().forEach(row => {
      store.run('delete', {
        execParams: {
          ID: row.ID
        }
      })
    })
  store = UB.DataStore('hr_payElEntry')
  UB.Repository('hr_payElEntry').attrs(['ID']).where('payElBaseID', '=', ctx.mParams.execParams.ID)
    .selectAsObject().forEach(row => {
      store.run('delete', {
        execParams: {
          ID: row.ID
        }
      })
    })
  store = UB.DataStore('hr_payElTaxIndivid')
  UB.Repository('hr_payElTaxIndivid').attrs(['ID']).where('payElID', '=', ctx.mParams.execParams.ID)
    .selectAsObject().forEach(row => {
      store.run('delete', {
        execParams: {
          ID: row.ID
        }
      })
    })
  store = UB.DataStore('hr_idParam')
  UB.Repository('hr_idParam').attrs(['ID']).where('valuesID', '=', ctx.mParams.execParams.ID).selectAsObject().forEach(row => {
    store.run('delete', {
      execParams: {
        ID: row.ID
      }
    })
  }) */
}

me.checkDependency = function (ctx) {
  const { params } = ctx.mParams
  const errorMessages = []
  const payEl = UB.Repository('hr_payEl').attrs(['description']).selectById(params.ID)
  const dictKpiAccrual = UB.Repository('hr_dictKpiAccrual')
    .attrs(['ID'])
    .misc({
      __allowSelectSafeDeleted: true
    })
    .where('payElID', '=', params.ID)
    .selectSingle()
  if (dictKpiAccrual) {
    errorMessages.push(UB.i18n(`Вид оплати {0} використовується у нарахуваннях за KPI`, payEl.description))
  } else {
    const payPerm = UB.Repository('hr_payPerm')
      .attrs(['ID'])
      .misc({
        __allowSelectSafeDeleted: true
      })
      .where('payElID', '=', params.ID)
      .selectSingle()
    if (payPerm) {
      errorMessages.push(UB.i18n(`Вид оплати {0} використовується у постійних нарахуваннях/утриманнях організації`, payEl.description))
    } else {
      const employeeAccrual = UB.Repository('hr_employeeAccrual')
        .attrs(['employeeNumberID.description'])
        .misc({
          __allowSelectSafeDeleted: true
        })
        .where('payElID', '=', params.ID)
        .selectSingle()
      if (employeeAccrual) {
        errorMessages.push(UB.i18n(`Вид оплати {0} використовується у постійних нарахуваннях/утриманнях працівника {1}`, payEl.description, employeeAccrual['employeeNumberID.description']))
      } else {
        const employeeCPH = UB.Repository('hr_employeeCPH')
          .attrs(['employeeNumberID.description'])
          .misc({
            __allowSelectSafeDeleted: true
          })
          .where('payElID', '=', params.ID)
          .selectSingle()
        if (employeeCPH) {
          errorMessages.push(UB.i18n(`Вид оплати {0} використовується у договорах ЦПХ працівника {1}`, payEl.description, employeeCPH['employeeNumberID.description']))
        } else {
          const orderRegistryDt = UB.Repository('hr_orderRegistryDt')
            .attrs(['orderRegistryID.description'])
            .misc({
              __allowSelectSafeDeleted: true
            })
            .where('payElID', '=', params.ID)
            .selectSingle()
          if (orderRegistryDt) {
            errorMessages.push(UB.i18n(`Вид оплати {0} використовується у документах нарахування {1}`, payEl.description, orderRegistryDt['orderRegistryID.description']))
          } else {
            const accrual = UB.Repository('hr_accrual')
              .attrs(['employeeNumberID.description'])
              .misc({
                __allowSelectSafeDeleted: true
              })
              .where('payElID', '=', params.ID)
              .selectSingle()
            if (accrual) {
              errorMessages.push(UB.i18n(`Вид оплати {0} використовується у розрахунковому листі працівника {1}`, payEl.description, accrual['employeeNumberID.description']))
            } else {
              const payRoll = UB.Repository('hr_payRoll')
                .attrs(['description'])
                .misc({
                  __allowSelectSafeDeleted: true
                })
                .where('payElID', '=', params.ID)
                .selectSingle()
              if (payRoll) {
                errorMessages.push(UB.i18n(`Вид оплати {0} використовується у відомості на виплату {1}`, payEl.description, payRoll.description))
              }
            }
          }
        }
      }
    }
  }
  ctx.mParams.resultData = JSON.stringify(errorMessages)
}

me.restoreRecord = function (ctx) {
  const { params } = ctx.mParams
  const errorMessages = []
  const store = UB.DataStore(params.entityName)

  JSON.parse(params.data).forEach((item) => {
    try {
      store.execSQL(`update hr_payEl set mi_deleteDate = '9999-12-31', mi_deleteUser = NULL where ID = :ID:`, {
        ID: item.ID
      })
    } catch (e) {
      errorMessages.push(`${item.description} | ${e.toString()}`)
    }
  })
  if (errorMessages.length) {
    throw new UB.UBAbort(`<<<${JSON.stringify(errorMessages)}>>>`)
  }
}

me.deleteRecord = function (ctx) {
  const { params } = ctx.mParams
  const errorMessages = []
  let store = UB.DataStore(params.entityName)
  if (params.safe) {
    const payEl = UB.Repository('hr_payEl').attrs(['ID', 'mi_modifyDate']).selectById(params.ID)
    if (payEl) {
      store.run('delete', {
        execParams: {
          ID: params.ID,
          mi_modifyDate: payEl.mi_modifyDate
        }
      })
    }
  } else {
    try {
      store.execSQL(`delete from hr_payElAlimonyLimit where payElID = :ID:`, { ID: params.ID })
      store.execSQL(`delete from hr_payElEntry where payElID = :ID: or payElBaseID = :ID:`, { ID: params.ID })
      store.execSQL(`delete from hr_payElTaxIndivid where payElID = :ID:`, { ID: params.ID })
      store.execSQL(`delete from hr_payElDepend where payElID = :ID: `, { ID: params.ID })
      store.execSQL(`delete from hr_payElExperience where payElID = :ID: `, { ID: params.ID })
      store.execSQL(`delete from hr_payElRate where payElID = :ID: `, { ID: params.ID })
      store.execSQL(`delete from hr_payElTaxIndividEntry where payElID = :ID: `, { ID: params.ID })
      store.execSQL(`delete from hr_payElTimeCost where payElID = :ID: `, { ID: params.ID })
      store.execSQL(`delete from hr_idParam where valuesID = :ID: `, { ID: params.ID })
      store.execSQL(`delete from hr_payEl where ID = :ID:`, { ID: params.ID })
    } catch (e) {
      errorMessages.push(`${e.toString()}`)
    }
  }
}

function clearMiAttrs (attrs) {
  for (const attr in attrs) {
    // eslint-disable-next-line no-prototype-builtins
    if (attrs.hasOwnProperty(attr)) {
      if (attr.startsWith('mi_')) {
        delete attrs[attr]
      }
    }
  }
}

me.copyRecord = function (ctx) {
  const params = ctx.mParams
  const payEl = UB.Repository(__entityName).attrs('*').selectById(params.ID)
  clearMiAttrs(payEl)
  let store = UB.DataStore(__entityName)
  const payElID = store.generateID()
  payEl.ID = payElID
  payEl.name = payEl.name + ' (копія)'
  store.run('insert', {
    execParams: payEl
  })
  store = UB.DataStore('hr_payElEntry')
  const payElEntry = UB.Repository('hr_payElEntry')
    .attrs(['payElBaseID', 'entryType', 'dateFrom', 'dateTo'])
    .where('payElID', '=', params.ID)
    .groupBy(['payElBaseID', 'entryType', 'dateFrom', 'dateTo'])
    .selectAsObject()
  payElEntry.forEach(row => {
    store.run('insert', {
      execParams: {
        payElID: payElID,
        payElBaseID: row.payElBaseID,
        entryType: row.entryType,
        dateFrom: row.dateFrom,
        dateTo: row.dateTo
      }
    })
  })

  const payElEntryBase = UB.Repository('hr_payElEntry')
    .attrs(['payElID', 'entryType', 'dateFrom', 'dateTo'])
    .where('payElBaseID', '=', params.ID)
    .groupBy(['payElID', 'entryType', 'dateFrom', 'dateTo'])
    .selectAsObject()
  payElEntryBase.forEach(row => {
    store.run('insert', {
      execParams: {
        payElID: row.payElID,
        payElBaseID: payElID,
        entryType: row.entryType,
        dateFrom: row.dateFrom,
        dateTo: row.dateTo
      }
    })
  })

  store = UB.DataStore('hr_payElTaxIndivid')
  const payElTaxIndivid = UB.Repository('hr_payElTaxIndivid')
    .attrs(['taxIndividID'])
    .where('payElID', '=', params.ID)
    .groupBy(['taxIndividID'])
    .selectAsObject()
  payElTaxIndivid.forEach(row => {
    store.run('insert', {
      execParams: {
        payElID: payElID,
        taxIndividID: row.taxIndividID
      }
    })
  })
  store = UB.DataStore('hr_payElDepend')
  const payElDepend = UB.Repository('hr_payElDepend')
    .attrs(['ownerID', 'dateFrom', 'dateTo'])
    .where('payElID', '=', params.ID)
    .groupBy(['ownerID', 'dateFrom', 'dateTo'])
    .selectAsObject()
  payElDepend.forEach(row => {
    store.run('insert', {
      execParams: {
        payElID: payElID,
        ownerID: row.ownerID,
        dateFrom: row.dateFrom,
        dateTo: row.dateTo
      }
    })
  })
  store = UB.DataStore('hr_payElExperience')
  const payElExperience = UB.Repository('hr_payElExperience')
    .attrs(['years', 'months', 'rate', 'dateFrom', 'dateTo'])
    .where('payElID', '=', params.ID)
    .selectAsObject()
  payElExperience.forEach(row => {
    store.run('insert', {
      execParams: {
        payElID: payElID,
        years: row.years,
        months: row.months,
        rate: row.rate,
        dateFrom: row.dateFrom,
        dateTo: row.dateTo
      }
    })
  })
  store = UB.DataStore('hr_payElRate')
  const payElRate = UB.Repository('hr_payElRate')
    .attrs(['rate', 'dateFrom', 'dateTo'])
    .where('payElID', '=', params.ID)
    .selectAsObject()
  payElRate.forEach(row => {
    store.run('insert', {
      execParams: {
        payElID: payElID,
        rate: row.rate,
        dateFrom: row.dateFrom,
        dateTo: row.dateTo
      }
    })
  })
  store = UB.DataStore('hr_payElTaxIndividEntry')
  const payElTaxIndividEntry = UB.Repository('hr_payElTaxIndividEntry')
    .attrs(['taxIndividID', 'dateFrom', 'dateTo'])
    .where('payElID', '=', params.ID)
    .selectAsObject()
  payElTaxIndividEntry.forEach(row => {
    store.run('insert', {
      execParams: {
        payElID: payElID,
        taxIndividID: row.taxIndividID,
        dateFrom: row.dateFrom,
        dateTo: row.dateTo
      }
    })
  })
  store = UB.DataStore('hr_payElTimeCost')
  const payElTimeCost = UB.Repository('hr_payElTimeCost')
    .attrs(['dictTimeCostID', 'dateFrom', 'dateTo', 'entryType'])
    .where('payElID', '=', params.ID)
    .selectAsObject()
  payElTimeCost.forEach(row => {
    store.run('insert', {
      execParams: {
        payElID: payElID,
        dictTimeCostID: row.dictTimeCostID,
        dateFrom: row.dateFrom,
        dateTo: row.dateTo,
        entryType: row.entryType
      }
    })
  })
  store = UB.DataStore('hr_payElAlimonyLimit')
  const payElAlimonyLimit = UB.Repository('hr_payElAlimonyLimit')
    .attrs(['coefficientMin', 'dateFrom', 'coefficientMax'])
    .where('payElID', '=', params.ID)
    .selectAsObject()
  payElAlimonyLimit.forEach(row => {
    store.run('insert', {
      execParams: {
        payElID: payElID,
        coefficientMin: row.coefficientMin,
        dateFrom: row.dateFrom,
        coefficientMax: row.coefficientMax
      }
    })
  })
  store = UB.DataStore('hr_payFundBase')
  const payFundBase = UB.Repository('hr_payFundBase')
    .attrs(['payFundID'])
    .where('payElID', '=', params.ID)
    .selectAsObject()
  payFundBase.forEach(row => {
    store.run('insert', {
      execParams: {
        payElID: payElID,
        payFundID: row.payFundID
      }
    })
  })
  store = UB.DataStore('hr_idParam')
  const idParam = UB.Repository('hr_idParam')
    .attrs(['orgID', 'listParamID', 'orderN'])
    .where('valuesID', '=', params.ID)
    .selectAsObject()
  idParam.forEach(row => {
    store.run('insert', {
      execParams: {
        valuesID: payElID,
        orgID: row.orgID,
        listParamID: row.listParamID
      }
    })
  })
  ctx.mParams.newID = payElID
}
