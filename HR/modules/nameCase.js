const UB = require('@unitybase/ub')
const _ = require('lodash')

module.exports = {
  getNameCase,
  getFullNameCase,
  cap,
  uncap,
  wordToCase,
  expressionToCase,
  getEmpFullNameFromParts,
  getEmpShortNameFromParts
}

const defaultRules = {
  'surname': {
    'suffixes': [{
      'gender': 'female',
      'tail': ['б', 'в', 'г', 'д', 'ж', 'з', 'к', 'л', 'м', 'н', 'п', 'р', 'с', 'т', 'й', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ъ', 'ь', 'ко'],
      'mods': ['.', '.', '.', '.', '.']
    }, {
      'gender': 'male',
      'tail': ['б', 'в', 'г', 'д', 'ж', 'з', 'к', 'л', 'м', 'н', 'п', 'р', 'с', 'т', 'ф', 'х', 'ц', 'ш', 'щ'],
      'mods': ['а', 'у', 'а', 'ом', 'е']
    }, {
      'gender': 'male',
      'tail': ['о'],
      'mods': ['-а', '-у', '-а', 'м', '-а']
    }, {
      'gender': 'male',
      'tail': ['ий'],
      'mods': ['--ого', '--ому', '--ого', '--им', '-ому']
    }, {
      'gender': 'female',
      'tail': ['ська', 'цька'],
      'mods': ['-у', '-ій', '-у', '-ою', '-ій']
    }, {
      'gender': 'any',
      'tail': ['на'],
      'mods': ['-у', '-і', '-у', '-ою', '-і']
    }, {
      'gender': 'any',
      'tail': ['ова', 'ева'],
      'mods': ['-у', '-ій', '-у', '-ою', '-ій']
    }, {
      'gender': 'any',
      'tail': ['ка', 'ча', 'ща', 'жа'],
      'mods': ['-у', '-і', '-у', '-ою', '-і']
    }, {
      'gender': 'any',
      'tail': ['ца'],
      'mods': ['-ю', '-і', '-ю', '-ею', '-і']
    }, {
      'gender': 'any',
      'tail': ['а'],
      'mods': ['-у', '-і', '-у', '-ою', '-і']
    }, {
      'gender': 'male',
      'tail': ['ой'],
      'mods': ['-го', '-му', '-го', '--им', '-ї']
    }, {
      'gender': 'any',
      'tail': ['ха'],
      'mods': ['-у', '--сі', '-у', '-ою', '-і']
    }, {
      'gender': 'any',
      'tail': ['га'],
      'mods': ['-у', '--зі', '-у', '-ою', '-і']
    }, {
      'gender': 'male',
      'tail': ['ш', 'щ', 'ч'],
      'mods': ['а', 'у', 'а', 'ем', 'і']
    }, {
      'gender': 'male',
      'tail': ['ь', 'й'],
      'mods': ['-я', '-ю', '-я', '-єм', '-і']
    }, {
      'gender': 'male',
      'tail': ['я'],
      'mods': ['-і', '-і', '-ю', '-єю', '-і']
    }, {
      'gender': 'male',
      'tail': ['ов'],
      'mods': ['а', 'у', 'а', 'им', 'е']
    }, {
      'gender': 'male',
      'tail': ['нець', 'вець', 'рець'],
      'mods': ['---ця', '---цю', '---ця', '---цем', '---ці']
    }, {
      'gender': 'male',
      'tail': ['лець'],
      'mods': ['---ьця', '---ьцю', '---ьця', '---ьцем', '---ьці']
    }, {
      'gender': 'male',
      'tail': ['ин', 'ін'],
      'mods': ['а', 'у', 'а', 'им', 'е']
    }, {
      'gender': 'male',
      'tail': ['ин', 'ін', 'ев', 'ов'],
      'mods': ['а', 'у', 'а', 'им', 'е']
    }, {
      'gender': 'female',
      'tail': ['я'],
      'mods': ['-і', '-і', '-ю', '-ею', '-ій']
    }, {
      'gender': 'female',
      'tail': ['чина'],
      'mods': ['-у', '-ій', '-у', '-ою', '.']
    }, {
      'gender': 'male',
      'tail': ['ок'],
      'mods': ['--ка', '--ку', '--ка', '--ком', '.']
    }, {
      'gender': 'male',
      'tail': ['єв'],
      'mods': ['а', 'у', 'а', 'им', '.']
    }, {
      'gender': 'male',
      'tail': ['ун'],
      'mods': ['а', 'у', 'а', 'ом', '.']
    }]
  },
  'name': {
    'suffixes': [{
      'gender': 'male',
      'tail': ['о'],
      'mods': ['-а', '-у', '-а', 'м', '-у']
    }, {
      'gender': 'any',
      'tail': ['е', 'и', 'у', 'ы', 'э', 'ю'],
      'mods': ['.', '.', '.', '.', '.']
    }, {
      'gender': 'female',
      'tail': ['б', 'в', 'г', 'д', 'ж', 'з', 'й', 'к', 'л', 'м', 'н', 'п', 'р', 'с', 'т', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ъ'],
      'mods': ['.', '.', '.', '.', '.']
    }, {
      'gender': 'female',
      'tail': ['ь'],
      'mods': ['.', '-і', '.', '.', '.']
    }, {
      'gender': 'female',
      'tail': ['га'],
      'mods': ['-и', '--зі', '-у', '-ою', '--зі']
    }, {
      'gender': 'male',
      'tail': ['ь'],
      'mods': ['-я', '-ю', '-я', '-ем', '-і']
    }, {
      'gender': 'any',
      'tail': ['ша'],
      'mods': ['-і', '-і', '-у', '-ею', '-і']
    }, {
      'gender': 'male',
      'tail': ['н', 'р', 'в', 'г', 'с', 'л', 'м', 'д'],
      'mods': ['а', 'у', 'а', 'ом', 'ї']
    }, {
      'gender': 'female',
      'tail': ['я'],
      'mods': ['-ї', '-ї', '-ю', '-єю', '-ї']
    }, {
      'gender': 'female',
      'tail': ['ка'],
      'mods': ['-у', '--ці', '--ці', '-ою', '--ці']
    }, {
      'gender': 'male',
      'tail': ['ець'],
      'mods': ['---ця', '---цю', '---ця', '---цем', '---цеві']
    }, {
      'gender': 'male',
      'tail': ['п'],
      'mods': ['а', 'у', 'а', 'ом', 'а']
    }, {
      'gender': 'male',
      'tail': ['й'],
      'mods': ['-я', '-ю', '-я', '-єм', '.']
    }, {
      'gender': 'male',
      'tail': ['я'],
      'mods': ['-ю', '-і', '-ю', '-єю', '.']
    }, {
      'gender': 'male',
      'tail': ["'я"],
      'mods': ['-ю', '-ї', '-ю', '-єю', '.']
    }, {
      'gender': 'male',
      'tail': ['ор'],
      'mods': ['я', 'ю', 'я', 'ем', '.']
    }, {
      'gender': 'female',
      'tail': ['на'],
      'mods': ['-у', '-і', '-у', '-ою', '.']
    }, {
      'gender': 'female',
      'tail': ['а'],
      'mods': ['-у', '-і', '-у', '-ою', '.']
    }, {
      'gender': 'male',
      'tail': ['лав'],
      'mods': ['а', 'у', 'а', 'ом', '.']
    }]
  },
  'lastname': {
    'suffixes': [{
      'gender': 'any',
      'tail': ['ич', 'іч'],
      'mods': ['а', 'у', 'а', 'ем', 'і']
    }, {
      'gender': 'any',
      'tail': ['на'],
      'mods': ['-у', '-ій', '-у', '-ою', '-і']
    }, {
      'gender': 'female',
      'tail': ['а'],
      'mods': ['-у', '-і', '-і', '-ою', '-ій']
    }]
  }
}

function cap (str) {
  return typeof str === 'string' && str.length > 0 ? str.charAt(0).toUpperCase() + str.slice(1) : str
}

function uncap (str) {
  return typeof str === 'string' && str.length > 0 ? str.charAt(0).toLowerCase() + str.slice(1) : str
}

/*
  gender: 'male', 'female', 'any' (optional)
  return { surName, name, lastName, getSurName, getName, getLastName }
*/
function getNameCase (surName, name, lastName, gender) {
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
  nc.PREPOSITIONAL = 'prp' // пре. Иванове Иване Ивановиче      прийменниковий (чи місцевий ?)
  nc.CASES = [ nc.GENITIVE, nc.DATIVE, nc.ACCUSATIVE, nc.INSTRUMENTAL, nc.PREPOSITIONAL ]

  nc.getGender = function (surName, name, lastName) {
    let result
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

    nc.rules = defaultRules

    origin = result = self[what]
    if (!result || nCase === nc.NOMINATIVE || !nCase) {
      return result || ''
    }
    if (nCaseIdx === -1) {
      let
        errMessage = 'NameCase.getCaseName() => unknown case ' + nCase + '. Must be one of ' + nc.CASES.map(
          function (item) {
            return '"' + item + '"'
          }
        ).join(', ')
      throw new UB.UBAbort(errMessage)
    }

    let
      rule = nc.rules[what]
    if (!rule) {
      return ''
    }
    let
      suff = _.filter(rule.suffixes,
        function (value, key) {
          return (value.gender === nc.ANY || value.gender === self.gender) && value.tail.some(
            function (item) {
              return endsWith(origin, item)
            })
        })
    if (_.isEmpty(suff)) {
      return result
    }
    for (let iSufi = 0, sufCount = suff.length; iSufi < sufCount; ++iSufi) {
      let tail = suff[iSufi].tail
      for (let iTail = 0, tailCount = tail.length; iTail < tailCount; ++iTail) {
        if (endsWith(origin, tail[iTail])) {
          if (lastLen >= tail[iTail].length) {
            continue
          }
          result = origin
          lastLen = tail[iTail].length
          let mod = suff[iSufi].mods[nCaseIdx]
          let delCount = mod.lastIndexOf('-') + 1
          if (delCount) {
            result = result.substring(0, result.length - delCount)
            mod = mod.substring(delCount, 100)
          }
          result += (mod === '.' ? '' : mod)
        }
      }
    }
    return result
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

/*
  gender: 'male', 'female', 'any' (optional)
  caseCode: 'gen', 'dat', 'acc', 'ins', 'prp'
  return fullName
*/
function getFullNameCase (surName, name, lastName, gender, caseCode) {
  if (!caseCode) {
    caseCode = 'nom'
  }
  let nc = getNameCase(surName, name, lastName, gender, caseCode)
  return nc.getLastName(caseCode).toUpperCase() + ' ' + cap(nc.getName(caseCode)) + ' ' + cap(nc.getSurName(caseCode))
}

/*
  caseCode: 'gen', 'dat', 'acc', 'ins', 'prp'
*/
function wordToCase (str, caseCode) {
  if (str.length <= 2) {
    return str
  }

  let strPub = { // правила для закінчень
    'их': ['их', 'их', 'их', 'их', 'их'],
    'ння': ['ння', 'ння', 'ння', 'ння', 'ння'],
    'ий': ['ого', 'ому', 'ого', 'им', 'ому'],
    '(к/нн/чн)а': ['%ої', '%ій', '%у', '%ою', '%ій'],
    'а': ['и', 'і', 'у', 'ою', 'і'],
    'я': ['і', 'і', 'ю', 'єю', 'ю'],
    'о': ['о', 'о', 'о', 'о', 'о'],
    'лі': ['лі', 'лі', 'лі', 'лі', 'лі'],
    'і': ['их', 'им', 'і', 'ими', 'их'],
    'б/в/м/г/д/л/ж/з/к/н/п/т/ф/ч/ц/щ/р/х': ['а', 'ові', 'а', 'ом', 'у'],
    '(д/ж/з/л/м/н/р/с/т/ч)ь': ['%і', '%і', '%ь', '%%ю', '%і'],
    'ь': ['і', 'і', 'ь', 'єм', 'і'],
    'ки': ['ки', 'ки', 'ки', 'ки', 'ки'],
    'и': ['ів', 'ам', 'и', 'ами', 'ах'],
    'с/ш': ['%а', '%у', '%а', '%ом', '%ові']
  }
  let cases = { // caseCode
    'gen': 0, // родовий
    'dat': 1, // давальний
    'acc': 2, // знахідний
    'ins': 3, // орудний
    'prp': 4 // місцевий
  }
  let exs = { // виключення, скільки символів забирати з кінця
    'ц': 2,
    'ок': 2
  }
  let lastIndex
  let reformedStr
  let splitted
  let groupped
  let forPseudo
  let lastChar
  let lastExpr
  let toBreak = false

  for (let i in strPub) {
    if (toBreak) { break }
    lastChar = str.slice(-1)
    lastExpr = (i.length === 1) ? lastChar : str.slice(-i.length)
    if (lastExpr === i) {
      reformedStr = str.slice(0, -i.length)
      lastIndex = i
      break
    } else if (/[()]+/g.test(i)) {
      // є групи в скобках
      i.replace(/\(([^()]+)\)([^()]+)?/g, function (a, b, c) {
        splitted = b.split('/')
        for (let o = 0; o < splitted.length; o++) {
          groupped = splitted[o] + c
          strPub[groupped] = strPub[i]
          lastExpr = (groupped.length === 1) ? lastChar : str.slice(-groupped.length)
          if (lastExpr === groupped) {
            for (let x = 0, eachSplited = strPub[groupped]; x < eachSplited.length; x++) {
              eachSplited[x] = eachSplited[x].replace('%', splitted[o])
            }
            reformedStr = str.slice(0, -groupped.length)
            forPseudo = a
            lastIndex = splitted[o]
            toBreak = true
            break
          }
        }
      })
    } else if (/\//.test(i)) {
      // є групування, розділене слешем
      splitted = i.split('/')
      for (let o = 0; o < splitted.length; o++) {
        lastExpr = (splitted[o].length === 1) ? lastChar : str.slice(-splitted[o].length)
        if (lastExpr === splitted[o]) {
          reformedStr = str
          forPseudo = i
          lastIndex = splitted[o]
          toBreak = true
          break
        }
      }
    }
  }
  // виключення
  for (let o in exs) {
    if (str.slice(-o.length) === o) {
      reformedStr = str.slice(0, -exs[o])
    }
  }
  return reformedStr ? reformedStr + strPub[(forPseudo || lastIndex)][cases[caseCode]].replace('%', lastIndex) : str
}

function expressionToCase (str, caseCode) {
  if (!str || !str.length) {
    return str
  }

  if (!caseCode) {
    caseCode = 'nom'
  }
  let words = str.split(' ')
  for (let i = 0; i < words.length; i++) {
    words[i] = wordToCase(words[i], caseCode)
  }
  return words.join(' ')
}

function getEmpFullNameFromParts (firstName, middleName, lastName) {
  return (lastName || '') + (firstName ? ' ' + firstName : '') + (middleName ? ' ' + middleName : '')
}

function getEmpShortNameFromParts (firstName, middleName, lastName) {
  return (lastName || '') + (firstName ? ' ' + firstName[0].toUpperCase() + '.' : '') + (middleName ? middleName[0].toUpperCase() : '')
}
