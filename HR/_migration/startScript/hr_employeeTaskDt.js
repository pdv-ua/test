module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'insert into hr_attachEntity(id, entityName, mi_unityEntity, mi_owner, mi_createDate, mi_createUser, mi_modifyDate, mi_modifyUser, mi_deleteDate, mi_deleteUser) select id, \'hr_employeeTaskDt\', \'hr_employeeTaskDt\', mi_owner, mi_createDate, mi_createUser, mi_modifyDate, mi_modifyUser, mi_deleteDate, mi_deleteUser from hr_employeeTaskDt where not exists (select 1 from hr_attachEntity ae where ae.id = hr_employeeTaskDt.id)'
  })
}
