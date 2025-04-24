/* global UB AC HR appAC Ext */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    if (me.incomeParams && reportParams) {
      // для коррекстной выгрузки в Excel
      me.incomeParams = reportParams
    }
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const staffTableID = reportParams.staffTableID || 0
    const onDate = /* AC.dateService.shiftDate(reportParams.onDate) || */ appAC.globalApplicationDate()

    function addColumns (sql, filed, name, align) {
      result.columns.push({
        sql: sql,
        field: filed,
        name: name,
        align: align
      })
      result.emptyValue.push({
        name: ''
      })
    }

    const result = {
      data: [],
      title: `Зміна окладів  станом на ${AC.dateService.formatDate(onDate)}`,
      columns: [],
      emptyValue: [] // вынужная мера для корректной выгрузки в ексель
    }

    const staffTableData = await UB.Repository('hr_staffTable')
      .attrs(['orgID', 'orgID.name', 'orgID.nameGen'])
      .joinCondition('orgID.mi_dateFrom', '<=', onDate)
      .joinCondition('orgID.mi_dateTo', '>=', onDate)
      .joinCondition('orgID.mi_deleteDate', '>=', '#maxdate')
      .selectById(staffTableID)

    if (!staffTableData) {
      return result
    }

    if (reportParams.positionType === undefined ? false : reportParams.positionType) {
      addColumns('e_positionType.name', 'positionTypeName', UB.i18n('Тип посади'), 'left')
    }
    if (reportParams.positionCategory === undefined ? false : reportParams.positionCategory) {
      addColumns('e_positionCategory.name', 'positionCategoryName', UB.i18n('Категорія посади'), 'left')
    }
    if (reportParams.dictStaffCat === undefined ? false : reportParams.dictStaffCat) {
      addColumns('dictSC.name', 'dictStaffCatName', UB.i18n('Категорія персоналу'), 'left')
    }
    if (reportParams.dictPositionKind === undefined ? false : reportParams.dictPositionKind) {
      addColumns('dictPK.name', 'dictPositionKindName', UB.i18n('Вид посади'), 'left')
    }
    if (reportParams.dictPositionGroup === undefined ? false : reportParams.dictPositionGroup) {
      addColumns('dictPG.name', 'dictPositionGroupName', UB.i18n('Група посади'), 'left')
    }
    if (reportParams.department === undefined ? false : reportParams.department) {
      addColumns('msc.depName', 'departmentName', UB.i18n('Підрозділ'), 'left')
    }
    if (reportParams.dictFundSource === undefined ? false : reportParams.dictFundSource) {
      addColumns('dictFS.name', 'dictFundSourceName', UB.i18n('Джерело фінансування'), 'left')
    }
    if (reportParams.dictEmpCategory === undefined ? false : reportParams.dictEmpCategory) {
      addColumns('dictEC.name', 'dictEmpCategoryName', UB.i18n('Кваліфікаційна категорія'), 'left')
    }
    if (reportParams.dictSalaryScheme === undefined ? false : reportParams.dictSalaryScheme) {
      addColumns('dictSSL.name', 'dictSalarySchemeLevelName', UB.i18n('Група (рівень) за схемою окладів'), 'left')
    }
    if (reportParams.dictTarifCoeff === undefined ? false : reportParams.dictTarifCoeff) {
      addColumns('dictTC.name', 'dictTarifCoeffName', UB.i18n('Тарифний розряд'), 'left')
    }

    if (!result.columns.length) {
      addColumns('msc.posName', 'positionName', UB.i18n('Посада'), 'left')
    }
    reportParams.fieldGroup = result.columns.map(el => el.sql)

    addColumns('', 'accrualSumCur', UB.i18n('Поточний оклад'), 'right')
    addColumns('', 'accrualSum', UB.i18n('Оклад'), 'right')
    addColumns('', 'sumDelta', UB.i18n('Сума зміни'), 'right')

    result.widthTable = result.columns.length * 150
    result.colspan = result.columns.length

    const organizationID = staffTableData.orgID || 0
    result.organizationNameGen = staffTableData['orgID.nameGen'] || staffTableData['orgID.name'] || ''

    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(organizationID)
    result.roundTo = settingsOrg.roundToQuantity

    const rowsQuery1 = Object.assign({
      entity: 'hr_massSalaryChange',
      fieldList: result.columns.map(el => el.field),
      method: 'search'
    }, reportParams)

    const [
      { resultData: data }
    ] = await UB.connection.runTransAsObject([rowsQuery1])

    data.forEach(row => {
      const values = []
      result.columns.forEach(col => {
        if (['accrualSumCur', 'accrualSum', 'sumDelta'].indexOf(col.field) === -1) {
          values.push({ align: col.align, value: row[col.field] || '' })
        } else {
          values.push({ align: col.align, value: HR.reportUtils.quantityToString(row[col.field] || 0, result.roundTo) })
        }
      })
      result.data.push({ values: values })
    })

    return result
  },
  onParamPanelConfig: function () {
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            {
              xtype: 'panel',
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'checkboxfield',
                  fieldLabel: UB.i18n('Тип посади'),
                  labelWidth: 260,
                  name: 'positionType',
                  value: false
                },
                {
                  xtype: 'checkboxfield',
                  fieldLabel: UB.i18n('Категорія посади'),
                  labelWidth: 260,
                  name: 'positionCategory',
                  value: false
                }
              ]
            },
            {
              xtype: 'panel',
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'checkboxfield',
                  fieldLabel: UB.i18n('Категорія персоналу'),
                  labelWidth: 260,
                  name: 'dictStaffCat',
                  value: false
                },
                {
                  xtype: 'checkboxfield',
                  fieldLabel: UB.i18n('Вид посади'),
                  labelWidth: 260,
                  name: 'dictPositionKind',
                  value: false
                }
              ]
            },
            {
              xtype: 'panel',
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'checkboxfield',
                  fieldLabel: UB.i18n('Група посади'),
                  labelWidth: 260,
                  name: 'dictPositionGroup',
                  value: false
                },
                {
                  xtype: 'checkboxfield',
                  fieldLabel: UB.i18n('Підрозділ'),
                  labelWidth: 260,
                  name: 'department',
                  value: false
                }
              ]
            },
            {
              xtype: 'panel',
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'checkboxfield',
                  fieldLabel: UB.i18n('Джерело фінансування'),
                  labelWidth: 260,
                  name: 'dictFundSource',
                  value: false
                },
                {
                  xtype: 'checkboxfield',
                  fieldLabel: UB.i18n('Кваліфікаційна категорія'),
                  labelWidth: 260,
                  name: 'dictEmpCategory',
                  value: false
                }
              ]
            },
            {
              xtype: 'panel',
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'checkboxfield',
                  fieldLabel: UB.i18n('Група (рівень) за схемою окладів'),
                  labelWidth: 260,
                  name: 'dictSalaryScheme',
                  value: false
                },
                {
                  xtype: 'checkboxfield',
                  fieldLabel: UB.i18n('Тарифний розряд'),
                  labelWidth: 260,
                  name: 'dictTarifCoeff',
                  value: false
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          positionType: frm.findField('positionType').getValue(),
          positionCategory: frm.findField('positionCategory').getValue(),
          dictStaffCat: frm.findField('dictStaffCat').getValue(),
          dictPositionKind: frm.findField('dictPositionKind').getValue(),
          dictPositionGroup: frm.findField('dictPositionGroup').getValue(),
          department: frm.findField('department').getValue(),
          dictFundSource: frm.findField('dictFundSource').getValue(),
          dictEmpCategory: frm.findField('dictEmpCategory').getValue(),
          dictSalaryScheme: frm.findField('dictSalaryScheme').getValue(),
          dictTarifCoeff: frm.findField('dictTarifCoeff').getValue()
        }
      }
    })
    return paramForm
  }
}
