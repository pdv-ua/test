/* global appAC HR AC _ UB $App */
exports.formCode = {
  initComponentStart,
  addBaseActions,
  onFormDataReady,
  initOrderComponentDone,
  getEmployeePositionID,
  beforePosting
}

function initComponentStart () {
  let me = this
  me.orderConfig = {
    detailGrids: ['orderRegistryDt'],
    customAddNewByCurrent: true
  }
  HR.orderManager.init(me)
}
function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['fDelete', 'postingAction', 'cancelPostingAction'],
    state: {
      PROJECT: { action: ['postingAction', 'fDelete'] },
      POSTED: { action: ['cancelPostingAction'] }
    }
  }

  me.callParent(arguments)
  HR.orderManager.addOrderAction(me)
}

function initOrderComponentDone (me) {
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  me.attr.orderRegistryDt.setReadOnly(me.record.get('orderState') === 'POSTED')
  me.attr.orderRegistryDt.down('[actionId=addNewOrder]')[me.record.get('orderState') === 'POSTED' ? 'hide' : 'show']()
  AC.viewUtils.getActionFromContextMenu(me.attr.orderRegistryDt, 'addNewOrder')[me.record.get('orderState') === 'POSTED' ? 'hide' : 'show']()
  if (me.isNewInstance) {
    me.setTitle(`${UB.i18n('Оплата за договором ЦПХ')} ${me.record.get('orderNumber')} (${UB.i18n('Створення')})`)
  } else {
    me.setTitle(`${UB.i18n('Оплата за договором ЦПХ')} ${me.record.get('orderNumber')}`)
  }
  HR.orderManager.setOrderRegistryActions(me)
  AC.viewUtils.setFilterValue(me.attr.periodID, { orgID: appAC.globalOrganization(), isClosed: 0 }, [])
}

function getEmployeePositionID (employeeNumberID, onDate) {
  onDate = onDate || new Date()
  return UB.Repository('hr_employeePositionSR')
    .attrs(['ID', 'organizationID', 'employeeID'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectSingle()
}

function beforePosting () {
  const me = this

  async function checkDogCPH () {
    let data = await UB.Repository('hr_docRegDogCPHPay')
      .attrs(['ID', 'orderNumber', 'orderDate', 'paySum', 'employeeCPHID', 'employeeCPHID.paySum'])
      .where('orderRegistryID', '=', me.record.get('ID'))
      .where('employeeCPHID', 'isNotNull')
      .selectAsObject()

    const otherData = await UB.Repository('hr_docRegDogCPHPay')
      .attrs(['employeeCPHID', 'SUM([paySum])'])
      .where('employeeCPHID', 'in', _.compact(data.map(d => d.employeeCPHID)))
      .where('ID', 'notIn', data.map(d => d.ID))
      .groupBy('employeeCPHID')
      .selectAsObject()

    data = data.map(d => {
      const other = otherData.find(od => od.employeeCPHID === d.employeeCPHID)
      d['SUM([paySum])'] = other ? other['SUM([paySum])'] : 0
      return d
    }).filter(d => d.paySum + d['SUM([paySum])'] > d['employeeCPHID.paySum'])

    let buttonIndex = -1
    let isChange = false
    let i = 0
    while (i < data.length && buttonIndex !== 1 && buttonIndex !== 3 && buttonIndex !== 5) {
      buttonIndex = await $App.showModal({
        formCode: 'hr_orderRegistryDialog',
        description: UB.i18n('Попередження'),
        isClosable: true,
        customParams: {
          message: `За договором № ${data[i].orderNumber} від ${AC.dateService.formatDate(data[i].orderDate)}
            (${AC.currencyService.formatAsCurrency(data[i]['employeeCPHID.paySum'], 2, ',', false)})
            нараховано ${AC.currencyService.formatAsCurrency(data[i]['SUM([paySum])'], 2, ',', false)}! При нарахуванні
            ${AC.currencyService.formatAsCurrency(data[i].paySum)} буде перевищена сума договору! Нараховувати?`,
          buttons: [UB.i18n('Так'), UB.i18n('Так для всіх'), UB.i18n('Ні'), UB.i18n('Ні для всіх'), UB.i18n('Різницю'), UB.i18n('Різницю для всіх')]
        }
      })
      if (buttonIndex === 2 || buttonIndex === 3 || buttonIndex === 4 || buttonIndex === 5) {
        const paySum = buttonIndex === 2 || buttonIndex === 3 ? 0 : data[i]['employeeCPHID.paySum'] - data[i]['SUM([paySum])']
        await $App.connection.run({
          entity: 'hr_docRegDogCPHPay',
          method: 'update',
          __skipOptimisticLock: true,
          execParams: {
            ID: data[i].ID,
            paySum
          }
        })
        AC.viewUtils.showToast(`За договором № ${data[i].orderNumber} від ${AC.dateService.formatDate(data[i].orderDate)}
          нараховано ${AC.currencyService.formatAsCurrency(paySum || 0, 2, ',', false)}`)
        isChange = true
      }
      i++
    }
    while (i < data.length) {
      if (buttonIndex === 3 || buttonIndex === 5) {
        const paySum = buttonIndex === 3 ? 0 : data[i]['employeeCPHID.paySum'] - data[i]['SUM([paySum])']
        await $App.connection.run({
          entity: 'hr_docRegDogCPHPay',
          method: 'update',
          __skipOptimisticLock: true,
          execParams: {
            ID: data[i].ID,
            paySum
          }
        })
        AC.viewUtils.showToast(`За договором № ${data[i].orderNumber} від ${AC.dateService.formatDate(data[i].orderDate)}
          нараховано ${AC.currencyService.formatAsCurrency(paySum || 0, 2, ',', false)}`)
        isChange = true
      }
      i++
    }
    isChange && me.attr.orderRegistryDt.getStore().load()
    return true
  }

  return Promise.resolve(checkDogCPH())
}
