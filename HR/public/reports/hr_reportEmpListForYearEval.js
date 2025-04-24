/* global $App Ext UB AC appAC HR _ */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams

    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    const onDate4Sql = AC.dateService.shiftDate(reportParams.onDate)
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID) === true
    // reportParams.includeChildOrgs = reportParams.departmentID ? false : reportParams.includeChildOrgs
    const colSpan = 15 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0)
    const params = {
      showAddDescrPerson,
      useActualPositionName,
      colSpan: colSpan,
      colSpan2: Math.ceil((colSpan - 3) / 2),
      colSpan3: (colSpan - 3) - Math.ceil((colSpan - 3) / 2),
      tableWidth: 1570 + (showAddDescrPerson ? 150 : 0) + (useActualPositionName ? 200 : 0),
      data: [],
      year: reportParams.year,
      dateFrom: reportParams.onDate ? AC.dateService.formatDate(reportParams.onDate) : ''
    }

    params.respName = reportParams.respID
      ? await UB.Repository('hr_employeePositionS')
        .attrs(['employeeID.shortFIO'])
        .where('ID', '=', reportParams.respID)
        .selectScalar() || '' : ''

    const empList = Object.assign({
      entity: 'hr_reportEmpListForYearEval',
      method: 'search'
    }, reportParams)
    const task = Object.assign({
      entity: 'hr_reportEmpListForYearEval',
      method: 'search2'
    }, reportParams)

    const [
      { resultData: assessment },
      { resultData: tasks }
    ] = await UB.connection.runTransAsObject([empList, task])

    const orgs = await HR.orgStructReportUtils.getOrganizationData(onDate4Sql, reportParams.organizationID, reportParams.includeChildOrgs)
    const childOrgIDs = orgs.map(itm => itm.mi_data_id)
    const orgNames = _.find(orgs, { 'mi_data_id': reportParams.organizationID })
    params.organizationName = orgNames ? HR.nameCase.cap(orgNames.name || '') : ''
    params.departmentName = await HR.reportUtils.getNameDepartment(onDate4Sql, reportParams.organizationID, reportParams.departmentID)

    const departments = await HR.orgStructReportUtils.getDepartmentIDs(onDate4Sql, childOrgIDs, reportParams.departmentID, reportParams.includeChildDepts)
    const orgStruct = await HR.orgStructReportUtils.getStaffUnitData(onDate4Sql, childOrgIDs, reportParams.departmentID, reportParams.includeChildDepts, [], false)
    if (!orgStruct || !assessment || !assessment.length) {
      return params
    }

    const assessmentData = []
    const datas = _.groupBy(assessment, 'employeeID')
    _.forEach(datas, items => {
      items = _.sortBy(items, 'workPlace')
      assessmentData.push(items[0])
    })

    const outs = []
    const resData = assessment.map(item => item.employeeNumberID)
    const config = [{
      ub: 'hr_empOrderVacationListDet',
      attr: ['employeeNumberID', 'empOrderType', 'dictVacationKindID.name', 'dateFrom', 'dateTo']
    }, {
      ub: 'hr_empOrderVacationlongDet',
      attr: ['employeeNumberID', 'empOrderType', 'dictVacationKindID.name', 'dateFrom', 'dateTo']
    }, {
      ub: 'hr_empOrderMilserviceDet',
      attr: ['employeeNumberID', 'empOrderType', 'dateFrom', 'dateTo']
    }]

    for (let i = 0; i < config.length; i++) {
      const orderDet = await UB.Repository(config[i].ub)
        .attrs(config[i].attr)
        .where('orderID.orderState', '=', 'POSTED')
        .where('employeeNumberID', 'in', resData)
        .whereIf(config[i].ub !== 'hr_empOrderMilserviceDet', 'dictVacationKindID.isTempVacancy', '=', '1')
        .where('dateFrom', '<=', onDate4Sql)
        .where('dateTo', '>=', onDate4Sql, 'w1')
        .where('dateTo', 'isNull', undefined, 'w2')
        .logic('(([w1]) or ([w2]))')
        .selectAsObject()
      if (orderDet) {
        outs.push(...orderDet)
      }
    }

    const posData = await UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'name', 'dictPositionID.fullName', 'dictPositionID.name'])
      .misc({ __mip_ondate: onDate4Sql })
      .where('state', '=', 'ACTIVE')
      .whereIf(childOrgIDs.length, 'orgID', 'in', childOrgIDs)
      .whereIf(departments.length, 'parentUnitID', 'in', departments)
      .selectAsObject()

    const tree = me.generateDataForReport(orgs, reportParams.departmentID || reportParams.organizationID, orgStruct,
      posData, assessmentData, tasks, outs, onDate4Sql, params.colSpan, showAddDescrPerson, useActualPositionName)
    params.data = tree && tree.data ? tree.data : []
    return AC.reportService.removeEmptyValues(params)
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
                  labelWidth: 130,
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
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getDepCombo({
                  labelWidth: 130,
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
              xtype: 'numberfield',
              labelWidth: 130,
              width: 210,
              name: 'year',
              fieldLabel: UB.i18n('За рік'),
              maxValue: 9999,
              minValue: 1970,
              allowBlank: false,
              vtype: 'numberValidator',
              listeners: {
                afterrender: function (crtl) {
                  const year = appAC.globalApplicationDate().getFullYear()
                  crtl.setValue(year)
                }
              }
            },
            HR.controlService.getRespEmpCombo({
              name: 'respID',
              fieldLabel: UB.i18n('Відповідальний'),
              labelWidth: 130,
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
            }),
            {
              xtype: 'datefield',
              name: 'onDate',
              labelWidth: 130,
              width: 250,
              allowBlank: false,
              fieldLabel: UB.i18n('Станом на'),
              value: AC.dateService.todayDate()
            }
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
          year: frm.findField('year').getValue(),
          respID: frm.findField('respID').getValue() || 0,
          onDate: frm.findField('onDate').getValue()
        }
      }
    })
    return paramForm
  },

  generateDataForReport: function (orgs, itemID, orgStruct, positionData, empData, tasks, outs, onDate, colSpan, showAddDescrPerson, useActualPositionName) {
    tasks = tasks && tasks.length ? _.groupBy(tasks, 'employeeNumberID') : {}
    outs = outs && outs.length ? _.groupBy(outs, 'employeeNumberID') : {}

    function getEmpPosData (row) {
      let taskInfo = ''
      if (tasks[row.employeeNumberID]) {
        const task = tasks[row.employeeNumberID]
        if (_.size(_.groupBy(task, 'issueDate')) === 1) {
          taskInfo = task[0].issueDate ? AC.dateService.formatDate(task[0].issueDate) : ''
        } else {
          taskInfo = task.map(item => `${item.number}${item.issueDate ? ' - ' + AC.dateService.formatDate(item.issueDate) : ''}`).join(', ')
        }
      }
      let outsInfo = ''
      if (outs[row.employeeNumberID]) {
        const out = outs[row.employeeNumberID]
        outsInfo = out.map(item => {
          let out = ''
          if (item.empOrderType === 'MILSERVICE') {
            out = UB.i18n(`Військова служба`)
          } else {
            out = item['dictVacationKindID.name'] || UB.i18n('Відпуска')
          }
          out += `${item.dateFrom ? ' з&nbsp;' + AC.dateService.formatDate(item.dateFrom) : ''}${item.dateTo ? (AC.dateService.formatDate(item.dateTo) === '31.12.9999' ? '' : ' по&nbsp;' + AC.dateService.formatDate(item.dateTo)) : ''}`
          return out
        })
      }

      return Object.assign({}, row, {
        colSpan: colSpan,
        showAddDescrPerson,
        useActualPositionName,
        agreementDate: AC.dateService.formatDate(row.agreementDate),
        acquaintanceDate: AC.dateService.formatDate(row.acquaintanceDate),
        conclusionDate: AC.dateService.formatDate(row.conclusionDate),
        taskInfo: taskInfo,
        posDate: outsInfo || AC.dateService.formatDate(row.dateFrom),
        depTree: HR.reportUtils.getReportDepStructFld(row.depID, row.depTree),
        depFirst: HR.reportUtils.getReportDepStructFld(row.depID, row.depFirst)
      })
    }

    function getData (indexNpp, orgID, parentID, level = 1) {
      const result = {
        data: []
      }
      const curStruct = orgStruct.filter(el => el.parentUnitID === parentID && el.orgID === orgID)
      const str = level === 1 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)
      const styleBegin = level === 1 ? '<font color="blue">' : level === 2 ? '<u>' : ''
      const styleEnd = level === 1 ? '</font>' : level === 2 ? '</u>' : ''

      curStruct.forEach(orgItem => {
        if (orgItem.mi_unityEntity !== 'hr_department') {
          const posItem = positionData ? _.find(positionData, { mi_data_id: orgItem.mi_data_id }) : undefined
          if (posItem) {
            const empItems = empData.filter(emp => emp.positionID === posItem.mi_data_id && AC.dateService.unshiftDate(emp.dateFrom) <= onDate && AC.dateService.unshiftDate(emp.dateTo) >= onDate)
            if (empItems.length) {
              let empItem = empItems[0]
              let empPosData = getEmpPosData(empItem)
              const resPos = Object.assign(empPosData, {
                colSpan: colSpan,
                showAddDescrPerson,
                useActualPositionName,
                indexNum: indexNpp++,
                isDepartment: false,
                name: HR.nameCase.cap(posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || ''),
                emp: []
              })
              for (let j = 1; j < empItems.length; j++) {
                empItem = empItems[j]
                empPosData = getEmpPosData(empItem)
                resPos.emp.push(empPosData)
              }
              result.data.push(resPos)
            }
          }
        } else {
          const obj = {
            colSpan: colSpan,
            showAddDescrPerson,
            useActualPositionName,
            name: `${str}${styleBegin}${orgItem.code ? orgItem.code + ' ' : ''}${level === 1 ? (orgItem.name || '').toUpperCase() : HR.nameCase.cap(orgItem.name || '')}${styleEnd}`,
            textAlign: 'left',
            isDepartment: true
          }
          const subTree = getData(indexNpp, orgID, orgItem.mi_data_id, level + 1)
          if (subTree && subTree.data && subTree.data.length) {
            result.data.push(obj)
            indexNpp = subTree.indexNpp || 1
            result.data.push(...subTree.data)
          }
        }
      })

      result.indexNpp = indexNpp
      return result
    }

    const orgTree = {
      data: []
    }

    let indexNpp = 1
    for (let i = 0; i < orgs.length; i++) {
      const aTree = getData(indexNpp, orgs[i].mi_data_id, i === 0 ? itemID : orgs[i].mi_data_id, 1)
      if (aTree && aTree.data && aTree.data.length) {
        if (orgs.length > 1) {
          const title = {
            textAlign: 'center',
            name: `<font color="blue">${orgs[i].name}</font>`,
            isDepartment: true
          }
          orgTree.data.push(title)
        }
        orgTree.data.push(...aTree.data)
      }
      indexNpp = aTree.indexNpp || 1
    }

    return orgTree || {}
  }
}
