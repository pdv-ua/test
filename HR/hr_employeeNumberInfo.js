const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('getData')

/**
 * Отримати дані для закладки "Основні дані" картки працівника
 * @param {object} ctx
 * @param {number} ctx.employeeNumberID ID запису з табельним номером працівника
 * @param {Date} ctx.onDate на дату
 */
me.getData = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  const ds = UB.DataStore(__entityName)
  ds.runSQL(`SELECT emp.fullFIO "fullFIO", en.tabNum "tabNum", emp.taxCode "taxCode", emp.photo, eoi.numberOS "numberOS", 
  emp.phoneMobile "phoneMobile", emp.email, adr.address,
      aep.dateFrom as "appointDate", aep.orderNumber as "appointOrderNumber", aep.orderDate as "appointOrderDate", aep.dateTrialEnd as "appointTrialDate",
      case ${sqlDialect.dialect === 'MSSQL2012' ? 'year(ep.dateTo)' : 'Extract(YEAR from ep.dateTo)'} when 9999 then null else ep.dateTo end as "dismDate",
      do.orderNumber as "dismOrderNumber", do.orderDate as "dismOrderDate", rd.name as "dismReason",
      workerType.name as "workerTypeName", dep.name as "depName", pos.name as "posName", cat.name as "catName", ep.workPlace "workPlace",
      posCat.name as "posCatName", posType.name as "posTypeName", ak.name as "appointType", aep.appointContract "appointContract",
      ep.orderNumber as "posOrderNumber", ep.orderDate as "posOrderDate", ep.dateFrom as "posDateFrom", pe.name as "payElName",
      ep.mtCount "mtCount", ep.accrualSum "accrualSum", vac.dateTo as "vacDateTo", vacKind.name as "vacKindName",
       disab.disabilityGroup "disabilityGroup", distype.name as "disabilityType",
      r.name as "rankName", er.dateFrom as "rankDateFrom", er.orderNumber as "rankOrderNumber", er.orderDate as "rankOrderDate",
      emil.milName "milName", milSuit.name as "milSuitName", assType.name as "accessTypeName", ai.dateFrom as "accessDateFrom",
       eoi.numberIdentCard "numberIdentCard", eoi.numberPermit "numberPermit", docs.description as "passDesc",
      ${sqlDialect.dialect === 'MSSQL2012'
    ? `STUFF((select ', ' + ee.educationName from hr_employeeEducation ee where ee.employeeID = en.employeeID
        and ee.mi_deleteDate >= '9999-12-31' order by ee.dateFrom FOR XML PATH('')), 1, 2, '')`
    : `(SELECT STRING_AGG(ee.educationName, ', ') from hr_employeeEducation ee where ee.employeeID = en.employeeID
        and ee.mi_deleteDate >= '9999-12-31' order by ee.dateFrom)`} as "educationList"
    FROM hr_employeeNumber en
    INNER JOIN hr_employee emp ON emp.ID = en.employeeID
    LEFT JOIN hr_employeeOrgInfo eoi ON eoi.employeeID = en.employeeID
      and eoi.organizationID = en.orgID
      and eoi.mi_deleteDate >= '9999-12-31'
    LEFT JOIN 
      (SELECT ep.ID, ep.employeeNumberID, ep.orderID, ep.dateFrom, ep.dateTo, ep.dictStaffCatID, ep.workPlace,
        ep.workerType, ep.departmentID, ep.positionID, ep.payElID, ep.mtCount, ep.accrualSum, ao.orderNumber, ao.orderDate
      FROM hr_employeePosition ep
      INNER JOIN hr_empOrder ao on ao.ID = ep.orderID
      WHERE ep.employeeNumberID = :employeeNumberID: and ep.isActive = 1
        and :onDate: between ep.dateFrom and ep.dateTo
        and ep.mi_deleteDate >= '9999-12-31'
        and ep.dateFrom = (SELECT MAX(ep2.dateFrom) FROM hr_employeePosition ep2
          WHERE ep2.employeeNumberID = :employeeNumberID: and ep2.isActive = 1
            and :onDate: between ep2.dateFrom and ep2.dateTo
            and ep2.mi_deleteDate >= '9999-12-31')
       ) ep ON ep.employeeNumberID = en.ID
    LEFT JOIN 
      (SELECT ep.ID, ep.employeeNumberID, ep.orderID, ep.dateFrom, ep.dateTo, ao.orderNumber, ao.orderDate, ad.dateTrialEnd,
        ck.name as appointContract, ad.dictAppointKindID
      FROM hr_employeePosition ep
      INNER JOIN hr_employeeNumber enn ON enn.ID = ep.employeeNumberID
      INNER JOIN hr_empOrder ao on ao.ID = ep.orderID
        and ao.empOrderType = 'APPOINT' and ao.orderState != 'PROJECT'  
      INNER JOIN hr_empOrderAppointDet ad on ad.orderID = ao.ID
        and ad.employeeNumberID = :employeeNumberID:
      INNER JOIN hr_dictContractKind ck ON ck.ID = ad.dictContractKindID  
      WHERE ep.employeeNumberID = :employeeNumberID: and ep.isActive = 1
        and ep.dateFrom <= enn.dateTo
        and ep.dateTo >= enn.dateFrom
        and ep.mi_deleteDate >= '9999-12-31'
        and ep.dateFrom = (SELECT MAX(ep2.dateFrom) FROM hr_employeePosition ep2
          INNER JOIN hr_employeeNumber enn2 ON enn2.ID = ep2.employeeNumberID
          INNER JOIN hr_empOrder ao2 on ao2.ID = ep2.orderID
            and ao2.empOrderType = 'APPOINT' and ao2.orderState != 'PROJECT'
          INNER JOIN hr_empOrderAppointDet ad2 on ad2.orderID = ao.ID
            and ad.employeeNumberID = :employeeNumberID:
          WHERE ep2.employeeNumberID = :employeeNumberID: and ep2.isActive = 1
            and ep2.dateFrom <= enn2.dateTo
            and ep2.dateTo >= enn2.dateFrom
            and ep2.mi_deleteDate >= '9999-12-31')
       ) aep ON aep.employeeNumberID = en.ID
    LEFT JOIN hr_dictAppointKind ak ON ak.ID = aep.dictAppointKindID
    LEFT JOIN hr_empOrderDismDet dd
        INNER JOIN hr_order do ON do.ID = dd.orderID
          and do.orderState != 'PROJECT'
      ON dd.employeePositionID = ep.ID
      and dd.empOrderType = 'DISM'
      and dd.mi_deleteDate >= '9999-12-31'
    LEFT JOIN hr_dictReasonDism rd ON rd.ID = dd.dictReasonDismID
    LEFT JOIN ubm_enum workerType ON workerType.code = ep.workerType
      and workerType.eGroup = 'HR_WORKER_TYPE'
      and workerType.mi_deleteDate >= '9999-12-31'
    LEFT JOIN hr_department dep ON dep.mi_data_id = ep.departmentID
      and :onDate: between dep.mi_dateFrom and dep.mi_dateTo
      and dep.state = 'ACTIVE'
      and dep.mi_deleteDate >= '9999-12-31'
    LEFT JOIN hr_position pos ON pos.mi_data_id = ep.positionID
      and :onDate: between pos.mi_dateFrom and pos.mi_dateTo
      and pos.state = 'ACTIVE'
      and pos.mi_deleteDate >= '9999-12-31'
    LEFT JOIN hr_dictStaffCat cat ON cat.ID = pos.dictStaffCatID
    LEFT JOIN ubm_enum posCat ON posCat.code = pos.psCategory
      and posCat.eGroup = 'HR_POSITION_PSCATEGORY'
      and posCat.mi_deleteDate >= '9999-12-31'
    LEFT JOIN hr_dictWagePay posType ON posType.ID = pos.dictWagePayID
    LEFT JOIN hr_payEl pe ON pe.ID = ep.payElID
    LEFT JOIN hr_employeeVacation vac
        INNER JOIN hr_dictVacationKind vacKind ON vacKind.ID = vac.dictVacationKindID
      ON vac.employeePositionID = ep.ID
      and :onDate: between vac.dateFrom and vac.dateTo
      and vac.mi_deleteDate >= '9999-12-31'
    LEFT JOIN hr_employeeDisability disab
        INNER JOIN hr_dictDisabilityType distype ON distype.ID = disab.disabilityID
      ON disab.employeeID = en.employeeID
      and :onDate: between disab.dateFrom and disab.dateTo
      and disab.mi_deleteDate >= '9999-12-31'
    LEFT JOIN hr_publServRang er
        INNER JOIN hr_dictRank r ON r.ID = er.dictRankID
      ON er.employeeID = en.employeeID
      and :onDate: between er.dateFrom and er.dateTo
      and er.mi_deleteDate >= '9999-12-31'
    LEFT JOIN
      (SELECT enn.ID as employeeNumberID, emil.dictMilitarySuitableID, dmil.name as milName
        FROM hr_empStateMilitary emil
        INNER JOIN hr_dictStateMilitary dmil ON dmil.ID = emil.dictStateMilitaryID
        INNER JOIN hr_employeeNumber enn ON enn.ID = :employeeNumberID:
        WHERE emil.employeeID = enn.employeeID
          and Cast(emil.mi_modifyDate as date) <= :onDate:
          and emil.mi_deleteDate >= '9999-12-31'
          and emil.mi_modifyDate = (SELECT MAX(emil2.mi_modifyDate) from hr_empStateMilitary emil2
            INNER JOIN hr_employeeNumber enn2 ON enn2.ID = :employeeNumberID:
            WHERE emil2.employeeID = enn2.employeeID
              and Cast(emil2.mi_modifyDate as date) <= :onDate:
              and emil2.mi_deleteDate >= '9999-12-31')
      ) emil ON emil.employeeNumberID = en.ID
    LEFT JOIN hr_dictMilitarySuitable milSuit ON milSuit.ID = emil.dictMilitarySuitableID
    LEFT JOIN hr_employeeAccessInfo ai
      INNER JOIN ubm_enum assType ON assType.code = ai.assessmentType
        and assType.eGroup = 'HR_ACCESSINFO_FORM'
        and assType.mi_deleteDate >= '9999-12-31'
      ON ai.employeeNumberID = en.ID
      and :onDate: between ai.dateFrom and COALESCE(ai.dateTo, '9999-12-31')
      and ai.mi_deleteDate >= '9999-12-31'
    LEFT JOIN hr_employeeDocs docs
      INNER JOIN hr_employeeNumber den ON den.ID = :employeeNumberID:
      INNER JOIN ubm_enum docState ON docState.code = docs.state
        and docState.eGroup = 'AC_EMPLOYEEDOCS_STATE'
        and docState.mi_deleteDate >= '9999-12-31'
      INNER JOIN ac_dictDocKind docKind ON docKind.ID = docs.dictDocKindID
        and docKind.code = '01'
      ON docs.employeeID = den.employeeID
      and docs.docIssuedDate <= :onDate:
      and (docs.docValidUntil is null or docs.docValidUntil >= :onDate:)
      and docs.mi_deleteDate >= '9999-12-31'
    LEFT JOIN ac_address adr ON adr.ownerID = en.employeeID
      and adr.addressType = '1'
      and adr.mi_deleteDate >= '9999-12-31' 
    WHERE en.ID = :employeeNumberID:
    `, {
    employeeNumberID: mParams.employeeNumberID,
    onDate: dateService.shiftDate(mParams.onDate)
  })
  mParams.resultData = JSON.stringify(JSON.parse(ds.asJSONObject)[0])
  return true
}
