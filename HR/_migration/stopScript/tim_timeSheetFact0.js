module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: ` update tim_timeSheet SET factHourNight = 0, factHourEvening = 0, factHourHarmful = 0, factHourDop = 0, factHourPlus = 0
WHERE factHour = 0`
  })
}