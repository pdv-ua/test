const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const importConfig = require('../HR/modules/import/importConfig')
const tpManager = require('../AC/modules/documentBuilder/tpManager')
const importService = require('../HR/modules/import/importService')
const { generateBase64Str } = require('../AC/modules/dataServices/filesService')

me.entity.addMethod('loadMapData')
me.entity.addMethod('updateMapData')
me.entity.addMethod('removeMap')
me.entity.addMethod('generateXLSX')

me.loadMapData = function (ctx) {
  const mParams = ctx.mParams
  const importMap = UB.Repository('hr_importMap')
    .attrs(['ID', 'inputCode', 'inputName', 'outputID', 'outputCode', 'outputName'])
    .where('orgID', '=', mParams.orgID)
    .where('entityName', '=', mParams.entityName)
    .selectAsObject()

  importMap.forEach(row => {
    row.inputDescription = `${row.inputName ? row.inputName : ''}${row.inputCode ? `[${row.inputCode}]` : ''}`
    row.outputDescription = `${row.outputName ? row.outputName : ''}${row.outputCode ? `[${row.outputCode}]` : ''}`
  })
  const importParams = importConfig.getEntityConfig(mParams.entityName)
  mParams.resultData = JSON.stringify({ data: importMap, dictList: importParams.dictList(importParams, mParams.orgID) })
}

function removeDuplicates (entityName, orgID) {
  const importMap = UB.DataStore('hr_importMap')
  importMap.runSQL(`select min(ID) "ID"
    from hr_importMap
    where orgID = :orgID: and entityName = :entityName:
    group by orgID, entityName, inputID 
    having count(*) > 1`, { orgID, entityName })
  const duplicates = importMap.getAsJsObject()
  const store = UB.DataStore('hr_importMap')
  duplicates.forEach(rec => {
    store.run('delete', { execParams: { ID: rec.ID } })
  })
}

me.updateMapData = function (ctx) {
  const mParams = ctx.mParams
  removeDuplicates(mParams.entityName, mParams.orgID)
  const store = UB.DataStore('hr_importMap')
  const importParams = importConfig.getEntityConfig(mParams.entityName)
  const importMap = UB.Repository('hr_importMap')
    .attrs(['ID', 'orgID', 'inputCode', 'inputName', 'outputID', 'inputID', 'outputCode', 'outputName'])
    .where('orgID', '=', mParams.orgID)
    .where('entityName', '=', mParams.entityName)
    .selectAsObject()
  importMap.forEach(row => {
    const attrNames = ['ID', 'orgID']
    if (importParams.codeAttr && importParams.codeAttr !== '') {
      attrNames.push(importParams.codeAttr)
    }
    if (importParams.nameAttr && importParams.nameAttr !== '') {
      attrNames.push(importParams.nameAttr)
    }
    const updateMap = UB.Repository(importParams.impEntityName)
      .attrs(attrNames)
      .where('impID', '=', row.inputID)
      .where('orgID', '=', mParams.orgID)
      .selectSingle()
    if (updateMap) {
      store.run('update', {
        execParams: {
          ID: row.ID,
          inputID: updateMap.impID,
          inputCode: (importParams.codeAttr && importParams.codeAttr !== '') ? updateMap[importParams.codeAttr] : null,
          inputName: (importParams.nameAttr && importParams.nameAttr !== '') ? updateMap[importParams.nameAttr] : null
        }
      })
    } /* else {
      store.run('delete', {
        execParams: {
          ID: row.ID
        }
      })
    } */
  })
  mParams.resultData = JSON.stringify({ data: importMap, dictList: importParams.dictList(importParams, mParams.orgID) })
}

me.removeMap = function (ctx) {
  const mParams = ctx.mParams
  removeDuplicates(mParams.entityName, mParams.orgID)
  const store = UB.DataStore('hr_importMap')
  const importParams = importConfig.getEntityConfig(mParams.entityName)
  let impParams = UB.Repository('hr_importParams')
    .attrs(['*'])
    .where('orgID', '=', mParams.orgID)
    .selectSingle() || {}
  const dependenceOrg = impParams.isOrgList ? importService.getDependenceOrg(mParams.orgID) : null
  const dependenceEmployeeOrg = impParams.isOrgList ? importService.getDependenceEmployeeOrg(mParams.orgID) : null
  const importMap = UB.Repository('hr_importMap')
    .attrs(['ID', 'inputID', 'inputCode', 'inputName', 'outputID', 'outputCode', 'outputName'])
    .where('orgID', '=', mParams.orgID)
    .where('entityName', '=', mParams.entityName)
    .selectAsObject()
  importMap.forEach(row => {
    const attrNames = ['ID']
    if (importParams.codeAttr && importParams.codeAttr !== '') {
      attrNames.push(importParams.codeAttr)
    }
    if (importParams.nameAttr && importParams.nameAttr !== '') {
      attrNames.push(importParams.nameAttr)
    }

    const exRow = UB.Repository(importParams.impEntityName)
      .attrs(['*'])
      .where('impID', '=', row.inputID)
      .where('orgID', '=', mParams.orgID)
      .selectSingle()
    let rowOrgID = mParams.orgID
    if (impParams.isOrgList && exRow && exRow.impOrgID) {
      const attrOrg = importService.getAttrOrg(exRow)
      if (attrOrg) {
        rowOrgID = importService.getRowOrgID(exRow, dependenceOrg, dependenceEmployeeOrg)
      }
    }

    const outputMap = (mParams.toCompare && exRow) ? (importParams.exists(exRow, importParams, rowOrgID) || {}) : {}
    store.run('update', {
      execParams: {
        ID: row.ID,
        outputID: outputMap.ID || null,
        outputCode: (importParams.codeAttr && importParams.codeAttr !== '' && outputMap.ID) ? outputMap[importParams.codeAttr] : null,
        outputName: (importParams.nameAttr && importParams.nameAttr !== '' && outputMap.ID) ? outputMap[importParams.nameAttr] : null
      }
    })
  })
  mParams.resultData = JSON.stringify({ data: importMap, dictList: importParams.dictList(importParams, mParams.orgID) })
}

me.generateXLSX = function (ctx) {
  const mParams = ctx.mParams
  const importMap = UB.Repository('hr_importMap')
    .attrs(['ID', 'inputID', 'inputCode', 'inputName', 'outputID', 'outputCode', 'outputName'])
    .where('orgID', '=', mParams.orgID)
    .where('entityName', '=', mParams.entityName)
    .selectAsObject()

  const doc = new tpManager({
    document: {
      margin: {
        top: 10,
        right: 8,
        bottom: 8,
        left: 20
      },
      align: 'left',
      orientation: '2',
      bottomColontitle: {
        font: {
          name: 'TimesNewRoman',
          type: 'Normal',
          size: 10
        },
        height: 8
      }
    },
    docTable: {
      baseStyle: 'baseBlock',
      font: { size: 9, name: 'TimesNewRoman' },
      align: 'left',
      wordWrap: true,
      allowEmpty: true,
      columns: {
        verticalAlign: 'center',
        config: [{ width: 20 }, { width: 50 }, { width: 20 }, { width: 50 }]
      }
    }
  }, 'xlsx')

  let table = []
  table.push([
    { content: 'Вхідний ID' },
    { content: 'Вхідна назва' },
    { content: 'Вихідний ID' },
    { content: 'Вихідна назва' }
  ])
  importMap.forEach(row => {
    table.push([
      { content: row.inputID, style: { format: '@' } },
      { content: `${row.inputName ? row.inputName : ''}${row.inputCode ? `[${row.inputCode}]` : ''}` },
      { content: row.outputID, style: { format: '@' } },
      { content: `${row.outputName ? row.outputName : ''}${row.outputCode ? `[${row.outputCode}]` : ''}` }
    ])
  })
  doc.table(table, 'docTable')
  mParams.data = JSON.stringify(generateBase64Str(doc.getDocument()))
}
