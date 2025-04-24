const UB = require('@unitybase/ub')
const App = UB.App
const dateService = require('../../../AC/modules/dataServices/dateService')

module.exports = {
  importEmployeeData
}

function importEmployeeData (employeeData, organizationID, mode, params, dateFromStipend, type) {
  const result = []
  const dictMaritalStatusKind = UB.Repository('hr_dictMaritalStatusKind')
    .attrs(['*'])
    .selectAsObject()
  const defCountryID = UB.Repository('cdn_country')
    .attrs('ID')
    .where('code', '=', 'UKR')
    .selectScalar() || null
  const countries = UB.Repository('cdn_country')
    .attrs('ID', 'name')
    .selectAsObject()

  const taxCodeArr = employeeData.map(o => !o['ІНН'] ? o['РНОКПП'] : o['ІНН'])

  const store = UB.DataStore('hr_employee')
  const duplicatesEmployee = UB.Repository('hr_employee')
    .attrs(['ID', 'taxCode', 'organizationID.name', 'fullFIO'])
    .where('taxCode', 'in', taxCodeArr)
    .selectAsObject({ 'organizationID.name': 'organizationName' })
  employeeData.forEach(o => {
    if (o['Стать']) o['Стать'] = o['Стать'] === 'Жіноча' ? 'W' : 'M'
    const curDictMaritalStatusKind = dictMaritalStatusKind.find(d => d.name === o['Сімейний стан'])
    const citizenshipID = o['Громадянство'] ? getDictionaryID(countries, o['Громадянство'], 'name') : defCountryID
    const newID = store.generateID()
    const birthDate = dateService.getDateWithString(o['Дата народження'])
    const yearBirthDate = birthDate && birthDate.getYear() >= 100 ? `20${birthDate.getYear() === 100 ? '00' : birthDate.getYear() - 100}` : `19${birthDate.getYear()}`
    const execParams = {
      ID: newID,
      organizationID,
      firstName: o["Ім'я"] || '',
      lastName: o['Прізвище'] || '',
      middleName: o['По батькові'] || '',
      fullFIO: `${o['Прізвище'] || ''} ${o["Ім'я"] || ''} ${o['По батькові'] || ''}`,
      shortFIO: `${o['Прізвище'] || ''} ${o["Ім'я"] ? o["Ім'я"].slice(0, 1) : ''}. ${o['По батькові'] ? o['По батькові'].slice(0, 1) : ''}.`,
      sexType: o['Стать'] || 'N',
      dictMaritalStatusKindID: curDictMaritalStatusKind ? curDictMaritalStatusKind.ID : null,
      taxCode: o['ІНН'] || o['РНОКПП'],
      empTaxCodeType: 'TAXCODE',
      citizenshipID,
      birthPlace: o['Місце народження'],
      phoneMobile: o['Телефон мобільний'],
      phoneWorking: o['Телефон робочий'],
      phoneHome: o['Телефон домашній'],
      birthDate,
      dayBirthDate: birthDate && birthDate.getDate(),
      monthBirthDate: birthDate && birthDate.getMonth(),
      yearBirthDate
    }

    const findDuplicatesEmployee = duplicatesEmployee.find(empl => empl.taxCode === execParams.taxCode)
    if (findDuplicatesEmployee) {
      execParams.state = `Знайдений співробітник з РНОКПП ${findDuplicatesEmployee.taxCode} ФІО ${findDuplicatesEmployee.fullFIO} (власник даних: ${findDuplicatesEmployee.organizationName})`
    } else {
      try {
        store.run('insert', {
          execParams
        })
        execParams.state = `Завантажено устішно`
      } catch (e) {
        execParams.state = e.message
      }
    }
    result.push(execParams)
  })
  App.dbCommit()
  return {
    recordCount: employeeData.length,
    empl: JSON.stringify(result)
  }
}
function getDictionaryID (dict, value, attr = 'code') {
  const item = dict.find(o => o[attr] === value)
  return item ? item.ID : null
}
