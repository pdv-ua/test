/* global $App appAC appHR UB _ Ext AC */

module.exports = {
  getPosInfo,
  loadItems,
  determineChild,
  getRootUnits,
  getChildOrgs,
  getChildOrgsPromise,
  getChildUnits,
  getChildUnitsPromise,
  newVersionOrg,
  newVersionDep,
  newVersionPos,
  treePathAsArray,
  getEmpPosInfo,
  getOrgPlanUnits,
  addHierarchyIndex,
  getOrgResp,
  orgTree,
  asyncOrgTree,
  changeIdxNum,
  setStaffUnitWhereList,
  getOrgPosCount,
  getOrgEmpPosCount,
  getDepartmentPosCount,
  checkFutureVersion
}

async function changeIdxNum ({ movedNodeID, targetNodeID, dir, data }) {
  if (targetNodeID === movedNodeID || !data.length) {
    return Promise.resolve({})
  }
  let startItem = data.find(item => item.ID === targetNodeID)
  if (!startItem) {
    return Promise.resolve({ error: `startItem with ID = ${targetNodeID} not found` })
  }
  let movedItem = data.find(item => item.ID === movedNodeID)
  if (!movedItem) {
    return Promise.resolve({ error: `Item to move with ID = ${movedNodeID} not found` })
  }

  data.forEach((item, idx) => {
    item.idx = idx
  })
  let idxNums = data.map(item => item.idxNum)
  let insertIndex = dir === 'after' ? startItem.idx + 1 : startItem.idx === 0 ? 0 : startItem.idx

  if (insertIndex >= data.length) {
    data.push(movedItem)
  } else {
    data.splice(insertIndex, 0, movedItem)
  }
  if (movedItem.idx > insertIndex) {
    data.splice(Math.min(data.length - 1, movedItem.idx + 1), 1)
  } else {
    data.splice(movedItem.idx, 1)
  }
  data.forEach((item, i) => {
    item.newIdxNum = idxNums[i]
  })
  return $App.connection.run({
    method: 'changeIdxNum',
    entity: 'hr_staffUnit',
    data: JSON.stringify(data)
  }).then(() => {
    return { data: data }
  }).catch(e => {
    return { error: e.message }
  })
}

function getPosInfo (IDList, posListID, onDate, dictFundSourceID, longVacCodes = []) {
  if (!IDList.length && !posListID.length) {
    return Promise.resolve({ position: [], employeePosition: [] })
  }
  return $App.connection.run({
    entity: 'hr_staffUnit',
    method: 'getPositionInfo',
    IDList: IDList,
    posListID: posListID,
    onDate: onDate,
    dictFundSourceID,
    longVacCodes
  }).then(response => {
    return JSON.parse(response.resultData)
  })
}

function determineChild (master, IDList, onDate, masterChild, orderID, showNode) {
  return $App.connection.run({
    entity: 'hr_staffUnit',
    method: 'determineChild',
    IDList: IDList,
    master: master,
    onDate: onDate,
    showNode: JSON.stringify(showNode),
    orderID: orderID || null,
    masterChild: (masterChild && JSON.stringify(masterChild)) || null
  }).then(result => {
    return result.hasChild || []
  })
}

async function loadItems (masterID, parentNode, showNode, orderID, onDate, additionAttr = [], orgIDs = [], dictFundSourceID, showAllPos) {
  let result = []
  if (parentNode.raw.nodeType === 'EMPUNIT') {
    return
  }
  const isRootNode = _.isArray(masterID)
  if (parentNode.data && parentNode.data.root && !isRootNode) {
    result.push({
      ID: null,
      text: UB.i18n('Оргструктура'),
      code: '',
      childCount: 1,
      staffFull: '',
      nodeType: 'ORG_ROOT',
      iconCls: 'root-node-icon',
      description: UB.i18n('Оргструктура')
    })
    return result
  }
  const me = this
  const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
  let empOrderType = me.empOrderType || 'NOTHING'
  delete me.empOrderType
  let masterChild = null
  let IDList = []
  let posList = []
  let empPosList = []
  let data
  const stateValues = UB.core.UBEnumManager.getStore('HR_STATE')
  if (!onDate) {
    onDate = appAC.globalApplicationDate()
  }
  const isShowAddDescrPerson = AC.settings.get('hrStaffTableShowAddDescrPerson', appAC.globalOrganization())
  const priority = ['hr_position', 'hr_department', 'hr_organization']
  const fieldList = ['ID', 'description', 'code', 'mi_data_id', 'mi_dateFrom', 'mi_dateTo', 'state',
    'staffOrderID.description', 'entryOrderID.description', 'mi_unityEntity', 'quantity', 'quantityFact', 'accrualSum',
    'liquidate', 'idxNum', 'EDRPOUCode', 'linkToSourceID', 'isSecondaryChanges', 'quantityLead']
  fieldList.push(...additionAttr)
  let repo = UB.Repository('hr_staffUnit')
    .attrs(fieldList)
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
    .where('mi_unityEntity', 'in', showNode)
  if (empOrderType === 'ORGSTRUCTURE') {
    if (parentNode.raw.nodeType === 'ORGUNIT') {
      if (!(parentNode.parentNode && parentNode.parentNode.data.root)) {
        repo = repo.where('mi_unityEntity', 'notIn', ['hr_position'])
      }
    } else {
      repo = repo.where('mi_unityEntity', 'notIn', ['hr_position'])
    }
  } else if (empOrderType === 'ORGONLY') {
    repo = repo.where('mi_unityEntity', 'notIn', ['hr_position', 'hr_department'])
  }
  repo = repo.orderBy('idxNum')
  let empRepo = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeID', 'employeeID.fullFIO', 'dateFrom', 'dateTo', 'accrualSum', 'mtCount', 'orderID.description',
      'employeeNumberID', 'employeeNumberID.limitedAccess', 'employeeNumberID.addDescrPerson'])
    .orderBy('employeeID.fullFIO', 'asc')
  if (orgIDs.length) {
    repo.where('orgID', 'in', orgIDs)
  }
  if (!orderID) {
    repo.where('state', '=', 'ACTIVE')
  } else {
    repo.where('state', '=', 'ACTIVE', 'active')
      .where('liquidate', '=', 0, 'liqu')
      .where('staffOrderID', '=', orderID, 'order')
      .notExists(UB.Repository('hr_staffUnit')
        .correlation('mi_data_id', 'mi_data_id')
        .where('staffOrderID', '=', orderID)
        .where('mi_deleteDate', '>=', '#maxdate'),
      'notExist')
      .logic('(([active] and [liqu] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
  }
  let posByDictFundSource = []
  let positionFundSource = []
  if (dictFundSourceID) {
    let posRepo = UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id'])
      .where('mi_dateFrom', '<=', onDate, 'dateFrom')
      .where('mi_dateTo', '>=', onDate, 'dateTo')
      .whereIf(orgIDs.length, 'orgID', 'in', orgIDs)
      .exists(UB.Repository('hr_positionFundSource')
        .correlation('positionID', 'ID')
        .where('dictFundSourceID', '=', dictFundSourceID)
        .where('mi_deleteDate', '>=', '#maxdate')
      )
    posRepo = isRootNode ? posRepo.where('mi_data_id', 'in', masterID) : masterID
      ? posRepo.where('parentUnitID', '=', masterID)
      : posRepo.where('parentUnitID', 'isNull')
    if (!orderID) {
      posRepo.where('state', '=', 'ACTIVE')
    } else {
      posRepo.where('state', '=', 'ACTIVE', 'active')
        .where('liquidate', '=', 0, 'liqu')
        .where('staffOrderID', '=', orderID, 'order')
        .notExists(UB.Repository('hr_staffUnit')
          .correlation('mi_data_id', 'mi_data_id')
          .where('staffOrderID', '=', orderID)
          .where('mi_deleteDate', '>=', '#maxdate'),
        'notExist')
        .logic('(([active] and [liqu] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    }
    posByDictFundSource = await posRepo.selectAsObject()
    if (posByDictFundSource.length) {
      positionFundSource = await UB.Repository('hr_positionFundSource')
        .attrs('positionID', 'dictFundSourceID', 'quantity')
        .where('positionID', 'in', posByDictFundSource.map(o => o.ID))
        .selectAsObject()
    }
  }
  if (parentNode.raw.nodeType === 'POSUNIT' && empOrderType !== 'ORGSTRUCTURE' && empOrderType !== 'TARIFFING') {
    empRepo.where('positionID', '=', parentNode.raw.mi_data_id)
    empRepo.where('dateFrom', '<=', onDate)
    empRepo.where('dateTo', '>=', onDate)
    data = await empRepo.selectAsObject()
    const empPosFundSource = dictFundSourceID && data.length
      ? await UB.Repository('hr_empPosFundSource')
        .attrs(['employeePositionID', 'dictFundSourceID', 'sum([mtCount])'])
        .where('employeePositionID', 'in', data.map(o => o.ID))
        .groupBy(['employeePositionID', 'dictFundSourceID'])
        .selectAsObject({
          'sum([mtCount])': 'mtCount'
        })
      : []
    data.forEach(function (item) {
      empPosList.push(item.ID)
      IDList.push(item.ID)
      const epfs = empPosFundSource.find(o => o.employeePositionID === item.ID && o.dictFundSourceID === dictFundSourceID) || {}
      result.push({
        ID: item.ID,
        text: item['employeeID.fullFIO'],
        state: '',
        dateFrom: Ext.Date.format(item.dateFrom, 'd.m.Y'),
        dateTo: AC.dateService.maxDateUTC().getTime() === item.dateTo.getTime() ? '' : Ext.Date.format(item.dateTo, 'd.m.Y'),
        staffOrder: item['orderID.description'],
        employeeID: item.employeeID,
        employeeNumberID: item.employeeNumberID,
        quantity: dictFundSourceID ? (epfs.mtCount || null) : item.mtCount,
        accrualSum: (!AC.entityUtils.verifyRightsMethod('hr_employeeNumber', 'employeeLimitedAccess') && item['employeeNumberID.limitedAccess']) ? 0 : notShowSalary ? 0 : item.accrualSum,
        nodeType: 'EMPUNIT',
        addDescrPosition: isShowAddDescrPerson ? item['employeeNumberID.addDescrPerson'] : '',
        isSecondaryChanges: item.isSecondaryChanges === null ? '' : item.isSecondaryChanges
      })
    })
    repo = isRootNode ? repo.where('mi_data_id', 'in', masterID) : masterID ? repo.where('parentUnitID', '=', masterID) : repo.where('parentUnitID', 'isNull')
    const repoData = await repo.selectAsObject()
    priority.forEach(entity => {
      repoData.filter(o => o.mi_unityEntity === entity).forEach(function (item) {
        if (item.mi_unityEntity === 'hr_position' && dictFundSourceID) {
          if (!showAllPos && !posByDictFundSource.find(o => o.ID === item.ID)) return
          const posDF = positionFundSource.find(o => o.positionID === item.ID && o.dictFundSourceID === dictFundSourceID)
          item.quantity = posDF ? posDF.quantity : null
        }
        IDList.push(item.ID)
        result.push({
          ID: item.ID,
          text: item.description,
          mi_data_id: item.mi_data_id,
          mi_dateFrom: item.mi_dateFrom,
          state: item.liquidate ? UB.i18n('Ліквідовано') : (item.state === 'NEW' && item.ID !== item.mi_data_id) ? UB.i18n('Змінено') : stateValues.getById(item.state).data.name,
          stateCode: item.state,
          dateFrom: Ext.Date.format(item.mi_dateFrom, 'd.m.Y'),
          dateTo: AC.dateService.maxDate().getTime() === item.mi_dateTo.getTime() ? '' : Ext.Date.format(item.mi_dateTo, 'd.m.Y'),
          staffOrder: item['entryOrderID.description'] || item['staffOrderID.description'],
          code: item.code,
          quantity: item.quantity,
          quantityLead: item.quantityLead,
          EDRPOUCode: item.EDRPOUCode,
          liquidate: item.liquidate ? 1 : 0,
          accrualSum: notShowSalary ? 0 : item.accrualSum,
          nodeType: item.mi_unityEntity === 'hr_organization' ? 'ORGUNIT' : item.mi_unityEntity === 'hr_department' ? 'DEPUNIT' : 'POSUNIT',
          childCount: 1,
          iconCls: item.mi_unityEntity === 'hr_organization' ? 'org-base-icon' : item.mi_unityEntity === 'hr_department' ? 'dep-base-icon' : null, // 'pos-base-icon'
          idxNum: item.idxNum,
          linkToSourceID: item.linkToSourceID
        })
        if (item.mi_unityEntity === 'hr_position') {
          posList.push(item.ID)
        }
      })
    })
    data = await getPosInfo(posList, empPosList, onDate, dictFundSourceID)
    data.position.forEach(posItem => {
      let item = result.find(item => item.ID === posItem.ID)
      item.vacancyRate = posItem.vacancyRate
      item.addDescrPosition = posItem.addDescrPosition
      if (posItem.positionType) {
        item.iconCls = `pos-${posItem.positionType}${posItem.vacancyRate > 0 ? 'empty' : ''}-icon`
      } else {
        item.iconCls = `pos-4${posItem.vacancyRate > 0 ? 'empty' : ''}-icon`
      }
    })
    data.employeePosition.forEach(row => {
      const empPos = result.find(o => o.ID === row.ID)
      if (empPos) {
        empPos.vacancyRate = (row.vacationDateTo && (new Date(row.vacationDateTo)).getFullYear() !== 9999) ? (UB.i18n('до ') + AC.dateService.formatDate(row.vacationDateTo)) : null
        empPos.iconCls = row.vacationDateTo ? 'person-yellow-icon' : 'person-base-icon'
      }
    })
    result.hasChild = await me.determineChild('hr_staffUnit', IDList, onDate, masterChild, orderID, showNode)
    return result.sort((a, b) => a.idxNum > b.idxNum ? 1 : -1)
  } else {
    repo = isRootNode ? repo.where('mi_data_id', 'in', masterID) : masterID ? repo.where('parentUnitID', '=', masterID) : repo.where('parentUnitID', 'isNull')
    const repoData = await repo.selectAsObject()
    let promiseList = []
    const posCountItems = []
    priority.forEach(entity => {
      repoData.filter(o => o.mi_unityEntity === entity).forEach(async function (item) {
        if (empOrderType === 'NOCHILDORGS' && item.mi_unityEntity === 'hr_organization' && result.length) {
          return
        }
        if (item.mi_unityEntity === 'hr_position' && dictFundSourceID) {
          if (!showAllPos && !posByDictFundSource.find(o => o.ID === item.ID)) return
          const posDF = positionFundSource.find(o => o.positionID === item.ID && o.dictFundSourceID === dictFundSourceID)
          item.quantity = posDF ? posDF.quantity : null
        }
        IDList.push(item.ID)
        if (item.mi_unityEntity === 'hr_position') {
          posList.push(item.ID)
        }
        let resultItem = {
          ID: item.ID,
          text: item.description,
          mi_data_id: item.mi_data_id,
          mi_dateFrom: item.mi_dateFrom,
          state: item.liquidate ? UB.i18n('Ліквідовано') : (item.state === 'NEW' && item.ID !== item.mi_data_id) ? UB.i18n('Змінено') : stateValues.getById(item.state).data.name,
          stateCode: item.state,
          dateFrom: Ext.Date.format(item.mi_dateFrom, 'd.m.Y'),
          dateTo: AC.dateService.maxDate().getTime() === item.mi_dateTo.getTime() ? '' : Ext.Date.format(item.mi_dateTo, 'd.m.Y'),
          staffOrder: item['entryOrderID.description'] || item['staffOrderID.description'],
          code: item.code,
          quantity: item.mi_unityEntity === 'hr_department' ? item.quantityFact : item.quantity,
          quantityLead: item.quantityLead,
          EDRPOUCode: item.EDRPOUCode,
          liquidate: item.liquidate ? 1 : 0,
          accrualSum: notShowSalary ? 0 : item.accrualSum,
          nodeType: item.mi_unityEntity === 'hr_organization' ? 'ORGUNIT' : item.mi_unityEntity === 'hr_department' ? 'DEPUNIT' : 'POSUNIT',
          childCount: 1,
          iconCls: item.mi_unityEntity === 'hr_organization' ? 'org-base-icon' : item.mi_unityEntity === 'hr_department' ? 'dep-base-icon' : '',
          idxNum: item.idxNum,
          mi_unityEntity: item.mi_unityEntity,
          linkToSourceID: item.linkToSourceID,
          isSecondaryChanges: item.isSecondaryChanges === null ? '' : item.isSecondaryChanges
        }
        result.push(resultItem)
        if (resultItem.mi_unityEntity === 'hr_department' && ['ORGSTRUCTURE', 'NOTHING'].includes(empOrderType)) {
          posCountItems.push({
            departmentID: resultItem.mi_data_id,
            ID: resultItem.ID
          })
        }
        if (resultItem.mi_unityEntity === 'hr_organization') {
          if (empOrderType === 'ORGSTRUCTURE') {
            promiseList.push(getOrgLimitNum({
              dataItem: resultItem,
              onDate,
              empOrderType,
              orderID
            }))
          } else if (empOrderType === 'NOTHING') {
            promiseList.push(getOrgPosCount({
              dataItem: resultItem,
              onDate: onDate,
              dictFundSourceID,
              staffOrderID: orderID
            }))
          }
        }
      })
    })
    if (posCountItems.length) {
      const resultData = await $App.connection.run({
        method: 'getPosCount',
        entity: 'hr_department',
        onDate: onDate,
        items: JSON.stringify(posCountItems),
        dictFundSourceID,
        staffOrderID: orderID
      })
      if (resultData.result) {
        const posCountData = JSON.parse(resultData.result)
        posCountData.forEach(posItem => {
          let item = result.find(o => o.ID === posItem.ID)
          if (item) {
            item.posCount = posItem.posCount || ''
            item.quantity = posItem.posCount || ''
          }
        })
      }
    }
    await Promise.all(promiseList)
    data = await getPosInfo(posList, [], onDate, dictFundSourceID)
    data.position.forEach(posItem => {
      let item = result.find(item => item.ID === posItem.ID)
      if (item) {
        item.vacancyRate = posItem.vacancyRate
        item.addDescrPosition = posItem.addDescrPosition
        if (posItem.positionType) {
          item.iconCls = `pos-${posItem.positionType}${posItem.vacancyRate > 0 ? 'empty' : ''}-icon`
        } else {
          item.iconCls = `pos-4${posItem.vacancyRate > 0 ? 'empty' : ''}-icon`
        }
      }
    })
    result.hasChild = await me.determineChild('hr_staffUnit', IDList, onDate, masterChild, orderID, showNode)
    return result.sort((a, b) => a.idxNum > b.idxNum ? 1 : -1)
  }
}

async function getRootUnits (onDate, attrs) {
  onDate = onDate || AC.dateService.todayDate()
  let fieldList = ['mi_data_id']
  if (attrs) {
    fieldList = fieldList.concat(attrs)
  }
  return UB.Repository('hr_staffUnit')
    .attrs(fieldList)
    .where('parentUnitID', 'isNull')
    .where('state', '=', 'ACTIVE')
    .where('mi_dateFrom', '<=', onDate)
    .where('mi_dateTo', '>=', onDate)
    .selectAsObject()
}

async function getChildOrgs (orgID, onDate) {
  let result = []
  const orgData = await getChildOrgsPromise(orgID, onDate)
  orgData.forEach(orgItem => {
    result.push(orgItem.mi_data_id)
  })
  return result
}

function getChildOrgsPromise (orgID, onDate) {
  onDate = onDate || AC.dateService.todayDate()
  return UB.Repository('hr_organization')
    .attrs(['mi_data_id'])
    // .where('parentUnitID', '=', orgID)
    .where('mi_treePath', 'like', `/${orgID}/`)
    .where('state', '=', 'ACTIVE')
    .where('mi_dateFrom', '<=', onDate)
    .where('mi_dateTo', '>=', onDate)
    .where('mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
}

function getOrgLimitNum ({ dataItem, onDate, empOrderType, orderID }) {
  if (dataItem.mi_unityEntity !== 'hr_organization' || empOrderType !== 'ORGSTRUCTURE') {
    return Promise.resolve(dataItem)
  }
  return $App.connection.run({
    entity: 'hr_staffUnit',
    method: 'getPositionCount',
    orgID: dataItem.mi_data_id,
    onDate,
    staffOrderID: orderID
  }).then(result => {
    if (result.resultData) {
      const resultData = JSON.parse(result.resultData)
      const orgRecord = resultData.find(o => o.mi_unityEntity === 'hr_organization') || {}
      dataItem.quantity = orgRecord.childQuantity + orgRecord.quantityLead
      return dataItem
    }
  })
}

function getOrgPosCount ({ dataItem, onDate, dictFundSourceID, staffOrderID }) {
  if (dictFundSourceID) {
    const posQuery = UB.Repository('hr_position')
      .attrs('ID')
      .where('state', '=', 'ACTIVE', 'active')
      .where('orgID', '=', dataItem.mi_data_id)
      .where('liquidate', '=', 0)
      .whereIf(staffOrderID, 'staffOrderID', '=', staffOrderID, 'order')
    if (staffOrderID) {
      posQuery.notExists(UB.Repository('hr_staffUnit')
        .correlation('mi_data_id', 'mi_data_id')
        .where('staffOrderID', '=', staffOrderID)
        .where('mi_deleteDate', '>=', '#maxdate'),
      'notExist')
      posQuery.logic('(([active] AND [notExist]) or [order])')
    }

    const posCountQuery = UB.Repository('hr_positionFundSource')
      .attrs(['SUM([quantity])'])
      .where('positionID', 'in', posQuery.misc({ __mip_ondate: onDate }))
      .where('dictFundSourceID', '=', dictFundSourceID)
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
    return posCountQuery.misc({ __mip_ondate: onDate })
      .selectScalar({
        'SUM([quantity])': 'quantity'
      })
      .then(quantity => {
        dataItem.quantity = quantity
        return dataItem
      })
  } else {
    const posCountQuery = UB.Repository('hr_position')
      .attrs(['SUM([quantity])'])
      .where('state', '=', 'ACTIVE', 'active')
      .where('orgID', '=', dataItem.mi_data_id)
      .where('liquidate', '=', 0)
      .whereIf(staffOrderID, 'staffOrderID', '=', staffOrderID, 'order')
    if (staffOrderID) {
      posCountQuery.notExists(UB.Repository('hr_staffUnit')
        .correlation('mi_data_id', 'mi_data_id')
        .where('staffOrderID', '=', staffOrderID)
        .where('mi_deleteDate', '>=', '#maxdate'),
      'notExist')
      posCountQuery.logic('(([active] AND [notExist]) or [order])')
    }
    return posCountQuery.misc({ __mip_ondate: onDate })
      .selectScalar()
      .then(quantity => {
        dataItem.quantity = quantity
        return dataItem
      })
  }
}

function getOrgEmpPosCount ({ dataItem, onDate }) {
  return UB.Repository('hr_employeePositionS')
    .attrs(['SUM([mtCount])'])
    .where('organizationID', '=', dataItem.mi_data_id)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectScalar()
    .then(quantity => {
      dataItem.quantity = quantity
      return dataItem
    })
}

function getDepartmentPosCount ({ dataItem, onDate, empOrderType, dictFundSourceID, orderID }) {
  if (dataItem.mi_unityEntity !== 'hr_department' || !['ORGSTRUCTURE', 'NOTHING'].includes(empOrderType)) {
    return Promise.resolve(dataItem)
  }
  return $App.connection.run({
    entity: dataItem.mi_unityEntity,
    method: 'getPosCount',
    onDate: onDate,
    departmentID: dataItem.mi_data_id,
    dictFundSourceID,
    staffOrderID: orderID,
    ID: dataItem.ID
  }).then(mParams => {
    dataItem.posCount = mParams.posCount || ''
    dataItem.quantity = mParams.posCount || '' // mParams.depQuantity || ''
    return dataItem
  })
}

async function getChildUnits (miDataID, treePath, onDate, staffTableID) {
  let result = []
  const deptData = await getChildUnitsPromise(miDataID, treePath, onDate, staffTableID)
  deptData.forEach(deptItem => {
    result.push(deptItem.mi_data_id)
  })
  return result
}

function getChildUnitsPromise (miDataID, treePath, onDate, staffTableID) {
  onDate = onDate || AC.dateService.todayDate()
  let result = UB.Repository('hr_staffUnit')
    .attrs(['mi_data_id'])
    .where('mi_treePath', 'like', treePath + '%')
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('state', '=', 'ACTIVE', 'stateAct')
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
    .where('mi_unityEntity', '=', 'hr_organization', 'isOrg')
    .where('mi_unityEntity', '=', 'hr_department', 'isDept')
    .exists(UB.Repository('hr_staffUnit')
      .correlation('parentUnitID', 'mi_data_id')
      .where('mi_data_id', '!=', miDataID)
      .where('state', '=', 'ACTIVE')
      .where('mi_dateFrom', '<=', onDate)
      .where('mi_dateTo', '>=', onDate)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'hasChilds')
  if (staffTableID) {
    result = result.where('staffOrderID', '=', staffTableID || 0, 'order')
      .notExists(UB.Repository('hr_staffUnit')
        .correlation('mi_data_id', 'mi_data_id')
        .where('staffOrderID', '=', staffTableID)
        .where('mi_deleteDate', '>=', '#maxdate'),
      'notOtherThanOrder')
      .logic('(([stateAct] AND [dateFrom] AND [dateTo] AND [notOtherThanOrder]) OR [order]) AND ([isOrg] OR [isDept] OR [hasChilds])')
  } else {
    result = result.logic('([isOrg] OR [isDept] OR [hasChilds])')
  }
  return result.selectAsObject()
}

function newVersionOrg (ID, staffOrderID, dateFrom, afterClose) {
  UB.Repository('hr_organization')
    .attrs(['mi_data_id', 'orgID', 'code', 'idxNum', 'name', 'fullName', 'parentUnitID', 'jurisdiction', 'tarifGroupID',
      'dictGovernmTypeID', 'EDRPOUCode', 'taxCode', 'nameEng', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameNom',
      'nameVoc', 'fullNameNom', 'fullNameVoc', 'fullNameGen', 'fullNameDat', 'fullNameAcc', 'fullNameOr', 'fullNameLoc',
      'webAddress', 'parentUnitTypeID', 'dictAreasActivityID', 'powerBranch', 'limitEmpDocBasis', 'limitEmpCivServ',
      'limitEmpNum', 'ECBCode', 'hkved', 'hkvedS', 'hkoatuu', 'hkoatuuS', 'hkopfg', 'hkopfgS', 'hkou', 'hkouS', 'dgoznNpr', 'kpol',
      'riv', 'decisionDate', 'decisionNumber', 'dictDksuID', 'dictSprStiID', 'doNotTransfer', 'FCCUCode', 'FCCUName',
      'classRisk', 'FSZIAddress', 'hkatottg'
    ])
    .misc({ __mip_recordhistory_all: true })
    .selectById(ID).then(record => {
      appHR.createNewVersion('hr_organization',
        Object.assign(record, {
          staffOrderID: staffOrderID || null,
          'staffOrderID.entryDate': dateFrom || null,
          mi_dateFrom: dateFrom || null,
          priorID: ID
        }),
        afterClose
      )
    })
}

function newVersionDep (ID, staffOrderID, dateFrom, afterClose, customParams) {
  UB.Repository('hr_department')
    .attrs(['mi_data_id', 'orgID', 'code', 'idxNum', 'name', 'fullName', 'parentUnitID', 'dictDepTypeID',
      'departmentKindID', 'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'fullNameNom',
      'fullNameGen', 'fullNameDat', 'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc', 'quantity', 'quantityLead',
      'excludeNameInPos', 'positionChiefID', 'employeeChiefID', 'curatorID'])
    .misc({ __mip_recordhistory_all: true })
    .selectById(ID).then(record => {
      appHR.createNewVersion('hr_department',
        Object.assign(record, {
          staffOrderID: staffOrderID || null,
          'staffOrderID.entryDate': dateFrom || null,
          mi_dateFrom: dateFrom || null,
          priorID: ID
        }),
        afterClose,
        customParams
      )
    })
}

function newVersionPos (ID, staffOrderID, dateFrom, afterClose, customParams) {
  UB.Repository('hr_position')
    .attrs(['mi_data_id', 'orgID', 'code', 'idxNum', 'name', 'fullName', 'parentUnitID', 'positionCategory',
      'quantity', 'dictPositionID', 'personalType', 'positionType', 'dictWagePayID', 'psCategory',
      'dictStatePayID', 'payElID', 'accrualSum', 'dictStaffCatID', 'dictStaffSubCatID', 'dictFundSourceID', 'isOrgBoss',
      'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'reformer',
      'fullNameNom', 'fullNameGen', 'fullNameDat', 'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc', 'workScheduleID',
      'dictPositionKindID', 'dictPositionGroupID', 'paymentType', 'dictSalarySchemeLevelID', 'dictTarifCoeffID', 'dictCostTypeID',
      'dictMilitaryRankID', 'dictMilitarySpecialityID', 'dictSpecialtyID', 'dictEmpCategoryID', 'dictAcademStatusID', 'comment'
    ])
    .misc({ __mip_recordhistory_all: true })
    .selectById(ID).then(record => {
      appHR.createNewVersion('hr_position',
        Object.assign(record, {
          staffOrderID: staffOrderID || null,
          'staffOrderID.entryDate': dateFrom || null,
          mi_dateFrom: dateFrom || null,
          priorID: ID
        }),
        afterClose,
        customParams
      )
    })
}

function checkFutureVersion (ID, miDataID, onDate) {
  return UB.Repository('hr_staffUnit')
    .attrs('ID')
    .where('mi_data_id', '=', miDataID)
    .where('mi_dateFrom', '>', onDate)
    .where('state', '=', 'ACTIVE')
    .where('ID', '!=', ID)
    .misc({
      __mip_recordhistory_all: true
    })
    .selectSingle().then(rec => {
      return rec ? $App.dialogYesNo('Увага', `Для даного елементу існують пізніші зміни ніж ${AC.dateService.formatDate(onDate)}. Це призведе до неможливості введення в дію поточних змін. Продовжити?`) : true
    })
}

function treePathAsArray (data) {
  let res = []
  if (!data || !data.length) {
    return res
  }
  data.forEach(item => {
    let treePath = item.mi_treePath
    if (treePath) {
      if (treePath.startsWith('/')) {
        treePath = treePath.slice(1)
      }
      if (treePath.endsWith('/')) {
        treePath = treePath.slice(0, -1)
      }
      let ids = treePath.split('/')
      for (let i = 0; i < ids.length; i++) {
        let id = ids[i]
        if (!res.includes(id)) {
          res.push(id)
        }
      }
    }
  })
  return res
}

function getEmpPosInfo (empID, empNumID, orgID, onDate, addFields) {
  orgID = orgID || appAC.globalOrganization()
  onDate = (onDate && new Date(onDate)) || appAC.globalApplicationDate()
  let fieldList = ['ID', 'positionID', 'positionID.name', 'departmentID', 'employeeNumberID']
  let isOrgField = false
  if (addFields) {
    fieldList.push(...addFields)
    isOrgField = !!addFields.find(itm => itm.startsWith('organizationID.'))
  }
  let res = UB.Repository('hr_employeePositionS')
    .attrs(fieldList)
    .whereIf(empID, 'employeeID', '=', empID)
    .whereIf(orgID, 'organizationID', '=', orgID)
    .whereIf(empNumID, 'employeeNumberID', '=', empNumID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('isActive', '=', true)
    .joinCondition('positionID.state', '=', 'ACTIVE')
    .joinCondition('[positionID.mi_dateTo] = [positionID.mi_maxDateTo]', 'custom')
    .joinCondition('positionID.mi_deleteDate', '>=', '#maxdate')
  if (isOrgField) {
    res = res.joinCondition('organizationID.state', '=', 'ACTIVE')
      .joinCondition('[organizationID.mi_dateTo] = [organizationID.mi_maxDateTo]', 'custom')
      .joinCondition('organizationID.mi_deleteDate', '>=', '#maxdate')
  }
  return res.selectSingle()
}

async function getOrgPlanUnits (staffTableID, childOrgIDs, onDate, attrs, showLiquidated = false, departmentID = null) {
  attrs = attrs || ['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'code', 'name', 'fullName', 'accrualSum', 'liquidate',
    'mi_unityEntity', 'mi_treePath', 'staffOrderID', 'isSecondaryChanges', 'quantity', 'state']
  const staffUnit = UB.Repository('hr_staffUnit')
    .attrs(attrs)
    .where('orgID', 'in', childOrgIDs)
    .whereIf(!showLiquidated, 'liquidate', '=', 0)
    .where('state', '=', 'ACTIVE', 'stateAct')
    /* в hr_staffUnit.meta не встановлено аттрибут dataHistory, тому __mip_ondate не працює */
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
    .where('staffOrderID', '=', staffTableID || 0, 'order')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('staffOrderID', '=', staffTableID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notOtherThanOrder')
    .logic('(([stateAct] AND [dateFrom] AND [dateTo] AND [notOtherThanOrder]) OR [order])')
    .orderBy('idxNum')

  if (departmentID) {
    staffUnit
      .where('mi_treePath', 'like', '/' + departmentID + '/', 'u1')
      .where('ID', '=', departmentID, 'u2')
      .logic('([u1] or [u2])')
  }
  return staffUnit.selectAsObject()
}

function addHierarchyIndex (data, rootID, indexField = 'treeIdx', idField = 'mi_data_id', parentField = 'parentUnitID') {
  function passLevel (parentId, parentIdx) {
    let childs = data.filter(item => item[parentField] === parentId)
    if (childs.length === 0) {
      return
    }
    for (let i = 0; i < childs.length; i++) {
      let dataItem = childs[i]
      dataItem[indexField] = (parentIdx.length ? parentIdx + '.' : '') + (i + 1).toString()
      passLevel(dataItem[idField], dataItem[indexField])
    }
  }

  passLevel(rootID, '')
}

function getOrgResp (respPosition, addFields, orgID, onDate) {
  orgID = orgID || appAC.globalOrganization('ID', true)
  onDate = onDate || appAC.globalApplicationDate()
  let fieldList = ['ID']
  if (addFields) {
    fieldList = fieldList.concat(addFields)
  }
  return orgID ? UB.Repository('hr_employeePositionS')
    .attrs(fieldList)
    .where('organizationID', '=', orgID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .exists(UB.Repository('hr_orgRespPosition')
      .correlation('positionID', 'positionID')
      .where('organizationID', '=', orgID)
      .where('respPosition', '=', respPosition)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('mi_deleteDate', '>=', '#maxdate'))
    .notExists(UB.Repository('hr_employeeVacation')
      .correlation('employeePositionID', 'ID')
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('dictVacationKindID.isDay', '=', 0, 'isDay')
      .where('dictVacationKindID.code', '=', 'dNot', 'dNot')
      .logic('([isDay] OR [dNot])'))
    .orderByDesc('dateFrom')
    .selectSingle() : Promise.resolve(null)
}

async function asyncOrgTree (orgID, sourceEmpNumbers, dateTo, orgStruct, isFill = true) {
  function getOrgTree (orgStruct, res, parentID, level = 1) {
    let curOrgDepts = orgStruct.filter(el => el.parentUnitID === parentID)
    let str = ''
    for (let i = 1; i < level; i++) str += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
    curOrgDepts.forEach(curNode => {
      res.childs.push({ mi_data_id: curNode.mi_data_id, name: curNode.depdescription ? `${str}${curNode.depdescription}` : null, childs: [] })
    })
    res.childs.forEach(cur => {
      getOrgTree(orgStruct, cur, cur.mi_data_id, level + 1)
    })
  }

  function fillOrgTree (curNode, sourceEmpNumbers) {
    let curEmpNums = sourceEmpNumbers.filter(el => (el.positionID && curNode.mi_data_id === el.positionID) ||
        (!el.positionID && el.departmentID && curNode.mi_data_id === el.departmentID) ||
        (!el.positionID && !el.departmentID && curNode.mi_data_id === orgID))

    curNode.emps = []
    curNode.isNotEmpty = false
    curEmpNums.forEach(ep => {
      curNode.emps.push(ep)
      curNode.isNotEmpty = true
    })
    curNode.childs.forEach(ch => {
      if (fillOrgTree(ch, sourceEmpNumbers)) curNode.isNotEmpty = true
    })
    return curNode.isNotEmpty
  }

  if (!orgStruct) {
    orgStruct = await $App.connection.run({
      entity: 'hr_staffUnit',
      method: 'selectLastOrgUnits',
      orgID: orgID,
      dateTo
    })
    orgStruct = JSON.parse(orgStruct.resultData).data
  }

  let orgTree = [{ mi_data_id: orgID, name: '', childs: [] }]
  getOrgTree(orgStruct, orgTree[0], orgID)

  if (isFill) {
    fillOrgTree(orgTree[0], sourceEmpNumbers)
  }
  return orgTree
}

function orgTree (orgID, sourceEmpNumbers, dateTo, orgStruct, isFill = true) {
  function getOrgTree (orgStruct, res, parentID, level = 1) {
    let curOrgDepts = orgStruct.filter(el => el.parentUnitID === parentID)
    let str = ''
    for (let i = 1; i < level; i++) str += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
    curOrgDepts.forEach(curNode => {
      res.childs.push({ mi_data_id: curNode.mi_data_id, name: curNode.depdescription ? `${str}${curNode.depdescription}` : null, childs: [], isDepartment: curNode.mi_unityEntity === 'hr_department', fullName: curNode.fullName })
    })
    res.childs.forEach(cur => {
      getOrgTree(orgStruct, cur, cur.mi_data_id, level + 1)
    })
  }

  function fillOrgTree (curNode, sourceEmpNumbers) {
    let curEmpNums = sourceEmpNumbers.filter(el => (el.positionID && curNode.mi_data_id === el.positionID) ||
        (!el.positionID && el.departmentID && curNode.mi_data_id === el.departmentID) ||
        (!el.positionID && !el.departmentID && curNode.mi_data_id === orgID))

    curNode.emps = []
    curNode.isNotEmpty = false
    curEmpNums.forEach(ep => {
      curNode.emps.push(ep)
      curNode.isNotEmpty = true
    })
    curNode.childs.forEach(ch => {
      if (fillOrgTree(ch, sourceEmpNumbers)) curNode.isNotEmpty = true
    })
    return curNode.isNotEmpty
  }

  let orgTree = [{ mi_data_id: orgID, name: '', fullName: '', childs: [], isDepartment: false }]
  getOrgTree(orgStruct, orgTree[0], orgID)

  if (isFill) {
    fillOrgTree(orgTree[0], sourceEmpNumbers)
  }
  return orgTree
}

function setStaffUnitWhereList ({ ctrl, orgID, onDate, modes, withChilds, callBackFn }) {
  orgID = orgID || appAC.globalOrganization()
  onDate = onDate || appAC.globalApplicationDate()
  const cond = withChilds ? 'in' : '='
  let getOrgsPromise
  if (withChilds) {
    getOrgsPromise = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('mi_treePath', 'like', `/${orgID}/`)
      .where('state', '=', 'ACTIVE')
      .where('mi_dateFrom', '<=', onDate)
      .where('mi_dateTo', '>=', onDate)
      .where('mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()
  } else {
    getOrgsPromise = Promise.resolve(orgID)
  }
  getOrgsPromise.then(orgData => {
    const orgIDs = withChilds ? orgData.map(itm => itm.mi_data_id) : orgData
    let whereList = [
      ['orgID', cond, orgIDs],
      ['state', '=', 'ACTIVE'],
      ['mi_dateFrom', '<=', onDate],
      ['mi_dateTo', '>', onDate]
    ]
    modes = modes || []
    AC.viewUtils.setWhereListProperty(ctrl, whereList, null, modes)
    callBackFn && callBackFn()
  })
}
