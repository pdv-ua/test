module.exports.run = (conn, migrationParams) => {
  const sqlStaff = `
  WITH tree (id, idxNum, parentID, mi_unityEntity, treePath, mi_treePath)
  AS (
      SELECT id, idxNum, parentUnitID, mi_unityEntity, '/' + RIGHT('000000' + cast(idxNum AS NVARCHAR(max)), 6) + '/' AS treePath, mi_treePath
      FROM hr_staffUnit
      WHERE parentUnitID IS NULL
      UNION ALL
      SELECT t.id, t.idxNum, t.parentUnitID, t.mi_unityEntity, tree.treePath + RIGHT('000000' + cast(t.idxNum AS NVARCHAR(max)), 6) + '/', t.mi_treePath
      FROM hr_staffUnit t
      INNER JOIN tree ON tree.id = t.parentUnitID
  )
  update hr_staffUnit set treePath = (select treePath from tree where tree.id = hr_staffUnit.id)`

  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: sqlStaff
  })

  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'update hr_organization set treePath = (select treePath from hr_staffUnit where hr_organization.id = hr_staffUnit.id)'
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'update hr_department set treePath = (select treePath from hr_staffUnit where hr_department.id = hr_staffUnit.id)'
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'update hr_position set treePath = (select treePath from hr_staffUnit where hr_position.id = hr_staffUnit.id)'
  })
}
