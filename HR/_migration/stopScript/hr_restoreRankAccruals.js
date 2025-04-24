module.exports.run = (conn) => {
  const accruals = conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: ` SELECT ha.ID
  FROM hr_employeeAccrual ha
  INNER JOIN hr_payEl pe ON ha.payElID=pe.ID
  INNER JOIN hr_method hm ON hm.ID = pe.methodID
  LEFT JOIN hr_empOrder o ON o.ID = ha.changeOrderID
  INNER JOIN hr_employeeNumber en ON en.ID = ha.employeeNumberID
  WHERE ha.employeeNumberID IN (
    SELECT DISTINCT hp.employeeNumberID FROM hr_employeePosition hp
      WHERE GETDATE() BETWEEN hp.dateFrom AND hp.dateTo and hp.isActive = 1 
      AND hp.mi_deleteDate >='9999-12-31'
      AND (select top 1 pos.positionType from hr_position pos where pos.mi_data_id = hp.positionID and pos.state = 'ACTIVE' and  pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo DESC) = '1'
      AND EXISTS(SELECT 1 FROM hr_publServRang sr WHERE sr.employeeID=hp.employeeID AND sr.mi_deleteDate>='9999-12-31' AND sr.dateTo >= '9999-12-31')
  )
  AND ha.dateTo < '9999-12-31'
  AND ha.dateTo = (SELECT MAX(dateTo) FROM hr_employeeAccrual acc WHERE acc.employeeNumberID=ha.employeeNumberID AND acc.payElID=ha.payElID AND acc.mi_deleteDate >='9999-12-31')
  AND hm.code='5'  
  AND o.empOrderType = 'RANK'
  AND ha.mi_deleteDate >='9999-12-31'`
  })
  accruals.forEach(acc => {
    conn.run({
      entity: 'hr_employeeAccrual',
      method: 'update',
      __skipOptimisticLock: true,
      execParams: {
        ID: acc.ID,
        dateTo: '9999-12-31',
        changeOrderID: null
      }
    })
  })
}
