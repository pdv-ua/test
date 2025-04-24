/* global Ext $App _ HR UB AC */
module.exports = {
  cap,
  uncap,
  getNameCase,
  decyptionRNOKPP
}

/* const defaultRules = {
  'surname': {
    'suffixes': [{
      'gender': 'female',
      'tail': [UB.i18n('б'), UB.i18n('в'), UB.i18n('г'), UB.i18n('д'), UB.i18n('ж'), UB.i18n('з'), UB.i18n('к'), UB.i18n('л'), UB.i18n('м'), UB.i18n('н'), UB.i18n('п'), UB.i18n('р'), UB.i18n('с'), UB.i18n('т'), UB.i18n('й'), UB.i18n('ф'), UB.i18n('х'), UB.i18n('ц'), UB.i18n('ч'), UB.i18n('ш'), UB.i18n('щ'), UB.i18n('ъ'), UB.i18n('ь'), UB.i18n('ко')],
      'mods': ['.', '.', '.', '.', '.']
    }, {
      'gender': 'male',
      'tail': [UB.i18n('б'), UB.i18n('в'), UB.i18n('г'), UB.i18n('д'), UB.i18n('ж'), UB.i18n('з'), UB.i18n('к'), UB.i18n('л'), UB.i18n('м'), UB.i18n('н'), UB.i18n('п'), UB.i18n('р'), UB.i18n('с'), UB.i18n('т'), UB.i18n('ф'), UB.i18n('х'), UB.i18n('ц'), UB.i18n('ш'), UB.i18n('щ')],
      'mods': [UB.i18n('а'), UB.i18n('у'), UB.i18n('а'), UB.i18n('ом'), UB.i18n('е')]
    }, {
      'gender': 'male',
      'tail': [UB.i18n('о')],
      'mods': [UB.i18n('-а'), UB.i18n('-у'), UB.i18n('-а'), UB.i18n('м'), UB.i18n('-а')]
    }, {
      'gender': 'male',
      'tail': [UB.i18n('ий')],
      'mods': [UB.i18n('--ого'), UB.i18n('--ому'), UB.i18n('--ого'), UB.i18n('--им'), UB.i18n('-ому')]
    }, {
      'gender': 'female',
      'tail': [UB.i18n('ська'), UB.i18n('цька')],
      'mods': [UB.i18n('-у'), UB.i18n('-ій'), UB.i18n('-у'), UB.i18n('-ою'), UB.i18n('-ій')]
    }, {
      'gender': 'any',
      'tail': [UB.i18n('на')],
      'mods': [UB.i18n('-у'), '-і', UB.i18n('-у'), UB.i18n('-ою'), '-і']
    }, {
      'gender': 'any',
      'tail': [UB.i18n('ова'), UB.i18n('ева')],
      'mods': [UB.i18n('-у'), UB.i18n('-ій'), UB.i18n('-у'), UB.i18n('-ою'), UB.i18n('-ій')]
    }, {
      'gender': 'any',
      'tail': [UB.i18n('ка'), UB.i18n('ча'), UB.i18n('ща'), UB.i18n('жа')],
      'mods': [UB.i18n('-у'), '-і', UB.i18n('-у'), UB.i18n('-ою'), '-і']
    }, {
      'gender': 'any',
      'tail': [UB.i18n('ца')],
      'mods': [UB.i18n('-ю'), '-і', UB.i18n('-ю'), UB.i18n('-ею'), '-і']
    }, {
      'gender': 'any',
      'tail': [UB.i18n('а')],
      'mods': [UB.i18n('-у'), '-і', UB.i18n('-у'), UB.i18n('-ою'), '-і']
    }, {
      'gender': 'male',
      'tail': [UB.i18n('ой')],
      'mods': [UB.i18n('-го'), UB.i18n('-му'), UB.i18n('-го'), UB.i18n('--им'), '-ї']
    }, {
      'gender': 'any',
      'tail': [UB.i18n('ха')],
      'mods': [UB.i18n('-у'), UB.i18n('--сі'), UB.i18n('-у'), UB.i18n('-ою'), '-і']
    }, {
      'gender': 'any',
      'tail': [UB.i18n('га')],
      'mods': [UB.i18n('-у'), UB.i18n('--зі'), UB.i18n('-у'), UB.i18n('-ою'), '-і']
    }, {
      'gender': 'male',
      'tail': [UB.i18n('ш'), UB.i18n('щ'), UB.i18n('ч')],
      'mods': [UB.i18n('а'), UB.i18n('у'), UB.i18n('а'), UB.i18n('ем'), 'і']
    }, {
      'gender': 'male',
      'tail': [UB.i18n('ь'), UB.i18n('й')],
      'mods': [UB.i18n('-я'), UB.i18n('-ю'), UB.i18n('-я'), UB.i18n('-єм'), '-і']
    }, {
      'gender': 'male',
      'tail': [UB.i18n('я')],
      'mods': ['-і', '-і', UB.i18n('-ю'), UB.i18n('-єю'), '-і']
    }, {
      'gender': 'male',
      'tail': [UB.i18n('ов')],
      'mods': [UB.i18n('а'), UB.i18n('у'), UB.i18n('а'), UB.i18n('им'), UB.i18n('е')]
    }, {
      'gender': 'male',
      'tail': [UB.i18n('нець'), UB.i18n('вець'), UB.i18n('рець')],
      'mods': [UB.i18n('---ця'), UB.i18n('---цю'), UB.i18n('---ця'), UB.i18n('---цем'), UB.i18n('---ці')]
    }, {
      'gender': 'male',
      'tail': [UB.i18n('лець')],
      'mods': [UB.i18n('---ьця'), UB.i18n('---ьцю'), UB.i18n('---ьця'), UB.i18n('---ьцем'), UB.i18n('---ьці')]
    }, {
      'gender': 'male',
      'tail': [UB.i18n('ин'), UB.i18n('ін')],
      'mods': [UB.i18n('а'), UB.i18n('у'), UB.i18n('а'), UB.i18n('им'), UB.i18n('е')]
    }, {
      'gender': 'male',
      'tail': [UB.i18n('ин'), UB.i18n('ін'), UB.i18n('ев'), UB.i18n('ов')],
      'mods': [UB.i18n('а'), UB.i18n('у'), UB.i18n('а'), UB.i18n('им'), UB.i18n('е')]
    }, {
      'gender': 'female',
      'tail': [UB.i18n('я')],
      'mods': ['-і', '-і', UB.i18n('-ю'), UB.i18n('-ею'), UB.i18n('-ій')]
    }, {
      'gender': 'female',
      'tail': [UB.i18n('чина')],
      'mods': [UB.i18n('-у'), UB.i18n('-ій'), UB.i18n('-у'), UB.i18n('-ою'), '.']
    }, {
      'gender': 'male',
      'tail': [UB.i18n('ок')],
      'mods': [UB.i18n('--ка'), UB.i18n('--ку'), UB.i18n('--ка'), UB.i18n('--ком'), '.']
    }, {
      'gender': 'male',
      'tail': [UB.i18n('єв')],
      'mods': [UB.i18n('а'), UB.i18n('у'), UB.i18n('а'), UB.i18n('им'), '.']
    }, {
      'gender': 'male',
      'tail': [UB.i18n('ун')],
      'mods': [UB.i18n('а'), UB.i18n('у'), UB.i18n('а'), UB.i18n('ом'), '.']
    }]
  },
  'name': {
    'suffixes': [{
      'gender': 'male',
      'tail': [UB.i18n('о')],
      'mods': [UB.i18n('-а'), UB.i18n('-у'), UB.i18n('-а'), UB.i18n('м'), UB.i18n('-у')]
    }, {
      'gender': 'any',
      'tail': [UB.i18n('е'), UB.i18n('и'), UB.i18n('у'), UB.i18n('ы'), UB.i18n('э'), UB.i18n('ю')],
      'mods': ['.', '.', '.', '.', '.']
    }, {
      'gender': 'female',
      'tail': [UB.i18n('б'), UB.i18n('в'), UB.i18n('г'), UB.i18n('д'), UB.i18n('ж'), UB.i18n('з'), UB.i18n('й'), UB.i18n('к'), UB.i18n('л'), UB.i18n('м'), UB.i18n('н'), UB.i18n('п'), UB.i18n('р'), UB.i18n('с'), UB.i18n('т'), UB.i18n('ф'), UB.i18n('х'), UB.i18n('ц'), UB.i18n('ч'), UB.i18n('ш'), UB.i18n('щ'), UB.i18n('ъ')],
      'mods': ['.', '.', '.', '.', '.']
    }, {
      'gender': 'female',
      'tail': [UB.i18n('ь')],
      'mods': ['.', '-і', '.', '.', '.']
    }, {
      'gender': 'female',
      'tail': [UB.i18n('га')],
      'mods': [UB.i18n('-и'), UB.i18n('--зі'), UB.i18n('-у'), UB.i18n('-ою'), UB.i18n('--зі')]
    }, {
      'gender': 'male',
      'tail': [UB.i18n('ь')],
      'mods': [UB.i18n('-я'), UB.i18n('-ю'), UB.i18n('-я'), UB.i18n('-ем'), '-і']
    }, {
      'gender': 'any',
      'tail': [UB.i18n('ша')],
      'mods': ['-і', '-і', UB.i18n('-у'), UB.i18n('-ею'), '-і']
    }, {
      'gender': 'male',
      'tail': [UB.i18n('н'), UB.i18n('р'), UB.i18n('в'), UB.i18n('г'), UB.i18n('с'), UB.i18n('л'), UB.i18n('м'), UB.i18n('д')],
      'mods': [UB.i18n('а'), UB.i18n('у'), UB.i18n('а'), UB.i18n('ом'), 'ї']
    }, {
      'gender': 'female',
      'tail': [UB.i18n('я')],
      'mods': ['-ї', '-ї', UB.i18n('-ю'), UB.i18n('-єю'), '-ї']
    }, {
      'gender': 'female',
      'tail': [UB.i18n('ка')],
      'mods': [UB.i18n('-у'), UB.i18n('--ці'), UB.i18n('--ці'), UB.i18n('-ою'), UB.i18n('--ці')]
    }, {
      'gender': 'male',
      'tail': [UB.i18n('ець')],
      'mods': [UB.i18n('---ця'), UB.i18n('---цю'), UB.i18n('---ця'), UB.i18n('---цем'), UB.i18n('---цеві')]
    }, {
      'gender': 'male',
      'tail': [UB.i18n('п')],
      'mods': [UB.i18n('а'), UB.i18n('у'), UB.i18n('а'), UB.i18n('ом'), UB.i18n('а')]
    }, {
      'gender': 'male',
      'tail': [UB.i18n('й')],
      'mods': [UB.i18n('-я'), UB.i18n('-ю'), UB.i18n('-я'), UB.i18n('-єм'), '.']
    }, {
      'gender': 'male',
      'tail': [UB.i18n('я')],
      'mods': [UB.i18n('-ю'), '-і', UB.i18n('-ю'), UB.i18n('-єю'), '.']
    }, {
      'gender': 'male',
      'tail': [UB.i18n("'я")],
      'mods': [UB.i18n('-ю'), '-ї', UB.i18n('-ю'), UB.i18n('-єю'), '.']
    }, {
      'gender': 'male',
      'tail': [UB.i18n('ор')],
      'mods': [UB.i18n('я'), UB.i18n('ю'), UB.i18n('я'), UB.i18n('ем'), '.']
    }, {
      'gender': 'any',
      'tail': [UB.i18n('на')],
      'mods': [UB.i18n('-у'), '-і', UB.i18n('-у'), UB.i18n('-ою'), '.']
    }, {
      'gender': 'female',
      'tail': [UB.i18n('а')],
      'mods': [UB.i18n('-у'), '-і', UB.i18n('-у'), UB.i18n('-ою'), '.']
    }, {
      'gender': 'male',
      'tail': [UB.i18n('лав')],
      'mods': [UB.i18n('а'), UB.i18n('у'), UB.i18n('а'), UB.i18n('ом'), '.']
    }]
  },
  'lastname': {
    'suffixes': [{
      'gender': 'any',
      'tail': [UB.i18n('ич'), UB.i18n('іч')],
      'mods': [UB.i18n('а'), UB.i18n('у'), UB.i18n('а'), UB.i18n('ем'), 'і']
    }, {
      'gender': 'any',
      'tail': [UB.i18n('на')],
      'mods': [UB.i18n('-у'), UB.i18n('-ій'), UB.i18n('-у'), UB.i18n('-ою'), '-і']
    }, {
      'gender': 'female',
      'tail': [UB.i18n('а')],
      'mods': [UB.i18n('-у'), '-і', '-і', UB.i18n('-ою'), UB.i18n('-ій')]
    }]
  }
} */
function loadRules () {
  let cases = ['acc', 'dat', 'gen', 'ins', 'loc', 'voc']
  let attrs = ['namePart', 'sexType', 'suff'].concat(cases)
  let result = {}
  return UB.Repository('hr_namecase').attrs(attrs).orderByDesc('namePart').orderByDesc('sexType').selectAsObject().then(data => {
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
  })
}

function cap (str) {
  return typeof str === 'string' ? str.charAt(0).toUpperCase() + str.slice(1) : str
}

function uncap (str) {
  return typeof str === 'string' ? str.charAt(0).toLowerCase() + str.slice(1) : str
}

async function getNameCase (surName, name, lastName, gender) {
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
  if (!HR.nameCase.rules) {
    HR.nameCase.rules = await loadRules()
  }
  nc.rules = HR.nameCase.rules
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
      if ($App) {
        ($App.dialogError && ($App.dialogError(errMessage, UB.i18n('Помилка')) || true)) || Ext.MessageBox.alert(errMessage)
      } else {
        console.error(errMessage)
      }
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

function decyptionRNOKPP (num) {
  const sex = num.slice(8, 9) % 2 ? 'M' : 'W'
  const daysToBday = num.substring(0, 5)
  const birthday = new Date((+daysToBday - (25567 + 1)) * 86400 * 1000)
  const birthDays = birthday.getDate() < 10 ? '0' + birthday.getDate() : birthday.getDate()
  const birthMonths = (birthday.getMonth() + 1) < 10 ? '0' + (birthday.getMonth() + 1) : birthday.getMonth() + 1
  const fullDate = AC.dateService.unshiftDate(new Date(birthday.getFullYear(), birthMonths - 1, birthDays))
  return { birthday: fullDate, sex }
}
