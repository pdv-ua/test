const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('delete:before', beforeDelete)
me.entity.addMethod('insertOrUpdatePosGroup')

const listParamsSettings = [
  {
    tableName: 'hr_position',
    codePart: 'posPosition',
    namePart: 'Посади для звіту нарахувань по посадам'
  },
  {
    tableName: 'hr_payEl',
    codePart: 'payElPosition',
    namePart: 'Види оплат для звіту нарахувань по посадам'
  }
]

function beforeDelete (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}

  let arrCodes = listParamsSettings.map(item => {
    return `${item.codePart}${execParams.ID}`
  })
  const listParamsData = UB.Repository('hr_listParam')
    .attrs(['ID', 'code', 'mi_modifyDate'])
    .where('code', 'in', arrCodes)
    .selectAsObject()

  const idParamsData = UB.Repository('hr_idParam')
    .attrs(['ID', 'mi_modifyDate'])
    .where('listParamID', 'in', listParamsData.map(item => item.ID))
    .selectAsObject()

  idParamsData.forEach(item => {
    UB.DataStore('hr_idParam').run('delete', {
      execParams: {
        ID: item['ID'],
        mi_modifyDate: item.mi_modifyDate
      }
    })
  })

  listParamsData.forEach(item => {
    UB.DataStore('hr_listParam').run('delete', {
      execParams: {
        ID: item['ID'],
        mi_modifyDate: item.mi_modifyDate
      }
    })
  })
}

me.insertOrUpdatePosGroup = function (ctx) {
  const mParams = ctx.mParams

  // const execParams = ctx.mParams.execParams
  const method = mParams.posGroupID ? 'update' : 'insert'
  switch (method) {
    case 'update':
      UB.DataStore(__entityName).run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: mParams.posGroupID,
          name: mParams.posGroupName
        }
      })

      let arrCodes = listParamsSettings.map(item => {
        return `${item.codePart}${mParams.posGroupID}`
      })
      const listParamsData = UB.Repository('hr_listParam')
        .attrs(['ID', 'code', 'fullName', 'shortName', 'tableName'])
        .where('code', 'in', arrCodes)
        .selectAsObject()

      listParamsData.forEach(item => {
        let obj = listParamsSettings.find(el => el.tableName === item.tableName)
        UB.DataStore('hr_listParam').run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: item['ID'],
            fullName: `${obj.namePart} ${mParams.posGroupName}`,
            shortName: `${obj.namePart} ${mParams.posGroupName}`
          }
        })
      })
      break

    case 'insert':
      const posGroupStore = UB.DataStore(__entityName)
      const generatePosGroupID = posGroupStore.generateID()
      posGroupStore.run('insert', {
        execParams: {
          ID: generatePosGroupID,
          orgID: mParams.orgID,
          name: mParams.posGroupName
        }
      })

      listParamsSettings.forEach(item => {
        const generateListParamID = posGroupStore.generateID()
        let listParamCode = `${item.codePart}${generatePosGroupID}`
        UB.DataStore('hr_listParam').run('insert', {
          execParams: {
            ID: generateListParamID,
            code: listParamCode,
            fullName: `${item.namePart} ${mParams.posGroupName}`,
            shortName: `${item.namePart} ${mParams.posGroupName}`,
            tableName: item.tableName
          }
        })

        mParams[item.codePart] = { ID: generateListParamID, code: listParamCode }
        mParams['posGroupID'] = generatePosGroupID
      })
      mParams['posGroupID'] = generatePosGroupID

      break
  }
}
