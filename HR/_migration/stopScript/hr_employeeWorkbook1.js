module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `DECLARE @ORGID BIGINT

;SELECT TOP 1 @ORGID=A01.mi_data_id FROM hr_organization A01 WHERE A01.name='Міністерство фінансів України'
AND A01.state='ACTIVE' AND (GETDATE() BETWEEN A01.mi_dateFrom AND A01.mi_dateTo) AND A01.mi_deleteDate>='9999-12-31';

;WITH WorkBook_CTE (ID, orgFullName, fullFIO, workPosition, posFullName)
AS
(
SELECT ID, orgFullName, fullFIO, workPosition, posFullName
FROM (
SELECT A01.ID, A05.fullName AS orgFullName, A04.fullFIO, A01.workPosition,
((case when A02.positionID IS NOT NULL then (select top 1 pos.fullNameNom from hr_position pos WHERE pos.mi_data_id = A02.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31'
order by pos.mi_dateTo desc) else (select dp.fullName from hr_dictPosition dp where dp.ID = A02.dictPositionID) end) ) AS posFullName
FROM hr_employeeWorkbook A01 LEFT JOIN hr_employeePosition A02 ON A02.ID=A01.employeePositionID
LEFT JOIN hr_order A03 ON A03.ID=A02.orderID
LEFT JOIN hr_employee A04 ON A04.ID=A01.employeeID
LEFT JOIN hr_organization A05 ON A05.mi_data_id=A01.organizationID
WHERE A03.empOrderType IN ('APPOINT','MOVE','APPOINT_LIQ')
AND A01.organizationID=@ORGID
AND A01.mi_createDate BETWEEN '2020-03-01T00:00:00' AND '2020-10-01T00:00:00'
AND A01.mi_deleteDate>='9999-12-31'
AND A05.state = 'ACTIVE'
AND GETDATE() BETWEEN A05.mi_dateFrom AND A05.mi_dateTo
) AS A0
WHERE workPosition <> posFullName
)
MERGE INTO hr_employeeWorkbook
USING (SELECT ID, workPosition, posFullName FROM WorkBook_CTE) wbcte on wbcte.ID = hr_employeeWorkbook.ID
WHEN MATCHED THEN UPDATE SET workPosition = wbcte.posFullName;
  ---------------------------------------------------------------------
  `
  })
}
