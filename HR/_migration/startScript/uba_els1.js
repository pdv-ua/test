module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `delete from uba_els where code = 'acc_approvSHR_hr_taskMyStaffTableA_select'`
  })
}
