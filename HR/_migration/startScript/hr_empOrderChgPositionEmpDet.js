module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `INSERT INTO hr_empOrderDet (ID, paraID, orderID, employeePositionID, employeeNumberID, employeeID,firstName, lastName, middleName, description, empOrderType, mi_unityEntity, mi_owner,mi_createUser, mi_modifyUser, mi_deleteUser)
      SELECT A01.ID, A01.paraID, A01.orderID, A01.employeePositionID, A01.employeeNumberID, A01.employeeID,
        A02.firstName, A02.lastName, A02.middleName, A01.description, 'CHGPOSITION', 'hr_empOrderChgPositionEmpDet', A01.mi_owner, A01.mi_createUser, A01.mi_modifyUser, A01.mi_deleteUser
      FROM hr_empOrderChgPositionEmpDet A01 INNER JOIN hr_employee A02 ON A01.employeeID=A02.ID
      WHERE NOT EXISTS(SELECT * FROM hr_empOrderDet d WHERE d.ID=A01.ID)`
  })
}
