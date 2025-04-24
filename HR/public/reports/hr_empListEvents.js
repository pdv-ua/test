/* global UB, HR, AC, Ext, _, appAC, $App */

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    const onDate = reportParams.onDate
    const stateOrg = AC.settings.get('hrFuncOrgType', reportParams.organizationID) === '2'
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID) === true
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID) === true

    const colSpan = 14 + (stateOrg ? 2 : 0) + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0)
    const result = {
      showAddDescrPerson,
      useActualPositionName,
      cols: colSpan,
      cols2: Math.ceil((colSpan - 3) / 2),
      cols3: (colSpan - 3) - Math.ceil((colSpan - 3) / 2),
      widthTable: 1900 + (stateOrg ? 220 : 0) + (showAddDescrPerson ? 100 : 0) + (useActualPositionName ? 200 : 0),
      rows: [],
      dateFrom: AC.dateService.formatDate(reportParams.dateFrom),
      dateTo: AC.dateService.formatDate(reportParams.dateTo),
      respName: '',
      respPosName: '',
      stateOrg,
      colNums: []
    }
    for (let i = 1; i <= result.cols; ++i) {
      result.colNums.push({ value: i })
    }

    result.organizationName = await HR.reportUtils.getNameOrganization(onDate, reportParams.organizationID)
    result.departmentName = await HR.reportUtils.getNameDepartment(onDate, reportParams.organizationID, reportParams.departmentID)

    if (reportParams.respID) {
      const respPosInfo = await HR.reportUtils.getResponsiblesIncaseInfo(reportParams.respID, onDate, undefined, true)
      result.respName = (respPosInfo && respPosInfo.respName) || ''
      result.respPosName = (respPosInfo && respPosInfo.respPosFull) || ''
    }

    const rowsQuery1 = Object.assign({
      entity: 'hr_empListAppointed',
      method: 'search2'
    }, reportParams)

    const rowsQuery2 = Object.assign({
      entity: 'hr_empListMoved',
      method: 'search2'
    }, reportParams)

    const rowsQuery3 = Object.assign({
      entity: 'hr_empListDism',
      method: 'search2'
    }, reportParams)

    const [
      { resultData: posAll },
      { resultData: pos2 },
      { resultData: pos3 }
    ] = await UB.connection.runTransAsObject([rowsQuery1, rowsQuery2, rowsQuery3])

    let pos = posAll.filter(item => (new Date(item.dateFrom) >= reportParams.dateFrom && new Date(item.dateFrom) <= reportParams.dateTo))
    pos.push(...pos2)
    pos.push(...pos3)

    const array = []
    pos = pos ? _.groupBy(pos, 'employeePositionID') : []
    _.forEach(pos, (item) => {
      let flt = posAll.filter(el => (el.employeeID === item[0].employeeID && el.organizationID === item[0].organizationID && el.workPlace !== '2'))
      let date1 = ''
      if (flt && flt.length > 0) {
        flt = _.sortBy(flt, 'dateFrom').reverse()
        date1 = flt[0].dateFrom ? AC.dateService.formatDate(flt[0].dateFrom) : ''
      }

      const obj = Object.assign({}, item[0], {
        lastName: item[0].lastName ? item[0].lastName.toUpperCase() : '',
        date1: date1,
        date2: '',
        date3: '',
        date4: ''
      })

      let d2, d3, d4
      for (let i = 0; i < item.length; ++i) {
        if ((item[i]['empOrderType'] === 'APPOINT' || item[i]['empOrderType'] === 'APPOINT_LIQ' || (item[i]['empOrderType'] === 'APPOINT_MOVE' && item[i]['isAppoint'])) && item[i].dateFrom) {
          d2 = item[i].dateFrom
          obj.date2 = AC.dateService.formatDate(item[i].dateFrom)
        }
        if ((item[i]['empOrderType'] === 'MOVE' || (item[i]['empOrderType'] === 'APPOINT_MOVE' && item[i]['isMove'])) && item[i].dateFrom) {
          d3 = item[i].dateFrom
          obj.date3 = AC.dateService.formatDate(item[i].dateFrom)
        }
        if (item[i]['empOrderType'] === 'DISM' && item[i].dateFrom) {
          d4 = item[i].dateFrom
          obj.date4 = AC.dateService.formatDate(item[i].dateFrom)
        }
      }
      result.rows.push(obj)

      if (!date1 && item[0].workPlace !== '1' && (d2 || d3 || d4)) {
        date1 = d2 || d3 || d4
        const f = _.find(array, { employeeID: item[0].employeeID, organizationID: item[0].organizationID, date: date1 })
        if (!f) {
          array.push({ employeeID: item[0].employeeID, organizationID: item[0].organizationID, date: date1, dateFrom: null, employeePositionID: [item[0].employeePositionID] })
        } else {
          f.employeePositionID.push(item[0].employeePositionID)
        }
      }
    })
    for (let i = 0; i < array.length; i++) {
      const posInfo = await UB.Repository('hr_employeePositionS')
        .attrs('ID', 'employeeID', 'employeeNumberID.dateFrom')
        .where('organizationID', '=', array[i].organizationID)
        .where('employeeID', '=', array[i].employeeID)
        .where('employeeID.mi_deleteDate', '>=', '#maxdate')
        .where('workPlace', '=', '1')
        .where('dateFrom', '<=', array[i].date)
        .where('dateTo', '>=', array[i].date)
        .selectAsObject()
      if (posInfo && posInfo.length) {
        array[i].dateFrom = posInfo[0]['employeeNumberID.dateFrom']
      }
    }

    result.rows = result.rows.sort(me.uaSortFIO_DD)
    result.rows = result.rows.map((row, index) => {
      let date1 = row.date1 || ''
      if (row.workPlace !== '1' && !date1) {
        const f = _.find(array, { employeePositionID: [row.employeePositionID] })
        if (f && f.dateFrom) {
          date1 = AC.dateService.formatDate(f.dateFrom)
        }
      }

      return Object.assign({}, row, {
        showAddDescrPerson,
        useActualPositionName,
        stateOrg,
        date1: date1,
        index: index + 1,
        depName: HR.reportUtils.getReportDepStructFld(row.depID, row.depName),
        structDepName: HR.reportUtils.getReportDepStructFld(row.depID, row.structDepName)
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
                  labelWidth: 150,
                  width: 700,
                  flex: 1,
                  readOnly: !accMainReportsSubOrg,
                  ubRequest: {
                    entity: 'hr_organization',
                    fieldList: ['mi_data_id', 'description', 'mi_treePath'],
                    whereList: {
                      state: {
                        expression: '[state]',
                        condition: '=',
                        values: 'ACTIVE'
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
                HR.controlService.getIncludeChildOrgs(accMainReportsSubOrg, {
                  listeners: {
                    change: function (ctrl, value) {
                      const form = ctrl.up('form')
                      HR.controlService.onChangeIncludeChildOrgs(form)

                      const type = form.down('[name=type]')
                      type.setReadOnly(value)
                      if (value) {
                        type.setValue()
                      }
                    }
                  }
                })
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getDepCombo({
                  labelWidth: 150,
                  width: 700,
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
                  xtype: 'checkboxfield',
                  labelWidth: 150,
                  width: 315,
                  name: 'type',
                  fieldLabel: UB.i18n('Враховувати міжорганізаційні накази'),
                  checked: false
                },
                {
                  xtype: 'checkboxfield',
                  name: 'fullPosName',
                  fieldLabel: UB.i18n('Повна назва посади'),
                  labelWidth: 160,
                  margin: '18 0 0 0',
                  checked: false
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              flex: 1,
              items: [
                {
                  xtype: 'datefield',
                  name: 'dateFrom',
                  labelWidth: 150,
                  width: 300,
                  fieldLabel: UB.i18n('Період з'),
                  allowBlank: false,
                  value: AC.dateService.addMonths(new Date((new Date()).getFullYear(), (new Date()).getMonth(), 1, 0, 0, 0, 0), -1),
                  validator: function () {
                    const me = paramForm.getForm()
                    const f = me.findField('dateFrom').getValue()
                    const t = me.findField('dateTo').getValue()
                    return (f > t)
                      ? UB.i18n('Дата кінця періоду повинна перевищувати дату початку')
                      : true
                  }
                },
                {
                  xtype: 'datefield',
                  name: 'dateTo',
                  labelWidth: 30,
                  width: 100,
                  fieldLabel: UB.i18n('по'),
                  allowBlank: false,
                  value: AC.dateService.lastDayOfMonth(AC.dateService.addMonths(new Date((new Date()).getFullYear(), (new Date()).getMonth(), 1, 0, 0, 0, 0), -1)),
                  validator: function () {
                    const me = paramForm.getForm()
                    const f = me.findField('dateFrom').getValue()
                    const t = me.findField('dateTo').getValue()
                    return (f > t)
                      ? UB.i18n('Дата кінця періоду повинна перевищувати дату початку')
                      : true
                  }
                }
              ]
            },
            HR.controlService.getRespEmpCombo({
              name: 'respID',
              fieldLabel: UB.i18n('Відповідальний'),
              labelWidth: 150,
              width: 700,
              allowBlank: true,
              defaultOrgBoss: false,
              listeners: {
                render: function (ctrl) {
                  if ($App.connection.userData().employeeNumberID) {
                    ctrl.store.on('load', () => {
                      if (!ctrl.store.isLoaded) {
                        const id = $App.connection.userData().employeeNumberID
                        UB.Repository('hr_employeePositionS')
                          .attrs('ID', 'dateFrom')
                          .where('employeeNumberID', '=', id)
                          .orderBy('dateFrom', 'desc')
                          .selectAsObject()
                          .then(posInfo => {
                            if (posInfo && posInfo.length > 0) {
                              ctrl.setValueById(posInfo[0].ID)
                            }
                            ctrl.store.isLoaded = true
                          })
                      }
                    })
                  }
                  ctrl.store.load()
                }
              }
            })
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          organizationID: frm.findField('organizationID').getValue(),
          includeChildOrgs: frm.findField('includeChildOrgs').getValue(),
          departmentID: frm.findField('departmentID').getValue(),
          includeChildDepts: frm.findField('includeChildDepts').getValue(),
          typeOrg: frm.findField('type').getValue(),
          fullPosName: frm.findField('fullPosName').getValue(),
          respID: frm.findField('respID').getValue() || 0,
          dateFrom: AC.dateService.shiftDate(frm.findField('dateFrom').getValue()),
          dateTo: AC.dateService.shiftDate(frm.findField('dateTo').getValue()),
          onDate: AC.dateService.shiftDate(frm.findField('dateTo').getValue())
        }
      }
    })
    return paramForm
  },
  uaSortFIO_DD: function (s1, s2) {
    let i = HR.reportUtils.CompareStringUa((s1.fullFIO || ''), (s2.fullFIO || ''))
    if (i === 0) {
      i = HR.reportUtils.compareDates(s1.dateFrom, s2.dateFrom)
    }
    return i
  }
}
