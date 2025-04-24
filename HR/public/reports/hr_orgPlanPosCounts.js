/* global Ext UB AC appAC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const orgID = reportParams.orgID || appAC.globalOrganization()
    const staffTableID = reportParams.staffTableID
    const onDate = reportParams.orderDate
    const result = {
      pos: [],
      columnCount: 0,
      tableWidth: 0,
      colNumbers: [],
      isGroupPos: reportParams.isGroupPos
    }
    result.orgName = await UB.Repository('hr_organization')
      .attrs(['name'])
      .where('mi_data_id', '=', orgID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .selectScalar() || ''

    let attrs
    let groupAttr
    if (reportParams.isGroupPos) {
      attrs = ['dictPositionID.fullName', 'dictPositionID.name', 'positionType.name', 'accrualSum', 'SUM([quantity])', 'psCategory.name', 'positionType', 'paymentType']
      groupAttr = ['dictPositionID.fullName', 'dictPositionID.name', 'positionType.name', 'accrualSum', 'psCategory.name', 'positionType', 'paymentType']
      result.columnCount = 6
      result.tableWidth = 950
    } else {
      attrs = ['dictPositionID.fullName', 'dictPositionID.name', 'positionType.name', 'accrualSum', 'paymentType', 'SUM([quantity])']
      groupAttr = ['dictPositionID.fullName', 'dictPositionID.name', 'positionType.name', 'accrualSum', 'paymentType']
      result.columnCount = 5
      result.tableWidth = 800
    }
    for (let i = 1; i <= result.columnCount; i++) result.colNumbers.push({ colNum: i })

    const posData = await UB.Repository('hr_position')
      .attrs(attrs)
      .where('orgID', '=', orgID)
      .where('liquidate', '=', 0)
      .where('mi_dateFrom', '<=', onDate, 'dateFrom')
      .where('mi_dateTo', '>=', onDate, 'dateTo')
      .where('state', '=', 'ACTIVE', 'active')
      .where('staffOrderID', '=', staffTableID, 'order')
      .notExists(UB.Repository('hr_staffUnit')
        .correlation('mi_data_id', 'mi_data_id')
        .where('staffOrderID', '=', staffTableID)
        .where('mi_deleteDate', '>=', '#maxdate'),
      'notExist')
      .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
      .misc({ __mip_recordhistory_all: true })
      .groupBy(groupAttr)
      .orderBy('dictPositionID.fullName', 'dictPositionID.name', 'positionType.name')
      .selectAsObject({
        'dictPositionID.fullName': 'posFullName',
        'dictPositionID.name': 'posName',
        'positionType.name': 'posTypeName',
        'SUM([quantity])': 'quantity'
      })

    let indexNum = 1
    posData.forEach(posItem => {
      result.pos.push({
        indexNum: indexNum++,
        posName: posItem.posFullName || posItem.posName,
        posType: posItem.posTypeName,
        basepay: posItem.accrualSum || 0,
        quantity: posItem.quantity,
        psCategory: posItem.positionType === '1' ? posItem['psCategory.name'] : '',
        isGroupPos: reportParams.isGroupPos,
        paymentType: posItem.paymentType === 'CONTRACT' ? UB.i18n('Згідно умов трудового договору') : ''
      })
    })
    return result
  },
  onParamPanelConfig: function () {
    const report = this
    const incomeParams = report.incomeParams
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            HR.controlService.getOrgCombo({
              disabled: true,
              labelWidth: 150
            }),
            {
              xtype: 'ubcombobox',
              name: 'staffTableID',
              fieldLabel: UB.i18n('Штатний розпис'),
              labelWidth: 150,
              gridFieldList: ['description', 'orderState', 'entryDate'],
              displayField: 'description',
              allowBlank: false,
              ubRequest: {
                entity: 'hr_staffTable',
                fieldList: ['ID', 'description'],
                whereList: {
                  orgID: {
                    expression: '[orgID]',
                    condition: '=',
                    values: {
                      value: appAC.globalOrganization()
                    }
                  }
                },
                orderList: { orderBy: { expression: 'orderDate' } }
              },
              listeners: {
                render: function (ctrl) {
                  if (incomeParams && incomeParams.staffTableID) {
                    ctrl.store.on('load', () => {
                      if (!ctrl.store.isLoaded) {
                        ctrl.store.isLoaded = true
                        ctrl.setValueById(incomeParams.staffTableID)
                      }
                    })
                    ctrl.store.load()
                  }
                }
              }
            },
            {
              layout: { type: 'hbox' },
              items: [
                { xtype: 'checkboxfield',
                  name: 'isGroupPos',
                  fieldLabel: UB.i18n('Групувати по категорії посади (для держслужбовців)'),
                  labelWidth: 360,
                  value: false
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const orgID = frm.findField('organizationID').getValue() || appAC.globalOrganization()
        const staffTableID = frm.findField('staffTableID').getValue() || 0
        const isGroupPos = frm.findField('isGroupPos').getValue() || false

        if (incomeParams) {
          incomeParams.orgID = orgID
          incomeParams.staffTableID = staffTableID
          incomeParams.isGroupPos = isGroupPos
        }
        const params = {
          orgID,
          staffTableID,
          isGroupPos
        }
        // помилка в UBReport.prototype.makeReport, при експорті в Excel параметри беруться з incomeParams, а не з getParameters()
        owner.ownerCt.report.incomeParams = Object.assign(owner.ownerCt.report.incomeParams, params)
        return params
      }
    })
    return paramForm
  }
}
