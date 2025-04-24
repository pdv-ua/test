module.exports.run = (conn) => {
  /* conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE trf_workPlace SET employeeID = subquery.employeeID
     FROM ( SELECT wp.ID, n.employeeID FROM trf_workPlace wp
         JOIN hr_employeeNumber n ON n.ID = wp.employeeNumberID ) AS subquery
     WHERE trf_workPlace.ID = subquery.ID`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE trf_position SET employeeID = subquery.employeeID, employeeNumberID = subquery.employeeNumberID
      FROM ( SELECT p.ID, wp.employeeID, wp.employeeNumberID FROM trf_position p
      JOIN trf_workPlace wp ON wp.ID = p.workPlaceID) AS subquery
      WHERE trf_position.ID = subquery.ID`
  }) */
}
