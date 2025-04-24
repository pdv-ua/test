module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE org_unit set mi_deleteUser = 10, mi_deleteDate = subquery.mi_createDate
FROM (SELECT org.ID, org.mi_createDate from hr_organization o 
JOIN ac_organization org ON org.ID = o.ID AND org.mi_deleteUser is null
where o.ID = o.mi_data_id AND (o.state = 'NEW' OR o.mi_deleteUser is not null) 
AND NOT EXISTS (SELECT 1 FROM hr_organization ho WHERE ho.mi_data_id = o.mi_data_id AND ho.mi_deleteUser is null AND ho.state = 'ACTIVE' )
) AS subquery WHERE org_unit.ID = subquery.ID`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE org_organization set mi_deleteUser = 10, mi_deleteDate = subquery.mi_createDate
FROM (SELECT org.ID, org.mi_createDate from hr_organization o 
JOIN ac_organization org ON org.ID = o.ID AND org.mi_deleteUser is null
where o.ID = o.mi_data_id AND (o.state = 'NEW' OR o.mi_deleteUser is not null)
AND NOT EXISTS (SELECT 1 FROM hr_organization ho WHERE ho.mi_data_id = o.mi_data_id AND ho.mi_deleteUser is null AND ho.state = 'ACTIVE' )
) AS subquery WHERE org_organization.ID = subquery.ID`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE ac_organization set mi_deleteUser = 10, mi_deleteDate = subquery.mi_createDate
FROM (SELECT org.ID, org.mi_createDate from hr_organization o 
JOIN ac_organization org ON org.ID = o.ID AND org.mi_deleteUser is null
where o.ID = o.mi_data_id AND (o.state = 'NEW' OR o.mi_deleteUser is not null)
AND NOT EXISTS (SELECT 1 FROM hr_organization ho WHERE ho.mi_data_id = o.mi_data_id AND ho.mi_deleteUser is null AND ho.state = 'ACTIVE')) AS subquery WHERE ac_organization.ID = subquery.ID`
  })
}
