/* global $App Ext UB AC appAC _ HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID)

    const rowsQuery = Object.assign({
      entity: 'hr_empListMilitary',
      method: 'search2'
    }, reportParams)

    let [
      { resultData: milData }
    ] = await UB.connection.runTransAsObject([rowsQuery])

    const org = await UB.Repository('hr_organization')
      .attrs(['nameGen', 'name'])
      .where('mi_data_id', '=', reportParams.organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: reportParams.onDate })
      .where('mi_deleteDate', '>=', '#maxdate')
      .selectSingle()

    const params = {
      personTable: [],
      colNums: [],
      colSpan: 18,
      tableWidth: 2165,
      onDate: reportParams.onDate ? AC.dateService.formatDate(reportParams.onDate) : '',
      organizationName: org ? org.nameGen || org.name || '' : ''
    }
    for (let i = 1; i <= params.colSpan; i++) {
      params.colNums.push({ name: i })
    }

    let index = 1
    milData = _.groupBy(milData, 'commandNumber')
    _.forEach(milData, rows => {
      params.personTable.push({ colSpan: params.colSpan, isTitle: true, title: rows[0].commandNumber || 'Немає номера команди' })
      rows.forEach(row => {
        row.delayDateTo = row.delayDateTo ? AC.dateService.formatDate(row.delayDateTo) : ''
        row.messageDate = row.messageDate ? UB.i18n('від ') + AC.dateService.formatDate(row.messageDate) : ''
        const posName = useActualPositionName ? row.actualPositionName : row.posName
        row.listInfo = (row.listInfo || '').trim()
        row.categyAndDoc = (row.categyAndDoc || '').trim()
        row.mmc = (row.mmc || '').trim()
        let listInfo = reportParams.groupType === '4'
          ? `${row.delayDateTo}${row.delayDateTo && row.delayLaw ? ' ' : ''}${row.delayLaw || ''}`
          : (row.listInfo ? UB.i18n('Бронювання') + ' ' + row.listInfo : '') + (row.listInfo && row.commandNumber ? ' ' : '') + (row.commandNumber ? UB.i18n('Номер команди') + ' ' + row.commandNumber : '')
        listInfo += row.isServesReserve ? (listInfo ? '<br />' : '') + 'Р' : ''
        params.personTable.push(Object.assign({}, row, {
          isTitle: false,
          npp: index++,
          birthDate: row.birthDate ? AC.dateService.formatDate(row.birthDate) : '',
          militaryRank: reportParams.groupType === '4' ? UB.i18n('ПРИЗОВНИК') : row.militaryRank || '',
          militarySpecialityCode: reportParams.groupType === '4' ? '' : row.militarySpecialityCode || '',
          militaryProfile: reportParams.groupType === '4' ? '' : row.militaryProfile || '',
          categyAndDoc: reportParams.groupType === '4' ? '' : row.categyAndDoc || '',
          mmc: reportParams.groupType === '2' ? row.mmc || '' : '',
          listInfo: listInfo,
          familyInfo: (row.maritalStatus || '') + (row.maritalStatus && row.familyInfo ? '<br />' : '') + (row.familyInfo || ''),
          appointInfo: posName + (posName && row.appointOrder ? ', ' : '') + (row.appointOrder || ''),
          messageInfo: `${row.messageNumber ? '№' + row.messageNumber : ''}${row.messageDate && row.messageNumber ? ' ' : ''}${row.messageDate}`
        }))
      })
    })

    return AC.reportService.removeEmptyValues(params)
  },

  onParamPanelConfig: function () {
    const accMainReportsSubOrg = AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      listeners: {
        afterrender: function () {
          HR.orderManager.disableContextMenuItems(this.down('[name=dictStateMilitaryID]'), ['editItem', 'showLookup', 'addItem'])
        }
      },
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox' },
          items: [
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  labelWidth: 160,
                  width: 300,
                  allowBlank: false,
                  fieldLabel: UB.i18n('Станом на'),
                  value: AC.dateService.todayDate()
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubcombobox',
                  name: 'groupType',
                  fieldLabel: UB.i18n('Група'),
                  labelWidth: 160,
                  width: 300,
                  valueField: 'code',
                  displayField: 'name',
                  allowBlank: false,
                  ubRequest: {
                    entity: 'ubm_enum',
                    method: UB.core.UBCommand.methodName.SELECT,
                    fieldList: ['ID', 'name', 'code', 'eGroup'],
                    whereList: {
                      enumGroupFilter: {
                        expression: '[eGroup]',
                        condition: 'equal',
                        values: {
                          val: 'HR_MILITARY_GROUPTYPE'
                        }
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
                  xtype: 'ubboxselect',
                  name: 'dictStateMilitaryID',
                  fieldLabel: UB.i18n('Стан війскового обліку'),
                  labelWidth: 160,
                  width: 700,
                  gridFieldList: ['name'],
                  displayField: 'name',
                  valueField: 'ID',
                  ubRequest: {
                    entity: 'hr_dictStateMilitary',
                    fieldList: ['ID', 'code', 'name'],
                    whereList: {
                      miDel: {
                        expression: '[mi_deleteUser]',
                        condition: 'isNull'
                      }
                    },
                    orderList: { orderBy: { expression: 'code' } }
                  }
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          onDate: AC.dateService.truncTimeToUtcNull(frm.findField('onDate').getValue()),
          groupType: frm.findField('groupType').getValue(),
          dictStateMilitaryID: frm.findField('dictStateMilitaryID').getValue(),
          organizationID: appAC.globalOrganization()
        }
      }
    })
    return paramForm
  }
}
