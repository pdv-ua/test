/* global Ext UB AC HR appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const organizationID = reportParams.organizationID || 0
    const departmentID = reportParams.departmentID || 0
    const onDate = reportParams.onDate || appAC.globalApplicationDate()
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID) === true

    const orgs = await UB.Repository('hr_organization')
      .attrs(['nameGen', 'name'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .where('mi_deleteDate', '>=', '#maxdate')
      .selectSingle()

    const result = {
      colNums: [],
      showAddDescrPerson,
      useActualPositionName,
      colSpan: 25 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0),
      tableWidth: 3225 + (showAddDescrPerson ? 200 : 0) + (useActualPositionName ? 200 : 0),
      organizationName: orgs ? orgs.nameGen || orgs.name || '' : '',
      departmentName: '',
      workPlaceName: reportParams.workPlaceName ? `${UB.i18n('Місце роботи')}: ${reportParams.workPlaceName}` : '',
      dateFrom: AC.dateService.formatDate(reportParams.dateFrom),
      dateTo: AC.dateService.formatDate(reportParams.dateTo),
      onDate: AC.dateService.formatDate(onDate)
    }
    for (let i = 1; i <= result.colSpan; i++) {
      result.colNums.push({ name: i })
    }

    if (departmentID) {
      const depNames = await UB.Repository('hr_department')
        .attrs(['nameGen', 'name'])
        .where('mi_data_id', '=', departmentID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: onDate })
        .selectSingle()
      result.departmentName = HR.nameCase.cap((depNames && (depNames.nameGen || depNames.name)) || '')
    }

    const rowsQuery = Object.assign({
      entity: 'hr_empListByDisability',
      method: 'search'
    }, reportParams)

    const [
      { resultData: emps }
    ] = await UB.connection.runTransAsObject([rowsQuery])

    result.rows = emps.map((row, index) => {
      return Object.assign({}, row, {
        showAddDescrPerson,
        useActualPositionName,
        pn: index + 1,
        dayCount: row.dayCount || 0,
        disabilityDateFrom: row.disabilityDateFrom && AC.dateService.formatDate(row.disabilityDateFrom) !== '01.01.2000' ? AC.dateService.formatDate(row.disabilityDateFrom) : '',
        disabilityDateTo: row.disabilityDateTo && AC.dateService.formatDate(row.disabilityDateTo) !== '31.12.9999' ? AC.dateService.formatDate(row.disabilityDateTo) : '',
        benefitsDateFrom: row.benefitsDateFrom && AC.dateService.formatDate(row.benefitsDateFrom) !== '01.01.2000' ? AC.dateService.formatDate(row.benefitsDateFrom) : '',
        benefitsDateTo: row.benefitsDateTo && AC.dateService.formatDate(row.benefitsDateTo) !== '31.12.9999' ? AC.dateService.formatDate(row.benefitsDateTo) : '',
        startWork: row.startWork ? AC.dateService.formatDate(row.startWork) : '',
        birthDate: row.birthDate ? AC.dateService.formatDate(row.birthDate) : '',
        depFirst: HR.reportUtils.getReportDepStructFld(row.depName, row.depFirst),
        depTree: HR.reportUtils.getReportDepStructFld(row.depName, row.depTree)
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
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubdatefield',
                  labelWidth: 120,
                  name: 'dateFrom',
                  fieldLabel: UB.i18n('Період з'),
                  value: AC.dateService.firstDayOfMonth(new Date()),
                  allowBlank: false,
                  validator: function () {
                    const me = paramForm.getForm()
                    const f = me.findField('dateFrom').getValue()
                    const t = me.findField('dateTo').getValue()
                    if (f && t) {
                      me.findField('dateTo').clearInvalid()
                      return (f > t)
                        ? UB.i18n('Дата кінця періоду повинна перевищувати дату початку')
                        : true
                    }
                    return true
                  }
                },
                {
                  xtype: 'ubdatefield',
                  labelWidth: 50,
                  name: 'dateTo',
                  fieldLabel: UB.i18n('по'),
                  value: AC.dateService.lastDayOfMonth(new Date()),
                  allowBlank: false,
                  validator: function () {
                    const me = paramForm.getForm()
                    const f = me.findField('dateFrom').getValue()
                    const t = me.findField('dateTo').getValue()
                    if (f && t) {
                      me.findField('dateTo').clearInvalid()
                      return (f > t)
                        ? UB.i18n('Дата кінця періоду повинна перевищувати дату початку')
                        : true
                    }
                    return true
                  }
                }
              ]
            },
            {
              xtype: 'panel',
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getOrgCombo({
                  labelWidth: 120,
                  width: 700,
                  readOnly: !accMainReportsSubOrg,
                  ubRequest: {
                    entity: 'hr_organization',
                    fieldList: ['mi_data_id', 'description', 'mi_treePath'],
                    whereList: {
                      state: {
                        expression: '[state]',
                        condition: '=',
                        value: 'ACTIVE'
                      },
                      path: {
                        expression: accMainReportsSubOrg ? '[mi_treePath]' : '[mi_data_id]',
                        condition: accMainReportsSubOrg ? 'like' : '=',
                        value: accMainReportsSubOrg ? `/${appAC.globalOrganization()}/` : appAC.globalOrganization()
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
              xtype: 'panel',
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getDepCombo({
                  labelWidth: 120,
                  width: 700,
                  displayField: 'description',
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
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubcombobox',
                  name: 'positionID',
                  fieldLabel: UB.i18n('Посада'),
                  labelWidth: 120,
                  width: 700,
                  valueField: 'ID',
                  displayField: 'name',
                  ubRequest: {
                    entity: 'hr_position',
                    method: 'select',
                    fieldList: ['ID', 'description', 'name'],
                    orderList: { orderBy: { expression: 'description' } }
                  }
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubcombobox',
                  name: 'workPlace',
                  labelWidth: 120,
                  width: 700,
                  fieldLabel: UB.i18n('Місце роботи'),
                  hideEntityItemInContext: true,
                  enumGroupFilter: 'HR_WORKER_PLACE',
                  valueField: 'code',
                  displayField: 'name',
                  ubRequest: {
                    entity: 'ubm_enum',
                    method: UB.core.UBCommand.methodName.SELECT,
                    fieldList: ['code', 'name', 'eGroup', 'sortOrder'],
                    whereList: {
                      eGroup: {
                        expression: '[eGroup]',
                        condition: 'equal',
                        value: 'HR_WORKER_PLACE'
                      }
                    }
                  },
                  listeners: {
                    render: function (ctrl) {
                      ctrl.store.on('load', () => {
                        if (!ctrl.store.isLoaded) {
                          ctrl.setValue('1')
                          ctrl.store.isLoaded = true
                        }
                      })
                      ctrl.store.load()
                    }
                  }
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'checkbox',
                  labelWidth: 180,
                  name: 'showDism',
                  fieldLabel: UB.i18n('Враховувати звільнених')
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          onDate: appAC.globalApplicationDate(),
          dateFrom: frm.findField('dateFrom').getValue(),
          dateTo: frm.findField('dateTo').getValue(),
          organizationID: frm.findField('organizationID').getValue(),
          includeChildOrgs: frm.findField('includeChildOrgs').getValue(),
          departmentID: frm.findField('departmentID').getValue(),
          includeChildDepts: frm.findField('includeChildDepts').getValue(),
          positionID: frm.findField('positionID').getValue(),
          workPlace: frm.findField('workPlace').getValue(),
          workPlaceName: frm.findField('workPlace').getRawValue(),
          showDism: frm.findField('showDism').getRawValue()
        }
      }
    })
    return paramForm
  }

}
