/* global Ext _ $App UB AC HR appAC */
module.exports = {
  initNewSearch,
  addCondItems,
  saveTemplate,
  loadTemplate,
  get,
  getSearchParams,
  onMasterSelectionChange,
  compareReport,
  resultReport
}

function initNewSearch (srchParams) {
  initNewAttr(srchParams)
  initCondBlock(srchParams)
  srchParams.condBlockParams = []
  if (srchParams.addCatInAttrEntity) {
    srchParams.addCatInAttr = AC.entityUtils.getAttributes(srchParams.addCatInAttrEntity)
  }
  initSearchGrid(srchParams)
}

function initCondBlock (srchParams) {
  let condBlockHeaderDef = get('condBlockHeader')
  setCondBodyStyle(srchParams, condBlockHeaderDef)
  srchParams.condPanel.removeAll()
  srchParams.condPanel.add(condBlockHeaderDef)
}

function initSearchGrid (srchParams) {
  filterMenu(srchParams.searchGrid)
  if (srchParams.searchDetGrid) {
    filterMenu(srchParams.searchDetGrid)
    const detStore = srchParams.searchDetGrid.store
    srchParams.searchGrid.store.on('load', () => {
      delete detStore.ubRequest.whereList
      detStore.load()
    })
  }
}

function initNewAttr (srchParams) {
  let attrBlockDef
  srchParams.attrBlockParams && truncAttrBlock(srchParams.attrBlockParams, 1)
  attrBlockDef = addAttrBlock(srchParams)
  srchParams.attrPanel.add(attrBlockDef)
}

function addAttrBlock (srchParams) {
  srchParams.attrPanel.removeAll()
  srchParams.attrBlockParams = get('attrBlockParams')
  srchParams.attrPanel.add(get('addButton', {
    click: function (ctrl) {
      if (applyAttrBlock(srchParams)) {
        initNewAttr(srchParams)
      }
    }
  }))
  srchParams.attrPanel.add(get('category', {
    valueField: srchParams.categoryValueField,
    displayField: srchParams.categoryDisplayField,
    request: srchParams.categoryRequest,
    onchange: function (ctrl, newValue) {
      let addBtn0 = srchParams.attrPanel.down(Ext.String.format('[ubID={0}]', 'btnAddAttr0'))
      let attrData = ctrl.lastSelection[0].data
      srchParams.attrBlockParams.categories[0] = {
        code: attrData.categoryCode,
        name: attrData.categoryName,
        historyField: attrData.historyField,
        historyField2: attrData.historyField2,
        historyDateTo: attrData.historyDateTo,
        historyOnMax: attrData.historyOnMax,
        groupCode: attrData.groupCode }
      if (!addBtn0) {
        checkAddAttrButton(srchParams)
      }
    }
  }))
}

function truncAttrBlock (attrBlockParams, toNum) {
  attrBlockParams.attrNum = toNum - 1
  attrBlockParams.categories.splice(toNum + 1)
  attrBlockParams.attributes.splice(toNum)
}

function checkAddAttrButton (srchParams) {
  let nextNum = srchParams.attrBlockParams.attrNum + 1
  let addBtnUbID = 'btnAddAttr' + nextNum
  let addBtn = srchParams.attrPanel.down(Ext.String.format('[ubID={0}]', addBtnUbID))
  let isAttrChanged = (srchParams.attrBlockParams.attrNum >= 0)
  let dataType = isAttrChanged ? srchParams.attrBlockParams.attributes[srchParams.attrBlockParams.attrNum].dataType : 'Entity'
  let latCat = srchParams.attrBlockParams.categories[nextNum]
  if ((dataType === 'Entity' || dataType === 'NotExistentEntity') && latCat.code && !latCat.noEntityDetails) {
    if (!addBtn) {
      srchParams.attrPanel.add(get('addAttrButton', { num: nextNum,
        click: function (ctrl) {
          if (ctrl.iconCls === 'fa fa-chevron-right') {
            let parentUbID = isAttrChanged ? 'cmbAttr' + srchParams.attrBlockParams.attrNum : 'cmbCategory'
            let parentCtrl = srchParams.attrPanel.down(Ext.String.format('[ubID={0}]', parentUbID))
            addAttribute(srchParams)
            parentCtrl && parentCtrl.setReadOnly(true)
            toggleAddAttrBtn(ctrl, false)
          } else {
            let currNum = ctrl.num
            let attrUbID
            let attrCmb
            for (let i = srchParams.attrBlockParams.attrNum; i >= currNum; i--) {
              let addBtn = srchParams.attrPanel.down(Ext.String.format('[ubID={0}]', 'btnAddAttr' + (i + 1)))
              addBtn && srchParams.attrPanel.remove(addBtn)
              attrUbID = 'cmbAttr' + i
              attrCmb = srchParams.attrPanel.down(Ext.String.format('[ubID={0}]', attrUbID))
              attrCmb && srchParams.attrPanel.remove(attrCmb)
            }
            toggleAddAttrBtn(ctrl, true)
            attrUbID = (currNum <= 0) ? 'cmbCategory' : 'cmbAttr' + (currNum - 1)
            attrCmb = srchParams.attrPanel.down(Ext.String.format('[ubID={0}]', attrUbID))
            attrCmb && attrCmb.setReadOnly(false)
            truncAttrBlock(srchParams.attrBlockParams, currNum)
          }
        }
      }))
    }
  } else {
    addBtn && srchParams.attrPanel.remove(addBtn)
  }
}

function addAttribute (srchParams) {
  srchParams.attrBlockParams.attrNum++
  let lastAttrNum = srchParams.attrBlockParams.attrNum
  let lastCategory = srchParams.attrBlockParams.categories[lastAttrNum]
  let parentCategory = srchParams.attrBlockParams.categories[0].code
  srchParams.attrPanel.add(get('attribute', {
    num: lastAttrNum,
    valueField: srchParams.attrValueField,
    displayField: srchParams.attrDisplayField,
    request: _.merge(srchParams.attrRequest, {
      parentCategory: parentCategory
    }),
    categoryValueField: srchParams.categoryValueField,
    categoryGroupField: srchParams.categoryGroupField,
    categoryCode: lastCategory.code,
    parentGroupCode: lastCategory.groupCode,
    fieldLabel: lastCategory.name,
    onchange: function (ctrl, newValue) {
      let attrData = ctrl.lastSelection[0].data
      lastAttrNum = srchParams.attrBlockParams.attrNum
      srchParams.attrBlockParams.attributes[lastAttrNum] = {
        code: attrData.attributeCode,
        name: attrData.attributeName,
        dataType: attrData.dataType,
        associatedEntity: attrData.associatedEntity,
        associationAttr: attrData.associationAttr,
        historyField: attrData.historyField,
        historyField2: attrData.historyField2,
        historyDateTo: attrData.historyDateTo,
        historyOnMax: attrData.historyOnMax,
        mapExpression: attrData.mapExpression,
        parentGroupCode: attrData.parentGroupCode,
        groupCode: attrData.groupCode,
        noEntityDetails: attrData.noEntityDetails
      }
      lastCategory = { code: attrData.associatedEntity, name: attrData.attributeName, groupCode: attrData.groupCode, noEntityDetails: attrData.noEntityDetails }
      srchParams.attrBlockParams.categories[lastAttrNum + 1] = lastCategory
      setHistory4Cat(attrData.associatedEntity, function (result) {
        if (result.historyField) {
          let catData = lastCategory
          catData.historyField = result.historyField
          catData.historyField2 = result.historyField2
          catData.historyDateTo = result.historyDateTo
          catData.historyOnMax = result.historyOnMax
        }
      })
      checkAddAttrButton(srchParams)
    }
  }))
}

function setHistory4Cat (entity, fnCallBack) {
  $App.connection.run({
    entity: 'hr_searchAttr',
    method: 'selectHistoryCondition',
    execParams: {
      entity: entity
    }
  }).then(function (result) {
    if (result && result.execParams.result) {
      fnCallBack(result.execParams.result)
    }
  })
}

function toggleAddAttrBtn (btn, toAdd) {
  if (toAdd) {
    btn.setIconCls('fa fa-chevron-right')
    btn.setTooltip(UB.i18n('Показати атрибути сутності, на яку посилається вибраний атрибут'))
  } else {
    btn.setIconCls('fa fa-chevron-left')
    btn.setTooltip(UB.i18n('Видалити атрибути праворуч'))
  }
}

function applyAttrBlock (srchParams) {
  if (!srchParams.attrBlockParams.attributes || !srchParams.attrBlockParams.attributes.length ||
    (srchParams.attrBlockParams.attributes[srchParams.attrBlockParams.attrNum].dataType === 'NotExistentEntity')) {
    AC.viewUtils.showToast(UB.i18n('Не вибрано атрибуту для додавання'))
    return false
  }
  let condBlockItemParams = get('condBlockParams')
  let attrCount = srchParams.attrBlockParams.attributes.length
  if (!srchParams.attrBlockParams.categories[attrCount]) srchParams.attrBlockParams.categories.splice(attrCount)
  condBlockItemParams.categories = _.clone(srchParams.attrBlockParams.categories)
  condBlockItemParams.attributes = _.clone(srchParams.attrBlockParams.attributes)
  srchParams.condBlockParams.push(condBlockItemParams)
  addCondItemBlock(srchParams)
  return true
}

function addCondItemBlock (srchParams) {
  let lastIndex = srchParams.condBlockParams.length - 1
  let condBlockItemParams = srchParams.condBlockParams[lastIndex]
  let num = (condBlockItemParams.num >= 0) ? condBlockItemParams.num
    : ((lastIndex > 0) ? srchParams.condBlockParams[lastIndex - 1].num + 1 : 0)
  let lastAttrNum = condBlockItemParams.attributes.length - 1
  let lastAttrData = condBlockItemParams.attributes[lastAttrNum]
  let historyCategory = getHistoryCategory(condBlockItemParams)
  let lastCategoryData = condBlockItemParams.categories[lastAttrNum]
  let lastAttr = lastAttrData.code
  let attrDataType = lastAttrData.dataType
  let hasOnDate = !!(historyCategory && historyCategory.historyField)
  let hasHistCond = !!(historyCategory && historyCategory.historyOnMax)
  // вибраний атрибут - є віртуальним типом: Особа або картка особи
  let isAddCat = (attrDataType === 'NotExistentEntity' && srchParams.addCatInAttr &&
    srchParams.addCatInAttr[lastAttrData.associatedEntity])
  let newBlock = get('condBlock', { num: num })
  let operationCont
  let oppositeCont
  let valueContainer
  let valueCtrlCfgArr
  condBlockItemParams.num = num
  newBlock.items.push(get('delButton', { num: num,
    click: function (ctrl) {
      let firstNum = (srchParams.condBlockParams.length > 0) ? srchParams.condBlockParams[0].num : -1
      let delBlock = srchParams.condPanel.down(Ext.String.format('[ubID={0}]', 'condBlock' + num))
      let delIndex = getCondIndexByNum(srchParams.condBlockParams, ctrl.num)
      srchParams.condPanel.remove(delBlock)
      srchParams.condBlockParams.splice(delIndex, 1)
      if (srchParams.condBlockParams.length > 0 && firstNum === ctrl.num) {
        let condBlockItemParam0 = srchParams.condBlockParams[0]
        let operCont0ID = condBlockItemParam0.operationContID
        let operCont0 = srchParams.condPanel.down(Ext.String.format('[ubID={0}]', operCont0ID))
        AC.viewUtils.setPanelHidden(operCont0, true)
        condBlockItemParam0.operation = ''
      }
    }
  }))
  operationCont = get('operation', {
    num: num,
    hidden: lastIndex <= 0,
    onchange: function (ctrl, newValue) {
      condBlockItemParams.operation = newValue
    },
    afterrender: function (ctrl) {
      if (condBlockItemParams.operation) {
        ctrl.setValue(condBlockItemParams.operation)
      } else {
        if (lastIndex > 0) ctrl.setValue('and')
      }
    }
  })
  condBlockItemParams.operationContID = operationCont.ubID
  newBlock.items.push(operationCont)
  newBlock.items.push(get('lbracket', {
    num: num,
    onchange: function (ctrl, newValue) {
      condBlockItemParams.lbracket = newValue
    },
    afterrender: function (ctrl) {
      if (condBlockItemParams.lbracket) {
        ctrl.setValue(condBlockItemParams.lbracket)
      }
    }
  }))
  newBlock.items.push(get('label', {
    text: Ext.Array.pluck(condBlockItemParams.categories, 'name').join('.')
  }))
  oppositeCont = get('opposite', {
    num: num,
    onchange: function (ctrl, newValue) {
      condBlockItemParams.opposite = newValue
    },
    afterrender: function (ctrl) {
      if (condBlockItemParams.opposite) {
        ctrl.setValue(condBlockItemParams.opposite)
      }
    }
  })
  condBlockItemParams.oppositeContID = oppositeCont.ubID
  newBlock.items.push(oppositeCont)
  valueContainer = get('valueContainer', { num: num })
  condBlockItemParams.valueContainerID = valueContainer.ubID
  newBlock.items.push(get('condition', {
    num: num,
    dataType: attrDataType,
    onchange: function (ctrl, newValue) {
      condBlockItemParams.condition = newValue
      setValueCtrlVisible(srchParams, condBlockItemParams)
    },
    afterrender: function (ctrl) {
      let condition = condBlockItemParams.condition
      if (condition) {
        ctrl.setValue(condition)
      } else {
        let val
        switch (attrDataType) {
          case 'String':
          case 'Text':
            val = 'startWith'
            break
          case 'NotExistentEntity':
            val = 'exists'
            break
          case 'Document':
            val = 'isNull'
            break
          default:
            val = 'equal'
            break
        }
        ctrl.setValue(val)
      }
    }
  }))
  if (isAddCat) {
    condBlockItemParams.valueCtrlID = null
  } else {
    valueCtrlCfgArr = get('value', {
      num: num,
      entity: lastCategoryData.code,
      attributeName: lastAttr,
      dataType: attrDataType,
      onchange: function (ctrl, newValue) {
        condBlockItemParams.value = newValue
      },
      afterrender: function (ctrl) {
        if (ctrl.hidden) return
        ctrl.focus()
        if (condBlockItemParams.value) {
          if (ctrl.xtype === 'ubcombobox') {
            ctrl.setValueById(condBlockItemParams.value)
          } else if (ctrl.xtype === 'ubdatefield') {
            ctrl.setValue(new Date(condBlockItemParams.value))
          } else if (ctrl.xtype === 'ubmultiselecbox') {
            ctrl.setValue(condBlockItemParams.value)
            AC.viewUtils.storeLoadAll(ctrl.getStore())
          } else {
            ctrl.setValue(condBlockItemParams.value)
          }
          setValueCtrlVisible(srchParams, condBlockItemParams)
        }
      }
    })
    if (attrDataType === 'Boolean' && !condBlockItemParams.value) {
      condBlockItemParams.value = false
    }
    condBlockItemParams.valueCtrlID = valueCtrlCfgArr[0].ubID
    valueContainer.items.push(valueCtrlCfgArr[0])
    if (valueCtrlCfgArr.length > 1) {
      condBlockItemParams.valueMultiCtrlID = valueCtrlCfgArr[1].ubID
      valueContainer.items.push(valueCtrlCfgArr[1])
    }
  }
  newBlock.items.push(valueContainer)
  newBlock.items.push(get('historyCondition', {
    num: num,
    hidden: !hasHistCond,
    onchange: function (ctrl, newValue) {
      condBlockItemParams.historyCondition = newValue
    },
    afterrender: function (ctrl) {
      if (condBlockItemParams.historyCondition) {
        ctrl.setValue(condBlockItemParams.historyCondition)
      } else {
        if (hasHistCond) ctrl.setValue('max')
      }
    }
  }))
  condBlockItemParams.historyCategory = historyCategory
  newBlock.items.push(get('onDate', {
    num: num,
    hidden: !hasOnDate,
    onchange: function (ctrl, newValue) {
      let isValidDate = ctrl.isValid()
      let newDate = (newValue !== null) && isValidDate ? UB.core.UBUtil.truncTimeToUtcNull(new Date(newValue)) : null
      if (!hasOnDate || !isValidDate) {
        return
      }
      condBlockItemParams.onDate = newDate
    },
    afterrender: function (ctrl) {
      if (condBlockItemParams.onDate) {
        ctrl.setValue(new Date(condBlockItemParams.onDate))
      } else if (hasOnDate) {
        ctrl.setValue(new Date())
      }
    }
  }))
  newBlock.items.push(get('rbracket', {
    num: num,
    onchange: function (ctrl, newValue) {
      condBlockItemParams.rbracket = newValue
    },
    afterrender: function (ctrl) {
      if (condBlockItemParams.rbracket) {
        ctrl.setValue(condBlockItemParams.rbracket)
      }
    }
  }))
  srchParams.condPanel.add(newBlock)
}

function setValueCtrlVisible (srchParams, condBlockItemParams) {
  if (!condBlockItemParams.valueCtrlID) return
  let valueContainer = srchParams.condPanel.down(Ext.String.format('[ubID={0}]', condBlockItemParams.valueContainerID))
  let valueCtrl = srchParams.condPanel.down(Ext.String.format('[ubID={0}]', condBlockItemParams.valueCtrlID))
  let hasMultiCtrl = condBlockItemParams.valueMultiCtrlID && condBlockItemParams.valueMultiCtrlID.length
  let valueMultiCtrl = hasMultiCtrl ? srchParams.condPanel.down(Ext.String.format('[ubID={0}]', condBlockItemParams.valueMultiCtrlID)) : null
  let showMultiSelect = (condBlockItemParams.condition === 'in')
  let isHidden = condBlockItemParams.condition === 'isNull'

  AC.viewUtils.setPanelHidden(valueContainer, isHidden)
  if (isHidden) {
    valueCtrl.allowBlank = true
    valueCtrl.setVisible(false)
    if (valueMultiCtrl) {
      valueMultiCtrl.allowBlank = true
      valueMultiCtrl.setVisible(false)
    }
  } else {
    valueCtrl.allowBlank = showMultiSelect
    valueCtrl.setVisible(!showMultiSelect)
    if (valueMultiCtrl) {
      valueMultiCtrl.allowBlank = !showMultiSelect
      valueMultiCtrl.setVisible(showMultiSelect)
    }
  }
}

function getHistoryCategory (condBlockItemParams) {
  let res = null
  for (let i = condBlockItemParams.attributes.length - 1; i >= 0; i--) {
    let dateType = condBlockItemParams.attributes[i].dataType
    let categoryData = dateType === 'NotExistentEntity' ? condBlockItemParams.categories[i + 1] : condBlockItemParams.categories[i]
    let isDateType = (dateType === 'Date' || dateType === 'DateTime')
    let mapExpression = condBlockItemParams.attributes[i].mapExpression
    if (categoryData.historyField) {
      if (!isDateType && !mapExpression) {
        res = categoryData
      }
      break
    }
  }
  return res
}

function setSql (srchParams, lbl) {
  return $App.connection.run({
    entity: srchParams.searchEntity,
    method: srchParams.getSqlMethod,
    params: srchParams.whereList
  }).then(function (result) {
    let sql = parseSqlParams(result.runsql, result.whereParams)
    sql = sqlTextToHtml(sql)
    lbl.setText(sql, false)
  })
}

function getParamSqlValue (paramValue) {
  let res = paramValue
  if (res instanceof Date || AC.dateService.isDateTimeString(res)) {
    res = AC.dateService.formatDate4Sql(res)
  } else if (typeof res === 'boolean') {
    res = res ? '1' : '0'
  } else if (typeof res === 'string') {
    res = Ext.String.format(`'{0}'`, res)
  }
  return res
}

function parseSqlParams (sqlText, sqlParams) {
  let reg = /:(\w*):/g
  let res = sqlText
  let par
  while ((par = reg.exec(sqlText)) !== null) {
    let replaceStr = par[0]
    if (replaceStr !== '::') {
      let paramName = par[1]
      if (sqlParams[paramName]) {
        res = res.replace(replaceStr, getParamSqlValue(sqlParams[paramName]))
      }
    }
  }
  return res
}

function sqlTextToHtml (sqlText) {
  let res = sqlText.replace(/\r?\n/g, '<br/>')
  res = res.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
  res = res.replace(/ {4}/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
  return res
}

function checkCustomParams (srchParams) {
  let r = 0
  let parBlockLen = srchParams.condBlockParams.length
  srchParams.waitForCheck = (parBlockLen > 0)
  for (let i = 0; i < parBlockLen; i++) {
    let condBlockItemParams = srchParams.condBlockParams[i]
    let attrs = condBlockItemParams.attributes
    let attrCount = attrs.length
    let catCode = condBlockItemParams.categories[attrCount - 1].code
    let attrData = attrs[attrCount - 1]
    let attrCode = attrData.code
    let srchRequest = _.clone(srchParams.attrRequest)
    r++
    srchRequest.whereList = {
      categoryCode: {
        expression: '[categoryCode]',
        condition: 'equal',
        values: {
          value: catCode
        }
      }
    }
    // to prevent monkey request error
    srchRequest.whereList['req' + r] = {
      expression: '[ID]',
      condition: 'more',
      values: {
        value: -r
      }
    }
    $App.connection.run(srchRequest)
      .then(function (result) {
        let resData = UB.LocalDataStore.selectResultToArrayOfObjects(result)
        for (let j = 0; j < resData.length; j++) {
          let resAttrData = resData[j]
          if (resAttrData.attributeCode === attrCode) {
            if (resAttrData.mapExpression) {
              attrData.mapExpression = resAttrData.mapExpression
            }
            break
          }
        }
        if (i === parBlockLen - 1) {
          srchParams.waitForCheck = false
        }
      })
  }
}

function initSearchRequest (srchParams, store) {
  let condCount = srchParams.condBlockParams.length
  if (condCount === 0) {
    AC.viewUtils.showToast(UB.i18n('Не вибрано жодної умови для пошуку'))
    return false
  }
  srchParams.whereList = {
    srchParams: JSON.stringify(getSearchParams4Server(srchParams))
  }
  store.ubRequest.params = srchParams.whereList
  return true
}

function getSearchParams4Server (srchParams) {
  let srvParams = {
    onDate: HR.searchAttrWhereList.getBaseEntityOnDate(srchParams),
    baseEntity: srchParams.baseEntity,
    baseEntityAlias: srchParams.baseEntityAlias,
    baseEntityKey: srchParams.baseEntityKey,
    baseJoinField: srchParams.baseJoinField,
    joinExclusions: srchParams.joinExclusions,
    condBlockParams: HR.searchAttrWhereList.prepareCondParams(srchParams.condBlockParams)
  }
  if (!srchParams.searchAllOrg) {
    srvParams.orgID = appAC.globalOrganization()
  }
  if (!srvParams.searchOrgMode) {
    srvParams.searchOrgMode = AC.settings.get('hrSearchOrgMode')
  }
  return srvParams
}

function getSearchParams (cfgArray) {
  let res = []
  if (!(_.isArray(cfgArray) && cfgArray.length)) return res
  for (let i = 0; i < cfgArray.length; i++) {
    let cfgItem = cfgArray[i]
    let attrFullName = cfgItem.attribute
    let attrNames = attrFullName.split('.')
    let searchItem = {
      operation: cfgItem.operation || '',
      lbracket: cfgItem.lbracket || '',
      condition: cfgItem.condition || 'equal',
      opposite: cfgItem.opposite,
      value: cfgItem.value,
      historyField: cfgItem.historyField,
      historyField2: cfgItem.historyField2,
      historyDateTo: cfgItem.historyDateTo,
      historyOnMax: cfgItem.historyOnMax,
      onDate: cfgItem.onDate,
      rbracket: cfgItem.rbracket || '',
      num: i,
      historyCategory: cfgItem.historyCategory
    }
    let entityName = attrNames[0]
    let entityData = $App.domainInfo.get(entityName)
    let entityAttributes
    let virtualEntity
    searchItem.categories = [{ code: entityName, name: entityData.caption }]
    searchItem.attributes = []
    entityAttributes = AC.entityUtils.getAttributes(entityName)
    for (let j = 1; j < attrNames.length; j++) {
      let attr = attrNames[j]
      let attrData = entityAttributes[attr]
      if (attrData) {
        let dataType, attrAssociatedEntity, associationAttr
        if (virtualEntity) {
          dataType = 'NotExistentEntity'
          attrAssociatedEntity = virtualEntity
        } else {
          dataType = attrData.dataType
          attrAssociatedEntity = attrData.associatedEntity
          associationAttr = attrData.associationAttr
        }
        searchItem.attributes.push({
          code: attr,
          name: attrData.caption,
          dataType: dataType,
          associatedEntity: attrAssociatedEntity,
          associationAttr: associationAttr
        })

        if (attrData.associatedEntity) {
          entityName = attrData.associatedEntity
          entityAttributes = AC.entityUtils.getAttributes(entityName)
          searchItem.categories.push({ code: entityName, name: attrData.caption })
        } else {
          if (attr !== 'ID') {
            searchItem.categories.push({ code: attr, name: attrData.caption })
          }
        }
        virtualEntity = null
      } else {
        // NotExistentEntity
        let virtAttrs = AC.entityUtils.getAttributes('hr_searchEmpCard')
        searchItem.categories.push({ code: attr, name: virtAttrs[attr].caption })
        virtualEntity = attr
      }
    }
    if (searchItem.historyField) {
      let firstCat = searchItem.categories[0]
      firstCat.historyField = searchItem.historyField
      firstCat.historyField2 = searchItem.historyField2
      firstCat.historyDateTo = searchItem.historyDateTo
      firstCat.historyOnMax = searchItem.historyOnMax
    }
    res.push(searchItem)
  }
  return res
}

function runSearch (srchParams) {
  let grid = srchParams.searchGrid
  let store = grid.getStore()
  if (initSearchRequest(srchParams, store)) {
    if (!grid.isLoaded) {
      store.load()
      grid.isLoaded = true
    } else {
      store.load()
      // grid.pagingBar.moveFirst()
    }
    setSql(srchParams, srchParams.sqlLabel)
    enableResultActions(srchParams, true, false)
  }
}

function filterMenu (grid) {
  let menu = grid.menu || grid.up().menu
  if (menu) {
    menu.removeAll()
    if (grid.contextMenuType === 'employee') {
      menu.add([HR.employeeTabs.getEmpCardMenu(grid)])
    } else if (grid.contextMenuType === 'position') {
      menu.add([HR.controlService.getPosCardMenu(grid)])
    }
  }
}

function beforeSaveTemplate (srchParams) {
  /* for (let i = 0; i < srchParams.condBlockParams.length; i++) {
    let condBlockItemParams = srchParams.condBlockParams[i]
    let num = condBlockItemParams.num
    if (condBlockItemParams.condition === 'in') {
      let ctrlMultiValue = srchParams.condPanel.down(Ext.String.format('[ubID={0}]', 'ctrlMultiValue' + num))
    }
  } */
}

function selectTemplate (srchParams, onSelected) {
  $App.doCommand({
    cmdType: 'showList',
    isModal: true,
    hideActions: ['addNewByCurrent', 'addNew'],
    onItemSelected: function (itemId) {
      let data
      if (itemId && (data = itemId.getData())) {
        onSelected(srchParams, data.ID)
        this.isSaved = true
      }
    },
    onClose: function (itemId) {
      if (!this.isSaved) {
        if (this.selectedRecordID) {
          onSelected(srchParams, this.selectedRecordID)
        }
      }
    },
    cmpInitConfig: {
      autoScroll: true,
      customInit: function () {
        this.customParams = {
          searchEntity: srchParams.templateEntity
        }
        AC.gridUtils.tuneGridColumns(this, {
          'ID': { hidden: true },
          'code': { align: 'center', width: 80 },
          'name': { width: 200 },
          'isGlobal': { align: 'center', width: 60 },
          'mi_owner.name': { title: UB.i18n('Автор'), align: 'center', width: 120 },
          'mi_modifyDate': { title: UB.i18n('Дата зміни'), align: 'center', width: 120 }
        })
      }
    },
    cmdData: {
      params: [
        {
          entity: 'hr_searchTemplate',
          method: 'select4user',
          fieldList: ['ID', 'code', 'name', 'isGlobal', 'mi_owner.name', 'mi_modifyDate'],
          whereList: {
            searchEntity: {
              expression: '[searchEntity]',
              condition: 'equal',
              values: {
                searchEntity: srchParams.templateEntity
              }
            }
          }
        }
      ]
    }
  })
}

function newTemplate (srchParams, onSelected) {
  $App.doCommand({
    cmdType: 'showForm',
    isModal: true,
    customParams: {
      searchEntity: srchParams.templateEntity,
      onSave: function (form) {
        onSelected(srchParams, form.record.get('ID'))
      }
    },
    cmdData: {
      params: [
        {
          entity: 'hr_searchTemplate',
          method: 'select4user',
          fieldList: ['ID', 'code', 'name', 'isGlobal', 'mi_owner.name', 'mi_modifyDate'],
          whereList: {
            searchEntity: {
              expression: '[searchEntity]',
              condition: 'equal',
              values: {
                searchEntity: srchParams.templateEntity
              }
            }
          }
        }
      ]
    }
  })
}

function saveTemplate (srchParams, templateId) {
  beforeSaveTemplate(srchParams)
  $App.connection.run({
    __skipOptimisticLock: true,
    entity: 'hr_searchTemplate',
    method: 'update',
    execParams: {
      ID: templateId,
      template: JSON.stringify(srchParams.condBlockParams),
      mi_modifyDate: new Date()
    }
  })
}

function loadTemplate (srchParams, templateId) {
  UB.Repository('hr_searchTemplate')
    .attrs(['template', 'mi_modifyDate'])
    .where('ID', '=', templateId)
    .selectAsObject().then(reco => {
      reco = reco[0]
      if (reco && reco.template) {
        let templCondBlockParams = JSON.parse(reco.template)
        initLoadedParams(templCondBlockParams, reco)
        initNewSearch(srchParams)
        addCondItems(srchParams, templCondBlockParams)
      }
    })
}

function addCondItems (srchParams, condItems) {
  let loadItemsCnt
  if (!_.isArray(condItems)) return
  loadItemsCnt = condItems.length
  if (loadItemsCnt > 0) {
    for (let i = 0; i < loadItemsCnt; i++) {
      srchParams.condBlockParams.push(condItems[i])
      addCondItemBlock(srchParams)
    }
    checkCustomParams(srchParams)
  }
}

function setCondBodyStyle (srchParams, ctrl) {
  ctrl.bodyStyle = srchParams.condPanel.bodyStyle
}

function checkCondData (srchParams) {
  let lBracketCnt = Ext.Array.pluck(srchParams.condBlockParams, 'lbracket').join('').length
  let rBracketCnt = Ext.Array.pluck(srchParams.condBlockParams, 'rbracket').join('').length
  const form = srchParams.condPanel.up('form')
  if (form && !form.isValid()) {
    return UB.i18n(`Не заповнені обов'язкові поля`)
  }
  if (lBracketCnt !== rBracketCnt) {
    return UB.i18n('Кількість дужок, що відкривають групи, не відповідає кількості дужок, що закривають групу')
  }
  lBracketCnt = 0
  rBracketCnt = 0
  for (let i = 0; i < srchParams.condBlockParams.length; i++) {
    let condItemBlock = srchParams.condBlockParams[i]
    lBracketCnt += condItemBlock.lbracket.length
    rBracketCnt += condItemBlock.rbracket.length
    if (rBracketCnt > lBracketCnt) {
      return Ext.String.format(UB.i18n('Для {0}-ої умови дужки, що закривають групу, передують дужкам, що відкривають групу'), i + 1)
    }
  }
  return null
}

async function checkPrivateData (srchParams) {
  const staffUnitEntities = ['hr_position', 'hr_department', 'hr_organization']
  const noRightFields = []
  for (let i = 0; i < srchParams.condBlockParams.length; i++) {
    let condBlockItemParams = srchParams.condBlockParams[i]
    let lastAttrNum = condBlockItemParams.attributes.length - 1
    let lastAttrData = condBlockItemParams.attributes[lastAttrNum]
    if (lastAttrData.associatedEntity && staffUnitEntities.includes(lastAttrData.associatedEntity)) {
      const checkUserOrgRight = await $App.connection.run({
        entity: 'hr_staffUnit',
        method: 'checkUnitRight',
        mi_data_id: condBlockItemParams.value,
        orgID: appAC.globalOrganization(),
        onDate: appAC.globalApplicationDate(),
        entityName: lastAttrData.associatedEntity,
        // monkey request prevention
        currTime: Date.now()
      })
      if (!checkUserOrgRight.result) {
        noRightFields.push(Ext.Array.pluck(condBlockItemParams.categories, 'name').join('.'))
      }
    }
  }
  if (noRightFields.length > 0) {
    let msg = UB.i18n('Не можливо виконувати пошук по полю(ям):<br/> - "{0}",<br/> до Організації яких не встановлено право доступу.<br/> Вивести результати тільки по доступним Організаціям?',
      noRightFields.join('",<br/> - "'))
    return $App.dialogYesNo(UB.i18n('Попередження!'), msg)
  } else {
    return Promise.resolve(true)
  }
}

function initLoadedParams (condBlockParams, templateRec) {
  let today = new Date()
  let modifyDate = new Date(templateRec.mi_modifyDate)
  modifyDate.setHours(0, 0, 0, 0)
  for (let i = 0; i < condBlockParams.length; i++) {
    let condBlockItemParams = condBlockParams[i]
    let lastAttrNum = condBlockItemParams.attributes.length - 1
    let lastAttrType = condBlockItemParams.attributes[lastAttrNum].dataType
    let isDateType = (lastAttrType === 'Date' || lastAttrType === 'DateTime')
    let hasOnDate = !!condBlockItemParams.onDate
    if (isDateType || hasOnDate) {
      if (isDateType) {
        let valDate = new Date(condBlockItemParams.value)
        valDate.setHours(0, 0, 0, 0)
        if (valDate.getTime() === modifyDate.getTime()) {
          condBlockItemParams.value = today
        }
      }
      if (hasOnDate) {
        let onDate = new Date(condBlockItemParams.onDate)
        onDate.setHours(0, 0, 0, 0)
        if (onDate.getTime() === modifyDate.getTime()) {
          condBlockItemParams.onDate = today
        }
      }
    }
  }
}

function getCondIndexByNum (condBlockItemParams, num) {
  let res = -1
  for (let i = 0; i < condBlockItemParams.length; i++) {
    if (condBlockItemParams[i].num === num) {
      res = i
      break
    }
  }
  return res
}

function getResultSearchValues (srchParams) {
  let res = []
  for (let i = 0; i < srchParams.condBlockParams.length; i++) {
    let condBlockItemParams = srchParams.condBlockParams[i]
    let lastAttrNum = condBlockItemParams.attributes.length - 1
    let lastAttrData = condBlockItemParams.attributes[lastAttrNum]
    res.push({
      index: i + 1,
      entity: condBlockItemParams.categories[lastAttrNum] && condBlockItemParams.categories[lastAttrNum].code,
      attrCode: lastAttrData.code,
      attrName: lastAttrData.name
    })
  }
  return res
}

function get (blockName, cmpConfig) {
  let result = getFormBlocks()[blockName]
  if (!result) {
    return { xtype: 'label', text: '!' + blockName, style: { background: 'red' } }
  }
  return _.isFunction(result) ? result(cmpConfig) : result
}

function getFormBlocks () {
  return {
    attrBlockParams: function () {
      return {
        attrNum: -1,
        categories: [],
        attributes: []
      }
    },
    condBlockParams: function () {
      return {
        operation: '',
        operationContID: '',
        lbracket: '',
        categories: [],
        attributes: [],
        condition: '',
        opposite: false,
        oppositeContID: '',
        valueContainerID: '',
        valueCtrlID: '',
        valueMultiCtrlID: '',
        value: null,
        historyCondition: null,
        historyCategory: null,
        onDate: null,
        rbracket: '',
        num: -1
      }
    },
    addButton: function (cfg) {
      return {
        xtype: 'button',
        ubID: 'btnAddBlock',
        tooltip: UB.i18n('Додати атрибут'),
        width: 30,
        height: 20,
        margin: '30 5 15 5',
        iconCls: cfg.iconCls ? cfg.iconCls : 'fa fa-plus',
        listeners: {
          click: function (ctrl) {
            if (cfg.click && _.isFunction(cfg.click)) {
              cfg.click(ctrl)
            }
          }
        }
      }
    },
    category: function (cfg) {
      return {
        xtype: 'ubcombobox',
        ubID: 'cmbCategory',
        valueField: 'ID',
        displayField: cfg.displayField || 'categoryName',
        fieldLabel: UB.i18n('Категорія'),
        labelAlign: 'top',
        width: 230,
        margins: '0 0 10 0',
        disableContextMenu: true,
        store: Ext.create('UB.ux.data.UBStore', {
          ubRequest: cfg.request,
          autoLoad: true,
          autoDestroy: true
        }),
        listeners: {
          change: function (ctrl, newValue) {
            if (cfg.onchange) {
              cfg.onchange(ctrl, newValue)
            }
          }
        }
      }
    },
    attribute: function (cfg) {
      return {
        xtype: 'ubcombobox',
        ubID: 'cmbAttr' + cfg.num,
        num: cfg.num || 0,
        valueField: 'ID',
        displayField: cfg.displayField || 'attributeDesc',
        fieldLabel: cfg.fieldLabel || UB.i18n('Атрибут'),
        labelAlign: 'top',
        width: 290,
        margins: '0 0 10 0',
        disableContextMenu: true,
        store: Ext.create('UB.ux.data.UBStore', {
          ubRequest: _.merge(cfg.request, {
            whereList: {
              categoryCode: {
                expression: Ext.String.format('[{0}]', cfg.categoryValueField),
                condition: 'equal',
                values: {
                  value: cfg.categoryCode
                }
              },
              parentGroupCode: {
                expression: Ext.String.format('[{0}]', cfg.categoryGroupField),
                condition: 'equal',
                values: {
                  value: cfg.parentGroupCode
                }
              }
            }
          }),
          autoLoad: true,
          autoDestroy: true
        }),
        listeners: {
          change: function (ctrl, newValue) {
            if (cfg.onchange) {
              cfg.onchange(ctrl, newValue)
            }
          }
        }
      }
    },
    addAttrButton: function (cfg) {
      return {
        xtype: 'button',
        ubID: 'btnAddAttr' + cfg.num,
        num: cfg.num || 0,
        tooltip: UB.i18n('Показати атрибути сутності, на яку посилається вибраний атрибут'),
        width: 30,
        height: 20,
        margin: '30 5 15 5',
        iconCls: 'fa fa-chevron-right',
        listeners: {
          click: function (ctrl) {
            if (cfg.click && _.isFunction(cfg.click)) {
              cfg.click(ctrl)
            }
          }
        }
      }
    },
    condBlockHeader: function () {
      return {
        border: false,
        margin: '5 0 5 0',
        layout: {
          type: 'hbox',
          align: 'stretch'
        },
        items: [
          { xtype: 'label', text: '', width: 55 },
          { xtype: 'label', text: UB.i18n('Операція'), width: 85, cls: 'label-column-header' },
          { xtype: 'label', text: '(', width: 40, cls: 'label-column-header' },
          { xtype: 'label', text: UB.i18n('Атрибут пошуку'), width: 270, cls: 'label-column-header' },
          { xtype: 'label', text: UB.i18n('Ні'), width: 35, cls: 'label-column-header' },
          { xtype: 'label', text: UB.i18n('Умова'), width: 190, cls: 'label-column-header' },
          { xtype: 'label', text: UB.i18n('Значення'), width: 300, cls: 'label-column-header' },
          { xtype: 'label', text: UB.i18n('Додатково'), width: 80, cls: 'label-column-header' },
          { xtype: 'label', text: UB.i18n('На дату'), width: 120, cls: 'label-column-header' },
          { xtype: 'label', text: ')', width: 35, cls: 'label-column-header' }
        ]
      }
    },
    condBlock: function (cfg) {
      return {
        ubID: 'condBlock' + cfg.num,
        layout: {
          type: 'hbox',
          align: 'stretch'
        },
        items: []
      }
    },
    delButton: function (cfg) {
      return {
        xtype: 'button',
        ubID: 'btnDelBlock' + cfg.num,
        num: cfg.num,
        tooltip: UB.i18n('Видалити умову'),
        width: 30,
        height: 20,
        margin: '13 5 5 5',
        iconCls: cfg.iconCls ? cfg.iconCls : 'fa fa-trash-o',
        listeners: {
          click: function (ctrl) {
            if (cfg.click && _.isFunction(cfg.click)) {
              cfg.click(ctrl)
            }
          }
        }
      }
    },
    operation: function (cfg) {
      return {
        xtype: 'panel',
        ubID: 'contOperation' + cfg.num,
        width: 85,
        layout: {
          type: 'vbox',
          align: 'stretch'
        },
        items: [
          {
            xtype: 'ubcombobox',
            ubID: 'cmbOperation' + cfg.num,
            valueField: 'code',
            displayField: 'name',
            allowBlank: cfg.hidden,
            required: !cfg.hidden,
            width: 65,
            margin: '12 5 0 5',
            hidden: cfg.hidden,
            store: Ext.create('UB.ux.data.UBStore', {
              ubRequest: {
                entity: 'hr_searchConditionOperation',
                method: 'select',
                fieldList: ['ID', 'code', 'name']
              },
              autoLoad: true,
              autoDestroy: true
            }),
            listeners: {
              change: function (ctrl, newValue) {
                if (cfg.onchange) {
                  cfg.onchange(ctrl, newValue)
                }
              },
              afterrender: function (ctrl) {
                if (cfg.afterrender) {
                  cfg.afterrender(ctrl)
                }
              }
            }
          }
        ]
      }
    },
    lbracket: function (cfg) {
      return {
        width: 40,
        layout: {
          type: 'vbox',
          align: 'stretch'
        },
        items: [
          {
            xtype: 'textfield',
            ubID: 'txtLBracket' + cfg.num,
            maskRe: /[(]/,
            width: 30,
            margin: '12 5 0 5',
            listeners: {
              change: function (ctrl, newValue) {
                if (cfg.onchange) {
                  cfg.onchange(ctrl, newValue)
                }
              },
              afterrender: function (ctrl) {
                if (cfg.afterrender) {
                  cfg.afterrender(ctrl)
                }
              }
            }
          }
        ]
      }
    },
    label: function (cfg) {
      return {
        width: 260,
        margin: '5 0 0 5',
        layout: {
          type: 'hbox',
          align: 'top'
        },
        items: [
          {
            xtype: 'label',
            text: cfg.text,
            width: 260,
            margin: '15 0 0 0'
          }
        ]
      }
    },
    opposite: function (cfg) {
      return {
        xtype: 'panel',
        ubID: 'contOpposite' + cfg.num,
        width: 35,
        margin: '11 0 0 0',
        layout: {
          type: 'vbox',
          align: 'stretch'
        },
        items: [
          {
            xtype: 'checkbox',
            ubID: 'chkOpposite' + cfg.num,
            width: 30,
            checked: false,
            listeners: {
              change: function (ctrl, newValue) {
                if (cfg.onchange) {
                  cfg.onchange(ctrl, newValue)
                }
              },
              afterrender: function (ctrl) {
                if (cfg.afterrender) {
                  cfg.afterrender(ctrl)
                }
              }
            }
          }
        ]
      }
    },
    condition: function (cfg) {
      return {
        width: 190,
        layout: {
          type: 'vbox',
          align: 'stretch'
        },
        items: [
          {
            xtype: 'ubcombobox',
            ubID: 'cmbCondition' + cfg.num,
            valueField: 'code',
            displayField: 'name',
            allowBlank: false,
            required: true,
            width: 65,
            margin: '13 5 0 5',
            disableContextMenu: true,
            store: Ext.create('UB.ux.data.UBStore', {
              ubRequest: {
                entity: 'hr_searchCondition',
                method: 'select',
                fieldList: ['ID', 'code', 'name', 'dataType'],
                whereList: {
                  dataType: {
                    expression: '[dataType]',
                    condition: 'equal',
                    values: {
                      value: cfg.dataType
                    }
                  }
                }
              },
              autoLoad: true,
              autoDestroy: true
            }),
            listeners: {
              change: function (ctrl, newValue) {
                if (cfg.onchange) {
                  cfg.onchange(ctrl, newValue)
                }
              },
              afterrender: function (ctrl) {
                if (cfg.afterrender) {
                  cfg.afterrender(ctrl)
                }
              }
            }
          }
        ]
      }
    },
    valueContainer: function (cfg) {
      return {
        xtype: 'panel',
        ubID: 'contValue' + cfg.num,
        width: 300,
        margin: '10 0 0 0',
        layout: {
          type: 'vbox',
          align: 'left',
          pack: 'left'
        },
        items: [
          {
            layout: {
              type: 'hbox',
              align: 'stretch'
            },
            listeners: {
              afterrender: function (ctrl) {
                if (cfg.afterrender) {
                  cfg.afterrender(ctrl)
                }
              }
            },
            items: []
          }
        ]
      }
    },
    value: function (cfg) {
      let cfgValue = {
        ubID: 'ctrlValue' + cfg.num,
        hidden: false,
        allowBlank: false,
        required: true,
        listeners: {
          change: function (ctrl, newValue) {
            if (cfg.onchange) {
              cfg.onchange(ctrl, newValue)
            }
          },
          afterrender: function (ctrl) {
            if (cfg.afterrender) {
              cfg.afterrender(ctrl)
            }
          }
        }
      }
      let cfgMultiValue
      let attrDef = {
        attributeName: cfg.attributeName
      }
      let ctrlFieldList = HR.searchAttrFieldList.getFieldList(cfg.entity, cfg.attributeName)
      let ctrlValueField = HR.searchAttrFieldList.getValueField(cfg.entity, cfg.attributeName, cfg.dataType)
      let ctrlDisplayField = HR.searchAttrFieldList.getDisplayField(cfg.entity, cfg.attributeName)
      let ctrlWhereList = HR.searchAttrWhereList.getWhereList(cfg.entity, cfg.attributeName)
      let ctrlOrderList = HR.searchAttrWhereList.getOrderList(cfg.entity, cfg.attributeName, ctrlDisplayField)
      let res = []

      if (ctrlFieldList) attrDef.fieldList = ctrlFieldList
      if (ctrlWhereList) attrDef.whereList = ctrlWhereList
      if (ctrlOrderList) attrDef.orderList = ctrlOrderList

      switch (cfg.dataType) {
        case 'Int':
        case 'BigInt':
        case 'Float':
        case 'Currency':
          attrDef.xtype = 'numberfield'
          cfgValue.width = 100
          break
        case 'DateTime':
        case 'Date':
          attrDef.xtype = 'datefield'
          cfgValue.width = 110
          break
        case 'Entity':
        case 'Enum':
          attrDef.xtype = 'xcombobox'
          if (cfg.fieldList) {
            attrDef.fieldList = cfg.fieldList
            if (cfg.fieldList.includes('description')) {
              cfg.orderList = { orderBy: { expression: 'description' } }
            } else if (cfg.fieldList.includes('name')) {
              cfg.orderList = { orderBy: { expression: 'name' } }
            }
          }
          cfgValue.width = 285
          cfgValue.disableContextMenu = true
          break
        case 'Boolean':
          attrDef.xtype = 'checkboxfield'
          cfgValue.width = 100
          break
        case 'Document':
          attrDef.hidden = true
          break
        case 'Text':
          attrDef.xtype = 'textareafield'
          cfgValue.width = 285
          break
        default:
          attrDef.xtype = 'textfield'
          cfgValue.width = 285
          break
      }

      cfgValue = HR.searchAttrWhereList.getValueCfg(cfg.entity, attrDef, cfgValue)
      if (ctrlValueField) cfgValue.valueField = ctrlValueField
      if (ctrlDisplayField) cfgValue.displayField = ctrlDisplayField
      delete cfgValue.fieldLabel
      if (cfgValue.store && cfgValue.store.ubRequest) {
        cfgValue.store.ubRequest.__mip_recordhistory_all = true
      }
      res.push(cfgValue)
      if (cfg.dataType === 'Entity' || cfg.dataType === 'Enum') {
        cfgMultiValue = _.clone(cfgValue)
        cfgMultiValue.ubID = 'ctrlMultiValue' + cfg.num
        cfgMultiValue.allowBlank = true
        cfgMultiValue.required = false
        cfgMultiValue.xtype = 'ubmultiselecbox'
        cfgMultiValue.hidden = true
        res.push(cfgMultiValue)
      }
      return res
    },
    historyCondition: function (cfg) {
      return {
        xtype: 'panel',
        ubID: 'contHistCond' + cfg.num,
        width: 90,
        layout: {
          type: 'vbox',
          align: 'stretch'
        },
        items: [
          {
            xtype: 'ubcombobox',
            ubID: 'cmbHistCond' + cfg.num,
            valueField: 'code',
            displayField: 'name',
            allowBlank: cfg.hidden,
            required: !cfg.hidden,
            width: 80,
            margin: '13 5 0 5',
            hidden: cfg.hidden,
            disableContextMenu: true,
            store: Ext.create('UB.ux.data.UBStore', {
              ubRequest: {
                entity: 'hr_searchConditionHistory',
                method: 'select',
                fieldList: ['ID', 'code', 'name']
              },
              autoLoad: true,
              autoDestroy: true
            }),
            listeners: {
              change: function (ctrl, newValue) {
                if (cfg.onchange) {
                  cfg.onchange(ctrl, newValue)
                }
              },
              afterrender: function (ctrl) {
                if (cfg.afterrender) {
                  cfg.afterrender(ctrl)
                }
              }
            }
          }
        ]
      }
    },
    onDate: function (cfg) {
      return {
        xtype: 'panel',
        ubID: 'contOnDate' + cfg.num,
        width: 120,
        margin: '10 0 0 0',
        layout: {
          type: 'vbox',
          align: 'stretch'
        },
        items: [
          {
            xtype: 'ubdatefield',
            ubID: 'dtOnDate' + cfg.num,
            width: 110,
            margin: '3 0 0 0',
            hidden: cfg.hidden,
            listeners: {
              change: function (ctrl, newValue) {
                if (cfg.onchange) {
                  cfg.onchange(ctrl, newValue)
                }
              },
              afterrender: function (ctrl) {
                if (cfg.afterrender) {
                  cfg.afterrender(ctrl)
                }
              }
            }
          }
        ]
      }
    },
    rbracket: function (cfg) {
      return {
        width: 35,
        margin: '0 0 0 0',
        layout: {
          type: 'vbox',
          align: 'stretch'
        },
        items: [
          {
            xtype: 'textfield',
            ubID: 'txtRBracket' + cfg.num,
            maskRe: /[)]/,
            width: 30,
            margin: '12 5 0 0',
            hidden: cfg.hidden || false,
            listeners: {
              change: function (ctrl, newValue) {
                if (cfg.onchange) {
                  cfg.onchange(ctrl, newValue)
                }
              },
              afterrender: function (ctrl) {
                if (cfg.afterrender) {
                  cfg.afterrender(ctrl)
                }
              }
            }
          }
        ]
      }
    },
    toolbar_items: function (srchParams) {
      return [
        {
          xtype: 'button',
          text: UB.i18n('Очистити'),
          tooltip: UB.i18n('Очистити параметри пошуку'),
          name: 'clearAll',
          iconCls: 'fa fa-eraser',
          handler: function (ctrl) {
            initNewSearch(srchParams)
            srchParams.sqlLabel.setText('')
          }
        },
        {
          xtype: 'button',
          text: UB.i18n('Завантажити'),
          tooltip: UB.i18n('Завантажити шаблон пошуку'),
          name: 'loadTemplate',
          iconCls: 'fa fa-folder-open',
          handler: function (ctrl) {
            selectTemplate(srchParams, loadTemplate)
          }
        },
        {
          xtype: 'button',
          text: UB.i18n('Зберегти'),
          tooltip: UB.i18n('Зберегти шаблон пошуку'),
          name: 'saveTemplate',
          iconCls: 'fa fa-floppy-o',
          handler: function (ctrl) {
            if (srchParams.condBlockParams.length === 0) {
              AC.viewUtils.showToast(UB.i18n('Не додано жодної умови для пошуку'))
              return
            }
            newTemplate(srchParams, saveTemplate)
          }
        },
        {
          xtype: 'button',
          text: UB.i18n('Замінити шаблон'),
          tooltip: UB.i18n('Замінити шаблон пошуку'),
          name: 'replaceTemplate',
          iconCls: 'fa fa-folder',
          handler: function (ctrl) {
            if (srchParams.condBlockParams.length === 0) {
              AC.viewUtils.showToast(UB.i18n('Не додано жодної умови для пошуку'))
              return
            }
            selectTemplate(srchParams, saveTemplate)
          }
        },
        {
          xtype: 'button',
          text: UB.i18n('Шукати'),
          tooltip: UB.i18n('Виконати пошук'),
          name: 'search',
          iconCls: 'fa fa-search',
          handler: async function (ctrl) {
            let checkError = checkCondData(srchParams)
            if (checkError) {
              AC.viewUtils.showToast(checkError)
              return
            }
            let dialogError = await checkPrivateData(srchParams)
            if (!dialogError) {
              return
            }
            let grid = srchParams.searchGrid
            let waitTimeout = 100
            srchParams.mainPanel.setActiveTab(srchParams.dataPanel)
            if (srchParams.waitForCheck) {
              waitTimeout = 2000
              srchParams.waitForCheck = false
            }
            grid.setLoading(true)
            setTimeout(function () {
              runSearch(srchParams)
              grid.setLoading(false)
            }, waitTimeout)
          }
        }
      ]
    },
    results_toolbar: function (srchParams) {
      srchParams.resultsActions = [
        {
          text: UB.i18n('Порівняти'),
          actionId: 'reportCompare',
          iconCls: 'fas fa-file-excel',
          cls: 'green-action',
          handler: function (btn) {
            const me = btn.up('form')
            HR.searchUtils.compareReport(me.srchEmpParams)
          }
        },
        {
          text: UB.i18n('Друкувати'),
          actionId: 'reportResults',
          tooltip: UB.i18n('Вивід друкованої форми'),
          iconCls: 'fas fa-print',
          handler: function (btn) {
            const me = btn.up('form')
            HR.searchUtils.resultReport(me.srchEmpParams)
          }
        }
      ]
      enableResultActions(srchParams, false, true)
      return srchParams.resultsActions
    }
  }
}

function enableResultActions (srchParams, enable, isInitial) {
  if (!srchParams.resultsActions || !srchParams.resultsActions.length) {
    return
  }
  srchParams.resultsActions.forEach(action => {
    if (isInitial) {
      action.disabled = !enable
    } else {
      AC.gridUtils.enableCustomAction(srchParams.searchGrid, action.actionId, enable)
    }
  })
}

function onMasterSelectionChange (srchParams, record) {
  if (record) {
    const searchDetGrid = srchParams.searchDetGrid
    if (searchDetGrid) {
      searchDetGrid.store.ubRequest.params = Object.assign({}, srchParams.whereList)
      searchDetGrid.onRefreshDetail(record)
    }
  }
}

async function compareReport (srchParams) {
  let params = { page0: {} }
  const grid = srchParams.searchGrid
  const selModel = grid.getSelectionModel()
  let empIDs = []
  selModel.selected.each(record => {
    empIDs.push(record.get('employeeID'))
  })
  if (empIDs.length < 2) {
    $App.dialogInfo(UB.i18n('Необхідно вибрати більше одного запису'))
    return
  }
  const onDate = appAC.globalApplicationDate()
  const empdata = await $App.connection.run({
    entity: 'hr_searchAndCompare',
    method: 'search',
    empIDs: empIDs.join(','),
    onDate: onDate
  })
  let dataArray = UB.LocalDataStore.selectResultToArrayOfObjects(empdata)
  for (let i = 1; i < dataArray.length + 1; i++) {
    let reco = dataArray[i - 1]
    let idxStr = i < 10 ? '0' + i : i.toString()
    params.page0[`emp${idxStr}Name`] = reco.employeeName
    params.page0[`emp${idxStr}Req1`] = '' // Стаж державної служби
    params.page0[`emp${idxStr}Req2`] = '' // Рівень освіти
    params.page0[`emp${idxStr}Req3`] = '' // Іноземна мова
    params.page0[`emp${idxStr}Addr`] = reco.addr
    params.page0[`emp${idxStr}Age`] = reco.age
    params.page0[`emp${idxStr}FamilyState`] = reco.familyState
    params.page0[`emp${idxStr}Benefits`] = reco.benefits
    params.page0[`emp${idxStr}Bonuses`] = reco.bonuses
    params.page0[`emp${idxStr}Penalties`] = reco.penalties
    params.page0[`emp${idxStr}Languages`] = reco.languages
    params.page0[`emp${idxStr}Science`] = reco.science
    params.page0[`emp${idxStr}AddInfo`] = reco.addInfo
  }
  const posID = srchParams.senderParams && srchParams.senderParams.posID
  if (posID) {
    const posData = await UB.Repository('hr_position')
      .attrs(['name', 'nameGen', 'orgID.name', 'orgID.nameGen'])
      .where('mi_dateFrom', '<=', onDate)
      .where('mi_dateTo', '>=', onDate)
      .where('mi_deleteDate', '>=', '#maxdate')
      .selectById(posID)
    if (posData) {
      params.page0.posName = posData.nameGen || posData.name
      params.page0.orgName = posData['orgID.nameGen'] || posData['orgID.name']
    }
  }
  HR.reportUtils.runExcelReport('posComparation.xlsx', params)
}

async function resultReport (srchParams) {
  const grid = srchParams.searchGrid
  const ubRequest = grid.getStore().ubRequest
  let params = {
    searchValues: getResultSearchValues(srchParams),
    grid: {
      ubRequest: ubRequest,
      columns: AC.gridUtils.columnsToArrayOfObjects(grid)
    }
  }
  let repObj = await $App.connection.run({
    entity: 'hr_searchAndCompare',
    method: 'runResultReport',
    params: JSON.stringify(params)
  })
  let report = JSON.parse(repObj.resp)
  AC.filesService.saveAsByBase64Buffer(report, `SearchResult.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
