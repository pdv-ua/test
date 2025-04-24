/* global Ext  UB AC HR appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const result = {
      pos: [],
      columnCount: 0,
      tableWidth: 0,
      colNumbers: [],
      isGroupPos: reportParams.isGroupPos
    }
    result.orgName = await UB.Repository('hr_organization')
      .attrs(['name'])
      .where('mi_data_id', '=', reportParams.orgID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: reportParams.onDate })
      .selectScalar() || ''
    result.onDate = AC.dateService.getStringFormatDate(reportParams.onDate, '', '', UB.i18n(' р.'))

    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(reportParams.orgID)
    result.roundTo = settingsOrg.roundTo
    result.roundToQuantity = settingsOrg.roundToQuantity

    let attrs
    let groupAttr
    if (reportParams.isGroupPos) {
      attrs = ['dictPositionID.fullName', 'dictPositionID.name', 'positionType.name', 'accrualSum', 'SUM([quantity])', 'psCategory.name', 'positionType']
      groupAttr = ['dictPositionID.fullName', 'dictPositionID.name', 'positionType.name', 'accrualSum', 'psCategory.name', 'positionType']
      result.columnCount = 6
      result.tableWidth = 950
    } else {
      attrs = ['dictPositionID.fullName', 'dictPositionID.name', 'positionType.name', 'accrualSum', 'SUM([quantity])']
      groupAttr = ['dictPositionID.fullName', 'dictPositionID.name', 'positionType.name', 'accrualSum']
      result.columnCount = 5
      result.tableWidth = 800
    }
    for (let i = 1; i <= result.columnCount; i++) result.colNumbers.push({ colNum: i })

    const posData = await UB.Repository('hr_position')
      .attrs(attrs)
      .misc({ __mip_ondate: reportParams.onDate })
      .where('state', '=', 'ACTIVE')
      .where('orgID', '=', reportParams.orgID)
      .groupBy(groupAttr)
      .orderBy('dictPositionID.name', 'positionType.name')
      .selectAsObject({
        'dictPositionID.fullName': 'posFullName',
        'dictPositionID.name': 'posName',
        'positionType.name': 'posTypeName',
        'SUM([quantity])': 'quantity'
      })

    let indexNum = 1
    posData.forEach(posItem => {
      const qnt = !result.roundToQuantity ? posItem.quantity || 0 : AC.currencyService.round(posItem.quantity || 0, result.roundToQuantity === 'numberGroup' ? 0 : result.roundToQuantity === 'decimal1' ? 1 : 2)
      result.pos.push({
        indexNum: indexNum++,
        posName: posItem.posFullName || posItem.posName,
        posType: posItem.posTypeName,
        basepay: AC.currencyService.round(posItem.accrualSum || 0, result.roundTo === 'numberGroup' ? 0 : 2),
        quantity: qnt,
        roundTo: result.roundTo,
        roundToQuantity: result.roundToQuantity || HR.reportUtils.getQuantityFractional(qnt),
        psCategory: posItem.positionType === '1' ? posItem['psCategory.name'] : '',
        isGroupPos: reportParams.isGroupPos
      })
    })

    return result
  },
  onParamPanelConfig: function () {
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      listeners: {
        afterrender: function () {
          HR.orderManager.disableContextMenuItems(this.down('[name=organizationID]'), ['editItem', 'showLookup', 'addItem', 'clearValue'])
        }
      },
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            HR.controlService.getOrgCombo({
              labelWidth: 150,
              readOnly: true
            }),
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  labelWidth: 150,
                  width: 270,
                  fieldLabel: UB.i18n('Станом на'),
                  value: appAC.globalApplicationDate()
                },
                { xtype: 'checkboxfield',
                  name: 'isGroupPos',
                  fieldLabel: UB.i18n('Групувати по категорії посади (для держслужбовців)'),
                  labelWidth: 360,
                  value: false }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const params = {
          orgID: frm.findField('organizationID').getValue() || 0,
          onDate: AC.dateService.shiftDate(frm.findField('onDate').getValue() || appAC.globalApplicationDate()),
          isGroupPos: frm.findField('isGroupPos').getValue() || false
        }
        // помилка в UBReport.prototype.makeReport, при експорті в Excel параметри беруться з incomeParams, а не з getParameters()
        owner.ownerCt.report.incomeParams = params
        return params
      }
    })
    return paramForm
  }
}
