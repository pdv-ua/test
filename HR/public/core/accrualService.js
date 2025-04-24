/* global UB AC Ext _ $App appAC */
module.exports = {
  getMask,
  getDefaultDimension,
  calcGroupSumAccrualPaymentDt,
  correctAccrualDt,
  roundPayEl,
  roundSum,
  addExportAction,
  accrualSumGetItemCfg,
  accrualSumGetAccumObj,
  accrualSumGetSetElementsPromise,
  accrualSumInit,
  accrualSumGetPayElData,
  accrualSumGetSpecPayMethods,
  accrualSumGetEmpRanks,
  accrualSumGetDictSalaryRanks,
  accrualSumFill,
  accrualSumGetEmpSum,
  accrualSumGetPosSum,
  accrualSumGetBasepayByObj,
  getPayelExpData,
  getPercentByElmExp,
  accrualSumGetPosBasepay,
  getOrgPayPerm,
  accrualSumInitAccrualList,
  exportPayRoll
}

function getDefaultDimension () {
  return UB.Repository('hr_payDim')
    .attrs(['dimOrder', 'dimension', 'dimension.code',
      'dimension.description', 'dimension.entityName', 'dimension.kind', 'dimension.numCode', 'required'])
    .orderBy('dimOrder')
    .selectAsObject().then(dimension => {
      const result = {
        dimsCount: dimension.length,
        dimsOrder: {},
        dims: []

      }
      dimension.forEach(dim => {
        result.dimsOrder[String(dim.dimension)] = dim.dimOrder
        result.dims.push({
          ID: dim.dimension,
          code: dim['dimension.code'],
          description: dim['dimension.description'],
          entityName: dim['dimension.entityName'],
          kind: dim['dimension.kind'],
          numCode: dim['dimension.numCode'],
          required: dim.required
        })
      })
      return result
    })
}

function getMask (value, len) {
  return (value ? value.toString(2) : '').padStart(len || 31, '0')
}

function calcGroupSumAccrualPaymentDt (detail, sum) {
  const result = []
  const det = []
  let paySum = 0
  detail.forEach(row => {
    const dt = {}
    for (let i = 0; i < 10; i++) {
      if (row[`d${i}`]) {
        dt[`d${i}`] = row[`d${i}`]
        if (row[`d${i}Value`]) {
          dt[`d${i}Value`] = row[`d${i}Value`]
        }
      }
    }
    dt.dimValues = Object.values(dt)

    dt.paySum = row.paySum
    dt.departmentID = row.departmentID || null
    dt.dictFundSourceID = row.dictFundSourceID || null
    dt.dictProgClassID = row.dictProgClassID || null
    dt.dictProjectID = row.dictProjectID || null
    paySum = AC.currencyService.round(paySum + row.paySum, 6)
    det.push(dt)
  })
  paySum = AC.currencyService.round(paySum, 6)
  det.forEach(row => {
    const sumRow = result.find(o => o.dictFundSourceID === row.dictFundSourceID && o.departmentID === row.departmentID &&
      o.dictProgClassID === row.dictProgClassID && o.dictProjectID === row.dictProjectID &&
      !_.difference(o.dimValues, row.dimValues).length && !_.difference(row.dimValues, o.dimValues).length)
    if (sumRow) {
      sumRow.paySum = AC.currencyService.round(sumRow.paySum + row.paySum, 6)
    } else {
      row.paySum = AC.currencyService.round(row.paySum, 2)
      result.push(row)
    }
  })
  result.forEach(row => {
    delete row.dimValues
  })
  if (sum && paySum !== sum && result.length) {
    return correctAccrualDt(result, sum, paySum)
  } else {
    return result
  }
}

function correctAccrualDt (detail, sum, detPaySum, attrName = 'paySum') {
  let det = typeof detail === 'string' ? (detail !== '' ? JSON.parse(detail) : []) : (detail || [])
  let paySum = 0
  if (!det.length) {
    det.push({ paySum: sum })
  }
  if (!detPaySum) {
    detPaySum = det.reduce((sum, row) => {
      return AC.currencyService.round(sum + row[attrName], 2)
    }, 0)
  }
  if (detPaySum !== paySum) {
    det.forEach(row => {
      row[attrName] = AC.currencyService.round(row[attrName] / (detPaySum || 1) * sum, 2)
      paySum = AC.currencyService.round(paySum + row[attrName], 2)
      delete row.ID
      delete row.accrualID
    })

    if (paySum !== sum && det.length) {
      det[0][attrName] = AC.currencyService.round(det[0][attrName] + sum - paySum, 2)
    }
  }
  return (typeof detail === 'string' || !detail) ? JSON.stringify(det) : det
}

function roundPayEl (sum, roundUpTo, trunc) {
  let X
  switch (roundUpTo) {
    case '1':
      if (trunc) {
        X = sum * 100.000000001
        X = trunc ? Math.trunc(X) : Math.round(X)
        return Number((X / 100).toFixed(2))
      } else {
        return AC.currencyService.round(sum, 2)
      }
    case '2':
      if (trunc) {
        X = sum * 10.000000001
        X = trunc ? Math.trunc(X) : Math.round(X)
        return Number((X / 10).toFixed(1))
      } else {
        return AC.currencyService.round(sum, 1)
      }
    case '3':
      if (trunc) {
        X = trunc ? Math.trunc(sum) : Math.round(sum)
        return Number(X.toFixed(0))
      } else {
        return AC.currencyService.round(sum, 0)
      }
    case '4':
      X = sum / 10.000000001
      X = trunc ? Math.trunc(X) : Math.round(X)
      return Number((X * 10).toFixed(0))
    case '5':
      X = sum / 100.000000001
      X = trunc ? Math.trunc(X) : Math.round(X)
      return Number((X * 100).toFixed(0))
    case '6':
      X = sum / 1000.000000001
      X = trunc ? Math.trunc(X) : Math.round(X)
      return Number((X * 1000).toFixed(0))
    case '7':
      X = sum / 10000.000000001
      X = trunc ? Math.trunc(X) : Math.round(X)
      return Number((X * 10000).toFixed(0))
    case '8':
      X = sum / 100000.000000001
      X = trunc ? Math.trunc(X) : Math.round(X)
      return Number((X * 100000).toFixed(0))
    case '9':
      X = sum / 5.000000001
      X = trunc ? Math.trunc(X) : Math.round(X)
      return Number((X * 5).toFixed(0))
    default:
      X = sum * 100.000000001
      X = trunc ? Math.trunc(X) : Math.round(X)
      return Number((X / 100).toFixed(2))
  }
}

function roundSum (sum, roundUpTo, roundWay = 'DEF') {
  let X
  switch (roundUpTo) {
    case '1':
      X = sum * 100 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = roundValue(X, roundWay)
      return Number((X / 100).toFixed(2))
    case '2':
      X = sum * 10 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = roundValue(X, roundWay)
      return Number((X / 10).toFixed(1))
    case '3':
      X = roundValue(sum, roundWay)
      return Number(X.toFixed(0))
    case '4':
      X = sum / 10 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = roundValue(X, roundWay)
      return Number((X * 10).toFixed(0))
    case '5':
      X = sum / 100 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = roundValue(X, roundWay)
      return Number((X * 100).toFixed(0))
    case '6':
      X = sum / 1000 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = roundValue(X, roundWay)
      return Number((X * 1000).toFixed(0))
    case '7':
      X = sum / 10000 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = roundValue(X, roundWay)
      return Number((X * 10000).toFixed(0))
    case '8':
      X = sum / 100000 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = roundValue(X, roundWay)
      return Number((X * 100000).toFixed(0))
    case '9':
      X = sum / 5 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = roundValue(X, roundWay)
      return Number((X * 5).toFixed(0))
    default:
      if (roundWay === 'UP') {
        sum = roundSum(sum, 6)
      }
      X = sum * 100 + (roundWay !== 'UP' ? (sum >= 0 ? 0.000000001 : -0.000000001) : 0)
      X = roundValue(X, roundWay)
      return Number((X / 100).toFixed(2))
  }
}

function roundValue (x, roundWay = 'DEF') {
  return roundWay === 'DOWN' ? Math.trunc(x) : (roundWay === 'UP' ? Math.ceil(x) : Math.round(x))
}

function addExportAction (me) {
  me.actions.exportAction = new Ext.Action({
    iconCls: 'u-icon-file-export',
    text: UB.i18n('Експорт'),
    cls: 'green-action',
    handler: function (btn) {
      btn.menu.removeAll()
      btn.menu.add({
        text: UB.i18n('Експорт за всіма шаблонами (xls)'),
        handler: function () {
          exportPayRoll(me, 'xls', 'all')
        }
      })
      btn.menu.add({
        text: UB.i18n('Експорт за всіма шаблонами (dbf)'),
        handler: function () {
          exportPayRoll(me, 'dbf', 'all')
        }
      })
      UB.Repository('hr_organization')
        .attrs('mi_treePath')
        .where('mi_data_id', '=', me.record.get('organizationID'))
        .where('state', '=', 'ACTIVE')
        .limit(1)
        .selectScalar()
        .then(treePath => {
          UB.Repository('hr_payOut').attrs('exportMethodID')
            .where('organizationID', 'equal', me.record.get('organizationID'), 'org')
            .where('subOrg', 'equal', 1, 'sub')
            .where('organizationID', 'in', treePath ? treePath.split('/').map(o => Number(o)) : [me.record.get('organizationID')], 'parent')
            .where('exportMethodID', 'isNotNull', 'filePay')
            .logic('([org] OR ([parent] AND [sub]))')
            .selectAsObject()
            .then(payOutList => {
              UB.Repository('hr_exportMethod')
                .attrs(['ID', 'shortName'])
                .where('orgID', '=', me.record.get('organizationID'), 'org')
                .where('ID', 'in', payOutList.length ? payOutList.map(o => o.exportMethodID) : [0], 'IDs')
                .where('typeFile', '=', 'filePay')
                .where('isActive', '=', true)
                .logic('([org] OR [IDs])')
                .selectAsObject().then((data) => {
                  data.forEach(row => {
                    btn.menu.add({
                      text: UB.i18n(`${row.shortName} (xls)`),
                      handler: () => {
                        exportPayRoll(me, 'xls', row.ID)
                      }
                    })
                    btn.menu.add({
                      text: UB.i18n(`${row.shortName} (dbf)`),
                      handler: () => {
                        exportPayRoll(me, 'dbf', row.ID)
                      }
                    })
                  })
                })
            })
        })
    },
    menu: [
      {
        text: UB.i18n('Експорт за всіма шаблонами (xls)'),
        handler: function () {
          exportPayRoll(me, 'xls', 'all')
        }
      },
      {
        text: UB.i18n('Експорт за всіма шаблонами (dbf)'),
        handler: function () {
          exportPayRoll(me, 'dbf', 'all')
        }
      }
    ]
  })
}

function exportPayRoll (me, typeExport, metodExport) {
  if (!me.attr.payRollDt.getStore().count()) {
    $App.dialogError(UB.i18n(`В платіжній відомості відсутні записи!`))
    return
  }
  $App.dialogYesNo('', UB.i18n('Експортувати ?'))
    .then(res => {
      if (res) {
        me.setLoading(true)
        const employee = []
        me.attr.payRollDt.getStore().data.items.forEach(rec => {
          employee.push({
            employeeDescription: rec.get('employeeNumberID.description'),
            employeeNumberID: rec.get('employeeNumberID'),
            employeePayOutID: rec.get('employeePayOutID'),
            payRetentionID: rec.get('payRetentionID'),
            payOutID: rec.get('payOutID'),
            paySum: rec.data.paySum
          })
        })
        $App.connection.run({
          entity: 'hr_payRoll',
          method: 'exportBank',
          metodExport,
          typeExport,
          payOutID: (me.attr.payOutID && me.attr.payOutID.getValue()) || null,
          payOutName: (me.attr.payOutID && me.attr.payOutID.getFieldValue('name')) || null,
          rlcod: me.attr.description.getValue(),
          employee: JSON.stringify(employee),
          orgID: appAC.globalOrganization(),
          orderDate: me.attr.orderDate.getValue(),
          description: me.attr.description.getValue()
        }).then(response => {
          const files = JSON.parse(response.files)
          const empMissingMetods = JSON.parse(response.empMissingMetods)
          files.forEach(file => {
            AC.filesService.saveAsByBase64Buffer(file.data, `${file.fileName}.${typeExport}`, { type: typeExport === 'dbf' ? 'application/dbf' : 'text/csv' })
          })
          if (empMissingMetods && empMissingMetods.length) {
            $App.dialogInfo(UB.i18n(`Список працівників яких не включено, так як для них не встановлено метод експорту </br>{0}`, empMissingMetods.join('</br>')))
          }
          me.setLoading(false)
        }, function (err) {
          me.setLoading(false)
          throw err
        })
      }
    })
}

function exportPayRollByBank (me, metodExport, typeExport) {
  const zpcod = me.attr.payOutID.getFieldValue('projectCode') || null
  const branch = me.attr.payOutID.getFieldValue('branchCode') || null
  if (!me.attr.payRollDt.getStore().count()) {
    $App.dialogError(UB.i18n(`В платіжній відомості відсутні записи!`))
    return
  }
  let message = UB.i18n('Експортувати в') + ' '
  switch (metodExport) {
    case '1':
      message += UB.i18n('Приват24')
      break
    case '2':
      message += UB.i18n('Ощадбанк')
      break
    case '3':
      message += UB.i18n('Райфайзенбанк')
      break
    case '4':
      message += UB.i18n('Укргазбанк')
      break
    case '5':
      message += UB.i18n('УкрСиббанк')
      break
  }

  $App.dialogYesNo('', `${UB.i18n('Експортувати в')} ${message} ?`)
    .then(res => {
      if (res) {
        me.setLoading(true)
        const employee = []
        me.attr.payRollDt.getStore().data.items.forEach(rec => {
          employee.push({
            employeeDescription: rec.get('employeeNumberID.description'),
            employeeNumberID: rec.get('employeeNumberID'),
            employeePayOutID: rec.get('employeePayOutID'),
            payRetentionID: rec.get('payRetentionID'),
            payOutID: rec.get('payOutID'),
            paySum: rec.data.paySum
          })
        })
        $App.connection.run({
          entity: 'hr_payRoll',
          method: 'exportBank',
          metodExport,
          typeExport,
          branch: branch,
          zpcod: zpcod,
          rlcod: me.attr.description.getValue(),
          employee: JSON.stringify(employee),
          orgID: appAC.globalOrganization(),
          orderDate: me.attr.orderDate.getValue(),
          description: me.attr.description.getValue(),
          payOutID: (me.attr.payOutID && me.attr.payOutID.getValue()) || null,
          payOutName: (me.attr.payOutID && me.attr.payOutID.getFieldValue('name')) || null
        }).then(response => {
          const files = JSON.parse(response.files)
          files.forEach(file => {
            AC.filesService.saveAsByBase64Buffer(file.data, `${file.fileName}.${typeExport}`, { type: typeExport === 'dbf' ? 'application/dbf' : 'text/csv' })
          })
          me.setLoading(false)
        }, function (err) {
          me.setLoading(false)
          throw err
        })
      }
    })
}

/************************************************************************/
/* Блок функцій accrualSum* для вибору окладу з доплатами та надбавками */
/************************************************************************/
function accrualSumGetItemCfg (repParamPref, code, cfg) {
  return Object.assign({
    code: repParamPref + code,
    elms: [],
    payPerm: [],
    posData: [],
    hasData: true
  }, cfg)
}

function accrualSumGetSetElementsPromise (onDate, repCode) {
  return UB.Repository('hr_repSetElement')
    .attrs(['elementID', 'repSetParamID', 'repSetParamID.code', 'repSetParamID.name'])
    .where('repSetParamID.dictStReportID.code', '=', repCode)
    .where('dateFromNotEmpty', '<=', onDate)
    .where('dateToNotEmpty', '>=', onDate)
    .where('repSetParamID.dateFrom', '<=', onDate)
    .where('repSetParamID.dateTo', '>=', onDate)
    .where('repSetParamID.mi_deleteDate', '>=', '#maxdate')
}

/* Ініціалізація даних для розрахунку окладу з надбавками та доплатами, налагодження береться зі звіту "Тарифікація" */
function accrualSumInit (repParamPref, forReportCode) {
  const baseSum = { baseSumFrom: ['basepay'] }
  // let baseSum10 = (forReportCode === 'tariffing') ? { baseSumFrom: ['basepay', 'basepayAdd1', 'basepayAdd2', 'basepayAdd3', 'basepayAdd4'] } : baseSum
  return {
    basepayAdd1: accrualSumGetItemCfg(repParamPref, '6', baseSum),
    basepayAdd2: accrualSumGetItemCfg(repParamPref, '7', baseSum),
    basepayAdd3: accrualSumGetItemCfg(repParamPref, '8', baseSum),
    basepayAdd4: accrualSumGetItemCfg(repParamPref, '9', baseSum),
    basepayAdd5: accrualSumGetItemCfg(repParamPref, '10', baseSum),
    basepayAdd6: accrualSumGetItemCfg(repParamPref, '11', baseSum)
  }
}

/* Ініціалізація даних для розрахунку окладу з надбавками та доплатами, налагодження береться зі звіту "Список працівників за нарахуванням" */
function accrualSumInitAccrualList (repParamPref) {
  return {
    basepayAdd1: accrualSumGetItemCfg(repParamPref, '6', { baseSumFrom: ['basepay'] }),
    basepayAdd2: accrualSumGetItemCfg(repParamPref, '7', { baseSumFrom: ['basepay'] }),
    basepayAdd3: accrualSumGetItemCfg(repParamPref, '8', { baseSumFrom: ['basepay'] }),
    basepayAdd4: accrualSumGetItemCfg(repParamPref, '9', { baseSumFrom: ['basepay'] }),
    basepayAdd5: accrualSumGetItemCfg(repParamPref, '10', { baseSumFrom: ['basepay'] }),
    basepayAdd6: accrualSumGetItemCfg(repParamPref, '11', { baseSumFrom: ['basepay'] })
  }
}

function accrualSumGetAccumObj (basepay) {
  return {
    basepay: basepay,
    basepayAdd1: 0,
    basepayAdd2: 0,
    basepayAdd3: 0,
    basepayAdd4: 0,
    basepayAdd5: 0,
    basepayAdd6: 0
  }
}

/* Заповнення даними для розрахунку окладу з надбавками та доплатами */
async function accrualSumFill (accrualData, orgID, onDate, options, arrayOrgIDs = []) {
  const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
  options = options || {}
  options.repCode = options.repCode || '07'
  if (options.fillEmp === undefined) {
    options.fillEmp = true
  }
  if (options.fillPos === undefined) {
    options.fillPos = true
  }
  // Якщо параметри додаються в цей же день, то hr_repSetElement.dateFrom проставляється з часом, тому вибираємо на наст. день
  const nextOnDate = AC.dateService.addDays(onDate, 1)
  const setElements = await accrualSumGetSetElementsPromise(nextOnDate, options.repCode).selectAsObject({
    'repSetParamID.code': 'code'
  })
  /* Постійні нарахування/утримання організації */
  const payPermData = await UB.Repository('hr_employeeNumberS')
    .attrs(['ID'])
    .whereIf(!arrayOrgIDs.length, 'orgID', '=', orgID)
    .whereIf(arrayOrgIDs.length, 'orgID', 'in', arrayOrgIDs)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectAsObject({
      'ID': 'employeeNumberID'
    })
  const whereList = arrayOrgIDs.length
    ? {
      arrayOrgIDs: {
        expression: '[orgID]',
        condition: 'in',
        value: arrayOrgIDs
      }
    }
    : {
      orgID: {
        expression: '[orgID]',
        condition: '=',
        value: orgID
      }
    }

  let payPermItems = await $App.connection.run({
    entity: 'hr_employeeAccrualEdit',
    method: 'select',
    whereList: whereList,
    onDate: onDate,
    orgID: orgID
  })
  payPermItems = UB.LocalDataStore.selectResultToArrayOfObjects(payPermItems)

  for (let i = 0; i < payPermData.length; i++) {
    let dataItem = payPermData[i]
    dataItem.payPerm = payPermItems.filter(itm => itm.employeeNumberID === dataItem.employeeNumberID)
  }
  const accDataKeys = Object.keys(accrualData)
  for (let i in accDataKeys) {
    let key = accDataKeys[i]
    let accrualItem = accrualData[key]
    accrualItem.elms = setElements.filter(elm => elm.code === accrualItem.code).map(elm => elm.elementID)
    if (accrualItem.elms.length > 0) {
      if (options.fillEmp) {
        accrualItem.payPerm = payPermData.filter(dataItem => dataItem.payPerm.find(permPayItem => accrualItem.elms.includes(permPayItem.payElID)))
      }
      if (options.fillPos) {
        accrualItem.posData = await UB.Repository('hr_positionAccrual')
          .attrs(['positionID', 'payElID', 'accrualSum', 'accrualRate'])
          .whereIf(!arrayOrgIDs.length, 'positionID.orgID', '=', orgID)
          .whereIf(arrayOrgIDs.length, 'positionID.orgID', 'in', arrayOrgIDs)
          .where('positionID.mi_deleteDate', '>=', '#maxdate')
          .where('positionID.state', '=', 'ACTIVE')
          .where('positionID.mi_dateFrom', '<=', onDate)
          .where('positionID.mi_dateTo', '>=', onDate)
          .where('dateFrom', '<=', onDate)
          .where('dateTo', '>=', onDate)
          .where('payElID', 'in', accrualItem.elms)
          // prevent monkey request error
          .where('ID', '!=', AC.dataService.getUniqueInt())
          .selectAsObject()
        if (notShowSalary) {
          accrualItem.posData.forEach(row => {
            row.accrualSum = 0
          })
        }
      }
    }
  }
}

function accrualSumGetPayElData (onDate, repCode) {
  const nextOnDate = AC.dateService.addDays(onDate, 1)
  return UB.Repository('hr_payEl')
    .attrs(['ID', 'dictExperienceID', 'methodID.code'])
    .exists(accrualSumGetSetElementsPromise(nextOnDate, repCode).correlation('elementID', 'ID'))
    .selectAsObject()
}

function accrualSumGetEmpRanks ({ onDate, empPosPromise }) {
  let res = UB.Repository('hr_publServRang')
    .attrs(['employeeID', 'dictRankID'])
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
  if (empPosPromise) {
    res = res.exists(empPosPromise.correlation('employeeID', 'employeeID'))
  }
  return res.selectAsObject()
}

function accrualSumGetDictSalaryRanks (onDate) {
  return UB.Repository('hr_dictSalaryRank')
    .attrs('dictRankID', 'paySum')
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectAsObject()
}

function accrualSumGetSpecPayMethods ({ empRanks, dictSalaryRanks }) {
  return {
    '5': {
      // Надбавка за ранг
      getSum: function ({ employeeID }) {
        let res
        let empRank = empRanks.find(itm => itm.employeeID === employeeID)
        if (empRank) {
          let salRank = dictSalaryRanks.find(itm => itm.dictRankID === empRank.dictRankID)
          if (salRank && salRank.paySum) {
            res = salRank.paySum
          }
        }
        return res
      }
    }
  }
}

function accrualSumGetEmpSum ({ accrualItem, accumObj, employeeID, employeeNumberID, empPosAccrualSum, payelData, specPayMethods,
  empExpData, payelExpData, onDate }) {
  function getEmpSum ({ rate, paySum }) {
    let res = 0
    if (rate) {
      if (accrualItem.percentOnly) {
        res += rate
      } else {
        let baseSum = 0
        if (accrualItem.baseSumFrom && accumObj) {
          accrualItem.baseSumFrom.forEach(baseSumKey => {
            baseSum += accumObj[baseSumKey] || 0
          })
        } else {
          baseSum = empPosAccrualSum || 0
        }
        res += rate * baseSum / 100
      }
    } else if (paySum) {
      if (!accrualItem.percentOnly) {
        res += paySum
      }
    }
    return res
  }

  let empSum = 0
  /* Надбавки, що беруться з табл. постійних нарахувань hr_employeeAccrual та hr_payPerm */
  let payPermRow = accrualItem.payPerm.find(payPermItem => payPermItem.employeeNumberID === employeeNumberID)
  let hasPayPerm = payPermRow && payPermRow.payPerm.length > 0
  if (hasPayPerm) {
    let payPerm = payPermRow.payPerm.filter(ppItem => accrualItem.elms.includes(ppItem.payElID))
    payPerm.length > 0 && payPerm.forEach(payPermItem => {
      empSum += getEmpSum({ rate: payPermItem.accrualRate, paySum: payPermItem.accrualSum })
    })
  }

  if (accrualItem.getPercentByElmExp && hasPayPerm) {
    /* Надбавка за стаж */
    for (let j = 0; j < accrualItem.elms.length; j++) {
      let payElID = accrualItem.elms[j]
      /* UBHR-12147, Надбавка за стаж повинна бути в постійних нарахуваннях hr_employeeAccrual та hr_payPerm */
      let payPermItem = payPermRow.payPerm.find(ppItem => ppItem.payElID === payElID)
      if (payPermItem) {
        let payElItem = payElID && payelData.find(itm => itm.ID === payElID)
        if (payElItem) {
          let empExpItem = empExpData.find(itm => itm.employeeID === employeeID && itm.dictExperienceID === payElItem.dictExperienceID)
          if (empExpItem) {
            let ymd = AC.dateService.getYmd(empExpItem.calcDate, onDate, true)
            let prc = accrualItem.getPercentByElmExp(payelExpData, payElID, ymd.years, ymd.months)
            let empExpSum = prc * (empPosAccrualSum || 0) / 100
            if (empExpSum > empSum) {
              empSum = accrualItem.percentOnly ? prc : empExpSum
              if (accumObj) {
                accumObj.workexp = UB.i18n(`{0}р. {1}м.`, ymd.years, ymd.months)
              }
            }
          }
        }
      }
    }
  }

  /* Надбавки, що мають свій розрахунок за кодом елемента оплати */
  if (!accrualItem.percentOnly && accrualItem.elms.length > 0) {
    accrualItem.elms.forEach(elmID => {
      let payElItem = payelData.find(itm => itm.ID === elmID)
      if (payElItem) {
        let methodCode = payElItem['methodID.code']
        let methodCfg = specPayMethods[methodCode]
        if (methodCfg && methodCfg.getSum) {
          let sum = methodCfg.getSum({ employeeID })
          if (sum) {
            empSum += sum
          }
        }
      }
    })
  }
  return empSum
}

function accrualSumGetPosSum ({ accrualItem, accumObj, positionID, posAccrualSum }) {
  let empSum = 0
  /* Надбавки, що беруться з табл. hr_positionAccrual */
  let accrualPosData = accrualItem.posData.filter(item => item.positionID === positionID && accrualItem.elms.includes(item.payElID))
  accrualPosData.forEach(accrItem => {
    if (accrItem.accrualRate) {
      if (accrualItem.percentOnly) {
        empSum += accrItem.accrualRate
      } else {
        let baseSum = 0
        if (accrualItem.baseSumFrom) {
          accrualItem.baseSumFrom.forEach(baseSumKey => {
            baseSum += accumObj[baseSumKey] || 0
          })
        } else {
          baseSum = posAccrualSum || 0
        }
        empSum += accrItem.accrualRate * baseSum / 100
      }
    } else {
      if (!accrualItem.percentOnly) {
        empSum += accrItem.accrualSum || 0
      }
    }
  })
  return empSum
}

function accrualSumGetBasepayByObj (accumObj) {
  return (accumObj.basepay || 0) + (accumObj.basepayAdd1 || 0) + (accumObj.basepayAdd2 || 0) + (accumObj.basepayAdd3 || 0) +
    (accumObj.basepayAdd4 || 0) + (accumObj.basepayAdd5 || 0) + (accumObj.basepayAdd6 || 0)
}

function getPayelExpData (onDate, repCode) {
  // Якщо параметри додаються в цей же день, то hr_repSetElement.dateFrom проставляється з часом, тому вибираємо на наст. день
  const nextOnDate = AC.dateService.addDays(onDate, 1)
  return UB.Repository('hr_payElExperience')
    .attrs(['payElID', 'years', 'months', 'rate'])
    .exists(accrualSumGetSetElementsPromise(nextOnDate, repCode).correlation('elementID', 'payElID'))
    .orderBy('payElID')
    .orderBy('years', 'desc')
    .orderBy('months', 'desc')
    .selectAsObject()
}

function getPercentByElmExp (payelExpData, elmID, years, months) {
  let res = 0
  let payelExp = payelExpData.filter(itm => itm.payElID === elmID)
  for (let i = 0; i < payelExp.length; i++) {
    let payelExpItem = payelExp[i]
    if (years * 12 + months >= payelExpItem.years * 12 + payelExpItem.months) {
      res = payelExpItem.rate || 0
      break
    }
  }
  return res
}

/* Розрахунок окладу + надбавки */
function accrualSumGetPosBasepay ({ accrualData, basepayPos, positionID }) {
  let accumObj = accrualSumGetAccumObj(basepayPos)
  Object.keys(accrualData).forEach(key => {
    let accrualItem = accrualData[key]
    if (accrualItem.hasData) {
      let posSum = accrualSumGetPosSum({
        accrualItem,
        accumObj,
        positionID: positionID,
        posAccrualSum: basepayPos
      })
      accumObj[key] = posSum
    }
  })
  return accrualSumGetBasepayByObj(accumObj)
}

async function getOrgPayPerm (orgID, payElID, dictFundSourceID, dateFrom, dateTo, payType) {
  const accrualBuilder = UB.Repository('hr_payPerm')
    .attrs(['ID', 'payElID', 'dateFrom', 'dateTo', 'paySum', 'rate', 'dictFundSourceID', 'accountID', 'payType',
      'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
      'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
      'excludeOrg', 'excludeStaff', 'excludePosition', 'excludeDepartment', 'excludeWorkPlace', 'excludeWorkerType', 'excludeEmpCategory'])
    .where('excludeOrg', '=', 0, 'excOrg')
    .where('excludeOrg', '=', 1, 'inexcOrg')
    .exists(UB.Repository('hr_payPermDt')
      .correlation('payPermID', 'ID')
      .where('orgID', '=', orgID)
      .where('permType', '=', '1')
      .where('mi_deleteDate', '>=', '#maxdate'), 'org')
    .notExists(UB.Repository('hr_payPermDt')
      .correlation('payPermID', 'ID')
      .where('permType', '=', '1')
      .where('mi_deleteDate', '>=', '#maxdate'), 'notOrg')
    .notExists(UB.Repository('hr_payPermDt')
      .correlation('payPermID', 'ID')
      .where('orgID', '=', orgID)
      .where('permType', '=', '1')
      .where('mi_deleteDate', '>=', '#maxdate'), 'inorg')
    .logic('(([org] AND [excOrg]) OR ([notOrg]) OR ([inorg] AND [inexcOrg]))')

  if (payElID) {
    accrualBuilder.where('payElID', '=', payElID)
  }
  if (dateFrom) {
    accrualBuilder.where('dateTo', '>=', dateFrom)
  }
  if (dateTo) {
    accrualBuilder.where('dateFrom', '<=', dateTo)
  }
  if (payType) {
    accrualBuilder.where('payType', '=', payType)
  }

  const orgAccrual = await accrualBuilder.selectAsObject()

  const payPermDt = await UB.Repository('hr_payPermDt')
    .attrs(['ID', 'payPermID', 'orgID', 'dictStaffCatID', 'dictPositionID', 'permType', 'departmentID', 'workPlace', 'workerType', 'dictEmpCategoryID'])
    .where('permType', '!=', '1')
    .where('payPermID', 'in', orgAccrual.length ? orgAccrual.map(o => o.ID) : [0])
    .selectAsObject()

  orgAccrual.forEach(orgAccr => {
    orgAccr.dateFrom = AC.dateService.shiftDate(orgAccr.dateFrom)
    orgAccr.dateTo = AC.dateService.shiftDate(orgAccr.dateTo)
    orgAccr.department = payPermDt.filter(o => o.permType === '4' && o.payPermID === orgAccr.ID).map(o => o.departmentID)
    orgAccr.position = payPermDt.filter(o => o.permType === '3' && o.payPermID === orgAccr.ID).map(o => o.dictPositionID)
    orgAccr.category = payPermDt.filter(o => o.permType === '2' && o.payPermID === orgAccr.ID).map(o => o.dictStaffCatID)
    orgAccr.workPlace = payPermDt.filter(o => o.permType === '5' && o.payPermID === orgAccr.ID).map(o => o.workPlace)
    orgAccr.workerType = payPermDt.filter(o => o.permType === '6' && o.payPermID === orgAccr.ID).map(o => o.workerType)
    orgAccr.empCategory = payPermDt.filter(o => o.permType === '11' && o.payPermID === orgAccr.ID).map(o => o.dictEmpCategoryID)
  })
  return orgAccrual
}
