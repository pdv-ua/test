const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const dateService = require('../AC/modules/dataServices/dateService')
const periodService = require('../HR/modules/periodService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.on('delete:before', orderService.beforeDeleteOrder)
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

me.entity.addMethod('syncHRtoOrg')
me.entity.addMethod('syncOrgToHR')
me.entity.addMethod('setActivPeriod')

function beforeInsert (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  orderService.setDefaultAttribute(me.entity.name, execParams, instanceData)
  execParams.description = UB.i18n(`Наказ ШР {0}`, entityBaseService.getCompositeAttributeValue(ctx, 'description'))
}

function beforeUpdate (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  orderService.setDefaultAttribute(me.entity.name, execParams, instanceData)
  orderService.checkOrderUpdate(ctx)
  execParams.description = UB.i18n(`Наказ ШР {0}`, entityBaseService.getCompositeAttributeValue(ctx, 'description'))
  if (execParams.notes) {
    if (instanceData.notes === 'IMPORT') {
      execParams.notes = instanceData.notes
    }
  }
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.orderState) {
    if (execParams.orderState === 'POSTED') {
      me.doPosting(ctx)
    }
    if (execParams.orderState === 'PROJECT') {
      me.doCancelPosting(ctx)
    }
  }
}

me.doPosting = function (ctx) {
  orderService.doPostingStaffOrder(ctx)
}

me.doCancelPosting = function (ctx) {
  orderService.doCancelPostingStaffOrder(ctx)
}

me.syncHRtoOrg = (ctx) => {
  const orgBuilder = UB.Repository('hr_organization')
    .attrs(['ID', 'name', 'priorID', 'mi_dateTo', 'mi_data_id', 'code', 'EDRPOUCode', 'taxCode', 'fullName', 'nameGen', 'nameDat', 'fullNameGen',
      'fullNameDat', 'description', 'parentUnitID', 'liquidate', 'hkved', 'ECBCode', 'hkvedS', 'hkoatuu', 'hkoatuuS',
      'hkopfg', 'hkopfgS', 'hkou', 'hkouS', 'dgoznNpr', 'kpol', 'riv', 'decisionDate', 'decisionNumber',
      'dictDksuID', 'dictSprStiID', 'classRisk', 'hkatottg', 'orgID', 'state', 'showGlobal'])
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: new Date() })
    .orderBy('mi_treePath')
    .selectAsObject()
  const depBuilder = UB.Repository('hr_department')
    .attrs(['ID', 'name', 'priorID', 'priorID.nextID', 'priorID.nextID.entryOrderID.description', 'priorID.mi_dateFrom',
      'mi_dateTo', 'code', 'fullName', 'description', 'nameGen', 'nameDat', 'fullNameGen', 'fullNameDat',
      'parentUnitID', 'mi_data_id', 'liquidate', 'orgID', 'state'])
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: new Date() })
    .orderBy('mi_treePath')
    .selectAsObject()

  const posBuilder = UB.Repository('hr_dictPosition')
    .attrs(['*'])
    .selectAsObject()
  /* const posBuilder = UB.Repository('hr_position')
    .attrs(['ID', 'name', 'mi_data_id', 'parentUnitID'])
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: new Date() })
    .selectAsObject() */

  const empBuilder = UB.Repository('hr_employee')
    .attrs(['*'])
    .selectAsObject()

  orgBuilder.forEach(row => {
    orderService.updateOrganization(row)
  })
  depBuilder.forEach(row => {
    orderService.updateDepartment(row)
  })
  posBuilder.forEach(row => {
    orderService.updateProfession(row)
  })
  /* posBuilder.forEach(row => {
    orderService.updatePosition(row)
  }) */

  empBuilder.forEach(row => {
    orderService.updateEmployee(row)
  })
}

// $App.connection.run({"entity":"hr_staffOrder", "method":"setActivPeriod", "orgID": 3000000123212})
me.setActivPeriod = (ctx) => {
  periodService.createPeriod({
    orgID: ctx.mParams.orgID,
    onDate: dateService.currentDate(),
    setCurrent: true
  })
}
//
me.syncOrgToHR = (ctx) => {
  const withoutDep = !!ctx.mParams.withoutDep
  const orgStore = UB.DataStore('hr_organization')
  const depStore = UB.DataStore('hr_department')
  const empStore = UB.DataStore('hr_employee')
  const dimValueStore = UB.DataStore('gl_dimValue')
  const staffOrder = UB.DataStore('hr_staffOrder')
  const orderID = staffOrder.generateID()
  const onDate = dateService.shiftDate('2010-01-01')
  staffOrder.run('insert', {
    __skipOptimisticLock: true,
    execParams: {
      ID: orderID,
      orderState: 'PROJECT',
      orderDate: onDate,
      entryDate: onDate,
      textOrder: 'Імпорт оргструктури з моделі ORG'
    }
  })
  const hrOrgBuilder = UB.Repository('hr_organization')
    .attrs(['ID', 'name', 'mi_data_id', 'code', 'EDRPOUCode', 'taxCode', 'fullName', 'nameGen', 'nameDat', 'fullNameGen',
      'fullNameDat', 'description', 'parentUnitID', 'mi_dateFrom', 'showGlobal'])
    .misc({ __allowSelectSafeDeleted: true,
      __mip_recordhistory_all: true })
    .orderBy('mi_treePath')
    .selectAsObject()
  const hrDepBuilder = UB.Repository('hr_department')
    .attrs(['ID', 'name', 'code', 'fullName', 'description', 'nameGen', 'nameDat', 'fullNameGen', 'fullNameDat', 'parentUnitID', 'mi_data_id'])
    .misc({ __allowSelectSafeDeleted: true,
      __mip_recordhistory_all: true })
    .orderBy('mi_treePath')
    .selectAsObject()
  const hrEmpBuilder = UB.Repository('hr_employee')
    .attrs(['ID'])
    .selectAsObject()
  const orgBuilder = UB.Repository('ac_organization')
    .attrs(['ID', 'name', 'taxCode', 'fullName', 'nameGen', 'nameDat', 'fullNameGen', 'fullNameDat', 'description', 'OKPOCode', 'ECBCode'])
    .selectAsObject()
  const depBuilder = UB.Repository('org_department')
    .attrs(['ID', 'parentID', 'name', 'code', 'fullName', 'nameGen', 'nameDat', 'fullNameGen', 'fullNameDat', 'description'])
    .selectAsObject()
  const empBuilder = UB.Repository('org_employee')
    .attrs(['ID', 'code', 'lastName', 'firstName', 'middleName', 'birthDate', 'sexType', 'shortFIO', 'fullFIO'])
    .selectAsObject()
  orgBuilder.forEach(org => {
    let hrOrg = hrOrgBuilder.find(o => o.ID === org.ID)
    if (!hrOrg) {
      hrOrg = {
        ID: org.ID,
        orgID: org.ID,
        mi_data_id: org.ID,
        staffOrderID: orderID,
        mi_dateFrom: onDate,
        doNotTransfer: 0,
        state: 'NEW',
        name: org.name,
        code: org.taxCode || '1',
        taxCode: org.taxCode,
        fullName: org.fullName,
        nameGen: org.nameGen,
        nameDat: org.nameDat,
        fullNameGen: org.fullNameGen,
        fullNameDat: org.fullNameDat,
        description: org.description,
        EDRPOUCode: org.OKPOCode,
        ECBCode: org.ECBCode,
        showGlobal: org.showGlobal
      }
      orgStore.run('insert', {
        isImportOperation: true,
        execParams: hrOrg
      })
    }
    if (!withoutDep) {
      const setDep = function (parentID) {
        depBuilder.filter(o => o.parentID === parentID).forEach(dep => {
          let hrDep = hrDepBuilder.find(o => o.ID === dep.ID)
          if (!hrDep) {
            depStore.run('insert', {
              isImportOperation: true,
              execParams: {
                ID: dep.ID,
                mi_data_id: dep.ID,
                staffOrderID: orderID,
                mi_dateFrom: hrOrg.mi_dateFrom,
                parentUnitID: parentID,
                orgID: hrOrg.ID,
                state: 'NEW',
                name: dep.name,
                code: dep.code,
                fullName: dep.fullName,
                nameGen: dep.nameGen,
                nameDat: dep.nameDat,
                fullNameGen: dep.fullNameGen,
                fullNameDat: dep.fullNameDat,
                description: dep.description
              }
            })
          }
          setDep(dep.ID)
        })
      }
      setDep(org.ID)
    }
  })
  staffOrder.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: orderID,
      orderState: 'POSTED',
      entryDate: onDate
    }
  })

  const dimension = UB.Repository('gl_dimension')
    .attrs(['*'])
    .where('entityName', '=', 'org_employee')
    .selectSingle()

  const organizationID = orgBuilder.length ? orgBuilder[0].ID : null
  if (organizationID) {
    empBuilder.forEach(emp => {
      const hrEmp = hrEmpBuilder.find(o => o.ID === emp.ID)
      if (!hrEmp) {
        if (dimension && dimension.ID) {
          const dimValue = UB.Repository('gl_dimValue').attrs(['ID']).selectById(emp.ID)
          if (!dimValue) {
            dimValueStore.run('insert', {
              execParams: {
                ID: emp.ID,
                code: emp.code,
                caption: emp.fullFIO || emp.firstName,
                dimension: dimension.ID
              }
            })
          }
        }
        empStore.run('insert', {
          byAC: true,
          execParams: {
            ID: emp.ID,
            organizationID: organizationID,
            taxCode: emp.code,
            lastName: emp.lastName,
            firstName: emp.firstName,
            middleName: emp.middleName,
            birthDate: emp.birthDate,
            sexType: (!emp.sexType || emp.sexType === '?') ? 'N' : (emp.sexType === 'F' ? 'W' : 'M'),
            shortFIO: emp.shortFIO || emp.firstName,
            fullFIO: emp.fullFIO || emp.firstName
          }
        })
      }
    })
  }
}
