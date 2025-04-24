module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: ` update tim_timeSheet SET mi_deleteUser = null, mi_deleteDate = '9999-12-31'
   WHERE ID in (select t.ID from tim_timeSheet t 
    JOIN hr_employeeNumber n ON n.ID = t.employeeNumberID AND t.dateWork < n.dateFrom
    where t.isSchedule = 0 AND t.isActive = 1 AND t.mi_deleteUser is not null AND t.factTimeCostID in (SELECT ID from hr_dictTimeCost where code = 'Ні') AND
    not EXISTS (SELECT ID FROM tim_timeSheet t1 WHERE t.employeeNumberID = t1.employeeNumberID AND t.dateWork = t1.dateWork AND t1.isActive = 1 AND t1.mi_deleteUser is NULL))`
  })
}
