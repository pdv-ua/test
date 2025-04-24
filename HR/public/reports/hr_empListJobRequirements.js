/* global UB HR AC appAC Ext $App _ */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const organizationID = appAC.globalOrganization()
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID)

    const result = {
      showAddDescrPerson,
      useActualPositionName,
      showOrg: reportParams.type,
      cols: 13 + (reportParams.dictExperienceID ? 1 : 0) + (reportParams.dictEducationLevelID ? 1 : 0) + (reportParams.dictDegreeID ? 1 : 0) +
        (reportParams.dictAcademStatusID ? 1 : 0) + (reportParams.salary ? 1 : 0) + (reportParams.category ? 1 : 0) + (reportParams.tarif ? 1 : 0) +
        (reportParams.accrual ? 2 : 0) + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0),
      widthTable: 1570 + (reportParams.dictExperienceID ? 100 : 0) + (reportParams.dictEducationLevelID ? 100 : 0) +
        (reportParams.dictDegreeID ? 100 : 0) + (reportParams.dictAcademStatusID ? 100 : 0) + (reportParams.salary ? 100 : 0) +
        (reportParams.category ? 100 : 0) + (reportParams.tarif ? 100 : 0) + (reportParams.accrual ? 300 : 0) +
        (showAddDescrPerson ? 200 : 0) + (useActualPositionName ? 200 : 0),
      eduName: reportParams.dictEducationLevelID ? UB.i18n('Рівень освіти') : '',
      degreeName: reportParams.dictDegreeID ? UB.i18n('Науковий ступінь') : '',
      academStatusName: reportParams.dictAcademStatusID ? UB.i18n('Вчене звання') : '',
      salaryName: reportParams.salary ? UB.i18n('Оклад посади') : '',
      accrualName: reportParams.accrual ? UB.i18n('Надбавки') : '',
      accrualPosName: reportParams.accrual ? UB.i18n('Надбавки посади') : '',
      categoryName: reportParams.category ? UB.i18n('Кваліфікаційна категорія посади') : '',
      tarifName: reportParams.tarif ? UB.i18n('Тарифний розряд посади') : '',
      experienceName: reportParams.dictExperienceID ? `${UB.i18n('Стаж')} ${reportParams.dictExperienceName}` : '',
      onDate: AC.dateService.formatDate(reportParams.onDate),
      rows: []
    }

    const org = await UB.Repository('hr_organization')
      .attrs(['nameGen', 'name'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: reportParams.onDate })
      .selectSingle()
    result.organizationName = org.nameGen || org.name || ''
    result.departmentName = await HR.reportUtils.getNameDepartment(reportParams.onDate, organizationID, reportParams.departmentID)

    const fieldList = ['employeeID', 'employeeNumberID', 'tabNum', 'fullFIO', 'taxCode', 'depName', 'posName', 'orgName',
      'workPlace', 'dateAppointmentPos', 'structDepName', 'dictStaffCat', 'accrualSum', 'certification', 'tarifName', 'addDescrPerson']

    if (reportParams.dictExperienceID) {
      fieldList.push('calcDate')
      fieldList.push('years')
      fieldList.push('months')
    }
    if (reportParams.dictEducationLevelID) {
      fieldList.push('eduName')
    }
    if (reportParams.dictDegreeID) {
      fieldList.push('scienceName')
    }
    if (reportParams.dictAcademStatusID) {
      fieldList.push('academName')
    }
    if (reportParams.salary) {
      fieldList.push('accrualSumPos')
    }
    if (reportParams.accrual) {
      fieldList.push('posID')
      // fieldList.push('accrual')
      // fieldList.push('accrualPos')
    }
    if (reportParams.category) {
      fieldList.push('empCategoryPos')
    }
    if (reportParams.tarif) {
      fieldList.push('tarifNamePos')
    }

    const rowsQuery = Object.assign({
      entity: 'hr_empListJobRequirements',
      method: 'search',
      fieldList: fieldList
    }, reportParams)

    const [
      { resultData: list }
    ] = await UB.connection.runTransAsObject([rowsQuery])

    let positionAccrualData = []
    let employeeAccrualData = []
    if (reportParams.accrual) {
      const size = 1000 // будем забирать данные блоками
      let employeeNumberIDs = _.uniq(list.map(el => el.employeeNumberID))
      let positionIDs = _.compact(_.uniq(list.map(el => el.posID)))
      const orgs = await HR.orgStructReportUtils.getOrganizationData(reportParams.onDate, reportParams.organizationID, reportParams.includeChildOrgs)
      const childOrgIDs = orgs.map(itm => itm.mi_data_id)

      if (positionIDs.length) {
        positionIDs = _.chunk(positionIDs, size)
        for (let i = 0; i < positionIDs.length; i++) {
          const ids = positionIDs[i]
          const aData = await UB.Repository('hr_positionAccrual')
            .attrs(['positionID', 'accrualSum', 'accrualRate', 'payElID', 'payElID.name', 'payElID.shortPrintName'])
            .whereIf(childOrgIDs.length, 'positionID.orgID', 'in', childOrgIDs)
            .where('positionID', 'in', ids)
            .where('positionID.state', '=', 'ACTIVE')
            .where('positionID.mi_deleteDate', '>=', '#maxdate')
            .where('positionID.mi_dateFrom', '<=', reportParams.onDate)
            .where('positionID.mi_dateTo', '>=', reportParams.onDate)
            .where('dateFrom', '<=', reportParams.onDate)
            .where('dateTo', '>=', reportParams.onDate)
            .selectAsObject({
              'positionID.parentUnitID': 'parentUnitID',
              'payElID.name': 'payElName',
              'payElID.shortPrintName': 'shortPayElName'
            })
          positionAccrualData.push(...aData)
        }
      }

      if (employeeNumberIDs.length) {
        employeeNumberIDs = _.chunk(employeeNumberIDs, size)
        for (let i = 0; i < employeeNumberIDs.length; i++) {
          const ids = employeeNumberIDs[i]
          const aData = await UB.Repository('hr_employeeAccrual')
            .attrs(['employeeNumberID', 'accrualSum', 'accrualRate', 'payElID', 'payElID.name', 'payElID.shortPrintName', 'payElID.dictExperienceID', 'payElID.methodID.code'])
            .where('dateFrom', '<=', reportParams.onDate)
            .where('dateTo', '>=', reportParams.onDate)
            .where('mi_deleteDate', '>=', '#maxdate')
            .where('employeeNumberID', 'in', ids)
            .selectAsObject({
              'payElID.name': 'payElName',
              'payElID.shortPrintName': 'shortPayElName',
              'payElID.methodID.code': 'methodCode',
              'payElID.dictExperienceID': 'dictExperienceID'
            })
          employeeAccrualData.push(...aData)
        }
      }
    }
    employeeAccrualData = employeeAccrualData && employeeAccrualData.length ? _.groupBy(employeeAccrualData, 'employeeNumberID') : {}
    positionAccrualData = positionAccrualData && positionAccrualData.length ? _.groupBy(positionAccrualData, 'positionID') : {}

    result.rows = list.map((row, index) => {
      const dep = HR.reportUtils.getReportDepStructFld(row.depID, row.depTree)
      const depStruct = HR.reportUtils.getReportDepStructFld(row.depID, row.structDepName)
      let expValue = ''
      let yearExp = 0
      let monthExp = 0
      if (reportParams.dictExperienceID && row.calcDate) {
        const ymd = AC.dateService.getYmd(row.calcDate, row.startCalcDate && row.startCalcDate < reportParams.onDate ? row.startCalcDate : reportParams.onDate, true)
        expValue = ymd.years + UB.i18n('р.') + ymd.months + UB.i18n('м.') + ymd.days + UB.i18n('д.')
        yearExp = ymd.years
        monthExp = ymd.months
      }
      const roundTo = AC.settings.get('hrRoundAccrualStaffTable', organizationID) === '1' ? 'decimal2' : 'numberGroup'

      return Object.assign({}, row, {
        showAddDescrPerson,
        useActualPositionName,
        npp: index + 1,
        dateAppointmentPos: row.dateAppointmentPos ? AC.dateService.formatDate(row.dateAppointmentPos) : '',
        yearsWork: row.dateAppointmentPos ? AC.dateService.yearsDiff(row.dateAppointmentPos, reportParams.onDate) : '',
        depTree: dep,
        structDepName: depStruct,
        eduName: !!reportParams.dictEducationLevelID,
        degreeName: !!reportParams.dictDegreeID,
        academStatusName: !!reportParams.dictAcademStatusID,
        experienceName: !!reportParams.dictExperienceID,
        salaryName: !!reportParams.salary,
        categoryName: !!reportParams.category,
        tarifName: !!reportParams.tarif,
        accrualSum: row.accrualSum || '',
        accrual: reportParams.accrual && employeeAccrualData[row.employeeNumberID] && positionAccrualData[row.posID]
          ? employeeAccrualData[row.employeeNumberID].filter(item => positionAccrualData[row.posID].map(p => p.payElID).indexOf(item.payElID) !== -1).map(item => {
            const qRate = item.accrualRate ? HR.reportUtils.getQuantityFractional(item.accrualRate) : ''
            return (item.shortPayElName ? (item.shortPayElName + ' ') : (item.payElName ? item.payElName + ' ' : '')) +
            (item.accrualRate
              ? HR.reportUtils.quantityToString(item.accrualRate, qRate) + `&nbsp;%`
              : HR.reportUtils.quantityToString(item.accrualSum || 0, roundTo) + '&nbsp;' + UB.i18n('грн'))
          }).join(';<br />')
          : '',
        accrualPos: reportParams.accrual && positionAccrualData[row.posID] ? positionAccrualData[row.posID].map(item => {
          const qRate = item.accrualRate ? HR.reportUtils.getQuantityFractional(item.accrualRate) : ''
          return (item.shortPayElName ? (item.shortPayElName + ' ') : (item.payElName ? item.payElName + ' ' : '')) +
          (item.accrualRate
            ? HR.reportUtils.quantityToString(item.accrualRate, qRate) + `&nbsp;%`
            : HR.reportUtils.quantityToString(item.accrualSum || 0, roundTo) + '&nbsp;' + UB.i18n('грн'))
        }).join(';<br />') : '',
        certification: row.certification || '',
        rTarifName: row.tarifName || '',
        accrualSumPos: row.accrualSumPos || '',
        empCategoryPos: row.empCategoryPos || '',
        rTarifNamePos: row.tarifNamePos || '',
        rEduName: row.eduName || '',
        rScienceName: row.scienceName || '',
        rAcademName: row.academName || '',
        valueExp: reportParams.dictExperienceID ? 12 * yearExp + monthExp : 0,
        valuesPos: reportParams.dictExperienceID ? 12 * (row.years || 0) + (row.months || 0) : 0,
        experience: expValue,
        roundTo: roundTo
      })
    })

    return result
  },
  onParamPanelConfig: function () {
    const accMainReportsSubOrg = AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox' },
          items: [
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getOrgCombo({
                  labelWidth: 160,
                  width: 600,
                  flex: 1,
                  readOnly: !accMainReportsSubOrg,
                  ubRequest: {
                    entity: 'hr_organization',
                    fieldList: ['mi_data_id', 'description', 'mi_treePath'],
                    whereList: {
                      state: {
                        expression: '[state]',
                        condition: '=',
                        values: {
                          state: 'ACTIVE'
                        }
                      },
                      path: {
                        expression: accMainReportsSubOrg ? '[mi_treePath]' : '[mi_data_id]',
                        condition: accMainReportsSubOrg ? 'like' : '=',
                        values: {
                          state: accMainReportsSubOrg ? `/${appAC.globalOrganization()}/` : appAC.globalOrganization()
                        }
                      }
                    },
                    orderList: { orderBy: { expression: 'description' } },
                    __mip_ondate: appAC.globalApplicationDate()
                  },
                  listeners: {
                    change: function (ctrl) {
                      const form = ctrl.up('form')
                      HR.controlService.onChangeIncludeChildOrgs(form)
                    }
                  }
                }),
                HR.controlService.getIncludeChildOrgs(accMainReportsSubOrg)
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getDepCombo({
                  labelWidth: 160,
                  width: 600,
                  displayField: 'description',
                  flex: 1,
                  listeners: {
                    change: function (ctrl, value) {
                      const form = ctrl.up('form')
                      form.down('[name=includeChildDepts]').setReadOnly(!value)
                      if (!value) {
                        form.down('[name=includeChildDepts]').setValue()
                      }
                    }
                  }
                }),
                HR.controlService.getIncludeChildDepts()
              ]
            },
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
                  value: appAC.globalApplicationDate(),
                  allowBlank: false
                },
                {
                  xtype: 'checkboxfield',
                  labelWidth: 250,
                  name: 'dontRequirements',
                  fieldLabel: UB.i18n('не відповідають вимогам'),
                  checked: true,
                  listeners: {
                    change: function (ctrl) {
                      const form = ctrl.up('form')
                      if (!form) {
                        return
                      }
                      const value = ctrl.getValue()
                      const sal = form.down('[name=salary]')
                      const cat = form.down('[name=category]')
                      const tar = form.down('[name=tarif]')
                      const acc = form.down('[name=accrual]')
                      sal.setDisabled(!value)
                      cat.setDisabled(!value)
                      tar.setDisabled(!value)
                      acc.setDisabled(!value)
                      sal.setValue()
                      cat.setValue()
                      tar.setValue()
                      acc.setValue()
                    }
                  }
                }
              ] },
            {
              xtype: 'panel',
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubcombobox',
                  name: 'dictExperienceID',
                  fieldLabel: UB.i18n('Вид стажу'),
                  labelWidth: 160,
                  width: 600,
                  gridFieldList: ['code', 'name'],
                  displayField: 'name',
                  ubRequest: {
                    entity: 'hr_dictExperience',
                    fieldList: ['ID', 'code', 'name'],
                    orderList: { orderBy: { expression: 'name' } }
                  }
                },
                {
                  xtype: 'checkboxfield',
                  labelWidth: 200,
                  name: 'salary',
                  fieldLabel: UB.i18n('Оклад'),
                  checked: false
                }
              ]
            },
            {
              xtype: 'panel',
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubboxselect',
                  name: 'dictEducationLevelID',
                  fieldLabel: UB.i18n('Рівень освіти'),
                  flex: 1,
                  labelWidth: 160,
                  width: 600,
                  gridFieldList: ['code', 'name'],
                  displayField: 'name',
                  valueField: 'ID',
                  ubRequest: {
                    entity: 'hr_dictEducationLevel',
                    fieldList: ['ID', 'code', 'name'],
                    orderList: { orderBy: { expression: 'name' } }
                  }
                },
                {
                  xtype: 'checkboxfield',
                  labelWidth: 200,
                  name: 'accrual',
                  fieldLabel: UB.i18n('Постійні надбавки'),
                  checked: false
                }
              ]
            },
            {
              xtype: 'panel',
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubboxselect',
                  name: 'dictDegreeID',
                  fieldLabel: UB.i18n('Науковий ступінь'),
                  flex: 1,
                  labelWidth: 160,
                  width: 600,
                  gridFieldList: ['code', 'name'],
                  displayField: 'name',
                  valueField: 'ID',
                  ubRequest: {
                    entity: 'hr_dictDegree',
                    fieldList: ['ID', 'code', 'name'],
                    orderList: { orderBy: { expression: 'name' } }
                  }
                },
                {
                  xtype: 'checkboxfield',
                  labelWidth: 200,
                  name: 'category',
                  fieldLabel: UB.i18n('Кваліфікаційна категорія'),
                  checked: false
                }
              ]
            },
            {
              xtype: 'panel',
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubboxselect',
                  name: 'dictAcademStatusID',
                  fieldLabel: UB.i18n('Вчене звання'),
                  flex: 1,
                  labelWidth: 160,
                  width: 600,
                  gridFieldList: ['code', 'name'],
                  displayField: 'name',
                  valueField: 'ID',
                  ubRequest: {
                    entity: 'hr_dictAcademStatus',
                    fieldList: ['ID', 'code', 'name'],
                    orderList: { orderBy: { expression: 'name' } }
                  }
                },
                {
                  xtype: 'checkboxfield',
                  labelWidth: 200,
                  name: 'tarif',
                  fieldLabel: UB.i18n('Тарифний розряд'),
                  checked: false
                }
              ]
            }
          ]
        }
      ],
      validateForm: function () {
        const me = this
        const dictEducationLevelID = me.down('[name=dictEducationLevelID]').getValue()
        const dictDegreeID = me.down('[name=dictDegreeID]').getValue()
        const dictAcademStatusID = me.down('[name=dictAcademStatusID]').getValue()
        const dictExperienceID = me.down('[name=dictExperienceID]').getValue()
        const salary = me.down('[name=salary]').getValue()
        const accrual = me.down('[name=accrual]').getValue()
        const category = me.down('[name=category]').getValue()
        const tarif = me.down('[name=tarif]').getValue()

        if (!dictEducationLevelID && !dictDegreeID && !dictAcademStatusID && !dictExperienceID &&
          !salary && !category && !tarif && !accrual) {
          $App.dialogError(UB.i18n('Не задані параметри пошуку!'), UB.i18n('Помилка'))
          return false
        }
        return true
      },
      getParameters: function (owner) {
        const frm = owner.getForm()

        return {
          organizationID: frm.findField('organizationID').getValue(),
          includeChildOrgs: frm.findField('includeChildOrgs').getValue(),
          departmentID: frm.findField('departmentID').getValue(),
          includeChildDepts: frm.findField('includeChildDepts').getValue(),
          onDate: frm.findField('onDate').getValue(),
          dontRequirements: frm.findField('dontRequirements').getValue(),
          dictEducationLevelID: frm.findField('dictEducationLevelID').getValue(),
          dictDegreeID: frm.findField('dictDegreeID').getValue(),
          dictAcademStatusID: frm.findField('dictAcademStatusID').getValue(),
          dictExperienceID: frm.findField('dictExperienceID').getValue(),
          dictExperienceName: frm.findField('dictExperienceID').getRawValue(),
          salary: frm.findField('salary').getValue(),
          accrual: frm.findField('accrual').getValue(),
          category: frm.findField('category').getValue(),
          tarif: frm.findField('tarif').getValue()
        }
      }
    })
    return paramForm
  }
}
