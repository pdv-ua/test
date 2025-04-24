module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE hr_idParam SET valuesID = valuesID * 100
      WHERE ID IN (SELECT p.ID FROM hr_idParam p INNER JOIN hr_listParam lp ON lp.ID=p.listParamID WHERE lp.code IN ('positionReportParam1', 'positionReportParam2'))`
  })
}
