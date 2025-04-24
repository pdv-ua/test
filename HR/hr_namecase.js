const __entityName = __filename.slice(__dirname.length + 1, -3)
const UB = require('@unitybase/ub')
const me = global[__entityName]

me.entity.addMethod('loadDefaultRules')
const defaultRules = {
  'surname': {
    'suffixes': [
      {
        'gender': 'female',
        'tail': [ 'б', 'в', 'г', 'д', 'ж', 'з', 'к', 'л', 'м', 'н', 'п', 'р', 'с', 'т', 'й', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ь', 'ко' ],
        'mods': [ '.', '.', '.', '.', '.', '.' ]
      },
      {
        'gender': 'female',
        'tail': [ 'ська', 'цька' ],
        'mods': [ '-ої', '-ій', '-у', '-ою', '-ій', '.' ]
      },
      {
        'gender': 'female',
        'tail': [ 'я ' ],
        'mods': [ '-і', '-і', '-ю', '-ею', '-ій', '. ' ]
      },
      {
        'gender': 'female',
        'tail': [ 'іна', 'ина', 'ова', 'єва', 'ева', 'ча' ],
        'mods': [ '-ої', '-ій', '-у', '-ою', '-ій', '.' ]
      },
      {
        'gender': 'any',
        'tail': [ 'ча', 'ща', 'жа' ],
        'mods': [ '-и', '-і', '-у', '-ою', '-і', '.'
        ]
      },
      {
        'gender': 'any',
        'tail': [ 'ца' ],
        'mods': [ '-и', '-і', '-у', '-ею', '-і', '.' ]
      },
      {
        'gender': 'any',
        'tail': [ 'а' ],
        'mods': [ '-и', '-і', '-у', '-ою', '-і', '.'
        ]
      },
      {
        'gender': 'any',
        'tail': [ 'ха'
        ],
        'mods': [ '-и', '--сі', '-у', '-ою', '--сі', '.' ]
      },
      {
        'gender': 'any',
        'tail': [ 'га'
        ],
        'mods': [ '-и', '--зі', '-у', '-ою', '--зі', '.' ]
      },
      {
        'gender': 'any',
        'tail': [ 'ка' ],
        'mods': [ '-и', '--ці', '-у', '-ою', '--ці', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'к' ],
        'mods': [ 'а', 'у', 'а', 'ом', 'у', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'ій' ],
        'mods': [ '-я', '-ю', '-я', '-єм', '-ї', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'ер' ],
        'mods': [ 'а', 'у', 'а', 'ом', 'і', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'тер' ],
        'mods': [ 'а', 'у', 'а', 'ом', '--рі', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'ш', 'щ', 'ч' ],
        'mods': [ 'а', 'у', 'а', 'ем', 'і', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'ь', 'й' ],
        'mods': [ '-я', '-ю', '-я', '-єм', '-і', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'я' ],
        'mods': [ '-і', '-і', '-ю', '-єю', '-і', '.'
        ]
      },
      {
        'gender': 'male',
        'tail': [ 'нець', 'вець', 'рець' ],
        'mods': [ '---ця', '---цю', '---ця', '---цем', '---ці', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'лець' ],
        'mods': [ '---ьця', '---ьцю', '---ьця', '---ьцем', '---ьці', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'ин', 'ін', 'їн', 'ев', 'єв', 'ов', 'ів', 'їв' ],
        'mods': [ 'а', 'у', 'а', 'им', 'і', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'ой' ],
        'mods': [ '-го', '-му', '-го', '--им', '-му', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'б', 'в', 'г', 'д', 'ж', 'з', 'л', 'н', 'м', 'п', 'р', 'с', 'т', 'ф', 'х', 'ц' ],
        'mods': [ 'а', 'у', 'а', 'ом', 'і', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'о' ],
        'mods': [ '-а', '-у', '-а', 'м', '-у', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'ий'
        ],
        'mods': [ '--ого', '--ому', '--ого', '--им', '--ому', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'ок' ],
        'mods': [ '--ка', '--ку', '--ка', '--ком', '--ку', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'вітній' ],
        'mods': [ '--ього', '--ьому', '--ього', '--ім', '--ьому', '.' ]
      }
    ]
  },
  'name': {
    'suffixes': [
      {
        'gender': 'female',
        'tail': [ 'б', 'в', 'г', 'д', 'ж', 'з', 'й', 'к', 'л', 'м', 'н', 'п', 'р', 'с', 'т', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ъ' ],
        'mods': [ '.', '.', '.', '.', '.', '.' ]
      },
      {
        'gender': 'female',
        'tail': [ 'ль' ],
        'mods': [ '-і', '-і', '.', '-лю', 'і', '-е' ]
      },
      {
        'gender': 'female',
        'tail': [ 'га' ],
        'mods': [ '-и', '--зі', '-у', '-ою', '--зі', '-о' ]
      },
      {
        'gender': 'female',
        'tail': [ 'я' ],
        'mods': [ '-і', '-і', '-ю', '-ею', '-і', '-ю' ]
      },
      {
        'gender': 'female',
        'tail': [ 'ка' ],
        'mods': [ '-и', '--ці', '-ку', '-ою', '--ці', '-о' ]
      },
      {
        'gender': 'female',
        'tail': [ 'ов' ],
        'mods': [ '-і', '-і', '.', 'ю', 'і', '-е' ]
      },
      {
        'gender': 'female',
        'tail': [ 'ія' ],
        'mods': [ '-ї', '-ї', '-ю', '-єю', '-ї', '-є' ]
      },
      {
        'gender': 'female',
        'tail': [ 'а' ],
        'mods': [ '-и', '-і', '-у', '-ою', '-і', '-о' ]
      },
      {
        'gender': 'female',
        'tail': [ 'я' ],
        'mods': [ '-ї', '-ї', '-ю', '-єю', '-ї', '-є' ]
      },
      {
        'gender': 'any',
        'tail': [ 'ша'
        ],
        'mods': [ '-і', '-і', '-у', '-ею', '-і', '.' ]
      },
      {
        'gender': 'any',
        'tail': [ 'е', 'и', 'у', 'ы', 'э', 'ю' ],
        'mods': [ '.', '.', '.', '.', '.', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'ег'
        ],
        'mods': [ 'а', 'у', 'а', 'ом', 'ові', 'у' ]
      },
      {
        'gender': 'male',
        'tail': [ 'ла', 'та' ],
        'mods': [ '-и', '-і', '-у', '-ою', '-і', '-о' ]
      },
      {
        'gender': 'male',
        'tail': [ 'Лев' ],
        'mods': [ '--ьва', '--ьву', '--ьва', '--ьвом', '--ьві', '--еве' ]
      },
      {
        'gender': 'female',
        'tail': [ 'Любов' ],
        'mods': [ 'і', 'і', '', '\'ю', 'і', 'е' ]
      },
      {
        'gender': 'male',
        'tail': [ 'н', 'р', 'в', 'г', 'с', 'л', 'м', 'д', 'т', 'ш' ],
        'mods': [ 'а', 'у', 'а', 'ом', 'і', 'е' ]
      },
      {
        'gender': 'male',
        'tail': [ 'лав' ],
        'mods': [ 'а', 'у', 'а', 'ом', 'і', 'е' ]
      },
      {
        'gender': 'male',
        'tail': [ 'ор' ],
        'mods': [ 'а', 'у', 'а', 'ом', 'і', 'е' ]
      },
      {
        'gender': 'male',
        'tail': [ 'ець' ],
        'mods': [ '---ця', '---цю', '---ця', '---цем', '---цеві', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'п' ],
        'mods': [ 'а', 'у', 'а', 'ом', 'і', 'е' ]
      },
      {
        'gender': 'male',
        'tail': [ 'й' ],
        'mods': [ '-я', '-ю', '-я', '-єм', '-ї', '-ю' ]
      },
      {
        'gender': 'male',
        'tail': [ 'я' ],
        'mods': [ '-і', '-і', '-ю', '-ею', '-і', '-є' ]
      },
      {
        'gender': 'male',
        'tail': [ 'я' ],
        'mods': [ '-ю', '-ї', '-ю', '-єю', '.', '.' ]
      },
      {
        'gender': 'male',
        'tail': [ 'гор' ],
        'mods': [ 'я', 'ю', 'я', 'ем', 'і', 'ю' ]
      },
      {
        'gender': 'male',
        'tail': [ 'ль'
        ],
        'mods': [ '-я', '-ю', '-я', '-ем', '-еві', '-ю' ]
      },
      {
        'gender': 'male',
        'tail': [ 'о' ],
        'mods': [ '-а', '-у', '-а', 'м', '-ові', '-е' ]
      },
      {
        'gender': 'male',
        'tail': [ 'Федір' ],
        'mods': [ '--ора', '--ору', '--ора', '--ором', '--орі', '--оре' ]
      }
    ]
  },
  'lastname': {
    'suffixes': [
      {
        'gender': 'female',
        'tail': [ 'а' ],
        'mods': [ '-и', '-і', '-у', '-ою', '-і', '-о' ]
      },
      {
        'gender': 'male',
        'tail': [ 'ич', 'іч' ],
        'mods': [ 'а', 'у', 'а', 'ем', 'і', 'у' ]
      }
    ]
  }
}
const caseField = ['gen', 'dat', 'acc', 'ins', 'loc', 'voc']

me.loadDefaultRules = function (ctx) {
  let store = UB.DataStore(__entityName)
  UB.Repository(__entityName).attrs(['ID']).selectAsObject().forEach(row => store.run('delete', { execParams: { ID: row.ID } }))
  for (let namePart in defaultRules) {
    if (!defaultRules.hasOwnProperty(namePart)) {
      break
    }
    let suff = defaultRules[namePart].suffixes
    suff.forEach(suffItem => {
      let execParams = { namePart: namePart }
      execParams.suff = suffItem.tail.join(',')
      suffItem.mods.forEach((modItem, i) => {
        execParams[caseField[i]] = modItem
        execParams.sexType = suffItem.gender === 'male' ? 'M' : suffItem.gender === 'female' ? 'W' : 'N'
      })
      store.run('insert', { execParams: execParams })
    })
  }
}
