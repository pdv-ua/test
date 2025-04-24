/* global _ $App AC UB appAC Ext */
exports.formCode = {
  initComponentStart,
  onInitComponentDone,
  onFormDataReady,
  onControlChanged,
  onCheckValidBeforeSaveForm,
  filterOrg,
  setDescription,
  addBaseActions,

  getParams,
  fillPlan,
  runCalcPlan,
  reloadData,
  setYear,
  createGrid,
  dayEdit,
  monthEdit
}

function initComponentStart () {
  const me = this
  me.on('controlChanged', onControlChanged, me)
  me.gridConfig = {
    detailGrids: ['workScheduleDay']
  }
  AC.acEditGridManager.init(me)
}

function onInitComponentDone () {
  const me = this
  me.attr.workScheduleDay.on('changeData', (grid, action) => {
    if (action === 'delete') {
      const store = grid.getStore()
      const allRecords = store.snapshot || store.data
      let numDay = 1
      allRecords.each(record => {
        record.set('numDay', numDay)
        numDay++
      })
    }
  })

  UB.Repository('hr_dictTimeCost')
    .attrs([ 'ID', 'nameSmall', 'code' ])
    .where('code', 'in', [appAC.langCodei18n('РбДн'), appAC.langCodei18n('Вих')])
    .selectAsObject().then(res => {
      me.dictTimeCost = res
    })
}

async function onFormDataReady () {
  const me = this
  const dictTimeForm = await UB.Repository('hr_dictTimeForm')
    .attrs(['ID', 'type', 'name'])
    .selectAsObject()
  let workScheduleDay = me.attr.workScheduleDay.getView().getHeaderCt().getGridColumns()
  let hoursWorkNightText = dictTimeForm.find(el => el.type === '4')
  workScheduleDay.find(el => el.dataIndex === 'hoursWorkNight').setText((hoursWorkNightText && hoursWorkNightText.name) || UB.i18n('Нічні години'))
  let hoursWorkEveningText = dictTimeForm.find(el => el.type === '5')
  workScheduleDay.find(el => el.dataIndex === 'hoursWorkEvening').setText((hoursWorkEveningText && hoursWorkEveningText.name) || UB.i18n('Вечірні години'))
  let hoursWorkHarmText = dictTimeForm.find(el => el.type === '6')
  workScheduleDay.find(el => el.dataIndex === 'hoursWorkHarm').setText((hoursWorkHarmText && hoursWorkHarmText.name) || UB.i18n('Шкідливі години'))
  let hoursWorkDopText = dictTimeForm.find(el => el.type === '7')
  workScheduleDay.find(el => el.dataIndex === 'hoursWorkDop').setText((hoursWorkDopText && hoursWorkDopText.name) || UB.i18n(AC.settings.get('hrTimeSheetAdditionalCol', appAC.globalOrganization()) || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'))

  me.attr.isOnlyForPositions[AC.settings.get('hrTariffingEducational', appAC.globalOrganization()) ? 'show' : 'hide']()

  me.attr.payElID.setReadOnly(!me.record.get('isSummarized'))
  me.attr.periodSummarized.setReadOnly(!me.record.get('isSummarized'))
  AC.viewUtils.setWhereListProperty(me.attr.planScheduleID, [
    ['ID', '!=', me.instanceID],
    ['organizationID', '=', appAC.globalOrganization(), 'org'],
    ['organizationID', 'isNull', null, 'orgNull']
  ], ['(([org]) OR ([orgNull]))'], ['clearWhereList'])
  AC.viewUtils.setWhereListProperty(me.attr.normScheduleID, [
    ['ID', '!=', me.instanceID],
    ['organizationID', '=', appAC.globalOrganization(), 'org'],
    ['organizationID', 'isNull', null, 'orgNull']
  ], ['(([org]) OR ([orgNull]))'], ['clearWhereList'])
  AC.viewUtils.setWhereListProperty(me.attr.parentsWorkScheduleID, [
    ['organizationID', '=', appAC.globalOrganization(), 'org'],
    ['organizationID', 'isNull', null, 'orgNull']
  ], ['(([org]) OR ([orgNull]))'], ['clearWhereList'])

  me.down('[name=connectedWorkSchedule]').store.ubRequest.whereList = {
    parentsWorkScheduleID: {
      expression: '[parentsWorkScheduleID]',
      condition: 'equal',
      value: me.attr.parentsWorkScheduleID.getValue() || 0
    }
  }

  filterOrg(me, true)
  me.calcMsg = UB.i18n('Зачекайте, триває розрахунок')
  if ((me.detailData && me.detailData.daysData && me.detailData.daysData.grid)) {
    me.down('[name=tabDay]').remove(me.detailData.daysData.grid, true)
  }
  me.detailData = {}
  me.gridData = []
  me.down('[name=showType]').setValueById('1')
  me.setYear(0)
  await me.reloadData(me)

  const planByOrgID = AC.settings.get('hrUsePlanByOrg', appAC.globalOrganization())
  if (planByOrgID && planByOrgID !== appAC.globalOrganization()) {
    UB.Repository('ac_organization').attrs(['ID', 'name']).selectById(planByOrgID).then(orgData => {
      me.down('[name=hrUsePlanByOrgLabel]').setText(`Увага! Розклад може бути змінено тільки у організації ${orgData.name}`)
    })
  } else {
    me.down('[name=hrUsePlanByOrgLabel]').setText('')
  }
}

function onCheckValidBeforeSaveForm () {
  const me = this
  const data = me.attr.workScheduleDay.getData()
  let result = true
  for (let i = 1; i <= data.length; i++) {
    if (!data.find(o => o.numDay === i)) {
      result = false
    }
  }
  if (!result) {
    $App.dialogInfo(UB.i18n('Невірна нумерація днів'))
    return Promise.resolve(result)
  }
  for (let i = 0; i < data.length; i++) {
    if (!data[i].dictTimeCostID || !_.isNumber(data[i].hoursWork) || !_.isNumber(data[i].hoursWorkEvening) || !_.isNumber(data[i].hoursWorkNight) || !_.isNumber(data[i].hoursWorkHarm) || !_.isNumber(data[i].hoursWorkDop)) {
      $App.dialogInfo(UB.i18n(`Не заповнені всі обов'язкові атрибути в розкладі по дням`))
      result = false
      return Promise.resolve(result)
    }
  }

  return Promise.resolve(result)
}

function filterOrg (me, isInit) {
  const onDate = me.attr.dateFromEmpty.getValue() || AC.dateService.todayDate()
  let modes = isInit ? [] : ['clearValue']
  AC.viewUtils.setFilterValue(me.attr.organizationID,
    Object.assign({
      mi_dateFrom: { value: onDate, condition: 'lessEqual' },
      mi_dateTo: { value: onDate, condition: 'moreEqual' }
    },
    $App.connection.userData().roles.toUpperCase().split(',').includes('ADMIN')
      ? {} : { mi_data_id: $App.connection.userData().userOrg || [0] })
    , modes)
}

function onControlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'dateFromEmpty':
        if (field.isValid()) {
          filterOrg(me, false)
        }
        break
      case 'isSummarized':
        me.attr.payElID.setReadOnly(!value)
        me.attr.periodSummarized.setReadOnly(!value)
        if (!value) {
          me.attr.periodSummarized.setValue()
          me.attr.payElID.setValueById(null)
        }
        break
      case 'parentsWorkScheduleID':
        const grid = me.down('[name=connectedWorkSchedule]')
        grid.store.ubRequest.whereList = {
          parentsWorkScheduleID: {
            expression: '[parentsWorkScheduleID]',
            condition: 'equal',
            value: value || 0
          }
        }
        grid.getStore().reload()
        break
    }
  }
}

function findDayName (dayNum) {
  switch (dayNum % 7) {
    case 1:
      return UB.i18n('понеділок')
    case 2:
      return UB.i18n('вівторок')
    case 3:
      return UB.i18n('середа')
    case 4:
      return UB.i18n('четвер')
    case 5:
      return UB.i18n("п'ятниця")
    case 6:
      return UB.i18n('субота')
    default:
      return UB.i18n('неділя')
  }
}

function generateDescription (day, description) {
  if (day.timeFrom) {
    day.timeFrom = typeof day.timeFrom !== 'string' ? AC.dateService.formatDate(day.timeFrom, 'hh:nn') : day.timeFrom
    description += UB.i18n(' з ') + day.timeFrom
  }
  if (day.timeTo) {
    day.timeTo = typeof day.timeTo !== 'string' ? AC.dateService.formatDate(day.timeTo, 'hh:nn') : day.timeTo
    if (day.timeTo === '00:00') {
      day.timeTo = '24:00'
    }
    description += UB.i18n(' до ') + day.timeTo
  }
  if (day.recreationFrom || day.recreationTo) {
    description += UB.i18n(' (перерва')
    if (day.recreationFrom) {
      day.recreationFrom = typeof day.recreationFrom !== 'string' ? AC.dateService.formatDate(day.recreationFrom, 'hh:nn') : day.recreationFrom
      description += UB.i18n(' з ') + day.recreationFrom
    }
    if (day.recreationTo) {
      day.recreationTo = typeof day.recreationTo !== 'string' ? AC.dateService.formatDate(day.recreationTo, 'hh:nn') : day.recreationTo
      if (day.recreationTo === '00:00') {
        day.recreationTo = '24:00'
      }
      description += UB.i18n(' до ') + day.recreationTo
    }
    description += ')'
  }
  description += '; '
  return description
}

function setDescription () {
  const me = this
  const data = me.attr.workScheduleDay.getData()
  if (!data.length) {
    $App.dialogInfo(UB.i18n('Не внесені дні та години режиму роботи'))
  } else {
    let description = ''
    if (me.record.get('begins') !== 'FROM_WEEKBEGIN') {
      data.forEach(day => {
        if (day.hoursWork) {
          description += day.numDay + UB.i18n(' день')
          description = generateDescription(day, description)
        }
      })
    } else {
      let dayList = []
      data.forEach((day, idx) => {
        let isAcceptable = dayList.length ? (dayList[dayList.length - 1].hoursWork === day.hoursWork && dayList[dayList.length - 1].timeFrom === day.timeFrom && dayList[dayList.length - 1].timeTo === day.timeTo && dayList[dayList.length - 1].recreationFrom === day.recreationFrom && dayList[dayList.length - 1].recreationTo === day.recreationTo) : false
        if (!idx || !isAcceptable) {
          day.start = day.numDay
          day.finish = day.numDay
          dayList.push(day)
        } else {
          dayList[dayList.length - 1].finish = day.numDay
        }
      })
      dayList.forEach(day => {
        if (day.hoursWork) {
          day.start = findDayName(day.start)
          day.finish = findDayName(day.finish)
          if (day.start === day.finish) {
            description += day.start
          } else {
            description += day.start + '-' + day.finish
          }
          description = generateDescription(day, description)
        }
      })
    }
    if (description && description.substr(-2) === '; ') {
      description += description.substr(0, description.length - 2) + '.'
    }
    me.getField('scheduleDescription').setValue(description)
    me.record.set('scheduleDescription', description)
  }
}

function addBaseActions () {
  const me = this

  me.callParent(arguments)
  me.actions.actionSendId = new Ext.Action({
    actionId: 'actionSendId',
    actionText: UB.i18n('Відправити'),
    hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'doSend'),
    handler: () => {
      const state = me.record.get('requestState')
      me.record.set('requestState', 'ONRECONCILATION')
      me.requestState = 'CHANGED'
      me.saveForm()
        .then(result => {
          if (result === -1) {
            me.record.set('requestState', state)
            me.requestState = state
          }
          me.setupByState()
        })
        .catch(e => {
          me.record.set('requestState', state)
          me.requestState = state
          AC.viewUtils.showToast(UB.i18n('Помилка'), e.message)
        })
    }
  })
  me.actions.actionAcceptId = new Ext.Action({
    actionId: 'actionAcceptId',
    actionText: UB.i18n('Прийняти'),
    hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'doAccept'),
    handler: () => {
      let state = me.record.get('requestState')
      me.record.set('requestState', 'RECONCILED')
      me.record.set('processingDate', new Date())
      me.requestState = 'CHANGED'
      me.record.set('processUserID', $App.connection.userData().userID)
      me.record.set('processEmployeeNumID', $App.connection.userData().employeeNumberID)
      me.saveForm()
        .then(result => {
          if (result === -1) {
            me.record.set('requestState', state)
            me.record.set('processingDate', null)
            me.requestState = state
            me.record.set('processUserID', null)
            me.record.set('processEmployeeNumID', null)
          }
          me.setupByState()
        })
        .catch(e => {
          me.record.set('requestState', state)
          me.record.set('processingDate', null)
          me.requestState = state
          me.record.set('processUserID', null)
          me.record.set('processEmployeeNumID', null)
          AC.viewUtils.showToast(UB.i18n('Помилка'), e.message)
        })
    }
  })
  me.actions.actionRejectId = new Ext.Action({
    actionId: 'actionRejectId',
    actionText: UB.i18n('Відхилити'),
    hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'doReject'),
    handler: btn => {
      let dlg = Ext.Msg.prompt(UB.i18n('Відхилення заявки'), UB.i18n('Вкажіть підставу відхилення заявки'), (btnText, sInput) => {
        if (btnText === 'ok') {
          if (!sInput || !sInput.trim()) {
            AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не вказано підставу'))
          } else {
            let state = me.record.get('requestState')
            let cancelReason = me.record.get('cancelReason')
            me.record.set('processUserID', $App.connection.userData().userID)
            me.record.set('processEmployeeNumID', $App.connection.userData().employeeNumberID)
            me.record.set('cancelReason', sInput)
            me.record.set('requestState', 'CANCELED')
            me.record.set('processingDate', new Date())
            me.saveForm().then(function (result) {
              if (result === -1) {
                me.record.set('requestState', state)
                me.requestState = state
                me.record.set('cancelReason', cancelReason)
                me.record.set('processingDate', null)
                me.record.set('processUserID', null)
                me.record.set('processEmployeeNumID', null)
              } else {
                me.requestState = 'CHANGED'
              }
              me.setupByState()
            }).catch(e => {
              me.record.set('requestState', state)
              me.requestState = state
              me.record.set('cancelReason', cancelReason)
              me.record.set('processingDate', null)
              me.record.set('processUserID', null)
              me.record.set('processEmployeeNumID', null)
              AC.viewUtils.showToast(UB.i18n('Помилка'), e.message)
            })
          }
        }
      })
      dlg.setWidth(700)
      let textbox = dlg.getEl().query('input')[0]
      textbox.setAttribute('maxlength', 400)
    }
  })

  me.actions.addScheduleCopy = new Ext.Action({
    actionId: 'addScheduleCopy',
    actionText: UB.i18n('Додати як'),
    text: UB.i18n('Додати як'),
    iconCls: 'fas fa-copy',
    scale: 'medium',
    cls: 'add-new-action',
    handler: async function (ctrl) {
      const me = ctrl.up('form')
      let res = await me.saveForm()

      if (res !== -1) {
        await $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_workScheduleAddAs',
          cmpInitConfig: {
            workScheduleID: me.instanceID,
            orgID: appAC.globalOrganization()
          }
        })
      }
    }
  })
}

function getParams () {
  let me = this
  let workScheduleID = me.instanceID
  let startDate = me.down('[name=startDate]')
  let endDate = me.down('[name=endDate]')

  let organizationID = appAC.globalOrganization()
  if (!(startDate && endDate && organizationID)) {
    return null
  }
  return {
    workScheduleID: workScheduleID,
    begins: me.attr.begins.getValue(),
    planScheduleID: me.attr.planScheduleID.getValue(),
    normScheduleID: me.attr.normScheduleID.getValue(),
    organizationID,
    startDate: AC.dateService.truncTimeToUtcNull(startDate.getValue()),
    endDate: AC.dateService.truncTimeToUtcNull(endDate.getValue())
  }
}

function fillPlan (data) {
  let me = this
  if (!data) {
    return
  }
  const planByOrgID = AC.settings.get('hrUsePlanByOrg', data.organizationID)
  if (!planByOrgID || planByOrgID === appAC.globalOrganization()) {
    me.setLoading(true)
    UB.Repository('tim_plan').attrs([
      'ID',
      'workScheduleID', // Графік робочого часу
      'dayDate', // Дата
      'dictTimeCostID', // Витрата робочого часу
      'dictTimeCostID.nameShort',
      'workHours', // Робочих годин
      'nightHours', // Нічних годин
      'eveningHours',
      'harmHours',
      'dopHours',
      'comment' // Коментар
    ]).where('workScheduleID', '=', data.workScheduleID)
      .where('organizationID', 'equal', data.organizationID)
      .where('dayDate', 'moreEqual', data.startDate)
      .where('dayDate', 'lessEqual', data.endDate)
      .selectAsObject().then(rows => {
        if (rows.length) {
          $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Переформувати розклад за місяці, в яких він вже сформований?'))
            .then(function (isYes) {
              if (isYes) {
                isYes && me.runCalcPlan(data)
              } else me.setLoading(false)
            })
        } else {
          me.runCalcPlan(data)
        }
      }).catch(e => {
        $App.dialogError(e.message)
        me.setLoading(false)
      })
  }
}

function runCalcPlan (params) {
  const me = this
  const planByOrgID = AC.settings.get('hrUsePlanByOrg', params.organizationID)
  if (!planByOrgID || planByOrgID === appAC.globalOrganization()) {
    me.setLoading(me.calcMsg)
    $App.connection.run({
      entity: 'tim_plan',
      method: 'calcPlan',
      organizationID: params.organizationID,
      workScheduleID: params.workScheduleID,
      dateFrom: params.startDate,
      dateTo: params.endDate,
      ignoreCorrection: params.ignoreCorrection
    }).then(() => {
      me.reloadData(me)
    }).catch(e => {
      $App.dialogError(e.message)
      me.setLoading(false)
    })
  }
}

async function reloadData (me) {
  let data = me.getParams()

  if (!me.instanceID || !me.down('[name=period]').getValue() || !appAC.globalOrganization() || !data) {
    me.detailData.daysData.grid.setLocalStoreData([])
    return
  }

  const color = {
    WORK: 'black',
    FREE: 'darkred',
    ABSENCE: '#0000ff'
  }
  const planByOrgID = AC.settings.get('hrUsePlanByOrg', data.organizationID)
  let rows = await UB.Repository('tim_plan').attrs([
    'ID',
    'workScheduleID', // Графік робочого часу
    'workScheduleID.code', // Графік робочого часу
    'dayDate', // Дата
    'dictTimeCostID', // Витрата робочого часу
    'dictTimeCostID.nameShort',
    'dictTimeCostID.nameSmall',
    'dictTimeCostID.timeCostType',
    'workHours', // Робочих годин
    'nightHours', // Нічних годин
    'eveningHours',
    'harmHours',
    'dopHours',
    'comment', // Коментар
    'isCorrection' // Ручне коригування
  ])
    .where('workScheduleID', '=', data.workScheduleID)
    .where('organizationID', 'equal', planByOrgID || data.organizationID)
    .where('dayDate', 'moreEqual', data.startDate)
    .where('dayDate', 'lessEqual', data.endDate)
    .orderBy('dayDate')
    .selectAsObject({
      'workScheduleID.code': 'workScheduleCode'
    })
  let groupedData = {}
  me.gridData = []

  let planScheduleList = []
  let normScheduleList = []
  if (data.planScheduleID) {
    planScheduleList = await UB.Repository('tim_plan').attrs([
      'ID',
      'workScheduleID', // Графік робочого часу
      'workScheduleID.code', // Графік робочого часу
      'dayDate', // Дата
      'dictTimeCostID', // Витрата робочого часу
      'dictTimeCostID.nameShort',
      'dictTimeCostID.nameSmall',
      'dictTimeCostID.timeCostType',
      'workHours', // Робочих годин
      'nightHours', // Нічних годин
      'eveningHours',
      'harmHours',
      'dopHours',
      'comment', // Коментар
      'isCorrection' // Ручне коригування
    ])
      .where('workScheduleID', '=', data.planScheduleID)
      .where('organizationID', 'equal', planByOrgID || data.organizationID)
      .where('dayDate', 'moreEqual', data.startDate)
      .where('dayDate', 'lessEqual', data.endDate)
      .orderBy('dayDate')
      .selectAsObject()
  }
  if (data.normScheduleID) {
    if (data.normScheduleID === data.planScheduleID) {
      normScheduleList = planScheduleList
    } else {
      normScheduleList = await UB.Repository('tim_plan').attrs([
        'ID',
        'workScheduleID', // Графік робочого часу
        'workScheduleID.code', // Графік робочого часу
        'dayDate', // Дата
        'dictTimeCostID', // Витрата робочого часу
        'dictTimeCostID.nameShort',
        'dictTimeCostID.nameSmall',
        'dictTimeCostID.timeCostType',
        'workHours', // Робочих годин
        'nightHours', // Нічних годин
        'eveningHours',
        'harmHours',
        'dopHours',
        'isMtCount',
        'comment', // Коментар
        'isCorrection' // Ручне коригування
      ])
        .where('workScheduleID', '=', data.normScheduleID)
        .where('organizationID', 'equal', planByOrgID || data.organizationID)
        .where('dayDate', 'moreEqual', data.startDate)
        .where('dayDate', 'lessEqual', data.endDate)
        .orderBy('dayDate')
        .selectAsObject()
    }
  }

  rows.forEach(item => {
    let month = AC.dateService.formatDate(item.dayDate, 'mmmm')
    let isWork = item['dictTimeCostID.timeCostType'] === 'WORK'

    !groupedData[month] && (groupedData[month] = {
      month: month,
      days: 0,
      monthDays: 0,
      hours: 0,
      factHour: 0,
      factDays: 0,
      normaHours: 0,
      normaDays: 0,
      overtimePlan: 0,
      overtimeNorm: 0,
      eveningHours: 0,
      nightHours: 0,
      harmHours: 0,
      dopHours: 0,
      monthDate: AC.dateService.firstDayOfMonth(item.dayDate)
    })

    groupedData[month].monthDays += 1
    groupedData[month][`day${item.dayDate.getDate()}`] = {
      ID: item.ID,
      workHours: isWork ? item.workHours : item['dictTimeCostID.nameShort'],
      workDays: item['dictTimeCostID.nameShort'],
      workScheduleCode: item['workScheduleCode'],
      eveningHours: isWork ? item.eveningHours : item['dictTimeCostID.nameShort'],
      nightHours: isWork ? item.nightHours : item['dictTimeCostID.nameShort'],
      dopHours: isWork ? item.dopHours : item['dictTimeCostID.nameShort'],
      harmHours: isWork ? item.harmHours : item['dictTimeCostID.nameShort'],
      color: color[item['dictTimeCostID.timeCostType']] || 'black',
      isCorrection: item.isCorrection,
      dayDate: item.dayDate,
      dictTimeCostID: item.dictTimeCostID,
      dictTimeCostNameShort: item['dictTimeCostID.nameShort'],
      dictTimeCostNameSmall: item['dictTimeCostID.nameSmall'],
      comment: item.comment,
      isMtCount: item.isMtCount
    }
    groupedData[month].factHour = AC.currencyService.round(groupedData[month].factHour + item.workHours)
    groupedData[month].factDays = AC.currencyService.round(groupedData[month].factDays + (isWork ? 1 : 0))
    groupedData[month].eveningHours = AC.currencyService.round(groupedData[month].eveningHours + item.eveningHours)
    groupedData[month].nightHours = AC.currencyService.round(groupedData[month].nightHours + item.nightHours)
    groupedData[month].dopHours = AC.currencyService.round(groupedData[month].dopHours + item.dopHours)
    groupedData[month].harmHours = AC.currencyService.round(groupedData[month].harmHours + item.harmHours)

    if (!planScheduleList.length) {
      groupedData[month].hours = AC.currencyService.round(groupedData[month].hours + item.workHours)
      groupedData[month].days += isWork ? 1 : 0
    } else {
      let planSchedule = planScheduleList.find(el => (!(el.dayDate > item.dayDate) && !(el.dayDate < item.dayDate)))
      groupedData[month].hours = AC.currencyService.round(groupedData[month].hours + planSchedule.workHours)
      planSchedule['dictTimeCostID.timeCostType'] === 'WORK' && (groupedData[month].days++)
    }

    if (!normScheduleList.length) {
      groupedData[month].normaHours = AC.currencyService.round(groupedData[month].normaHours + item.workHours)
      groupedData[month].normaDays += isWork ? 1 : 0
    } else {
      let normSchedule = normScheduleList.find(el => (!(el.dayDate > item.dayDate) && !(el.dayDate < item.dayDate)))
      groupedData[month].normaHours = AC.currencyService.round(groupedData[month].normaHours + normSchedule.workHours)
      normSchedule['dictTimeCostID.timeCostType'] === 'WORK' && (groupedData[month].normaDays++)
    }
  })

  Object.keys((groupedData)).forEach(item => {
    groupedData[item].overtimePlan = groupedData[item].factHour - groupedData[item].hours
    groupedData[item].overtimeNorm = groupedData[item].factHour - groupedData[item].normaHours
    me.gridData.push(groupedData[item])
  })

  await me.createGrid(me, data.startDate, data.endDate)
  me.detailData.daysData.grid.setLocalStoreData(me.gridData)
  me.setLoading(false)
}

function setYear (diff, val) {
  let me = this
  let yearVal = val || me.down('[name=period]').getValue() + diff

  me.down('[name=period]').setValue(yearVal)
  me.down('[name=startDate]').setValue(AC.dateService.firstDayOfMonth(new Date(yearVal, 0)))
  me.down('[name=endDate]').setValue(AC.dateService.lastDayOfMonth(new Date(yearVal, 11)))
}

async function createGrid (me, dateFrom, dateTo) {
  if ((me.detailData.daysData && me.detailData.daysData.grid)) {
    me.down('[name=tabDay]').remove(me.detailData.daysData.grid, true)
  }
  me.detailData.daysData = {}

  me.detailData.daysData.fields = [
    {
      name: 'ID'
    },
    {
      name: 'monthDate'
    },
    {
      name: 'month',
      columnConfig: {
        text: UB.i18n('Місяць'),
        tooltip: UB.i18n('Місяць'),
        width: 100,
        renderer: (value, metaData, record, rowIdx, colIdx, store) =>
          Object.keys(record.data).some(item => item.match(/^day[0-9]*$/) && record.data[item].isCorrection)
            ? `<span style="color:green;">${value}</span>` : value
      }
    },
    {
      name: 'normaDays',
      columnConfig: {
        text: UB.i18n('Норма днів'),
        tooltip: UB.i18n('Норма днів'),
        width: 50
      }
    },
    {
      name: 'normaHours',
      columnConfig: {
        text: UB.i18n('Норма годин'),
        tooltip: UB.i18n('Норма годин'),
        width: 80
      }
    },
    {
      name: 'days',
      columnConfig: {
        text: UB.i18n('План днів'),
        tooltip: UB.i18n('План днів'),
        width: 50
      }
    },
    {
      name: 'hours',
      columnConfig: {
        text: UB.i18n('План годин'),
        tooltip: UB.i18n('План годин'),
        width: 80
      }
    },
    {
      name: 'factDays',
      columnConfig: {
        text: UB.i18n('Днів за розкладом'),
        tooltip: UB.i18n('Днів за розкладом'),
        width: 50
      }
    },
    {
      name: 'factHour',
      columnConfig: {
        text: UB.i18n('Годин за розкладом'),
        tooltip: UB.i18n('Годин за розкладом'),
        width: 80
      }
    },
    {
      name: 'overtimeNorm',
      columnConfig: {
        text: UB.i18n('Переробіток норма'),
        tooltip: UB.i18n('Переробіток норма'),
        width: 80
      }
    },
    {
      name: 'overtimePlan',
      columnConfig: {
        text: UB.i18n('Переробіток план'),
        tooltip: UB.i18n('Переробіток план'),
        width: 80
      }
    }
  ]
  let date = new Date(dateFrom)
  const displayValByType = {
    1: 'workHours',
    2: 'workDays',
    3: 'workScheduleCode',
    4: 'nightHours',
    5: 'eveningHours',
    6: 'harmHours',
    7: 'dopHours'
  }

  let mySummary = {
    normaDays: 'sum',
    normaHours: 'sum',
    hours: 'sum',
    overtimeNorm: 'sum',
    overtimePlan: 'sum',
    days: 'sum',
    nightHours: 'sum',
    harmHours: 'sum',
    dopHours: 'sum',
    eveningHours: 'sum'
  }
  for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
    me.detailData.daysData.fields.push({
      name: 'day' + day,
      columnConfig: {
        text: `${day}`,
        width: 55,
        renderer: (value, metaData, record, rowIdx, colIdx, store) => {
          let displayVal = value[displayValByType[me.down('[name=showType]').getValue()]]
          if (displayVal) metaData.tdAttr = `data-qtip="${displayVal}"`
          return `<span style="color:${value.color};">${displayVal || ''}</span>`
        },
        summaryRenderer: (value) => {
          return value
        }
      }
    })
    date.setDate(date.getDate() + 1)
    mySummary['day' + day] = (allRecord, dataIndex) => {
      return daysSum(allRecord, ['day' + day])
    }
  }
  me.detailData.daysData.fields.push({
    name: 'nightHours',
    columnConfig: {
      text: UB.i18n('Нічні'),
      tooltip: UB.i18n('Всього нічних годин за місяць'),
      width: 80
    }
  })
  me.detailData.daysData.fields.push({
    name: 'eveningHours',
    columnConfig: {
      text: UB.i18n('Вечірні'),
      tooltip: UB.i18n('Всього вечірніх годин за місяць'),
      width: 80
    }
  })
  me.detailData.daysData.fields.push({
    name: 'harmHours',
    columnConfig: {
      text: UB.i18n('Шкідливі'),
      tooltip: UB.i18n('Всього шкідливих годин за місяць'),
      width: 80
    }
  })
  me.detailData.daysData.fields.push({
    name: 'dopHours',
    columnConfig: {
      text: UB.i18n(AC.settings.get('hrTimeSheetAdditionalCol', appAC.globalOrganization()) || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'),
      tooltip: UB.i18n('Всього годин за місяць'),
      width: 80
    }
  })

  let contextIndex
  me.detailData.daysData.grid = Ext.create('AC.controls.AcGrid', {
    xtype: 'acGrid',
    stateId: UB.core.UBLocalStorageManager.getKeyUI('tim_timeSheetDay_grid'),
    flex: 1,
    region: 'center',
    autoScroll: true,
    storeType: 'local',
    disablePaging: true,
    notWriteChanges: true,
    showToolBar: true,
    hideDefaultAction: true,
    hideActions: ['addNew'],
    summaryDataOnClient: true,
    baseSummary: true,
    summary: mySummary,
    selType: 'cellmodel',
    fields: me.detailData.daysData.fields,
    onCellDoubleClick: function (grid, td, cellIndex, record, tr, rowIndex) {
      const dataIndex = grid.getHeaderCt().getHeaderAtIndex(cellIndex).dataIndex
      dataIndex.match(/^day[0-9]*$/) && me.dayEdit(me, record.get(dataIndex).ID, record)
      dataIndex.match(/^(?!day[0-9]*$)/) && me.monthEdit(me, record)
    },
    customContextActions: [
      {
        text: UB.i18n('Видалити ручні коригування'),
        handler: () => {
          const record = me.detailData.daysData.grid.getStore().getAt(contextIndex)
          const planByOrgID = AC.settings.get('hrUsePlanByOrg', appAC.globalOrganization())
          if (!planByOrgID || planByOrgID === appAC.globalOrganization()) {
            $App.dialogYesNo('Попередження', UB.i18n(`Всі ручні коригування за {0} будуть видалені! Продовжити?`, record.data.month))
              .then(function (isYes) {
                if (isYes) {
                  me.runCalcPlan({
                    ...me.getParams(),
                    startDate: record.data.monthDate,
                    endDate: AC.dateService.lastDayOfMonth(record.data.monthDate),
                    ignoreCorrection: true
                  })
                }
              })
          }
        }
      },
      {
        text: UB.i18n('Переформувати'),
        handler: () => {
          const record = me.detailData.daysData.grid.getStore().getAt(contextIndex)
          const planByOrgID = AC.settings.get('hrUsePlanByOrg', appAC.globalOrganization())
          if (!planByOrgID || planByOrgID === appAC.globalOrganization()) {
            $App.dialogYesNo('Попередження', UB.i18n(`Дані розкладу роботи за {0} будуть переформовані! Продовжити?`, record.data.month))
              .then(function (isYes) {
                if (isYes) {
                  me.runCalcPlan({
                    ...me.getParams(),
                    startDate: record.data.monthDate,
                    endDate: AC.dateService.lastDayOfMonth(record.data.monthDate),
                    ignoreCorrection: false
                  })
                }
              })
          }
        }
      }

    ],
    onShowContextMenu: (grid, record, item, index, event) => contextIndex = index
  })
  me.down('[name=tabDay]') && me.down('[name=tabDay]').add(me.detailData.daysData.grid)
}

function daysSum (datadays, myDay) {
  let workHoursSum = 0

  for (let i = 0; i < datadays.length; i++) {
    if (typeof datadays[i].data[myDay].workHours === 'number') {
      workHoursSum = workHoursSum + datadays[i].data[myDay].workHours
    }
  }

  return workHoursSum
}

function changeDay (form, record, me) {
  const newDayCount = form.step === 'next' ? `day${form.currentDay + 1}` : `day${form.currentDay - 1}`

  const newDay = record.get(newDayCount)
  let canClose = false
  if (newDay) {
    canClose = true
    me.dayEdit(me, newDay.ID, record)
  }

  return canClose
}

function dayEdit (me, ID, record) {
  const planByOrgID = AC.settings.get('hrUsePlanByOrg', appAC.globalOrganization())
  ID && $App.doCommand({
    cmdType: 'showForm',
    entity: 'tim_plan',
    formCode: 'tim_plan-edit',
    instanceID: ID,
    hideActions: ['fDelete'],
    cmpInitConfig: {
      readOnly: planByOrgID && planByOrgID !== appAC.globalOrganization()
    },
    customParams: {
      onAfterSave: form => {
        me.reloadData(me)
      },

      onChangeDay: form => {
        return changeDay(form, record, me)
      }
    }
  })
}

function monthEdit (me, record) {
  const planByOrgID = AC.settings.get('hrUsePlanByOrg', appAC.globalOrganization())
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'tim_plan-editMonth',
    cmpInitConfig: {
      data: record.raw,
      record: record,
      detailData: me.detailData,
      readOnly: planByOrgID && planByOrgID !== appAC.globalOrganization(),
      reloadRecord: (change) => {
        if (change) {
          me.reloadData(me)
        }
      }
    }

  })
}
