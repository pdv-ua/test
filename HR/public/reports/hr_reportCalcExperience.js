/* global Ext UB AC appAC $App */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    if (me.incomeParams && reportParams) {
      // для коррекстной выгрузки в Excel
      me.incomeParams = reportParams
    }
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => AC.reportService.generateReport(me.getParams(data, reportParams), me))
  },
  getData: async function (reportParams) {
    const onDate = appAC.globalApplicationDate()
    const attrsList = ['positionID.fullNameGen', 'positionID.fullName', 'positionID.name']
    const employee = await UB.Repository('hr_employee')
      .attrs('fullFIO', 'genName')
      .where('ID', '=', reportParams.instanceID)
      .where('mi_deleteDate', '>=', '#maxdate')
      .selectSingle()
    const employeeInfo = await UB.Repository('hr_employeePositionS')
      .attrs(attrsList)
      .where('employeeID', '=', reportParams.instanceID)
      .where('employeeNumberID', '=', reportParams.employeeNumberID)
      .where('employeeID.mi_deleteDate', '>=', '#maxdate')
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_dateFrom', '<=', onDate)
      .where('positionID.mi_dateTo', '>=', onDate)
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .selectSingle()
    const employeeInfoLast = await UB.Repository('hr_employeePositionS')
      .attrs(attrsList)
      .where('employeeID', '=', reportParams.instanceID)
      .where('employeeNumberID', '=', reportParams.employeeNumberID)
      .where('employeeID.mi_deleteDate', '>=', '#maxdate')
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .orderBy('positionID.mi_dateFrom', 'desc')
      .orderBy('positionID.mi_dateTo', 'desc')
      .selectSingle()
    const experience = await UB.Repository('hr_employeeExperience')
      .attrs(['ID', 'dictExperienceID.name', 'dictExperienceID', 'calcDate', 'startCalcDate', 'isFromWorkbook', 'modifyDate'])
      .where('employeeID', '=', reportParams.instanceID)
      .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
      .orderBy('calcDate')
      .orderBy('dictExperienceID.name')
      .selectAsObject()
    const experienceByPos = reportParams.positionType ? await UB.Repository('hr_dictExperienceByPos')
      .attrs(['ID', 'dictExperienceID', 'dictExperienceID.name'])
      .where('positionType', '=', reportParams.positionType)
      .orderBy('dictExperienceID.name')
      .selectAsObject() : []

    return {
      employee,
      employeeInfo,
      employeeInfoLast,
      experience,
      experienceByPos
    }
  },
  getParams: function (data, reportParams) {
    const empInfo = data.employeeInfo || data.employeeInfoLast || null
    let aTitle = UB.i18n('Довідковий розрахунок стажів')
    const employeeName = data.employee && (data.employee.genName || data.employee.fullFIO) ? '<br />' + (data.employee.genName || data.employee.fullFIO) : ''
    aTitle += employeeName
    if (empInfo) {
      aTitle += empInfo['positionID.fullNameGen'] || empInfo['positionID.fullName'] || empInfo['positionID.name']
        ? (employeeName ? ' ' : '<br />') + (empInfo['positionID.fullNameGen'] || empInfo['positionID.fullName'] || empInfo['positionID.name'])
        : ''
    }
    const calcMethod = AC.settings.get('hrCalcExperienceMethod', appAC.globalOrganization())
    let onDate = AC.dateService.shiftDate(reportParams.onDate)

    let remark1Text = reportParams.positionType
      ? `У Таблиці 2 не було перераховано жодного виду стажу  від запланованої Дати призначення на посаду, оскільки не були  визначені види стажів, які мають нараховуватись для даного типу посади (див. довідник "Стажі за типами посад").`
      : `Оскільки не вказаний тип посади, на яку планується призначення, у Таблиці 2 наводиться перерахунок для всіх видів стажів особи (приведених дат стажів від запланованої Дати призначення на посаду).  Проте при проведені наказу про призначення, зміняться тільки ті Стажі, які нараховуються для відповідного типу посади.`

    if (reportParams.positionType) {
      const expByPos = data.experienceByPos.map(exp => exp.dictExperienceID)
      const el = data.experience.find(o => expByPos.includes(o.dictExperienceID))
      if (el) {
        remark1Text = `У Таблиці 2 наводиться перерахунок стажів (приведених дат стажів) від запланованої Дати призначення на посаду. Перерахунок здійснено за стажами, які нараховуються для даного типу посад: ${data.experienceByPos.map(o => o['dictExperienceID.name']).join(', ')}`
      }
    }

    const result = {
      title: aTitle,
      experienceMethodTitle: calcMethod === 'SIMPLE'
        ? `спрощений - забезпечує розрахунок стажу без переведення періодів стажу з формату рр/мм/дд в дні (з припущенням, що 1 місяць дорівнює 30 дням)`
        : `точний (за кількістю днів) -  забезпечується обчислення стажу у днях роботи (всі періоди перераховуються у дні роботи; приведена дата визначається за сумою кількості днів)`,
      data1: [],
      data2: [],
      remark1Text,
      createDateTimeStr: AC.dateService.formatDate(new Date(), 'dd.mm.yyyy hh:nn:ss'),
      userName: $App.connection.userData('employeeFullFIO') || $App.connection.userData('employeeShortFIO') || $App.connection.userData('login')
    }
    const tableIds = [0, 1]
    tableIds.forEach(idx => {
      const obj = {
        onDate: AC.dateService.formatDate(reportParams.onDate),
        rows: data.experience.map(item => {
          let isRecalc = false
          let withCurrentDate = idx === 0
          if (idx === 1 && reportParams.positionType) {
            const expByPos = data.experienceByPos.find(o => o.dictExperienceID === item.dictExperienceID)
            if (!expByPos) {
              withCurrentDate = true
            } else {
              isRecalc = true
            }
          }
          const onCalcDate = item.startCalcDate && item.startCalcDate < onDate ? item.startCalcDate : onDate
          const totalDays = AC.dateService.dateDiff(item.calcDate, onCalcDate) + withCurrentDate

          let ymd = calcMethod === 'SIMPLE'
            ? AC.dateService.daysToYmd(totalDays)
            : AC.dateService.getYmd(item.calcDate, item.startCalcDate && item.startCalcDate < onDate ? item.startCalcDate : onDate, withCurrentDate)
          const calcDateVal = AC.dateService.addDays(onDate, -1 * totalDays)
          return {
            name: item['dictExperienceID.name'],
            calcDate: idx === 0 || (idx === 1 && !isRecalc) ? (item.calcDate ? AC.dateService.formatDate(item.calcDate) : '') : AC.dateService.formatDate(calcDateVal),
            endDate: idx === 0 && item.startCalcDate ? AC.dateService.formatDate(item.startCalcDate) : '',
            years: ymd.years,
            months: ymd.months,
            days: ymd.days,
            cntDays: totalDays,
            fromWorkbook: idx === 0 ? item.isFromWorkbook ? UB.i18n('так') : UB.i18n('ні') : '',
            modifyDate: idx === 0 ? AC.dateService.formatDate(item.modifyDate, 'dd.mm.yyyy hh:nn:ss') : '',
            isRecalc
          }
        })
      }
      if (idx === 0) {
        result.data1.push(obj)
      } else {
        result.data2.push(obj)
      }
    })

    return AC.reportService.removeEmptyValues(result)
  },
  onParamPanelConfig: function () {
    const me = this
    me.paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox' },
          items: [
            {
              xtype: 'datefield',
              name: 'onDate',
              labelWidth: 370,
              width: 490,
              allowBlank: false,
              fieldLabel: UB.i18n('Розрахувати стаж від планованої дати призначення'),
              value: AC.dateService.currentDate()
            },
            {
              xtype: 'ubcombobox',
              fieldLabel: UB.i18n('Тип посади'),
              labelWidth: 120,
              width: 490,
              name: 'positionType',
              hideEntityItemInContext: true,
              valueField: 'code',
              ubRequest: {
                entity: 'ubm_enum',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['ID', 'name', 'code', 'eGroup'],
                whereList: {
                  enumGroupFilter: {
                    expression: '[eGroup]',
                    condition: 'equal',
                    value: 'HR_POSITION_TYPE'
                  }
                }
              },
              listeners: {
                change: (ctrl, value) => {
                  const me = ctrl.up('form')
                  if (value) {
                    me.setLoading(true)
                    UB.Repository('hr_dictExperienceByPos')
                      .attrs('dictExperienceID.name')
                      .where('positionType', '=', value)
                      .selectAsObject().then(data => {
                        me.down('[ubID=expListLabel]').setText(`${UB.i18n('Види стажів')}: ${data.map(o => o['dictExperienceID.name']).join(', ')}`)
                        me.setLoading(false)
                      })
                  } else {
                    me.down('[ubID=expListLabel]').setText()
                  }
                }
              },
              flex: 1
            },
            {
              xtype: 'label',
              text: '',
              cls: 'x-form-item-label grd-italic',
              margin: '5 0 0 15',
              flex: 1,
              ubID: 'expListLabel'
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          onDate: frm.findField('onDate').getValue(),
          positionType: frm.findField('positionType').getValue()
        }
      }
    })

    const incomeParams = this.incomeParams || {}
    me.paramForm.on('afterrender', () => {
      if (incomeParams.expOnDate) {
        me.paramForm.down('[name=onDate]').setValue(incomeParams.expOnDate)
      }
    })
    return me.paramForm
  }
}
