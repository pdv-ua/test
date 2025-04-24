const UB = require('@unitybase/ub')
const _ = require('lodash')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')

me.entity.addMethod('fillSignersByDefault')
me.entity.addMethod('updateSignersPos')

me.fillSignersByDefault = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const store = UB.DataStore('hr_dictSigners')

  if (!params.departmentID) {
    if (!params.insertByDef) {
      let dictSigner = UB.Repository('hr_dictSigners')
        .attrs(['ID', 'departmentID', 'employeePositionID', 'employeeNumberID', 'orderN', 'signerName', 'positionName'])
        .where('orgID', '=', params.organizationID)
        .where('signerCode', '=', params.signerCode)
        .where('departmentID', 'isNull')
        .orderBy('orderN')
        .selectAsObject()

      for (let signer of dictSigner) {
        store.run('delete', {
          execParams: {
            ID: signer.ID
          }
        })
      }
    }

    store.run('insert', {
      execParams: {
        orgID: params.organizationID,
        orderN: 1,
        signerName: 'Відповідальна особа',
        signerCode: params.signerCode
      }
    })
    store.run('insert', {
      execParams: {
        orgID: params.organizationID,
        orderN: 2,
        signerName: 'Керівник структурного підрозділу',
        signerCode: params.signerCode
      }
    })
    store.run('insert', {
      execParams: {
        orgID: params.organizationID,
        orderN: 3,
        signerName: 'Керівник установи',
        signerCode: params.signerCode
      }
    })
  }

  if (params.departmentID && params.insertByDef) {
    let dictSigner = UB.Repository('hr_dictSigners')
      .attrs(['ID', 'departmentID', 'employeePositionID', 'employeeNumberID', 'orderN', 'signerName', 'positionName', 'signerType'])
      .where('orgID', '=', params.organizationID)
      .where('signerCode', '=', params.signerCode)
      .where('departmentID', 'isNull')
      .orderBy('orderN')
      .selectAsObject()
    for (let signer of dictSigner) {
      store.run('insert', {
        execParams: {
          orgID: params.organizationID,
          orderN: signer.orderN,
          signerName: signer.signerName,
          departmentID: params.departmentID,
          employeePositionID: signer.employeePositionID,
          employeeNumberID: signer.employeeNumberID,
          positionName: signer.positionName,
          signerCode: params.signerCode,
          signerType: signer.signerType
        }
      })
    }
  }

  if (params.departmentID && !params.insertByDef) {
    let dictSigner = UB.Repository('hr_dictSigners')
      .attrs(['ID', 'departmentID', 'employeePositionID', 'employeeNumberID', 'orderN', 'signerName', 'positionName'])
      .where('orgID', '=', params.organizationID)
      .where('signerCode', '=', params.signerCode)
      .where('departmentID', '=', params.departmentID)
      .orderBy('orderN')
      .selectAsObject()
    for (let signer of dictSigner) {
      store.run('delete', {
        execParams: {
          ID: signer.ID
        }
      })
    }
    let dictSignerDef = UB.Repository('hr_dictSigners')
      .attrs(['ID', 'departmentID', 'employeePositionID', 'employeeNumberID', 'orderN', 'signerName', 'positionName', 'signerType'])
      .where('orgID', '=', params.organizationID)
      .where('signerCode', '=', params.signerCode)
      .where('departmentID', 'isNull')
      .orderBy('orderN')
      .selectAsObject()
    if (dictSignerDef && dictSignerDef.length) {
      for (let signer of dictSignerDef) {
        store.run('insert', {
          execParams: {
            orgID: params.organizationID,
            orderN: signer.orderN,
            signerName: signer.signerName,
            departmentID: params.departmentID,
            employeePositionID: signer.employeePositionID,
            employeeNumberID: signer.employeeNumberID,
            positionName: signer.positionName,
            signerCode: params.signerCode,
            signerType: signer.signerType
          }
        })
      }
    } else {
      store.run('insert', {
        execParams: {
          orgID: params.organizationID,
          orderN: 1,
          signerName: 'Відповідальна особа',
          departmentID: params.departmentID,
          signerCode: params.signerCode
        }
      })
      store.run('insert', {
        execParams: {
          orgID: params.organizationID,
          orderN: 2,
          signerName: 'Керівник структурного підрозділу',
          departmentID: params.departmentID,
          signerCode: params.signerCode
        }
      })
      store.run('insert', {
        execParams: {
          orgID: params.organizationID,
          orderN: 3,
          signerName: 'Керівник установи',
          departmentID: params.departmentID,
          signerCode: params.signerCode
        }
      })
    }
  }
}

me.updateSignersPos = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const store = UB.DataStore('hr_dictSigners')

  let dictSigner = UB.Repository('hr_dictSigners')
    .attrs(['ID', 'departmentID', 'employeePositionID', 'employeeNumberID', 'positionName'])
    .where('orgID', '=', params.organizationID)
    .where('signerCode', '=', params.signerCode)
    .whereIf(!params.departmentID, 'departmentID', 'isNull')
    .whereIf(params.departmentID, 'departmentID', '=', params.departmentID)
    .orderBy('orderN')
    .selectAsObject()

  for (let signer of dictSigner) {
    if (signer.employeePositionID) {
      let employeePosition = UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'positionID.name'])
        .where('employeeNumberID', '=', signer.employeeNumberID)
        .where('dateFrom', '<=', dateService.shiftDate(params.onDate))
        .where('dateTo', '>=', dateService.shiftDate(params.onDate))
        .selectSingle()
      if (employeePosition.ID !== signer.employeePositionID) {
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: signer.ID,
            employeePositionID: employeePosition.ID,
            positionName: employeePosition['positionID.name']
          }
        })
      }
    }
  }
}
