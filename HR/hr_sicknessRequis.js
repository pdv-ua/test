const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const accrualService = require('../HR/modules/accrualService')
const algorithmService = require('../HR/modules/algorithmService')
const periodService = require('../HR/modules/periodService')

me.on('insert:after', afterInsert)
me.on('select:after', afterSelect)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.on('delete:before', beforeDelete)
me.on('delete:after', afterDelete)

me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
me.entity.addMethod('getOrderNum')
me.entity.addMethod('getSicknessList')
me.entity.addMethod('makeSicknessList')
me.entity.addMethod('calc')
me.entity.addMethod('updateSicknessRequisOrg')
me.entity.addMethod('normalizeSicknessRequisOrg')

me.details = [
  {
    detailName: 'sicknessRequisDt',
    entityName: 'hr_sicknessRequisDt',
    docIDName: 'sicknessRequisID',
    fieldList: orderService.setFieldListAttribute([
      'employeeNumberID', 'employeeNumberID.tabNum', 'orderID', 'payElID', 'payElID.name', 'paySum', 'orderName',
      'number', 'orderDate', 'orderPrim', 'employeeNumberID.employeeID.fullFIO', 'payDays', 'seria', 'payDaysAll',
      'paySumAll', 'accrualDt', 'sourceID', 'dictSicknessCauseID.name', 'sicknessCauseText', 'payDaysChNPP', 'paySumChNPP',
      'employeeSickLimitID.dictSickLimitID.name', 'msekDateTo', 'employeeDocID.description', 'employeeNumberID.employeeID',
      'dateFirst', 'dictSicknessCauseID.isOther'
    ], ['lineNum']),
    orderBy: 'employeeNumberID.tabNumSort'
  }
]

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  orderService.saveDetails(ctx, me.details)
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function beforeUpdate (ctx) {
  orderService.saveDetails(ctx, me.details)
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.orderState) {
    if (execParams.orderState === 'POSTED') {
      me.doPosting(ctx)
    }
    if (execParams.orderState === 'PROJECT') {
      me.doCancelPosting(ctx)
    }
  }
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    ctx.mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore
  if (ctx.mParams.isOrderOperation) {
    return
  }
  if (instanceData.get('orderState') !== 'PROJECT') {
    throw new UB.UBAbort(`<<<${UB.i18n('Заява-розрахунок {0} - проведено. Видалення неможливе.', instanceData.get('description'))}>>>`)
  }
  const ID = instanceData.get('ID')
  const existRollRequis = UB.Repository('hr_RollRequis')
    .attrs(['ID', 'payRollID.orderNumber'])
    .where('sicknessRequisID', '=', ID)
    .selectSingle({ 'payRollID.orderNumber': 'orderNumber' })
  if (existRollRequis) {
    throw new UB.UBAbort(`<<<${UB.i18n('Заява-розрахунок {0} додана в платіжну відомість № {1}. Видалення неможливе.', instanceData.get('description'), existRollRequis.orderNumber)}>>>`)
  }
}

function afterDelete (ctx) {
  const execParams = ctx.mParams.execParams
  const orderStore = UB.DataStore('hr_sicknessRequisDt')
  const sicknessRequisDt = UB.Repository('hr_sicknessRequisDt')
    .attrs(['ID', 'mi_modifyDate'])
    .where('sicknessRequisID', '=', execParams.ID)
    .selectAsObject()
  sicknessRequisDt.forEach(record => {
    orderStore.run('delete', {
      execParams: {
        ID: record.ID,
        mi_modifyDate: record.mi_modifyDate
      }
    })
  }
  )
}

me.doPosting = function (ctx) {

}

me.doCancelPosting = function (ctx) {
  const execParams = ctx.mParams.execParams
  const payRollRequis = UB.Repository('hr_RollRequis')
    .attrs(['ID', 'payRollID.description', 'payRollID.orderNumber', 'payRollID.orderDate'])
    .where('sicknessRequisID', '=', execParams.ID)
    .selectSingle()
  if (payRollRequis) {
    throw new UB.UBAbort(`<<<${UB.i18n('Заявка  додана у платіжну відомість № {0} {1}. Скасувати проведення не можливо!', payRollRequis['payRollID.orderNumber'], payRollRequis['payRollID.description'])}>>>`)
  }
}

me.getOrderNum = function (ctx) {
  const mParams = ctx.mParams
  mParams.orderNumber = orderService.getOrderNum(__entityName, mParams.onDate, mParams.orgID)
}

me.getSicknessList = function (ctx) {
  const mParams = ctx.mParams
  const params = mParams.execParams
  const resultData = []
  const errors = []
  const accrualErrors = []
  let orgIDs
  if (params.includeSubOrg) {
    const orgList = UB.Repository('hr_sicknessRequisOrg')
      .attrs('subOrgID')
      .where('orgID', '=', params.orgID)
      .selectAsObject()
    orgIDs = orgList.map(o => o.subOrgID)
  }
  let allDeptsID = []
  if (params.departmentID) {
    let depIDs = params.departmentID
    if (params.includeSubDep) {
      for (let i = 0; i < depIDs.length; i++) {
        let childDep = UB.Repository('hr_department')
          .attrs('mi_data_id')
          .where('mi_treePath', 'like', `%${depIDs[i]}%`)
          .where('state', '=', 'ACTIVE')
          .where('mi_deleteDate', '>=', '9999-12-31')
          .where('mi_dateFrom', '<=', params.periodSalary)
          .where('mi_dateTo', '>=', params.periodSalary)
          .selectAsArrayOfValues()
        allDeptsID = allDeptsID.concat(childDep)
      }
    } else {
      allDeptsID = [depIDs]
    }
  }
  if (params.dictMultiGroupID) {
    const dictMultiGroupID = params.dictMultiGroupID
    const dictMultiGroupDepsID = UB.Repository('hr_dictMultiGroupDep')
      .attrs('departmentID')
      .where('dictMultiGroupID', '=', dictMultiGroupID)
      .selectAsArrayOfValues()
    if (dictMultiGroupDepsID.length) {
      if (params.includeSubDepGroup) {
        for (let i = 0; i < dictMultiGroupDepsID.length; i++) {
          const childDep = UB.Repository('hr_department')
            .attrs('mi_data_id')
            .where('mi_treePath', 'like', `%${dictMultiGroupDepsID[i]}%`)
            .where('state', '=', 'ACTIVE')
            .where('mi_deleteDate', '>=', '9999-12-31')
            .where('mi_dateFrom', '<=', params.periodSalary)
            .where('mi_dateTo', '>=', params.periodSalary)
            .misc({ __mip_recordhistory_all: true })
            .selectAsArrayOfValues()
          allDeptsID = allDeptsID.concat(childDep)
        }
      } else {
        allDeptsID = dictMultiGroupDepsID
      }
    }
  }

  const payElFSS = UB.Repository('hr_payEl')
    .attrs('ID', 'description')
    .where('dictFundSourceID.dictFundTypeID.code', '=', '02')
    .where('methodID.methodGroupID.groupType', '=', 'PAYMENT')
    .selectAsObject()
  if (payElFSS.length && !mParams.skipCheckErrors) {
    payElFSS.forEach(row => {
      const accrualsFSS = UB.Repository('hr_accrual')
        .attrs('ID')
        .where('payElID', '=', row.ID)
        .where('periodCalc', '<=', params.periodSalary)
        .where('payElID', 'notIn', UB.Repository('hr_dictFssReqDt').attrs('payElID'))
        .where('ID', 'notIn',
          UB.Repository('hr_sicknessRequisAccrual')
            .attrs('accrualID')
        )
        .selectSingle()
      if (accrualsFSS) {
        errors.push(row.description)
      }
    })
  }
  const payElIDs = UB.Repository('hr_dictFssReqDt')
    .attrs(['payElID'])
    .where('dictFssReqID', '=', params.dictFssReqID)
    .selectAsObject().map(o => o.payElID)
  if (!payElIDs.length) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не виконано настройку довідника Типи заявок СС. Визначте перелік видів оплати для кожного типу заявки')}>>>`)
  }
  const accrualsRaw = UB.Repository('hr_accrual')
    .attrs(['ID', 'employeeNumberID', 'orderID', 'payElID', 'days', 'paySum', 'flagsRec', 'orderID.description'])
    .where('payElID', 'in', payElIDs)
    .whereIf(orgIDs, 'employeeNumberID.orgID', 'in', orgIDs)
    .whereIf(!orgIDs, 'employeeNumberID.orgID', '=', params.orgID)
    .where('periodCalc', '<=', params.periodSalary)
    .where('payElID.mi_deleteUser', 'isNull')
    .where(`((flagsRec & 8192 = 0) AND (flagsRec & 4096 = 0))`, 'custom')
    .where('ID', 'notIn',
      UB.Repository('hr_sicknessRequisAccrual')
        .attrs('accrualID')
        .where('sicknessRequisDtID', 'notIn',
          UB.Repository('hr_sicknessRequisDt')
            .attrs('ID')
            .where('sicknessRequisID', '=', params.sicknessID)
        )
    )
    .orderBy('employeeNumberID.tabNumSort')
    .selectAsObject()
  const dictSicknessCause = UB.Repository('hr_dictSicknessCause')
    .attrs(['ID', 'code', 'name', 'isOther'])
    .selectAsObject()
  const docs = []
  const accruals = []
  accrualsRaw.forEach(accr => {
    const sicknessReqAccr = accr.orderID ? UB.Repository('hr_sicknessRequisAccrual')
      .attrs('ID', 'sicknessRequisDtID.sicknessRequisID')
      .where('sicknessRequisDtID.sicknessRequisID', '!=', params.sicknessID)
      .where('accrualID', 'in',
        UB.Repository('hr_accrual')
          .attrs('ID')
          .where('orderID', '=', accr.orderID)
          .where('payElID', 'in', payElIDs)
      )
      .selectAsObject() : []
    if (sicknessReqAccr.length) {
      sicknessReqAccr.forEach(item => {
        docs.push({ orderID: accr.orderID, orderDescription: accr['orderID.description'], sicknessRequisID: item['sicknessRequisDtID.sicknessRequisID'] })
      })
    } else {
      if ((!(accr.flagsRec & 512) && !(accr.flagsRec & 1024)) || (accr.flagsRec & 8)) {
        accruals.push(accr)
      }
    }
  })
  if (docs.length) {
    const sicknessRequis = UB.Repository(__entityName)
      .attrs(['ID', 'description'])
      .where('ID', 'in', docs.map(o => o.sicknessRequisID))
      .where('ID', '!=', params.sicknessID)
      .selectAsObject()
    docs.forEach(doc => {
      const sq = sicknessRequis.find(o => o.ID === doc.sicknessRequisID) || {}
      const desc = `${doc.orderDescription} - ${sq.description || ''}`
      if (!accrualErrors.find(o => o === desc)) accrualErrors.push(desc)
    })
  }
  const res = []
  accruals.forEach(accr => {
    const reversal = UB.Repository('hr_accrual')
      .attrs(['ID', 'paySum', 'days', 'flagsRec'])
      .where('employeeNumberID', '=', accr.employeeNumberID)
      .where('linkToParentID', '=', accr.ID)
      .where(`((flagsRec & 4096 != 4096) AND ((flagsRec & 512 = 512) OR (flagsRec & 1024 = 1024)))`, 'custom')
      .selectAsObject()
    reversal.forEach(rev => {
      accr.paySum = accrualService.round(accr.paySum + rev.paySum)
      if (rev.flagsRec & 1 << 9) {
        accr.days = accr.days + rev.days
      }
    })

    accr.sourceID = accr.ID
    accr.accrualDt = algorithmService.correctAccrualDt(UB.Repository('hr_accrualDt')
      .attrs(['ID', 'accrualID', 'paySum', 'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'departmentID', 'accountID',
        'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
        'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value'])
      .where('accrualID', '=', accr.ID)
      .selectAsObject(), accr.paySum)

    const emp = accr.orderID
      ? res.find(o => o.employeeNumberID === accr.employeeNumberID && o.orderID === accr.orderID && o.payElID === accr.payElID)
      : null
    if (emp) {
      emp.days += accr.days
      emp.paySum += accr.paySum
      emp.accrualDt = emp.accrualDt.concat(accr.accrualDt)
    } else {
      res.push(accr)
    }
  })
  let isAdd = false
  res.forEach(row => {
    isAdd = true
    if (allDeptsID.length) {
      const lastEmpPos = UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'departmentID'])
        .where('dateFrom', '<=', params.periodSalary)
        .where('employeeNumberID', '=', row.employeeNumberID)
        .orderBy('dateFrom', 'desc')
        .limit(1)
        .selectSingle()
      isAdd = allDeptsID.includes(lastEmpPos['departmentID'])
    }
    if (isAdd) {
      const fssItem = {}
      fssItem.accrualDt = JSON.stringify(row.accrualDt)
      fssItem.employeeNumberID = row.employeeNumberID
      fssItem.orderID = row.orderID
      fssItem.sourceID = row.sourceID
      fssItem.payElID = row.payElID
      fssItem.payDays = row.days
      fssItem.paySum = row.paySum
      fssItem.payDaysAll = 0
      fssItem.paySumAll = 0
      fssItem.orderName = ''
      fssItem.seria = ''
      fssItem.number = ''
      fssItem.orderDate = ''
      fssItem.orderPrim = ''
      fssItem.dateFirst = null
      fssItem.msekDateTo = null
      fssItem.employeeSickLimitID = null
      fssItem['employeeSickLimitID.dictSickLimitID.name'] = null
      fssItem.dictSicknessCauseID = null
      fssItem['dictSicknessCauseID.name'] = null
      fssItem['dictSicknessCauseID.isOther'] = null
      const employee = UB.Repository('hr_employeeNumberS')
        .attrs(['tabNum', 'employeeID.fullFIO', 'employeeID'])
        .misc({ __allowSelectSafeDeleted: true })
        .selectById(row.employeeNumberID, { 'employeeID.fullFIO': 'fullFIO' })
      const payEl = UB.Repository('hr_payEl')
        .attrs('name')
        .selectById(row.payElID)
      fssItem['employeeNumberID.tabNum'] = employee.tabNum
      fssItem['employeeNumberID.employeeID'] = employee.employeeID
      fssItem['employeeNumberID.employeeID.fullFIO'] = employee.fullFIO
      fssItem['payElID.name'] = payEl.name
      if (row.orderID) {
        const accrualParam = UB.Repository('hr_accrual')
          .attrs('SUM([days])', 'SUM([paySum])')
          .where('orderID', '=', row.orderID)
          .where(`(flagsRec & 8192 != 8192)`, 'custom')
          .selectAsObject({ 'SUM([days])': 'payDaysAll', 'SUM([paySum])': 'paySumAll' })
        fssItem.payDaysAll = accrualParam[0].payDaysAll ? accrualParam[0].payDaysAll : 0
        fssItem.paySumAll = accrualParam[0].paySumAll ? accrualParam[0].paySumAll : 0
        const orderParam = UB.Repository('hr_order')
          .attrs(['description', 'orderDate', 'orderClass.entityName', 'orderClass.description'])
          .selectById(row.orderID, {
            'orderClass.entityName': 'orderClass',
            'orderClass.description': 'orderDescription'
          }) || {}
        switch (orderParam.orderClass) {
          case 'hr_docRegSickness':
            const orderSickness = UB.Repository('hr_docRegSickness')
              .attrs(['orderNumber', 'orderDate', 'seria', 'parentSicknessID', 'parentAccrualID', 'dateFrom', 'dateTo',
                'dictIllnessReasonID.name', 'employeeSickLimitID', 'employeeSickLimitID.dictSickLimitID.name',
                'msekResult', 'msekDateTo', 'avgCalcType', 'dateFirst'])
              .misc({ __skipRls: true })
              .selectById(row.orderID, { 'dictIllnessReasonID.name': 'illnessReason' })
            fssItem.orderName = 'Лист непрацездатності'
            fssItem.seria = orderSickness.seria
            fssItem.number = orderSickness.orderNumber
            fssItem.orderDate = orderSickness.orderDate
            fssItem.orderPrim = `${(orderSickness.parentSicknessID || orderSickness.parentAccrualID) ? `продовжений; ` : `первинний; `} період непрацездатності з ${dateService.formatDate(orderSickness.dateFrom)} 
          по ${dateService.formatDate(orderSickness.dateTo)}; причина непрацездатності: ${orderSickness.illnessReason}`
            fssItem.dateFirst = orderSickness.dateFirst
            fssItem.employeeSickLimitID = orderSickness.employeeSickLimitID
            fssItem['employeeSickLimitID.dictSickLimitID.name'] = orderSickness['employeeSickLimitID.dictSickLimitID.name']
            fssItem.msekDateTo = (orderSickness.msekResult === '1' && orderSickness.msekDateTo) ? dateService.shiftDate(orderSickness.msekDateTo) : null
            const sicknessCause = ['FACT', 'PLAN'].includes(orderSickness.avgCalcType) ? dictSicknessCause.find(o => o.code === (orderSickness.avgCalcType === 'PLAN' ? '5' : '4')) : null
            if (sicknessCause) {
              fssItem.dictSicknessCauseID = sicknessCause.ID
              fssItem['dictSicknessCauseID.name'] = sicknessCause.name
              fssItem['dictSicknessCauseID.isOther'] = sicknessCause.isOther
            }
            break
          case 'hr_docRegFuneral':
            const orderFuneral = UB.Repository('hr_docRegFuneral')
              .attrs(['seriaDoc', 'numberDoc', 'dateDoc', 'dateDeath', 'employeeNumberID', 'employeeFamilyID.peopleID.shortFIO', 'employeeNumberID.employeeID.shortFIO'])
              .misc({ __skipRls: true })
              .selectById(row.orderID, {
                'employeeFamilyID.peopleID.shortFIO': 'familyFIO',
                'employeeNumberID.employeeID.shortFIO': 'employeeFIO'
              })
            fssItem.orderName = 'Свідоцтво про смерть'
            fssItem.seria = orderFuneral.seriaDoc
            fssItem.number = orderFuneral.numberDoc
            fssItem.orderDate = orderFuneral.dateDoc
            fssItem.orderPrim = UB.i18n(`дата смерті: {0}; ПІБ померлого: {1}`, dateService.formatDate(orderFuneral.dateDeath), orderFuneral.familyFIO || orderFuneral.employeeFIO)
            break
          case 'hr_docRegEasyWork':
            const orderEasyWork = UB.Repository('hr_docRegEasyWork')
              .attrs(['typeRefSick', 'seriaDoc', 'numberDoc', 'dateDoc', 'dateFrom', 'dateTo'])
              .misc({ __skipRls: true })
              .selectById(row.orderID)
            fssItem.orderName = 'Довідка ' + orderEasyWork.typeRefSick
            fssItem.seria = orderEasyWork.seriaDoc
            fssItem.number = orderEasyWork.numberDoc
            fssItem.orderDate = orderEasyWork.dateDoc
            fssItem.orderPrim = UB.i18n(`період переведення з {0} по {1}`, dateService.formatDate(orderEasyWork.dateFrom), dateService.formatDate(orderEasyWork.dateTo))
            break
          default:
            fssItem.orderName = orderParam.orderDescription
            fssItem.seria = ''
            fssItem.number = orderParam.orderNumber
            fssItem.orderDate = orderParam.orderDate
            fssItem.orderPrim = ''
            break
        }
      } else {
        fssItem.orderPrim = 'Внесено в розрахунковий лист користувачем'
      }
      resultData.push(fssItem)
    }
  })
  mParams.resultData = JSON.stringify(resultData)
  mParams.errors = JSON.stringify(errors)
  mParams.accrualErrors = JSON.stringify(accrualErrors)
}

me.makeSicknessList = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  if (!execParams.periodID) {
    mParams.errors = JSON.stringify([])
    return
  }
  const period = periodService.getPeriod(execParams.periodID)
  const sicknessRequis = []
  const errors = []
  const accrualErrors = []
  const payElFSS = UB.Repository('hr_payEl')
    .attrs('ID')
    .where('dictFundSourceID.dictFundTypeID.code', '=', '02')
    .where('methodID.methodGroupID.groupType', '=', 'PAYMENT')
    .selectAsObject()
  if (payElFSS.length) {
    const accrualsFSS = UB.Repository('hr_accrual')
      .attrs(['ID', 'payElID', 'payElID.description'])
      .where('payElID', 'in', payElFSS.map(o => o.ID))
      .where('periodCalc', '<=', period.dateFrom)
      .where('ID', 'notIn', UB.Repository('hr_sicknessRequisAccrual').attrs('accrualID'))
      .groupBy(['ID', 'payElID', 'payElID.description'])
      .selectAsObject()
    const dictFssReqDt = UB.Repository('hr_dictFssReqDt')
      .attrs(['ID', 'dictFssReqID', 'payElID'])
      .selectAsObject()
    accrualsFSS.forEach(accr => {
      const fssReq = dictFssReqDt.find(o => o.payElID === accr.payElID)
      if (fssReq) {
        if (!sicknessRequis.includes(fssReq.dictFssReqID)) sicknessRequis.push(fssReq.dictFssReqID)
      } else {
        if (!errors.find(o => o.payElID === accr.payElID)) {
          errors.push(accr)
        }
      }
    })
    const store = UB.DataStore('hr_sicknessRequis')
    const storeDet = UB.DataStore('hr_sicknessRequisDt')
    sicknessRequis.forEach(dictFssReqID => {
      const sicknessID = store.generateID()
      const params = {
        mParams: {
          skipCheckErrors: true,
          execParams: {
            orgID: execParams.orgID,
            sicknessID: sicknessID,
            periodSalary: period.dateFrom,
            dictFssReqID: dictFssReqID
          }
        }
      }
      me.getSicknessList(params)
      accrualErrors.push(...JSON.parse(params.mParams.accrualErrors))
      if (params.mParams.resultData) {
        const resultData = JSON.parse(params.mParams.resultData)
        if (resultData.length) {
          const orderNumber = orderService.getOrderNum(__entityName, period.dateFrom, execParams.orgID)
          store.run('insert', {
            execParams: {
              ID: sicknessID,
              orderDate: execParams.onDate,
              orderNumber: orderNumber,
              periodID: period.ID,
              orgID: execParams.orgID,
              dictFssReqID: dictFssReqID,
              description: UB.i18n(`№ {0} від {1}`, orderNumber, dateService.formatDate(dateService.shiftDate(execParams.onDate)))
            }
          })
          resultData.forEach(row => {
            storeDet.run('insert', {
              execParams: {
                ID: storeDet.generateID(),
                sicknessRequisID: sicknessID,
                employeeNumberID: row.employeeNumberID,
                orderID: row.orderID,
                payElID: row.payElID,
                accrualDt: row.accrualDt,
                payDays: row.payDays,
                payDaysChNPP: row.payDaysChNPP,
                payDaysAll: row.payDaysAll,
                paySum: row.paySum,
                paySumAll: row.paySumAll,
                paySumChNPP: row.paySumChNPP,
                orderName: row.orderName,
                seria: row.seria,
                number: row.number,
                orderDate: row.orderDate,
                orderPrim: row.orderPrim,
                dateFirst: row.dateFirst,
                msekDateTo: row.msekDateTo,
                employeeSickLimitID: row.employeeSickLimitID,
                dictSicknessCauseID: row.dictSicknessCauseID
              }
            })
          })
        }
      }
    })
  }
  mParams.errors = JSON.stringify(errors.map(o => o['payElID.description']))
  mParams.accrualErrors = JSON.stringify(accrualErrors)
}

me.calc = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const resultData = []
  let res = UB.Repository('hr_accrual')
    .attrs(['employeeNumberID', 'SUM([days])', 'SUM([paySum])'])
    .where('payElID', '=', params.payElID)
    .where(`(flagsRec & 8192 != 8192)`, 'custom')
    .where('ID', 'notIn',
      UB.Repository('hr_sicknessRequisAccrual')
        .attrs('accrualID')
        .where('sicknessRequisDtID', '<>', params.sicknessDtID)
    )
  if (params.orderID) {
    res = res
      .where('orderID', '=', params.orderID)
  } else {
    res = res
      .where('orderID', 'isNull')
  }
  res = res
    .groupBy(['employeeNumberID'])
    .selectAsObject({
      'SUM([days])': 'payDays',
      'SUM([paySum])': 'paySum'
    })
  res.forEach(row => {
    const employee = UB.Repository('hr_employeeNumberS')
      .attrs(['tabNum', 'employeeID.fullFIO'])
      .selectById(row.employeeNumberID, { 'employeeID.fullFIO': 'fullFIO' })
    resultData.push({
      employeeNumberID: row.employeeNumberID,
      orderID: params.orderID,
      payElID: params.payElID,
      'employeeNumberID.tabNum': employee.tabNum,
      'employeeNumberID.employeeID.fullFIO': employee.fullFIO,
      'payElID.name': params.payElName,
      payDays: row.payDays,
      paySum: row.paySum
    })
  })
  mParams.resultData = JSON.stringify(resultData)
}

me.updateSicknessRequisOrg = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_sicknessRequisOrg')
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })
  data.add.forEach(ID => {
    store.run('insert', {
      execParams: {
        orgID: mParams.orgID,
        subOrgID: ID
      }
    })
  })
}

function cleanSicknessRequisOrg (orgID) {
  const store = UB.DataStore('hr_sicknessRequisOrg')
  const deleteList = UB.Repository('hr_sicknessRequisOrg')
    .attrs(['ID'])
    .where('orgID', '=', orgID)
    .where('subOrgID', 'notIn',
      UB.Repository('hr_organization')
        .attrs('mi_data_id')
        .where('mi_treePath', 'like', `/${orgID}/`)
        .where('state', '=', 'ACTIVE')
        .where('mi_deleteDate', '>=', '#maxdate')
    )
    .selectAsObject()
  deleteList.forEach(rec => {
    store.run('delete', { execParams: { ID: rec.ID } })
  })
}

function isEmptySicknessRequisOrg (orgID) {
  const orgList = UB.Repository('hr_sicknessRequisOrg')
    .attrs(['ID'])
    .where('orgID', '=', orgID)
    .limit(1)
    .selectAsObject()
  return !orgList.length
}

function fillSicknessRequisOrg (orgID) {
  const insertList = UB.Repository('hr_organization')
    .attrs(['mi_data_id'])
    .where('mi_treePath', 'like', `/${orgID}/`)
    .where('state', '=', 'ACTIVE')
    .selectAsObject({ 'mi_data_id': 'subOrgID' })
  const store = UB.DataStore('hr_sicknessRequisOrg')
  insertList.forEach(rec => {
    store.run('insert', {
      execParams: {
        orgID,
        subOrgID: rec.subOrgID
      }
    })
  })
}

me.normalizeSicknessRequisOrg = function (ctx) {
  cleanSicknessRequisOrg(ctx.mParams.orgID)
  if (isEmptySicknessRequisOrg(ctx.mParams.orgID)) {
    fillSicknessRequisOrg(ctx.mParams.orgID)
  }
}
