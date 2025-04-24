module.exports.run = (conn) => {
  const roleID = conn.Repository('uba_role')
    .attrs(['ID'])
    .where('name', '=', 'acc_hospitalEmp')
    .selectScalar()

  if (roleID) {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `DELETE FROM uba_grouprole WHERE roleID=${roleID}`
    })
    conn.run({
      entity: 'uba_role',
      method: 'delete',
      execParams: {
        ID: roleID
      }
    })
  }

  const groupID = conn.Repository('uba_group')
    .attrs(['ID'])
    .where('code', '=', 'group_hospitalEmp')
    .selectScalar()

  if (groupID) {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `DELETE FROM uba_grouprole WHERE groupID=${groupID}`
    })
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `DELETE FROM uba_usergroup WHERE groupID=${groupID}`
    })
    conn.run({
      entity: 'uba_group',
      method: 'delete',
      execParams: {
        ID: groupID
      }
    })
  }
}
