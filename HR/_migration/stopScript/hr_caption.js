module.exports.run = (conn) => {
  let dict = conn.Repository('hr_dictStaffCat')
    .attrs(['ID', 'name', 'code'])
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject()

  dict.forEach(row => {
    try {
      conn.xhr({
        endpoint: 'runSQL',
        URLParams: { CONNECTION: 'main' },
        data: `update hr_dictStaffCat set caption = '${(row.name || '').replace(/'/g, `''`)} [${(row.code || '').replace(/'/g, `''`)}]' where ID = ${row.ID}`
      })
    } catch (e) {}
  })
  dict = conn.Repository('hr_dictCategoryECB')
    .attrs(['ID', 'name', 'code'])
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject()

  dict.forEach(row => {
    try {
      conn.xhr({
        endpoint: 'runSQL',
        URLParams: { CONNECTION: 'main' },
        data: `update hr_dictCategoryECB set caption = '${(row.name || '').replace(/'/g, `''`)} [${(row.code || '').replace(/'/g, `''`)}]' where ID = ${row.ID}`
      })
    } catch (e) {}
  })
  dict = conn.Repository('hr_dictPosition')
    .attrs(['ID', 'name', 'code'])
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject()

  dict.forEach(row => {
    try {
      conn.xhr({
        endpoint: 'runSQL',
        URLParams: { CONNECTION: 'main' },
        data: `update hr_dictPosition set caption = '${(row.name || '').replace(/'/g, `''`)} [${(row.code || '').replace(/'/g, `''`)}]' where ID = ${row.ID}`
      })
    } catch (e) {}
  })
  dict = conn.Repository('hr_workSchedule')
    .attrs(['ID', 'name', 'code'])
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject()

  dict.forEach(row => {
    try {
      conn.xhr({
        endpoint: 'runSQL',
        URLParams: { CONNECTION: 'main' },
        data: `update hr_workSchedule set caption = '${(row.name || '').replace(/'/g, `''`)} [${(row.code || '').replace(/'/g, `''`)}]' where ID = ${row.ID}`
      })
    } catch (e) {}
  })
  dict = conn.Repository('hr_position')
    .attrs(['ID', 'name', 'code'])
    .misc({ __allowSelectSafeDeleted: true })
    .misc({ __mip_recordhistory_all: true })
    .selectAsObject()

  dict.forEach(row => {
    try {
      conn.xhr({
        endpoint: 'runSQL',
        URLParams: { CONNECTION: 'main' },
        data: `update hr_position set caption = '${(row.name || '').replace(/'/g, `''`)} [${(row.code || '').replace(/'/g, `''`)}]' where ID = ${row.ID}`
      })
    } catch (e) {}
  })
  dict = conn.Repository('hr_department')
    .attrs(['ID', 'name', 'code'])
    .misc({ __allowSelectSafeDeleted: true })
    .misc({ __mip_recordhistory_all: true })
    .selectAsObject()

  dict.forEach(row => {
    try {
      conn.xhr({
        endpoint: 'runSQL',
        URLParams: { CONNECTION: 'main' },
        data: `update hr_department set caption = '${(row.name || '').replace(/'/g, `''`)} [${(row.code || '').replace(/'/g, `''`)}]' where ID = ${row.ID}`
      })
    } catch (e) {}
  })
  dict = conn.Repository('hr_dictReasonDism')
    .attrs(['ID', 'name', 'code'])
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject()

  dict.forEach(row => {
    try {
      conn.xhr({
        endpoint: 'runSQL',
        URLParams: { CONNECTION: 'main' },
        data: `update hr_dictReasonDism set caption = '${(row.name || '').replace(/'/g, `''`)} [${(row.code || '').replace(/'/g, `''`)}]' where ID = ${row.ID}`
      })
    } catch (e) {}
  })
}
