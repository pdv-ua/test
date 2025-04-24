/* global Ext _ UB $App AC appAC HR */
module.exports = {
  getWhereList,
  getOrderList,
  getValueCfg,
  prepareCondParams,
  getBaseEntityOnDate
}

const baseEntityHistoryAttrs = {
  hr_employeeNumber: ['dateFrom', 'dateTo']
}

/**
 * Отримати whereList для фільтрації випадаючого списку колонки "Значення"
 * @param {String} entity сутність
 * @param {String} attr атрибут
 * @return {Object} об'єкт whereList
 */
function getWhereList (entity, attr) {
  const globalOrg = appAC.globalOrganization()
  const globalDate = appAC.globalApplicationDate()
  const searchOrgMode = AC.settings.get('hrSearchOrgMode', 'CURRENT')
  const attrObj = AC.entityUtils.getAttribute(entity, attr)
  const ascEntity = attrObj && attrObj.associatedEntity
  /* Константи globalWhereAttr та globalWhereEntityAttr не можна виносити в глобальні, бо на стадії ініціалізації ще не відомо appAC.globalOrganization() */
  const globalWhereAttr = {
    orderState: [{
      expression: '[orderState]',
      condition: 'notEqual',
      value: 'PROJECT'
    }]
  }
  if (ascEntity === 'hr_organization') {
    if (searchOrgMode !== 'ALL') {
      if (searchOrgMode === 'WITH_CHILDS') {
        globalWhereAttr.orgID = [{
          expression: '[mi_treePath]',
          condition: 'like',
          value: `/${globalOrg}/%`
        }]
        globalWhereAttr.organizationID = globalWhereAttr.orgID
      } else {
        globalWhereAttr.orgID = [{
          expression: '[orgID]',
          condition: 'equal',
          value: globalOrg
        }]
        globalWhereAttr.organizationID = [{
          expression: '[organizationID]',
          condition: 'equal',
          value: globalOrg
        }]
      }
    }
    if (searchOrgMode !== 'CURRENT') {
      /* Обмеження по доступності організацій */
      let isAdmin = HR.orderManager.isAdmin()
      if (!isAdmin) {
        const userID = $App.connection.userData().userID
        const orgRight = {
          expression: '',
          condition: 'subquery',
          subQueryType: 'Exists',
          value: {
            entity: 'ac_userOrganization',
            fieldList: [],
            method: 'select',
            whereList: {
              userID: {
                expression: '[userID]',
                condition: 'equal',
                value: userID
              },
              orgID: {
                expression: '[organizationID]=[{master}.mi_data_id]',
                condition: 'custom'
              },
              mi_deleteDate: {
                condition: 'equal',
                expression: '[mi_deleteDate]',
                value: '#maxdate'
              }
            }
          }
        }
        if (globalWhereAttr.orgID) {
          globalWhereAttr.orgID.push(orgRight)
          globalWhereAttr.organizationID.push(orgRight)
        } else {
          globalWhereAttr.orgID = [orgRight]
          globalWhereAttr.organizationID = [orgRight]
        }
      }
    }
  }

  const globalWhereEntityAttr = {
    hr_position: {
      orgID: {
        expression: '[orgID]',
        condition: 'equal',
        value: globalOrg
      },
      state: {
        expression: '[state]',
        condition: 'equal',
        values: {
          value: 'ACTIVE'
        }
      },
      mi_dateFrom: {
        expression: '[mi_dateFrom]',
        condition: 'lessEqual',
        values: {
          value: globalDate
        }
      },
      mi_dateTo: {
        expression: '[mi_dateTo]',
        condition: 'moreEqual',
        values: {
          value: globalDate
        }
      }
    },
    hr_department: {
      orgID: {
        expression: '[orgID]',
        condition: 'equal',
        value: globalOrg
      },
      state: {
        expression: '[state]',
        condition: 'equal',
        values: {
          value: 'ACTIVE'
        }
      },
      mi_dateFrom: {
        expression: '[mi_dateFrom]',
        condition: 'lessEqual',
        values: {
          value: globalDate
        }
      },
      mi_dateTo: {
        expression: '[mi_dateTo]',
        condition: 'moreEqual',
        values: {
          value: globalDate
        }
      }
    },
    hr_organization: {
      state: {
        expression: '[state]',
        condition: 'equal',
        values: {
          value: 'ACTIVE'
        }
      },
      mi_dateFrom: {
        expression: '[mi_dateFrom]',
        condition: 'lessEqual',
        values: {
          value: globalDate
        }
      },
      mi_dateTo: {
        expression: '[mi_dateTo]',
        condition: 'moreEqual',
        values: {
          value: globalDate
        }
      }
    }
  }

  let res = {}
  let ascEntityAttrs = ascEntity && AC.entityUtils.getAttributes(ascEntity)
  if (ascEntityAttrs) {
    for (let i = 0; i < Object.keys(ascEntityAttrs).length; i++) {
      let attrName = Object.keys(ascEntityAttrs)[i]
      let entityWhereAttr = globalWhereAttr[attrName]
      if (entityWhereAttr && entityWhereAttr.length > 0) {
        let ascEntityAttr = ascEntityAttrs[attrName]
        if (!(ascEntityAttr.customSettings && ascEntityAttr.customSettings.noSearch)) {
          let whereItem = {}
          if (entityWhereAttr.length === 1) {
            whereItem[attrName] = entityWhereAttr[0]
          } else {
            for (let j = 0; j < entityWhereAttr.length; j++) {
              whereItem[attrName + j] = entityWhereAttr[j]
            }
          }
          res = _.merge(res, whereItem)
        }
      }
    }
    for (let i = 0; i < Object.keys(globalWhereEntityAttr).length; i++) {
      let whereEntityName = Object.keys(globalWhereEntityAttr)[i]
      if (whereEntityName === ascEntity) {
        let whereEntityObj = globalWhereEntityAttr[whereEntityName]
        for (let j = 0; j < Object.keys(whereEntityObj).length; j++) {
          let attrName = Object.keys(whereEntityObj)[j]
          let entityAttr = ascEntityAttrs[attrName]
          if (entityAttr) {
            let whereItem = {}
            whereItem[attrName] = whereEntityObj[attrName]
            res = _.merge(res, whereItem)
          }
        }
      }
    }
  }
  return res
}

/**
 * Отримати orderList для випадаючого списку колонки "Значення"
 * @param {String} entity сутність
 * @param {String} attr атрибут
 * @return {Object} об'єкт orderList
 */
function getOrderList (entity, attr, displayField) {
  const globalOrderEntityAttr = {
    hr_dictPeriod: { expression: '[dateFrom]', order: 'desc' }
  }

  let res
  let attrObj = AC.entityUtils.getAttribute(entity, attr)
  let ascEntity = attrObj && attrObj.associatedEntity
  let ascEntityAttrs = ascEntity && AC.entityUtils.getAttributes(ascEntity)
  if (ascEntityAttrs) {
    for (let i = 0; i < Object.keys(globalOrderEntityAttr).length; i++) {
      let orderEntityName = Object.keys(globalOrderEntityAttr)[i]
      if (orderEntityName === ascEntity) {
        res = { orderBy: globalOrderEntityAttr[orderEntityName] }
      }
    }
  }
  if (!res && displayField) {
    res = { orderBy: { expression: displayField } }
  }
  return res
}

/**
 * Отримати об'єкт контрола колонки "Значення"
 * @param {String} entity сутність
 * @param {Object} attrDef конфігурація атрибута
 * @param {Object} cfg конфігурація розмітки
 * @return {Object} об'єкт контрола
 */
function getValueCfg (entity, attrDef, cfg) {
  let cfgValue = Ext.apply(UB.core.UBUtil.attribute2cmpConfig(entity, attrDef), cfg)
  if (attrDef.hidden) {
    cfgValue.hidden = true
  }
  cfgValue.listeners = cfgValue.listeners || {}
  cfgValue.listeners.render = function (ctrl) {
    if (['organizationID', 'orgID'].includes(attrDef.attributeName)) {
      const store = ctrl.store
      store && store.on('load', () => {
        const attrs = $App.domainInfo.get(entity).attributes
        const attr = attrs[attrDef.attributeName]
        if (attr.associatedEntity === 'hr_organization') {
          let currOrgRecord = store.data.items.find(item => item.data.mi_data_id === -1)
          if (!currOrgRecord) {
            store.add({
              ID: -1,
              mi_data_id: -1,
              name: UB.i18n('<Поточна організація>')
            }, true)
          }
        }
      })
    }
  }
  return cfgValue
}

/** Попередня обробка об'єкта параметрів condBlockParams для сервера
 * @param {Object} condBlockParams початковий об'єкт параметрів
 * @return {Object} оброблений об'єкт параметрів
 */
function prepareCondParams (condBlockParams) {
  let condBlockParams4Server = _.cloneDeep(condBlockParams)
  condBlockParams4Server.forEach(condBlockItemParams => {
    let lastAttrNum = condBlockItemParams.attributes.length - 1
    let lastAttrData = condBlockItemParams.attributes[lastAttrNum]
    if (lastAttrData.associatedEntity === 'hr_organization') {
      if (condBlockItemParams.value === -1) {
        condBlockItemParams.value = appAC.globalOrganization()
      }
    }
  })
  return condBlockParams4Server
}

/** Повертає дату, якщо базову сутність пошуку (hr_employee або hr_employeeNumber) треба фільтрувати на дату
 * @param {Object} srchParams початковий об'єкт параметрів
 * @return {Date} дата фільтрації базової сутності або null, якщо не потрібно фільтрувати
 */
function getBaseEntityOnDate (srchParams) {
  let onDate = appAC.globalApplicationDate()
  let toBreak = false
  /* Якщо в списку параметрів пошуку є базова сутність та атрибути дат, то не фільтрувати базову сутність на дату */
  for (let i = 0; i < Object.keys(baseEntityHistoryAttrs).length; i++) {
    let baseEntityName = Object.keys(baseEntityHistoryAttrs)[i]
    if (baseEntityName === srchParams.baseEntity) {
      let baseEntityAttrs = baseEntityHistoryAttrs[baseEntityName]
      let condBlockParams = srchParams.condBlockParams
      for (let j = 0; j < condBlockParams.length; j++) {
        let condBlockItemParams = condBlockParams[i]
        let categories = condBlockItemParams.categories
        let attributes = condBlockItemParams.attributes
        for (let k = 0; k < categories.length; k++) {
          let category = categories[k]
          let attr = attributes[k]
          if (category.code === baseEntityName && attr && baseEntityAttrs.includes(attr.code)) {
            onDate = null
            toBreak = true
            break
          }
        }
        if (toBreak) {
          break
        }
      }
      break
    }
  }
  return onDate
}
