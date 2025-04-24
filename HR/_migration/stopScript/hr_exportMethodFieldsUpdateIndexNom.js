module.exports.run = (conn) => {
    const export_methods = conn.Repository('hr_exportMethod')
      .attrs(['ID'])
      .selectAsObject()
      
    export_methods.forEach(m => {
        const export_method_fields = conn.Repository('hr_exportMethodFields')
        .attrs(['ID'])
        .where('exportMethodID', '=', m.ID)
        .orderBy('ID')
        .selectAsObject()
        
        let indexNom = 1
        
        export_method_fields.forEach(mf => {
            conn.update({
                entity: 'hr_exportMethodFields',
                __skipOptimisticLock: true,
                execParams: {
                  ID: mf.ID,
                  indexNom: indexNom++
                }
              })
        })
    })
  }