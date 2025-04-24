const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const timService = require('../HR/modules/timService')
const dateService = require('../AC/modules/dataServices/dateService')
const sicknessService = require('../HR/modules/sicknessService')
const orgService = require('../HR/modules/orgService')
const payElService = require('../HR/modules/payElService')
const employeeService = require('../HR/modules/employeeService')
const calendarService = require('../HR/modules/calendarService')
const contService = require('../HR/modules/contService')
const periodService = require('../HR/modules/periodService')
const _ = require('lodash')
const queryString = require('querystring')
const iconv = require('iconv-lite')
const convert = require('xml-js')

me.on('insert:before', beforeInsert)
me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.on('delete:before', beforeDelete)
me.on('select:after', afterSelect)

App.registerEndpoint('loadImportEmpOrderSickness', loadData, true)
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
me.entity.addMethod('getExpirienceAndRate')
me.entity.addMethod('fixOrderState')
me.entity.addMethod('addSubEmpOrder')
me.entity.addMethod('deleteLastLoad')

me.details = [
  {
    detailName: 'empOrderSicknessDt',
    entityName: 'hr_empOrderSicknessDt',
    docIDName: 'empOrderSicknessID',
    fieldList: orderService.setFieldListAttribute(['empOrderSicknessID', 'dateFrom', 'dateTo', 'illnessRegime'], ['lineNum'])
  }
]

function loadData (req, resp) {
  if (req.method !== 'POST') {
    return resp.badRequest('invalid HTTP verb' + req.method)
  }
  const params = queryString.parse(req.parameters)
  params.orgID = Number(params.orgID)
  params.onDate = dateService.shiftDate(params.onDate.replace(/"/g, ''))
  const currentPeriod = periodService.getCurrentPeriod(params.orgID)
  const errorMessages = []
  const xmlString = iconv.decode(Buffer.from(req.read('bin')), 'UTF-8')
  let xmlData = JSON.parse(convert.xml2json(xmlString, { compact: true })).Table.Rows.Row
  if (xmlData && !xmlData.length) {
    xmlData = [xmlData]
  }
  const sicknessLogStore = UB.DataStore('hr_sicknessLog')
  const resultData = {
    rowCount: 0, // Всього записів у файлі
    recordCount: 0, // Завантажено записів
    prevDownloaded: 0, // Раніше завантажено
    noPayTimeCount: 0, // Не завантажено, бо не прийшов час сплати
    rowWithError: 0, // Не завантажено через помилки
    totalError: 0, // Всього помилок
    totalComments: 0 // Всього зауважень
  }
  if (xmlData && xmlData.length) {
    const loadDate = new Date()
    const cont = {
      orgID: params.orgID,
      org: orgService.getOrgData(params.orgID),
      payEl: payElService.getPayEl({ orgID: params.orgID }),
      emp: {}
    }
    contService.initDict(cont)
    const sicknessStore = UB.DataStore('hr_empOrderSickness')
    const sicknessDtStore = UB.DataStore('hr_empOrderSicknessDt')
    const dictIllnessReason = UB.Repository('hr_dictIllnessReason')
      .attrs(['code', 'dateFrom', 'dateTo'])
      .where('illnessKind', '=', '3')
      .where('payElFSSUID.methodID.code', '=', '20')
      .selectAsObject()
    const dictIllnessReasonKind3 = UB.Repository('hr_dictIllnessReason')
      .attrs(['ID', 'code', 'payElFOPID', 'maxDayFOP', 'payElFSSUID', 'payElFSSUID.includeSecondJobs', 'dateFrom', 'dateTo'])
      .where('illnessKind', '=', '3')
      .selectAsObject()
    xmlData.sort((a, b) => dateService.shiftDate(a['WIC_DT_BEGIN']['_text']) >= dateService.shiftDate(b['WIC_DT_BEGIN']['_text']) ? 1 : -1).forEach(record => {
      resultData.rowCount++
      const number = record['WIC_NUM']['_text']
      const employee = `${record['NP_SURNAME']['_text']} ${record['NP_NAME']['_text']} ${record['NP_PATRONYMIC']['_text']}`
      const dateFrom = dateService.shiftDate(record['WIC_DT_BEGIN']['_text'])
      const dateTo = dateService.shiftDate(record['WIC_DT_END']['_text'])
      const orderDescription = UB.i18n('№ {0} з {1} по {2}', number, dateService.formatDate(dateFrom), dateService.formatDate(dateTo))
      const empIdent = (record['NP_NUMIDENT'] && record['NP_NUMIDENT']['_text']) || (record['NP_DOC_NUM'] && record['NP_DOC_NUM']['_text'])
      let proceed = true
      const illnessReasonCode = record['WIC_CD']['_text']
      const orderDate = dictIllnessReason.find(o => o.code === illnessReasonCode && dateService.shiftDate(o.dateFrom) <= dateFrom && dateService.shiftDate(o.dateTo) >= dateFrom)
        ? dateFrom : dateTo
      const illnessReason = (dictIllnessReasonKind3.find(o => o.code === illnessReasonCode && dateService.shiftDate(o.dateFrom) <= dateFrom && dateService.shiftDate(o.dateTo) >= dateFrom) || {})
      if (dateService.addDays(orderDate, 6) > params.onDate || (record['WIC_STATUS']['_text'] === 'А' && illnessReasonCode !== '2')) {
        proceed = false
        resultData.noPayTimeCount++ // Не завантажено, бо не прийшов час сплати
      }
      let employeeData = {}
      if (proceed) {
        let employeeID = UB.Repository('hr_employee')
          .attrs(['ID'])
          .where('taxCode', '=', empIdent)
          .selectScalar()
        if (!employeeID && empIdent.substring(0, 2) === '00') {
          employeeID = UB.Repository('hr_employee')
            .attrs(['ID'])
            .where('taxCode', '=', empIdent.substring(2))
            .selectScalar()
        }
        if (employeeID) {
          employeeData = UB.Repository('hr_employeePosition')
            .attrs(['ID', 'employeeNumberID', 'employeeID', 'employeeNumberID.description', 'employeeID.empTaxCodeType', 'workPlace',
              'employeeID.lastName', 'employeeID.middleName', 'employeeID.firstName', 'employeeID.fullFIO', 'employeeID.taxCode'])
            .where('organizationID', '=', params.orgID)
            .where('employeeID', '=', employeeID)
            .where('workPlace', 'in', ['1', '3'])
            .where('employeeNumberID.dateFrom', '<=', dateTo)
            .where('employeeNumberID.dateTo', '>=', dateFrom)
            .where('dateFrom', '<', dateFrom)
            .orderBy('dateTo', 'desc').limit(1)
            .selectSingle({
              'ID': 'employeePositionID'
            })

          if (!employeeData || !employeeData.employeeID) {
            proceed = false
            errorMessages.push({
              msgType: '1',
              employee,
              orderDescription,
              description: UB.i18n(`Для лікарняного {0} не знайдено табельного номера працівника з кодом РНОКПП {1} {2}, що працював на дату початку лікарняного {3}`, orderDescription, empIdent, employee, dateService.formatDate(dateFrom))
            })
            resultData.rowWithError++ // Не завантажено через помилки
            resultData.totalError++ // Всього помилок
          }
        } else {
          proceed = false
          errorMessages.push({
            msgType: '1',
            employee,
            orderDescription,
            description: UB.i18n(`Для лікарняного {0} не знайдено особу з ідентифікатором {1}`, orderDescription, empIdent)
          })
          resultData.rowWithError++ // Не завантажено через помилки
          resultData.totalError++ // Всього помилок
        }
      }
      if (proceed && !illnessReason.ID) {
        errorMessages.push({
          msgType: '1',
          employee,
          orderDescription,
          description: UB.i18n(`Для лікарняного {0} не знайдено в довіднику "Причини непрацездатності" запис з кодом {1}`, orderDescription, illnessReasonCode)
        })
        resultData.rowWithError++ // Не завантажено через помилки
        resultData.totalError++ // Всього помилок
        proceed = false
      }
      let sicknessErrorMessages = []
      if (proceed) {
        const subNumber = number.indexOf('.') > 0 ? number.substr(0, number.indexOf('.')) : number
        const pointIndex = number.indexOf('.') > 0 ? number.indexOf('.') : number.length
        let existSickness = UB.Repository('hr_empOrderSickness')
          .attrs(['ID', 'orderState', 'employeeNumberID.description', 'employeeNumberID', 'employeeID', 'number'])
          .where('organizationID', '=', params.orgID)
          .where('number', 'like', subNumber + '%')
          .selectAsObject()
        for (let i = existSickness.length - 1; i >= 0; i--) {
          if (existSickness[i].number[pointIndex] && existSickness[i].number[pointIndex] !== '.') {
            existSickness.splice(i, 1)
          }
        }
        if (existSickness.length) {
          let empExistSicknessList = existSickness.filter(o => o.employeeNumberID === employeeData.employeeNumberID)
          if (empExistSicknessList.length) {
            empExistSicknessList.forEach(empExistSickness => {
              let skip = empExistSickness.orderState === 'PROJECT'
              if (!skip) {
                const timeSheetDayCanceled = UB.Repository('tim_timeSheet')
                  .attrs('count([ID])')
                  .where('orderID', '=', empExistSickness.ID)
                  .where('isCanceled', '=', 1)
                  .selectScalar()
                const timeSheetDay = timeSheetDayCanceled ? UB.Repository('tim_timeSheet')
                  .attrs('count([ID])')
                  .where('orderID', '=', empExistSickness.ID)
                  .selectScalar() : -1
                if (timeSheetDay !== timeSheetDayCanceled) {
                  skip = true
                }
              }
              if (skip) {
                proceed = false
                if (number === empExistSickness.number) {
                  errorMessages.push({
                    msgType: '1',
                    employee,
                    orderDescription,
                    description: UB.i18n(`Вже існує лікарняний для працівника {0} з номером {1}!`, empExistSickness['employeeNumberID.description'], number)
                  })
                  resultData.prevDownloaded++
                  resultData.totalError++ // Всього помилок
                } else {
                  errorMessages.push({
                    msgType: '1',
                    employee,
                    orderDescription,
                    description: UB.i18n(`Для лікарняного {0} у системі існує інша версія лікарняного з номером {1}!`, orderDescription, empExistSickness.number)
                  })
                  resultData.prevDownloaded++
                  resultData.totalError++ // Всього помилок
                }
              }
            })
          } else {
            sicknessErrorMessages.push({
              msgType: '2',
              employee,
              orderDescription,
              description: UB.i18n(`Існують лікарняні з номером {0} для працівників {1}!`, number, existSickness.map(o => o['employeeNumberID.description']).join(','))
            })
            resultData.totalComments++ // Всього зауважень
          }
        }
      }
      if (proceed) {
        let sickNotes = ''
        if (record['WIC_STATUS'] && record['WIC_STATUS']['_text'] === 'А') {
          sickNotes += ` ${UB.i18n('закритий')};`
        }
        if (record['WIC_STATUS'] && record['WIC_STATUS']['_text'] === 'Р') {
          sickNotes += ` ${UB.i18n('готовий до сплати')};`
        }
        if (record['SIGN_ANLK_NARKOTIK_INTOXICATION'] && record['SIGN_ANLK_NARKOTIK_INTOXICATION']['_text'] === 'true') {
          sickNotes += ` ${UB.i18n(`перебування у стані сп'яніння`)};`
        }
        let isReg = false
        if (record['VIOLATION_EXTENSION'] && record['VIOLATION_EXTENSION']['_text'] === 'true') {
          sickNotes += ` ${UB.i18n('порушення режиму')};`
          isReg = true
        }
        if (record['NP_DOC_NUM'] && record['NP_DOC_NUM']['_text']) {
          sickNotes += ` ${UB.i18n('Паспорт')}: ${record['NP_DOC_NUM']['_text']};`
        }

        const insertSickness = (empData, newID) => {
          if (!newID) {
            newID = sicknessStore.generateID()
          }
          let parentOrder
          const parentOrders = UB.Repository('hr_empOrderSickness')
            .attrs(['ID', 'dateTo', 'dateFrom', 'description', 'employeeFamilyID', 'standingYearMonth', 'standingAllYear',
              'standingAllInYear', 'percentWork', 'firstID', 'firstID.dateFrom']
            )
            .where('organizationID', '=', params.orgID)
            .where('employeeNumberID', '=', empData.employeeNumberID)
            .where('number', 'like', `${record['WIC_CASE_NUM']['_text']}%`)
            .orderBy('dateTo', 'desc')
            .selectAsObject()
          if (parentOrders) {
            parentOrder = parentOrders.find(o => dateService.shiftDate(o.dateTo) <= dateFrom)
            if (parentOrder) {
              if (parentOrder && dateService.shiftDate(parentOrder.dateTo).getTime() === dateFrom.getTime()) {
                sicknessErrorMessages.push({
                  msgType: '2',
                  employee,
                  orderDescription,
                  description: UB.i18n(`Лікарняний {0} починається пізніше ніж закінчується попередній лист {1}!`, orderDescription, parentOrder.description)
                })
                resultData.totalComments++ // Всього зауважень
              }
            } else {
              const parent = parentOrders.find(o => dateService.shiftDate(o.dateTo) >= dateFrom && dateService.shiftDate(o.dateFrom) <= dateTo)
              const parentTo = parentOrders.find(o => dateService.shiftDate(o.dateFrom) > dateTo)
              if (parent || parentTo) {
                const timeSheetDayCanceled = UB.Repository('tim_timeSheet')
                  .attrs('count([ID])')
                  .where('orderID', '=', parent ? parent.ID : parentTo.ID)
                  .where('isCanceled', '=', 1)
                  .selectScalar()
                const timeSheetDay = timeSheetDayCanceled ? UB.Repository('tim_timeSheet')
                  .attrs('count([ID])')
                  .where('orderID', '=', parent ? parent.ID : parentTo.ID)
                  .selectScalar() : -1
                if (timeSheetDay !== timeSheetDayCanceled) {
                  if (parent) {
                    sicknessErrorMessages.push({
                      msgType: '2',
                      employee,
                      orderDescription,
                      description: UB.i18n(`Для лікарняного {0} існують лікарняні {1}, періоди дії яких перетинаються! Перевірте, будь-ласка!`, orderDescription, parent.description)
                    })
                    resultData.totalComments++ // Всього зауважень
                  } else {
                    sicknessErrorMessages.push({
                      msgType: '2',
                      employee,
                      orderDescription,
                      description: UB.i18n(`Для лікарняного {0} існують наступні лікарняні {1}! Перевірте, будь-ласка!`, orderDescription, parentTo.description)
                    })
                    resultData.totalComments++ // Всього зауважень
                  }
                }
              }
            }
          }
          let expirience = {}
          if (!parentOrder) {
            const orderParams = {
              organizationID: params.orgID,
              sicknessDateFrom: dateFrom,
              employeeNumberID: empData.employeeNumberID,
              illnessReasonID: illnessReason.ID,
              employeeFamilyID: empData.employeeFamilyID,
              rate: empData.percentWork,
              flagsFix: 0,
              method: '4'
            }
            cont.emp[empData.employeeNumberID] = {
              prop: employeeService.getEmpData(empData.employeeNumberID,
                dateService.addMonths(dateService.firstDayOfYear(dateFrom), -12),
                dateService.addMonths(dateFrom, 12))
            }
            cont.employeeNumberID = empData.employeeNumberID
            const employeeSickLimit = UB.Repository('hr_employeeSickLimit')
              .attrs(['ID', 'avgSum', 'typeSickLimit', 'employeeFamilyID'])
              .where('employeeID', '=', cont.emp[empData.employeeNumberID].prop.employeeNumber.employeeID)
              .where('dateFrom', '<=', dateFrom)
              .where('dateTo', '>=', dateFrom)
              .selectAsObject()
            orderParams.payElID = illnessReason.payElFSSUID
            expirience = sicknessService.getExpirienceAndRate({
              cont, orderParams, sicknessDateFrom: dateFrom, dictIllnessReason: illnessReason, employeeSickLimit })
          }
          const isOnlyFOP = empData.workPlace !== '1'
          const dateFirst = parentOrder ? dateService.shiftDate(parentOrder.firstID ? parentOrder['firstID.dateFrom'] : parentOrder['dateFrom']) : dateFrom
          sicknessStore.run('insert', {
            execParams: {
              ID: newID,
              orderDate: orderDate,
              orderNumber: number,
              orderState: 'PROJECT',
              organizationID: params.orgID,
              employeeNumberID: empData.employeeNumberID,
              employeePositionID: empData.employeePositionID,
              employeeID: empData.employeeID,
              dateFrom: dateFrom,
              dateTo: dateTo,
              periodID: currentPeriod.ID,
              illnessKind: '3',
              number: number,
              illnessReasonID: illnessReason.ID,
              isReg: isReg,
              days: dateService.dateDiff(dateFrom, dateTo),
              parentID: parentOrder ? parentOrder.ID : null,
              firstID: parentOrder ? (parentOrder.firstID || parentOrder.ID) : null,
              dateFirst,
              isOnlyFOP,
              sickNotes: sickNotes,
              loadType: '1',
              loadDate,
              employeeFamilyID: (parentOrder ? parentOrder.employeeFamilyID : empData.employeeFamilyID) || null,
              standingYearMonth: (parentOrder ? parentOrder.standingYearMonth : expirience.standingYearMonth) || null,
              standingAllYear: (parentOrder ? parentOrder.standingAllYear : expirience.standingAll) || null,
              standingAllInYear: (parentOrder ? parentOrder.standingAllInYear : expirience.standingAllInYear) || null,
              percentWork: (parentOrder ? parentOrder.percentWork : expirience.rate) || null
            }
          })
          if (isOnlyFOP) {
            let maxDateFop = dateService.addDays(dateFirst, (illnessReason.maxDayFOP || 1) - 1)
            if (maxDateFop > dateTo) {
              maxDateFop = dateTo
            }
            if (dateFrom < maxDateFop) {
              sicknessDtStore.run('insert', {
                execParams: {
                  illnessRegime: '1',
                  empOrderSicknessID: newID,
                  dateFrom: dateFrom,
                  dateTo: maxDateFop
                }
              })
            }
            const dateFrom6 = dateFrom < maxDateFop ? dateService.addDays(maxDateFop, 1) : dateFrom
            if (dateFrom6 <= dateTo) {
              sicknessDtStore.run('insert', {
                execParams: {
                  illnessRegime: '6',
                  empOrderSicknessID: newID,
                  dateFrom: dateFrom6,
                  dateTo: dateTo
                }
              })
            }
          } else {
            sicknessDtStore.run('insert', {
              execParams: {
                illnessRegime: '1',
                empOrderSicknessID: newID,
                dateFrom: dateFrom,
                dateTo: dateTo
              }
            })
          }
        }

        if ((employeeData['employeeID.lastName'] || '').toLowerCase() !== (record['NP_SURNAME']['_text'] || '').toLowerCase() ||
          (employeeData['employeeID.firstName'] || '').toLowerCase() !== (record['NP_NAME']['_text'] || '').toLowerCase() ||
          (employeeData['employeeID.middleName'] || '').toLowerCase() !== (record['NP_PATRONYMIC']['_text'] || '').toLowerCase()
        ) {
          sicknessErrorMessages.push({ msgType: '2', employee, orderDescription, description: UB.i18n(`ПІБ {0}, що вказано у файлі завантаження, відрізняється від вказаного у системи {1}`, employee, employeeData['employeeID.fullFIO']) })
          resultData.totalComments++ // Всього зауважень
        }
        if (record['NP_PDT'] && record['NP_PDT']['_text'] && record['NP_DOC_NUM'] && record['NP_DOC_NUM']['_text']) {
          const npPdt = record['NP_PDT']['_text']
          const npDocNum = (npPdt === '2' && empIdent.substring(0, 2) === '00') ? (record['NP_DOC_NUM']['_text'] || '').toUpperCase().substring(2) : (record['NP_DOC_NUM']['_text'] || '').toUpperCase()
          switch (employeeData['employeeID.empTaxCodeType']) {
            case 'TAXCODE':
              const employeeDocs = UB.Repository('hr_employeeDocs')
                .attrs(['docSeries', 'docNumber', 'docValidUntil'])
                .where('employeeID', '=', employeeData.employeeID)
                .where('dictDocKindID.docType', 'in', ['1', '01'])
                .where('docValidUntil', 'isNull', undefined, 'dn')
                .where('docValidUntil', '>=', dateFrom, 'df')
                .logic('([dn] OR [df])')
                .selectAsObject()
              if (employeeDocs.length && !employeeDocs.find(o => `${o.docSeries || ''}${o.docNumber}`.toUpperCase() === npDocNum.toUpperCase())) {
                sicknessErrorMessages.push({ msgType: '2',
                  employee,
                  orderDescription,
                  description: UB.i18n(`Для працівника {0} номер паспорту у файлі завантаження {1}, а в системі {2}`, employeeData['employeeNumberID.description'], npDocNum,
                    employeeDocs.map(o => `${npPdt === '1' ? o.docSeries : ''}${o.docNumber}`).join(',')) })
                resultData.totalComments++ // Всього зауважень
              }
              break
            case 'PASSPORT':
              if (npPdt === '2') {
                sicknessErrorMessages.push({ msgType: '2', employee, orderDescription, description: UB.i18n(`Тип паспорта у файлі завантаження = ID-картка, а в системі Книжечка!`) })
                resultData.totalComments++ // Всього зауважень
                if (employeeData['employeeID.taxCode'].toUpperCase() !== npDocNum) {
                  sicknessErrorMessages.push({ msgType: '2', employee, orderDescription, description: UB.i18n(`Паспорт у файлі завантаження {0}, а в системі {1}!`, npDocNum, employeeData['employeeID.taxCode']) })
                  resultData.totalComments++ // Всього зауважень
                }
              }
              break
            case 'IDCARD':
              if (npPdt === '1') {
                sicknessErrorMessages.push({ msgType: '2', employee, orderDescription, description: UB.i18n(`Тип паспорта у файлі завантаження = Книжечка, а в системі ID-картка`) })
                resultData.totalComments++ // Всього зауважень
                if (employeeData['employeeID.taxCode'].toUpperCase() !== npDocNum) {
                  sicknessErrorMessages.push({ msgType: '2', employee, orderDescription, description: UB.i18n(`Паспорт у файлі завантаження {0}, а в системі {1}!`, npDocNum, employeeData['employeeID.taxCode']) })
                  resultData.totalComments++ // Всього зауважень
                }
              }
              break
          }
        }
        let empOrderSicknessID = sicknessStore.generateID()
        insertSickness(employeeData, empOrderSicknessID)
        resultData.recordCount++
        sicknessErrorMessages.forEach(row => {
          row.empOrderSicknessID = empOrderSicknessID
          errorMessages.push(row)
        })
        sicknessErrorMessages = []
        if (!illnessReason['payElFSSUID.includeSecondJobs'] && employeeData.workPlace === '1') {
          let employeePositions = UB.Repository('hr_employeePosition')
            .attrs(['ID', 'employeeNumberID', 'employeeID'])
            .where('organizationID', '=', params.orgID)
            .where('employeeID', '=', employeeData.employeeID)
            .where('workPlace', '=', '2')
            .where('employeeNumberID.dateFrom', '<=', dateTo)
            .where('employeeNumberID.dateTo', '>=', dateFrom)
            .where('dateFrom', '<=', dateFrom)
            .where('employeeNumberID', '!=', employeeData.employeeNumberID)
            .orderBy('employeeNumberID')
            .orderByDesc('dateTo')
            .selectAsObject({
              'ID': 'employeePositionID'
            })
          let empNumID
          employeePositions.forEach(employee => {
            if (empNumID !== employee.employeeNumberID) {
              empOrderSicknessID = sicknessStore.generateID()
              insertSickness(employee, empOrderSicknessID)
              sicknessErrorMessages.forEach(row => {
                row.empOrderSicknessID = empOrderSicknessID
                errorMessages.push(row)
              })
              empNumID = employee.employeeNumberID
            }
          })
        }
      }
    })
  }

  if (errorMessages.length) {
    const loadDate = new Date()
    errorMessages.forEach(message => {
      message.userID = Session.userID
      message.loadDate = loadDate
      message.periodCalcID = currentPeriod.ID
      message.orgID = params.orgID
      sicknessLogStore.run('insert', {
        execParams: message
      })
    })
  }

  let result = resultData
  resp.statusCode = 200
  resp.writeHead('Content-Type: application/json;charset=UTF-8')
  resp.writeEnd(result)
}

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (!execParams.orderNumber) {
    execParams.orderNumber = (execParams.serie || '') + execParams.number // orderService.getOrderNum(__entityName, execParams.orderDate, execParams.organizationID)
  }
}

function beforeDelete (ctx) {
  orderService.beforeDeleteOrder(ctx)
  const execParams = ctx.mParams.execParams
  const errorMessages = []
  const parents = UB.Repository('hr_empOrderSickness')
    .attrs(['ID', 'description'])
    .where('parentID', '=', execParams.ID, 'parent')
    .where('firstID', '=', execParams.ID, 'first')
    .where('ID', '!=', execParams.ID)
    .logic('[parent] or [first]')
    .selectAsObject()

  if (parents.length) {
    errorMessages.push(`${UB.i18n(`Лікарняний має продовжені документи!`)}<br>${parents.map(o => o.description).join('<br>')} `)
  }
  const inSicknessMeeting = UB.Repository('hr_sicknessMeetingDt')
    .attrs(['ID', 'sicknessMeetingID.orderState', 'sicknessMeetingID.orderNumber', 'sicknessMeetingID.orderDate'])
    .where('empOrderSicknessID', '=', execParams.ID)
    .where('empOrderSicknessID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()

  inSicknessMeeting.forEach(item => {
    if (item['sicknessMeetingID.orderState'] !== 'PROJECT') {
      errorMessages.push(UB.i18n(`Лікарняний занесен у протокол №{0} від {1}, що проведено!`, item['sicknessMeetingID.orderNumber'], item['sicknessMeetingID.orderDate']))
    }
  })

  if (errorMessages.length) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо видалити документ<br>{0}', errorMessages.join('<br>'))}>>>`)
  }

  if (inSicknessMeeting.length) {
    const store = UB.DataStore('hr_sicknessMeetingDt')
    inSicknessMeeting.forEach(item => {
      store.run('delete', {
        execParams: {
          ID: item.ID
        }
      })
    })
    store.freeNative()
  }
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  orderService.saveDetails(ctx, me.details)
  timService.cancelTimeSheet(execParams.ID)
  checkTimeSheet(ctx)
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function beforeUpdate (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  if (!ctx.mParams.simpleUpdate) {
    orderService.saveDetails(ctx, me.details)
  }
  if (execParams.serie || execParams.serie === null || execParams.number || execParams.number === null) {
    execParams.orderNumber = (execParams.serie === null ? '' : (execParams.serie || instanceData.serie || '')) +
      (execParams.number === null ? '' : (execParams.number || instanceData.number || ''))
  }
}

function afterUpdate (ctx) {
  const { execParams } = ctx.mParams
  if (!ctx.mParams.simpleUpdate) {
    ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
    if (execParams.orderState === 'POSTED') {
      me.doPosting(ctx)
    } else if (execParams.orderState === 'PROJECT') {
      me.doCancelPosting(ctx)
    } else {
      checkTimeSheet(ctx)
    }
  }
}

me.getDaycount = function ({ mParams }) {
  const { execParams } = mParams
  const { dateFrom, dateTo } = execParams
  const res = timService.getCalendarDays(dateFrom, dateTo)
  if (res) {
    mParams.result = res
  }
  return true
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}

function checkTimeSheet (ctx) {
  const { execParams } = ctx.mParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}

  const illnessKind = execParams.illnessKind || instanceData.illnessKind
  const employeePositionID = execParams.employeePositionID || instanceData.employeePositionID
  const dateTo = dateService.shiftDate(execParams.dateTo || instanceData.dateTo)
  const dateFrom = dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom)
  // const currentPeriod = periodService.getCurrentPeriod(execParams.organizationID || instanceData.organizationID)
  const employeeNumber = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID.dateFrom', 'employeeNumberID.dateTo', 'employeeNumberID', 'employeeNumberID.employeeID',
      'employeeNumberID.orgID', 'employeeNumberID.parentEmpNumberID'])
    .where('ID', '=', employeePositionID)
    .selectSingle({
      'employeeNumberID.dateFrom': 'dateFrom',
      'employeeNumberID.dateTo': 'dateTo',
      'employeeNumberID.parentEmpNumberID': 'parentEmpNumberID'
    })

  if (!employeeNumber) {
    return
  }
  const parentEmpNumbers = []
  if (employeeNumber['parentEmpNumberID']) {
    employeeService.getParentEmpNumberIDs(employeeNumber.employeeNumberID, parentEmpNumbers)
  }

  // check cross periods
  const sicknessDt = UB.Repository('hr_empOrderSicknessDt')
    .attrs('ID', 'dateFrom', 'dateTo', 'illnessRegime', 'illnessRegime.name')
    .where('empOrderSicknessID', '=', execParams.ID)
    .orderBy('dateFrom')
    .selectAsObject()
  sicknessDt.forEach(det => {
    det.dateFrom = dateService.shiftDate(det.dateFrom)
    det.dateTo = dateService.shiftDate(det.dateTo)
  })
  const dictIllnessReason = UB.Repository('hr_dictIllnessReason')
    .attrs(['maxDayFOP', 'payElFSSUID.dictTimeCostID', 'payElFOPID.dictTimeCostID',
      'payElFSSUID.includeSecondJobs', 'payElFOPID.includeSecondJobs', 'payElUnpaidID.dictTimeCostID',
      'payElUnpaidID.includeSecondJobs', 'payElFSSUID.isParentEmployeeNumber'])
    .selectById(execParams.illnessReasonID || instanceData.illnessReasonID)

  const illnessPeriod = []
  if (illnessKind === '2') {
    illnessPeriod.push({
      factTimeCostID: dictIllnessReason['payElUnpaidID.dictTimeCostID'],
      includeSecondJobs: dictIllnessReason['payElFSSUID.includeSecondJobs'],
      isParentEmployeeNumber: dictIllnessReason['payElFSSUID.isParentEmployeeNumber'],
      dateFrom,
      dateTo
    })
  } else {
    sicknessDt.forEach(det => {
      if (['5', '6'].includes(det.illnessRegime)) {
        illnessPeriod.push({
          factTimeCostID: dictIllnessReason['payElUnpaidID.dictTimeCostID'],
          includeSecondJobs: dictIllnessReason['payElFSSUID.includeSecondJobs'],
          isParentEmployeeNumber: dictIllnessReason['payElFSSUID.isParentEmployeeNumber'],
          dateFrom: det.dateFrom,
          dateTo: det.dateTo
        })
      } else if (dictIllnessReason['payElFSSUID.dictTimeCostID']) {
        illnessPeriod.push({
          factTimeCostID: dictIllnessReason['payElFSSUID.dictTimeCostID'],
          includeSecondJobs: dictIllnessReason['payElFSSUID.includeSecondJobs'],
          isParentEmployeeNumber: dictIllnessReason['payElFSSUID.isParentEmployeeNumber'],
          dateFrom: det.dateFrom,
          dateTo: det.dateTo
        })
      }
    })
  }
  const msekDateTo = dateService.shiftDate(instanceData['msekDateTo'])

  const employeeNumbers = []
  illnessPeriod.forEach(rowDt => {
    employeeNumbers.push({
      employeeNumberID: employeeNumber.employeeNumberID,
      employeeID: employeeNumber['employeeNumberID.employeeID'],
      factTimeCostID: rowDt.factTimeCostID,
      dateFrom: dateService.shiftDate(Math.max(dateService.shiftDate(rowDt.dateFrom), dateService.shiftDate(employeeNumber['dateFrom']))),
      dateTo: dateService.shiftDate(Math.min(dateService.shiftDate(rowDt.dateTo), dateService.shiftDate(employeeNumber['dateTo'])))
    })
    if (rowDt.includeSecondJobs &&
      UB.Repository('hr_employeePositionS')
        .attrs(['ID'])
        .where('employeeNumberID', '=', employeeNumber.employeeNumberID)
        .where('workPlace', '=', '1')
        .where('dateFrom', '<=', dateService.shiftDate(rowDt.dateTo))
        .where('dateTo', '>=', dateService.shiftDate(rowDt.dateFrom))
        .selectScalar()) {
      const secJobs = UB.Repository('hr_employeePositionS')
        .attrs(['employeeNumberID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo'])
        .where('employeeID', '=', employeeNumber['employeeNumberID.employeeID'])
        .where('employeeNumberID', '!=', employeeNumber.employeeNumberID)
        .where('organizationID', '=', employeeNumber['employeeNumberID.orgID'])
        .where('workPlace', '=', '2')
        .where('employeeNumberID.dateFrom', '<=', dateService.shiftDate(rowDt.dateTo))
        .where('employeeNumberID.dateTo', '>=', dateService.shiftDate(rowDt.dateFrom))
        .groupBy(['employeeNumberID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo'])
        .selectAsObject()
      secJobs.forEach(row => {
        employeeNumbers.push({
          employeeNumberID: row.employeeNumberID,
          employeeID: employeeNumber['employeeNumberID.employeeID'],
          factTimeCostID: rowDt.factTimeCostID,
          dateFrom: dateService.shiftDate(Math.max(dateService.shiftDate(rowDt.dateFrom), dateService.shiftDate(row['employeeNumberID.dateFrom']))),
          dateTo: dateService.shiftDate(Math.min(dateService.shiftDate(rowDt.dateTo), dateService.shiftDate(row['employeeNumberID.dateTo'])))
        })
      })
    }
    if (rowDt.isParentEmployeeNumber) {
      parentEmpNumbers.forEach(row => {
        if (row.dateFrom <= dateService.shiftDate(rowDt.dateTo) && row.dateTo >= dateService.shiftDate(rowDt.dateFrom)) {
          employeeNumbers.push({
            employeeNumberID: row.employeeNumberID,
            employeeID: employeeNumber['employeeNumberID.employeeID'],
            factTimeCostID: rowDt.factTimeCostID,
            dateFrom: dateService.shiftDate(Math.max(dateService.shiftDate(rowDt.dateFrom), dateService.shiftDate(row['dateFrom']))),
            dateTo: dateService.shiftDate(Math.min(dateService.shiftDate(rowDt.dateTo), dateService.shiftDate(row['dateTo'])))
          })
        }
      })
    }
  })
  employeeNumbers.forEach(row => {
    let date = dateService.shiftDate(row.dateFrom)
    const dateTo = dateService.shiftDate(row.dateTo)
    const checkTimeSheetParams = []
    while (date <= dateTo) {
      const isMsekDay = msekDateTo && msekDateTo.getTime() === date.getTime() && instanceData['msekResult'] === '1' && dictIllnessReason['payElUnpaidID.dictTimeCostID']
      if (row.factTimeCostID) {
        checkTimeSheetParams.push({
          dateWork: date,
          factTimeCostID: isMsekDay ? dictIllnessReason['payElUnpaidID.dictTimeCostID'] : row.factTimeCostID
        })
      }
      date = dateService.nextDay(date)
    }
    const message = timService.checkCrossTimeSheetInfo({
      employeeNumberID: row.employeeNumberID,
      dateFrom: dateService.shiftDate(row.dateFrom),
      dateTo: dateService.shiftDate(row.dateTo),
      timeSheetParams: checkTimeSheetParams,
      orderListID: [execParams.ID] })
    if (message) {
      ctx.mParams.message = `${ctx.mParams.message ? `${ctx.mParams.message}</br>` : ''}${message}`
    }
  })
}

me.doPosting = function (ctx) {
  const { execParams } = ctx.mParams
  const instanceData = ctx.dataStore.getAsJsObject()[0] || {}

  const illnessKind = execParams.illnessKind || instanceData.illnessKind
  const employeePositionID = execParams.employeePositionID || instanceData.employeePositionID
  const dateTo = dateService.shiftDate(execParams.dateTo || instanceData.dateTo)
  const dateFrom = dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom)
  const currentPeriod = periodService.getCurrentPeriod(execParams.organizationID || instanceData.organizationID)
  if ((currentPeriod && currentPeriod.isBlock) && !execParams.allowPosting) {
    throw new UB.UBAbort(`<<<${UB.i18n('Проведення тимчасово заборонено фахівцями з розрахунку заробітної плати')}>>>`)
  }
  const employeeNumber = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID.dateFrom', 'employeeNumberID.dateTo', 'employeeNumberID', 'employeeNumberID.employeeID',
      'employeeNumberID.orgID', 'employeeNumberID.parentEmpNumberID'])
    .where('ID', '=', employeePositionID)
    .selectSingle({
      'employeeNumberID.dateFrom': 'dateFrom',
      'employeeNumberID.dateTo': 'dateTo',
      'employeeNumberID.parentEmpNumberID': 'parentEmpNumberID'
    })

  if (!employeeNumber) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено призначення. Необхідно перевибрати працівника в документі')}>>>`)
  }
  const parentEmpNumbers = []
  if (employeeNumber['parentEmpNumberID']) {
    employeeService.getParentEmpNumberIDs(employeeNumber.employeeNumberID, parentEmpNumbers)
  }

  // check cross periods
  const sicknessDt = UB.Repository('hr_empOrderSicknessDt')
    .attrs('ID', 'dateFrom', 'dateTo', 'illnessRegime', 'illnessRegime.name')
    .where('empOrderSicknessID', '=', execParams.ID)
    .orderBy('dateFrom')
    .selectAsObject()
  sicknessDt.forEach(det => {
    det.dateFrom = dateService.shiftDate(det.dateFrom)
    det.dateTo = dateService.shiftDate(det.dateTo)
  })

  sicknessDt.forEach(det => {
    const item = sicknessDt.find(o => o.ID !== det.ID && ((o.dateFrom <= det.dateFrom && det.dateFrom <= o.dateTo) || (o.dateFrom <= det.dateTo && det.dateTo <= o.dateTo)))
    if (item) {
      throw new UB.UBAbort(`<<<${UB.i18n('Періоди перетинаються. Виправіть перед проведенням!')}>>>`)
    }
  })

  let period
  let date = dateService.shiftDate(dateFrom)
  const badDays = []
  do {
    period = sicknessDt.find(o => o.dateFrom <= date && date <= o.dateTo)
    if (!period) {
      badDays.push(dateService.formatDate(date))
    }
    date = dateService.addDays(date, 1)
  } while (date <= dateTo)
  if (badDays.length) {
    throw new UB.UBAbort(`<<<${UB.i18n('Для {0} відсутні рядки на закладці "Звільнення від роботи"! Виправіть перед проведенням!', badDays.join(','))}>>>`)
  }

  period = sicknessDt.find(o => o.dateFrom < dateFrom)
  if (period) {
    throw new UB.UBAbort(`<<<${UB.i18n('Дата початку рядка звільнення від роботи з {0} по {1} {2} меньша дати початку лікарняного! Виправіть перед проведенням!', dateService.formatDate(period.dateFrom), dateService.formatDate(period.dateTo), period['illnessRegime.name'])}>>>`)
  }
  period = sicknessDt.find(o => o.dateTo > dateTo)
  if (period) {
    throw new UB.UBAbort(`<<<${UB.i18n('Дата початку рядка звільнення від роботи з {0} по {1} {2} більше дати закінчення лікарняного! Виправіть перед проведенням!', dateService.formatDate(period.dateFrom), dateService.formatDate(period.dateTo), period['illnessRegime.name'])}>>>`)
  }

  const parentSickness = UB.Repository('hr_empOrderSickness')
    .attrs(['orderState', 'description', 'days'])
    .where('ID', '=', execParams.parentID || instanceData.parentID)
    .selectSingle()

  if (parentSickness && parentSickness.orderState === 'PROJECT') {
    throw new UB.UBAbort(`<<<${UB.i18n('Попередній лист {0} ще не проведено! Проведення неможливе!', parentSickness.description)}>>>`)
  }

  const dictIllnessReason = UB.Repository('hr_dictIllnessReason')
    .attrs(['maxDayFOP', 'payElFSSUID.dictTimeCostID', 'payElFOPID.dictTimeCostID',
      'payElFSSUID.includeSecondJobs', 'payElFOPID.includeSecondJobs', 'payElUnpaidID.dictTimeCostID',
      'payElUnpaidID.includeSecondJobs', 'payElFSSUID.isParentEmployeeNumber'])
    .selectById(execParams.illnessReasonID || instanceData.illnessReasonID)

  const timeSheetParams = []
  const illnessPeriod = []
  if (illnessKind === '2') {
    illnessPeriod.push({
      factTimeCostID: dictIllnessReason['payElUnpaidID.dictTimeCostID'],
      includeSecondJobs: dictIllnessReason['payElFSSUID.includeSecondJobs'],
      isParentEmployeeNumber: dictIllnessReason['payElFSSUID.isParentEmployeeNumber'],
      dateFrom,
      dateTo
    })
  } else {
    sicknessDt.forEach(det => {
      if (['5', '6'].includes(det.illnessRegime)) {
        illnessPeriod.push({
          factTimeCostID: dictIllnessReason['payElUnpaidID.dictTimeCostID'],
          includeSecondJobs: dictIllnessReason['payElFSSUID.includeSecondJobs'],
          isParentEmployeeNumber: dictIllnessReason['payElFSSUID.isParentEmployeeNumber'],
          dateFrom: det.dateFrom,
          dateTo: det.dateTo
        })
      } else if (dictIllnessReason['payElFSSUID.dictTimeCostID']) {
        illnessPeriod.push({
          factTimeCostID: dictIllnessReason['payElFSSUID.dictTimeCostID'],
          includeSecondJobs: dictIllnessReason['payElFSSUID.includeSecondJobs'],
          isParentEmployeeNumber: dictIllnessReason['payElFSSUID.isParentEmployeeNumber'],
          dateFrom: det.dateFrom,
          dateTo: det.dateTo
        })
      }
    })
  }
  const msekDateTo = dateService.shiftDate(instanceData['msekDateTo'])

  const employeeNumbers = []
  illnessPeriod.forEach(rowDt => {
    employeeNumbers.push({
      employeeNumberID: employeeNumber.employeeNumberID,
      employeeID: employeeNumber['employeeNumberID.employeeID'],
      factTimeCostID: rowDt.factTimeCostID,
      dateFrom: dateService.shiftDate(Math.max(dateService.shiftDate(rowDt.dateFrom), dateService.shiftDate(employeeNumber['dateFrom']))),
      dateTo: dateService.shiftDate(rowDt.dateTo) // dateService.shiftDate(Math.min(dateService.shiftDate(rowDt.dateTo), dateService.shiftDate(employeeNumber['dateTo'])))
    })
    if (rowDt.includeSecondJobs &&
      UB.Repository('hr_employeePositionS')
        .attrs(['ID'])
        .where('employeeNumberID', '=', employeeNumber.employeeNumberID)
        .where('workPlace', '=', '1')
        .where('dateFrom', '<=', dateService.shiftDate(rowDt.dateTo))
        .where('dateTo', '>=', dateService.shiftDate(rowDt.dateFrom))
        .selectScalar()) {
      const secJobs = UB.Repository('hr_employeePositionS')
        .attrs(['employeeNumberID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo'])
        .where('employeeID', '=', employeeNumber['employeeNumberID.employeeID'])
        .where('employeeNumberID', '!=', employeeNumber.employeeNumberID)
        .where('organizationID', '=', employeeNumber['employeeNumberID.orgID'])
        .where('workPlace', '=', '2')
        .where('employeeNumberID.dateFrom', '<=', dateService.shiftDate(rowDt.dateTo))
        .where('employeeNumberID.dateTo', '>=', dateService.shiftDate(rowDt.dateFrom))
        .groupBy(['employeeNumberID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo'])
        .selectAsObject()
      secJobs.forEach(row => {
        employeeNumbers.push({
          employeeNumberID: row.employeeNumberID,
          employeeID: employeeNumber['employeeNumberID.employeeID'],
          factTimeCostID: rowDt.factTimeCostID,
          dateFrom: dateService.shiftDate(Math.max(dateService.shiftDate(rowDt.dateFrom), dateService.shiftDate(row['employeeNumberID.dateFrom']))),
          dateTo: dateService.shiftDate(rowDt.dateTo) // dateService.shiftDate(Math.min(dateService.shiftDate(rowDt.dateTo), dateService.shiftDate(row['employeeNumberID.dateTo'])))
        })
      })
    }
    if (rowDt.isParentEmployeeNumber) {
      parentEmpNumbers.forEach(row => {
        if (row.dateFrom <= dateService.shiftDate(rowDt.dateTo) && row.dateTo >= dateService.shiftDate(rowDt.dateFrom)) {
          employeeNumbers.push({
            employeeNumberID: row.employeeNumberID,
            employeeID: employeeNumber['employeeNumberID.employeeID'],
            factTimeCostID: rowDt.factTimeCostID,
            dateFrom: dateService.shiftDate(Math.max(dateService.shiftDate(rowDt.dateFrom), dateService.shiftDate(row['dateFrom']))),
            dateTo: dateService.shiftDate(Math.min(dateService.shiftDate(rowDt.dateTo), dateService.shiftDate(row['dateTo']))),
            isParent: true
          })
        }
      })
    }
  })
  employeeNumbers.forEach(row => {
    let date = dateService.shiftDate(row.dateFrom)
    const dateTo = dateService.shiftDate(row.dateTo)
    const checkTimeSheetParams = []
    while (date <= dateTo) {
      const isMsekDay = msekDateTo && msekDateTo.getTime() === date.getTime() && instanceData['msekResult'] === '1' && dictIllnessReason['payElUnpaidID.dictTimeCostID']
      if (row.factTimeCostID) {
        timeSheetParams.push({
          orderID: execParams.ID,
          entityName: 'hr_empOrderSickness',
          employeeNumberID: row.employeeNumberID,
          periodID: currentPeriod.ID,
          dateWork: date,
          factTimeCostID: isMsekDay ? dictIllnessReason['payElUnpaidID.dictTimeCostID'] : row.factTimeCostID,
          factHour: 0
        })
        checkTimeSheetParams.push({
          dateWork: date,
          factTimeCostID: isMsekDay ? dictIllnessReason['payElUnpaidID.dictTimeCostID'] : row.factTimeCostID
        })
      }
      date = dateService.nextDay(date)
    }
    const message = timService.checkCrossTimeSheetInfo({
      employeeNumberID: row.employeeNumberID,
      dateFrom: dateService.shiftDate(row.dateFrom),
      dateTo: dateService.shiftDate(row.dateTo),
      timeSheetParams: checkTimeSheetParams,
      orderListID: [execParams.ID] })
    if (message) {
      ctx.mParams.message = `${ctx.mParams.message ? `${ctx.mParams.message}</br>` : ''}${message}`
    }
  })

  timService.setTimeSheet(timeSheetParams)

  sicknessDt.forEach(det => {
    if (det.illnessRegime === '4') {
      timService.cancelTimeSheetByOrder(execParams.ID, execParams.ID, currentPeriod, det.dateFrom, det.dateTo, employeeNumbers.map(o => o.employeeNumberID), true)
    }
  })

  employeeNumbers.forEach(row => {
    const timeSheetVac = UB.Repository('tim_timeSheet')
      .attrs(['dateWork', 'orderID', 'factTimeCostID.timeCostType'])
      .where('employeeNumberID', '=', row.employeeNumberID)
      .where('dateWork', '>=', row.dateFrom)
      .where('dateWork', '<=', row.dateTo)
      .where('isCanceled', '=', 0)
      .where('isActive', '=', 0)
      .where('orderID.empOrderType', '=', 'VACATION')
      .orderBy('dateWork', 'asc')
      .selectAsObject({
        'factTimeCostID.timeCostType': 'timeCostType'
      })
    if (timeSheetVac.length) {
      timeSheetVac.forEach(row => {
        row.dateWork = dateService.shiftDate(row.dateWork)
      })
      const vacationList = UB.Repository('hr_empOrderVacationListDet')
        .attrs(['dictVacationKindID', 'dateFrom', 'dateTo', 'empVacationPeriodID', 'dictVacationKindID.dayAccumCondition'])
        .where('employeeNumberID', '=', row.employeeNumberID)
        .where('orderID', 'in', _.uniq(timeSheetVac.map(o => o.orderID)))
        .where('dateFrom', '<=', row.dateTo)
        .where('dateTo', '>=', row.dateFrom)
        .selectAsObject({
          'dictVacationKindID.dayAccumCondition': 'dayAccumCondition'
        })
      vacationList.forEach(vac => {
        const vacDateFrom = dateService.shiftDate(vac.dateFrom)
        const vacDateTo = dateService.shiftDate(vac.dateTo)
        const sickDays = timeSheetVac.filter(o => vacDateFrom <= o.dateWork && o.dateWork <= vacDateTo)
        if (sickDays.length) {
          let payDays = 0
          switch (vac.dayAccumCondition) {
            case 'calend':
              payDays = sickDays.length
              break
            case 'noHolidays':
              const holidays = calendarService.getHolidays(dateService.shiftDate(Math.min(...sickDays.map(o => o.dateWork))),
                dateService.shiftDate(Math.max(...sickDays.map(o => o.dateWork))),
                execParams.organizationID || instanceData.organizationID)
              payDays = sickDays.length - holidays.length
              break
            case 'noDaysOff':
              payDays = sickDays.filter(o => o.timeCostType === 'WORK').length
          }
          if (payDays > 0) {
            let vacPeriod
            if (row.isParent) {
              vacPeriod = UB.Repository('hr_empVacationPeriod')
                .attrs('ID', 'dayCountFactCorr')
                .where('empVacationPlanID.employeeNumberID', '=', employeeNumber.employeeNumberID)
                .where('dateFrom', '<=', dateTo)
                .where('dateTo', '>=', dateFrom)
                .limit(1)
                .selectSingle()
              if (vacPeriod) {
                UB.DataStore('hr_empVacationPeriod').run('update', {
                  __skipOptimisticLock: true,
                  execParams: {
                    ID: vacPeriod.ID,
                    dayCountFactCorr: (vacPeriod.dayCountFactCorr || 0) - payDays
                  }
                })
              }
            }
            const store = UB.DataStore('hr_employeeVacation')
            const orderNumber = (execParams.serie || instanceData.serie) + (execParams.number || instanceData.number)
            const employeePosition = UB.Repository('hr_employeePositionS')
              .attrs(['ID'])
              .where('employeeNumberID', '=', row.employeeNumberID)
              .where('dateFrom', '<=', vac.dateTo)
              .where('dateTo', '>=', vac.dateFrom)
              .orderByDesc('dateTo')
              .selectSingle() || {}

            store.run('insert', {
              sicknessOperation: 1,
              execParams: {
                employeeID: row.employeeID,
                orderID: execParams.ID,
                orderNumber: orderNumber,
                orderDate: execParams.orderDate || instanceData.orderDate,
                orderState: 'POSTED',
                vacationStatus: 'SICKNESS',
                organizationID: employeeNumber['employeeNumberID.orgID'],
                employeeNumberID: row.isParent ? employeeNumber.employeeNumberID : row.employeeNumberID,
                employeePositionID: row.isParent ? employeePositionID : (employeePosition.ID || null),
                dictVacationKindID: vac.dictVacationKindID,
                dateFrom: dateFrom,
                dateTo: dateTo,
                dayCount: -1 * payDays,
                empVacationPeriodID: row.isParent ? (vacPeriod ? vacPeriod.ID : null) : vac.empVacationPeriodID,
                description: execParams.description || instanceData.description,
                isParent: row.isParent && vacPeriod ? 1 : 0
              }
            })
          }
        }
      })
    }
  })
  const parentID = execParams.parentID === undefined ? instanceData.parentID : execParams.parentID
  if (!parentID) {
    UB.DataStore('hr_empOrderSickness').run('update', {
      __skipOptimisticLock: true,
      simpleUpdate: true,
      execParams: {
        ID: execParams.ID,
        firstID: execParams.ID
      }
    })
  }

  const childStore = UB.DataStore(__entityName)

  const childSickness = UB.Repository(__entityName)
    .attrs('ID', 'parentID.firstID')
    .where('parentID', '=', execParams.ID)
    .selectAsObject()
  childSickness.forEach(row => {
    childStore.run('update', {
      __skipOptimisticLock: true,
      simpleUpdate: true,
      execParams: {
        ID: row.ID,
        firstID: row['parentID.firstID'],
        standingAllYear: execParams.standingAllYear || instanceData.standingAllYear,
        standingYearMonth: execParams.standingYearMonth || instanceData.standingYearMonth,
        percentWork: execParams.percentWork || instanceData.percentWork,
        dateFirst: dateService.shiftDate(execParams.dateFirst || instanceData.dateFirst)
      }
    })
  })

  const childSickness2 = UB.Repository(__entityName)
    .attrs('ID')
    .where('firstID', '=', execParams.ID)
    .selectAsObject()
  childSickness2.forEach(row => {
    childStore.run('update', {
      __skipOptimisticLock: true,
      simpleUpdate: true,
      execParams: {
        ID: row.ID,
        standingAllYear: execParams.standingAllYear || instanceData.standingAllYear,
        standingYearMonth: execParams.standingYearMonth || instanceData.standingYearMonth,
        percentWork: execParams.percentWork || instanceData.percentWork,
        dateFirst: dateService.shiftDate(execParams.dateFirst || instanceData.dateFirst)
      }
    })
  })
}

me.doCancelPosting = function (ctx) {
  const instanceData = ctx.dataStore.getAsJsObject()[0] || {}
  const currentPeriod = periodService.getCurrentPeriod(ctx.mParams.execParams.organizationID || instanceData.organizationID)
  if (currentPeriod && currentPeriod.isBlock) {
    throw new UB.UBAbort(`<<<${UB.i18n('Скасування проведення тимчасово заборонено фахівцями з розрахунку заробітної плати')}>>>`)
  }

  const childrenSickness = UB.Repository('hr_empOrderSickness')
    .attrs(['orderState', 'description'])
    .where('parentID', '=', instanceData.ID)
    .selectAsObject()

  childrenSickness.forEach(childSickness => {
    if (childSickness.orderState !== 'PROJECT') {
      throw new UB.UBAbort(`<<<${UB.i18n('Наступний лист {0} вже проведено! Скасування проведення неможливе!', childSickness.description)}>>>`)
    }
  })

  // Перевірити, що відсутні документи-нарахування
  const docSickness = UB.Repository('hr_docRegSickness')
    .attrs(['ID'])
    .where('empOrderSicknessID', '=', instanceData.ID)
    .limit(1)
    .selectSingle()
  if (docSickness) {
    throw new UB.UBAbort(`<<<${UB.i18n('Вже сформовані документи нарахування! Скасування проведення неможливе!')}>>>`)
  }

  // Перевірити, що лікарняний не додано у будь-який протокол соцстраху
  const inSicknessMeeting = UB.Repository('hr_sicknessMeetingDt')
    .attrs(['ID', 'sicknessMeetingID.orderState', 'sicknessMeetingID.orderNumber', 'sicknessMeetingID.orderDate'])
    .where('empOrderSicknessID', '=', instanceData.ID)
    .where('sicknessMeetingID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()

  const errorMessages = []
  inSicknessMeeting.forEach(item => {
    errorMessages.push(UB.i18n(`Лікарняний занесено у протокол №{0} від {1}.`, item['sicknessMeetingID.orderNumber'], item['sicknessMeetingID.orderDate']))
  })
  if (errorMessages.length) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо скасувати проведення!<br>{0}', errorMessages.join('<br>'))}>>>`)
  }

  timService.cancelTimeSheet(ctx.mParams.execParams.ID)

  const empVacation = UB.Repository('hr_employeeVacation')
    .attrs('ID', 'isParent', 'dayCount', 'empVacationPeriodID')
    .where('orderID', '=', instanceData.ID)
    .selectAsObject()
  const store = UB.DataStore('hr_employeeVacation')
  empVacation.forEach(row => {
    store.run('delete', {
      execParams: {
        ID: row.ID
      }
    })
    if (row.isParent && row.empVacationPeriodID) {
      const vacPeriod = UB.Repository('hr_empVacationPeriod')
        .attrs('dayCountFactCorr')
        .selectById(row.empVacationPeriodID)
      if (vacPeriod) {
        UB.DataStore('hr_empVacationPeriod').run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: row.empVacationPeriodID,
            dayCountFactCorr: (vacPeriod.dayCountFactCorr || 0) - row.dayCount
          }
        })
      }
    }
  })
}

me.getExpirienceAndRate = function (ctx) {
  const mParams = ctx.mParams
  const orderParams = JSON.parse(mParams.params)
  orderParams.sicknessDateFrom = dateService.shiftDate(orderParams.sicknessDateFrom)

  const cont = {
    orgID: orderParams.organizationID,
    org: orgService.getOrgData(orderParams.organizationID),
    payEl: payElService.getPayEl({ orgID: orderParams.organizationID }),
    emp: {}
  }
  cont.emp[orderParams.employeeNumberID] = {
    prop: employeeService.getEmpData(orderParams.employeeNumberID,
      dateService.addMonths(dateService.firstDayOfYear(orderParams.sicknessDateFrom), -12),
      dateService.addMonths(orderParams.sicknessDateFrom, 12))
  }
  cont.employeeNumberID = orderParams.employeeNumberID
  contService.initDict(cont)
  const dictIllnessReason = UB.Repository('hr_dictIllnessReason')
    .attrs(['ID', 'code', 'payElFOPID', 'maxDayFOP', 'payElFSSUID'])
    .selectById(orderParams.illnessReasonID)
  const employeeSickLimit = UB.Repository('hr_employeeSickLimit')
    .attrs(['ID', 'avgSum', 'typeSickLimit', 'employeeFamilyID'])
    .where('employeeID', '=', cont.emp[cont.employeeNumberID].prop.employeeNumber.employeeID)
    .where('dateFrom', '<=', orderParams.sicknessDateFrom)
    .where('dateTo', '>=', orderParams.sicknessDateFrom)
    .selectAsObject()
  orderParams.payElID = dictIllnessReason.payElFSSUID
  mParams.resultData = sicknessService.getExpirienceAndRate({ cont,
    orderParams,
    sicknessDateFrom: orderParams.sicknessDateFrom,
    dictIllnessReason,
    employeeSickLimit })
}

me.fixOrderState = function (ctx) {
  const mParams = ctx.mParams
  const empOrderSicknessID = mParams.empOrderSicknessID
  const newState = mParams.newState
  if (!empOrderSicknessID || !newState) return
  const orderState = UB.Repository(__entityName)
    .attrs('orderState')
    .where('ID', '=', empOrderSicknessID)
    .selectScalar()
  if (orderState === mParams.checkState) {
    const store = UB.DataStore(__entityName)
    store.execSQL(`UPDATE hr_empOrderSickness set orderState = :newState: where ID = :ID:`,
      { ID: empOrderSicknessID, newState: newState })
    store.execSQL(`UPDATE hr_order set orderState = :newState: where ID = :ID:`,
      { ID: empOrderSicknessID, newState: newState })
  }
}

me.addSubEmpOrder = function (ctx) {
  const mParams = ctx.mParams
  const params = mParams.params
  const resultOrder = []
  const employeeNumbers = []
  const order = UB.Repository('hr_empOrderSickness')
    .attrs(['ID', 'employeeID', 'organizationID', 'employeeNumberID', 'employeePositionID', 'dateFrom', 'dateTo',
      'illnessKind', 'serie', 'number', 'orderNumber', 'orderDate', 'days', 'workDays', 'dayFSSU', 'periodID',
      'illnessReasonID', 'employeeFamilyID', 'parentID', 'firstID', 'msekDateFrom', 'msekDateTo', 'msekResult',
      'actNumber', 'actDate', 'nextNumber', 'workDate', 'isReg', 'sickNotes', 'easyDateFrom', 'easyDateTo',
      'standingAllYear', 'standingAllInYear', 'workLess6months', 'standingYearMonth', 'percentWork', 'employeeSickLimitID',
      'flagsFix', 'loadType'
    ]).selectById(params.orderID)
  /*
  const empOrderSicknessDt = UB.Repository('hr_empOrderSicknessDt')
    .attrs(['dateFrom', 'dateTo', 'illnessRegime'])
    .where('empOrderSicknessID', '=', params.orderID)
    .selectAsObject()
  */
  const parent = order.parentID ? UB.Repository('hr_empOrderSickness')
    .attrs(['ID', 'illnessReasonID', 'dateFrom', 'dateTo']).selectById(order.parentID) : null
  const sicknessStore = UB.DataStore('hr_empOrderSickness')
  const sicknessDtStore = UB.DataStore('hr_empOrderSicknessDt')
  if (order) {
    order.dateFrom = dateService.shiftDate(order.dateFrom)
    order.dateTo = dateService.shiftDate(order.dateTo)
    const employeePosition = UB.Repository('hr_employeePosition')
      .attrs(['ID', 'employeeID', 'employeeNumberID'])
      .where('organizationID', '=', order.organizationID)
      .where('employeeID', '=', order.employeeID)
      .where('employeeNumberID', '!=', order.employeeNumberID)
      .where('workPlace', '=', '2')
      .where('dateFrom', '<=', order.dateTo)
      .where('dateTo', '>=', order.dateFrom)
      .orderBy('dateFrom')
      .selectAsObject({
        'ID': 'employeePositionID'
      })
    employeePosition.forEach(row => {
      if (!employeeNumbers.find(o => o.employeeNumberID === row.employeeNumberID)) {
        employeeNumbers.push(row)
      }
    })
    employeeNumbers.forEach(employeeNumber => {
      let existsSickness = false
      const empOrderSickness = UB.Repository('hr_empOrderSickness')
        .attrs(['ID', 'orderState'])
        .where('organizationID', '=', order.organizationID)
        .where('employeeNumberID', '=', employeeNumber.employeeNumberID)
        .where('illnessReasonID', '=', order.illnessReasonID)
        .where('dateFrom', '=', order.dateFrom)
        .where('dateTo', '=', order.dateTo)
        .whereIf(order.employeeFamilyID, 'employeeFamilyID', '=', order.employeeFamilyID)
        .whereIf(order.employeeFamilyID, 'employeeFamilyID', 'isNull')
        .selectAsObject()
      empOrderSickness.forEach(sick => {
        if (!existsSickness) {
          if (sick.orderState === 'PROJECT') {
            existsSickness = true
          } else {
            const timeSheetDayCanceled = UB.Repository('tim_timeSheet')
              .attrs('count([ID])')
              .where('orderID', '=', sick.ID)
              .where('isCanceled', '=', 1)
              .selectScalar()
            if (timeSheetDayCanceled) {
              existsSickness = true
            }
          }
        }
      })
      if (!existsSickness) {
        const newOrder = Object.assign(Object.assign({ orderState: 'PROJECT' }, order), employeeNumber)
        newOrder.ID = sicknessStore.generateID()
        newOrder.parentID = null
        if (order.parentID) {
          if (parent) {
            const newParent = UB.Repository('hr_empOrderSickness')
              .attrs(['ID', 'dateFrom', 'dateFirst', 'firstID', 'firstID.dateFrom'])
              .where('organizationID', '=', order.organizationID)
              .where('employeeNumberID', '=', employeeNumber.employeeNumberID)
              .where('illnessReasonID', '=', parent.illnessReasonID)
              .where('dateFrom', '=', parent.dateFrom)
              .where('dateTo', '=', parent.dateTo)
              .limit(1)
              .selectSingle() || null
            if (newParent) {
              newOrder.parentID = newParent.ID
              newOrder.firstID = newParent.firstID
              newOrder.dateFirst = newParent['firstID.dateFrom'] || newParent.dateFirst || newParent.dateFrom
            }
          }
        }
        newOrder.isOnlyFOP = 1
        sicknessStore.run('insert', {
          execParams: newOrder
        })
        const dateFirst = dateService.shiftDate(newOrder.parentID ? newOrder['dateFirst'] : newOrder['dateFrom'])
        const dateFrom = dateService.shiftDate(newOrder.dateFrom)
        const dateTo = dateService.shiftDate(newOrder.dateTo)
        const illnessReason = UB.Repository('hr_dictIllnessReason')
          .attrs('maxDayFOP')
          .selectById(newOrder.illnessReasonID)
        let maxDateFop = dateService.addDays(dateFirst, (illnessReason.maxDayFOP || 1) - 1)
        if (maxDateFop > dateTo) {
          maxDateFop = dateTo
        }
        if (dateFrom < maxDateFop) {
          sicknessDtStore.run('insert', {
            execParams: {
              illnessRegime: '1',
              empOrderSicknessID: newOrder.ID,
              dateFrom: dateFrom,
              dateTo: maxDateFop
            }
          })
        }
        const dateFrom6 = dateFrom < maxDateFop ? dateService.addDays(maxDateFop, 1) : dateFrom
        if (dateFrom6 <= dateTo) {
          sicknessDtStore.run('insert', {
            execParams: {
              illnessRegime: '6',
              empOrderSicknessID: newOrder.ID,
              dateFrom: dateFrom6,
              dateTo: dateTo
            }
          })
        }
        /*
        empOrderSicknessDt.forEach(rowDt => {
          rowDt.empOrderSicknessID = newOrder.ID
          sicknessDtStore.run('insert', {
            execParams: rowDt
          })
        })
        */
        resultOrder.push(newOrder.ID)
      }
    })

    mParams.resultData = JSON.stringify(resultOrder)
  }
}

me.deleteLastLoad = function (ctx) {
  const mParams = ctx.mParams
  const loadDate = UB.Repository('hr_empOrderSickness')
    .attrs(['MAX([loadDate])'])
    .where('organizationID', '=', mParams.orgID)
    .where('loadType', '=', '1')
    .selectScalar()
  if (loadDate) {
    const store = UB.DataStore('hr_empOrderSickness')
    const empOrderSickness = UB.Repository('hr_empOrderSickness')
      .attrs(['ID'])
      .where('organizationID', '=', mParams.orgID)
      .where('loadType', '=', '1')
      .where('loadDate', '>=', loadDate)
      .where('orderState', '=', 'PROJECT')
      .orderByDesc('dateFrom')
      .selectAsObject()
    empOrderSickness.forEach(order => {
      store.run('delete', { execParams: { ID: order.ID } })
    })
  }
}
