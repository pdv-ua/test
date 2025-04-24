const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:after', afterInsert)
me.on('delete:before', beforeDelete)

me.entity.addMethod('setDefaultFields')

me.setDefaultFields = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_exportMethodFields')
  const exportFields = UB.Repository('hr_exportFields')
    .attrs(['ID', 'code', 'name', 'type'])
    .where('type', '=', 'filePay')
    .selectAsObject()

  const exportMethodFields = UB.Repository('hr_exportMethodFields')
    .attrs(['ID'])
    .where('exportMethodID', '=', mParams.exportMethodID)
    .selectAsObject()

  exportMethodFields.forEach(row => {
    store.run('delete', {
      execParams: { ID: row.ID }
    })
  })
  const bankDefaultFields = {
    privat: [
      [ 'branchCode', 'BRANCH', 3, 'C', null ],
      [ 'projectCode', 'ZPKOD', 3, 'C', null ],
      [ 'personalAccount', 'CARD_NO', 30, 'C', null ],
      [ 'taxCodeType', 'LSTBL', 10, 'C', null ],
      [ 'lastName', 'FAM', 50, 'C', null ],
      [ 'firstName', 'NAME', 50, 'C', null ],
      [ 'middleName', 'OT', 50, 'C', null ],
      [ 'paySum', 'RLSUM', 17, 'N', null ],
      [ 'taxCode9', 'INN', 20, 'C', null ],
      [ 'namePayRoll', 'RLKOD', 30, 'C', null ],
      [ 'bankSubAccount', 'CARD_PR_S', 29, 'C', null ]
    ],
    oschad: [
      [ 'taxCodeType', 'NSC', 29, 'C', null ],
      [ 'paySum', 'SUMMA', 18, 'N', null ],
      [ 'fullFIO', 'FIO', 38, 'C', null ],
      [ 'taxCodeType', 'ID_KOD', 14, 'C', null ]
    ],
    gaz: [
      [ 'personalAccount', 'SBK_NUM', 29, 'C', null ],
      [ 'bankSubAccount', 'SBK_ACC', 29, 'C', null ],
      [ 'paySum', 'SBK_SUM', 18, 'N', null ],
      [ 'fullFIO', 'SBK_FIO', 38, 'C', null ],
      [ 'taxCode10', 'SBK_INN', 38, 'C', null ],
      [ 'personalAccount', 'IBAN_NUM', 14, 'C', null ]
    ],
    raiffeisen: [
      [ 'personalAccount', 'ACCT_CARD', 29, 'C', null ],
      [ 'fullFIO', 'FIO', 38, 'C', null ],
      [ 'paySum', 'SUMA', 18, 'N', null ],
      [ 'taxCode10', 'ID_CODE', 14, 'C', null ]
    ],
    ukrsib: [
      [ 'personalAccount', 'CARD_ACCT', 29, 'C', null ],
      [ 'fullFIO', 'CARD_HOLDER', 80, 'C', null ],
      [ 'paySum', 'AMOUNT', 14, 'N', null ]
    ]
  }

  bankDefaultFields[mParams.bank].forEach(fields => {
    const exportField = exportFields.find(o => o.code === fields[0])
    if (exportField) {
      store.run('insert', {
        __skipOptimisticLock: true,
        execParams: {
          exportMethodID: mParams.exportMethodID,
          exportFieldsID: exportField.ID,
          name: fields[1],
          size: fields[2],
          typeColumn: fields[3],
          fixValue: fields[4]
        }
      })
    }
  })
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.typeFile === 'fileExpress') {
    if (['ZEX', 'PZP'].includes(execParams.nameFile)) {
      let listParams = []
      if (execParams.nameFile === 'ZEX') {
        listParams = [
          {
            code: 'TaxPaid',
            fullName: 'Список видів оплати для утриманої суми податку',
            shortName: 'Податки',
            tableName: 'hr_payEl'
          },
          {
            code: 'TaxCalculated',
            fullName: 'Список видів оплати для нарахованої суми податку',
            shortName: 'ЄСВ',
            tableName: 'hr_payFund'
          },
          {
            code: 'PaySum',
            fullName: 'Список видів оплати для суми видачи',
            shortName: 'Виплати',
            tableName: 'hr_payEl'
          }
        ]
      }
      if (execParams.nameFile === 'PZP') {
        listParams = [
          {
            code: 'NameDocAcc',
            fullName: 'Назва бухгалтерського документа',
            shortName: 'Бух.документ'
          },
          {
            code: 'TypeDoc',
            fullName: 'Тип бухгалтерського документу проведень по зарплаті',
            shortName: 'Тип документа'
          },
          {
            code: 'AccDB',
            fullName: 'БД для передачі проведень',
            shortName: 'БД проведень'
          }
        ]
      }
      const storeParam = UB.DataStore('hr_listParam')
      const storeRepParam = UB.DataStore('hr_reportParam')
      const storeValParam = UB.DataStore('hr_valuesParam')
      listParams.forEach((row, idx) => {
        const listParamID = storeParam.generateID()
        storeParam.run('insert', {
          execParams: {
            ID: listParamID,
            code: `${execParams.ID}_${row.code}`,
            fullName: row.fullName,
            shortName: row.shortName,
            tableName: row.tableName
          }
        })
        storeRepParam.run('insert', {
          execParams: {
            listParamID: listParamID,
            reportCode: `${execParams.nameFile}_${execParams.ID}`
          }
        })
        if (execParams.nameFile === 'PZP') {
          storeValParam.run('insert', {
            execParams: {
              listParamID: listParamID,
              orderN: idx + 1,
              orgID: execParams.orgID,
              valuesFloat: 0
            }
          })
        }
      })
      storeParam.freeNative()
      storeRepParam.freeNative()
      storeValParam.freeNative()
    }
  }
}

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore.getAsJsObject()[0]
  if (instanceData.typeFile === 'fileExpress') {
    if (['ZEX', 'PZP'].includes(instanceData.nameFile)) {
      const repParams = UB.Repository('hr_reportParam')
        .attrs('ID')
        .where('reportCode', '=', `${instanceData.nameFile}_${instanceData.ID}`)
        .selectAsObject()
      const storeParam = UB.DataStore('hr_reportParam')
      repParams.forEach(row => {
        storeParam.run('delete', {
          execParams: {
            ID: row.ID
          }
        })
      })
      storeParam.freeNative()
    }
  }
}
