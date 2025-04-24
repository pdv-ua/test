const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const settings = require('../AC/modules/entityServices/settingsService')
const messageService = require('../HR/modules/messageService')
const employeeService = require('../HR/modules/employeeService')
const documentService = require('../AC/modules/entityServices/documentService')
const mustache = require('mustache')
const { date } = require('jszip/lib/defaults')

me.details = [
  {
    detailName: 'receiverList',
    entityName: 'hr_dictMailTmplByEventsDt',
    docIDName: 'dictMailTmplByEventsID',
    fieldList: documentService.setFieldListAttribute([
      'employeeNumberID.description', 'email'], ['lineNum'])
  }
]

me.entity.addMethod('mailVocationEventScheduler')
me.entity.addMethod('mailExpReminderScheduler')
me.entity.addMethod('mailDeclineDocEvent')
/*
me.entity.addMethod('sendTestMail')
*/
me.on('insert:after', afterInsert)
me.on('select:after', afterSelect)
me.on('update:before', beforeUpdate)

function afterInsert (ctx) {
  documentService.saveDetails(ctx, me.details)
  const execParams = ctx.mParams.execParams
  ctx.mParams.detail = documentService.getEntityDetail(execParams.ID, me.details)
}

function beforeUpdate (ctx) {
  documentService.saveDetails(ctx, me.details)
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    mParams.detail = documentService.getEntityDetail(mParams.ID, me.details)
  }
}

me.mailVocationEventScheduler = (ctx) => {
  const currentDate = dateService.currentDate()
  const dictByEvents = UB.Repository('hr_dictMailTmplByEvents')
    .attrs(['*'])
    .where('notificationTerm1', 'isNotNull', undefined, 'notificationTerm1')
    .where('notificationTerm2', 'isNotNull', undefined, 'notificationTerm2')
    .where('notificationTerm3', 'isNotNull', undefined, 'notificationTerm3')
    .where('notificationKind', '=', 'vocationEvent')
    .logic('(([notificationTerm1]) OR ([notificationTerm2]) OR ([notificationTerm3]))')
    .selectAsObject()

  dictByEvents.forEach(dict => {
    const dictOrgID = dict.organizationID
    const hrVacFixMonth = settings.get('hrVacFixMonth', dictOrgID)
    const dateList = []
    if (dict.notificationTerm1) dateList.push({ notificationTerm: dict.notificationTerm1, date: dateService.addDays(dateService.addMonths(currentDate, -hrVacFixMonth), dict.notificationTerm1) })
    if (dict.notificationTerm2) dateList.push({ notificationTerm: dict.notificationTerm2, date: dateService.addDays(dateService.addMonths(currentDate, -hrVacFixMonth), dict.notificationTerm2) })
    if (dict.notificationTerm3) dateList.push({ notificationTerm: dict.notificationTerm3, date: dateService.addDays(dateService.addMonths(currentDate, -hrVacFixMonth), dict.notificationTerm3) })

    const sendQueue = []
    const mailerList = UB.Repository('hr_dictMailTmplByEventsDt')
      .attrs(['employeeNumberID', 'email'])
      .where('dictMailTmplByEventsID', '=', dict.ID)
      .where('email', 'isNotNull')
      .selectAsObject()

    mailerList.forEach(emp => {
      const subordinatesList = employeeService.getSubordinates(emp.employeeNumberID, currentDate)
      const empVacationPeriod = UB.Repository('hr_empVacationPeriod')
        .attrs(['empVacationPlanID.employeeNumberID', 'empVacationPlanID.employeeID.shortFIO', 'dateFrom', 'dateTo', 'dayDiff'])
        .where('empVacationPlanID.employeeNumberID', 'in', subordinatesList.map(o => o.employeeNumberID))
        .where('dateFrom', 'in', dateList.map(o => o.date))
        .where('dayDiff', 'isNotNull')
        .where('dayDiff', '>', 0)
        .selectAsObject({
          'empVacationPlanID.employeeNumberID': 'employeeNumberID',
          'empVacationPlanID.employeeID.shortFIO': 'shortFIO'
        })
      if (empVacationPeriod && empVacationPeriod.length) {
        let notificationText = ''
        dateList.forEach(deadline => {
          let empVacList = empVacationPeriod.filter(o => dateService.formatDate(dateService.shiftDate(o.dateFrom)) === dateService.formatDate(dateService.shiftDate(deadline.date)))
          if (empVacList.length) {
            notificationText = notificationText.length ? notificationText + `\n через <b>${deadline.notificationTerm} днів</b> будуть зафіксовані невикористані дні відпустки у працівників: \n`
              : `Нагадуємо вам, що \n\n через <b>${deadline.notificationTerm} днів</b> будуть зафіксовані невикористані дні відпустки у працівників: \n`

            empVacList.forEach(el => {
              notificationText += `   - ${el.shortFIO} ${el.dayDiff} невикористаних днів (за період з ${dateService.formatDate(el.dateFrom)}${el.dateTo ? ' по ' + dateService.formatDate(el.dateTo) : ''}) \n`
            })
          }
        })

        const employeeGroupList = UB.Repository('hr_employeeGroup')
          .attrs('ID', 'name', 'isAllEmployees', 'organizationID')
          .where('chiefID', '=', emp.employeeNumberID)
          .where('dateFrom', '<=', currentDate)
          .where('dateTo', '>=', currentDate)
          .selectAsObject()
        const isAllEmployees = employeeGroupList.find(el => el.isAllEmployees)

        let sendList = [emp]
        if (isAllEmployees) {
          let empList = UB.Repository('hr_employeeNumberS')
            .attrs('ID', 'employeeID')
            .where('orgID', '=', isAllEmployees.organizationID)
            .where('dateFrom', '<=', currentDate)
            .where('dateTo', '>=', currentDate)
            .selectAsObject({
              'ID': 'employeeNumberID'
            })
          sendList = sendList.concat(empList)
        }

        sendList.forEach(empData => {
          const employeeNumberData = UB.Repository('hr_employeeNumberS')
            .attrs([
              'employeeID.fullFIO', 'employeeID.shortFIO',
              'employeeID.genName', 'employeeID.lastName', 'employeeID.firstName',
              'employeeID.middleName', 'employeeID.datName', 'employeeID.accusativeName',
              'employeeID.insName', 'employeeID.locName', 'employeeID.vocName',
              'employeeID.engName'])
            .selectById(empData.employeeNumberID) || {}

          let mailText = mustache.render(dict.docText, {
            notificationText: notificationText,
            firstName: employeeNumberData['employeeID.firstName'] || '',
            lastName: employeeNumberData['employeeID.lastName'] || '',
            middleName: employeeNumberData['employeeID.middleName'] || '',
            shortFIO: employeeNumberData['employeeID.shortFIO'] || '',
            fullFIO: employeeNumberData['employeeID.fullFIO'] || '',
            genName: employeeNumberData['employeeID.genName'] || '',
            datName: employeeNumberData['employeeID.datName'] || '',
            accusativeName: employeeNumberData['employeeID.accusativeName'] || '',
            insName: employeeNumberData['employeeID.insName'] || '',
            locName: employeeNumberData['employeeID.locName'] || '',
            vocName: employeeNumberData['employeeID.vocName'] || '',
            engName: employeeNumberData['employeeID.engName'] || ''
          }).replace(/\n/g, '<br />')
          mailText = mailText.length ? `<html><body>` + mailText + `</body></html>` : ''

          let imageParams = messageService.getImageListFromHTMLString(mailText)
          let attachments = []
          if (imageParams.imageList.length) {
            mailText = imageParams.newHtml
            attachments = imageParams.imageList
          }

          if (!empData.email) {
            let employeeContact = UB.Repository('hr_employeeContact')
              .attrs(['ID', 'employeeID', 'value'])
              .where('employeeID', 'in', empData.employeeID || 0)
              .where('contactTypeID.code', '=', 'email')
              .where('isSystemNotificationAddress', '=', true)
              .selectSingle()
            empData.email = employeeContact ? employeeContact.value : null
          }

          if (empData.email) {
            const execParams = {
              subject: 'Невикористані відпустки',
              mailText: mailText,
              emailList: [empData.email]
            }
            if (attachments.length) execParams.attachments = attachments

            sendQueue.push({ email: empData.email, execParams })
          }
        })
      }
    })

    sendQueue.filter((obj, index, self) => {
      return self.findIndex(o => o.email === obj.email) === index
    }).forEach(el => {
      messageService.sendMailSstmMsg(el.execParams)
    })
  })
}

me.mailExpReminderScheduler = (ctx) => {
  const currentDate = dateService.currentDate()
  const dictByEvents = UB.Repository('hr_dictMailTmplByEvents')
    .attrs(['*'])
    .where('notificationTerm1', 'isNotNull', undefined, 'notificationTerm1')
    .where('notificationTerm2', 'isNotNull', undefined, 'notificationTerm2')
    .where('notificationTerm3', 'isNotNull', undefined, 'notificationTerm3')
    .where('notificationKind', '=', 'monthlyExpReminder')
    .logic('(([notificationTerm1]) OR ([notificationTerm2]) OR ([notificationTerm3]))')
    .selectAsObject()

  dictByEvents.forEach(dict => {
    const sendQueue = []
    const mailerList = UB.Repository('hr_dictMailTmplByEventsDt')
      .attrs(['employeeNumberID', 'email'])
      .where('dictMailTmplByEventsID', '=', dict.ID)
      .where('email', 'isNotNull')
      .selectAsObject()

    const employeeIDs = UB.Repository('hr_employeeNumber')
      .attrs(['employeeID'])
      .where('orgID', '=', dict.organizationID)
      .selectAsObject().map(o => o.employeeID)

    let employeeExperience = UB.Repository('hr_employeeExperience')
      .attrs(['*', 'dictExperienceID.name', 'employeeID.shortFIO', 'employeeID.fullFIO'])
      .where('dictExperienceID', '=', dict.dictExperienceID || 0)
      .where('employeeNumberID', 'isNull', undefined, 'numNull')
      .where('employeeNumberID.orgID', '=', dict.organizationID, 'numOrg')
      .where('employeeID', 'in', employeeIDs, 'empToOrg')
      .logic('([numOrg] OR ([numNull] AND [empToOrg]))')
      .selectAsObject({
        'dictExperienceID.name': 'experienceName',
        'employeeID.shortFIO': 'shortFIO',
        'employeeID.fullFIO': 'fullFIO'
      })

    const empExpList = {
      1: employeeExperience.filter(exp => new Date(exp.calcDate) >= dateService.addYears(currentDate, -dict.notificationTerm1) && new Date(exp.calcDate) < dateService.addMonths(dateService.addYears(currentDate, -dict.notificationTerm1), 1)),
      2: employeeExperience.filter(exp => new Date(exp.calcDate) >= dateService.addYears(currentDate, -dict.notificationTerm2) && new Date(exp.calcDate) < dateService.addMonths(dateService.addYears(currentDate, -dict.notificationTerm2), 1)),
      3: employeeExperience.filter(exp => new Date(exp.calcDate) >= dateService.addYears(currentDate, -dict.notificationTerm3) && new Date(exp.calcDate) < dateService.addMonths(dateService.addYears(currentDate, -dict.notificationTerm3), 1))
    }

    if (empExpList['1'].length || empExpList['2'].length || empExpList['3'].length) {
      let notificationText = `Нагадування працівникові відділу управління персоналом\nУ поточному місяці (${dateService.formatDate(currentDate, 'mmmm')}):`
      for (let i = 1; i <= 3; i++) {
        if (empExpList[i].length) {
          notificationText += `\n\nу співробітників:`
          empExpList[i].forEach(epm => {
            notificationText += `\n${epm.shortFIO || epm.fullFIO}`
          })
          notificationText += `\n${dict.experienceName || 'Стаж'} стає ${dict[`notificationTerm${i}`]} роки`
        }
      }
      mailerList.forEach(empReciever => {
        const employeeGroupList = UB.Repository('hr_employeeGroup')
          .attrs('ID', 'name', 'isAllEmployees', 'organizationID')
          .where('chiefID', '=', empReciever.employeeNumberID)
          .where('dateFrom', '<=', currentDate)
          .where('dateTo', '>=', currentDate)
          .selectAsObject()
        const isAllEmployees = employeeGroupList.find(el => el.isAllEmployees)

        let sendList = [empReciever]
        if (isAllEmployees) {
          let empList = UB.Repository('hr_employeeNumberS')
            .attrs('ID', 'employeeID')
            .where('orgID', '=', isAllEmployees.organizationID)
            .where('dateFrom', '<=', currentDate)
            .where('dateTo', '>=', currentDate)
            .selectAsObject({
              'ID': 'employeeNumberID'
            })
          sendList = sendList.concat(empList)
        }

        sendList.forEach(empData => {
          const employeeNumberData = UB.Repository('hr_employeeNumberS')
            .attrs([
              'employeeID.fullFIO', 'employeeID.shortFIO',
              'employeeID.genName', 'employeeID.lastName', 'employeeID.firstName',
              'employeeID.middleName', 'employeeID.datName', 'employeeID.accusativeName',
              'employeeID.insName', 'employeeID.locName', 'employeeID.vocName',
              'employeeID.engName'])
            .selectById(empData.employeeNumberID) || {}

          let mailText = mustache.render(dict.docText, {
            notificationText: notificationText,
            firstName: employeeNumberData['employeeID.firstName'] || '',
            lastName: employeeNumberData['employeeID.lastName'] || '',
            middleName: employeeNumberData['employeeID.middleName'] || '',
            shortFIO: employeeNumberData['employeeID.shortFIO'] || '',
            fullFIO: employeeNumberData['employeeID.fullFIO'] || '',
            genName: employeeNumberData['employeeID.genName'] || '',
            datName: employeeNumberData['employeeID.datName'] || '',
            accusativeName: employeeNumberData['employeeID.accusativeName'] || '',
            insName: employeeNumberData['employeeID.insName'] || '',
            locName: employeeNumberData['employeeID.locName'] || '',
            vocName: employeeNumberData['employeeID.vocName'] || '',
            engName: employeeNumberData['employeeID.engName'] || ''
          }).replace(/\n/g, '<br />')

          let attachments = []
          mailText = mailText.length ? `<html><body>` + mailText + `</body></html>` : ''
          let imageParams = messageService.getImageListFromHTMLString(mailText)
          if (imageParams.imageList.length) {
            mailText = imageParams.newHtml
            attachments = imageParams.imageList
          }

          if (!empData.email) {
            let employeeContact = UB.Repository('hr_employeeContact')
              .attrs(['ID', 'employeeID', 'value'])
              .where('employeeID', 'in', empData.employeeID || 0)
              .where('contactTypeID.code', '=', 'email')
              .where('isSystemNotificationAddress', '=', true)
              .selectSingle()
            empData.email = employeeContact ? employeeContact.value : null
          }

          if (empData.email) {
            const execParams = {
              subject: dict.subject || 'Нагадування про зміну стажу та необхідність створення документу тарифікації про зміну відсотків по надбавці за вислугу\n' +
                  'років.',
              mailText: mailText,
              emailList: [empData.email]
            }
            if (attachments.length) execParams.attachments = attachments

            sendQueue.push({ email: empData.email, execParams })
          }
        })
      })
    }

    sendQueue.filter((obj, index, self) => {
      return self.findIndex(o => o.email === obj.email) === index
    }).forEach(el => {
      messageService.sendMailSstmMsg(el.execParams)
    })
  })
}

me.mailDeclineDocEvent = (ctx) => {
  const mParams = ctx.mParams
  const taskID = mParams.taskID
  const docID = mParams.docID
  const resolutionText = mParams.resolutionText
  const organizationID = mParams.organizationID
  const task = UB.Repository('hr_task')
    .attrs(['ID', 'docID.empOrderType'])
    .selectById(taskID)

  const dictByEvents = UB.Repository('hr_dictMailTmplByEvents')
    .attrs(['*'])
    .where('organizationID', '=', organizationID)
    .where('notificationKind', '=', 'declineDocEvent')
    .orderBy('mi_createDate')
    .selectSingle()
  let docData
  if (task && task['docID.empOrderType'] === 'REQUEST') {
    docData = UB.Repository('hr_request')
      .attrs(['ID', 'employeeNumberID.employeeID', 'employeeNumberID'])
      .where('ID', '=', docID)
      .selectSingle({
        'employeeNumberID.employeeID': 'employeeID'
      })
  } else {
    docData = UB.Repository('hr_empOrder')
      .attrs(['ID', 'mi_modifyUser.employeeNumberID.employeeID', 'mi_modifyUser.employeeNumberID'])
      .where('ID', '=', docID)
      .selectSingle({
        'mi_modifyUser.employeeNumberID.employeeID': 'employeeID',
        'mi_modifyUser.employeeNumberID': 'employeeNumberID'
      })
  }
  const emailEmpData = docData ? UB.Repository('hr_employeeContact')
    .attrs(['ID', 'employeeID', 'value'])
    .where('employeeID', '=', docData['employeeID'])
    .where('contactTypeID.code', '=', 'email')
    .where('isSystemNotificationAddress', '=', true)
    .selectSingle() : null
  if (dictByEvents && emailEmpData && emailEmpData.value) {
    const employeeNumberData = UB.Repository('hr_employeeNumberS')
      .attrs([
        'employeeID.fullFIO', 'employeeID.shortFIO',
        'employeeID.genName', 'employeeID.lastName', 'employeeID.firstName',
        'employeeID.middleName', 'employeeID.datName', 'employeeID.accusativeName',
        'employeeID.insName', 'employeeID.locName', 'employeeID.vocName',
        'employeeID.engName'])
      .selectById(docData.employeeNumberID) || {}

    let mailText = mustache.render(dictByEvents.docText, {
      firstName: employeeNumberData['employeeID.firstName'] || '',
      lastName: employeeNumberData['employeeID.lastName'] || '',
      middleName: employeeNumberData['employeeID.middleName'] || '',
      shortFIO: employeeNumberData['employeeID.shortFIO'] || '',
      fullFIO: employeeNumberData['employeeID.fullFIO'] || '',
      genName: employeeNumberData['employeeID.genName'] || '',
      datName: employeeNumberData['employeeID.datName'] || '',
      accusativeName: employeeNumberData['employeeID.accusativeName'] || '',
      insName: employeeNumberData['employeeID.insName'] || '',
      locName: employeeNumberData['employeeID.locName'] || '',
      vocName: employeeNumberData['employeeID.vocName'] || '',
      engName: employeeNumberData['employeeID.engName'] || '',
      resolutionText: resolutionText
    }).replace(/\n/g, '<br />')
    let attachments = []
    mailText = mailText.length ? `<html><body>` + mailText + `</body></html>` : ''
    let imageParams = messageService.getImageListFromHTMLString(mailText)
    if (imageParams.imageList.length) {
      mailText = imageParams.newHtml
      attachments = imageParams.imageList
    }

    const execParams = {
      subject: dictByEvents.subject || 'Відхилення документу',
      mailText: mailText,
      emailList: [emailEmpData.value]
    }
    if (attachments.length) execParams.attachments = attachments

    messageService.sendMailSstmMsg(execParams)
  }
}
/*
me.sendTestMail = (ctx) => {
  const mParams = ctx.mParams
  const email = mParams.email
  const subject = mParams.subject
  const text = mParams.text

  const execParams = {
    subject: subject,
    mailText: `<html><body>` + text + `</body></html>`,
    emailList: [email]
  }

  const resp = messageService.sendMailTestMsg(execParams)
  mParams.errorMsgList = resp.length ? resp : null
} */
