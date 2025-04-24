const UB = require('@unitybase/ub')
const settingsService = require('../../AC/modules/entityServices/settingsService')
const dateService = require('../../AC/modules/dataServices/dateService')
const UBMail = require('@unitybase/mailer')
const mailQueue = require('@unitybase/ubq/modules/mail-queue')
const mustache = require('mustache')

const App = UB.App

module.exports = {
  message,
  taskMessage,

  mailTaskNotification,
  sendMailSstmMsg,
  getImageListFromHTMLString
  /* sendMailTestMsg */
}

function message ({ messageType = 'user', text, dateFrom, dateTo, employeeNumberIDs = [], entity, instanceID, description }) {
  if (!employeeNumberIDs.length || !text) {
    return
  }
  const userIDs = UB.Repository('uba_user')
    .attrs('ID')
    .where('employeeNumberID', 'in', employeeNumberIDs)
    .selectAsObject().map(o => o.ID)
  if (!userIDs.length) {
    return
  }
  let refText = ''
  if (entity && instanceID && description) {
    refText = `<a href="#" data-cmd-type="showForm" data-entity="${entity}", data-instance-id=${instanceID}>${description}</a>`
  }
  const messageStore = UB.DataStore('ubs_message_edit')
  const recipientStore = UB.DataStore('ubs_message_recipient')
  const messageID = messageStore.generateID()
  const startDate = new Date(dateFrom || dateService.unshiftDate(dateService.currentDateTime()))
  const expireDate = new Date(dateTo || dateService.addMonths(startDate, 2))
  messageStore.run('insert', {
    execParams: {
      ID: messageID,
      complete: true,
      messageType,
      startDate,
      expireDate,
      messageBody: UB.i18n(text, refText)
    }
  })
  userIDs.forEach(userID => {
    recipientStore.run('insert', {
      execParams: {
        messageID,
        userID
      }
    })
  })
}

function taskMessage (params) {
  if (settingsService.getByCode('hrTaskMessage', params.orgID || null)) {
    message(params)
  }
}

function mailTaskNotification ({ employeeNumberID, instanceID, subject, entity, showForm, orgID, employeePositionID, docID, taskData }) {
  if (settingsService.getByCode('hrMailNotification', orgID || null)) {
    const params = {}
    if (!employeeNumberID) {
      return
    }
    const mailerParams = App.serverConfig.application.customSettings.mailerConfig
    if (!mailerParams) {
      throw new Error('В файлі концігурації не налаштовано конфігурацію відправки листів')
    }
    let mailText = ''
    let mailSubject = ''
    let refText = ''
    let attachments = []
    if (entity && instanceID && subject && showForm) {
      refText = `<a href="${App.externalURL}/#cmdType=showForm&entity=${entity}&formCode=${showForm}&instanceID=${instanceID}">${subject}</a>`
    }
    let mailTextDefault = UB.i18n('Вам призначено нове завдання з погодження документа.</br>Для опрацювання Ви можете перейти до переліку завдань ("Мої завдання" на робочому столі "Документи"),</br>або просто перейти за цим посиланням: {0}'
      , refText)

    let docType = UB.Repository('hr_order').attrs(['empOrderType.code']).selectById(docID)
    const dictMailTmpl = UB.Repository('hr_dictMailTmplByRecProc').attrs(['docText', 'subject']).where('empOrderType', '=', docType['empOrderType.code']).where('organizationID', '=', orgID).selectSingle()
    if (dictMailTmpl) {
      const employeeNumberData = UB.Repository('hr_employeeNumberS')
        .attrs([
          'employeeID.fullFIO', 'employeeID.shortFIO',
          'employeeID.genName', 'employeeID.lastName', 'employeeID.firstName',
          'employeeID.middleName', 'employeeID.datName', 'employeeID.accusativeName',
          'employeeID.insName', 'employeeID.locName', 'employeeID.vocName',
          'employeeID.engName'])
        .selectById(employeeNumberID) || {}

      mailText = dictMailTmpl.docText || ''
      mailSubject = dictMailTmpl.subject || ''

      const doc = UB.Repository('hr_order')
        .attrs(['ID', 'orderClass.entityName'])
        .selectById(taskData.docID)
      const docData = UB.Repository(doc['orderClass.entityName'])
        .attrs(['ID', 'description'])
        .selectById(taskData.docID)
      const docLink = `<a href="${App.externalURL}/#cmdType=showForm&entity=${doc['orderClass.entityName']}&instanceID=${doc.ID}">${docData.description}</a>`

      const textData = {
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
      }
      mailText = mustache.render(mailText, textData).replace(/\n/g, '<br />')
      const textDataLinks = [
        { text: '{taskLink}', value: refText },
        { text: '{docLink}', value: docLink }
      ]
      textDataLinks.forEach(link => {
        mailText = mailText.replace(new RegExp(link.text, 'g'), link.value)
      })
    }

    mailText = mailText.length ? `<html><body>` + mailText + `</body></html>` : mailTextDefault
    let imageParams = getImageListFromHTMLString(mailText)
    if (imageParams.imageList.length) {
      mailText = imageParams.newHtml
      attachments = imageParams.imageList
    }
    let empList = UB.Repository('hr_employeePosition').attrs(['employeeID']).where('ID', '=', employeePositionID).selectAsObject()
    let emailList = UB.Repository('hr_employeeContact')
      .attrs(['ID', 'employeeID', 'value'])
      .where('employeeID', 'in', empList.map(o => o.employeeID))
      .where('contactTypeID.code', '=', 'email')
      .where('isSystemNotificationAddress', '=', true)
      .selectAsObject()
    if (emailList.length) {
      try {
        const message = {
          subject: mailSubject.length ? mailSubject : `У вас нове завдання!`,
          bodyType: UBMail.TubSendMailBodyType.HTML,
          body: mailText,
          from: mailerParams.fromAddr || 'no-reply@a5erp.solutions',
          to: emailList.map(o => o.value)
        }
        if (attachments.length) message.attachments = attachments
        mailQueue.queueMail(message)
        params.ok = true
      } catch (e) {
        params.message = e.message
      }
    }
  }
}

function getImageListFromHTMLString (htmlText) {
  let imageList = []
  let newHtml = ''
  let attachCounter = 0
  const searchTermFirst = 'src="'
  const searchTermSecond = '"'

  let lastFindedIdx = htmlText.indexOf(searchTermFirst)
  while (lastFindedIdx > 0) {
    attachCounter++
    let attachCid = 'attach' + attachCounter
    newHtml += htmlText.slice(0, lastFindedIdx + 5) + `cid:${attachCid}"`
    htmlText = htmlText.slice(lastFindedIdx + 5)
    lastFindedIdx = htmlText.indexOf(searchTermSecond)

    let srcImg = htmlText.slice(0, lastFindedIdx)
    srcImg = srcImg.replace('data:image/jpeg;base64,', '')

    imageList.push({
      kind: UBMail.TubSendMailAttachKind.Text,
      attachName: `${attachCid}`,
      contentID: `${attachCid}`,
      data: srcImg, // Buffer.from('atach2 text').toString('base64'),
      isBase64: true
    })
    htmlText = htmlText.slice(lastFindedIdx)
    lastFindedIdx = htmlText.indexOf(searchTermFirst)
  }
  newHtml += htmlText
  return { imageList, newHtml }
}

function sendMailSstmMsg ({ subject, mailText, emailList, attachments = [] }) {
  const mailerParams = App.serverConfig.application.customSettings.mailerConfig
  if (!mailerParams) {
    throw new Error('В файлі концігурації не налаштовано конфігурацію відправки листів')
  }
  const message = {
    subject: subject || '',
    bodyType: UBMail.TubSendMailBodyType.HTML,
    body: mailText || '',
    from: mailerParams.fromAddr || 'no-reply@a5erp.solutions',
    to: emailList
  }
  if (attachments.length) message.attachments = attachments
  mailQueue.queueMail(message)
}

