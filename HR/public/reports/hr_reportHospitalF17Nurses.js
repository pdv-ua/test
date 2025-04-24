/* global Ext _ $App UB AC HR appAC */
const reportCode = 'f17n'
const paramCodePrefix = 'F17N'
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
    const depIDs = []
    structDepID && depIDs.push(structDepID)
    childDepID && depIDs.push(childDepID)

    const orgName = await UB.Repository('hr_organization')
      .attrs(['fullName'])
      .where('mi_data_id', '=', orgID)
      .misc({ __mip_ondate: onDate })
      .selectScalar()
    let empAcceptDataPromise = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeID', 'positionID.dictPositionID', 'employeeID.sexType', 'positionID.dictSpecialtyID'])
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
      'positionID.dictSpecialtyID': 'dictSpecialtyID'
    })
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
    const level1Codes = ['1', '12', '13', '15', '18', '19', '20']
    const emptyRowCodes = ['14']
    const captionLinkCodes = []
    for (let i = 4; i <= 25; i++) {
      let code = i.toString()
      !emptyRowCodes.includes(code) && captionLinkCodes.push(code)
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
      reportCfg[rowCode] = paramObj
    })
    const reportRows = _.filter(reportCfg, paramObj => paramObj.isRow)
    const reportRows1 = reportRows.filter(paramObj => paramObj.level === 1 && !['1', '12', '18'].includes(paramObj.code))
    const reportRows2 = reportRows.filter(paramObj => paramObj.level === 2)
    const rowsToCalc = reportRows1.concat(reportRows2)
    const result = {
      orgID: orgID,
      orgName: orgName,
      onDate: onDateStr,
      onDateTime: onDateTimeStr,
      structDepName: reportParams.structDepName || '',
      childDepName: reportParams.childDepName || ''
    }
    result.rows1 = reportRows.filter(row => row.level === 1)
    initData(result.rows1)
    result.rows1.forEach(row1 => {
      row1.rows2 = reportRows.filter(row => row.level === 2 && row.parentID === row1.ID)
      initData(row1.rows2)
    })
    /* Заповнення даними об'єкту reportCfg */
    empAcceptData.forEach(empAcceptItem => {
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
      let empCatCode = (empCatItem && empCatItem.code) || ''
      rowsToCalc.forEach(row => {
        if (!emptyRowCodes.includes(row.rowNum) && row.elmIds.includes(empAcceptItem.dictPositionID)) {
          setData(row, empCatCode, empAcceptItem)
        }
      })
    })
    /* формули по рядкам */
    const row12 = reportCfg[rowCodePrefix + '12']
    initData([row12])
    const row12Codes = []
    for (let i = 21; i <= 25; i++) {
      row12Codes.push(i.toString())
    }
    let row12det = reportRows.filter(row => row12Codes.includes(row.rowNum))
    row12det.forEach(row => {
      reportCols.forEach(col => {
        row12[col.dataID] += row[col.dataID]
        row.empPosIDs && row12.empPosIDs[col.dataID].push(...row.empPosIDs[col.dataID])
      })
    })
    const row1 = reportCfg[rowCodePrefix + '1']
    const row18 = reportCfg[rowCodePrefix + '18']
    initData([row1, row18])
    const row1Codes = []
    for (let i = 2; i <= 12; i++) {
      row1Codes.push(i.toString())
    }
    let row1det = reportRows.filter(row => row1Codes.includes(row.rowNum))
    row1det.forEach(row => {
      reportCols.forEach(col => {
        row1[col.dataID] += row[col.dataID]
        row.empPosIDs && row1.empPosIDs[col.dataID].push(...row.empPosIDs[col.dataID])
        /* 18. у тому числі жінок */
        if (row.sexType === 'W') {
          row18[col.dataID] += row[col.dataID]
          row.empPosIDs && row18.empPosIDs[col.dataID].push(...row.empPosIDs[col.dataID])
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
    paramForm = Ext.create('UBS.ReportParamForm', {
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
                  width: 700,
                  labelWidth: 125,
                  readOnly: true
                }),
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
                }
              ]
            },
            HR.controlService.get2DepCombo({
              labelWidth: 125,
              width: 700,
              layout: 'hbox'
            })
          ]
        }
      ],
      getParameters: function (owner) {
        let frm = owner.getForm()
        return {
          orgID: frm.findField('organizationID').getValue() || 0,
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
      description: UB.i18n('Форма 17. Середній медичний персонал'),
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

function initData (data, defValue = 0) {
  data.forEach(dataItem => {
    reportCols.forEach(col => {
      dataItem[col.dataID] = defValue
    })
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
    let toAdd = col.empCat === empCatAll || col.empCat === empCatCode
    if (toAdd) {
      row[col.dataID]++
      row.empPosIDs[col.dataID].push(dataItem.ID)
      row.sexType = dataItem.sexType
    }
  })
}
