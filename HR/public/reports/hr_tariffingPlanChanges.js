/* global UB AC HR Ext */

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    if (reportParams.instanceID) {
      const staffTariffingOrder = await UB.Repository('hr_staffTariffing')
        .attrs(['entryDate', 'orgID', 'respEmployeeNumID', 'respPositionID', 'respEmployeePositionID',
          'respPosition2ID', 'respEmployeePosition2ID', 'respPosition3ID', 'respEmployeePosition3ID',
          'respPosition4ID', 'respEmployeePosition4ID', 'respPosition5ID', 'respEmployeePosition5ID',
          'departmentID'
        ])
        .selectById(reportParams.instanceID)
      if (staffTariffingOrder) {
        reportParams.onDate = AC.dateService.shiftDate(staffTariffingOrder.entryDate)
        reportParams.orgID = staffTariffingOrder.orgID
        reportParams.childDepID = reportParams.childDepID || staffTariffingOrder.departmentID

        const orgUnit = await UB.Repository('hr_organization')
          .attrs('name', 'nameGen', 'nameDat')
          .where('mi_data_id', '=', staffTariffingOrder.orgID)
          .where('state', '=', 'ACTIVE')
          .orderBy('mi_dateFrom', 'desc')
          .limit(1)
          .selectSingle()
        if (orgUnit) {
          reportParams.orgName = (orgUnit['nameGen'] || '').trim() || orgUnit['name']
          reportParams.orgNameDat = (orgUnit['nameDat'] || '').trim() || orgUnit['name']
        }
        if (staffTariffingOrder.departmentID) {
          const depUnit = await UB.Repository('hr_department')
            .attrs('name')
            .where('mi_data_id', '=', staffTariffingOrder.departmentID)
            .where('state', '=', 'ACTIVE')
            .misc({ __mip_ondate: reportParams.onDate })
            .limit(1)
            .selectSingle()
          reportParams.childDepName = depUnit ? depUnit.name : null
        }
      }
    }
    const plan = await HR.staffTariffing.getReportData(reportParams, 'plan')

    reportParams.onDateReport = AC.dateService.addDays(reportParams.onDate, -1)
    const planPrior = await HR.staffTariffing.getReportData(reportParams, 'plan')

    const result = {
      orgName: plan.orgName || '',
      childDepName: plan.childDepName || '',
      structDepName: plan.structDepName || '',
      progClassName: plan.progClassName || '',
      fundName: plan.fundName || '',
      onDateStr: plan.onDateStr || '',
      title1: 'Призначення',
      title2: 'Звільнення',
      title3: 'Сумісництво',
      title4: 'Припинення сумісництва',
      title5: 'Переведення',
      title6: 'Зміна окладу',
      title7: 'Зміна нарахувань',
      data1: [],
      data2: [],
      data3: [],
      data4: [],
      data5: [],
      data6: [],
      data7: []
    }
    const dataWithAccruals = [1, 3, 5]

    for (let i = 1; i <= 7; i++) {
      result[`npp${i}`] = 1
    }

    const payElIDs = []

    function addToData(obj, number) {
      const objToPush = Object.assign({}, {
        npp: result[`npp${number}`] ++
      }, obj)
      result[`data${number}`].push(objToPush)
      if (dataWithAccruals.includes(number) && obj.permanentAccruals.length) {
        const ids = _.compact(_.uniq(obj.permanentAccruals.map(el => payElIDs.includes(el.payElID) ? null : el.payElID)))
        if (ids) {
          payElIDs.push(...ids)
        }
      }
    }

    plan.data.filter(item => item.empPosID).forEach(item => { // employee
      const obj = {
        empPosID: item.empPosID,
        dateFrom: item.dateFrom ? AC.dateService.formatDate(item.dateFrom) : '',
        basepay: item.basepay || 0,
        departmentName: item.departmentName,
        department: item.department,
        positionName: item.name,
        empName: item.empName,
        tabNum: item.tabNum,
        workPlaceName: item.workPlaceName,
        quantity: item.quantityAdd || item.quantity,
        roundToQuantity: item.roundToQuantityAdd || item.roundToQuantity,
        roundTo: plan.roundTo,
        permanentAccruals: item.permanentAccruals && item.permanentAccruals.length ? item.permanentAccruals.filter(pa => pa.source === "hr_employeeAccrual") : [],
        accruals: ''
      }
      const priorObj = planPrior.data.find(o => o.empPosID === item.empPosID)
      if (priorObj) {
        priorObj.permanentAccruals = priorObj.permanentAccruals && priorObj.permanentAccruals.length ? priorObj.permanentAccruals.filter(pa => pa.source === "hr_employeeAccrual") : []

        priorObj.haveNew = true
        if (priorObj.department !== obj.department) {
          addToData(obj, 5)
        }
        if ((priorObj.basepay || 0) !== obj.basepay) {
          addToData(obj, 6)
        }
        if(obj.permanentAccruals.length || priorObj.permanentAccruals.length) {
          obj.permanentAccruals.forEach(accItem => {
            const priorAcc = priorObj.permanentAccruals.find(o => o.payElID === accItem.payElID)
            if (!priorAcc) {
              obj.payElID = accItem.payElID
              obj.payName = accItem.payEl
              obj.rate = accItem.rate
              obj.paySum = accItem.paySum
              if (!accItem.payEl && !payElIDs.includes(accItem.payElID)) {
                payElIDs.push(accItem.payElID)
              }
              addToData(obj, 7)
            } else {
              priorAcc.haveNew = true
              if (priorAcc.rate !== accItem.rate || priorAcc.paySum !== accItem.paySum) {
                obj.payElID = accItem.payElID
                obj.payName = accItem.payEl
                obj.rate = accItem.rate
                obj.paySum = accItem.paySum
                if (!accItem.payEl && !payElIDs.includes(accItem.payElID)) {
                  payElIDs.push(accItem.payElID)
                }
                addToData(obj, 7)
              }
            }
          })

          priorObj.permanentAccruals.filter(accItem => !accItem.haveNew).forEach(accItem => {
            obj.payElID = accItem.payElID
            obj.payName = accItem.payEl
            obj.rate = 0
            obj.paySum = 0
            if (!accItem.payEl && !payElIDs.includes(accItem.payElID)) {
              payElIDs.push(accItem.payElID)
            }
            addToData(obj, 7)
          })
        }
      } else {
				if (item.workPlace !== '2') {
					addToData(obj, 1)
				} else {
					addToData(obj, 3)
				}
			}
    })

    planPrior.data.filter(item => item.empPosID && !item.haveNew).forEach(item => {
      const obj = {
        empPosID: item.empPosID,
        dateFrom: item.dateFrom ? AC.dateService.formatDate(item.dateFrom) : '',
        basepay: item.basepay || 0,
        departmentName: item.departmentName,
        department: item.department,
        positionName: item.name,
        empName: item.empName,
        tabNum: item.tabNum,
        workPlaceName: item.workPlaceName,
        quantity: item.quantityAdd || item.quantity,
        roundToQuantity: item.roundToQuantityAdd || item.roundToQuantity,
        roundTo: plan.roundTo,
        permanentAccruals: item.permanentAccruals,
        accruals: ''
      }

			const newItem = plan.data.find(o => o.employeeNumberID === item.employeeNumberID &&  o.empPosID !== item.empPosID && o.dateFrom >= reportParams.onDateReport)
			if (!newItem) { //  не створене нове призначення для цього табельного номера працівника
				if (item.workPlace !== '2') {
					addToData(obj, 2)
				} else {
					addToData(obj, 4)
				}
			}
    })

    for (let i = 1; i <= 7; i++) {
      if (!result[`data${i}`].length) {
        result[`title${i}`] = ''
      }
    }

    if (payElIDs.length) {
      const payEl = await UB.Repository('hr_payEl')
        .attrs('ID', 'shortPrintName', 'name', 'description')
        .where('ID', 'in', payElIDs)
        .selectAsObject()

      dataWithAccruals.forEach(number => {
        result[`data${number}`].forEach(item => {
          item.accruals = item.permanentAccruals.length ? item.permanentAccruals.map(o => {
            const payElItem = payEl.find(p => p.ID === o.payElID)
            return `${payElItem ? payElItem.shortPrintName || payElItem.name || '': ''}`
          }).join('; ') : ''
        })
      })

      result.data7.filter(item => !item.payName).forEach(item => {
        const payElItem = payEl.find(p => p.ID === item.payElID)
        if (payElItem) {
          item.payName = payElItem.description || payElItem.name || ''
        }
      })
    }

//      [{"payElID":3000002170856,"baseSum":122,"rate":2,"payEl":"115 Надбавка за інтенсивність праці","paySum":122}]

    return result
  }
}
