const UB = require('@unitybase/ub')
const _ = require('lodash')

module.exports = {
  getPositionNameCases,
  getPositionFullName,
  removeDuplicateWords,
  capitalize,
  getNameCase,
  loadRules
}

function ignoreDoublePosNameCases (orgID) {
  const setting = UB.Repository('ac_settingsOrg')
    .attrs(['value'])
    .where('organizationID', '=', orgID)
    .where('[constantID.code]', '=', 'hrIgnoreDoublePosNameCases')
    .limit(1)
    .selectSingle()
  return setting && setting.value === '1'
}

const cases = ['Nom', 'Gen', 'Dat', 'Acc', 'Or', 'Loc', 'Voc', 'Eng', 'NomF', 'GenF', 'DatF', 'AccF', 'OrF', 'LocF', 'VocF', 'EngF']

function getPositionNameCases (dictPositionID, onDate, orgID, parentUnitID, staffOrderID, nameAddition = '') {
  const result = {
    errors: []
  }

  const ignoreDoublePosName = ignoreDoublePosNameCases(orgID)

  cases.forEach(caseName => {
    result['name' + caseName] = ''
    result['fullName' + caseName] = ''
  })

  const dictPosition = UB.Repository('hr_dictPosition')
    .attrs(['name', 'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'nameEng', 'nameNomF', 'nameGenF', 'nameDatF', 'nameAccF', 'nameOrF', 'nameLocF', 'nameVocF', 'nameEngF'])
    .where('ID', '=', dictPositionID)
    .selectSingle() || { name: '',
    nameNom: '',
    nameGen: '',
    nameDat: '',
    nameAcc: '',
    nameOr: '',
    nameLoc: '',
    nameVoc: '',
    nameEng: '',
    nameNomF: '',
    nameGenF: '',
    nameDatF: '',
    nameAccF: '',
    nameOrF: '',
    nameLocF: '',
    nameVocF: '',
    nameEngF: '' }

  const parentUnit = UB.Repository('hr_staffUnit')
    .attrs(['mi_treePath'])
    .where('mi_data_id', '=', parentUnitID || null)
    .where('state', '=', 'ACTIVE', 'active')
    .where('staffOrderID', '=', staffOrderID, 'order')
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('staffOrderID', '=', staffOrderID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notExist')
    .orderBy('mi_treePath', 'desc')
    .logic('(([active] AND [notExist] AND [dateFrom] AND [dateTo]) OR ([order]))')
    .limit(1)
    .selectSingle()

  const departments = UB.Repository('hr_department')
    .attrs(['mi_data_id', 'name', 'nameGen', 'nameEng', 'fullNameGen', 'excludeNameInPos', 'mi_createDate'])
    .where('mi_data_id', 'in', parentUnit ? _.compact(String(parentUnit.mi_treePath).split('/').map(o => Number(o))) : [-1])
    .where('state', '=', 'ACTIVE', 'active')
    .where('liquidate', '=', 0, 'liqu')
    .where('staffOrderID', '=', staffOrderID, 'order')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('staffOrderID', '=', staffOrderID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notExist')
    .orderBy('mi_treePath', 'desc')
    .logic('(([active] and [notExist]) or ([order]))')
    .misc({
      __mip_ondate: onDate
    })
    .selectAsObject()

  if (nameAddition) {
    nameAddition = ' ' + nameAddition
  } else {
    nameAddition = ''
  }

  if (!departments.length) {
    result.errors.push(UB.i18n(`У данної посади відсутнє підпорядкування. При генерації відмінків використано тільки відмінки посади`))
    let professionNameError = false
    cases.forEach(_case => {
      const getNameCase = () => {
        if (dictPosition['name' + _case]) {
          return dictPosition['name' + _case] + nameAddition
        } else {
          professionNameError = true
          return dictPosition['name'] + nameAddition
        }
      }
      result['fullName' + _case] = removeDuplicateWords(getNameCase())
      result['name' + _case] = removeDuplicateWords(getNameCase())
    })
    if (professionNameError) result.errors.push(UB.i18n('В довіднику посад відсутні деякі відмінки. При генерації відмінків була вікористана назва професії.'))
  } else {
    if (!ignoreDoublePosName && checkDoublePositionName(dictPosition.name)) {
      setDoublePositionCases(result, { profession: dictPosition, jurisdictions: departments, nameAddition })
    } else {
      setSimplePositionCases(result, { profession: dictPosition, jurisdictions: departments, nameAddition })
    }
  }
  cases.forEach(caseName => {
    result['name' + caseName] = String(result['name' + caseName] || '').replace(/\s+/g, ' ').trim()
    result['fullName' + caseName] = String(result['fullName' + caseName] || '').replace(/\s+/g, ' ').trim()
  })
  return result
}

function getPositionFullName (dictPositionID, onDate, orgID, parentUnitID, staffOrderID, nameAddition = '') {
  const dictPosition = UB.Repository('hr_dictPosition')
    .attrs(['name', 'nameNom'])
    .selectById(dictPositionID) || { name: '', nameNum: '' }

  const ignoreDoublePosName = ignoreDoublePosNameCases(orgID)

  if (nameAddition) {
    nameAddition = ' ' + nameAddition
  } else {
    nameAddition = ''
  }
  const name = (dictPosition.nameNom || dictPosition.name) + nameAddition
  let fullName = name

  const parentUnit = UB.Repository('hr_staffUnit')
    .attrs(['mi_treePath'])
    .where('mi_data_id', '=', parentUnitID || null)
    .where('state', '=', 'ACTIVE', 'active')
    .where('staffOrderID', '=', staffOrderID, 'order')
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('staffOrderID', '=', staffOrderID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notExist')
    .orderBy('mi_treePath', 'desc')
    .logic('(([active] AND [notExist] AND [dateFrom] AND [dateTo]) OR ([order]))')
    .limit(1)
    .selectSingle()

  const departments = UB.Repository('hr_department')
    .attrs(['mi_data_id', 'name', 'nameGen', 'fullNameGen', 'excludeNameInPos', 'mi_createDate'])
    .where('mi_data_id', 'in', parentUnit ? _.compact(String(parentUnit.mi_treePath).split('/').map(o => Number(o))) : [-1])
    .where('state', '=', 'ACTIVE', 'active')
    .where('staffOrderID', '=', staffOrderID, 'order')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('staffOrderID', '=', staffOrderID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notExist')
    .orderBy('mi_treePath', 'desc')
    .logic('(([active] and [notExist]) or ([order]))')
    .misc({
      __mip_ondate: onDate
    })
    .selectAsObject()

  if (!ignoreDoublePosName && checkDoublePositionName(name)) {
    let leftName = name.substr(0, name.indexOf(' - ')).trim() || ''
    let rightName = name.substr(name.indexOf(' - ') + 3) || ''
    const depFirst = departments.length ? departments[0] : null
    const depHigh = departments.length > 1 ? departments[1] : null
    leftName += ' ' + (depHigh && !depHigh.excludeNameInPos ? (depHigh.nameGen ? depHigh.nameGen : depHigh.name || '') : '')
    rightName += ' ' + (depFirst && !depFirst.excludeNameInPos ? (depFirst.nameGen ? depFirst.nameGen : depFirst.name || '') : '')
    leftName = removeDuplicateWords(leftName)
    rightName = removeDuplicateWords(rightName)
    fullName = leftName + ' - ' + rightName
  } else {
    const dep = departments.length ? departments[0] : null
    fullName = removeDuplicateWords(name + ' ' + (dep && !dep.excludeNameInPos ? (dep.nameGen ? dep.nameGen : dep.name || '') : ''))
  }
  fullName = fullName.replace(/\s+/g, ' ').trim()
  return capitalize(fullName)
}

function checkDoublePositionName (name) {
  return typeof name === 'string' && name.split(' - ').length > 1
}

function removeDuplicateWords (str) {
  const data = (str || '').replace('  ', ' ').split(' ').filter(o => o)
  const result = []

  for (let i = 0; i < data.length; i++) {
    if (
      typeof data[i + 1] === 'string' &&
      data[i].toLowerCase() !== data[i + 1].toLowerCase() &&
      (data[i] + data[i + 1]).toString().toLowerCase() !== (data[i + 2] + data[i + 3]).toString().toLowerCase() &&
      (data[i - 1] + data[i]).toString().toLowerCase() !== (data[i + 1] + data[i + 2]).toString().toLowerCase()
    ) {
      result.push(data[i].trim())
    } else {
      if (i === data.length - 1) result.push(data[i].trim())
    }
  }
  return result.join(' ').replace('  ', ' ').replace(/\s+/g, ' ').trim()
}

function setDoublePositionCases (result, { profession, jurisdictions, nameAddition }) {
  if (jurisdictions.length === 1) {
    result.errors.push(UB.i18n(`Неможливо згенерувати відмінки для задвоєної посади першого рівня підпорядкування`))
  }
  const jurisdictionItemOfChain = (item) => {
    if (!jurisdictions[item] || jurisdictions[item].excludeNameInPos) return ''
    if (jurisdictions[item].nameGen) {
      return jurisdictions[item].nameGen
    } else {
      result.errors.push(UB.i18n(`Відсутній родовий відмінок для підрозділу "{0}". При генерації відмінку посади використана назва підрозділу "{1}"`, jurisdictions[item].name, jurisdictions[item].name))
      return jurisdictions[item]['name']
    }
  }
  let professionNameError = false
  cases.forEach(_case => {
    const getNameCase = () => {
      if (profession['name' + _case]) {
        return profession['name' + _case] + nameAddition
      } else {
        professionNameError = true
        return profession['name'] + nameAddition
      }
    }
    const splitedName = getNameCase().split(' - ')
    if (splitedName.length === 1) splitedName[1] = ''
    const jurisdictionRest = jurisdictions.map((jurisdiction, index) => {
      if (index > 1) return jurisdictionItemOfChain(index)
    }).join(' ')
    const combinedName = `${splitedName[0]} ${jurisdictionItemOfChain(1)} - ${splitedName[1]} ${jurisdictionItemOfChain(0)}`
    const combinedFullName = `${splitedName[0]} ${jurisdictionItemOfChain(1)} ${jurisdictionRest} - ${splitedName[1]} ${jurisdictionItemOfChain(0)}`
    result['name' + _case] = removeDuplicateWords(combinedName)
    result['fullName' + _case] = removeDuplicateWords(combinedFullName)
  })
  if (professionNameError) result.errors.push(UB.i18n('В довіднику посад відстуні деякі відмінки. При генерації відмінків була використана назва професії.'))
}

function setSimplePositionCases (result, { profession, jurisdictions, nameAddition }) {
  const jurisdictionFullChain = jurisdictions.map(jurisdiction => {
    if (!jurisdiction || jurisdiction.excludeNameInPos) return ''
    if (jurisdiction.nameGen) {
      return jurisdiction.nameGen
    } else {
      result.errors.push(UB.i18n(`Відсутній родовий відмінок для підрозділу "{0}". При генерації відмінку посади використана назва підрозділу "{1}"`, jurisdiction.name, jurisdiction.name))
      return jurisdiction.name
    }
  }).join(' ')

  const jurisdictionLastItemOfChain = () => {
    if (jurisdictions.length > 0 && jurisdictions[0].nameGen) {
      return jurisdictions[0].excludeNameInPos ? '' : jurisdictions[0].nameGen
    } else {
      result.errors.push(UB.i18n(`Відсутній родовий відмінок для підрозділу "${jurisdictions.length > 0 ? jurisdictions[0].name : ''}". При генерації відмінку посади використана назва підрозділу "${jurisdictions.length > 0 ? jurisdictions[0].name : ''}"`))
      return jurisdictions.length > 0 ? (jurisdictions[0].excludeNameInPos ? '' : jurisdictions[0].name) : ''
    }
  }
  let professionNameError = false
  cases.forEach(_case => {
    const getNameCase = () => {
      if (profession['name' + _case]) {
        return profession['name' + _case] + nameAddition
      } else {
        professionNameError = true

        return profession['name'] + nameAddition
      }
    }

    const combinedFullName = (_case !== 'Eng') || (_case !== 'EngF') ? `${getNameCase()} ${jurisdictionFullChain}` : `${getNameCase()}`
    const combinedName = (_case !== 'Eng') || (_case !== 'EngF') ? `${getNameCase()} ${jurisdictionLastItemOfChain()}` : `${getNameCase()}`
    result['fullName' + _case] = removeDuplicateWords(combinedFullName)
    result['name' + _case] = removeDuplicateWords(combinedName)
  })
  if (professionNameError) result.errors.push(UB.i18n('В довіднику посад відстуні деякі відмінки. При генерації відмінків була використана назва професії.'))
}

function capitalize (str) {
  return typeof str === 'string' ? str.charAt(0).toUpperCase() + str.substr(1) : str
}

function getNameCase (surName, name, lastName, gender, rules) {
  let nc = {}
  nc.MALE = 'male'
  nc.FEMALE = 'female'
  nc.ANY = 'any'

  // Case constants
  nc.NOMINATIVE = 'nom' // име. Иванов Иван Иванович         називний
  nc.GENITIVE = 'gen' // род. Иванова Ивана Ивановича      родовий
  nc.DATIVE = 'dat' // дат. Иванову Ивану Ивановичу      давальний
  nc.ACCUSATIVE = 'acc' // вин. Иванова Ивана Ивановича      знахідний
  nc.INSTRUMENTAL = 'ins' // тво. Ивановым Иваном Ивановичем   орудний
  nc.LOCATIVE = 'loc' // пре. Иванове Иване Ивановиче      прийменниковий (чи місцевий ?)
  nc.VOCATIVE = 'voc'
  nc.CASES = [ nc.NOMINATIVE, nc.GENITIVE, nc.DATIVE, nc.ACCUSATIVE, nc.INSTRUMENTAL, nc.LOCATIVE, nc.VOCATIVE ]
  if (!rules) {
    rules = loadRules()
  }
  nc.rules = rules
  nc.getGender = function (surName, name, lastName) {
    let
      result
    if (lastName) {
      result = /НА$/i.test(lastName) ? nc.FEMALE : /Ч$/i.test(lastName) ? nc.MALE : null
    }
    if (surName && !result) {
      result = ((/СЬКА$/i.test(surName) || /ЦЬКА$/i.test(surName)) ? nc.FEMALE : (/В$/i.test(surName) || /ИЙ$/i.test(surName)) ? nc.MALE : null)
    }
    if (name && !result) {
      result = (/НА$/i.test(name) || /ЛЬ$/i.test(name)) ? nc.FEMALE : /Н$/i.test(name) ? nc.MALE : null
    }
    return result || nc.ANY
  }
  nc.getCaseName = function (self, what, nCase) {
    let result = ''
    let origin
    let lastLen = 0
    let nCaseIdx = nc.CASES.indexOf(nCase.toLowerCase().substring(0, 3))
    let endsWith = function (str, end) {
      return new RegExp(end + '$', 'i').test(str)
    }
    origin = result = self[what]
    if (!result || nCase === nc.NOMINATIVE || !nCase) {
      return result || ''
    }
    if (nCaseIdx === -1) {
      let errMessage = 'NameCase.getCaseName() => unknown case ' + nCase + '. Must be one of ' + nc.CASES.map(
        function (item) {
          return '"' + item + '"'
        }
      ).join(', ')
      console.error(errMessage)
      return result
    }

    let rule = nc.rules[what]
    if (!rule) {
      return ''
    }
    let suff = _.filter(rule.suffixes,
      function (value, key) {
        return (value.gender === nc.ANY || value.gender === self.gender) && value.tail.some(
          function (item) {
            return endsWith(origin, item.trim())
          })
      })
    if (_.isEmpty(suff)) {
      return result
    }
    for (let iSufi = 0, sufCount = suff.length; iSufi < sufCount; ++iSufi) {
      let
        tail = suff[iSufi].tail
      for (let iTail = 0, tailCount = tail.length; iTail < tailCount; ++iTail) {
        if (endsWith(origin, tail[iTail])) {
          if (lastLen >= tail[iTail].length) {
            continue
          }
          result = origin
          lastLen = tail[iTail].length
          let mod = suff[iSufi].mods[nCaseIdx - 1]
          let delCount = mod.lastIndexOf('-') + 1
          if (delCount) {
            result = result.substring(0, result.length - delCount)
            mod = mod.substring(delCount, 100)
          }
          result += (mod === '.' ? '' : mod)
        }
      }
    }
    return /[А-ЯЇІЄ]+$/.test(origin) ? result.toUpperCase() : result // якщо останній символ у верхньому регістрі, то все слово у верхньому
  }

  nc.surname = surName
  nc.name = name
  nc.lastname = lastName
  nc.gender = gender || nc.getGender(surName, name, lastName)
  nc.getSurName = function (nCase) {
    return nc.getCaseName(this, 'surname', nCase)
  }
  nc.getName = function (nCase) {
    return nc.getCaseName(this, 'name', nCase)
  }

  nc.getLastName = function (nCase) {
    return nc.getCaseName(this, 'lastname', nCase)
  }
  return nc
}

function loadRules () {
  let cases = ['acc', 'dat', 'gen', 'ins', 'loc', 'voc']
  let attrs = ['namePart', 'sexType', 'suff'].concat(cases)
  let result = {}

  const data = UB.Repository('hr_namecase').attrs(attrs).orderByDesc('namePart').orderByDesc('sexType').selectAsObject()
  data.forEach(item => {
    result[item.namePart] = result[item.namePart] || { suffixes: [] }
    let suffix = {
      gender: item.sexType === 'M' ? 'male' : item.sexType === 'W' ? 'female' : 'any',
      tail: item.suff.trim().split(',').map(i => i.trim()),
      mods: [(item.gen || '').trim(), (item.dat || '').trim(), (item.acc || '').trim(), (item.ins || '').trim(), (item.loc || '').trim(), (item.voc || '').trim()]
    }
    result[item.namePart].suffixes.push(suffix)
  })
  return result
}
