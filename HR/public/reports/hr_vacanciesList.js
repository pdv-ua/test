/* global Ext _ UB AC HR $App appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    const result = {
      dictFundSourceName: reportParams.dictFundSourceName,
      orgUnits: [],
      countQuantity: 0,
      countWork: 0,
      countVacancy: 0,
      countChild: 0
    }
    const orgName = await UB.Repository('hr_organization')
      .attrs(['fullName'])
      .where('mi_data_id', '=', reportParams.organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: reportParams.onDate })
      .selectScalar()
    result.organizationName = `${orgName || ''}${reportParams.includeChildOrgs ? ` ${UB.i18n('(з підпорядкованими організаціями)')}` : ''}`
    let deptName
    if (reportParams.departmentID) {
      deptName = await UB.Repository('hr_department')
        .attrs(['fullName'])
        .where('mi_data_id', '=', reportParams.departmentID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: reportParams.onDate })
        .selectScalar()
    }
    result.departmentName = `${deptName || ''}${reportParams.includeChildDepts ? ` ${UB.i18n('(з підпорядкованими)')}` : ''}`
    result.onDate = AC.dateService.getStringFormatDate(reportParams.onDate, '', '', UB.i18n(' р.'))
    const orgs = await HR.orgStructReportUtils.getOrganizationData(reportParams.onDate, reportParams.organizationID, reportParams.includeChildOrgs)
    const childOrgIDs = orgs.map(itm => itm.mi_data_id)

    let posVacData = {}
    for (let i = 0; i < childOrgIDs.length; i++) {
      const posVacObj = await $App.connection.run({
        entity: 'hr_positionVac',
        method: 'selectVacanciesWithVacFrom',
        dictFundSourceID: reportParams.dictFundSourceID,
        orgID: childOrgIDs[i],
        departmentID: reportParams.departmentID,
        includeChildDepts: reportParams.includeChildDepts,
        onDate: reportParams.onDate
      })
      posVacData[childOrgIDs[i]] = JSON.parse(posVacObj.resultData)
    }
    // posVacData = posVacData ? _.groupBy(posVacData, 'mi_data_id') : []

    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(reportParams.organizationID)
    result.showTotals = settingsOrg.showTotals
    result.roundTo = settingsOrg.roundTo
    result.roundToQuantity = settingsOrg.roundToQuantity
    result.namePosition = settingsOrg.namePosition

    const departments = await HR.orgStructReportUtils.getDepartmentIDs(reportParams.onDate, childOrgIDs, reportParams.departmentID, reportParams.includeChildDepts)
    const orgStruct = await HR.orgStructReportUtils.getStaffUnitData(reportParams.onDate, childOrgIDs, reportParams.departmentID, reportParams.includeChildDepts, departments)
    if (!orgStruct) {
      return result
    }

    const isFundSourceAccounting = AC.settings.get('hrFundSourceAccounting', appAC.globalOrganization())
    let posData = UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'fullName', 'quantity', 'dateToEmpty', 'accrualSum', 'name',
        'dictPositionID.fullName', 'dictPositionID.name', 'orgID'])
      .attrsIf(isFundSourceAccounting === 'STAFF', ['fundSourcePositionID.ID', 'fundSourcePositionID.dictFundSourceID', 'fundSourcePositionID.dictFundSourceID.name', 'fundSourcePositionID.quantity'])
      .misc({ __mip_ondate: reportParams.onDate })
      .where('state', '=', 'ACTIVE')
      .whereIf(departments.length, 'parentUnitID', 'in', departments)
      .whereIf(reportParams.organizationID, 'orgID', 'in', childOrgIDs)
    if (isFundSourceAccounting === 'STAFF') {
      posData.joinCondition('fundSourcePositionID.mi_deleteDate', '>=', '#maxdate')
    }
    posData = await posData.selectAsObject()

    function getEmployeePositionPromise () {
      const data = UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'departmentID', 'organizationID', 'positionID', 'employeeID.shortFIO', 'dateToEmpty', 'employeeNumberID'])
        .attrsIf(isFundSourceAccounting === 'STAFF', ['fundSourceEmpPosID.ID', 'fundSourceEmpPosID.dictFundSourceID'])
        .where('dateFrom', '<=', reportParams.onDate)
        .where('dateTo', '>=', reportParams.onDate)
        .whereIf(reportParams.organizationID, 'organizationID', 'in', childOrgIDs)
        .whereIf(departments.length, 'departmentID', 'in', departments)
      if (isFundSourceAccounting === 'STAFF') {
        data.joinCondition('fundSourceEmpPosID.mi_deleteDate', '>=', '#maxdate')
      }
      return data
    }
    function empLongTermAbsc () {
      return UB.Repository('hr_empLongTermAbsc')
        .attrs('ID')
        .correlation('employeeNumberID', 'employeeNumberID')
        .whereIf(reportParams.organizationID, 'organizationID', 'in', childOrgIDs)
        .where('dateFrom', '<=', reportParams.onDate)
        .where('dateTo', '>=', reportParams.onDate)
        .where('mi_deleteDate', '>=', '#maxdate')
    }
    const objList = {}
    if (isFundSourceAccounting === 'STAFF') {
      objList['fundSourceEmpPosID.dictFundSourceID'] = 'dictFundSourceID'
    }

    let longTermAbsc = await UB.Repository('hr_empLongTermAbsc')
      .attrs(['employeeNumberID', 'dateFrom', 'dateTo'])
      .whereIf(reportParams.organizationID, 'organizationID', 'in', childOrgIDs)
      .where('dateFrom', '<=', reportParams.onDate)
      .where('dateTo', '>=', reportParams.onDate)
      .where('mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()
    longTermAbsc = longTermAbsc && longTermAbsc.length ? _.groupBy(longTermAbsc, 'employeeNumberID') : {}

    let existNumber = await getEmployeePositionPromise()
      .notExists(empLongTermAbsc())
      .orderBy('employeeID.shortFIO')
      .selectAsObject(objList)
    existNumber = existNumber && existNumber.length ? _.groupBy(existNumber, 'positionID') : {}

    let emptyNumber = await getEmployeePositionPromise()
      .exists(empLongTermAbsc())
      .orderBy('employeeID.shortFIO')
      .selectAsObject(objList)
    if (emptyNumber && emptyNumber.length) {
      emptyNumber.forEach(item => {
        const period = longTermAbsc[item.employeeNumberID] ? longTermAbsc[item.employeeNumberID].map(e => {
          return `${e.dateFrom ? AC.dateService.formatDate(e.dateFrom) : ''}-${e.dateTo ? (AC.dateService.formatDate(e.dateTo) === '31.12.9999' ? '' : AC.dateService.formatDate(e.dateTo)) : ''}`
        }).join(', ') : ''
        item.longTermAbsc = item['employeeID.shortFIO'] + (period ? ' (' + period + ')': '')
      })
    }
    emptyNumber = emptyNumber && emptyNumber.length > 0 ? _.groupBy(emptyNumber, 'positionID') : {}

    const tree = me.generateDataForReport(reportParams.departmentID || reportParams.organizationID,
      orgs, orgStruct, posData, existNumber, emptyNumber, posVacData,
      reportParams.onDate, result.roundTo, result.roundToQuantity, result.showTotals ? 2 : 1,
      result.namePosition, isFundSourceAccounting === 'STAFF')
    result.data = tree && tree.data ? tree.data : []
    result.countQuantity = tree.countQuantity
    result.countWork = tree.countWork
    result.countVacancy = tree.countVacancy
    result.countChild = tree.countChild

    result.roundToCountQuantity = result.roundToQuantity || HR.reportUtils.getQuantityFractional(result.countQuantity)
    result.roundToCountWork = result.roundToQuantity || HR.reportUtils.getQuantityFractional(result.countWork)
    result.roundToCountVacancy = result.roundToQuantity || HR.reportUtils.getQuantityFractional(result.countVacancy)
    result.roundToCountChild = result.roundToQuantity || HR.reportUtils.getQuantityFractional(result.countChild)

    return result
  },
  onParamPanelConfig: function () {
    const accMainReportsSubOrg = AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')
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
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getOrgCombo({
                  labelWidth: 120,
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
                  labelWidth: 120,
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
            HR.controlService.getFundSourceCombo({
              labelWidth: 120,
              width: 240 }
            ),
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  labelWidth: 120,
                  width: 240,
                  fieldLabel: UB.i18n('Станом на'),
                  value: AC.dateService.todayDate()
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          organizationID: frm.findField('organizationID').getValue() || 0,
          departmentID: frm.findField('departmentID').getValue() || 0,
          includeChildDepts: frm.findField('includeChildDepts').getValue() || false,
          includeChildOrgs: frm.findField('includeChildOrgs').getValue() || false,
          dictFundSourceID: frm.findField('dictFundSourceID').getValue() || 0,
          dictFundSourceName: frm.findField('dictFundSourceID').getRawValue() || 0,
          onDate: AC.dateService.shiftDate(frm.findField('onDate').getValue() || AC.dateService.todayDate())
        }
      }
    })
    return paramForm
  },
  generateDataForReport: function (itemID, orgs, orgStruct, positionData, existNumber, empEmpty,
    posVacDataAll, pDate, roundTo, roundToQuantity, showLevelTotals = 0, namePosition, isFundSourceAccounting) {
    if (!orgStruct || !orgStruct.length) return {}
    let posVacData
    const roundQ = roundToQuantity === 'numberGroup' ? 0 : roundToQuantity === 'decimal1' ? 1 : 2
    const roundS = roundTo === 'numberGroup' ? 0 : 2

    function getData (indexNpp, parentID, level = 1) {
      const result = {
        data: [],
        roundTo: roundTo,
        countQuantity: 0,
        countWork: 0,
        countVacancy: 0,
        countChild: 0,
        indexNpp: indexNpp
      }

      const curStruct = orgStruct.filter(el => el.parentUnitID === parentID)
      const str = level === 1 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)
      const styleBegin = level === 1 ? '<font color="blue">' : level === 2 ? '<u>' : ''
      const styleEnd = level === 1 ? '</font>' : level === 2 ? '</u>' : ''

      curStruct.forEach(orgItem => {
        if (orgItem.mi_unityEntity !== 'hr_department') {
          const posItems = positionData ? positionData.filter(el => el.mi_data_id === orgItem.mi_data_id) : undefined
          _.forEach(posItems, posItem => {
            const obj = {
              roundTo: roundTo,
              unitName: '',
              isDepartment: false,
              isTotal: false,
              name: namePosition
                ? HR.nameCase.cap(posItem.name || '')
                : HR.nameCase.cap(posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || ''),
              basepay: AC.currencyService.round(posItem.accrualSum || 0, roundS),
              nameFund: isFundSourceAccounting && posItem['fundSourcePositionID.ID'] ? posItem['fundSourcePositionID.dictFundSourceID.name'] || '' : '',
              dictFundSourceID: isFundSourceAccounting && posItem['fundSourcePositionID.ID'] ? posItem['fundSourcePositionID.dictFundSourceID'] || null : null
            }
            result.countWork += existNumber[posItem.mi_data_id] ? existNumber[posItem.mi_data_id].filter(el => !isFundSourceAccounting || (isFundSourceAccounting && ((el.dictFundSourceID || 0) === (obj.dictFundSourceID || 0)))).length : 0

            let quantity = isFundSourceAccounting && posItem['fundSourcePositionID.ID'] ? posItem['fundSourcePositionID.quantity'] : posItem.quantity
            quantity = !roundToQuantity ? quantity || 0 : AC.currencyService.round(quantity || 0, roundQ)

            const vacItems = posVacData[posItem.mi_data_id] && posVacData[posItem.mi_data_id]
            const vacItem = _.find(vacItems, { dictFundSourceID: obj.dictFundSourceID })

            let vacCount = (vacItem && vacItem.vacCount) || 0
            vacCount = !roundToQuantity ? vacCount || 0 : AC.currencyService.round(vacCount || 0, roundQ)
            if (vacCount > 0) {
              vacCount = !roundToQuantity ? vacCount : AC.currencyService.round(vacCount, roundQ)
              const posObj = Object.assign({}, obj)
              posObj.dateFrom = vacItem.vacFrom ? AC.dateService.formatDate(vacItem.vacFrom) : ''
              posObj.dateTo = vacItem.vacTo ? (AC.dateService.formatDate(vacItem.vacTo) === '31.12.9999' ? '' : AC.dateService.formatDate(vacItem.vacTo)) : ''
              posObj.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(vacCount)

              posObj.vacancyRate = vacCount
              posObj.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(vacCount)
              posObj.isTempVac = vacItem.isTempVac && empEmpty[posItem.mi_data_id] && empEmpty[posItem.mi_data_id].length > 0 ? empEmpty[posItem.mi_data_id].filter(el => !isFundSourceAccounting || (isFundSourceAccounting && ((el.dictFundSourceID || 0) === (obj.dictFundSourceID || 0)))).map(item => item.longTermAbsc).join(', ') : ''

              posObj.indexNum = indexNpp++
              result.data.push(posObj)
            }

            result.countQuantity += quantity
            result.countVacancy += vacCount > 0 ? vacCount : 0
            result.countChild += (vacCount > 0) && vacItem.isTempVac && empEmpty[posItem.mi_data_id] ? empEmpty[posItem.mi_data_id].filter(el => (el.dictFundSourceID || 0) === (obj.dictFundSourceID || 0)).length : 0
          })
        } else {
          const subTree = getData(indexNpp, orgItem.mi_data_id, level + 1)
          if (subTree && subTree.data && subTree.data.length) {
            const obj = {
              textAlign: 'left',
              roundTo: roundTo,
              name: `${str}${styleBegin}${orgItem.code ? orgItem.code + ' ' : ''}${level === 1 ? (orgItem.name || '').toUpperCase() : HR.nameCase.cap(orgItem.name || '')}${styleEnd}`,
              unitName: `${orgItem.code ? orgItem.code + ' ' : ''}${HR.nameCase.cap(orgItem.name || '')}`,
              isDepartment: true,
              isTotal: false
            }
            result.data.push(obj)

            indexNpp = subTree.indexNpp || 1
            result.data.push(...subTree.data)

            if (showLevelTotals > 0 && (level === showLevelTotals || showLevelTotals === 2)) {
              let rtq = roundToQuantity || HR.reportUtils.getQuantityFractional(subTree.countQuantity)
              const countQuantityStr = HR.reportUtils.quantityToString(subTree.countQuantity, rtq)
              rtq = roundToQuantity || HR.reportUtils.getQuantityFractional(subTree.countVacancy)
              const countVacancyStr = HR.reportUtils.quantityToString(subTree.countVacancy, rtq)

              const totalObj = {
                name: UB.i18n(`{0}{1} Всього вакансій - {2}, всього посад - {3}`, str, obj.unitName, countVacancyStr, countQuantityStr),
                isDepartment: false,
                isTotal: true
              }
              result.data.push(totalObj)
            }
          }
          result.countQuantity += subTree.countQuantity
          result.countWork += subTree.countWork
          result.countVacancy += subTree.countVacancy
          result.countChild += subTree.countChild
        }
      })

      if (result.data.filter(el => el.isDepartment).length === result.data.length) {
        // если только одни подразделения, то их игнорируем
        result.data = []
      }
      result.indexNpp = indexNpp
      return result
    }

    // orgStruct
    let indexNpp = 1
    const orgTree = {
      data: [],
      countQuantity: 0,
      countWork: 0,
      countVacancy: 0,
      countChild: 0
    }
    for (let i = 0; i < orgs.length; i++) {
      posVacData = posVacDataAll[orgs[i].mi_data_id]
      posVacData = posVacData ? _.groupBy(posVacData, 'mi_data_id') : []

      const aTree = getData(indexNpp, i === 0 ? itemID : orgs[i].mi_data_id)
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
        orgTree.countQuantity += aTree.countQuantity
        orgTree.countWork += aTree.countWork
        orgTree.countVacancy += aTree.countVacancy
        orgTree.countChild += aTree.countChild

        if (orgs.length > 1) {
          let rtq = roundToQuantity || HR.reportUtils.getQuantityFractional(aTree.countQuantity)
          const countQuantityStr = HR.reportUtils.quantityToString(aTree.countQuantity, rtq)
          rtq = roundToQuantity || HR.reportUtils.getQuantityFractional(aTree.countVacancy)
          const countVacancyStr = HR.reportUtils.quantityToString(aTree.countVacancy, rtq)
          orgTree.data.push({
            needAdd: true,
            indexNum: '',
            name: UB.i18n(`Всього по {0} вакансій - {1}, всього посад - {2}`, orgs[i].name, countVacancyStr, countQuantityStr),
            isDepartment: false,
            isTotal: true
          })
        }
      }
      indexNpp = aTree.indexNpp || 1
    }

    let rtq = roundToQuantity || HR.reportUtils.getQuantityFractional(orgTree.countQuantity)
    const countQuantityStr = HR.reportUtils.quantityToString(orgTree.countQuantity, rtq)
    rtq = roundToQuantity || HR.reportUtils.getQuantityFractional(orgTree.countVacancy)
    const countVacancyStr = HR.reportUtils.quantityToString(orgTree.countVacancy, rtq)
    orgTree.data.push({
      needAdd: true,
      indexNum: '',
      name: UB.i18n(`ВСЬОГО ВАКАНСІЙ - {0}, ВСЬОГО ПОСАД - {1}`, countVacancyStr, countQuantityStr),
      isDepartment: false,
      isTotal: true
    })

    return orgTree || []
  }
}
