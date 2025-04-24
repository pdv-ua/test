const { each } = require('highcharts')

/* global Ext UB AC appAC HR _ $App */
exports.reportCode = {
  buildReport: async function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams

    const result = await $App.connection.run({
      entity: 'hr_report',
      method: 'getListFixedVacationDaysSearch',
      resultData: '',
      personResults: '',
      orgResults: '',
      params: reportParams
    })

    let allResult = await me.getReportData(reportParams, result)
    return AC.reportService.generateReport(allResult, me)
  },

  getReportData: async function (reportParams, queryResult) {
    const me = this
    const onDate4Sql = AC.dateService.shiftDate(reportParams.dateFrom)
    let result = {
      showDetails: reportParams.showDetails,
      colSpan: 4,
      tableWidth: 900,
      orgUnits: [],
      positionCategory: '',
      onDate: AC.dateService.getStringFormatDate(reportParams.dateFrom, '', '', UB.i18n(' р.')),
      personTable: [],
      personResults: [],
      orgResults: []
    }

    const orgs = await HR.orgStructReportUtils.getOrganizationData(onDate4Sql, reportParams.organizationID, reportParams.includeChildOrgs)
    const childOrgIDs = orgs.map(itm => itm.mi_data_id)
    const orgNames = _.find(orgs, { 'mi_data_id': reportParams.organizationID })
    result.organizationName = orgNames ? HR.nameCase.cap(orgNames.name || '') : ''
    let resultDepartment
    if (reportParams.departmentID) {
      resultDepartment = await UB.Repository('hr_department')
        .attrs(['name', 'employeeChiefID.fullFIO'])
        .where('mi_data_id', '=', reportParams.departmentID)
        .where('orgID', '=', reportParams.organizationID)
        .where('state', '=', 'ACTIVE')
        .where('mi_deleteDate', '>=', '#maxdate')
        .misc({ __mip_ondate: onDate4Sql })
        .selectSingle()
      result.departmentName = resultDepartment.name
    }
    if (reportParams.includeChildOrgs) {
      result.organizationName = result.organizationName + ' (з підлеглими)'
    }
    if (resultDepartment) {
      result.organizationName = result.organizationName + ' ' + result.departmentName
    }
    if (result.departmentName && reportParams.includeChildDepts) {
      result.organizationName = result.organizationName + ' (з підлеглими)'
    }
    if (resultDepartment && resultDepartment['employeeChiefID.fullFIO']) {
      result.organizationName = result.organizationName + ' ' + resultDepartment['employeeChiefID.fullFIO']
    }

    let empData = JSON.parse(queryResult.params.resultReportData)
    if (queryResult.params.orgResults) {
      let myOrgResults = JSON.parse(queryResult.params.orgResults)
      myOrgResults = myOrgResults.filter(function (item) {
        return item['depName'] !== 'null'
      })

      result.orgResults = myOrgResults
      if (!empData || empData.length === 0) {
        return result
      }
    } else {
      result.orgResults = []
    }
    if (reportParams.showResultsByDep) {
      let myArray = JSON.parse(queryResult.params.personResults)
      myArray = myArray.filter(function (item) {
        return item['depName'] !== 'null'
      })

      result.personResults = myArray
      if (!empData || empData.length === 0) {
        return result
      }
    }
    const orgStruct = await HR.orgStructReportUtils.getStaffUnitData(onDate4Sql, childOrgIDs, reportParams.departmentID, reportParams.includeChildDepts, [], false)
    if (!orgStruct) {
      return result
    }
    let resultReport = []
    let myDataReport = []
    const tree = me.generateData(orgs, reportParams.departmentID || reportParams.organizationID, orgStruct, empData, result.colSpan, reportParams.showDetails, result.personResults)

    const empItems = empData.filter(el => el.depID === null)
    _.forEach(empItems, item => {
      const obj = {
        colSpan: 4,
        isDepartment: false,
        textAlign: 'left',
        posName: item.actualPositionName,
        empName: item.fullFIO,
        tabNum: item.tabNum,
        dictVacationKindIDName: item.dictVacationKindIDName || '',
        dayFix: item.dayFix || 0,
        description: item.description || ''
      }
      resultReport.push(obj)
    })
    myDataReport = tree && tree.data ? tree.data : []
    _.forEach(myDataReport, item => {
      resultReport.push(item)
    })
    result.data = resultReport
    return result
  },
  generateData: function (orgs, itemID, orgStruct, empVac, colSpan, showDetails, personResults) {
    if (!orgStruct || !orgStruct.length) return {}

    function getData (orgID, parentID, level = 1, personResults) {
      const result = {
        data: []
      }

      const curStruct = orgStruct.filter(el => el.parentUnitID === parentID && el.orgID === orgID)
      const str = level === 1 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)
      const styleBegin = level === 1 ? '<font color="blue">' : level === 2 ? '<u>' : ''
      const styleEnd = level === 1 ? '' : level === 2 ? '' : ''
      curStruct.forEach(orgItem => {
        if (orgItem.mi_unityEntity !== 'hr_position') {
          const obj = {
            colSpan,
            showDetails,
            isDepartment: true,
            textAlign: 'left',
            depID: orgItem.mi_data_id,
            style: level === 1 ? 'color:blue;' : '',
            name: `${orgItem.code ? orgItem.code + ' ' : ''}${level === 1 ? (orgItem.name || '').toUpperCase() : HR.nameCase.cap(orgItem.name || '')}`
          }
          const subTree = getData(orgID, orgItem.mi_data_id, level + 1, personResults)
          const subTreeHasData = (subTree.data && subTree.data.length)
          if (subTree && subTreeHasData) {
            result.data.push(obj)
            subTreeHasData && result.data.push(...subTree.data)
          }
        }
      })

      const empItems = empVac.filter(el => el.depID === parentID)
      _.forEach(empItems, item => {
        const obj = {
          colSpan,
          showDetails,
          isDepartment: false,
          textAlign: 'left',
          posName: item.actualPositionName,
          empName: item.fullFIO,
          tabNum: item.tabNum,
          dayFix: item.dayFix || 0,
          workPlace: item.workPlace || '',
          dictVacationKindIDName: item.dictVacationKindIDName || '',
          actualPositionName: item.actualPositionName || '',
          periodValue: item.periodValue || '',
          description: item.description || '',
          depID: item.depID || ''
        }
        result.data.unshift(obj)
      })

      const foundDep = personResults.find(row => row.depID === parentID)
      let foundStructDep
      let quantityInDep = 0
      if (foundDep) {
        const curStruct = orgStruct.filter(el => el.parentUnitID === parentID && el.orgID === orgID)
        const str = level === 2 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)
        const styleBegin = level === 2 ? '<font color="blue">' : level === 3 ? '<u>' : ''
        const styleEnd = level === 2 ? '' : level === 3 ? '' : ''

        if (level === 2) {
          foundStructDep = personResults.find(row => row.depID === parentID && row.structured == true)
          if (foundStructDep) {
            quantityInDep = foundStructDep.quantity
          } else {
            quantityInDep = foundDep.quantity
          }
        } else {
          quantityInDep = foundDep.quantity
        }

        const objEnd = {
          colSpan,
          showDetails,
          isDepartment: true,
          textAlign: 'left',
          quantityInDep: quantityInDep,
          depID: parentID,
          style: level === 2 ? 'color:blue;' : '',
          name: `${level === 2 ? ('Всього по: ' + foundDep.depName || '').toUpperCase() : HR.nameCase.cap('Всього по: ' + foundDep.depName || '')}`
        }
        result.data.push(objEnd)
      }

      return result
    }

    const orgTree = {
      data: []
    }

    for (let i = 0; i < orgs.length; i++) {
      const aTree = getData(orgs[i].mi_data_id, i === 0 ? itemID : orgs[i].mi_data_id, 1, personResults)
      if (aTree && aTree.data && aTree.data.length) {
        if (orgs.length > 1) {
          const title = {
            colSpan,
            showDetails,
            textAlign: 'center',
            name: `<font color="blue">${orgs[i].name}</font>`,
            isDepartment: true
          }
          orgTree.data.push(title)
        }
        orgTree.data.push(...aTree.data)
      }
    }

    return orgTree || {}
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
              xtype: 'datefield',
              name: 'dateFrom',
              labelWidth: 160,
              width: 300,
              fieldLabel: UB.i18n('Станом'),
              allowBlank: false,
              value: AC.dateService.todayDate()
            },
            {
              xtype: 'ubboxselect',
              name: 'dictVacationKindID',
              fieldLabel: UB.i18n('Вид відпустки'),
              labelWidth: 160,
              width: 700,
              gridFieldList: ['code', 'name'],
              displayField: 'name',
              valueField: 'ID',
              ubRequest: {
                entity: 'hr_dictVacationKind',
                fieldList: ['ID', 'code', 'name'],
                orderList: { orderBy: { expression: 'code' } }
              },
              listeners: {
                render: function (ctrl) {
                  ctrl.store.on('load', () => {
                    if (!ctrl.store.isLoaded) {
                      const storeItems = ctrl.store.data.items
                      const selItem = _.find(storeItems, { data: { code: 'dYear' } })
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
            {
              xtype: 'ubcombobox',
              name: 'workPlace',
              fieldLabel: UB.i18n('Місце роботи'),
              labelWidth: 160,
              width: 700,
              valueField: 'code',
              displayField: 'name',
              allowBlank: true,
              ubRequest: {
                entity: 'ubm_enum',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['ID', 'name', 'code', 'eGroup'],
                whereList: {
                  enumGroupFilter: {
                    expression: '[eGroup]',
                    condition: 'equal',
                    values: {
                      val: 'HR_WORKER_PLACE'
                    }
                  }
                }
              }
            },
            {
              xtype: 'ubcombobox',
              name: 'dictStaffCatID',
              ubID: 'dictStaffCatID',
              labelWidth: 160,
              width: 700,
              fieldLabel: UB.i18n('Категорія персоналу'),
              displayField: 'name',
              valueField: 'ID',
              ubRequest: {
                entity: 'hr_dictStaffCat',
                fieldList: ['ID', 'code', 'name'],
                orderList: { orderBy: { expression: 'name' } }
              }
            },
            {
              xtype: 'checkbox',
              fieldLabel: UB.i18n('З деталізацією по періодам'),
              width: 120,
              labelWidth: 160,
              name: 'WithDetailsByPeriods'
            },
            {
              xtype: 'checkbox',
              fieldLabel: UB.i18n('Відображення сум'),
              width: 120,
              labelWidth: 160,
              name: 'showResultsByDep',
              checked: true
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        let dateFrom = frm.findField('dateFrom').getValue() || appAC.globalApplicationDate()
        return {
          dateFrom: AC.dateService.truncTimeToUtcNull(dateFrom),
          onDate: appAC.globalApplicationDate(),
          organizationID: frm.findField('organizationID').getValue(),
          includeChildOrgs: frm.findField('includeChildOrgs').getValue(),
          departmentID: frm.findField('departmentID').getValue(),
          includeChildDepts: frm.findField('includeChildDepts').getValue(),
          workPlace: frm.findField('workPlace').getValue(),
          dictVacationKindID: frm.findField('dictVacationKindID').getValue(),
          dictStaffCatID: frm.findField('dictStaffCatID').getValue(),
          WithDetailsByPeriods: frm.findField('WithDetailsByPeriods').getValue(),
          showResultsByDep: frm.findField('showResultsByDep').getValue(),
          workPlaceName: frm.findField('workPlace').rawValue,
          dictVacationKindIDName: frm.findField('dictVacationKindID').rawValue,
          dictStaffCatIDName: frm.findField('dictStaffCatID').rawValue,
          resultData: [],
          personResults: []
        }
      }
    })
    return paramForm
  }
}
