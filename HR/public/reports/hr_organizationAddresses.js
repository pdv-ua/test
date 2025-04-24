/* global Ext UB AC HR appAC _ */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const result = {
      title: UB.i18n(`Адреси організацій на {0}`, AC.dateService.formatDate(reportParams.onDate)),
      data: []
    }

    const orgStruct = await UB.Repository('hr_staffUnit')
      .attrs(['ID', 'name', 'mi_data_id', 'parentUnitID'])
      .whereIf(reportParams.includeSubOrg, 'mi_treePath', 'like', `%/${reportParams.organizationID}/%`)
      .whereIf(!reportParams.includeSubOrg, 'orgID', '=', reportParams.organizationID)
      .where('mi_dateFrom', '<=', reportParams.onDate)
      .where('mi_dateTo', '>=', reportParams.onDate)
      .where('state', '=', 'ACTIVE')
      .where('mi_unityEntity', '=', 'hr_organization')
      .selectAsObject()

    const organiozations = orgStruct.map(o => o.mi_data_id)
    if (!organiozations.length) {
      organiozations.push(reportParams.organizationID)
    }

    const address = await UB.Repository('ac_address')
      .attrs(['ownerID', 'addressType.name', 'postIndex', 'countryID.name', 'regionID.name', 'districtID.name', 'cityID.name',
        'cityDistrictID.name', 'streetType.name', 'street', 'house', 'section', 'apartment', 'address'])
      .whereIf(organiozations.length === 1, 'ownerID', '=', organiozations[0])
      .whereIf(organiozations.length > 1, 'ownerID', 'in', organiozations)
      .whereIf(reportParams.addressType, 'addressType', '=', reportParams.addressType)
      .orderBy('addressType')
      .selectAsObject({
        'addressType.name': 'addressType',
        'countryID.name': 'country',
        'regionID.name': 'region',
        'districtID.name': 'district',
        'cityID.name': 'city',
        'cityDistrictID.name': 'cityDistrict',
        'streetType.name': 'streetType'
      })

    function getColor(level) {
      let color = '#FFFFFF'
      switch (level % 5) {
        case 1:
          color = '#FFFFFF'
          break
        case 2:
          color = '#D9D9D9'
          break
        case 3:
          color = '#BFBFBF'
          break
        case 4:
          color = '#A6A6A6'
          break
        case 0:
          color = '#808080'
          break
      }
      return color
    }

    function getData (parentID, level = 1) {
      const data = []
      const str = level === 1 ? '' : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(level - 1)

      const curStruct = orgStruct.filter(el => (el.parentUnitID === parentID && level > 1) || (el.mi_data_id === parentID && level === 1))
      curStruct.forEach(orgItem => {
        let addressData = address.filter(a => a.ownerID === orgItem.mi_data_id)
        addressData = _.groupBy(addressData, 'ownerID')
        _.forEach(addressData, items => {
          items.forEach((item, npp) => {
            item.bgColor = getColor(level)
            item.rows = npp === 0 ? items.length : 0
            item.name = npp === 0 ? `${str}${orgItem.name}` : ''
            item.street = `${item.streetType ? item.streetType + ' ' : ''}${item.street || ''}`
            data.push(item)
          })
        })
        const subData = getData(orgItem.mi_data_id, level + 1)
        if (subData.length) {
          data.push(...subData)
        }
      })
      return data
    }

    result.data = getData(reportParams.organizationID)

    return result
  },

  onParamPanelConfig: function () {
    const accMainReportsSubOrg = AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')
    const me = this
    me.paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      listeners: {
        afterrender: function () {
          HR.orderManager.disableContextMenuItems(this.down('[name=organizationID]'), ['editItem', 'showLookup', 'addItem', 'clearValue'])
        }
      },
      items: [
        {
          xtype: 'panel',
          layout: {type: 'vbox', align: 'stretch'},
          items: [
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getOrgCombo({
                  labelWidth: 115,
                  width: 700,
                  readOnly: !accMainReportsSubOrg,
                  orgFilter: accMainReportsSubOrg ? 'WITH_CHILDS' : 'CURRENT'
                }),
                HR.controlService.getIncludeChildOrgs(accMainReportsSubOrg,
                  {
										checked: accMainReportsSubOrg,
                    listeners: {
                      change: function (ctrl) {

                      }
                    }
                  })
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  labelWidth: 115,
                  width: 335,
                  fieldLabel: UB.i18n('Станом на'),
                  value: appAC.globalApplicationDate()
                },
                {
                  xtype: 'ubcombobox',
                  name: 'addressType',
                  labelWidth: 115,
                  width: 335,
                  fieldLabel: UB.i18n('Тип адреси'),
                  hideEntityItemInContext: true,
                  enumGroupFilter: 'AC_ADDRESS_TYPE',
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
                        values: { 'eGroup': 'AC_ADDRESS_TYPE' }
                      }
                    }
                  }
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const reportParams = {
          organizationID: frm.findField('organizationID').getValue() || 0,
          includeSubOrg: frm.findField('includeChildOrgs').getValue(),
          onDate: frm.findField('onDate').getValue() || AC.dateService.todayDate(),
          addressType: frm.findField('addressType').getValue()
        }
        // помилка в UBReport.prototype.makeReport, при експорті в Excel параметри беруться з incomeParams, а не з getParameters()
        owner.ownerCt.report.incomeParams = reportParams
        return reportParams
      }
    })
    return me.paramForm
  }
}