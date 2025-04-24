/* global UB AC HR Ext _ */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    if (me.incomeParams && reportParams) {
      // для коррекстной выгрузки в Excel
      me.incomeParams = reportParams
    }
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },

  getReportData: async function (reportParams) {
    const employeeInfo = await UB.Repository('hr_employee')
      .attrs(['fullFIO', 'sexType'])
      .selectById(reportParams.instanceID)

    const experience = await UB.Repository('hr_dictExperience')
      .attrs('code', 'name', 'printName')
      .selectById(reportParams.experienceID)

    const employeeWorkbookDt = await UB.Repository('hr_employeeWorkbookDt')
      .attrs(['dateFrom', 'dateTo', 'coefficient', 'employeeWorkbookID.dateFrom', 'employeeWorkbookID.dateToEmpty',
        'employeeWorkbookID.workPosition', 'employeeWorkbookID.workPlace', 'employeeWorkbookID.description'])
      .where('employeeWorkbookID.employeeID', '=', reportParams.instanceID)
      .where('employeeWorkbookID.mi_deleteDate', '>=', '#maxdate')
      .where('dictExperienceID', '=', reportParams.experienceID)
      .whereIf(reportParams.employeeNumberDateFrom, 'dateFrom', '<=', AC.dateService.shiftDate(reportParams.onDate))
      .orderBy('dateFrom')
      .selectAsObject()

    let employeeExperience = await UB.Repository('hr_employeeExperience')
      .attrs('calcDate', 'dictExperienceID.code', 'startCalcDate')
      .where('employeeID', '=', reportParams.instanceID)
      .where('dictExperienceID.code', 'in', ['6', '8'])
      .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()
    const payElExperienceMaxYear = await UB.Repository('hr_payElExperience')
      .attrs('years')
      .where('payElID.dictExperienceID', '=', reportParams.experienceID)
      .where('payElID.methodID.code', '=', '6')
      .where('dateFrom', '<=', reportParams.onDate, 'dateFromOnDate')
      .where('dateFrom', 'isNull', undefined, 'dateFromIsNull')
      .where('dateTo', '>=', reportParams.onDate, 'dateToOnDate')
      .where('dateTo', 'isNull', undefined, 'dateToIsNull')
      .logic('([dateFromIsNull] or [dateFromOnDate]) and ([dateToIsNull] or [dateToOnDate])')
      .orderBy('years', 'desc')
      .limit(1)
      .selectScalar()

    let year = -1
    let aDate = null
    // для разрахунку набдавки для Державной служби
    if (employeeWorkbookDt && employeeWorkbookDt.length > 0 && experience && experience.code === '6' &&
      employeeExperience && employeeExperience.length > 0) {
      employeeExperience = _.groupBy(employeeExperience, 'dictExperienceID.code')
      const d1 = employeeExperience['8'] ? employeeExperience['8'][0].calcDate : null
      const d2 = employeeExperience['6'] ? employeeExperience['6'][0].calcDate : null
      let d1end = employeeExperience['8'] ? employeeExperience['8'][0].startCalcDate : null
      let d2end = employeeExperience['6'] ? employeeExperience['6'][0].startCalcDate : null
      if (d1end && AC.dateService.isMaxDate(d1end)) d1end = null
      if (d2end && AC.dateService.isMaxDate(d2end)) d2end = null
      let endDate = reportParams.onDate
      if (d2 && d2 < new Date(2016, 4, 1)) {
        if (d1 === null && d2 !== null) {
          aDate = d2
          if (d2end) endDate = d2end
        }
        if (d1 !== null && d2 === null) {
          aDate = d1
          if (d1end) endDate = d1end
        }
        if (d1 !== null && d2 !== null) {
          if (d1 > d2) {
            aDate = d2
            if (d2end) endDate = d2end
          } else {
            aDate = d1
            if (d1end) endDate = d1end
          }
        }
      } else {
        aDate = d2
        if (d2end) endDate = d2end
      }
      if (aDate) {
        endDate = endDate || reportParams.onDate
        if (!reportParams.employeeNumberDateFrom) {
          // Для випадку не прийнятого працівника розраховувати відсоток надбавки за стаж враховуючи день прийняття на роботу,
          // тобто до розрахованого стажу додати 1 день, і тоді розрахувати надбавку. UBHR-21027
          endDate = AC.dateService.addDays(endDate, 1)
        }
        const expYmd = AC.dateService.getYmd(aDate, endDate, true)
        year = expYmd.years > (payElExperienceMaxYear || 0) ? payElExperienceMaxYear || 0 : expYmd.years
      }
    }

    const payElExperience = year !== -1 ? await UB.Repository('hr_payElExperience')
      .attrs('rate')
      .where('years', '=', year)
      .where('payElID.dictExperienceID', '=', reportParams.experienceID)
      .where('payElID.methodID.code', '=', '6')
      .where('dateFrom', '<=', reportParams.onDate, 'dateFromOnDate')
      .where('dateFrom', 'isNull', undefined, 'dateFromIsNull')
      .where('dateTo', '>=', reportParams.onDate, 'dateToOnDate')
      .where('dateTo', 'isNull', undefined, 'dateToIsNull')
      .logic('([dateFromIsNull] or [dateFromOnDate]) and ([dateToIsNull] or [dateToOnDate])')
      .selectScalar() : undefined

    const workBook = []
    const result = {
      onDateText: reportParams.employeeNumberDateFrom ? `(станом на ${AC.dateService.formatDate(reportParams.onDate)})` : '',
      showDays: reportParams.showCalcs,
      colSpan: 8 + (reportParams.showCalcs ? 1 : 0),
      colSpan2: 3 + (reportParams.showCalcs ? 1 : 0),
      colSpan3: 4 + (reportParams.showCalcs ? 1 : 0),
      tableWidth: 1005 + (reportParams.showCalcs ? 60 : 0),
      rate: payElExperience ? `${payElExperience}  %` : '',
      showRate: experience ? experience.code === '6' : false,
      experienceName: experience ? HR.nameCase.cap(experience.printName || experience.name || '') : UB.i18n('Стажу'),
      fullFIO: employeeInfo ? HR.reportUtils.formatFullName(employeeInfo.fullFIO || '', true) : '',
      shortFIO: employeeInfo ? HR.reportUtils.formatShortName(employeeInfo.fullFIO || '', false) : '',
      agreeText: employeeInfo ? ((employeeInfo.sexType || '') === 'W' ? UB.i18n('З рохрахунком ознойомлена:') : UB.i18n('З рохрахунком ознойомлений:')) : '',
      rows: employeeWorkbookDt.map((item, index) => {
        item.dateTo = Math.min(item.dateTo || reportParams.onDate, reportParams.onDate)
        const ymd = AC.dateService.getYmd(item.dateFrom, item.dateTo, true)

        const idx = workBook.findIndex(el => el.dateFrom <= item.dateFrom && item.dateFrom <= el.dateTo)
        if (idx >= 0) {
          if (workBook[idx].dateTo < item.dateTo || !item.dateTo) {
            workBook[idx].dateTo = item.dateTo
          }
        } else {
          workBook.push(item)
        }

        return {
          showDays: reportParams.showCalcs,
          index: index + 1,
          workInfo: `${item['employeeWorkbookID.workPosition'] || ''} ${item['employeeWorkbookID.workPlace'] || ''}`,
          years: ymd.years || 0,
          months: ymd.months || 0,
          days: ymd.days || 0,
          dateFrom: item['employeeWorkbookID.dateFrom'] ? AC.dateService.formatDate(item['employeeWorkbookID.dateFrom']) : '',
          dateToEmpty: item['employeeWorkbookID.dateToEmpty'] ? AC.dateService.formatDate(item['employeeWorkbookID.dateToEmpty']) : '',
          description: 'Трудова книжка', // item['employeeWorkbookID.description'] || ''
          countDays: AC.dateService.dayDiff(item.dateFrom, item.dateTo)
        }
      }),
      total: {
        years: 0,
        months: 0,
        days: 0
      },
      position1: '',
      shortFIO1: '',
      position2: '',
      shortFIO2: ''
    }
    result.totalTitle1 = `Всього${reportParams.employeeNumberDateFrom ? '' : ' по трудовій книжці'}:`
    result.totalTitle2 = `Надбавка за вислугу років на державній службі${reportParams.employeeNumberDateFrom ? '' : ' при призначенні'}:`

    if (workBook.length > 0) {
      let countDays = 0
      let maxDateTo = workBook[0].dateTo
      workBook.forEach(work => {
        const diff = AC.dateService.dayDiff(work.dateFrom, work.dateTo ? work.dateTo : reportParams.onDate)
        const coef = work.coefficient ? work.coefficient : 1
        countDays -= Math.floor(diff * coef)
        if (maxDateTo < work.dateTo || !work.dateTo) maxDateTo = work.dateTo
      })
      const calcDate = AC.dateService.addDays(maxDateTo || reportParams.onDate, countDays + 1)
      const ymd = AC.dateService.getYmd(calcDate, maxDateTo || reportParams.onDate, true)
      result.total.days = ymd.days || 0
      result.total.months = ymd.months || 0
      result.total.years = ymd.years || 0
    }
    result.total.countDays = result.rows.reduce((result, item) => (result + item.countDays), 0)

    if (reportParams.respID1 || reportParams.respID2) {
      for (let i = 1; i <= 2; i++) {
        const id = reportParams[`respID${i}`]
        if (id) {
          if (i === 2 && (reportParams.respID1 === reportParams.respID2)) {
            result.position2 = result.position1
            result.shortFIO2 = result.shortFIO1
          } else {
            for (let k = 0; k < 2; k++) {
              let respPosInfo = await UB.Repository('hr_employeePositionS')
                .attrs('ID', 'positionID.fullName', 'positionID.name', 'employeeID.fullFIO')
                .where('ID', '=', id)
                .where('employeeID.mi_deleteDate', '>=', '#maxdate')
                .where('positionID.state', '=', 'ACTIVE')
                .where('positionID.mi_deleteDate', '>=', '#maxdate')
                .whereIf(k === 0, 'positionID.mi_dateFrom', '<=', reportParams.onDate)
                .whereIf(k === 0, 'positionID.mi_dateTo', '>=', reportParams.onDate)
                .orderBy('positionID.mi_dateFrom', 'desc')
                .orderBy('positionID.mi_dateTo', 'desc')
                .limit(1)
                .selectSingle()
              if (respPosInfo) {
                k = 2
                result[`position${i}`] = respPosInfo['positionID.fullName'] || respPosInfo['positionID.name'] || ''
                result[`shortFIO${i}`] = HR.reportUtils.formatShortName(respPosInfo['employeeID.fullFIO'] || '')
              }
            } // for
          }// if
        } // id
      } // for
    }
    return AC.reportService.removeEmptyValues(result)
  },
  onParamPanelConfig: function () {
    const incomeParams = this.incomeParams || {}
    const employeeNumberDateFrom = incomeParams.employeeNumberDateFrom
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox' },
          items: [
            {
              xtype: 'ubcombobox',
              name: 'experienceID',
              fieldLabel: UB.i18n('Вид стажу'),
              labelWidth: 160,
              width: 750,
              gridFieldList: ['code', 'name'],
              displayField: 'name',
              allowBlank: false,
              ubRequest: {
                entity: 'hr_dictExperience',
                fieldList: ['ID', 'code', 'name'],
                orderList: { orderBy: { expression: 'name' } }
              },
              listeners: {
                render: function (ctrl) {
                  ctrl.store.on('load', () => {
                    if (!ctrl.store.isLoaded) {
                      const storeItems = ctrl.store.data.items
                      const selItem = _.find(storeItems, { data: { code: '6' } })
                      if (selItem) {
                        ctrl.setValue(selItem.data.ID)
                      }
                      ctrl.store.isLoaded = true
                    }
                  })
                  ctrl.store.load()
                }
              }
            },
            HR.controlService.getRespEmpCombo({
              name: 'respID1',
              fieldLabel: UB.i18n('Розрахунок перевірив'),
              labelWidth: 160,
              width: 750,
              allowBlank: true,
              defaultOrgBoss: false
            }),
            HR.controlService.getRespEmpCombo({
              name: 'respID2',
              fieldLabel: UB.i18n('Розрахунок провів'),
              labelWidth: 160,
              width: 750,
              allowBlank: true,
              defaultOrgBoss: false
            }),
            {
              xtype: 'panel',
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  labelWidth: 160,
                  width: 300,
                  fieldLabel: UB.i18n('Станом на'),
                  allowBlank: false,
                  value: AC.dateService.todayDate(),
                  disabled: !employeeNumberDateFrom,
                  minValue: employeeNumberDateFrom
                },
                {
                  xtype: 'checkboxfield',
                  name: 'showCalcs',
                  fieldLabel: UB.i18n('Показати розрахункові поля'),
                  labelWidth: 210,
                  value: false
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const params = {
          showCalcs: frm.findField('showCalcs').getValue(),
          onDate: frm.findField('onDate').getValue(),
          experienceID: frm.findField('experienceID').getValue() || 0,
          respID1: frm.findField('respID1').getValue() || 0,
          respID2: frm.findField('respID2').getValue() || 0
        }
        _.merge(params, incomeParams)
        owner.ownerCt.report.incomeParams = params
        return params
      }
    })
    return paramForm
  }
}
