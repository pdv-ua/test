const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const calcService = require('../HR/modules/calcService')
const timeSheetService = require('../TIM/modules/timeSheetService')

me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.on('select:after', afterSelect)
me.on('delete:before', beforeDelete)

me.entity.addMethod('addWorkScheduleCopy')

me.details = [
  {
    detailName: 'workScheduleDay',
    entityName: 'hr_workScheduleDays',
    docIDName: 'workScheduleID',
    fieldList: orderService.setFieldListAttribute([
      'numDay', 'dictTimeCostID.nameSmall', 'hoursWork', 'hoursWorkNight', 'hoursWorkEvening', 'timeFrom', 'timeTo', 'recreationFrom', 'recreationTo',
      'hoursWorkHarm', 'hoursWorkDop'
    ], ['lineNum']),
    orderBy: 'numDay'
  }
]

me.addWorkScheduleCopy = function ({ mParams }) {
  const execParams = mParams.params
  const orgID = execParams.orgID
  let workSchedule = UB.Repository('hr_workSchedule')
    .attrs(['*'])
    .selectById(execParams.workScheduleID)

  let workScheduleDays = UB.Repository('hr_workScheduleDays')
    .attrs(['*'])
    .where('workScheduleID', '=', execParams.workScheduleID)
    .selectAsObject()
  let store = UB.DataStore('hr_workSchedule')

  const removeAttrList = ['ID', 'mi_owner', 'mi_createDate', 'mi_createUser', 'mi_deleteDate', 'mi_deleteUser', 'mi_modifyDate', 'mi_modifyUser', 'parentsWorkScheduleID']
  removeAttrList.forEach(attr => delete workSchedule[attr])

  if (execParams.isAddCopy && workSchedule) {
    const newWorkScheduleID = store.generateID()
    workSchedule.ID = newWorkScheduleID
    workSchedule.name = workSchedule.name + ' (копія)'
    workSchedule.parentsWorkScheduleID = execParams.workScheduleID

    workScheduleDays = workScheduleDays.map(dayData => {
      dayData.workScheduleID = newWorkScheduleID
      removeAttrList.forEach(attr => delete dayData[attr])
      return dayData
    })

    insertWorkSchedule(workSchedule, workScheduleDays, orgID)
  } else if (execParams.isAddChanges && execParams.changesCount && workSchedule) {
    const workScheduleName = workSchedule.name
    for (let idx = 1; idx <= execParams.changesCount; idx++) {
      let newWorkScheduleID = store.generateID()
      workSchedule.ID = newWorkScheduleID
      workSchedule.name = `Фаза ${idx} ${workScheduleName}`
      workSchedule.parentsWorkScheduleID = execParams.workScheduleID
      let nextWorkScheduleDays = []
      let lastDay = workScheduleDays.length
      workScheduleDays.sort((a, b) => a.numDay > b ? 1 : -1).forEach(dayData => {
        dayData.workScheduleID = newWorkScheduleID
        removeAttrList.forEach(attr => delete dayData[attr])

        dayData.numDay = dayData.numDay === lastDay ? 1 : dayData.numDay + 1

        nextWorkScheduleDays.push(dayData)
      })
      workScheduleDays = nextWorkScheduleDays

      insertWorkSchedule(workSchedule, workScheduleDays, orgID)
    }
  }
}

function insertWorkSchedule (workSchedule, workScheduleDays, orgID) {
  let store = UB.DataStore('hr_workSchedule')
  store.run('insert', {
    execParams: workSchedule
  })

  store = UB.DataStore('hr_workScheduleDays')
  workScheduleDays.forEach(dayData => {
    store.run('insert', {
      execParams: dayData
    })
  })
  if (workScheduleDays && workScheduleDays.length) {
    let currYear = dateService.currentDate().getFullYear()
    timeSheetService.calcPlan({
      workScheduleID: workSchedule.ID,
      organizationID: orgID,
      calcDateFrom: dateService.getYearBegin(currYear),
      calcDateTo: dateService.getYearEnd(currYear),
      ignoreCorrection: false
    })
  }
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  orderService.saveDetails(ctx, me.details)
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
  calcService.addCalcPlanQueue({ workScheduleID: execParams.ID, entityName: 'hr_workSchedule' })
}

function beforeUpdate (ctx) {
  orderService.saveDetails(ctx, me.details)
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
  calcService.addCalcPlanQueue({ workScheduleID: execParams.ID, entityName: 'hr_workSchedule' })
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    ctx.mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}

function beforeDelete (ctx) {
  if (UB.Repository('hr_employeePositionS')
    .attrs(['ID'])
    .where('workScheduleID', '=', ctx.mParams.execParams.ID)
    .selectSingle()) {
    throw new UB.UBAbort(`<<<${UB.i18n('Графік роботи не може бути видалений, так як використовується в призначеннях працівників.')}>>>`)
  }
}
