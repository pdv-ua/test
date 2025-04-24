const UB = require('@unitybase/ub')
const TPManager = require('../../../AC/modules/documentBuilder/tpManager')
const dateService = require('../../../AC/modules/dataServices/dateService')
const searchService = require('../../../HR/modules/searchService')

module.exports = {
  getXlsx
}

const GRIDCOLWIDTH_TO_EXCELWIDTH = 0.1

function getXlsx (params) {
  const data = prepareData(params)
  prepareLookups(params, data)
  const doc = new TPManager(getConfig(params), 'xlsx')
  writeDocument(doc, data, params)
  return doc.getDocument()
}

function addSearchAttrAliases (params, dataItem) {
  params.searchAttrAliases = []
  for (let i = 0; i < Object.keys(dataItem).length; i++) {
    let key = Object.keys(dataItem)[i]
    if (key.startsWith(searchService.searchAttrAlias)) {
      params.searchAttrAliases.push(key)
    }
  }
}

function getSearchAttrAlias (params, idx) {
  return params.searchAttrAliases[idx - 1]
}

function prepareData (params) {
  const columns = params.grid.columns
  const searchValues = params.searchValues
  const ubRequest = params.grid.ubRequest
  if (!ubRequest.whereList) {
    return { items: [] }
  }
  let srchParams = JSON.parse(ubRequest.whereList.srchParams)
  srchParams.addSearchAttr = true
  ubRequest.whereList.srchParams = JSON.stringify(srchParams)
  let searchCtx = {
    mParams: {
      whereList: ubRequest.whereList
    },
    dataStore: UB.DataStore(ubRequest.entity)
  }
  global[ubRequest.entity].select4search(searchCtx)
  const data = JSON.parse(searchCtx.dataStore.asJSONObject)
  let uniqueSearchValues = []
  let srchIdxDelta = 0
  if (data.length > 0) {
    let dataItem = data[0]
    addSearchAttrAliases(params, dataItem)
    for (let i = 0; i < searchValues.length; i++) {
      let searchValue = searchValues[i]
      let alias = getSearchAttrAlias(params, searchValue.index - srchIdxDelta)
      if (alias && dataItem[alias] !== undefined) {
        let duplCol = columns.find(item => item.text === searchValue.attrName)
        if (!duplCol) {
          duplCol = uniqueSearchValues.find(item => item.entity === searchValue.entity && item.attrName === searchValue.attrName)
          if (duplCol) {
            srchIdxDelta++
          }
        }
        if (!duplCol) {
          uniqueSearchValues.push(searchValue)
        }
      }
    }
  }
  params.searchValues = uniqueSearchValues
  params.colCount = columns.length + params.searchValues.length + 1
  return { items: data }
}

function addLookup (params, entity, attr, alias, data) {
  const attrObj = entity ? global[entity].entity.attributes[attr] : params.entityObj.entity.attributes[attr]
  if (['Entity', 'Enum'].includes(attrObj.dataType)) {
    if (attrObj.dataType === 'Enum') {
      params.lookups[alias] = UB.Repository('ubm_enum')
        .attrs('code', 'name')
        .where('eGroup', '=', attrObj.enumGroup)
        .selectAsObject()
    } else {
      const ids = data.items.map(item => item[alias]).filter(item => item !== null)
      if (ids.length > 0) {
        const ascObj = global[attrObj.associatedEntity]
        const lkField = ascObj.entity.descriptionAttribute || 'name'
        params.lookups[alias] = UB.Repository(attrObj.associatedEntity)
          .attrs('ID', lkField)
          .where('ID', 'in', ids)
          .selectAsObject()
      }
    }
  }
}

function prepareLookups (params, data) {
  params.lookups = {}
  params.entityObj = global[params.grid.ubRequest.entity]
  const searchValues = params.searchValues
  for (let i = 0; i < searchValues.length; i++) {
    let searchValue = searchValues[i]
    let alias = getSearchAttrAlias(params, searchValue.index)
    alias && addLookup(params, searchValue.entity, searchValue.attrCode, alias, data)
  }
  const columns = params.grid.columns
  for (let i = 0; i < columns.length; i++) {
    let colObj = columns[i]
    addLookup(params, undefined, colObj.fieldName, colObj.fieldName, data)
  }
}

function getConfig (params) {
  const defWidth = 16
  const colConf = [{ width: 4 }]
  const columns = params.grid.columns
  for (let i = 0; i < columns.length; i++) {
    let colObj = columns[i]
    let width = (colObj.width && parseInt(colObj.width) * GRIDCOLWIDTH_TO_EXCELWIDTH) || defWidth
    colConf.push({ width: width })
  }
  const searchValues = params.searchValues
  for (let i = 0; i < searchValues.length; i++) {
    colConf.push({ width: defWidth })
  }
  return {
    document: {
      orientation: '1'
    },
    header: {
      font: {
        name: 'Times New Roman',
        type: 'Bold',
        size: 12
      },
      border: {
        left: 0,
        top: 0,
        bottom: 0,
        right: 0
      },
      align: 'center',
      verticalAlign: 'center',
      columns: {
        hStretch: true,
        config: colConf
      }
    },
    tableBody: {
      title: '',
      font: {
        name: 'Times New Roman',
        size: 10
      },
      border: {
        left: 0.5,
        top: 0.5,
        bottom: 0.5,
        right: 0.5
      },
      align: 'center',
      verticalAlign: 'center',
      columns: {
        hStretch: true,
        config: colConf
      }
    },
    footer: {
      font: {
        name: 'Times New Roman',
        size: 10
      },
      border: {
        left: 0,
        top: 0,
        bottom: 0,
        right: 0
      },
      align: 'center',
      verticalAlign: 'center',
      columns: {
        hStretch: true,
        config: colConf
      }
    }
  }
}

function writeDocument (doc, data, params) {
  const header = []
  const table = []
  const footer = []

  addPageHeader(header, params)
  doc.table(header, 'header')

  addTableHeaders(table, params)
  addRows(table, data, params)
  doc.table(table, 'tableBody')

  addPageFooter(footer, params)
  doc.table(footer, 'footer')
}

function getEmptyRow (params) {
  let res = []
  for (let i = 0; i < params.colCount; i++) {
    res.push({ content: '' })
  }
  return res
}

function addPageHeader (header, params) {
  header.push([{ content: 'Результат пошуку', style: { font: { type: 'Bold', size: 12 }, colSpan: params.colCount } }])
  header.push(getEmptyRow(params))
}

function addTableHeaders (table, params) {
  let rowContent = [{ content: '№ з/п' }]
  const columns = params.grid.columns
  for (let i = 0; i < columns.length; i++) {
    let colObj = columns[i]
    rowContent.push({ content: colObj.text })
  }
  const searchValues = params.searchValues
  for (let i = 0; i < searchValues.length; i++) {
    let searchValue = searchValues[i]
    rowContent.push({ content: searchValue.attrName })
  }
  table.push(rowContent)
}

function getCellContent (params, entity, attr, alias, val) {
  let align = 'left'
  const attrObj = entity ? global[entity].entity.attributes[attr] : params.entityObj.entity.attributes[attr]
  switch (attrObj.dataType) {
    case 'Entity':
      let entRec = val && params.lookups[alias].find(item => item.ID === val)
      if (entRec) {
        val = entRec.description || entRec.name
      } else {
        val = ''
      }
      break
    case 'Enum':
      let enmRec = val && params.lookups[alias].find(item => item.code === val)
      if (enmRec) {
        val = enmRec.name
      } else {
        val = ''
      }
      break
    case 'Date':
      val = dateService.isMaxDate(val) ? '' : dateService.formatDate(val)
      align = 'center'
      break
    case 'Boolean':
    case 'Float':
    case 'Int':
    case 'Currency':
      align = 'center'
      break
  }
  return { content: val, style: { align: align } }
}

function addRows (table, data, params) {
  const searchValues = params.searchValues
  const columns = params.grid.columns
  let idx = 1
  for (let i = 0; i < data.items.length; i++) {
    let item = data.items[i]
    let rowContent = [
      { content: idx++, style: { align: 'center' } }
    ]
    for (let j = 0; j < columns.length; j++) {
      let colObj = columns[j]
      let attr = colObj.fieldName
      let val = item[attr]
      let cellContent = getCellContent(params, undefined, attr, attr, val)
      rowContent.push(cellContent)
    }
    for (let j = 0; j < searchValues.length; j++) {
      let searchValue = searchValues[j]
      let alias = getSearchAttrAlias(params, searchValue.index)
      if (alias) {
        let attr = searchValue.attrCode
        let val = item[alias]
        let cellContent = getCellContent(params, searchValue.entity, attr, alias, val)
        rowContent.push(cellContent)
      }
    }
    table.push(rowContent)
  }
}

function addPageFooter (footer, params) {
}
