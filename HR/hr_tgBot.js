const UB = require('@unitybase/ub')
const App = UB.App
const dateService = require('../AC/modules/dataServices/dateService')
const settingsService = require('../AC/modules/entityServices/settingsService')

App.registerEndpoint('loadBotVacationData', loadBotVacationData, false)
App.registerEndpoint('identifyBotUser', identifyBotUser, false)

function loadBotVacationData (req, resp) {
  const srcPrm = req.read()
  const params = JSON.parse(srcPrm)
  const groupedData = {}

  const organizationID = UB.Repository('hr_employee')
    .attrs(['organizationID'])
    .where('ID', '=', params.employeeID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .selectScalar()

  const fixMonth = settingsService.getByCode('hrVacFixMonth', organizationID) || 0
  const hrVacFixMonth = fixMonth || 24

  const empVacationPlanID = UB.Repository('hr_empVacationPlan')
    .attrs(['ID'])
    .where('employeeID', '=', params.employeeID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  let resultString = ''

  if (!empVacationPlanID) {
    groupedData['Немає empVacationPlan'] = []
  } else {
    let vacdata = []
    empVacationPlanID.forEach(row => {
      const empVacationPeriodID = UB.Repository('hr_empVacationPeriod')
        .attrs(['empVacationPlanID.dictVacationKindID.name', 'empVacationPlanID.dictVacationKindID.code',
          'empVacationPlanID.dictVacationKindID', 'dayDiff', 'empVacationPlanID.employeeNumberID.tabNum',
          'dateFrom', 'dateTo', 'isMainPart'])
        .where('empVacationPlanID', '=', row.ID)
        .where('mi_deleteDate', '>=', '#maxdate')
        .where('dayDiff', '>', 0)
        .selectAsObject({
          'empVacationPlanID.dictVacationKindID.name': 'vacTypeName',
          'empVacationPlanID.dictVacationKindID.code': 'vacTypeCode',
          'descriptionExt': 'descriptionExt',
          'empVacationPlanID.employeeNumberID.tabNum': 'tabNum',
          'dateFrom': 'dateFrom'
        })

      empVacationPeriodID.forEach(vac => {
        const dateFrom = new Date(vac.dateFrom)
        const dateTo = vac.dateTo ? new Date(vac.dateTo) : null
        const dayDiff = vac.dayDiff
        vac.descriptionExt = UB.i18n(`{2} днів (за {0} - {1})`, dateService.formatDate(dateFrom), dateService.formatDate(dateTo), dayDiff || 0)
        vac.dataValue = `\n* ${vac.descriptionExt}${vac.vacTypeCode === 'dYear' ? (!vac.isMainPart ? `, нерозр. – 14 ` : '') : ''}`
        let existTabNum = vacdata.find(el => el.tabNum === vac.tabNum)
        if (existTabNum) {
          existTabNum[vac.vacTypeCode === 'dYear' ? 'vacDaysYear' : 'vacDaysOther'] += dayDiff
          let existVac = existTabNum.data.find(el => el.vacTypeCode === (vac.vacTypeCode === 'dYear' ? 'dYear' : 'other'))
          if (existVac) {
            existVac.data.push(vac.dataValue)
          } else {
            existTabNum.data.push({
              vacTypeCode: vac.vacTypeCode === 'dYear' ? 'dYear' : 'other',
              vacTypeName: vac.vacTypeCode === 'dYear' ? vac.vacTypeName : 'Додаткова щорічна',
              data: [vac.dataValue]
            })
          }
        } else {
          vacdata.push({
            tabNum: vac.tabNum,
            vacDaysYear: vac.vacTypeCode === 'dYear' ? dayDiff : 0,
            vacDaysOther: vac.vacTypeCode === 'dYear' ? 0 : dayDiff,
            data: [{
              vacTypeCode: vac.vacTypeCode === 'dYear' ? 'dYear' : 'other',
              vacTypeName: vac.vacTypeCode === 'dYear' ? vac.vacTypeName : 'Додаткова щорічна',
              data: [vac.dataValue]
            }]
          })
        }
      })
    })

    vacdata.forEach(tabData => {
      resultString += `${resultString.length ? '\n\n\n' : ''}Табельний номер - ${tabData.tabNum}`
      resultString += `\n\nВсього доступно - ${tabData.vacDaysYear + tabData.vacDaysOther} днів:`
      resultString += (tabData.vacDaysYear ? `\n* Щорічна основна – ${tabData.vacDaysYear} днів` : '') +
          (tabData.vacDaysOther ? `\n* Додаткова щорічна – ${tabData.vacDaysOther} днів` : '')

      let firstTabVacFlag = true
      tabData.data.forEach(vacation => {
        resultString += (firstTabVacFlag ? '\n\nЗ них:\n' : '\n\n') + vacation.vacTypeName + ':'
        firstTabVacFlag = false
        vacation.data.forEach(vacDet => {
          resultString += vacDet
        })
      })
    })
  }
  resp.statusCode = 200
  resp.writeHead('Content-Type: application/json;charset=UTF-8')
  resp.writeEnd(JSON.stringify(resultString.length ? resultString : 'У вас відсутні доступні відпустки.'))
}

function identifyBotUser (req, resp) {
  const srcPrm = req.read()
  const params = JSON.parse(srcPrm)
  if (params.mobPhone.length !== 13) {
    params.mobPhone = '+' + params.mobPhone
  }

  const employeeData = UB.Repository('hr_employeeContact')
    .attrs(['employeeID', 'employeeID.fullFIO'])
    .where('contactTypeID.code', '=', 'phoneTgBot', 'phoneTgBot')
    .where('contactTypeID.code', '=', 'mobPhone', 'mobPhone')
    .where('contactTypeID.code', '=', 'phone', 'phone')
    .where('value', '=', params.mobPhone)
    .logic('(([mobPhone]) OR ([phone]) OR ([phoneTgBot]))')
    .selectSingle({
      'employeeID.fullFIO': 'fullFIO'
    })
  resp.statusCode = 200
  resp.writeHead('Content-Type: application/json;charset=UTF-8')
  resp.writeEnd(JSON.stringify(employeeData))
}
