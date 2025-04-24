const dateService = require('../../../AC/modules/dataServices/dateService')
module.exports.run = (conn) => {
  return false
  try {
    if (!conn.Repository('hr_organization').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).selectScalar()) {
      const onDate = dateService.shiftDate('2010-01-01')
      const orderID = conn.insert({
        entity: 'hr_staffOrder',
        fieldList: ['ID'],
        execParams: {
          orderState: 'PROJECT',
          orderDate: onDate,
          entryDate: onDate,
          textOrder: 'Імпорт оргструктури з моделі ORG'
        }
      })
      const hrOrgBuilder = conn.Repository('hr_organization')
        .attrs(['ID', 'name', 'mi_data_id', 'code', 'EDRPOUCode', 'taxCode', 'fullName', 'nameGen', 'nameDat', 'fullNameGen',
          'fullNameDat', 'description', 'parentUnitID', 'mi_dateFrom'])
        .misc({
          __allowSelectSafeDeleted: true,
          __mip_recordhistory_all: true
        })
        .orderBy('mi_treePath')
        .selectAsObject()
      const hrDepBuilder = conn.Repository('hr_department')
        .attrs(['ID', 'name', 'code', 'fullName', 'description', 'nameGen', 'nameDat', 'fullNameGen', 'fullNameDat', 'parentUnitID', 'mi_data_id'])
        .misc({
          __allowSelectSafeDeleted: true,
          __mip_recordhistory_all: true
        })
        .orderBy('mi_treePath')
        .selectAsObject()
      const hrEmpBuilder = conn.Repository('hr_employee')
        .attrs(['ID'])
        .selectAsObject()
      const orgBuilder = conn.Repository('ac_organization')
        .attrs(['ID', 'name', 'taxCode', 'fullName', 'nameGen', 'nameDat', 'fullNameGen', 'fullNameDat', 'description', 'OKPOCode', 'ECBCode'])
        .selectAsObject()
      const depBuilder = conn.Repository('org_department')
        .attrs(['ID', 'parentID', 'name', 'code', 'fullName', 'nameGen', 'nameDat', 'fullNameGen', 'fullNameDat', 'description'])
        .selectAsObject()
      const empBuilder = conn.Repository('org_employee')
        .attrs(['ID', 'code', 'lastName', 'firstName', 'middleName', 'birthDate', 'sexType', 'shortFIO', 'fullFIO', 'organizationID'])
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
            ECBCode: org.ECBCode
          }
          conn.insert({
            entity: 'hr_organization',
            execParams: hrOrg
          })
        }
        const setDep = function (parentID) {
          depBuilder.filter(o => o.parentID === parentID).forEach(dep => {
            let hrDep = hrDepBuilder.find(o => o.ID === dep.ID)
            if (!hrDep) {
              conn.insert({
                entity: 'hr_department',
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
      })
      conn.update({
        entity: 'hr_staffOrder',
        execParams: {
          ID: orderID,
          orderState: 'POSTED',
          entryDate: onDate
        },
        __skipOptimisticLock: true
      })

      const dimension = conn.Repository('gl_dimension')
        .attrs(['*'])
        .where('entityName', '=', 'org_employee')
        .selectSingle()

      const organizationID = orgBuilder.length ? orgBuilder[0].ID : null
      if (organizationID) {
        empBuilder.forEach(emp => {
          const hrEmp = hrEmpBuilder.find(o => o.ID === emp.ID)
          if (!hrEmp) {
            if (dimension && dimension.ID) {
              const dimValue = conn.Repository('gl_dimValue').attrs(['ID']).selectById(emp.ID)
              if (!dimValue) {
                conn.insert({
                  entity: 'gl_dimValue',
                  execParams: {
                    ID: emp.ID,
                    code: emp.code,
                    caption: emp.fullFIO || emp.firstName,
                    dimension: dimension.ID
                  }
                })
              }
            }
            conn.insert({
              entity: 'hr_employee',
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
  } catch (error) {
    console.log(`${error.message}`)
  }
}
