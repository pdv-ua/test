module.exports.run = (conn) => {
    const dictpayEl = conn.Repository('hr_empOrderChgSalEmpDet')
      .attrs(['ID', 'notCancelPrevious'])
      .selectAsObject()
  
    dictpayEl.forEach(item => {
      conn.update({
        entity: 'hr_empOrderChgSalEmpDet',
        __skipOptimisticLock: true,
        execParams: {
          ID: item.ID,
          cancelPrevAccrual: item.notCancelPrevious ? 0 : 1 
        }
      })
    })
}  