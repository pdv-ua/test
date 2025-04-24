const UB = require('@unitybase/ub')
const _ = require('lodash')
const entityBaseService = require('../../AC/modules/entityServices/entityBaseService')
const dataService = require('../../AC/modules/dataServices/dataService')
const dateService = require('../../AC/modules/dataServices/dateService')
const srchAttr = require('../hr_searchAttr')
const srchConditionOperation = require('../hr_searchConditionOperation')

const searchAttrAlias = 'searchAttr'

module.exports = {
  getSearchSql,
  searchAttrAlias,
  isCatInList,
  getOrgIDs,
  replaceParams
}

const sqlConditions = {
  equal: '=',
  notEqual: '<>',
  more: '>',
  lessEqual: '<=',
  moreEqual: '>=',
  less: '<',
  like: 'like',
  notLike: 'not like',
  in: 'in',
  notIn: 'not in',
  isNull: 'is null',
  notIsNull: 'is not null',
  startWith: 'like',
  notStartWith: 'not like'
}
const notConditions = {
  equal: 'notEqual',
  more: 'lessEqual',
  moreEqual: 'less',
  like: 'notLike',
  in: 'notIn',
  isNull: 'notIsNull',
  startWith: 'notStartWith',
  notEqual: 'equal',
  lessEqual: 'more',
  less: 'moreEqual',
  notLike: 'like',
  notIn: 'in',
  notIsNull: 'isNull',
  notStartWith: 'startWith',
  exists: 'not exists'
}
const historyJoinFields = {
  mi_dateFrom: 'mi_data_id',
  mi_dateTo: 'mi_data_id'
}
const conditionToCheck = {
  // posStateType: '.posStateType '
}
const globalWhere = {
  mi_deleteDate: `{0}.mi_deleteDate >= '9999-12-31'`
}
const globalWhereAttr = {
  orderState: `{0}.orderState <> 'PROJECT'`
}
const globalWhereAttr4Entity = {
  hr_position: {
    state: `{0}.state <> 'NEW'`,
    liquidate: `{0}.liquidate = 0`
  },
  hr_department: {
    state: `{0}.state = 'ACTIVE'`,
    liquidate: `{0}.liquidate = 0`
  },
  hr_organization: {
    state: `{0}.state = 'ACTIVE'`,
    liquidate: `{0}.liquidate = 0`
  }
}
/* Альтернативні ланцюжки для об'єднання категорій (в INNER JOIN), назви атрибутів в lowerCase */
const alternativeCatJoin = {
  'hr_position.hr_employee': { joinCat: 'hr_position', cat: 'hr_employeeposition' }
}

/* Маркер для встановлення умови пошуку на його місці */
const whereValueMarker = '{whereValue}'

function prepareExceptionSql (sqlStr, selfAlias) {
  return sqlStr.replace(/\[self\]/g, selfAlias)
}

function getAttrFullNames (condBlockItemParams) {
  let res = [condBlockItemParams.categories[0].code]
  for (let i = 0; i < condBlockItemParams.attributes.length; i++) {
    res.push(condBlockItemParams.attributes[i].code)
  }
  return res
}

function compareCatAttr (existedCat, joinAttr1, joinCat1, newCat, joinAttr2, joinCat2) {
  function compareCat (_cat1, _joinAttr1, _joinCat1, _cat2, _joinAttr2, _joinCat2) {
    return _cat1 === _cat2 && ((!_joinAttr1 || !_joinAttr2) || (_joinAttr1 === _joinAttr2)) &&
      ((!_joinCat1 || !_joinCat2) || (_joinCat1 === _joinCat2))
  }

  let lcat1 = existedCat.toLowerCase()
  let ljoinAttr1 = joinAttr1 && joinAttr1.toLowerCase()
  let ljoinCat1 = joinCat1 && joinCat1.toLowerCase()
  let lcat2 = newCat.toLowerCase()
  let ljoinAttr2 = joinAttr2 && joinAttr2.toLowerCase()
  let ljoinCat2 = joinCat2 && joinCat2.toLowerCase()
  let res = compareCat(lcat1, ljoinAttr1, ljoinCat1, lcat2, ljoinAttr2, ljoinCat2)
  if (!res) {
    let catJoin = `${ljoinCat2}.${lcat2}`
    let aCatJoin = alternativeCatJoin[catJoin]
    if (aCatJoin) {
      res = compareCat(lcat1, ljoinAttr1, ljoinCat1, aCatJoin.cat, ljoinAttr2, aCatJoin.joinCat)
    }
  }
  return res
}

function findCatAlias (catList, cat, joinAttr, joinCat) {
  let res = null
  for (let i = 0; i < catList.length; i++) {
    let catItem = catList[i]
    if (compareCatAttr(cat, joinAttr, joinCat, catItem.category, (catItem.hasAddEntity) ? null : catItem.joinField, catItem.joinCategory)) {
      res = catItem.alias
      break
    } else if (catItem.aliasMap && catItem.aliasMap[cat] && !joinCat) {
      res = catItem.aliasMap[cat]
      break
    }
  }
  return res
}

function getSelfAlias (catList, catObj, selfCategory) {
  let selfAlias = catObj.alias
  let selfCat = selfCategory || catObj.selfCategory
  if (catObj.isExclusion && selfCat) {
    selfAlias = findCatAlias(catList, selfCat, null)
  }
  return selfAlias
}

function mergeWhereClause (clause1, clause2) {
  const delim = '\r\n'
  if (!clause1 || !clause2) {
    if (clause1 && !clause2) return clause1
    else if (!clause1 && clause2) return clause2
    else return ''
  }
  let strArr1 = clause1.split(delim)
  let strArr2 = clause2.split(delim)
  for (let i = 0; i < strArr2.length; i++) {
    let strToCheck = strArr2[i]
    let isIn = false
    for (let j = 0; j < strArr1.length; j++) {
      if (strToCheck === strArr1[j]) {
        isIn = true
        break
      }
    }
    if (!isIn) {
      let firstChar = strToCheck.substring(0, 1)
      if (firstChar !== ' ' && firstChar !== '\t') {
        strToCheck = '\t\t\t' + strToCheck
      }
      strArr1.push(strToCheck)
    }
  }
  return strArr1.join(delim)
}

function checkCatAlias (catList, catObj, catToPrepare) {
  let result = false
  for (let i = 0; i < catList.length; i++) {
    let existentCat = catList[i]
    if (compareCatAttr(existentCat.category, (existentCat.hasAddEntity) ? null : existentCat.joinField, existentCat.joinCategory,
      catObj.category, (catObj.hasAddEntity) ? null : catObj.joinField, catObj.joinCategory)) {
      let ln1 = 0
      let ln2 = 0
      /* Перевірка перекриття атрибутів alias та joinOuterWhere */
      if (catObj.alias && existentCat.alias !== catObj.alias) {
        existentCat.alias = catObj.alias
      } else if (existentCat.alias && !catObj.alias) {
        catObj.alias = existentCat.alias
      }
      if (existentCat.joinOuterWhere) ln1 = existentCat.joinOuterWhere.length
      if (catObj.joinOuterWhere) ln2 = catObj.joinOuterWhere.length
      if (ln2 > 0 && ln1 > 0 && ln2 !== ln1) {
        let selfAlias = getSelfAlias(catList, catObj)
        let joinOuterWhereMerged = mergeWhereClause(existentCat.joinOuterWhere, catObj.joinOuterWhere)
        if (selfAlias) {
          existentCat.joinOuterWhere = prepareExceptionSql(joinOuterWhereMerged, selfAlias)
        } else {
          existentCat.joinOuterWhere = joinOuterWhereMerged
          if (catToPrepare) catToPrepare.push({ catObj: existentCat, selfCategory: catObj.selfCategory })
        }
      }
      if (catObj.hasAddEntity && !existentCat.hasAddEntity) existentCat.hasAddEntity = catObj.hasAddEntity
      result = true
      break
    }
  }
  return result
}

/* Формування структури CatList об'єктів CatObj для кожної умови condBlockItemParams */
function getCatAttr (srchParams, condBlockItemParams, addExclusion) {
  let res = []
  let condCatCount = condBlockItemParams.categories.length
  let firstCatCode = condBlockItemParams.categories[0].code
  let outerExclusion = getExclusion(srchParams, condBlockItemParams, firstCatCode)
  let isOuterAddEntityExclusion = addExclusion && (outerExclusion && outerExclusion.type === 'addEntity')
  if (outerExclusion) {
    if (isOuterAddEntityExclusion) {
      res.push({
        category: outerExclusion.joinBaseEntity,
        attribute: outerExclusion.joinBaseField,
        alias: outerExclusion.joinBaseAlias,
        joinCategory: outerExclusion.joinBaseEntity,
        joinAlias: outerExclusion.baseEntityAlias || srchParams.baseEntityAlias,
        joinField: outerExclusion.joinBaseField,
        joinBaseField: outerExclusion.joinBaseField || 'ID',
        joinParentField: outerExclusion.joinParentField || 'ID',
        joinOuterWhere: outerExclusion.joinOuterWhere,
        isExclusion: true,
        selfCategory: firstCatCode
      })
    }
  }
  for (let i = 0; i < condCatCount - 1; i++) {
    let catCode = condBlockItemParams.categories[i].code
    let attrCode = condBlockItemParams.attributes[i].code
    let catObj = {
      category: catCode,
      attribute: attrCode,
      alias: null
    }
    if (i > 0) {
      const lastAttrObj = condBlockItemParams.attributes[i - 1]
      catObj.joinCategory = condBlockItemParams.categories[i - 1].code
      catObj.joinField = lastAttrObj.code
      catObj.joinFieldType = lastAttrObj.dataType
      catObj.joinParentField = 'ID'
      catObj.joinBaseField = lastAttrObj.associationAttr || 'ID'
      if (lastAttrObj.mapExpression) {
        catObj.mapExpression = lastAttrObj.mapExpression
      }
    } else { // i === 0
      if (isOuterAddEntityExclusion) {
        catObj.alias = outerExclusion.joinOuterAlias
        catObj.joinCategory = res[0].category
        catObj.joinAlias = res[0].alias
        catObj.joinField = outerExclusion.joinField
        catObj.joinOuterClause = outerExclusion.joinOuterClause
        catObj.hasAddEntity = true
        catObj.aliasMap = outerExclusion.aliasMap
      } else {
        if (outerExclusion) {
          if (outerExclusion.alias) {
            catObj.alias = outerExclusion.alias
          }
          if (!isOuterAddEntityExclusion && outerExclusion.joinOuterWhere) {
            catObj.joinOuterWhere = outerExclusion.joinOuterWhere
          }
        }
        catObj.joinCategory = srchParams.baseEntity
        catObj.joinAlias = (outerExclusion && outerExclusion.joinBaseAlias) || srchParams.baseEntityAlias
        catObj.joinField = (catCode === srchParams.baseEntity) ? 'ID'
          : ((outerExclusion && outerExclusion.joinParentField) || srchParams.baseJoinField)
        catObj.joinParentField = srchParams.baseEntityKey || 'ID'
      }
      catObj.joinBaseField = srchParams.baseJoinField || 'ID'
    }
    res.push(catObj)
  }
  return res
}

/* Доповнення структури CatList об'єктів CatObj: прибрати дублювання сутностей, заповнити аліаси таблиць */
function addCondCats (srchParams, condBlockItemParams, catList) {
  const innerAliasPrefix = 'b'
  let condCatAttrs = getCatAttr(srchParams, condBlockItemParams, true)
  let catCount = catList.length
  let aliasIdx = catCount + 1
  let catToPrepare = []
  for (let i = 0; i < condCatAttrs.length; i++) {
    let catObj = condCatAttrs[i]
    let prevJoinFieldIsVirtualEntity = (catObj.joinFieldType === 'NotExistentEntity')
    let isAdded
    if (prevJoinFieldIsVirtualEntity) {
      if (catObj.joinCategory === catObj.category) {
        if (!catObj.alias && i > 0) {
          let prevCatObj = condCatAttrs[i - 1]
          catObj.alias = prevCatObj.alias
        }
        continue
      }
    }
    isAdded = checkCatAlias(catList, catObj, catToPrepare)
    if (!isAdded) {
      if (!catObj.joinAlias) {
        let prevCatJoinField
        if (i > 0) {
          let prevCatObj = condCatAttrs[i - 1]
          if (prevCatObj.alias) {
            catObj.joinAlias = prevCatObj.alias
          }
          prevCatJoinField = prevCatObj.joinField
        }
        if (!catObj.joinAlias) {
          catObj.joinAlias = findCatAlias(catList, catObj.joinCategory, (i > 1) ? prevCatJoinField : null)
        }
      }
      if (!catObj.alias) {
        catObj.alias = innerAliasPrefix + aliasIdx++
      }
      let exclusion = _.clone(getExclusion(srchParams, condBlockItemParams, catObj.category))
      let isExclusion = !!exclusion
      if (isExclusion) {
        if (exclusion.joinInnerClause) {
          exclusion.joinInnerClause = prepareExceptionSql(exclusion.joinInnerClause, catObj.alias)
        }
        if (exclusion.joinInnerWhere) {
          exclusion.joinInnerWhere = prepareExceptionSql(exclusion.joinInnerWhere, catObj.alias)
        }
        if (exclusion.joinOuterWhere) {
          exclusion.joinOuterWhere = prepareExceptionSql(exclusion.joinOuterWhere, catObj.alias)
        }
      }
      if (catObj.joinOuterClause) {
        catObj.joinOuterClause = prepareExceptionSql(catObj.joinOuterClause, catObj.alias)
      }
      catList.push({
        category: catObj.category,
        attribute: catObj.attribute,
        joinFieldType: catObj.joinFieldType,
        alias: catObj.alias,
        joinCategory: catObj.joinCategory,
        joinAlias: catObj.joinAlias,
        joinField: catObj.joinField,
        joinBaseField: catObj.joinBaseField,
        joinParentField: catObj.joinParentField,
        joinOuterClause: catObj.joinOuterClause,
        joinOuterWhere: isExclusion ? exclusion.joinOuterWhere : catObj.joinOuterWhere,
        joinInnerClause: isExclusion ? exclusion.joinInnerClause : null,
        joinInnerWhere: isExclusion ? exclusion.joinInnerWhere : null,
        isExclusion: catObj.isExclusion,
        selfCategory: catObj.selfCategory,
        hasAddEntity: catObj.hasAddEntity,
        mapExpression: catObj.mapExpression,
        aliasMap: isExclusion ? exclusion.aliasMap : null
      })
    }
  }
  if (catToPrepare.length) {
    catToPrepare.forEach(function (catToPrepareObj) {
      let catItem = catToPrepareObj.catObj
      let selfAlias = getSelfAlias(catList, catItem, catToPrepareObj.selfCategory)
      catItem.joinOuterWhere = prepareExceptionSql(catItem.joinOuterWhere, selfAlias)
    })
  }
}

function srchParamsToWhereList (srchParams) {
  let condCount = srchParams.condBlockParams.length
  let logicGroups = []
  let groupStrArray = []
  let openBracketCount
  let groupBracketNum
  let res
  let groupKey
  let groupStr
  let groupIndex
  let isGroupEnd
  if (condCount > 0) {
    res = { whereList: {}, whereGroups: {}, itemInfo: [], existsGroups: [] }
    // Заповнення блоків res.whereList та res.itemInfo
    for (let i = 0; i < condCount; i++) {
      let condBlockItemParams = srchParams.condBlockParams[i]
      let attrFullField = getAttrFullNames(condBlockItemParams).join('.')
      let attrKey = getAttrFullNames(condBlockItemParams).join('_')
      let catArray = getCatAttr(srchParams, condBlockItemParams, true)
      let condition = getCondition(condBlockItemParams)
      let val = (condition === 'in' || condition === 'notIn') ? condBlockItemParams.value : getWhereValue(condBlockItemParams, srchParams)
      if (res.whereList[attrKey]) attrKey += i
      res.whereList[attrKey] = {
        expression: UB.format('[{0}]', attrFullField),
        condition: condition
      }
      if (val !== null) {
        res.whereList[attrKey].values = {
          value: val
        }
      }
      res.itemInfo[i] = {
        attrKey: attrKey,
        catArray: catArray,
        groupNum: null,
        bracketNum: 0,
        groupBracketNum: 0
      }
    }

    // формування Exists груп
    openBracketCount = 0
    groupBracketNum = 0
    isGroupEnd = false
    for (let i = 0; i < condCount; i++) {
      let condBlockItemParams = srchParams.condBlockParams[i]
      let condition = condBlockItemParams.condition
      let operation = condBlockItemParams.operation
      let today = new Date()
      let onDate = (condBlockItemParams.onDate) ? ((condBlockItemParams.onDate instanceof Date) ? condBlockItemParams.onDate
        : new Date(condBlockItemParams.onDate)) : today
      let lbracketStart
      let itemInfo = res.itemInfo[i]
      let lBrCnt = condBlockItemParams.lbracket.length
      let rBrCnt = condBlockItemParams.rbracket.length

      // Заповнення itemInfo.bracketNum
      if (lBrCnt > 0 && isGroupEnd) {
        groupBracketNum++
        isGroupEnd = false
      }
      openBracketCount += lBrCnt
      lbracketStart = openBracketCount > 0
      if (lbracketStart) {
        itemInfo.bracketNum = openBracketCount
        itemInfo.groupBracketNum = groupBracketNum
        if (rBrCnt) {
          openBracketCount -= rBrCnt
          isGroupEnd = true
        }
      }

      // Об'єднання умов з однаковими категоріями в exists групах
      /* Не об'єднувати атрибути в групи Exists, якщо
       1. Інша група скобок (prevItemInfo.groupBracketNum !== itemInfo.groupBracketNum || prevItemInfo.bracketNum !== itemInfo.bracketNum).
       2. Операція поєднання умови 'АБО' (operation = 'or'), але коли не починається нова група (prevCondBlockItemParams.lbracket.length == 0).
       3. Умова exists (condition === 'exists').
       4. Якщо дата 'На дату' відрізніється (prevOnDate.getTime() !== onDate.getTime()).
       */
      if (!(srchConditionOperation.isOrOperation(operation) || condition === 'exists')) {
        /* Визначаємо індекс умови, з якої починається група */
        let idxStartGroup = 0
        for (let j = 0; j < i; j++) {
          let prevItemInfo = res.itemInfo[j]
          if (prevItemInfo.groupBracketNum === itemInfo.groupBracketNum && prevItemInfo.bracketNum === itemInfo.bracketNum) {
            idxStartGroup = j
            break
          }
        }
        /* Якщо в групі є умова OR, то не об'єднувати з умовами вище OR */
        for (let j = idxStartGroup; j < i; j++) {
          let prevCondBlockItemParams = srchParams.condBlockParams[j]
          let prevOperation = prevCondBlockItemParams.operation
          if (j > idxStartGroup && srchConditionOperation.isOrOperation(prevOperation)) {
            idxStartGroup = j
          }
        }
        /* Перевірка об'єднання в групу */
        for (let j = i - 1; j >= idxStartGroup; j--) {
          let prevItemInfo = res.itemInfo[j]
          let prevCondBlockItemParams = srchParams.condBlockParams[j]
          let prevCondition = prevCondBlockItemParams.condition
          let prevOperation = prevCondBlockItemParams.operation
          let prevOnDate = (prevCondBlockItemParams.onDate) ? ((prevCondBlockItemParams.onDate instanceof Date)
            ? prevCondBlockItemParams.onDate : new Date(prevCondBlockItemParams.onDate)) : today
          let hasHistCat = !!condBlockItemParams.historyCategory
          let hasPrevHistCat = !!prevCondBlockItemParams.historyCategory
          let existsGroup
          if (prevItemInfo.groupBracketNum !== itemInfo.groupBracketNum || prevItemInfo.bracketNum !== itemInfo.bracketNum ||
            (srchConditionOperation.isOrOperation(prevOperation) && prevCondBlockItemParams.lbracket.length === 0) || prevCondition === 'exists' ||
            (hasHistCat && hasPrevHistCat && prevOnDate.getTime() !== onDate.getTime())) {
            break
          }

          if (prevItemInfo.catArray.length >= itemInfo.catArray.length) {
            if (prevItemInfo.catArray[0].category === itemInfo.catArray[0].category) {
              // Необхідна група exists
              if (prevItemInfo.groupNum === null) {
                // Створюєму нову групу exists
                let lastGroupNum = res.existsGroups.length
                let existsGroup = {
                  mainCondIndex: j,
                  condOrder: [j, i],
                  catList: []
                }
                res.existsGroups.push(existsGroup)
                prevItemInfo.groupNum = lastGroupNum
                itemInfo.groupNum = lastGroupNum
                addCondCats(srchParams, prevCondBlockItemParams, existsGroup.catList)
                addCondCats(srchParams, condBlockItemParams, existsGroup.catList)
              } else {
                existsGroup = res.existsGroups[prevItemInfo.groupNum]
                existsGroup.condOrder.push(i)
                itemInfo.groupNum = prevItemInfo.groupNum
                addCondCats(srchParams, condBlockItemParams, existsGroup.catList)
                break
              }
            }
          } else {
            if (prevItemInfo.catArray[0].category === itemInfo.catArray[0].category) {
              // Необхідна група exists
              if (prevItemInfo.groupNum === null) {
                // Створюєму нову групу exists
                let lastGroupNum = res.existsGroups.length
                let existsGroup = {
                  mainCondIndex: i,
                  operation: operation,
                  condOrder: [j, i],
                  catList: []
                }
                res.existsGroups.push(existsGroup)
                prevItemInfo.groupNum = lastGroupNum
                itemInfo.groupNum = lastGroupNum
                addCondCats(srchParams, prevCondBlockItemParams, existsGroup.catList)
                addCondCats(srchParams, condBlockItemParams, existsGroup.catList)
              } else {
                existsGroup = res.existsGroups[prevItemInfo.groupNum]
                // Знаходимо головну (найдовшу) умову групи
                prevItemInfo = res.itemInfo[existsGroup.mainCondIndex]
                if (prevItemInfo.catArray.length < itemInfo.catArray.length) {
                  // Необхідно змінити головну умову
                  existsGroup.mainCondIndex = i
                }
                existsGroup.condOrder.push(i)
                itemInfo.groupNum = prevItemInfo.groupNum
                addCondCats(srchParams, condBlockItemParams, existsGroup.catList)
                break
              }
            }
          }
        }
      }
    }

    // Об'єднання Exists груп в групи верхнього рівня whereGroups та заповнення sql об'єднання груп (Group1Key OR GroupKey2 ...)
    openBracketCount = 0
    for (let i = 0; i < condCount; i++) {
      let condBlockItemParams = srchParams.condBlockParams[i]
      let operation = condBlockItemParams.operation
      let lbracketStart

      if (condBlockItemParams.lbracket.length) {
        if (openBracketCount === 0) {
          groupKey = Object.keys(res.whereList)[i]
          groupIndex = i
        }
        openBracketCount += condBlockItemParams.lbracket.length
      }
      lbracketStart = openBracketCount > 0
      if (lbracketStart) {
        let hasExistsGroup = res.itemInfo[i].groupNum !== null
        let existsGroup = hasExistsGroup ? res.existsGroups[res.itemInfo[i].groupNum] : null
        let hasItemSql = existsGroup ? (existsGroup.condOrder[0] === i) : true
        if (hasItemSql && groupStrArray.length) {
          groupStrArray.push(srchConditionOperation.getConditionSQL(operation))
        }
        if (condBlockItemParams.lbracket.length) {
          groupStrArray.push(condBlockItemParams.lbracket)
        }
        if (hasItemSql) {
          groupStrArray.push(UB.format('[{0}]', Object.keys(res.whereList)[i]))
        }
        if (condBlockItemParams.rbracket.length) {
          groupStrArray.push(condBlockItemParams.rbracket)
          openBracketCount -= condBlockItemParams.rbracket.length
        }
        if (openBracketCount === 0 || i === condCount - 1) {
          groupStr = groupStrArray.join(' \r\n')
          logicGroups.push(groupStr)
          groupStrArray = []
          res.whereGroups[groupKey] = {
            isGroup: true,
            groupIndex: groupIndex,
            operation: existsGroup ? existsGroup.operation : '',
            groupSql: groupStr
          }
        }
      } else {
        /* Немає групування */
        let attrKey = Object.keys(res.whereList)[i]
        res.whereGroups[attrKey] = {
          isGroup: false,
          groupIndex: i,
          operation: operation
        }
      }
    }
    if (logicGroups.length) {
      res.logicalPredicates = logicGroups
    }
    /* Неявне групування блоків, що поєднані оператором OR */
    let idx4Or = -1
    let isOrBlock = false
    let whereGroupKeys = Object.keys(res.whereGroups)
    let whereGrpLen = whereGroupKeys.length
    for (let i = 1; i <= whereGrpLen; i++) {
      let grpKey = (i < whereGrpLen) ? whereGroupKeys[i] : null
      let whereGroup = (grpKey) ? res.whereGroups[grpKey] : null
      let operation = (whereGroup) ? whereGroup.operation : ''
      if (srchConditionOperation.isOrOperation(operation)) {
        let isGroup = (whereGroup) ? whereGroup.isGroup : false
        if (!isGroup && !isOrBlock) {
          /* Знаходимо індекс 1-ої умови без групування */
          idx4Or = i - 1
          for (let j = idx4Or - 1; j >= 0; j--) {
            let prevWhereGroup = res.whereGroups[whereGroupKeys[j]]
            if (!srchConditionOperation.isOrOperation(prevWhereGroup.operation) && !prevWhereGroup.isGroup) {
              idx4Or = j
            } else {
              break
            }
          }
          isOrBlock = true
        }
      } else {
        if (isOrBlock) {
          let orWhereBegGroup = res.whereGroups[whereGroupKeys[idx4Or]]
          let orWhereEndGroup = res.whereGroups[whereGroupKeys[i - 1]]
          orWhereBegGroup.startSql = '('
          orWhereEndGroup.finishSql = ')'
          idx4Or = -1
          isOrBlock = false
        }
      }
    }
  } else {
    res = null
  }
  return res
}

function getWhereValue (condBlockItemParams, srchParams) {
  let res = condBlockItemParams.value
  let lastCatNum = condBlockItemParams.categories.length - 1
  let lastCatData = condBlockItemParams.categories[lastCatNum]
  if (lastCatData.code === 'hr_organization' && res === -1) {
    // Поточна організація
    res = srchParams.orgID
  } else {
    let lastAttrNum = condBlockItemParams.attributes.length - 1
    let lastAttrData = condBlockItemParams.attributes[lastAttrNum]
    let condition = condBlockItemParams.condition
    let dataType = lastAttrData.dataType
    let isString = (dataType === 'String' || dataType === 'Text')
    let isNullCondition = (condition === 'isNull')
    let hasExists = (condition === 'exists')
    let whereItem = { condition: condition }

    if (condition === 'in') {
      if (dataType === 'Enum') {
        res = `'` + res.join(`','`) + `'`
      } else {
        res = res.join(',')
      }
    }
    if (isNullCondition && isString) {
      res = `''`
    } else if ((isNullCondition && !isString) || hasExists) {
      res = null
    } else if (isString) {
      if (res.indexOf("'") >= 0) {
        res = res.replace(/'/g, "''")
      }
    } else if (dataType === 'Date' || dataType === 'DateTime') {
      res = new Date(res)
    }

    if (res !== null) {
      whereItem.values = { value: res }
      if (!(isNullCondition && isString)) {
        res = getWhereSqlValue(whereItem)
      }
    }
  }
  return res
}

function getCondition (condBlockItemParams) {
  let condition = condBlockItemParams.condition
  let attrData = condBlockItemParams.attributes[condBlockItemParams.attributes.length - 1]
  let isNullCondition = condition === 'isNull'
  let isString = (attrData.dataType === 'String' || attrData.dataType === 'Text')
  if (!condition) return null

  if (isNullCondition && isString) {
    condition = (condBlockItemParams.opposite) ? 'notEqual' : 'equal'
  } else if (condBlockItemParams.opposite) {
    condition = notConditions[condition]
  }
  return condition
}

function getWhereSqlValue (whereItem) {
  let res = ''
  let inCondition = (whereItem.condition === 'in' || whereItem.condition === 'notIn')
  if (whereItem.values) {
    res = whereItem.values.value
    let isBool = typeof res === 'boolean'
    let isString = typeof res === 'string'
    if (res || isBool) {
      if (isString && !inCondition) {
        res = UB.format(`'{0}'`, res)
      } else if (res instanceof Date) {
        res = dateService.formatDate4Sql(res)
      } else if (isBool) {
        res = res ? 1 : 0
      }
      if (whereItem.condition === 'startWith' || whereItem.condition === 'notStartWith') {
        if (!res.endsWith(`%'`)) res = res.slice(0, res.length - 1) + `%'`
      } else if (whereItem.condition === 'like' || whereItem.condition === 'notLike') {
        if (!res.startsWith(`'%`)) res = `'%` + res.slice(1)
        if (!res.endsWith(`'%`)) res = res.slice(0, res.length - 1) + `%'`
      } else if (inCondition) {
        res = UB.format('({0})', res)
      }

      if (isString && !inCondition) {
        res = UB.format(`LOWER({0})`, res)
      }
    }
  }
  return res
}

function getExclusion (srchParams, condBlockItemParams, cat) {
  let joinExclusions = srchParams.joinExclusions ? srchParams.joinExclusions[cat] : null
  if (joinExclusions) {
    const exclusionEntities = joinExclusions.exclusionEntities
    if (exclusionEntities && exclusionEntities.length > 0) {
      const cat1 = condBlockItemParams.categories[1]
      if (cat1 && exclusionEntities.includes(cat1.code)) {
        joinExclusions = null
      }
    }
  }
  return joinExclusions
}

function getMapExprSql (mapExpression, tableAlias) {
  let result
  if (!mapExpression) return result

  result = mapExpression.replace(/\[\w+\]/g, tableAlias + '.$&')
  result = result.replace(/\{self\}\.(\w+)/g, tableAlias + '.$1')
  return result
}

function getJoinAttrSql (condBlockItemParams, tableAlias, attrIndex) {
  let idx = attrIndex || condBlockItemParams.attributes.length - 1
  let attrData = condBlockItemParams.attributes[idx]
  let isNullCondition = (condBlockItemParams.condition === 'isNull' || condBlockItemParams.condition === 'notIsNull')
  let isString = (attrData.dataType === 'String' || attrData.dataType === 'Text')
  let result
  if (attrData.mapExpression) {
    result = getMapExprSql(attrData.mapExpression, tableAlias)
  } else if (isNullCondition) {
    let nullTmpl
    if (isString) {
      nullTmpl = `LTRIM(COALESCE({0}.{1},''))`
    } else {
      nullTmpl = `COALESCE({0}.{1},null)`
    }
    result = UB.format(nullTmpl, tableAlias, attrData.code)
  } else if (isString) {
    result = UB.format(`LOWER(LTRIM(COALESCE({0}.{1},'')))`, tableAlias, attrData.code)
  } else {
    result = UB.format('{0}.{1}', tableAlias, attrData.code)
  }
  return result
}

/* Функція не додає рядки, що вже додані */
function addUniqueLines (array, str, arrayOfAdded) {
  let strArray = str.split('\r\n')
  strArray.forEach(function (item) {
    if (!dataService.isContainedInArray(item.trim(), arrayOfAdded)) {
      array.push(item)
      arrayOfAdded.push(item)
    }
  })
}

/* Функція видаляє рядки фільтрації по атрибуту, якщо по цьому атрибуту ведеться пошук */
function checkConditions (attrs, whereSql) {
  let strArray = whereSql.split('\r\n')
  let rowIndexToDel = []
  let res
  for (let i = 0; i < attrs.length; i++) {
    let attr = attrs[i]
    let strToCheck = conditionToCheck[attr]
    if (strToCheck) {
      for (let j = 0; j < strArray.length; j++) {
        let strRow = strArray[j]
        if (strRow.indexOf(strToCheck) >= 0) {
          rowIndexToDel.push(j)
        }
      }
    }
  }
  if (rowIndexToDel.length) {
    for (let i = rowIndexToDel.length - 1; i >= 0; i--) {
      let idx = rowIndexToDel[i]
      strArray.splice(idx, 1)
    }
    res = strArray.join('\r\n')
  } else {
    res = whereSql
  }
  return res
}

function getSearchSql (srchParams) {
  const aliasPrefix = 'a'
  const innerAliasPrefix = 'b'
  const ident = '\t'
  const sqlDialect = entityBaseService.getSQLDialect()
  let condCount = srchParams.condBlockParams.length
  let joinAliasCnt = 1
  let whereClause = ['(']
  let whereList = srchParamsToWhereList(srchParams)
  let whereListSql = {}
  let searchAttrSql = []
  let baseEntityKey
  let addedAttrs = []
  /* Формування sql для груп та поодиноких умов, що ідентифікуються ключем attrKey (для групи - це 1-ий атрибут), в структурі whereListSql */
  for (let i = 0; i < condCount; i++) {
    let condOrder = [i]
    let isExistGroup = (whereList.itemInfo[i].groupNum !== null)
    let condBlockItemParams
    let catList
    let existsGroup
    let catListWithoutAddedEntity
    let joinItemArray = []
    baseEntityKey = srchParams.baseEntityKey || 'ID'
    if (isExistGroup) {
      existsGroup = whereList.existsGroups[whereList.itemInfo[i].groupNum]
      catList = existsGroup.catList
      if (i === existsGroup.condOrder[0]) {
        condBlockItemParams = srchParams.condBlockParams[existsGroup.mainCondIndex]
        condOrder = existsGroup.condOrder
      } else {
        continue
      }
    } else {
      condBlockItemParams = srchParams.condBlockParams[i]
      catList = getCatAttr(srchParams, condBlockItemParams, true)
      catListWithoutAddedEntity = getCatAttr(srchParams, condBlockItemParams, false)
    }
    let attrKey = Object.keys(whereList.whereList)[i]
    let catCount = (isExistGroup) ? catList.length : catListWithoutAddedEntity.length
    let condition = getCondition(condBlockItemParams)
    let whereListItemSql = []
    let searchAttrItemSql = []
    let hasExists = (condition === 'exists' || condition === 'not exists')
    let outConditionSql = hasExists ? condition.toUpperCase() : 'EXISTS'
    let hasHistory, historyCat
    let historyCatIsAssigned = false
    let joinAlias
    let outerJoinAlias
    let outerJoinField
    let attrs
    /* Умова перевірки історичності 'на дату' перевіряється у всіх атрибутів групи і береться у останнього з них */
    for (let j = condOrder.length - 1; j >= 0; j--) {
      let idx = condOrder[j]
      let itrCondBlockItemParams = srchParams.condBlockParams[idx]
      if (itrCondBlockItemParams.historyCategory) {
        hasHistory = true
        condBlockItemParams.historyCategory = itrCondBlockItemParams.historyCategory
        condBlockItemParams.historyCondition = itrCondBlockItemParams.historyCondition
        condBlockItemParams.onDate = itrCondBlockItemParams.onDate
        historyCat = itrCondBlockItemParams.historyCategory.code
        break
      }
    }
    let firstCat
    let firstCatAlias
    if (!isExistGroup) {
      let firstCatData = condBlockItemParams.categories[0]
      firstCat = firstCatData.code
      let joinField = (firstCat === srchParams.baseEntity) ? 'ID' : srchParams.baseJoinField
      let newInnerAlias
      let innerJoinAliasCount = 1
      let outerExclusion = getExclusion(srchParams, condBlockItemParams, firstCat)
      let isOuterAddEntityExclusion = (outerExclusion && outerExclusion.type === 'addEntity')
      let isOuterChangeKeyExclusion = (outerExclusion && outerExclusion.type === 'changeKeyFields')
      let isExclusion = isOuterChangeKeyExclusion || isOuterAddEntityExclusion
      let innerExclusions = []
      let outerJoinWhere
      /* Додавання вибору з 1-ої категорії в EXISTS (SELECT 1 FROM ... */
      if (isOuterAddEntityExclusion) {
        whereListItemSql.push(UB.format('{0} (SELECT 1 FROM {1} {2}', outConditionSql,
          outerExclusion.joinBaseEntity, outerExclusion.joinBaseAlias))
        firstCatAlias = outerExclusion.joinBaseAlias
        if (outerExclusion.joinOuterAlias) {
          joinAlias = outerExclusion.joinOuterAlias
        } else {
          joinAlias = aliasPrefix + joinAliasCnt++
        }
        if (condBlockItemParams.historyCategory) {
          condBlockItemParams.historyCategory.historyCatAlias = joinAlias
        }
      } else {
        if (isOuterChangeKeyExclusion) {
          if (outerExclusion.alias) {
            joinAlias = outerExclusion.alias
          } else {
            joinAlias = aliasPrefix + joinAliasCnt++
          }
        } else {
          joinAlias = aliasPrefix + joinAliasCnt++
        }
        whereListItemSql.push(UB.format('{0} (SELECT 1 FROM {1} {2}', outConditionSql, firstCat, joinAlias))
        firstCatAlias = joinAlias
      }
      if (outerExclusion) {
        if (outerExclusion.joinOuterClause) {
          let outerJoinClause = prepareExceptionSql(outerExclusion.joinOuterClause, joinAlias)
          whereListItemSql.push(UB.format('{0}\t{1}', ident, outerJoinClause))
        }
        if (outerExclusion.joinOuterWhere) {
          outerJoinWhere = prepareExceptionSql(outerExclusion.joinOuterWhere, joinAlias)
        }
      }
      if (hasHistory) {
        if (historyCat === firstCat) {
          condBlockItemParams.historyCategory.historyCatAlias = joinAlias
        }
        historyCatIsAssigned = true
      }
      catListWithoutAddedEntity[0].alias = joinAlias
      if (hasExists) catCount++
      /* Проход по всім категоріям після 1-ої для формування INNER JOIN */
      if (catCount > 1) {
        let prevInnerAlias, prevCat, prevJoinField, prevJoinFieldIsVirtualEntity, mapExpression
        for (let j = 1; j < catCount; j++) {
          let cat = condBlockItemParams.categories[j].code
          let innerExclusion
          let isCatListJ = (j < catListWithoutAddedEntity.length && catListWithoutAddedEntity[j])
          prevJoinFieldIsVirtualEntity = (condBlockItemParams.attributes[j - 1].dataType === 'NotExistentEntity')
          prevInnerAlias = null
          /* Пропускати, якщо категорія повторюється (при віртуальній сутності) */
          if (prevJoinFieldIsVirtualEntity) {
            let prevCat = condBlockItemParams.categories[j - 1].code
            if (prevCat === cat) {
              newInnerAlias = catListWithoutAddedEntity[j - 1].alias
              catListWithoutAddedEntity[j].alias = newInnerAlias
              prevInnerAlias = newInnerAlias
              continue
            }
          }

          if (!prevInnerAlias) {
            if (j > 1) {
              if (catListWithoutAddedEntity[j - 1].joinFieldType === 'NotExistentEntity') {
                prevInnerAlias = catListWithoutAddedEntity[j - 1].alias
              } else {
                prevInnerAlias = innerAliasPrefix + (innerJoinAliasCount - 1)
              }
            } else {
              prevInnerAlias = joinAlias
            }
          }
          prevCat = condBlockItemParams.categories[j - 1].code
          prevJoinField = condBlockItemParams.attributes[j - 1].code
          if (isCatListJ) mapExpression = catListWithoutAddedEntity[j].mapExpression
          innerExclusion = getExclusion(srchParams, condBlockItemParams, cat)
          newInnerAlias = (cat === prevCat) ? 'ID' : innerAliasPrefix + innerJoinAliasCount++
          if (innerExclusion && (innerExclusion.joinInnerClause || innerExclusion.joinInnerWhere)) {
            innerExclusions.push(innerExclusion)
            if (innerExclusion.joinInnerClause) {
              innerExclusion.joinInnerClause = prepareExceptionSql(innerExclusion.joinInnerClause, newInnerAlias)
              whereListItemSql.push(UB.format('{0}\t{1}', ident, innerExclusion.joinInnerClause))
            }
            if (innerExclusion.joinInnerWhere) {
              innerExclusion.joinInnerWhere = prepareExceptionSql(innerExclusion.joinInnerWhere, newInnerAlias)
            }
          } else if (prevJoinFieldIsVirtualEntity) {
            whereListItemSql.push(UB.format('{0}\tINNER JOIN {1} {2} ON {3}.{4} = {5}.ID', ident, cat,
              newInnerAlias, newInnerAlias, (innerExclusion && innerExclusion.joinParentField) || prevJoinField, prevInnerAlias))
          } else {
            let joinAttrSql
            let joinAttrField = condBlockItemParams.attributes[j - 1].associationAttr || 'ID'
            if (mapExpression) {
              joinAttrSql = getMapExprSql(mapExpression, prevInnerAlias)
              joinAttrSql = replaceJoinWhereSql({ sql: joinAttrSql })
            } else {
              joinAttrSql = UB.format('{0}.{1}', prevInnerAlias, prevJoinField)
            }
            whereListItemSql.push(UB.format('{0}\tINNER JOIN {1} {2} ON {3}.{4} = {5}', ident, cat,
              newInnerAlias, newInnerAlias, joinAttrField, joinAttrSql))
          }

          if (!historyCatIsAssigned && hasHistory && historyCat === cat) {
            condBlockItemParams.historyCategory.historyCatAlias = newInnerAlias
            condBlockItemParams.historyCategory.historyJoinField = prevJoinField
            condBlockItemParams.historyCategory.mapExpression = condBlockItemParams.attributes[j - 1].mapExpression
          }
          // Для умови 'exists' catListWithoutAddedEntity[j] не створюється
          if (isCatListJ && !catListWithoutAddedEntity[j].alias) {
            catListWithoutAddedEntity[j].alias = newInnerAlias
          }
          if (historyCat === cat) {
            condBlockItemParams.historyCategory.historyCatAlias = newInnerAlias
          }
        }
      }
      let baseEntityAlias = srchParams.baseEntityAlias
      if (!isExclusion) {
        outerJoinAlias = joinAlias
        outerJoinField = joinField
      } else if (isOuterAddEntityExclusion) {
        outerJoinAlias = outerExclusion.joinBaseAlias
        outerJoinField = outerExclusion.joinParentField
        baseEntityKey = outerExclusion.joinBaseField
      } else if (isOuterChangeKeyExclusion) {
        outerJoinAlias = joinAlias
        outerJoinField = outerExclusion.joinParentField
        baseEntityKey = outerExclusion.joinBaseField
        baseEntityAlias = outerExclusion.joinBaseAlias || baseEntityAlias
      }
      whereListItemSql.push(UB.format('{0}\tWHERE {1}.{2} = {3}.{4} ', ident, outerJoinAlias, outerJoinField,
        baseEntityAlias, baseEntityKey))
      attrs = [condBlockItemParams.attributes[condBlockItemParams.attributes.length - 1].code]
      if (outerJoinWhere) {
        outerJoinWhere = checkConditions(attrs, outerJoinWhere)
        addUniqueLines(whereListItemSql, UB.format('{0}\t\t{1}', ident, outerJoinWhere), joinItemArray)
      }
      for (let k = 0; k < innerExclusions.length; k++) {
        let innerExclusion = innerExclusions[k]
        if (innerExclusion.joinInnerWhere) {
          innerExclusion.joinInnerWhere = checkConditions(attrs, innerExclusion.joinInnerWhere)
          addUniqueLines(whereListItemSql, UB.format('{0}\t\t{1}', ident, innerExclusion.joinInnerWhere), joinItemArray)
        }
      }
    } else {
      /* isExistGroup */
      let firstCatData = catList[0]
      let lastCatData = catList[catCount - 1]
      firstCat = firstCatData.category
      let firstHistCatData
      if (hasHistory) {
        /* Визначення останнього атрибуту, що має історичність */
        for (let j = catList.length - 1; j >= 0; j--) {
          let histCatData = catList[j]
          if (historyCat === histCatData.category) {
            firstHistCatData = histCatData
          }
        }
      }
      joinAlias = lastCatData.alias
      outerJoinAlias = firstCatData.alias
      outerJoinField = firstCatData.joinBaseField
      baseEntityKey = firstCatData.joinParentField
      whereListItemSql.push(UB.format('{0} (SELECT 1 FROM {1} {2}', outConditionSql, firstCat, firstCatData.alias))
      firstCatAlias = firstCatData.alias
      /* Проход по всім категоріям після 1-ої для формування INNER JOIN */
      for (let j = 1; j < catCount; j++) {
        let catObj = catList[j]
        let cat = catObj.category
        let prevJoinFieldIsVirtualEntity = (catObj.joinFieldType === 'NotExistentEntity')
        if (catObj.joinOuterClause) {
          whereListItemSql.push(UB.format('{0}\t{1}', ident, catObj.joinOuterClause))
        } else if (catObj.joinInnerClause) {
          whereListItemSql.push(UB.format('{0}\t{1}', ident, catObj.joinInnerClause))
        } else if (prevJoinFieldIsVirtualEntity) {
          let joinField = (cat === catObj.joinCategory) ? 'ID' : catObj.joinField
          whereListItemSql.push(UB.format('{0}\tINNER JOIN {1} {2} ON {3}.{4} = {5}.{6}', ident, cat,
            catObj.alias, catObj.alias, joinField, catObj.joinAlias, catObj.joinBaseField))
        } else {
          if (catObj.mapExpression) {
            let joinAttrSql = getMapExprSql(catObj.mapExpression, catObj.joinAlias)
            joinAttrSql = replaceJoinWhereSql({ sql: joinAttrSql })
            whereListItemSql.push(UB.format('{0}\tINNER JOIN {1} {2} ON {3}.{4} = {5}', ident, cat,
              catObj.alias, catObj.alias, catObj.joinBaseField, joinAttrSql))
          } else {
            whereListItemSql.push(UB.format('{0}\tINNER JOIN {1} {2} ON {3}.{4} = {5}.{6}', ident, cat,
              catObj.alias, catObj.alias, catObj.joinBaseField, catObj.joinAlias, catObj.joinField))
          }
        }
      }
      whereListItemSql.push(UB.format('{0}\tWHERE {1}.{2} = {3}.{4} ', ident, outerJoinAlias,
        firstCatData.joinField, firstCatData.joinAlias, baseEntityKey))
      if (hasHistory && firstHistCatData) {
        condBlockItemParams.historyCategory.historyCatAlias = firstHistCatData.alias
        condBlockItemParams.historyCategory.mapExpression = firstHistCatData.mapExpression
        historyCatIsAssigned = true
      }
      attrs = []
      for (let x = 0; x < whereList.itemInfo.length; x++) {
        let item = whereList.itemInfo[x]
        for (let y = 0; y < item.catArray.length; y++) {
          attrs.push(item.catArray[y].attribute)
        }
      }
      for (let j = 0; j < catCount; j++) {
        let catObj = catList[j]
        if (j === 0 && catObj.joinOuterWhere) {
          catObj.joinOuterWhere = checkConditions(attrs, catObj.joinOuterWhere)
          addUniqueLines(whereListItemSql, UB.format('{0}\t\t{1}', ident, catObj.joinOuterWhere), joinItemArray)
        }
        if (j > 0 && catObj.joinInnerWhere) {
          catObj.joinInnerWhere = checkConditions(attrs, catObj.joinInnerWhere)
          addUniqueLines(whereListItemSql, UB.format('{0}\t\t{1}', ident, catObj.joinInnerWhere), joinItemArray)
        }
      }
    }
    /* Умова по value */
    let valueConditionSql = []
    if (!hasExists) {
      let valueConditionLen
      let hasSameAttrs = false
      condOrder.forEach(function (idx) {
        let itrCondBlockItemParams = srchParams.condBlockParams[idx]
        let attrSql
        let attrCatAlias
        let itrVal
        let itrCondition
        let startPart = (idx > i) ? UB.format('{0}\t\t\t{1} ', ident,
          srchConditionOperation.getConditionSQL(itrCondBlockItemParams.operation)) : ''
        let itrCatCount = itrCondBlockItemParams.categories.length - 1
        /* Знайти alias останньої категорії */
        if ((itrCatCount <= condBlockItemParams.categories.length - 1)) {
          if (!isExistGroup) {
            attrCatAlias = catListWithoutAddedEntity[itrCatCount - 1].alias || joinAlias
          } else {
            // знайти alias для потрібної категорії з catList
            let itrCat = itrCondBlockItemParams.categories[itrCatCount - 1].code
            let itrJoinAttr = (itrCatCount > 1) ? itrCondBlockItemParams.attributes[itrCatCount - 2].code : null
            let itrJoinAttrIsNotExistentEntity = (itrCatCount > 1 &&
              itrCondBlockItemParams.attributes[itrCatCount - 2].dataType === 'NotExistentEntity')
            let itrJoinCat = (!itrJoinAttrIsNotExistentEntity && itrCatCount > 1)
              ? itrCondBlockItemParams.categories[itrCatCount - 2].code : null
            attrCatAlias = findCatAlias(catList, itrCat, itrJoinAttr, itrJoinCat)
          }
        } else {
          attrCatAlias = joinAlias
        }
        attrSql = getJoinAttrSql(itrCondBlockItemParams, attrCatAlias)
        itrVal = getWhereValue(itrCondBlockItemParams, srchParams)
        itrVal = (itrVal !== null) ? itrVal : ''
        itrCondition = getCondition(itrCondBlockItemParams)
        let itrWhereSql
        if (attrSql.includes(whereValueMarker)) {
          let itrEsists
          if (condBlockItemParams.opposite) {
            itrEsists = 'NOT EXISTS'
            condBlockItemParams.opposite = false
            itrCondition = getCondition(itrCondBlockItemParams)
          } else {
            itrEsists = 'EXISTS'
          }
          attrSql = replaceJoinWhereValue({ sql: attrSql, replaceStr: `${sqlConditions[itrCondition]} ${itrVal}` })
          itrWhereSql = UB.format('{0}{1} {2}', startPart, itrEsists, attrSql)
        } else {
          itrWhereSql = UB.format('{0}{1} {2} {3}', startPart, attrSql, sqlConditions[itrCondition], itrVal)
        }
        valueConditionSql.push({
          attrSql: attrSql,
          whereSql: itrWhereSql
        })
        if (idx > i) {
          hasSameAttrs = true
        }
      })
      valueConditionLen = valueConditionSql.length
      if (valueConditionLen) {
        valueConditionSql[0].whereSql = UB.format('{0}\t\tAND {1}{2}', ident, (hasSameAttrs) ? '(' : '', valueConditionSql[0].whereSql)
        if (hasSameAttrs) valueConditionSql[valueConditionLen - 1].whereSql += ')'
        searchAttrItemSql.push(valueConditionSql[0].attrSql)
        valueConditionSql.forEach(function (item) {
          whereListItemSql.push(item.whereSql)
        })
      }
    }
    /* Фільтрація по обов'язковим умовам globalWhere та globalWhereAttr */
    if (firstCatAlias) {
      let firstCatEntity = global[firstCat]
      if (firstCatEntity) {
        let firstCatEntityAttrs = firstCatEntity.entity.attributes
        for (let j = 0; j < Object.keys(globalWhere).length; j++) {
          let whereAttrName = Object.keys(globalWhere)[j]
          if (firstCatEntityAttrs[whereAttrName]) {
            let whereStr = globalWhere[whereAttrName]
            let expr = UB.format(whereStr, firstCatAlias)
            whereListItemSql.push(UB.format('{0}\t\tAND {1}', ident, expr))
          }
        }
        for (let j = 0; j < Object.keys(globalWhereAttr).length; j++) {
          let whereAttrName = Object.keys(globalWhereAttr)[j]
          if (firstCatEntityAttrs[whereAttrName]) {
            let expr = UB.format(globalWhereAttr[whereAttrName], firstCatAlias)
            whereListItemSql.push(UB.format('{0}\t\tAND {1}', ident, expr))
          }
        }
        for (let j = 0; j < Object.keys(globalWhereAttr4Entity).length; j++) {
          let whereEntityName = Object.keys(globalWhereAttr4Entity)[j]
          if (whereEntityName === firstCat) {
            let whereEntityObj = globalWhereAttr4Entity[whereEntityName]
            for (let k = 0; k < Object.keys(whereEntityObj).length; k++) {
              let whereAttrName = Object.keys(whereEntityObj)[k]
              if (firstCatEntityAttrs[whereAttrName]) {
                let expr = UB.format(whereEntityObj[whereAttrName], firstCatAlias)
                whereListItemSql.push(UB.format('{0}\t\tAND {1}', ident, expr))
              }
            }
          }
        }
      }
    }
    /* Фільтр по історії існує/макс. на дату */
    if (hasHistory) {
      if (condBlockItemParams.historyCategory.historyField &&
        condBlockItemParams.historyCategory.historyCatAlias) {
        let histAlias = condBlockItemParams.historyCategory.historyCatAlias
        let histField = condBlockItemParams.historyCategory.historyField
        let histField2 = condBlockItemParams.historyCategory.historyField2
        let histDateTo = condBlockItemParams.historyCategory.historyDateTo
        let mapExpression = condBlockItemParams.historyCategory.mapExpression
        let onDateExpression = histField2 ? UB.format(`COALESCE({0}.{1}, {2}.{3}, ${dateService.minSqlDate()})`, histAlias, histField,
          histAlias, histField2) : UB.format(`COALESCE({0}.{1}, ${dateService.minSqlDate()})`, histAlias, histField)
        let dateToExpression = histDateTo ? UB.format(`COALESCE({0}.{1}, ${dateService.maxSqlDate()})`, histAlias, histDateTo) : `${dateService.maxSqlDate()}`
        let historyOnMax = condBlockItemParams.historyCondition === 'max'
        let onDate = (condBlockItemParams.onDate) ? ((condBlockItemParams.onDate instanceof Date) ? condBlockItemParams.onDate
          : new Date(condBlockItemParams.onDate)) : null
        if (!historyOnMax) {
          if (onDate) {
            whereListItemSql.push(UB.format(`{0}\t\tAND {1} between {2} and {3}`,
              ident, dateService.formatDate4Sql(onDate), onDateExpression, dateToExpression))
          }
        } else {
          let histMaxAlias = histAlias + 'max'
          let onMaxExpression = histField2 ? UB.format(`COALESCE({0}.{1}, {2}.{3}, ${dateService.minSqlDate()})`, histMaxAlias, histField,
            histMaxAlias, histField2) : UB.format(`COALESCE({0}.{1}, ${dateService.minSqlDate()})`, histMaxAlias, histField)
          let historyJoinFieldByDateField = historyJoinFields[condBlockItemParams.historyCategory.historyField]
          let histCategoryCode = condBlockItemParams.historyCategory.code
          let historyDataObj = srchAttr.getCatDataHistory(histCategoryCode)
          let historyJoinField
          let joinMaxSql
          let joinAttrSql
          let histExclusion = getExclusion(srchParams, condBlockItemParams, condBlockItemParams.historyCategory.code)
          let histWhere = ''
          let whereEntityObj = globalWhereAttr4Entity[histCategoryCode]
          if (whereEntityObj) {
            for (let k = 0; k < Object.keys(whereEntityObj).length; k++) {
              let whereAttrName = Object.keys(whereEntityObj)[k]
              let expr = UB.format(whereEntityObj[whereAttrName], histMaxAlias)
              histWhere += UB.format('\n{0}\t\t\tAND {1}', ident, expr)
            }
          }
          if (histExclusion && histExclusion.histWhere) {
            let histExclWhere = prepareExceptionSql(histExclusion.histWhere, histMaxAlias)
            histExclWhere = checkConditions(attrs, histExclWhere)
            histWhere += UB.format('\r\n{0}\t\t\t{1}', ident, histExclWhere)
          }
          if (historyDataObj) {
            historyJoinField = historyDataObj.joinField
          } else if (historyJoinFieldByDateField) {
            historyJoinField = historyJoinFieldByDateField
          } else {
            historyJoinField = outerJoinField
          }
          if (mapExpression) {
            joinMaxSql = getMapExprSql(mapExpression, histMaxAlias)
            joinAttrSql = getMapExprSql(mapExpression, histAlias)
          } else {
            joinMaxSql = UB.format('{0}.{1}', histMaxAlias, historyJoinField)
            joinAttrSql = UB.format('{0}.{1}', histAlias, historyJoinField)
          }
          if (onDate) {
            whereListItemSql.push(
              UB.format(`{0}\t\tAND {1} = (SELECT MAX({2}) \r\n{0}\t\t\tFROM {3} {4} WHERE {5} = {6} \r\n{0}\t\t\tAND CAST({2} as DATE) <= {7} {8} \r\n{0}\t\t\tAND {4}.mi_deleteDate >= '9999-12-31')`,
                ident, onDateExpression, onMaxExpression, historyCat, histMaxAlias, joinMaxSql, joinAttrSql,
                dateService.formatDate4Sql(onDate), histWhere)
            )
          } else {
            whereListItemSql.push(UB.format(`{0}\t\tAND {1} = (SELECT MAX({2}) \r\n{0}\t\t\tFROM {3} {4} WHERE {5} = {6} \r\n{0}\t\t\tAND {4}.mi_deleteDate >= '9999-12-31' \r\n{0}\t\t\t{7})`,
              ident, onDateExpression, onMaxExpression, historyCat, histMaxAlias, joinMaxSql, joinAttrSql, histWhere))
          }
        }
      }
    }
    // Остання скобка умови where
    whereListItemSql.push(UB.format('{0}\t)', ident))
    whereListSql[attrKey] = whereListItemSql.join('\r\n')
    // пошукові атрибути для блоку select
    if (srchParams.addSearchAttr) {
      let attrSql = [...whereListItemSql]
      let attr0Sql = attrSql[0]
      const existBeginPart = '(SELECT 1 FROM'
      let beginPartIdx = attr0Sql.indexOf(existBeginPart)
      if (beginPartIdx > 0) {
        const existEndPart = ')'
        attrSql[0] = attr0Sql.substring(beginPartIdx + existBeginPart.length)
        let attrLastSql = attrSql[attrSql.length - 1]
        let endPartIdx = attrLastSql.lastIndexOf(existEndPart)
        if (endPartIdx > 0) {
          attrSql[attrSql.length - 1] = attrLastSql.substring(0, endPartIdx)
        } else if (endPartIdx === 0) {
          attrSql[attrSql.length - 1] = ''
        }
        valueConditionSql.forEach(cond => {
          let pointIdx = cond.attrSql.indexOf('.')
          let attrAlias = pointIdx > 0 && cond.attrSql.substr(pointIdx + 1)
          if (!addedAttrs.includes(attrAlias)) {
            searchAttrSql.push(`(SELECT ${sqlDialect.top} ${cond.attrSql} FROM ${attrSql.join('\r\n')} ${sqlDialect.limit}) as "${searchAttrAlias}${i + 1}" `)
            addedAttrs.push(attrAlias)
          }
        })
      }
    }
  }
  // формування where sql для груп, взятих в скобки
  for (let i = 0; i < Object.keys(whereList.whereList).length; i++) {
    let whereKey = Object.keys(whereList.whereList)[i]
    let whereKey4Srch = UB.format('[{0}]', whereKey)
    for (let j = 0; j < Object.keys(whereList.whereGroups).length; j++) {
      let whereGroupKey = Object.keys(whereList.whereGroups)[j]
      let whereGroup = whereList.whereGroups[whereGroupKey]
      if (whereGroup.isGroup && whereGroup.groupSql.indexOf(whereKey4Srch) >= 0) {
        let attrSql = whereListSql[whereKey] || '1 = 1'
        whereGroup.groupSql = whereGroup.groupSql.replace(whereKey4Srch, attrSql)
      }
    }
  }
  // формування блоку where з груп whereGroup чи умов без групування whereListSql
  for (let i = 0; i < Object.keys(whereList.whereGroups).length; i++) {
    let whereGroupKey = Object.keys(whereList.whereGroups)[i]
    let whereGroup = whereList.whereGroups[whereGroupKey]
    let operation
    let itemSql
    let startSql = ''
    let finishSql = ''
    if (whereGroup.isGroup) {
      itemSql = whereGroup.groupSql
    } else {
      itemSql = whereListSql[whereGroupKey]
    }
    operation = srchParams.condBlockParams[whereGroup.groupIndex].operation
    if (whereGroup.startSql) startSql = whereGroup.startSql
    if (whereGroup.finishSql) finishSql = whereGroup.finishSql
    if (itemSql) {
      /* Для режима без групування itemSql вказується лише для 1-ої умови об'єднання */
      whereClause.push(UB.format('{0} {1}{2}{3}', srchConditionOperation.getConditionSQL(operation), startSql, itemSql, finishSql))
    } else {
      if (startSql) whereClause.push(startSql)
      if (finishSql) whereClause.push(finishSql)
    }
  }
  whereClause.push(')')
  return {
    searchAttrs: searchAttrSql.length > 0 ? ', ' + searchAttrSql.join(',\r\n') : '',
    whereClause: whereClause.join(' \r\n')
  }
}

function isCatInList (srchParams, catName) {
  for (let i = 0; i < srchParams.condBlockParams.length; i++) {
    let condBlockItemParams = srchParams.condBlockParams[i]
    for (let j = 0; j < condBlockItemParams.categories.length; j++) {
      if (condBlockItemParams.categories[j].code === catName) {
        return true
      }
    }
  }
  return false
}

function getOrgIDs (srchParams) {
  let res
  let searchOrgMode = (srchParams && srchParams.searchOrgMode) || 'CURRENT'
  if (srchParams && srchParams.orgID /* && !isCatInList(srchParams, 'hr_organization') (UBHR-14024) */) {
    let onDate = srchParams.onDate || dateService.currentDate()
    if (searchOrgMode === 'CURRENT') {
      res = srchParams.orgID
    } else if (searchOrgMode === 'WITH_CHILDS') {
      const orgs = UB.Repository('hr_organization')
        .attrs(['mi_data_id'])
        .where('mi_treePath', 'like', `/${srchParams.orgID}/%`)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: onDate })
        .selectAsObject()
      res = orgs.map(itm => itm.mi_data_id)
    }
  }
  return res
}

function replaceParams ({ sql, onDate }) {
  if (onDate) {
    sql = sql.replace(/:onDate:/g, onDate)
  }
  return sql
}

function replaceJoinWhereValue ({ sql, replaceStr }) {
  if (sql) {
    let re = new RegExp(whereValueMarker, 'g')
    sql = sql.replace(re, replaceStr)
    sql = sql.replace(/\/\*#/g, '')
    sql = sql.replace(/#\*\//g, '')
  }
  return sql
}

function replaceJoinWhereSql ({ sql }) {
  if (sql) {
    let whereValMarkerIdx = sql.indexOf(whereValueMarker)
    if (whereValMarkerIdx > 0) {
      let replaceStr = 'mi_data_id'
      let dotIdx = sql.lastIndexOf('.', whereValMarkerIdx)
      if (dotIdx > 0) {
        let spaceIdx = sql.lastIndexOf(' ', dotIdx)
        if (spaceIdx > 0) {
          replaceStr = sql.substring(spaceIdx + 1, whereValMarkerIdx - 1)
        }
        sql = sql.substring(whereValMarkerIdx - 1)
      }
      sql = replaceJoinWhereValue({ sql, replaceStr })
    }
  }
  return sql
}
