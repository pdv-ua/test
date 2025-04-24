module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `insert into hr_employeeContact
(
ID
,employeeID
,contactTypeID
,value
,impContactType
,impSourceID
,impEmployeeID
,mi_owner
,mi_createDate
,mi_createUser
,mi_modifyDate
,mi_modifyUser
,mi_deleteDate
,mi_deleteUser
)
SELECT
Next Value For SEQ_UBMAIN AS ID,
emp.ID AS employeeID,
(select max(ID) from cdn_contactType where code='email' and mi_deleteUser is null) as contactTypeID,
emp.email AS value,
null AS impContactType,
null AS impSourceID,
null AS impEmployeeID,
10 AS MI_OWNER,
dateadd(hh, -2, GetDate()) AS MI_CREATEDATE,
10 AS MI_CREATEUSER,
dateadd(hh, -2, GetDate()) AS MI_MODIFYDATE,
10 AS MI_MODIFYUSER,
'9999-12-31' AS MI_DELETEDATE,
null AS MI_DELETEUSER
from hr_employee emp
where
emp.email is not null`
  })
}
