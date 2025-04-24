const UB = require('@unitybase/ub')
const settingsService = require('../../AC/modules/entityServices/settingsService')

module.exports = {
  insertDefaultData
}
const data = {
  entity: 'hr_idParam',
  items: {
    CertfFSSUAbs: ['17', '18', '19', '20', '40', '14', '15', '57'],
    CertfFSSUPay: ['16', '22'],
    FOZP: ['1', '2', '3', '21', '35'],
    FDZP: ['4', '5', '6', '7', '8', '9', '10', '11', '12', '45', '13', '16', '24', '25', '33'],
    ZKV: ['37'],
    notAvgQuantity: ['14', '57', '20', '140'],
    3050: ['05', '08', '23'],
    3060: ['01', '02', '03', '04', '06', '07', '09', '10', '11', '12', '13', '14', '15', '18', '19', '20', '22', '25', '26'],
    3090: ['20'],
    3100: ['14'],
    4080: ['15'],
    5040: ['4', '5', '6', '7', '8', '9', '10', '11', '33', '50', '25'],
    5050: ['12', '45'],
    5051: ['24'],
    5070: ['37'],
    5090: ['13', '16'],
    salary1: ['147'],
    salary2: ['146', '148'],
    salary3: ['156'],
    salary5: ['33', '150'],
    salary6: ['13', '16'],
    salary19: ['142'],
    salary7: ['17', '18', '19', '20', '40', '48', '149'],
    salary20: ['134'],
    salary8: ['14', '57', '140'],
    notSickPayedTime: ['РбДн', 'РбНп', 'Вдр', 'Восн', 'Вдод', 'Вчорн', 'Внавч', 'Допл', 'Прст', 'ПідвКв', 'Моб', 'ДГОбов', 'ДоПідг', 'ВЗб', 'ВДон', 'ВдрС', 'ВдрР', 'Війс', 'Вій'],
    RegularDirectPaym: ['1', '2', '3', '63', '74', '21', '4', '5', '6', '12'],
    IrregularDirectPaym: ['7', '8', '9', '10', '11', '47', '24', '16', '37'],
    // RS12: [],
    RS13: ['13', '67', '23', '73', '137'],
    // RS14: [],
    RS16: ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09']
    // RS17: [],
    // RS18: []
  }
}

function insertDefaultData (orgID) {
  const listParamIDs = {}
  const codeList = Object.keys(data.items)
  UB.Repository('hr_listParam')
    .attrs('ID', 'code', 'tableName')
    .where('code', 'in', codeList)
    .selectAsObject().forEach(item => {
      listParamIDs[item.code] = item
    })
  const existList = {}
  UB.Repository(data.entity)
    .attrs('listParamID', 'valuesID')
    .where('orgID', '=', orgID)
    .where('listParamID.code', 'in', codeList)
    .selectAsObject().forEach(dict => {
      existList[dict.listParamID] = 1
    })
  codeList.forEach(code => {
    const currListParam = listParamIDs[code]
    const codeField = currListParam.tableName === 'hr_payEl' ? 'methodID.code' : 'code'
    const dataDS = UB.DataStore(data.entity)
    UB.Repository(currListParam.tableName)
      .attrs('ID', codeField)
      .where(codeField, 'in', data.items[code])
      .orderBy(codeField)
      .selectAsObject({ 'methodID.code': 'code' }).forEach((dict, i) => {
        if (!existList[currListParam.ID + dict.ID]) {
          dataDS.run('insert', {
            execParams: {
              orgID,
              listParamID: currListParam.ID,
              valuesID: dict.ID,
              orderN: i + 1
            }
          })
        }
      })
  })

  insertDefaultOrgConstant(orgID)
  insertDefaultDictSheetSigners(orgID)
  insertDefaultEmpRefSettings(orgID)
}

function insertDefaultOrgConstant (orgID) {
  settingsService.loadOrgDefaultSettings(orgID)

  const store = UB.DataStore('hr_empOrderDetConfig')
  const defConfig = UB.Repository('hr_empOrderDetConfig')
    .attrs(['*'])
    .where('organizationID', 'isNull')
    .selectAsObject()
  defConfig.forEach(item => {
    store.run('insert', {
      execParams: {
        organizationID: orgID,
        empOrderType: item.empOrderType,
        positionType: item.positionType,
        dictStaffCatID: item.dictStaffCatID,
        dictTimeCostID: item.dictTimeCostID,
        canEditDictTimeCost: item.canEditDictTimeCost,
        payElIDAccrual: item.payElIDAccrual,
        canEditPayElAccrual: item.canEditPayElAccrual,
        payElIDMain: item.payElIDMain,
        canEditPayElMain: item.canEditPayElMain,
        payElIDAdd: item.payElIDAdd,
        canEditPayElAdd: item.canEditPayElAdd,
        payElIDReplacement: item.payElIDReplacement,
        canEditPayElReplacement: item.canEditPayElReplacement,
        comment: item.comment
      }
    })
  })
}

function insertDefaultDictSheetSigners (orgID) {
  settingsService.loadOrgDefaultSettings(orgID)

  const store = UB.DataStore('hr_dictSheetSigner')
  store.run('insert', {
    execParams: {
      orderN: 1,
      signerName: 'Відповідальна особа',
      orgID: orgID
    }
  })
  store.run('insert', {
    execParams: {
      orderN: 2,
      signerName: 'Керівник структурного підрозділу',
      orgID: orgID
    }
  })
  store.run('insert', {
    execParams: {
      orderN: 3,
      signerName: 'Керівник установи',
      orgID: orgID
    }
  })
}

function insertDefaultEmpRefSettings (orgID) {
  const delaultSettingsData = {
    'osobovaKartka': { empValue: true, empNumValue: true, empCardValue: true },
    'dovidkaZMiscyaRoboty': { empValue: true, empNumValue: true, empCardValue: true },
    'dovidkaZMiscyaRoboty2': { empValue: true, empNumValue: true, empCardValue: true },
    'income': { empValue: false, empNumValue: true, empCardValue: true },
    'incomeTax': { empValue: false, empNumValue: true, empCardValue: true },
    'incomeAccrual': { empValue: false, empNumValue: true, empCardValue: true },
    'payIndexSalary': { empValue: false, empNumValue: true, empCardValue: true },
    'credit': { empValue: false, empNumValue: true, empCardValue: true },
    'payrollEmbassy': { empValue: false, empNumValue: true, empCardValue: true },
    'payrollRequire': { empValue: false, empNumValue: true, empCardValue: true },
    'avgSalary13': { empValue: false, empNumValue: true, empCardValue: true },
    'avgSalaryMain': { empValue: false, empNumValue: true, empCardValue: true },
    'avgSalaryFSS': { empValue: false, empNumValue: true, empCardValue: true },
    'N6': { empValue: false, empNumValue: true, empCardValue: true },
    'rl': { empValue: false, empNumValue: true, empCardValue: true },
    'rlMonth': { empValue: false, empNumValue: true, empCardValue: true },
    'infoCard': { empValue: false, empNumValue: true, empCardValue: true },
    'dovidkaZMiscyaRobotyPregnVac': { empValue: true, empNumValue: false, empCardValue: true },
    'dovidkaZMiscyaRobotyMission': { empValue: true, empNumValue: false, empCardValue: true },
    'empCommitment': { empValue: true, empNumValue: false, empCardValue: true },
    'dovidkaNotUsedVacation': { empValue: true, empNumValue: false, empCardValue: true },
    'povidomZminaOblikData': { empValue: true, empNumValue: false, empCardValue: true },
    'biografDovidka': { empValue: true, empNumValue: false, empCardValue: true },
    'employeeWorkbook': { empValue: true, empNumValue: false, empCardValue: true },
    'employeeWorkbookDt': { empValue: true, empNumValue: false, empCardValue: true },
    'employeeWorkbookDt6': { empValue: true, empNumValue: false, empCardValue: true },
    'calcExperience': { empValue: true, empNumValue: false, empCardValue: true },
    'agreementProcessingData': { empValue: true, empNumValue: false, empCardValue: true }
  }

  const store = UB.DataStore('hr_empRefSettings')
  store.run('insert', {
    execParams: {
      organizationID: orgID,
      settingsData: JSON.stringify(delaultSettingsData)
    }
  })
}
