/* global $App */
module.exports = {
  getSearchParamsFields,
  getFieldList,
  getValueField,
  getDisplayField
}

function getAssocEntity (entity, attr) {
  let res
  const entityInfo = $App.domainInfo.get(entity)
  const attrInfo = entityInfo.attributes[attr]
  if (attrInfo && attrInfo.associatedEntity) {
    res = $App.domainInfo.get(attrInfo.associatedEntity, true)
  }
  return res
}

/* getFieldList - для списку полів випадаючого списку колонки "Значення" */
function getFieldList (entity, attr) {
  const entityInfo = getAssocEntity(entity, attr)
  if (entityInfo && entityInfo.hasMixin('dataHistory')) {
    return ['ID', 'mi_data_id', 'name']
  }
  const fieldLists = {
    hr_employeePosition: {
      positionID: ['ID', 'description']
    },
    hr_employeeAccrual: {
      payElID: ['ID', 'description']
    },
    hr_accrual: {
      payElID: ['ID', 'description']
    }
  }
  return (fieldLists[entity] && fieldLists[entity][attr]) ? fieldLists[entity][attr] : null
}

/* getValueField - для вказання поля відображення тексту valueField випадаючого списку колонки "Значення" */
function getValueField (entity, attr, dataType) {
  if (dataType === 'Enum') {
    return 'code'
  }
  const entityInfo = getAssocEntity(entity, attr)
  return entityInfo && entityInfo.hasMixin('dataHistory') ? 'mi_data_id' : 'ID'
}

/* getDisplayField - для вказання поля відображення тексту displayField випадаючого списку колонки "Значення" */
function getDisplayField (entity, attr) {
  const entityInfo = getAssocEntity(entity, attr)
  if (entityInfo && entityInfo.hasMixin('dataHistory')) {
    return 'name'
  }
  const displayFields = {
    hr_employeePosition: {
      positionID: 'description'
    },
    hr_employeeAccrual: {
      payElID: 'description'
    },
    hr_accrual: {
      payElID: 'description'
    }
  }
  return (displayFields[entity] && displayFields[entity][attr]) ? displayFields[entity][attr] : null
}

function getSearchParamsFields (searchCode) {
  let res
  if (searchCode === 'category') {
    res = ['ID', 'categoryCode', 'categoryName', 'historyField', 'historyField2', 'historyDateTo', 'historyOnMax', 'groupCode']
  } else if (searchCode === 'attribute') {
    res = ['ID', 'categoryCode', 'categoryName', 'attributeCode', 'attributeName', 'attributeDesc', 'associatedEntity',
      'associationAttr', 'dataType', 'size', 'useInSearch', 'priority', 'historyField', 'historyField2', 'historyDateTo',
      'historyOnMax', 'mapExpression', 'parentGroupCode', 'groupCode', 'noEntityDetails']
  }
  return res
}
