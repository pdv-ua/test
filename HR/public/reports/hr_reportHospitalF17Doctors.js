/* global Ext _ $App UB AC HR appAC */
const reportCode = 'f17l'
const paramCodePrefix = 'F17D'
const empCatHigh = '3'
const empCat1 = '1'
const empCat2 = '2'
const catPriority = { [empCatHigh]: 1, [empCat1]: 2, [empCat2]: 3 }
const empCatAll = 'all'
const empCatNone = 'none'
const dataPrefix = 'data'
const printDataPrefix = 'pdata'

let paramForm
let reportCfg
let reportCols

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const orgID = reportParams.orgID
    const onDate = reportParams.onDate
    const onDateStr = AC.dateService.formatDate(onDate)
    const onDateTimeStr = AC.dateService.formatDate(Date.now(), 'dd.mm.yyyy hh:nn:ss')
    const structDepID = reportParams.structDepID || 0
    const childDepID = reportParams.childDepID || 0

    const orgName = await UB.Repository('hr_organization')
      .attrs(['fullName'])
      .where('mi_data_id', '=', orgID)
      .misc({ __mip_ondate: onDate })
      .selectScalar()
    const depIDs = []
    structDepID && depIDs.push(structDepID)
    childDepID && depIDs.push(childDepID)

    let empAcceptDataPromise = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeID', 'positionID.dictPositionID', 'employeeID.sexType', 'positionID.dictSpecialtyID', 'dictEmpCategoryID.code'])
      .where('isActive', '=', true)
      .where('organizationID', '=', orgID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('workPlace', '=', '1') // основне місце роботи
      .where('employeeNumberID.dateFrom', '<=', onDate)
      .where('employeeNumberID.dateTo', '>=', onDate)
      .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .where('positionID.mi_dateFrom', '<=', onDate)
      .where('positionID.mi_dateTo', '>=', onDate)
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_deleteDate', '>=', '#maxdate')

    if (childDepID || structDepID) {
      empAcceptDataPromise = empAcceptDataPromise
        .where('departmentID.mi_treePath', 'like', `%/${childDepID || structDepID}/%`, 'treePath')
        .where('departmentID.mi_data_id', 'in', depIDs, 'IDs')
        .logic('([treePath] OR [IDs])')
    }

    const empAcceptData = await empAcceptDataPromise.selectAsObject({
      'positionID.dictPositionID': 'dictPositionID',
      'employeeID.sexType': 'sexType',
      'positionID.dictSpecialtyID': 'dictSpecialtyID',
      'dictEmpCategoryID.code': 'dictEmpCategoryCode'
    })
    /*
    const empCertificationAcc = await UB.Repository('hr_empCertificationAcc')
      .attrs(['employeeID', 'dictSpecialtyID', 'dictEmpCategoryID.code'])
      .where('employeeID', 'in', empAcceptData.map(itm => itm.employeeID))
      .where('certificationDate', '<=', onDate)
      .where('validityDateNotEmpty', '>=', onDate)
      .where('dictEmpCategoryID.code', 'in', [empCatHigh, empCat1, empCat2])
      .orderBy('employeeID')
      .selectAsObject({
        'dictEmpCategoryID.code': 'code'
      })
     */
    const setParams = await UB.Repository('hr_repSetParam')
      .attrs(['ID', 'code', 'name', 'reportNumStr'])
      .where('dictStReportID.code', '=', reportCode)
      .where('code', 'like', paramCodePrefix + '%')
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .orderBy('codePadded')
      .selectAsObject()
    const setElements = await UB.Repository('hr_repSetElement')
      .attrs(['repSetParamID', 'elementID'])
      .where('repSetParamID.dictStReportID.code', '=', reportCode)
      .where('repSetParamID.code', 'like', paramCodePrefix + '%')
      .where('dateFromNotEmpty', '<=', onDate)
      .where('dateToNotEmpty', '>=', onDate)
      .where('repSetParamID.dateFrom', '<=', onDate)
      .where('repSetParamID.dateTo', '>=', onDate)
      .where('repSetParamID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()

    function addElmIds (paramObj) {
      let elements = setElements.filter(elm => elm.repSetParamID === paramObj.ID)
      elements.forEach(elm => {
        paramObj.elmIds.push(elm.elementID)
      })
    }

    reportCfg = {}
    let parentID
    const level1Codes = ['1', '98', '102', '104']
    const level1CodesForCalculate = ['104']
    const skipRowCodes = ['2', '3', '99', '100', '101', '102', '103', '105']
    const captionLinkCodes = []
    for (let i = 4; i <= 97; i++) {
      captionLinkCodes.push(i.toString())
    }
    captionLinkCodes.push('104')
    for (let i = 107; i <= 115; i++) {
      captionLinkCodes.push(i.toString())
    }
    /* Колонки */
    const colCodePrefix = paramCodePrefix + 'C'
    setParams.filter(param => param.code.startsWith(colCodePrefix)).forEach(paramCol => {
      let colCode = paramCol.code
      let paramObj = {
        ID: paramCol.ID,
        code: colCode,
        caption: paramCol.name,
        rowNum: paramCol.reportNumStr,
        isRow: false,
        dataID: dataPrefix + paramCol.reportNumStr,
        elmIds: []
      }
      switch (colCode) {
        case colCodePrefix + '1':
          paramObj.empCat = empCatAll
          break
        case colCodePrefix + '2':
          paramObj.empCat = empCatNone
          break
        case colCodePrefix + '3':
          paramObj.empCat = empCatHigh
          break
        case colCodePrefix + '4':
          paramObj.empCat = empCat1
          break
        case colCodePrefix + '5':
          paramObj.empCat = empCat2
          break
      }
      addElmIds(paramObj)
      reportCfg[colCode] = paramObj
    })
    reportCols = _.filter(reportCfg, paramObj => !paramObj.isRow)
    /* Рядки */
    const rowCodePrefix = paramCodePrefix + 'R'
    setParams.filter(param => param.code.startsWith(rowCodePrefix)).forEach(paramRow => {
      let rowCode = paramRow.code
      let rowNum = paramRow.reportNumStr
      let lvl = level1Codes.includes(rowNum) ? 1 : 2
      let paramObj = {
        ID: paramRow.ID,
        code: rowCode,
        caption: paramRow.name,
        rowNum: rowNum,
        isRow: true,
        level: lvl,
        captionLink: captionLinkCodes.includes(rowNum),
        elmIds: [],
        empPosIDs: getEmpPosIDs()
      }
      if (lvl === 1) {
        parentID = paramRow.ID
      } else {
        paramObj.parentID = parentID
      }
      addElmIds(paramObj)
      initData(paramObj)
      reportCfg[rowCode] = paramObj
    })
    const reportRows = _.filter(reportCfg, paramObj => paramObj.isRow)
    const reportRows2 = reportRows.filter(paramObj => paramObj.level === 2 || level1CodesForCalculate.includes(paramObj.rowNum))
    const result = {
      orgID: orgID,
      orgName: orgName,
      onDate: onDateStr,
      onDateTime: onDateTimeStr,
      rows1: reportRows.filter(row => row.level === 1),
      structDepName: reportParams.structDepName || '',
      childDepName: reportParams.childDepName || ''
    }
    result.rows1.forEach(row1 => {
      row1.rows2 = reportRows.filter(row => row.level === 2 && row.parentID === row1.ID)
    })

    const row1 = reportCfg[rowCodePrefix + '1']
    const row1Dublicate = reportCfg[rowCodePrefix + (reportParams.levelSubordination === 'type1' ? '100' : '101')]
    const row2 = reportCfg[rowCodePrefix + '2']
    const row98 = reportCfg[rowCodePrefix + '98']
    const row1Codes = ['4', '6', '8', '10', '11', '12', '13', '15', '17', '19', '21', '23', '24', '25', '26', '27', '29',
      '30', '31', '33', '35', '37', '39', '40', '41', '42', '44', '45', '46', '47', '48', '50', '51', '52', '53', '55',
      '57', '58', '59', '60', '62', '64', '66', '68', '70', '71', '72', '73', '75', '77', '78', '79', '81', '82', '84',
      '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98'
    ]
    const row98Codes = ['107', '108', '109', '110', '111', '112', '113', '114', '115']

    /* Заповнення даними об'єкту reportCfg */
    empAcceptData.forEach(empAcceptItem => {
      /* UBHR-17638
      let empCatItem
      let empCatItems = empCertificationAcc.filter(catItem => catItem.employeeID === empAcceptItem.employeeID)
      if (empCatItems.length > 0) {
        empCatItem = empAcceptItem.dictSpecialtyID && empCatItems.find(catItem => catItem.dictSpecialtyID === empAcceptItem.dictSpecialtyID)
        if (!empCatItem) {
          // Якщо у особи в записах про атестацію відсутній запис по спеціальності, що вказана на посаді, то брати запис,
          // який має найвище значення коду dictEmpCategoryID.code серед можливих значень (3 - вища, 1 - перша, 2 - друга)
          if (empCatItems.length === 1) {
            empCatItem = empCatItems[0]
          } else {
            let sortedCatItems = empCatItems.sort((itm1, itm2) => {
              let priority1 = catPriority[itm1.code]
              let priority2 = catPriority[itm2.code]
              return (priority1 < priority2) ? -1 : ((priority1 > priority2) ? 1 : 0)
            })
            empCatItem = sortedCatItems[0]
          }
        }
      }
      */
      let empCatCode = empAcceptItem.dictEmpCategoryCode && [empCatHigh, empCat1, empCat2].includes(empAcceptItem.dictEmpCategoryCode) ? empAcceptItem.dictEmpCategoryCode : ''
      reportRows2.forEach(row => {
        if (!skipRowCodes.includes(row.rowNum) && row.elmIds.includes(empAcceptItem.dictPositionID)) {
          setData(row, empCatCode, empAcceptItem)
          if (row1Codes.includes(row.rowNum)) {
            setData(row1, empCatCode, empAcceptItem)
            setData(row1Dublicate, empCatCode, empAcceptItem)
            if (empAcceptItem.sexType === 'W') {
              setData(row2, empCatCode, empAcceptItem)
            }
          }
          if (row98Codes.includes(row.rowNum)) {
            setData(row98, empCatCode, empAcceptItem)
          }
        }
      })
    })

    /* Заповнення даних для звіту */
    reportRows.forEach(row => {
      reportCols.forEach(col => {
        let dataVal = row[col.dataID]
        row[printDataPrefix + col.rowNum] = dataVal && dataVal > 0 ? dataVal : ''
      })
    })
    return result
  },
  onReportClick: function (e) {
    drillDown(e.target.dataset['row'], e.target.dataset['col'])
    e.preventDefault()
  },
  onParamPanelConfig: function () {
    const levelSubordination = Ext.create('Ext.data.Store', {
      fields: ['id', 'name']
    })

    levelSubordination.add({ id: 'type1', name: UB.i18n('Центральним органам виконавчої влади') })
    levelSubordination.add({ id: 'type2', name: UB.i18n('Обласним, міським та іншим органам виконавчої влади') })
    paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'hbox' },
          items: [
            {
              layout: { type: 'vbox', align: 'stretch' },
              items: [
                HR.controlService.getOrgCombo({
                  width: 700,
                  labelWidth: 125,
                  readOnly: true
                }),
                HR.controlService.get2DepCombo({
                  labelWidth: 125,
                  width: 700
                })
              ]
            },
            {
              xtype: 'panel',
              layout: { type: 'vbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  fieldLabel: UB.i18n('Станом на'),
                  allowBlank: false,
                  labelWidth: 125,
                  width: 240,
                  listeners: {
                    afterrender: function (crtl) {
                      crtl.setValue(appAC.globalApplicationDate())
                    }
                  }
                },
                {
                  xtype: 'combobox',
                  allowBlank: false,
                  editable: false,
                  name: 'levelSubordination',
                  fieldLabel: UB.i18n('Підпорядкованя:'),
                  labelWidth: 125,
                  width: 700,
                  valueField: 'id',
                  displayField: 'name',
                  store: levelSubordination,
                  queryMode: 'local',
                  value: 'type1'
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        let frm = owner.getForm()
        return {
          orgID: frm.findField('organizationID').getValue() || 0,
          levelSubordination: frm.findField('levelSubordination').getValue() || 0,
          onDate: AC.dateService.shiftDate(frm.findField('onDate').getValue() || AC.dateService.todayDate()),
          structDepID: frm.findField('structDepID').getValue() || 0,
          structDepName: frm.findField('structDepID').getRawValue(),
          childDepID: frm.findField('childDepID').getValue() || 0,
          childDepName: frm.findField('childDepID').getRawValue()
        }
      }
    })
    return paramForm
  }
}

function drillDown (rowCode, colCode) {
  if (colCode === 'A') {
    let row = reportCfg[rowCode]
    let dictPosIDs = row.elmIds
    if (dictPosIDs.length === 0) {
      dictPosIDs.push(0)
    }
    $App.doCommand({
      cmdType: 'showList',
      isModal: true,
      description: UB.i18n(`Налагодження рядка {0}`, row.rowNum),
      cmpInitConfig: {
        dfm: {
          size: {
            width: 1000,
            height: 500
          }
        },
        onItemDblClick: function (grid, record) {
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_dictPosition',
            entity: 'hr_dictPosition',
            instanceID: record.get('ID')
          })
        }
      },
      hideActions: ['addNew', 'addNewByCurrent', 'del', 'edit', 'itemSelect'],
      cmdData: {
        params: [{
          entity: 'hr_dictPosition',
          method: 'select',
          fieldList: [
            { name: 'code' },
            { name: 'name' },
            { name: 'positionType' },
            { name: 'positionCategory' },
            { name: 'dictStaffCatID' },
            { name: 'dictStaffSubCatID' },
            { name: 'ID', visibility: false }
          ],
          whereList: {
            ID: {
              expression: '[ID]',
              condition: 'in',
              value: dictPosIDs
            }
          },
          orderList: {
            name: {
              expression: '[name]',
              order: 'asc'
            }
          }
        }]
      }
    })
  } else {
    let row = reportCfg[rowCode]
    let empPosIDs = row.empPosIDs[dataPrefix + colCode]
    if (empPosIDs.length === 0) {
      empPosIDs.push(0)
    }
    $App.doCommand({
      cmdType: 'showList',
      isModal: true,
      description: UB.i18n('Форма 17. Лікарі'),
      cmpInitConfig: {
        dfm: {
          size: {
            width: 1000,
            height: 500
          }
        },
        onItemDblClick: function (grid, record) {
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_employee',
            entity: 'hr_employee',
            instanceID: record.get('employeeID'),
            cmpInitConfig: {
              employeeNumberID: record.get('employeeNumberID')
            }
          })
        }
      },
      hideActions: ['addNew', 'addNewByCurrent', 'del', 'edit', 'itemSelect'],
      cmdData: {
        params: [{
          entity: 'hr_employeePositionS',
          method: 'select',
          fieldList: [
            { name: 'employeeNumberID.tabNum', description: UB.i18n('Таб. №'), config: { width: 100 } },
            { name: 'description', description: UB.i18n('ПІБ, посада, підрозділ'), config: { width: 500 } },
            { name: 'mtCount', description: UB.i18n('Кільк. ставок'), config: { width: 100, align: 'center' }, format: '0.0' },
            { name: 'employeeID.sexType', description: UB.i18n('Стать'), config: { width: 100, align: 'center' } },
            { name: 'employeeID.age', description: UB.i18n('Вік'), config: { width: 80, align: 'center' } },
            { name: 'employeeNumberID', visibility: false },
            { name: 'employeeID', visibility: false }
          ],
          whereList: {
            ID: {
              expression: '[ID]',
              condition: 'in',
              value: empPosIDs
            }
          },
          orderList: {
            description: {
              expression: '[description]',
              order: 'asc'
            }
          }
        }]
      }
    })
  }
}

function initData (dataItem, defValue = 0) {
  reportCols.forEach(col => {
    dataItem[col.dataID] = defValue
  })
}

function getEmpPosIDs () {
  const res = {}
  reportCols.forEach(col => {
    res[col.dataID] = []
  })
  return res
}

function setData (row, empCatCode, dataItem) {
  reportCols.forEach(col => {
    if (col.empCat === empCatAll || col.empCat === empCatCode) {
      row[col.dataID]++
      row.empPosIDs[col.dataID].push(dataItem.ID)
    }
  })
}
