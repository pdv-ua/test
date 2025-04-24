module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: ` UPDATE tim_timeSheet SET planPlanID = planID`
  })
}
