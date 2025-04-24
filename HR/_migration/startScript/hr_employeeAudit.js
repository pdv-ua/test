
module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'insert into hr_attachEntity(id, entityName, mi_unityEntity, mi_owner, mi_createDate, mi_createUser, mi_modifyDate, mi_modifyUser, mi_deleteDate, mi_deleteUser) select id, \'hr_employeeAudit\', \'hr_employeeAudit\', mi_owner, mi_createDate, mi_createUser, mi_modifyDate, mi_modifyUser, mi_deleteDate, mi_deleteUser from hr_employeeAudit retur'
  })
}
