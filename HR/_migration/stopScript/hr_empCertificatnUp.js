module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `merge into hr_empCertificatnUp
            using (
                select distinct
                  organizationID,
                  employeeID 
                from hr_employeeWorkbook wb 
                where organizationID is not null
                and wb.dateFrom = (select max(dateFrom) from hr_employeeWorkbook where employeeID = wb.employeeID and dateFrom is not null and organizationID is not null)
            ) a on hr_empCertificatnUp.employeeID = a.employeeID
            when matched and hr_empCertificatnUp.organizationID is null then update set organizationID = a.organizationID
            ;
            ---------------------------------------------------------------------
            update hr_empCertificatnUp set organizationID = impSourceID where organizationID is null and impSourceID is not null
            `
  })
}
