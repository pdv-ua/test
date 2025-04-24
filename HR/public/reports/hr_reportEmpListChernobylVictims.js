/* global Ext, UB, AC, HR, _, appAC */

exports.reportCode = {
  buildReport (reportParams) {
    const me = this

    const rowsQuery = {
      entity: 'hr_empListChernobylVictims',
      method: 'search',
      ...reportParams
    }

    const organizationQuery = HR.reportUtils.getOrganizationQuery(reportParams.onDate, reportParams.organizationID)
    const departmentQuery = HR.reportUtils.getDepartmentQuery(reportParams.onDate, reportParams.organizationID, reportParams.departmentID)
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID)

    const regionQuery = {
      entity: 'cdn_region',
      fieldList: ['ID', 'name'],
      method: 'select',
      limit: 1,
      whereList: {
        c1: { expression: '[ID]', condition: 'equal', value: reportParams.regionID }
      }
    }

    return UB.connection.runTransAsObject([
      rowsQuery,
      organizationQuery,
      departmentQuery,
      regionQuery
    ])
      .then(([rowsResp, orgResp, depResp, regionResp]) => {
        let rows = []
        let index = 1
        const datas = _.groupBy(rowsResp.resultData, 'employeeID')
        _.forEach(datas, items => {
          items = _.sortBy(items, 'workPlace')
          const row = items[0]
          row.lastName = row.lastName.toUpperCase()
          row.index = index++
          row.showAddDescrPerson = showAddDescrPerson
          row.useActualPositionName = useActualPositionName
          rows.push(row)
        })

        const organizationName = orgResp && orgResp.resultData[0] ? orgResp.resultData[0].name || '' : ''
        const departmentName = depResp && depResp.resultData[0] ? depResp.resultData[0].name || '' : ''
        const regionName = regionResp && regionResp.resultData[0] ? regionResp.resultData[0].name || '' : ''

        return AC.reportService.generateReport(
          Object.assign({ rows }, {
            showAddDescrPerson,
            useActualPositionName,
            colSpan: 10 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0),
            tableWidth: 1500 + (showAddDescrPerson ? 200 : 0) + (useActualPositionName ? 200 : 0),
            onDate: AC.dateService.formatDate(reportParams.onDate),
            regionName,
            organizationName,
            departmentName
          }),
          me
        )
      })
  },

  onParamPanelConfig: function () {
    const accMainReportsSubOrg = AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')
    return Ext.create('UBS.ReportParamForm', {
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
                  labelWidth: 225,
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
                  labelWidth: 225,
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
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubdatefield',
                  name: 'onDate',
                  labelWidth: 225,
                  width: 345,
                  fieldLabel: UB.i18n('Станом на'),
                  value: appAC.globalApplicationDate()
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubcombobox',
                  name: 'dictBenefitsKind',
                  labelWidth: 225,
                  width: 700,
                  fieldLabel: UB.i18n('Категорія особи (вид пільги)'),
                  displayField: 'name',
                  ubRequest: {
                    entity: 'hr_dictBenefitsKind',
                    fieldList: ['ID', 'name'],
                    whereList: {
                      type: {
                        expression: '[type]',
                        condition: '=',
                        values: {
                          value: '3'
                        }
                      }
                    }
                  }
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubcombobox',
                  name: 'regionID',
                  labelWidth: 225,
                  width: 700,
                  fieldLabel: UB.i18n('Область (за адресою регістрації)'),
                  hideEntityItemInContext: true,
                  ubRequest: {
                    entity: 'cdn_region',
                    fieldList: ['ID', 'name']
                  }
                }
              ]
            }

          ]
        }
      ],
      getParameters (owner) {
        const { onDate, regionID, dictBenefitsKind, organizationID, includeChildOrgs, departmentID, includeChildDepts } = owner.getValues()
        const year = Number(onDate.substr(6, 4))
        const month = Number(onDate.substr(3, 2)) - 1
        const day = Number(onDate.substr(0, 2))
        const onDateJsFormat = new Date(year, month, day)
        return {
          organizationID,
          includeChildOrgs,
          departmentID,
          includeChildDepts,
          onDate: AC.dateService.shiftDate(onDateJsFormat),
          regionID,
          dictBenefitsKind
        }
      }
    })
  }
}
