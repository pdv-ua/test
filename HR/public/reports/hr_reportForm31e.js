/* global Ext _ UB AC HR appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    if (me.incomeParams && reportParams) {
      // для корректной выгрузки в Excel
      me.incomeParams = reportParams
    }
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    const organizationID = reportParams.organizationID || 0
    const dateFromPrev = AC.dateService.addYears(reportParams.dateFrom, -1)
    const dateToPrev = AC.dateService.addYears(reportParams.dateTo, -1)
    const nextOnDate = AC.dateService.addDays(reportParams.dateFrom, 1)
    const typeFOP = ['FOZP', 'FDZP', 'ZKV']
    const roundFop = reportParams.dontRound ? 'decimal2' : 'decimal1'
    const roundAvg = reportParams.dontRound ? 'decimal3' : 'numberGroup'

    const result = {
      data: [],
      dateFrom: AC.dateService.formatDate(reportParams.dateFrom),
      dateTo: AC.dateService.formatDate(reportParams.dateTo),
      departmentName: '',
      showCol6: reportParams.showAll,
      colSpan: 7 + (reportParams.showAll ? 1 : 0),
      tableWidth: 960 + (reportParams.showAll ? 140 : 0),
      listEmp: [],
      listEmpNone: false
    }

    const orgs = await HR.orgStructReportUtils.getOrganizationData(reportParams.dateTo, reportParams.organizationID, reportParams.includeChildOrgs)
    const childOrgIDs = orgs && orgs.length ? orgs.map(itm => itm.mi_data_id) : [reportParams.organizationID]
    const departments = await HR.orgStructReportUtils.getDepartmentIDs(reportParams.dateTo, childOrgIDs, reportParams.departmentID, reportParams.includeChildDepts)
    result.departmentName = reportParams.departmentID ? await HR.reportUtils.getNameDepartment(reportParams.dateTo, reportParams.organizationID, reportParams.departmentID) : ''

    const orgNames = orgs.find(o => o.mi_data_id === organizationID)
    if (orgNames) {
      result.organizationName = HR.nameCase.cap(orgNames.nameGen || orgNames.name || '')
      if (orgNames.parentUnitID && (orgNames['parentUnitID.shortName@hr_organization'] || orgNames['parentUnitID.name@hr_organization'])) {
        result.organizationName = HR.nameCase.cap(orgNames.shortName || orgNames.name || '')
        result.organizationName += '<br />' + (orgNames['parentUnitID.shortName@hr_organization'] || orgNames['parentUnitID.name@hr_organization'])
      }
    }

    const posData = await UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'dictCostTypeID.dictCostPlaceTypeID', 'positionCategory', 'orgID', 'mi_dateFrom', 'mi_dateTo'])
      .where('state', '=', 'ACTIVE')
      .whereIf(organizationID, 'orgID', 'in', childOrgIDs)
      .whereIf(departments.length, 'parentUnitID', 'in', departments)
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject()

    const repCode = 'f31e'
    const category3 = ['5', '6', '7', '8', '9']
    const category4 = ['1', '2', '3', '4']
    let repSetElement = await HR.accrualService.accrualSumGetSetElementsPromise(nextOnDate, repCode).selectAsObject() || []
    const dictCostPlaceTypeIDs_col2 = repSetElement.filter(el => el['repSetParamID.code'] === 'F31e_col2').map(el => el.elementID) || []
    const dictCostPlaceTypeIDs_col5 = repSetElement.filter(el => el['repSetParamID.code'] === 'F31e_col5').map(el => el.elementID) || []

    const empData = await me.getEmployeeData(reportParams.dateFrom, reportParams.dateTo, childOrgIDs, departments)
    let firedEmp = await me.getEmployeeDataFired(reportParams.dateFrom, reportParams.dateTo, childOrgIDs, departments)
    if (firedEmp && firedEmp.length) {
      firedEmp.forEach(el => {
        el.fired = true
      })
      empData.push(...firedEmp)
    }
    const employeeIDs = _.compact(_.uniq(empData.map(el => el.employeeNumberID)))
    const periods = await me.getPeriods(reportParams.dateFrom, reportParams.dateTo, organizationID)
    const accrualData = await me.getAccrualData(organizationID, periods, childOrgIDs, departments.length ? employeeIDs : [], !!departments.length)

    // Prev
    const empDataPrev = await me.getEmployeeData(dateFromPrev, dateToPrev, childOrgIDs, departments)
    firedEmp = await me.getEmployeeDataFired(dateFromPrev, dateToPrev, childOrgIDs, departments)
    if (firedEmp && firedEmp.length) {
      firedEmp.forEach(el => {
        el.fired = true
      })
      empDataPrev.push(...firedEmp)
    }

    const employeeIDsPrev = _.compact(_.uniq(empDataPrev.map(el => el.employeeNumberID)))
    const periodsPrev = await me.getPeriods(dateFromPrev, dateToPrev, organizationID)
    const accrualDataPrev = await me.getAccrualData(organizationID, periodsPrev, childOrgIDs, departments.length ? employeeIDsPrev : [], !!departments.length)

    const empWithNoPosition = empData.filter(el => !el.positionID && el.dictPositionID)
    empWithNoPosition.push(...empDataPrev.filter(el => !el.positionID && el.dictPositionID))
    const dictPosData = empWithNoPosition.length ? await UB.Repository('hr_dictPosition')
      .attrs(['ID', 'dictCostTypeID.dictCostPlaceTypeID', 'positionCategory'])
      .where('ID', 'in', empWithNoPosition.map(el => el.dictPositionID))
      .selectAsObject() : []

    async function calcAvgValues (name, rowNum, functionName) {
      for (let k = 0; k < 2; k++) {
        const obj = me.getObj(k === 0 ? name : 'за відповідний період минулого року', k + rowNum, roundAvg, result.showCol6, result.colSpan)
        result.data.push(obj)
        for (let i = 0; i < childOrgIDs.length; i++) {
          const periodsForCal = k === 0 ? periods : periodsPrev
          const objByPeriod = me.getObj('temp', obj.rowNum)

          for (let j = 0; j < periodsForCal.length; j++) {
            const empDataByPeriod = me.getEmployeeDataByPeriod(k === 0 ? empData : empDataPrev, periodsForCal[j].dateFrom, periodsForCal[j].dateTo)
            const avgEmployeeIDs3 = me.getEmployeeIDs(empDataByPeriod, posData, dictPosData, dictCostPlaceTypeIDs_col2, category3, periodsForCal[j].dateFrom, periodsForCal[j].dateTo)
            const avgEmployeeIDs4 = me.getEmployeeIDs(empDataByPeriod, posData, dictPosData, dictCostPlaceTypeIDs_col2, category4, periodsForCal[j].dateFrom, periodsForCal[j].dateTo)
            const avgEmployeeIDs5 = me.getEmployeeIDs(empDataByPeriod, posData, dictPosData, dictCostPlaceTypeIDs_col5, [], periodsForCal[j].dateFrom, periodsForCal[j].dateTo)
            // === 6 === all who not in 3,4,5 cols
            const avgEmployeeIDs6 = reportParams.showAll ? empDataByPeriod.filter(el => !avgEmployeeIDs3.includes(el.employeeNumberID) && !avgEmployeeIDs4.includes(el.employeeNumberID) && !avgEmployeeIDs5.includes(el.employeeNumberID)).map(el => el.employeeNumberID) : []

            const params = {
              orgID: childOrgIDs[i],
              dateFrom: periodsForCal[j].dateFrom,
              dateTo: periodsForCal[j].dateTo,
              departmentID: reportParams.departmentID,
              includeChildDepts: reportParams.includeChildDepts
            }
            const query = {
              entity: 'hr_report',
              method: functionName,
              params: JSON.stringify(params)
            }

            const [
              { resultData: aList }
            ] = await UB.connection.runTransAsObject([query])

            if (aList && aList.length) {
              const avgListData = JSON.parse(aList)
              if (avgListData && avgListData.employeeNumbers) {
                let value3 = 0
                let value4 = 0
                let value5 = 0
                let value6 = 0
                _.forEach(avgListData.employeeNumbers, (item, id) => {
                  if (avgEmployeeIDs3.includes(parseInt(id))) {
                    value3 += item.dayCount
                  }
                  if (avgEmployeeIDs4.includes(parseInt(id))) {
                    value4 += item.dayCount
                  }
                  if (avgEmployeeIDs5.includes(parseInt(id))) {
                    value5 += item.dayCount
                  }
                  if (avgEmployeeIDs6.includes(parseInt(id))) {
                    value6 += item.dayCount
                  }
                })
                me.setValueObj(objByPeriod, 0, 0, value3, value4, value5, value6)
              }
            }
          }

          if (periodsForCal && periodsForCal.length > 1) {
            for (let i = 2; i <= 6; i++) {
              objByPeriod[`value${i}`] = objByPeriod[`value${i}`] ? AC.currencyService.round(objByPeriod[`value${i}`] / periodsForCal.length, 3) : 0
            }
          }

          me.setValueObj(obj, 0, 0, objByPeriod.value3, objByPeriod.value4, objByPeriod.value5, objByPeriod.value6)
        }
        me.makeRound(obj, !reportParams.dontRound)
      }
    }
    await calcAvgValues('Середньооблікова чисельність в еквіваленті повної зайнятості осіб з початку звітного періоду', 1, 'getAvgListEmpCountFullEnergo')

    // ============= ФОП
    const obj3 = me.getObj('Фонд оплати праці, тис.грн з дес. знаком з початку звітного періоду', 3, roundFop, result.showCol6, result.colSpan)
    result.data.push(obj3)

    const obj4 = me.getObj('за відповідний період минулого року', 4, roundFop, result.showCol6, result.colSpan)
    result.data.push(obj4)
    result.data.push(me.getObj('з них:', 0, roundFop, result.showCol6, result.colSpan))

    for (let i = 0; i < 3; i++) {
      let name = i === 0
        ? 'Фонд основної заробітної плати з початку звітного періоду'
        : i === 1 ? 'Фонд додаткової заробітної плати з початку звітного періоду' : 'Інші заохочувальні та компенсаційні виплати з початку звітного періоду'

      for (let k = 0; k < 2; k++) {
        const obj = me.getObj(k === 0 ? name : 'за відповідний період минулого року', 5 + k + i * 2, roundFop, result.showCol6, result.colSpan)
        result.data.push(obj)
        const data = k === 0 ? accrualData[typeFOP[i]] : accrualDataPrev[typeFOP[i]]
        const periodsForCal = k === 0 ? periods : periodsPrev

        if (data) {
          for (let j = 0; j < periodsForCal.length; j++) {
            const objByPeriod = me.getObj('temp', obj.rowNum)
            const employeeNumberInAccrualData = _.uniq(data.filter(el => el.periodID === periodsForCal[j].ID).map(el => el.employeeNumberID))
            const empDataByPeriod = me.getEmployeeDataByPeriod(k === 0 ? empData : empDataPrev, periodsForCal[j].dateFrom, periodsForCal[j].dateTo, employeeNumberInAccrualData)
            const fopEmployeeIDs3 = me.getEmployeeIDs(empDataByPeriod, posData, dictPosData, dictCostPlaceTypeIDs_col2, category3, periodsForCal[j].dateFrom, periodsForCal[j].dateTo)
            const fopEmployeeIDs4 = me.getEmployeeIDs(empDataByPeriod, posData, dictPosData, dictCostPlaceTypeIDs_col2, category4, periodsForCal[j].dateFrom, periodsForCal[j].dateTo)
            const fopEmployeeIDs5 = me.getEmployeeIDs(empDataByPeriod, posData, dictPosData, dictCostPlaceTypeIDs_col5, [], periodsForCal[j].dateFrom, periodsForCal[j].dateTo)
            // === 6 === all who not in 3,4,5 cols
            const fopEmployeeIDs6 = reportParams.showAll ? empDataByPeriod.filter(el => !fopEmployeeIDs3.includes(el.employeeNumberID) && !fopEmployeeIDs4.includes(el.employeeNumberID) && !fopEmployeeIDs5.includes(el.employeeNumberID)).map(el => el.employeeNumberID) : []

            let fltAccrualData = data.filter(el => el.periodID === periodsForCal[j].ID && fopEmployeeIDs3.includes(el.employeeNumberID))
            let value3 = _.sumBy(fltAccrualData, 'paySum')

            fltAccrualData = data.filter(el => el.periodID === periodsForCal[j].ID && fopEmployeeIDs4.includes(el.employeeNumberID))
            let value4 = _.sumBy(fltAccrualData, 'paySum')

            fltAccrualData = data.filter(el => el.periodID === periodsForCal[j].ID && fopEmployeeIDs5.includes(el.employeeNumberID))
            let value5 = _.sumBy(fltAccrualData, 'paySum')

            fltAccrualData = data.filter(el => el.periodID === periodsForCal[j].ID && fopEmployeeIDs6.includes(el.employeeNumberID))
            let value6 = _.sumBy(fltAccrualData, 'paySum')

            me.setValueObj(objByPeriod, 0, 0, value3, value4, value5, value6)
            // me.makeRound(objByPeriod)
            me.setValueObj(obj, objByPeriod.value1, objByPeriod.value2, objByPeriod.value3, objByPeriod.value4, objByPeriod.value5, objByPeriod.value6)
          }
        }
        me.makeRound(obj, !reportParams.dontRound)
        me.setValueObj(k === 0 ? obj3 : obj4, obj.value1, obj.value2, obj.value3, obj.value4, obj.value5, obj.value6)
      }
      me.makeRound(obj3, false)
      me.makeRound(obj4, false)
    }

    // =============
    await calcAvgValues('Середньооблікова чисельність штатних працівників, осіб з початку звітного періоду', 11, 'getAvgListEmpCount')

    for (let k = 0; k < 2; k++) {
      const obj = me.getObj(k === 0 ? 'Облікова чисельність штатних працівників на кінець звітного періоду' : 'за відповідний період минулого року', 13 + k, roundAvg, result.showCol6, result.colSpan)
      result.data.push(obj)
      const empDataByPeriod = me.getEmployeeDataByPeriod(k === 0 ? empData : empDataPrev, k === 0 ? reportParams.dateTo : dateToPrev, k === 0 ? reportParams.dateTo : dateToPrev)
      const avgEmployeeIDs3 = me.getEmployeeIDs(empDataByPeriod, posData, dictPosData, dictCostPlaceTypeIDs_col2, category3, k === 0 ? reportParams.dateTo : dateToPrev, k === 0 ? reportParams.dateTo : dateToPrev)
      const avgEmployeeIDs4 = me.getEmployeeIDs(empDataByPeriod, posData, dictPosData, dictCostPlaceTypeIDs_col2, category4, k === 0 ? reportParams.dateTo : dateToPrev, k === 0 ? reportParams.dateTo : dateToPrev)
      const avgEmployeeIDs5 = me.getEmployeeIDs(empDataByPeriod, posData, dictPosData, dictCostPlaceTypeIDs_col5, [], k === 0 ? reportParams.dateTo : dateToPrev, k === 0 ? reportParams.dateTo : dateToPrev)
      // === 6 === all who not in 3,4,5 cols
      const avgEmployeeIDs6 = reportParams.showAll ? empDataByPeriod.filter(el => !avgEmployeeIDs3.includes(el.employeeNumberID) && !avgEmployeeIDs4.includes(el.employeeNumberID) && !avgEmployeeIDs5.includes(el.employeeNumberID)).map(el => el.employeeNumberID) : []

      for (let i = 0; i < childOrgIDs.length; i++) {
        const params = {
          orgID: childOrgIDs[i],
          onDate: k === 0 ? reportParams.dateTo : dateToPrev,
          avgCount: true,
          departmentID: reportParams.departmentID,
          includeChildDepts: reportParams.includeChildDepts
        }
        const query = {
          entity: 'hr_report',
          method: 'getAvgListEmpCountOnDate',
          params: JSON.stringify(params)
        }

        const [
          { resultData: aList }
        ] = await UB.connection.runTransAsObject([query])

        if (aList && aList.length) {
          const avgListData = JSON.parse(aList)

          if (avgListData && avgListData.employeeNumbers) {
            let value3 = 0
            let value4 = 0
            let value5 = 0
            let value6 = 0
            _.forEach(avgListData.employeeNumbers, (item, id) => {
              if (avgEmployeeIDs3.includes(parseInt(id))) {
                value3 += item.dayCount
              }
              if (avgEmployeeIDs4.includes(parseInt(id))) {
                value4 += item.dayCount
              }
              if (avgEmployeeIDs5.includes(parseInt(id))) {
                value5 += item.dayCount
              }
              if (avgEmployeeIDs6.includes(parseInt(id))) {
                value6 += item.dayCount
              }
            })
            me.setValueObj(obj, 0, 0, value3, value4, value5, value6)
          }
        }
      }
      me.makeRound(obj, !reportParams.dontRound)
    }

    return result
  },
  calcFOP: function () {

  },
  onParamPanelConfig: function () {
    const me = this
    const accMainReportsSubOrg = AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')
    const dateToAvg = AC.dateService.getQuarterDates((new Date()).getFullYear(), AC.dateService.getQuarter(new Date())).dateTo
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
          layout: { type: 'vbox' },
          items: [
            {
              layout: { type: 'hbox' },
              flex: 1,
              items: [
                {
                  xtype: 'datefield',
                  name: 'dateFrom',
                  labelWidth: 130,
                  width: 300,
                  fieldLabel: UB.i18n('За період з'),
                  allowBlank: false,
                  value: AC.dateService.firstDayOfYear(new Date()),
                  validator: function () {
                    const ctrl = this
                    if (ctrl) {
                      let form = ctrl.up('form')
                      const f = form.down('[name=dateFrom]').getValue()
                      const t = form.down('[name=dateTo]').getValue()
                      return (f && t && f > t)
                        ? UB.i18n('Дата кінця періоду повинна перевищувати дату початку')
                        : true
                    }
                  }
                },
                {
                  xtype: 'datefield',
                  name: 'dateTo',
                  labelWidth: 30,
                  width: 100,
                  fieldLabel: UB.i18n('по'),
                  allowBlank: false,
                  value: dateToAvg,
                  validator: function () {
                    const ctrl = this
                    if (ctrl) {
                      let form = ctrl.up('form')
                      const f = form.down('[name=dateFrom]').getValue()
                      const t = form.down('[name=dateTo]').getValue()
                      return (f && t && f > t)
                        ? UB.i18n('Дата кінця періоду повинна перевищувати дату початку')
                        : true
                    }
                  }
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getOrgCombo({
                  labelWidth: 130,
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
                  labelWidth: 130,
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
              xtype: 'panel',
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'checkboxfield',
                  fieldLabel: UB.i18n('Показувати суму всіх працівників'),
                  labelWidth: 260,
                  name: 'showAll',
                  value: false
                },
                {
                  xtype: 'checkboxfield',
                  fieldLabel: UB.i18n('Формувати без заокруглень'),
                  labelWidth: 200,
                  name: 'dontRound',
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
          organizationID: frm.findField('organizationID').getValue(),
          departmentID: frm.findField('departmentID').getValue(),
          includeChildOrgs: frm.findField('includeChildOrgs').getValue() || false,
          includeChildDepts: frm.findField('includeChildDepts').getValue() || false,
          dateFrom: AC.dateService.shiftDate(frm.findField('dateFrom').getValue()),
          dateTo: AC.dateService.shiftDate(frm.findField('dateTo').getValue()),
          showAll: frm.findField('showAll').getValue(),
          dontRound: frm.findField('dontRound').getValue()
        }
      }
    })
    return me.paramForm
  },
  getEmployeeData: function (dateFrom, dateTo, childOrgIDs, departments) {
    return UB.Repository('hr_employeePositionS')
      .attrs(['dateFrom', 'dateTo', 'positionID', 'dictPositionID', 'employeeID', 'employeeNumberID', 'departmentID', 'organizationID'])
      // .groupBy(['positionID', 'dictPositionID', 'employeeID', 'employeeNumberID', 'departmentID', 'organizationID'])
      .where('isActive', '=', true)
      .where('employeeID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('orderID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('changeOrderID.mi_deleteDate', '>=', '#maxdate')
      .whereIf(childOrgIDs.length, 'organizationID', 'in', childOrgIDs)
      .whereIf(departments.length, 'departmentID', 'in', departments)
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .selectAsObject()
  },
  getEmployeeDataFired: async function (dateFrom, dateTo, childOrgIDs, departments) {
    let empData = await UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'positionID', 'dictPositionID', 'employeeID', 'employeeNumberID', 'departmentID', 'organizationID'])
      .groupBy(['ID', 'positionID', 'dictPositionID', 'employeeID', 'employeeNumberID', 'departmentID', 'organizationID'])
      .where('isActive', '=', true)
      .where('employeeID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('orderID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('changeOrderID.mi_deleteDate', '>=', '#maxdate')
      .whereIf(childOrgIDs.length, 'organizationID', 'in', childOrgIDs)
      .whereIf(departments.length, 'departmentID', 'in', departments)
      .where('dateTo', '<', dateFrom)
      .notExists(
        UB.Repository('hr_employeePositionS')
          .correlation('employeeNumberID', 'employeeNumberID')
          .whereIf(childOrgIDs.length, 'organizationID', 'in', childOrgIDs)
          // .whereIf(departments.length, 'departmentID', 'in', departments)
          .where('dateFrom', '<=', dateTo)
          .where('dateTo', '>=', dateFrom)
      )
      .exists(
        UB.Repository('hr_accrual')
          .correlation('employeeNumberID', 'employeeNumberID')
          .where('periodCalc', '>=', dateFrom, 'pc1')
          .where('periodCalc', '<=', dateTo, 'pc2')
          .where('periodSalary', '<=', dateTo, 'pc3')
          .where('periodSalary', '>=', dateFrom, 'ps1')
          .where('periodSalary', '<=', dateTo, 'ps2')
          .where('periodCalc', '<', dateFrom, 'ps3')
          .logic('(([pc1] and [pc2] and [pc3]) or ([ps1] and [ps2] and [ps3]))')
          .where('employeeNumberID.orgID', 'in', childOrgIDs)
          .where('employeeNumberID.employeeID.mi_deleteDate', '>=', '#maxdate')
          .where('flagsRecSum', '!=', 8192)
      )
      .selectAsObject()
    if (!empData || !empData.length) return []
    empData = _.groupBy(empData, 'employeeNumberID')
    const resultData = []
    _.forEach(empData, items => {
      items = items.sort((a, b) => (a.ID > b.ID) ? -1 : 1) // нужен самый последний срез
      resultData.push(items[0])
    })
    return resultData
  },
  getAccrualData: async function (mainOrganizationID, period, childOrgIDs, employeeIDs, limitedAccess) {
    const ids = employeeIDs && employeeIDs.length ? _.chunk(employeeIDs, 1000) : [[]]

    const accrualDataByType = {}
    const typeFOP = ['FOZP', 'FDZP', 'ZKV']
    for (let k = 0; k < typeFOP.length; k++) {
      const accrualData = []
      for (let i = 0; i < childOrgIDs.length; i++) {
        const parentOrdID = AC.settings.get('hrUseReportSettingsParentOrg', mainOrganizationID)
        for (let j = 0; j < period.length; j++) {
          for (let m = 0; m < ids.length; m++) {
            let accrualOrg = await UB.Repository('hr_accrual')
              .attrs(['sum([paySum])', 'employeeNumberID', 'employeeNumberID.orgID'])
              .where('periodCalc', '>=', period[j].dateFrom, 'pc1')
              .where('periodCalc', '<=', period[j].dateTo, 'pc2')
              .where('periodSalary', '<=', period[j].dateTo, 'pc3')
              .where('periodSalary', '>=', period[j].dateFrom, 'ps1')
              .where('periodSalary', '<=', period[j].dateTo, 'ps2')
              .where('periodCalc', '<', period[j].dateFrom, 'ps3')
              .logic('(([pc1] and [pc2] and [pc3]) or ([ps1] and [ps2] and [ps3]))')
              .whereIf(ids[m] && ids[m].length > 0, 'employeeNumberID', 'in', ids[m])
              .where('employeeNumberID.orgID', '=', childOrgIDs[i])
              .where('employeeNumberID.employeeID.mi_deleteDate', '>=', '#maxdate')
              .where('flagsRecSum', '!=', 8192)
              .whereIf(limitedAccess && !AC.entityUtils.verifyRightsMethod('hr_employeeNumber', 'employeeLimitedAccess'), 'employeeNumberID.limitedAccess', '=', 0) // limitedAccess
              .exists(UB.Repository('hr_idParam')
                .correlation('valuesID', 'payElID')
                .where('listParamID.code', '=', typeFOP[k])
                .where('listParamID.tableName', '=', 'hr_payEl')
                .where('orgID', '=', Number(parentOrdID || childOrgIDs[i]))
                .where('mi_deleteDate', '>=', '#maxdate'))
              .groupBy(['employeeNumberID', 'employeeNumberID.orgID'])
              .selectAsObject({
                'sum([paySum])': 'paySum'
              })
            if (accrualOrg && accrualOrg.length) {
              accrualOrg.forEach(accItem => {
                accItem.periodID = period[j].ID
              })
              if (accrualOrg && accrualOrg.length) {
                accrualData.push(...accrualOrg)
              }
            }
          }
        }
      }
      if (accrualData && accrualData.length) {
        accrualDataByType[typeFOP[k]] = accrualData
      }
    }
    return accrualDataByType
  },
  getObj: function (name, npp, roundTo, showCol6, colSpan) {
    return {
      rowName: name,
      rowNum: npp || '',
      value1: npp ? 0 : undefined,
      roundToValue1: roundTo,
      value2: npp ? 0 : undefined,
      roundToValue2: roundTo,
      value3: npp ? 0 : undefined,
      roundToValue3: roundTo,
      value4: npp ? 0 : undefined,
      roundToValue4: roundTo,
      value5: npp ? 0 : undefined,
      roundToValue5: roundTo,
      value6: npp ? 0 : undefined,
      roundToValue6: roundTo,
      showCol6: showCol6,
      colSpan: colSpan
    }
  },
  setValueObj: function (obj, value1, value2, value3, value4, value5, value6) {
    obj.value1 += value1 || 0
    obj.value2 += value2 || 0
    obj.value3 += value3 || 0
    obj.value4 += value4 || 0
    obj.value5 += value5 || 0
    obj.value6 += value6 || 0
  },
  makeRound: function (obj, round = true) {
    if (round) {
      for (let i = 3; i <= 6; i++) {
        if (obj.rowNum >= 3 && obj.rowNum <= 10) {
          obj[`value${i}`] = obj[`value${i}`] ? AC.currencyService.round(obj[`value${i}`] / 1000, 1) : 0
        } else {
          obj[`value${i}`] = obj[`value${i}`] ? AC.currencyService.round(obj[`value${i}`], 0) : 0
        }
      }
    }
    obj['value2'] = obj['value3'] + obj['value4']
    obj['value1'] = obj['value2'] + obj['value5'] + obj['value6']
  },
  makeRounds: function (objs, round = true) {
    objs.forEach(obj => {
      if (obj.rowNum !== 0) {
        if (round) {
          for (let i = 3; i <= 6; i++) {
            if (obj.rowNum >= 3 && obj.rowNum <= 10) {
              obj[`value${i}`] = obj[`value${i}`] ? AC.currencyService.round(obj[`value${i}`] / 1000, 1) : 0
            } else {
              obj[`value${i}`] = obj[`value${i}`] ? AC.currencyService.round(obj[`value${i}`], 0) : 0
            }
          }
        }
        obj['value2'] = obj['value3'] + obj['value4']
        obj['value1'] = obj['value2'] + obj['value5'] + obj['value6']
      }
    })
  },
  getEmployeeDataByPeriod: function (empData, dateFrom, dateTo, employeeNumberInAccrualData = []) {
    dateFrom = AC.dateService.unshiftDate(dateFrom)
    dateTo = AC.dateService.unshiftDate(dateTo)
    if (!empData) return []
    let fltData = empData.filter(el => el.fired || (el.dateFrom <= dateTo && el.dateTo >= dateFrom))
    fltData = fltData.length ? _.groupBy(fltData, 'employeeNumberID') : {}
    const resultData = []
    _.forEach(fltData, items => {
      items = items.sort((a, b) => (a.ID > b.ID) ? -1 : 1) // нужен самый последний срез
      resultData.push(items[0])
    })
    if (employeeNumberInAccrualData.length) { // список ИД которые надо найти призначення. Это могут быть уволенные, но у них есть начисления
      const employeeNumberIDs = resultData.length ? resultData.map(el => el.employeeNumberID) : []
      const fltData = employeeNumberInAccrualData.filter(el => !employeeNumberIDs.includes(el))
      if (fltData.length) {
        _.forEach(fltData, item => {
          let items = empData.filter(el => el.employeeNumberID === item)
          if (items.length) {
            item = items.sort((a, b) => (a.ID > b.ID) ? -1 : 1) // нужен самый последний срез
            resultData.push(items[0])
          }
        })
      }
    }
    return resultData
  },
  getEmployeeIDs: function (empData, posData, dictPosData, dictCostPlaceTypeIDs, category, dateFrom, dateTo) {
    let fltPosData = posData.filter(el => el.mi_dateFrom <= dateTo && el.mi_dateTo >= dateFrom)
    fltPosData = fltPosData.length ? _.groupBy(fltPosData, 'mi_data_id') : {}
    const lastVerionPosData = []
    _.forEach(fltPosData, posItems => {
      posItems = posItems.sort((a, b) => (a.ID > b.ID) ? -1 : 1) // нужен самый последний срез
      if (dictCostPlaceTypeIDs.includes(posItems[0]['dictCostTypeID.dictCostPlaceTypeID']) && (!category.length || (category.length && category.includes(posItems[0].positionCategory)))) {
        lastVerionPosData.push(posItems[0].mi_data_id)
      }
    })

    // const employeeIDs = lastVerionPosData.length ? empData.filter(el => el.dateFrom <= dateTo && el.dateTo >= dateFrom && lastVerionPosData.includes(el.positionID)).map(el => el.employeeNumberID) : []
    const employeeIDs = lastVerionPosData.length ? empData.filter(el => lastVerionPosData.includes(el.positionID)).map(el => el.employeeNumberID) : []
    const fltDictPosData = dictPosData.filter(el => dictCostPlaceTypeIDs.includes(el['dictCostTypeID.dictCostPlaceTypeID']) && category.includes(el.positionCategory)).map(el => el.ID)
    if (fltDictPosData) {
      employeeIDs.push(...empData.filter(el => !el.positionID && fltDictPosData.includes(el.dictPositionID)).map(el => el.employeeNumberID))
    }
    return employeeIDs
  },
  getPeriods: async function (dateFrom, dateTo, orgID) {
    const period = await UB.Repository('hr_dictPeriod')
      .attrs(['ID', 'orgID', 'dateFrom', 'dateTo'])
      .where('orgID', '=', orgID)
      .where('dateTo', '>=', dateFrom)
      .where('dateFrom', '<=', dateTo)
      .orderBy('dateFrom')
      .selectAsObject()
    period.forEach(row => {
      row.dateFrom = AC.dateService.shiftDate(row.dateFrom)
      row.dateTo = AC.dateService.shiftDate(row.dateTo)
    })

    if (!period.length) {
      period.push({ ID: 0, dateFrom: dateFrom, dateTo: dateTo })
    }

    return period
  }
}
