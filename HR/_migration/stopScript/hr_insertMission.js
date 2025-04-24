module.exports.run = (conn, migrationParams) => {
  const sql = `
  insert into hr_employeeMission
      ( ID,
      dateFrom, 
      dateTo,
      organizationID,
      dictTimeCostID,
      periodID,
      departmentID,
      cityID,
      cityName,
      destOrganizationID,
      destOrganizationName,
      dayCount,
      description,
      purpose,
      isInsideCountry,
      countryID,
      isNeedReport,
      employeePositionID,
      employeeNumberID,
      employeeID,
      orderID,
      paraID,
      mi_createUser,
      mi_deleteUser,
      mi_modifyUser,
      mi_owner,
      mi_deleteDate,
      mi_createDate,
      mi_modifyDate
      ) 
  select 
      NEXT VALUE for SEQ_UBMAIN_BY1 AS ID,
      mission.dateFrom, 
      mission.dateTo,
      mission.organizationID,
      mission.dictTimeCostID,
      mission.periodID,
      mission.departmentID,
      mission.cityID,
      mission.cityName,
      mission.destOrganizationID,
      mission.destOrganizationName,
      mission.dayCount,
      mission.description as description,
      mission.purpose,
      mission.isInsideCountry,
      mission.countryID,
      mission.isNeedReport,
      para.employeePositionID,
      para.employeeNumberID,
      para.employeeID,
      para.orderID,
      para.ID paraID,
      para.mi_createUser,
      para.mi_deleteUser,
      para.mi_modifyUser,
      para.mi_owner,
      para.mi_deleteDate,
      getutcdate() mi_createDate,
      getutcdate() mi_modifyDate
    from  hr_empOrderEmployeeDet para
    join hr_empOrderMissionDet mission on para.paraID = mission.ID and mission.mi_deleteDate >= '9999-12-31'
    join hr_empOrder ord on para.orderID = ord.ID and ord.orderState = 'POSTED'
    where not exists(select 1 from hr_employeeMission where paraID = para.ID and mi_deleteDate >= '9999-12-31') 
         and para.mi_deleteDate >= '9999-12-31'
 `
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: sql
  })
}
