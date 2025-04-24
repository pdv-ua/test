module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `alter table hr_dictSalarySchemeDet add coefMin NUMERIC(19, 6) null;`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `alter table hr_dictSalarySchemeDet add coefMax NUMERIC(19, 6) null;`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE hr_dictSalarySchemeDet SET coefMin = lev.coefmin, coefmax = lev.coefmax FROM hr_dictSalarySchemeLevel lev
      WHERE lev.ID=hr_dictSalarySchemeDet.dictSalarySchemeLevelID`
  })
}
