module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `insert into ac_address
( ID
,ownerID
,addressType
,postIndex
,countryID
,regionID
,districtID
,cityID
,cityDistrictID
,street
,house
,section
,apartment
,address
,mi_owner
,mi_createDate
,mi_createUser
,mi_modifyDate
,mi_modifyUser
,mi_deleteDate
,mi_deleteUser
,streetType
)
SELECT
Next Value For SEQ_UBMAIN AS ID,
con.employeeID AS ownerID,
(
CASE WHEN contactTypeID=(select ID from cdn_contactType where code ='actualAddr' and mi_deleteDate>='9999-12-31')
then '1'
WHEN contactTypeID=(select ID from cdn_contactType where code ='legalAddr' and mi_deleteDate>='9999-12-31')
then '2'
else '3' END
) AS addressType,
null AS postIndex,
(SELECT MAX(ID) FROM cdn_country where upper(code)='UKR' and mi_deleteDate>='9999-12-31') AS countryID,
null AS regionID, null AS districtID, null AS cityID, null AS cityDistrictID,
null AS street, null AS house, null AS section, null AS apartment,
con.value AS address,
10 AS MI_OWNER, 
dateadd(hh, -2, GetDate()) AS MI_CREATEDATE,
10 AS MI_CREATEUSER,
dateadd(hh, -2, GetDate()) AS MI_MODIFYDATE,
10 AS MI_MODIFYUSER,
'9999-12-31' AS MI_DELETEDATE,
null AS MI_DELETEUSER,
null AS streetType
FROM hr_employeeContact con
where
con.mi_deleteDate>='9999-12-31'
and
contactTypeID in (select ID from cdn_contactType where code in ('legalAddr', 'actualAddr', 'postAddr') and mi_deleteDate>='9999-12-31')`
  })
}
