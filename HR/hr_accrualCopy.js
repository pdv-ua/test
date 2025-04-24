const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const periodService = require('../HR/modules/periodService')
const accrualService = require('../HR/modules/accrualService')

me.entity.addMethod('createCopy')
me.entity.addMethod('getCopyList')
me.entity.addMethod('getProtocol')

me.createCopy = function (ctx) {
  const params = ctx.mParams
  let orgIDs = []
  const mainPeriod = params.periodID ? periodService.getPeriod(params.periodID) : periodService.getCurrentPeriod(params.orgID)
  const copyDate = new Date()
  const store = UB.DataStore('hr_accrualCopy')
  const accrualAvgStore = UB.DataStore('hr_accrualAvgCopy')
  const errorMessages = []
  if (params.childOrg) {
    const orgs = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.orgID}/%`)
      .groupBy('mi_data_id')
      .selectAsObject()
    if (orgs.length) {
      orgIDs = orgs.map(o => o.mi_data_id)
    }
  } else {
    orgIDs = [params.orgID]
  }
  orgIDs.forEach(orgID => {
    const period = params.periodID ? periodService.getPeriodOnDate(orgID, mainPeriod.dateFrom) : periodService.getCurrentPeriod(orgID)
    if (period) {
      let percent = 100
      if (period.isCurrent) {
        const employeeNumbers = UB.Repository('hr_employeeNumberS')
          .attrs(['ID'])
          .where('orgID', '=', period.orgID)
          .where('dateFrom', '<=', period.dateTo)
          .where('dateTo', '>=', period.dateFrom)
          .selectAsObject().map(o => o.ID)
        const recalcEmployeeNumbers = UB.Repository('hr_employeeNumState')
          .attrs(['employeeNumberID'])
          .where('flags', '=', 0)
          .where('employeeNumberID', 'in', employeeNumbers)
          .selectAsObject()
        percent = accrualService.round(Math.max((100 / (employeeNumbers.length || 1) * ((employeeNumbers.length || 0) - recalcEmployeeNumbers.length)), 0), 0)
      }
      if (percent < 100) {
        const org = UB.Repository('ac_organization').attrs(['name']).selectById(orgID) || {}
        errorMessages.push(`${org.name} за ${period.name}: Стан розрахунку ${percent}% `)
      }

      store.execSQL(`DELETE FROM hr_taxIndividAccCopy WHERE accrualID in (SELECT ID FROM hr_accrualCopy WHERE periodCalcID = :periodID: and orgID = :orgID:);`, { orgID, periodID: period.ID })
      store.execSQL(`DELETE FROM hr_accrualAvgCopy WHERE accrualID in (SELECT ID FROM hr_accrualCopy WHERE periodCalcID = :periodID: and orgID = :orgID:);`, { orgID, periodID: period.ID })
      store.execSQL(`DELETE FROM hr_accrualDtCopy WHERE accrualID in (SELECT ID FROM hr_accrualCopy WHERE periodCalcID = :periodID: and orgID = :orgID:);`, { orgID, periodID: period.ID })
      store.execSQL(`DELETE FROM hr_accrualCopy WHERE periodCalcID = :periodID: and orgID = :orgID:;`, { orgID, periodID: period.ID })
      store.execSQL(`DELETE FROM hr_accrualFundDtCopy WHERE accrualFundID in (SELECT ID FROM hr_accrualFundCopy WHERE periodCalcID = :periodID: and orgID = :orgID:);`, { orgID, periodID: period.ID })
      store.execSQL(`DELETE FROM hr_accrualFundCopy WHERE periodCalcID = :periodID: and orgID = :orgID:;`, { orgID, periodID: period.ID })
      const accrualIDs = []
      const accrualIDMap = {}
      const accruals = UB.Repository('hr_accrual')
        .attrs(['*'])
        .where('orgID', '=', orgID)
        .where('periodCalcID', '=', period.ID)
        .selectAsObject()
      accruals.forEach(row => {
        accrualIDs.push(row.ID)
        accrualIDMap[row.ID] = accrualService.getID('S_HR_ACCRUALCOPY')
        row.ID = accrualIDMap[row.ID]
        row.hoursByDays = row.hoursByDays ? (typeof row.hoursByDays === 'object' ? JSON.stringify(row.hoursByDays) : row.hoursByDays) : null
        row.planHoursByDays = row.planHoursByDays ? (typeof row.planHoursByDays === 'object' ? JSON.stringify(row.planHoursByDays) : row.planHoursByDays) : null
        row.leadingHoursByDays = row.leadingHoursByDays ? (typeof row.leadingHoursByDays === 'object' ? JSON.stringify(row.leadingHoursByDays) : row.leadingHoursByDays) : null
        row.calcParams = row.calcParams ? (typeof row.calcParams === 'object' ? JSON.stringify(row.calcParams) : row.calcParams) : null
        row.copyDate = copyDate
      })
      if (accruals.length) {
        if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
          store.execSQL(
            `INSERT INTO hr_accrualCopy(ID, orgID, periodCalcID, periodSalaryID, periodCalc, periodSalary, employeeNumberID,
        employeeNumberPartID, payElID, orderID, empOrderID, timeSheetID, orderDtID, flagsRec, flagsFix, planHours, planDays,
        baseSum, rate, days, hours, mask, maskAdd, mtCount, paySum, minSalarySum, dateFrom, dateTo, orderDateFrom,
        orderDateTo, avgCalcType, dateFromAvg, dateToAvg, sumAvg, planSumAvg, avgDays, koef, calculateDate, createUserID, linkToParentID,
        linkToChildID, source, sourceID, paymentID, incomingDebtSum, repaymentDebtSum, calculatedSum, calendarDays, repaymentSum,
        hoursByDays, planHoursByDays, leadingHoursByDays, isAvg, extraRate, basePayment, missingEmployeeNumberID,
        baseDate, dictIllnessReasonID, standingYearMonth, standingAll, workScheduleID, dictFundSourceID, dictProjectID,
        dictProgClassID, dictPositionID, calcEarnings, paySumAccrual, paySumOff, rateOff, workNormID, loadHours, calcParams, copyDate)
       select * from OPENJSON(?) 
       WITH (   
        ID bigint '$.ID', orgID bigint '$.orgID',
        periodCalcID bigint '$.periodCalcID',
        periodSalaryID bigint '$.periodSalaryID',
        periodCalc datetime '$.periodCalc',
        periodSalary datetime '$.periodSalary',
        employeeNumberID bigint '$.employeeNumberID',
        employeeNumberPartID bigint '$.employeeNumberPartID',
        payElID bigint '$.payElID',
        orderID bigint '$.orderID',
        empOrderID bigint '$.empOrderID',
        timeSheetID bigint '$.timeSheetID',
        orderDtID bigint '$.orderDtID',
        flagsRec bigint '$.flagsRec',
        flagsFix bigint '$.flagsFix',
        planHours numeric(19, 6) '$.planHours',
        planDays numeric(19, 2) '$.planDays',
        baseSum numeric(19, 6) '$.baseSum',
        rate numeric(19, 6) '$.rate',
        days int '$.days',
        hours numeric(19, 6) '$.hours',
        mask bigint '$.mask',
        maskAdd bigint '$.maskAdd',
        mtCount numeric(19, 6) '$.mtCount',
        paySum numeric(19, 2) '$.paySum',
        minSalarySum numeric(19, 2) '$.minSalarySum',
        dateFrom datetime '$.dateFrom',
        dateTo datetime '$.dateTo',
        orderDateFrom datetime '$.orderDateFrom',
        orderDateTo datetime '$.orderDateTo',
        avgCalcType nvarchar(32) '$.avgCalcType',
        dateFromAvg datetime '$.dateFromAvg',
        dateToAvg datetime '$.dateToAvg',
        sumAvg numeric(19, 6) '$.sumAvg',
        planSumAvg numeric(19, 6) '$.planSumAvg',
        avgDays numeric(19, 6) '$.avgDays',
        koef numeric(19, 2) '$.koef',
        calculateDate datetime '$.calculateDate',
        createUserID bigint '$.createUserID',
        linkToParentID bigint '$.linkToParentID',
        linkToChildID bigint '$.linkToChildID',
        source nvarchar(32) '$.source',
        sourceID bigint '$.sourceID',
        paymentID bigint '$.paymentID',
        incomingDebtSum numeric(19, 2) '$.incomingDebtSum',
        repaymentDebtSum numeric(19, 2) '$.repaymentDebtSum',
        calculatedSum numeric(19, 2) '$.calculatedSum',
        calendarDays numeric(19, 6) '$.calendarDays',
        repaymentSum numeric(19, 2) '$.repaymentSum',
        hoursByDays nvarchar(max) '$.hoursByDays',
        planHoursByDays nvarchar(max) '$.planHoursByDays',
        leadingHoursByDays nvarchar(max) '$.leadingHoursByDays',
        isAvg numeric(1) '$.isAvg',
        extraRate numeric(19, 6) '$.extraRate',
        basePayment numeric(19, 2) '$.basePayment',
        missingEmployeeNumberID bigint '$.missingEmployeeNumberID',
        baseDate datetime '$.baseDate',
        dictIllnessReasonID bigint '$.dictIllnessReasonID',
        standingYearMonth int '$.standingYearMonth',
        standingAll int '$.standingAll',
        workScheduleID bigint '$.workScheduleID',
        dictFundSourceID bigint '$.dictFundSourceID',
        dictProjectID bigint '$.dictProjectID',
        dictProgClassID bigint '$.dictProgClassID',
        dictPositionID bigint '$.dictPositionID',
        calcEarnings nvarchar(32) '$.calcEarnings',
        paySumAccrual numeric(19, 2) '$.paySumAccrual',
        paySumOff numeric(19, 2) '$.paySumOff',
        rateOff numeric(19, 2) '$.rateOff',
        workNormID bigint '$.workNormID',
        loadHours bigint '$.loadHours',
        calcParams nvarchar(max) '$.calcParams',
        copyDate datetime '$.copyDate'
      )`, { p1: JSON.stringify(accruals) }
          )
        } else {
          store.execSQL(
            `INSERT INTO hr_accrualCopy(ID, orgID, periodCalcID, periodSalaryID, periodCalc, periodSalary, employeeNumberID,
        employeeNumberPartID, payElID, orderID, empOrderID, timeSheetID, orderDtID, flagsRec, flagsFix, planHours, planDays,
        baseSum, rate, days, hours, mask, maskAdd, mtCount, paySum, minSalarySum, dateFrom, dateTo, orderDateFrom,
        orderDateTo, avgCalcType, dateFromAvg, dateToAvg, sumAvg, planSumAvg, avgDays, koef, calculateDate, createUserID, linkToParentID,
        linkToChildID, source, sourceID, paymentID, incomingDebtSum, repaymentDebtSum, calculatedSum, calendarDays, repaymentSum,
        hoursByDays, planHoursByDays, leadingHoursByDays, isAvg, extraRate, basePayment, missingEmployeeNumberID,
        baseDate, dictIllnessReasonID, standingYearMonth, standingAll, workScheduleID, dictFundSourceID, dictProjectID,
        dictProgClassID, dictPositionID, calcEarnings, paySumAccrual, paySumOff, rateOff, workNormID, loadHours, calcParams, copyDate)(
        SELECT (data->>'ID')::BIGINT, 
        (data->>'orgID')::BIGINT, 
        (data->>'periodCalcID')::BIGINT, 
        (data->>'periodSalaryID')::BIGINT, 
        (data->>'periodCalc')::TIMESTAMP, 
        (data->>'periodSalary')::TIMESTAMP,
        (data->>'employeeNumberID')::BIGINT, 
        (data->>'employeeNumberPartID')::BIGINT, 
        (data->>'payElID')::BIGINT,  
        (data->>'orderID')::BIGINT, 
        (data->>'empOrderID')::BIGINT, 
        (data->>'timeSheetID')::BIGINT, 
        (data->>'orderDtID')::BIGINT, 
        (data->>'flagsRec')::BIGINT, 
        (data->>'flagsFix')::BIGINT, 
        (data->>'planHours')::numeric(19, 6),
        (data->>'planDays')::numeric(19, 2), 
        (data->>'baseSum')::numeric(19, 6),
        (data->>'rate')::numeric(19, 6),
        (data->>'days')::numeric(19, 2), 
        (data->>'hours')::numeric(19, 6),
        (data->>'mask')::BIGINT,
        (data->>'maskAdd')::BIGINT,
        (data->>'mtCount')::numeric(19, 6),
        (data->>'paySum')::numeric(19, 2),
        (data->>'minSalarySum')::numeric(19, 2),
        (data->>'dateFrom')::TIMESTAMP,
        (data->>'dateTo')::TIMESTAMP,
        (data->>'orderDateFrom')::TIMESTAMP,
        (data->>'orderDateTo')::TIMESTAMP,
        (data->>'avgCalcType')::CHARACTER VARYING(32),
        (data->>'dateFromAvg')::TIMESTAMP,
        (data->>'dateToAvg')::TIMESTAMP,
        (data->>'sumAvg')::numeric(19, 6),
        (data->>'planSumAvg')::numeric(19, 6),
        (data->>'avgDays')::numeric(19, 6),
        (data->>'koef')::numeric(19, 2),
        (data->>'calculateDate')::TIMESTAMP,
        (data->>'createUserID')::BIGINT,
        (data->>'linkToParentID')::BIGINT,
        (data->>'linkToChildID')::BIGINT,
        (data->>'source')::CHARACTER VARYING(30),
        (data->>'sourceID')::BIGINT,
        (data->>'paymentID')::BIGINT,
        (data->>'incomingDebtSum')::numeric(19, 2),
        (data->>'repaymentDebtSum')::numeric(19, 2),
        (data->>'calculatedSum')::numeric(19, 2),
        (data->>'calendarDays')::numeric(19, 6), 
        (data->>'repaymentSum')::numeric(19, 2),
        (data->>'hoursByDays')::JSONB,
        (data->>'planHoursByDays')::JSONB,
        (data->>'leadingHoursByDays')::JSONB,
        (data->>'isAvg')::SMALLINT,
        (data->>'extraRate')::numeric(19, 6),
        (data->>'basePayment')::numeric(19, 2),
        (data->>'missingEmployeeNumberID')::BIGINT,
        (data->>'baseDate')::TIMESTAMP,
        (data->>'dictIllnessReasonID')::BIGINT,
        (data->>'standingYearMonth')::INT,
        (data->>'standingAll')::INT,
        (data->>'workScheduleID')::BIGINT,
        (data->>'dictFundSourceID')::BIGINT,
        (data->>'dictProjectID')::BIGINT,
        (data->>'dictProgClassID')::BIGINT,
        (data->>'dictPositionID')::BIGINT,
        (data->>'calcEarnings')::CHARACTER VARYING(32),
        (data->>'paySumAccrual')::numeric(19, 2),
        (data->>'paySumOff')::numeric(19, 2),
        (data->>'rateOff')::numeric(19, 6),
        (data->>'workNormID')::BIGINT,
        (data->>'loadHours')::numeric(19, 2),
        (data->>'calcParams')::JSONB,
        (data->>'copyDate')::TIMESTAMP 
        FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(accruals) }
          )
        }
      }
      const accrualDt = UB.Repository('hr_accrualDt')
        .attrs(['*'])
        .where('accrualID', 'in', accrualIDs)
        .selectAsObject()
      accrualDt.forEach(row => {
        row.accrualID = accrualIDMap[row.accrualID]
        row.ID = accrualService.getID('S_HR_ACCRUALDTCOPY')
      })
      if (accrualDt.length) {
        if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
          store.execSQL(
            `INSERT INTO hr_accrualDtCopy(ID, accrualID, paySum, dictFundSourceID, dictProjectID, dictProgClassID, departmentID, accountID,
       d0, d0Value, d1, d1Value, d2, d2Value, d3, d3Value, d4, d4Value,
       d5, d5Value, d6, d6Value, d7, d7Value, d8, d8Value, d9, d9Value)
       select * from OPENJSON(?) 
       WITH (   
         ID bigint '$.ID',
         accrualID bigint '$.accrualID',
         paySum numeric(19, 2) '$.paySum', 
         dictFundSourceID bigint '$.dictFundSourceID',
         dictProjectID bigint '$.dictProjectID',
         dictProgClassID bigint '$.dictProgClassID',
         departmentID bigint '$.departmentID',
         accountID bigint '$.accountID',
         d0 bigint '$.d0', d0Value bigint '$.d0Value', d1 bigint '$.d1', d1Value bigint '$.d1Value',
         d2 bigint '$.d2', d2Value bigint '$.d2Value', d3 bigint '$.d3', d3Value bigint '$.d3Value',
         d4 bigint '$.d4', d4Value bigint '$.d4Value', d5 bigint '$.d5', d5Value bigint '$.d5Value',
         d6 bigint '$.d6', d6Value bigint '$.d6Value', d7 bigint '$.d7', d7Value bigint '$.d7Value',
         d8 bigint '$.d8', d8Value bigint '$.d8Value', d9 bigint '$.d9', d9Value bigint '$.d9Value'
        
       )`, { p1: JSON.stringify(accrualDt) }
          )
        } else {
          store.execSQL(
            `INSERT INTO hr_accrualDtCopy(ID, accrualID, paySum, dictFundSourceID, dictProjectID, dictProgClassID, departmentID, accountID,
       d0, d0Value, d1, d1Value, d2, d2Value, d3, d3Value, d4, d4Value,
       d5, d5Value, d6, d6Value, d7, d7Value, d8, d8Value, d9, d9Value)(
            SELECT (data->>'ID')::BIGINT, 
            (data->>'accrualID')::BIGINT, 
            (data->>'paySum')::numeric(19, 2),
            (data->>'dictFundSourceID')::BIGINT, 
            (data->>'dictProjectID')::BIGINT,
            (data->>'dictProgClassID')::BIGINT,
            (data->>'departmentID')::BIGINT,
            (data->>'accountID')::BIGINT,
            (data->>'d0')::BIGINT,(data->>'d0Value')::BIGINT,(data->>'d1')::BIGINT,(data->>'d1Value')::BIGINT,
            (data->>'d2')::BIGINT,(data->>'d2Value')::BIGINT,(data->>'d3')::BIGINT,(data->>'d3Value')::BIGINT,
            (data->>'d4')::BIGINT,(data->>'d4Value')::BIGINT,(data->>'d5')::BIGINT,(data->>'d5Value')::BIGINT,
            (data->>'d6')::BIGINT,(data->>'d6Value')::BIGINT,(data->>'d7')::BIGINT,(data->>'d7Value')::BIGINT,
            (data->>'d8')::BIGINT,(data->>'d8Value')::BIGINT,(data->>'d9')::BIGINT,(data->>'d9Value')::BIGINT
       FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(accrualDt) }
          )
        }
      }
      const taxIndividAcc = UB.Repository('hr_taxIndividAcc')
        .attrs(['*'])
        .where('accrualID', 'in', accrualIDs)
        .selectAsObject()
      taxIndividAcc.forEach(row => {
        row.accrualID = accrualIDMap[row.accrualID]
        row.ID = accrualService.getID('S_HR_TAXINDIVIDACCCOPY')
      })
      if (taxIndividAcc.length) {
        if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
          store.execSQL(
            `INSERT INTO hr_taxIndividAccCopy(ID, accrualID, taxIndividID, taxSum, incomeSum, taxFreeSum, privilegeSum, taxLimitID1, taxLimitID2, taxLimitID3)
       select * from OPENJSON(?) 
       WITH (   
         ID bigint '$.ID',
         accrualID bigint '$.accrualID',
         taxIndividID bigint '$.taxIndividID',
         taxSum numeric(19, 6) '$.taxSum',
         incomeSum numeric(19, 6) '$.incomeSum', 
         taxFreeSum numeric(19, 6) '$.taxFreeSum',
         privilegeSum numeric(19, 6) '$.privilegeSum', 
         taxLimitID1 bigint '$.taxLimitID1',
         taxLimitID2 bigint '$.taxLimitID2',
         taxLimitID3 bigint '$.taxLimitID3'
       )`, { p1: JSON.stringify(taxIndividAcc) }
          )
        } else {
          store.execSQL(
            `INSERT INTO hr_taxIndividAccCopy(ID, accrualID, taxIndividID, taxSum, incomeSum, taxFreeSum, privilegeSum, taxLimitID1, taxLimitID2, taxLimitID3) (
            SELECT (data->>'ID')::BIGINT, 
            (data->>'accrualID')::BIGINT, 
            (data->>'taxIndividID')::BIGINT, 
            (data->>'taxSum')::numeric(19, 6),
            (data->>'incomeSum')::numeric(19, 2),
            (data->>'taxFreeSum')::numeric(19, 2),
            (data->>'privilegeSum')::numeric(19, 2),
            (data->>'taxLimitID1')::BIGINT,
            (data->>'taxLimitID2')::BIGINT,
            (data->>'taxLimitID3')::BIGINT
       FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(taxIndividAcc) }
          )
        }
      }

      const accrualAvg = UB.Repository('hr_accrualAvg')
        .attrs(['*'])
        .where('accrualID', 'in', accrualIDs)
        .selectAsObject()
      accrualAvg.forEach(row => {
        row.accrualID = accrualIDMap[row.accrualID]
        row.ID = accrualAvgStore.generateID()
      })
      if (accrualAvg.length) {
        if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
          store.execSQL(
            `INSERT INTO hr_accrualAvgCopy(ID, accrualID, orderID, periodID, dateFrom, dateTo, flagsFix, baseSum, baseSumNotIndex, opSum, opDays, opHours, opKoef, accrualDt)
       select * from OPENJSON(?) 
       WITH (   
         ID bigint '$.ID',
         accrualID bigint '$.accrualID',
         orderID bigint '$.orderID',
         periodID bigint '$.periodID',
         dateFrom datetime '$.dateFrom',
         dateTo datetime '$.dateTo',
         flagsFix bigint '$.flagsFix',
         baseSum numeric(19, 6) '$.baseSum',
         baseSumNotIndex numeric(19, 6) '$.baseSumNotIndex',
         opSum numeric(19, 6) '$.opSum',
         opDays numeric(19, 6) '$.opDays',
         opHours numeric(19, 6) '$.opHours',
         opKoef numeric(19, 6) '$.opKoef',
         accrualDt nvarchar(max) '$.accrualDt'
       )`, { p1: JSON.stringify(accrualAvg) }
          )
        } else {
          store.execSQL(
            `INSERT INTO hr_accrualAvgCopy(ID, accrualID, orderID, periodID, dateFrom, dateTo, flagsFix, baseSum, baseSumNotIndex, opSum, opDays, opHours, opKoef, accrualDt) (
         SELECT (data->>'ID')::BIGINT, 
         (data->>'accrualID')::BIGINT, 
         (data->>'orderID')::BIGINT, 
         (data->>'periodID')::BIGINT, 
         (data->>'dateFrom')::TIMESTAMP, 
         (data->>'dateTo')::TIMESTAMP, 
         (data->>'flagsFix')::BIGINT, 
         (data->>'baseSum')::numeric(19, 6),
         (data->>'baseSumNotIndex')::numeric(19, 6),
         (data->>'opSum')::numeric(19, 6),
         (data->>'opDays')::numeric(19, 6),
         (data->>'opHours')::numeric(19, 6),
         (data->>'opKoef')::numeric(19, 6),
         (data->>'accrualDt')::JSONB
         FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(accrualAvg) }
          )
        }
      }

      const accrualFundIDs = []
      const accrualFundIDMap = {}
      const accrualFund = UB.Repository('hr_accrualFund')
        .attrs(['*'])
        .where('orgID', '=', orgID)
        .where('periodCalcID', '=', period.ID)
        .selectAsObject()
      accrualFund.forEach(row => {
        accrualFundIDs.push(row.ID)
        accrualFundIDMap[row.ID] = accrualService.getID('S_HR_ACCRUALFUNDCOPY')
        row.ID = accrualFundIDMap[row.ID]
        row.copyDate = copyDate
      })
      if (accrualFund.length) {
        if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
          store.execSQL(
            `INSERT INTO hr_accrualFundCopy(ID, orgID, periodCalcID, periodSalaryID, periodCalc, periodSalary, employeeNumberID,
       paySum, payFundID, sourceSum, baseSum, addMinSum, rate, calculateDate, copyDate)
       select * from OPENJSON(?) 
       WITH (   
        ID bigint '$.ID',
        orgID bigint '$.orgID',
        periodCalcID bigint '$.periodCalcID',
        periodSalaryID bigint '$.periodSalaryID',
        periodCalc datetime '$.periodCalc',
        periodSalary datetime '$.periodSalary',
        employeeNumberID bigint '$.employeeNumberID',
        paySum numeric(19, 6) '$.paySum',
        payFundID bigint '$.payFundID',
        sourceSum numeric(19, 6) '$.sourceSum',
        baseSum numeric(19, 6) '$.baseSum',
        addMinSum numeric(19, 6) '$.addMinSum',
        rate numeric(19, 6) '$.rate',
        calculateDate datetime '$.calculateDate',
        copyDate datetime '$.copyDate'
      )`, { p1: JSON.stringify(accrualFund) }
          )
        } else {
          store.execSQL(
            `INSERT INTO hr_accrualFundCopy(ID, orgID, periodCalcID, periodSalaryID, periodCalc, periodSalary, employeeNumberID,
       paySum, payFundID, sourceSum, baseSum, addMinSum, rate, calculateDate, copyDate) (
            SELECT (data->>'ID')::BIGINT, 
            (data->>'orgID')::BIGINT, 
            (data->>'periodCalcID')::BIGINT, 
            (data->>'periodSalaryID')::BIGINT, 
            (data->>'periodCalc')::TIMESTAMP, 
            (data->>'periodSalary')::TIMESTAMP,
            (data->>'employeeNumberID')::BIGINT, 
            (data->>'paySum')::numeric(19, 6),
            (data->>'payFundID')::BIGINT,
            (data->>'sourceSum')::numeric(19, 6),
            (data->>'baseSum')::numeric(19, 6),
            (data->>'addMinSum')::numeric(19, 6),
            (data->>'rate')::numeric(19, 6),
            (data->>'calculateDate')::TIMESTAMP, 
            (data->>'copyDate')::TIMESTAMP 
       FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(accrualFund) }
          )
        }
      }
      const accrualFundDt = UB.Repository('hr_accrualFundDt')
        .attrs(['*'])
        .where('accrualFundID', 'in', accrualFundIDs)
        .selectAsObject()
      accrualFundDt.forEach(row => {
        row.accrualFundID = accrualFundIDMap[row.accrualFundID]
        row.ID = accrualService.getID('S_HR_ACCRUALFUNDDTCOPY')
      })
      if (accrualFundDt.length) {
        if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
          store.execSQL(
            `INSERT INTO hr_accrualFundDtCopy(ID, accrualFundID, payElID, paySum, sourceSum, baseSum, 
       dictFundSourceID, dictProjectID, dictProgClassID, departmentID, accountID, d0, d0Value, d1, d1Value, d2, d2Value, d3, d3Value, d4, d4Value,
       d5, d5Value, d6, d6Value, d7, d7Value, d8, d8Value, d9, d9Value)
       select * from OPENJSON(?) 
       WITH (   
         ID bigint '$.ID',
         accrualFundID bigint '$.accrualFundID',
         payElID bigint '$.payElID',
         paySum numeric(19, 6) '$.paySum', 
         sourceSum numeric(19, 6) '$.sourceSum',
         baseSum numeric(19, 6) '$.baseSum',
         dictFundSourceID bigint '$.dictFundSourceID',
         dictProjectID bigint '$.dictProjectID',
         dictProgClassID bigint '$.dictProgClassID',
         departmentID bigint '$.departmentID',
         accountID bigint '$.accountID',
         d0 bigint '$.d0', d0Value bigint '$.d0Value', d1 bigint '$.d1', d1Value bigint '$.d1Value',
         d2 bigint '$.d2', d2Value bigint '$.d2Value', d3 bigint '$.d3', d3Value bigint '$.d3Value',
         d4 bigint '$.d4', d4Value bigint '$.d4Value', d5 bigint '$.d5', d5Value bigint '$.d5Value',
         d6 bigint '$.d6', d6Value bigint '$.d6Value', d7 bigint '$.d7', d7Value bigint '$.d7Value',
         d8 bigint '$.d8', d8Value bigint '$.d8Value', d9 bigint '$.d9', d9Value bigint '$.d9Value'
       )`, { p1: JSON.stringify(accrualFundDt) }
          )
        } else {
          store.execSQL(
            `INSERT INTO hr_accrualFundDtCopy(ID, accrualFundID, payElID, paySum, sourceSum, baseSum, 
       dictFundSourceID, dictProjectID, dictProgClassID, departmentID, accountID, d0, d0Value, d1, d1Value, d2, d2Value, d3, d3Value, d4, d4Value,
       d5, d5Value, d6, d6Value, d7, d7Value, d8, d8Value, d9, d9Value) (
            SELECT (data->>'ID')::BIGINT, 
            (data->>'accrualFundID')::BIGINT, 
            (data->>'payElID')::BIGINT,
            (data->>'paySum')::numeric(19, 6),
            (data->>'sourceSum')::numeric(19, 6),
            (data->>'baseSum')::numeric(19, 6),
            (data->>'dictFundSourceID')::BIGINT,
            (data->>'dictProjectID')::BIGINT,
            (data->>'dictProgClassID')::BIGINT,
            (data->>'departmentID')::BIGINT,
            (data->>'accountID')::BIGINT,
            (data->>'d0')::BIGINT,(data->>'d0Value')::BIGINT,(data->>'d1')::BIGINT,(data->>'d1Value')::BIGINT,
            (data->>'d2')::BIGINT,(data->>'d2Value')::BIGINT,(data->>'d3')::BIGINT,(data->>'d3Value')::BIGINT,
            (data->>'d4')::BIGINT,(data->>'d4Value')::BIGINT,(data->>'d5')::BIGINT,(data->>'d5Value')::BIGINT,
            (data->>'d6')::BIGINT,(data->>'d6Value')::BIGINT,(data->>'d7')::BIGINT,(data->>'d7Value')::BIGINT,
            (data->>'d8')::BIGINT,(data->>'d8Value')::BIGINT,(data->>'d9')::BIGINT,(data->>'d9Value')::BIGINT
       FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(accrualFundDt) }
          )
        }
      }
    }
  })
  ctx.mParams.resultData = JSON.stringify({ errorMessages })
}

me.getCopyList = function (ctx) {
  const params = ctx.mParams
  let orgIDs = []
  const resultData = []
  const mainPeriod = params.periodID ? periodService.getPeriod(params.periodID) : periodService.getCurrentPeriod(params.orgID)
  const store = UB.DataStore('hr_accrualCopy')
  if (params.childOrg) {
    const orgs = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.orgID}/%`)
      .groupBy('mi_data_id')
      .orderBy('mi_data_id')
      .selectAsObject()
    if (orgs.length) {
      orgIDs = orgs.map(o => o.mi_data_id)
      orgIDs.push(params.orgID)
    }
  } else {
    orgIDs = [params.orgID]
  }
  orgIDs.forEach(orgID => {
    let period = params.periodID ? periodService.getPeriodOnDate(orgID, mainPeriod.dateFrom) : null
    const org = UB.Repository('ac_organization').attrs(['name']).selectById(orgID) || {}
    store.runSQL(` SELECT a.orgID "orgID", a.periodCalcID "periodCalcID", a.copyDate "copyDate"
  FROM hr_accrualCopy a
  WHERE a.orgID = :orgID: 
  ${period && period.ID ? 'AND a.periodCalcID = :periodCalcID:' : ''}
  GROUP BY a.orgID, a.periodCalcID, a.copyDate`, {
      orgID,
      periodCalcID: (period && period.ID) || 0
    })
    const data = store.getAsJsObject()
    data.forEach(row => {
      let period = periodService.getPeriod(row.periodCalcID)
      row.orgName = org.name || ''
      row.periodCalc = period.name
      resultData.push(row)
    })
  })
  ctx.mParams.resultData = JSON.stringify(resultData)
}

me.getProtocol = function (ctx) {
  const isLog = false
  const params = ctx.mParams
  let orgIDs = []
  const reportData = []
  const mainPeriod = params.periodID ? periodService.getPeriod(params.periodID) : periodService.getCurrentPeriod(params.orgID)
  if (params.childOrg) {
    const orgs = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.orgID}/%`)
      .groupBy('mi_data_id')
      .selectAsObject()
    if (orgs.length) {
      orgIDs = orgs.map(o => o.mi_data_id)
    }
  } else {
    orgIDs = [params.orgID]
  }
  const detailValues = {}
  orgIDs.forEach(orgID => {
    let orgMessage = false
    const org = UB.Repository('ac_organization').attrs(['name']).selectById(orgID) || {}
    const period = params.periodID ? periodService.getPeriodOnDate(orgID, mainPeriod.dateFrom) : periodService.getCurrentPeriod(orgID)
    if (period) {
      const exsistsCopy = UB.Repository('hr_accrualCopy')
        .attrs(['ID', 'copyDate'])
        .where('orgID', '=', orgID)
        .where('periodCalcID', '=', period.ID)
        .limit(1)
        .selectSingle()
      if (!exsistsCopy) {
        reportData.push({
          orgID,
          orgName: org.name || '',
          periodCalcID: period.ID,
          periodCalc: period.name,
          description: `Відсутня копія для порівняння`
        })
        orgMessage = true
      } else {
        const resAccrual = {}
        if (params.isAccrual) {
          const accrual = params.isTotal ? UB.Repository('hr_accrual')
            .attrs(['payElID', 'payElID.description', 'periodSalaryID', 'periodSalaryID.name', 'SUM([paySum])'])
            .where('orgID', '=', orgID)
            .where('periodCalcID', '=', period.ID)
            .whereIf(params.payElID, 'payElID', '=', params.payElID)
            .whereIf(params.periodSalaryID, 'periodSalaryID', '=', params.periodSalaryID)
            .where(`((flagsRec & 4096 = 0) AND (flagsRec & 1048576 = 0)) `, 'custom')
            .groupBy(['payElID', 'payElID.description', 'periodSalaryID', 'periodSalaryID.name'])
            .orderBy('payElID.description')
            .selectAsObject({
              'SUM([paySum])': 'paySum'
            })
            : UB.Repository('hr_accrual')
              .attrs(['payElID', 'payElID.description', 'periodSalaryID', 'periodSalaryID.name', 'employeeNumberID', 'employeeNumberID.employeeID.fullFIO', 'employeeNumberID.tabNum', 'SUM([paySum])'])
              .where('orgID', '=', orgID)
              .where('periodCalcID', '=', period.ID)
              .whereIf(params.payElID, 'payElID', '=', params.payElID)
              .whereIf(params.periodSalaryID, 'periodSalaryID', '=', params.periodSalaryID)
              .where(`((flagsRec & 4096 = 0) AND (flagsRec & 1048576 = 0)) `, 'custom')
              .groupBy(['payElID', 'payElID.description', 'periodSalaryID', 'periodSalaryID.name', 'employeeNumberID', 'employeeNumberID.employeeID.fullFIO', 'employeeNumberID.tabNum'])
              .orderBy('employeeNumberID.employeeID.fullFIO')
              .orderBy('payElID.description')
              .selectAsObject({
                'SUM([paySum])': 'paySum',
                'employeeNumberID.employeeID.fullFIO': 'fullFIO',
                'employeeNumberID.tabNum': 'tabNum'
              })
          const accrualCopy = params.isTotal ? UB.Repository('hr_accrualCopy')
            .attrs(['payElID', 'payElID.description', 'periodSalaryID', 'periodSalaryID.name', 'SUM([paySum])'])
            .where('orgID', '=', orgID)
            .where('periodCalcID', '=', period.ID)
            .whereIf(params.payElID, 'payElID', '=', params.payElID)
            .whereIf(params.periodSalaryID, 'periodSalaryID', '=', params.periodSalaryID)
            .where(`((flagsRec & 4096 = 0) AND (flagsRec & 1048576 = 0)) `, 'custom')
            .groupBy(['payElID', 'payElID.description', 'periodSalaryID', 'periodSalaryID.name'])
            .orderBy('payElID.description')
            .selectAsObject({
              'SUM([paySum])': 'paySum'
            })
            : UB.Repository('hr_accrualCopy')
              .attrs(['payElID', 'payElID.description', 'periodSalaryID', 'periodSalaryID.name', 'employeeNumberID', 'employeeNumberID.employeeID.fullFIO', 'employeeNumberID.tabNum', 'SUM([paySum])'])
              .where('orgID', '=', orgID)
              .where('periodCalcID', '=', period.ID)
              .whereIf(params.payElID, 'payElID', '=', params.payElID)
              .whereIf(params.periodSalaryID, 'periodSalaryID', '=', params.periodSalaryID)
              .where(`((flagsRec & 4096 = 0) AND (flagsRec & 1048576 = 0)) `, 'custom')
              .groupBy(['payElID', 'payElID.description', 'periodSalaryID', 'periodSalaryID.name', 'employeeNumberID', 'employeeNumberID.employeeID.fullFIO', 'employeeNumberID.tabNum'])
              .orderBy('employeeNumberID.employeeID.fullFIO')
              .orderBy('payElID.description')
              .selectAsObject({
                'SUM([paySum])': 'paySum',
                'employeeNumberID.employeeID.fullFIO': 'fullFIO',
                'employeeNumberID.tabNum': 'tabNum'
              })

          accrual.forEach(row => {
            const existRow = accrualCopy.find(o => o.payElID === row.payElID && o.periodSalaryID === row.periodSalaryID && (params.isTotal || o.employeeNumberID === row.employeeNumberID)) || {}
            if (row.paySum && row.paySum !== existRow.paySum) {
              if (isLog && !resAccrual[row.payElID]) {
                resAccrual[row.payElID] = { paySum: 0, copyPaySum: 0 }
              }

              reportData.push({
                orgID,
                orgName: org.name || '',
                periodCalcID: period.ID,
                periodCalc: period.name,
                periodSalaryID: row.periodSalaryID,
                periodSalary: row['periodSalaryID.name'],
                employeeNumberID: params.isTotal ? null : row.employeeNumberID,
                tabNum: params.isTotal ? null : row.tabNum,
                fullFIO: params.isTotal ? null : row.fullFIO,
                tableType: params.isTotal ? `Підсумки (Розрахунковий лист)` : `Розрахунковий лист`,
                listType: 'isAccrual',
                description: row['payElID.description'],
                payElID: row.payElID,
                paySum: row.paySum,
                copyPaySum: existRow.paySum || 0,
                copyDate: exsistsCopy.copyDate
              })
              if (isLog) {
                resAccrual[row.payElID].paySum += row.paySum
                resAccrual[row.payElID].copyPaySum += existRow.paySum || 0
              }
              orgMessage = true
            }
            if (row.paySum) {
              existRow.check = true
            }
          })
          accrualCopy.forEach(row => {
            if (row.paySum && !row.check) {
              if (isLog && !resAccrual[row.payElID]) {
                resAccrual[row.payElID] = { paySum: 0, copyPaySum: 0 }
              }
              reportData.push({
                orgID,
                orgName: org.name || '',
                periodCalcID: period.ID,
                periodCalc: period.name,
                periodSalaryID: row.periodSalaryID,
                periodSalary: row['periodSalaryID.name'],
                employeeNumberID: params.isTotal ? null : row.employeeNumberID,
                tabNum: params.isTotal ? null : row.tabNum,
                fullFIO: params.isTotal ? null : row.fullFIO,
                tableType: params.isTotal ? `Підсумки (Розрахунковий лист)` : `Розрахунковий лист`,
                listType: 'isAccrual',
                description: row['payElID.description'],
                payElID: row.payElID,
                paySum: 0,
                copyPaySum: row.paySum,
                copyDate: exsistsCopy.copyDate
              })
              if (isLog) {
                resAccrual[row.payElID].copyPaySum += row.paySum
              }
              orgMessage = true
            }
          })
          if (isLog) {
            let resSum = 0
            Object.keys(resAccrual).forEach(payElID => {
              resAccrual[payElID].sum = resAccrual[payElID].copyPaySum - resAccrual[payElID].paySum
              resSum += resAccrual[payElID].sum
            })
            console.log(resSum)
          }
        }
        let detailIDs = []
        if (params.isAccrualDt) {
          const resAccrualDt = {}
          const reportDtData = []
          const accrualDt = params.isTotal
            ? UB.Repository('hr_accrualDt')
              .attrs(['accrualID.payElID', 'accrualID.payElID.description', 'accrualID.periodSalaryID', 'accrualID.periodSalaryID.name',
                'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'departmentID', 'accountID',
                'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
                'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
                'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description', 'accountID.code',
                'SUM([paySum])'])
              .where('accrualID.orgID', '=', orgID)
              .where('accrualID.periodCalcID', '=', period.ID)
              .whereIf(params.payElID, 'accrualID.payElID', '=', params.payElID)
              .whereIf(params.periodSalaryID, 'accrualID.periodSalaryID', '=', params.periodSalaryID)
              .where(`(([accrualID.flagsRec] & 4096 = 0) AND ([accrualID.flagsRec] & 1048576 = 0)) `, 'custom')
              .groupBy(['accrualID.payElID', 'accrualID.payElID.description', 'accrualID.periodSalaryID', 'accrualID.periodSalaryID.name',
                'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'departmentID', 'accountID',
                'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
                'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
                'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description', 'accountID.code'
              ])
              .orderBy('accrualID.payElID.description')
              .selectAsObject({
                'SUM([paySum])': 'paySum',
                'accrualID.payElID': 'payElID',
                'accrualID.payElID.description': 'payElDescription',
                'accrualID.periodSalaryID': 'periodSalaryID',
                'accrualID.periodSalaryID.name': 'periodSalary'
              })
            : UB.Repository('hr_accrualDt')
              .attrs(['accrualID.payElID', 'accrualID.payElID.description', 'accrualID.periodSalaryID', 'accrualID.periodSalaryID.name',
                'accrualID.employeeNumberID', 'accrualID.employeeNumberID.employeeID.fullFIO', 'accrualID.employeeNumberID.tabNum',
                'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'departmentID', 'accountID',
                'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
                'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
                'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description', 'accountID.code',
                'SUM([paySum])'])
              .where('accrualID.orgID', '=', orgID)
              .where('accrualID.periodCalcID', '=', period.ID)
              .whereIf(params.payElID, 'accrualID.payElID', '=', params.payElID)
              .whereIf(params.periodSalaryID, 'accrualID.periodSalaryID', '=', params.periodSalaryID)
              .where(`(([accrualID.flagsRec] & 4096 = 0) AND ([accrualID.flagsRec] & 1048576 = 0)) `, 'custom')
              .groupBy(['accrualID.payElID', 'accrualID.payElID.description', 'accrualID.periodSalaryID', 'accrualID.periodSalaryID.name',
                'accrualID.employeeNumberID', 'accrualID.employeeNumberID.employeeID.fullFIO', 'accrualID.employeeNumberID.tabNum',
                'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'departmentID', 'accountID',
                'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
                'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
                'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description', 'accountID.code'
              ])
              .orderBy('accrualID.employeeNumberID.employeeID.fullFIO')
              .orderBy('accrualID.payElID.description')
              .selectAsObject({
                'SUM([paySum])': 'paySum',
                'accrualID.payElID': 'payElID',
                'accrualID.payElID.description': 'payElDescription',
                'accrualID.periodSalaryID': 'periodSalaryID',
                'accrualID.periodSalaryID.name': 'periodSalary',
                'accrualID.employeeNumberID': 'employeeNumberID',
                'accrualID.employeeNumberID.employeeID.fullFIO': 'fullFIO',
                'accrualID.employeeNumberID.tabNum': 'tabNum'
              })
          const accrualDtCopy = params.isTotal
            ? UB.Repository('hr_accrualDtCopy')
              .attrs(['accrualID.payElID', 'accrualID.payElID.description', 'accrualID.periodSalaryID', 'accrualID.periodSalaryID.name',
                'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'departmentID', 'accountID',
                'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
                'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
                'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description', 'accountID.code',
                'SUM([paySum])'])
              .where('accrualID.orgID', '=', orgID)
              .where('accrualID.periodCalcID', '=', period.ID)
              .whereIf(params.payElID, 'accrualID.payElID', '=', params.payElID)
              .whereIf(params.periodSalaryID, 'accrualID.periodSalaryID', '=', params.periodSalaryID)
              .where(`(([accrualID.flagsRec] & 4096 = 0) AND ([accrualID.flagsRec] & 1048576 = 0)) `, 'custom')
              .groupBy(['accrualID.payElID', 'accrualID.payElID.description', 'accrualID.periodSalaryID', 'accrualID.periodSalaryID.name',
                'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'departmentID', 'accountID',
                'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
                'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
                'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description', 'accountID.code'
              ])
              .orderBy('accrualID.payElID.description')
              .selectAsObject({
                'SUM([paySum])': 'paySum',
                'accrualID.payElID': 'payElID',
                'accrualID.payElID.description': 'payElDescription',
                'accrualID.periodSalaryID': 'periodSalaryID',
                'accrualID.periodSalaryID.name': 'periodSalary'
              })
            : UB.Repository('hr_accrualDtCopy')
              .attrs(['accrualID.payElID', 'accrualID.payElID.description', 'accrualID.periodSalaryID', 'accrualID.periodSalaryID.name',
                'accrualID.employeeNumberID', 'accrualID.employeeNumberID.employeeID.fullFIO', 'accrualID.employeeNumberID.tabNum',
                'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'departmentID', 'accountID',
                'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
                'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
                'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description', 'accountID.code',
                'SUM([paySum])'])
              .where('accrualID.orgID', '=', orgID)
              .where('accrualID.periodCalcID', '=', period.ID)
              .whereIf(params.payElID, 'accrualID.payElID', '=', params.payElID)
              .whereIf(params.periodSalaryID, 'accrualID.periodSalaryID', '=', params.periodSalaryID)
              .where(`(([accrualID.flagsRec] & 4096 = 0) AND ([accrualID.flagsRec] & 1048576 = 0)) `, 'custom')
              .groupBy(['accrualID.payElID', 'accrualID.payElID.description', 'accrualID.periodSalaryID', 'accrualID.periodSalaryID.name',
                'accrualID.employeeNumberID', 'accrualID.employeeNumberID.employeeID.fullFIO', 'accrualID.employeeNumberID.tabNum',
                'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'departmentID', 'accountID',
                'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
                'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
                'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description', 'accountID.code'
              ])
              .orderBy('accrualID.employeeNumberID.employeeID.fullFIO')
              .orderBy('accrualID.payElID.description')
              .selectAsObject({
                'SUM([paySum])': 'paySum',
                'accrualID.payElID': 'payElID',
                'accrualID.payElID.description': 'payElDescription',
                'accrualID.periodSalaryID': 'periodSalaryID',
                'accrualID.periodSalaryID.name': 'periodSalary',
                'accrualID.employeeNumberID': 'employeeNumberID',
                'accrualID.employeeNumberID.employeeID.fullFIO': 'fullFIO',
                'accrualID.employeeNumberID.tabNum': 'tabNum'
              })
          const baseDims = ['accountID.code', 'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description']
          const dimsValue = ['d0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value']
          accrualDt.forEach(row => {
            const existRow = accrualDtCopy.find(o => o.payElID === row.payElID && o.periodSalaryID === row.periodSalaryID && (params.isTotal || o.employeeNumberID === row.employeeNumberID) &&
              o.dictFundSourceID === row.dictFundSourceID && o.dictProjectID === row.dictProjectID && o.dictProgClassID === row.dictProgClassID && o.departmentID === row.departmentID &&
              o.accountID === row.accountID && o.d0 === row.d0 && o.d1 === row.d1 && o.d2 === row.d2 && o.d3 === row.d3 && o.d4 === row.d4 && o.d5 === row.d5 && o.d6 === row.d6 &&
              o.d7 === row.d7 && o.d8 === row.d8 && o.d9 === row.d9 && o.d0Value === row.d0Value && o.d1Value === row.d1Value && o.d2Value === row.d2Value && o.d3Value === row.d3Value &&
              o.d4Value === row.d4Value && o.d5Value === row.d5Value && o.d6Value === row.d6Value && o.d7Value === row.d7Value && o.d8Value === row.d8Value && o.d9Value === row.d9Value
            ) || {}
            if (row.paySum && row.paySum !== existRow.paySum) {
              if (isLog && !resAccrualDt[row.payElID]) {
                resAccrualDt[row.payElID] = { paySum: 0, copyPaySum: 0 }
              }
              const additionalArray = []
              baseDims.forEach(dName => {
                if (row[dName]) {
                  additionalArray.push(row[dName])
                }
              })
              const detailData = []
              dimsValue.forEach(dName => {
                if (row[dName]) {
                  detailData.push(row[dName])
                  if (!detailValues[row[dName]]) {
                    detailValues[row[dName]] = row[dName]
                    detailIDs.push(row[dName])
                  }
                }
              })
              reportDtData.push({
                orgID,
                orgName: org.name || '',
                periodCalcID: period.ID,
                periodCalc: period.name,
                periodSalaryID: row.periodSalaryID,
                periodSalary: row.periodSalary,
                employeeNumberID: params.isTotal ? null : row.employeeNumberID,
                tabNum: params.isTotal ? null : row.tabNum,
                fullFIO: params.isTotal ? null : row.fullFIO,
                tableType: params.isTotal ? `Підсумки (Деталізація розрахункового листа)` : `Деталізація розрахункового листа`,
                listType: 'isAccrualDt',
                description: row.payElDescription,
                payElID: row.payElID,
                paySum: row.paySum,
                copyPaySum: existRow.paySum || 0,
                additional: additionalArray.join(', '),
                copyDate: exsistsCopy.copyDate,
                detailData
              })
              if (isLog) {
                resAccrualDt[row.payElID].paySum += row.paySum
                resAccrualDt[row.payElID].copyPaySum += existRow.paySum || 0
              }
              orgMessage = true
            }
            if (row.paySum) {
              existRow.check = true
            }
          })
          accrualDtCopy.forEach(row => {
            if (row.paySum && !row.check) {
              if (isLog && !resAccrualDt[row.payElID]) {
                resAccrualDt[row.payElID] = { paySum: 0, copyPaySum: 0 }
              }
              const additionalArray = []
              baseDims.forEach(dName => {
                if (row[dName]) {
                  additionalArray.push(row[dName])
                }
              })
              const detailData = []
              dimsValue.forEach(dName => {
                if (row[dName]) {
                  detailData.push(row[dName])
                  if (!detailValues[row[dName]]) {
                    detailValues[row[dName]] = row[dName]
                    detailIDs.push(row[dName])
                  }
                }
              })
              reportDtData.push({
                orgID,
                orgName: org.name || '',
                periodCalcID: period.ID,
                periodCalc: period.name,
                periodSalaryID: row.periodSalaryID,
                periodSalary: row.periodSalary,
                employeeNumberID: params.isTotal ? null : row.employeeNumberID,
                tabNum: params.isTotal ? null : row.tabNum,
                fullFIO: params.isTotal ? null : row.fullFIO,
                tableType: params.isTotal ? `Підсумки (Деталізація розрахункового листа)` : `Деталізація розрахункового листа`,
                listType: 'isAccrualDt',
                description: row.payElDescription,
                payElID: row.payElID,
                paySum: 0,
                copyPaySum: row.paySum,
                additional: additionalArray.join(', '),
                copyDate: exsistsCopy.copyDate,
                detailData
              })
              if (isLog) {
                resAccrualDt[row.payElID].copyPaySum += row.paySum
              }
              orgMessage = true
            }
          })
          const detail = UB.Repository('gl_dimValue').attrs(['ID', 'caption']).where('ID', 'in', detailIDs).selectAsObject()
          detail.forEach(row => {
            detailValues[row.ID] = row.caption
          })
          reportDtData.forEach(row => {
            if (row.detailData && row.detailData.length) {
              row.detailData.forEach(d => {
                if (detailValues[d]) {
                  row.additional += `, ${detailValues[d]}`
                }
              })
            }
            delete row.detailData
            if (!params.additional || params.additional === row.additional) {
              reportData.push(row)
            }
          })
          if (isLog) {
            let resSum = 0
            Object.keys(resAccrualDt).forEach(payElID => {
              resAccrualDt[payElID].sum = resAccrualDt[payElID].copyPaySum - resAccrualDt[payElID].paySum
              resSum += resAccrualDt[payElID].sum
            })
            console.log(resSum)
          }
        }
        if (params.isTaxIndivid) {
          const taxIndividAcc = params.isTotal
            ? UB.Repository('hr_taxIndividAcc')
              .attrs(['accrualID.payElID', 'accrualID.payElID.description', 'accrualID.periodSalaryID', 'accrualID.periodSalaryID.name',
                'taxIndividID', 'taxIndividID.name', 'taxIndividID.code', 'taxIndividID.codeReport', 'SUM([taxSum])'])
              .where('accrualID.orgID', '=', orgID)
              .where('accrualID.periodCalcID', '=', period.ID)
              .where(`(([accrualID.flagsRec] & 4096 = 0) AND ([accrualID.flagsRec] & 1048576 = 0)) `, 'custom')
              .groupBy(['accrualID.payElID', 'accrualID.payElID.description', 'accrualID.periodSalaryID', 'accrualID.periodSalaryID.name',
                'taxIndividID', 'taxIndividID.name', 'taxIndividID.code', 'taxIndividID.codeReport'
              ])
              .orderBy('accrualID.payElID.description')
              .selectAsObject({
                'SUM([taxSum])': 'paySum',
                'accrualID.payElID': 'payElID',
                'accrualID.payElID.description': 'payElDescription',
                'accrualID.periodSalaryID': 'periodSalaryID',
                'accrualID.periodSalaryID.name': 'periodSalary',
                'taxIndividID.name': 'name',
                'taxIndividID.code': 'code',
                'taxIndividID.codeReport': 'codeReport'
              })
            : UB.Repository('hr_taxIndividAcc')
              .attrs(['accrualID.payElID', 'accrualID.payElID.description', 'accrualID.periodSalaryID', 'accrualID.periodSalaryID.name',
                'accrualID.employeeNumberID', 'accrualID.employeeNumberID.employeeID.fullFIO', 'accrualID.employeeNumberID.tabNum',
                'taxIndividID', 'taxIndividID.name', 'taxIndividID.code', 'taxIndividID.codeReport', 'SUM([taxSum])'])
              .where('accrualID.orgID', '=', orgID)
              .where('accrualID.periodCalcID', '=', period.ID)
              .where(`(([accrualID.flagsRec] & 4096 = 0) AND ([accrualID.flagsRec] & 1048576 = 0)) `, 'custom')
              .groupBy(['accrualID.payElID', 'accrualID.payElID.description', 'accrualID.periodSalaryID', 'accrualID.periodSalaryID.name',
                'accrualID.employeeNumberID', 'accrualID.employeeNumberID.employeeID.fullFIO', 'accrualID.employeeNumberID.tabNum',
                'taxIndividID', 'taxIndividID.name', 'taxIndividID.code', 'taxIndividID.codeReport'
              ])
              .orderBy('accrualID.employeeNumberID.employeeID.fullFIO')
              .orderBy('accrualID.payElID.description')
              .selectAsObject({
                'SUM([taxSum])': 'paySum',
                'accrualID.payElID': 'payElID',
                'accrualID.payElID.description': 'payElDescription',
                'accrualID.periodSalaryID': 'periodSalaryID',
                'accrualID.periodSalaryID.name': 'periodSalary',
                'accrualID.employeeNumberID': 'employeeNumberID',
                'accrualID.employeeNumberID.employeeID.fullFIO': 'fullFIO',
                'accrualID.employeeNumberID.tabNum': 'tabNum',
                'taxIndividID.name': 'name',
                'taxIndividID.code': 'code',
                'taxIndividID.codeReport': 'codeReport'
              })
          const taxIndividAccCopy = params.isTotal
            ? UB.Repository('hr_taxIndividAccCopy')
              .attrs(['accrualID.payElID', 'accrualID.payElID.description', 'accrualID.periodSalaryID', 'accrualID.periodSalaryID.name',
                'taxIndividID', 'taxIndividID.name', 'taxIndividID.code', 'taxIndividID.codeReport', 'SUM([taxSum])'])
              .where('accrualID.orgID', '=', orgID)
              .where('accrualID.periodCalcID', '=', period.ID)
              .where(`(([accrualID.flagsRec] & 4096 = 0) AND ([accrualID.flagsRec] & 1048576 = 0)) `, 'custom')
              .groupBy(['accrualID.payElID', 'accrualID.payElID.description', 'accrualID.periodSalaryID', 'accrualID.periodSalaryID.name',
                'taxIndividID', 'taxIndividID.name', 'taxIndividID.code', 'taxIndividID.codeReport'
              ])
              .orderBy('accrualID.payElID.description')
              .selectAsObject({
                'SUM([taxSum])': 'paySum',
                'accrualID.payElID': 'payElID',
                'accrualID.payElID.description': 'payElDescription',
                'accrualID.periodSalaryID': 'periodSalaryID',
                'accrualID.periodSalaryID.name': 'periodSalary',
                'taxIndividID.name': 'name',
                'taxIndividID.code': 'code',
                'taxIndividID.codeReport': 'codeReport'
              })
            : UB.Repository('hr_taxIndividAccCopy')
              .attrs(['accrualID.payElID', 'accrualID.payElID.description', 'accrualID.periodSalaryID', 'accrualID.periodSalaryID.name',
                'accrualID.employeeNumberID', 'accrualID.employeeNumberID.employeeID.fullFIO', 'accrualID.employeeNumberID.tabNum',
                'taxIndividID', 'taxIndividID.name', 'taxIndividID.code', 'taxIndividID.codeReport', 'SUM([taxSum])'])
              .where('accrualID.orgID', '=', orgID)
              .where('accrualID.periodCalcID', '=', period.ID)
              .where(`(([accrualID.flagsRec] & 4096 = 0) AND ([accrualID.flagsRec] & 1048576 = 0)) `, 'custom')
              .groupBy(['accrualID.payElID', 'accrualID.payElID.description', 'accrualID.periodSalaryID', 'accrualID.periodSalaryID.name',
                'accrualID.employeeNumberID', 'accrualID.employeeNumberID.employeeID.fullFIO', 'accrualID.employeeNumberID.tabNum',
                'taxIndividID', 'taxIndividID.name', 'taxIndividID.code', 'taxIndividID.codeReport'
              ])
              .orderBy('accrualID.employeeNumberID.employeeID.fullFIO')
              .orderBy('accrualID.payElID.description')
              .selectAsObject({
                'SUM([taxSum])': 'paySum',
                'accrualID.payElID': 'payElID',
                'accrualID.payElID.description': 'payElDescription',
                'accrualID.periodSalaryID': 'periodSalaryID',
                'accrualID.periodSalaryID.name': 'periodSalary',
                'accrualID.employeeNumberID': 'employeeNumberID',
                'accrualID.employeeNumberID.employeeID.fullFIO': 'fullFIO',
                'accrualID.employeeNumberID.tabNum': 'tabNum',
                'taxIndividID.name': 'name',
                'taxIndividID.code': 'code',
                'taxIndividID.codeReport': 'codeReport'
              })

          taxIndividAcc.forEach(row => {
            const existRow = taxIndividAccCopy.find(o => o.payElID === row.payElID && o.periodSalaryID === row.periodSalaryID && (params.isTotal || o.employeeNumberID === row.employeeNumberID) && o.taxIndividID === row.taxIndividID) || {}
            if (row.paySum && row.paySum !== existRow.paySum) {
              reportData.push({
                orgID,
                orgName: org.name || '',
                periodCalcID: period.ID,
                periodCalc: period.name,
                periodSalaryID: row.periodSalaryID,
                periodSalary: row.periodSalary,
                employeeNumberID: row.employeeNumberID,
                tabNum: row.tabNum,
                fullFIO: row.fullFIO,
                tableType: params.isTotal ? `Підсумки (Деталізація розрахунку податків)` : `Деталізація розрахунку податків`,
                listType: 'isTaxIndivid',
                description: row.payElDescription,
                additional: `${row.codeReport || row.code}-${row.name}`,
                payElID: row.payElID,
                paySum: row.paySum,
                copyPaySum: existRow.paySum || 0,
                copyDate: exsistsCopy.copyDate
              })
              orgMessage = true
            }
            if (row.paySum) {
              existRow.check = true
            }
          })
          taxIndividAccCopy.forEach(row => {
            if (row.paySum && !row.check) {
              reportData.push({
                orgID,
                orgName: org.name || '',
                periodCalcID: period.ID,
                periodCalc: period.name,
                periodSalaryID: row.periodSalaryID,
                periodSalary: row.periodSalary,
                employeeNumberID: row.employeeNumberID,
                tabNum: row.tabNum,
                fullFIO: row.fullFIO,
                tableType: params.isTotal ? `Підсумки (Деталізація розрахунку податків)` : `Деталізація розрахунку податків`,
                listType: 'isTaxIndivid',
                description: row.payElDescription,
                additional: `${row.codeReport || row.code}-${row.name}`,
                payElID: row.payElID,
                paySum: 0,
                copyPaySum: row.paySum,
                copyDate: exsistsCopy.copyDate
              })
              orgMessage = true
            }
          })
        }
        const resAccrualFund = {}
        if (params.isAccrualFund) {
          const accrualFund = params.isTotal
            ? UB.Repository('hr_accrualFund')
              .attrs(['payFundID', 'payFundID.description', 'periodSalaryID', 'periodSalaryID.name', 'SUM(ROUND([paySum],2))'])
              .where('orgID', '=', orgID)
              .where('periodCalcID', '=', period.ID)
              .whereIf(params.payFundID, 'payFundID', '=', params.payFundID)
              .whereIf(params.periodSalaryID, 'periodSalaryID', '=', params.periodSalaryID)
              .groupBy(['payFundID', 'payFundID.description', 'periodSalaryID', 'periodSalaryID.name'])
              .orderBy('payFundID.description')
              .selectAsObject({
                'SUM(ROUND([paySum],2))': 'paySum'
              })
            : UB.Repository('hr_accrualFund')
              .attrs(['payFundID', 'payFundID.description', 'periodSalaryID', 'periodSalaryID.name', 'employeeNumberID', 'employeeNumberID.employeeID.fullFIO', 'employeeNumberID.tabNum', 'SUM(ROUND([paySum],2))'])
              .where('orgID', '=', orgID)
              .where('periodCalcID', '=', period.ID)
              .whereIf(params.payFundID, 'payFundID', '=', params.payFundID)
              .whereIf(params.periodSalaryID, 'periodSalaryID', '=', params.periodSalaryID)
              .groupBy(['payFundID', 'payFundID.description', 'periodSalaryID', 'periodSalaryID.name', 'employeeNumberID', 'employeeNumberID.employeeID.fullFIO', 'employeeNumberID.tabNum'])
              .orderBy('employeeNumberID.employeeID.fullFIO')
              .orderBy('payFundID.description')
              .selectAsObject({
                'SUM(ROUND([paySum],2))': 'paySum',
                'employeeNumberID.employeeID.fullFIO': 'fullFIO',
                'employeeNumberID.tabNum': 'tabNum'
              })
          const accrualFundCopy = params.isTotal
            ? UB.Repository('hr_accrualFundCopy')
              .attrs(['payFundID', 'payFundID.description', 'periodSalaryID', 'periodSalaryID.name', 'SUM(ROUND([paySum],2))'])
              .where('orgID', '=', orgID)
              .where('periodCalcID', '=', period.ID)
              .whereIf(params.payFundID, 'payFundID', '=', params.payFundID)
              .whereIf(params.periodSalaryID, 'periodSalaryID', '=', params.periodSalaryID)
              .groupBy(['payFundID', 'payFundID.description', 'periodSalaryID', 'periodSalaryID.name'])
              .orderBy('payFundID.description')
              .selectAsObject({
                'SUM(ROUND([paySum],2))': 'paySum'
              })
            : UB.Repository('hr_accrualFundCopy')
              .attrs(['payFundID', 'payFundID.description', 'periodSalaryID', 'periodSalaryID.name', 'employeeNumberID', 'employeeNumberID.employeeID.fullFIO', 'employeeNumberID.tabNum', 'SUM(ROUND([paySum],2))'])
              .where('orgID', '=', orgID)
              .where('periodCalcID', '=', period.ID)
              .whereIf(params.payFundID, 'payFundID', '=', params.payFundID)
              .whereIf(params.periodSalaryID, 'periodSalaryID', '=', params.periodSalaryID)
              .groupBy(['payFundID', 'payFundID.description', 'periodSalaryID', 'periodSalaryID.name', 'employeeNumberID', 'employeeNumberID.employeeID.fullFIO', 'employeeNumberID.tabNum'])
              .orderBy('payFundID.description')
              .orderBy('employeeNumberID.employeeID.fullFIO')
              .orderBy('payFundID.description')
              .selectAsObject({
                'SUM(ROUND([paySum],2))': 'paySum',
                'employeeNumberID.employeeID.fullFIO': 'fullFIO',
                'employeeNumberID.tabNum': 'tabNum'
              })

          accrualFund.forEach(row => {
            const existRow = accrualFundCopy.find(o => o.payFundID === row.payFundID && o.periodSalaryID === row.periodSalaryID && (params.isTotal || o.employeeNumberID === row.employeeNumberID)) || {}
            if (row.paySum && row.paySum !== existRow.paySum) {
              if (isLog && !resAccrualFund[row.payFundID]) {
                resAccrualFund[row.payFundID] = { paySum: 0, copyPaySum: 0 }
              }
              reportData.push({
                orgID,
                orgName: org.name || '',
                periodCalcID: period.ID,
                periodCalc: period.name,
                periodSalaryID: row.periodSalaryID,
                periodSalary: row['periodSalaryID.name'],
                employeeNumberID: params.isTotal ? null : row.employeeNumberID,
                tabNum: params.isTotal ? null : row.tabNum,
                fullFIO: params.isTotal ? null : row.fullFIO,
                tableType: params.isTotal ? `Підсумки (Нарахування на ЗП)` : `Нарахування на ЗП`,
                listType: 'isAccrualFund',
                description: row['payFundID.description'],
                payFundID: row.payFundID,
                paySum: row.paySum,
                copyPaySum: existRow.paySum || 0,
                copyDate: exsistsCopy.copyDate
              })
              orgMessage = true
              if (isLog) {
                resAccrualFund[row.payFundID].paySum += row.paySum
                resAccrualFund[row.payFundID].copyPaySum += existRow.paySum || 0
              }
            }
            if (row.paySum) {
              existRow.check = true
            }
          })
          accrualFundCopy.forEach(row => {
            if (row.paySum && !row.check) {
              if (isLog && !resAccrualFund[row.payFundID]) {
                resAccrualFund[row.payFundID] = { paySum: 0, copyPaySum: 0 }
              }
              if (isLog) {
                resAccrualFund[row.payFundID].copyPaySum += row.paySum
              }
              reportData.push({
                orgID,
                orgName: org.name || '',
                periodCalcID: period.ID,
                periodCalc: period.name,
                periodSalaryID: row.periodSalaryID,
                periodSalary: row['periodSalaryID.name'],
                employeeNumberID: params.isTotal ? null : row.employeeNumberID,
                tabNum: params.isTotal ? null : row.tabNum,
                fullFIO: params.isTotal ? null : row.fullFIO,
                tableType: params.isTotal ? `Підсумки (Нарахування на ЗП)` : `Нарахування на ЗП`,
                listType: 'isAccrualFund',
                description: row['payFundID.description'],
                payFundID: row.payFundID,
                paySum: 0,
                copyPaySum: row.paySum,
                copyDate: exsistsCopy.copyDate
              })
              orgMessage = true
            }
          })
          if (isLog) {
            let resSum = 0
            Object.keys(resAccrualFund).forEach(payFundID => {
              resAccrualFund[payFundID].sum = resAccrualFund[payFundID].copyPaySum - resAccrualFund[payFundID].paySum
              resSum += resAccrualFund[payFundID].sum
            })
            console.log(resSum)
          }
        }

        detailIDs = []
        if (params.isAccrualFundDt) {
          const resAccrualFundDt = {}
          const reportDtData = []
          const accrualDt = params.isTotal
            ? UB.Repository('hr_accrualFundDt')
              .attrs(['accrualFundID.payFundID', 'accrualFundID.payFundID.description', 'accrualFundID.periodSalaryID', 'accrualFundID.periodSalaryID.name',
                'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'departmentID', 'accountID',
                'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
                'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
                'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description', 'accountID.code',
                'SUM(ROUND([paySum],2))'])
              .where('accrualFundID.orgID', '=', orgID)
              .where('accrualFundID.periodCalcID', '=', period.ID)
              .whereIf(params.payElID, 'accrualFundID.payElID', '=', params.payElID)
              .whereIf(params.periodSalaryID, 'accrualFundID.periodSalaryID', '=', params.periodSalaryID)
              .groupBy(['accrualFundID.payFundID', 'accrualFundID.payFundID.description', 'accrualFundID.periodSalaryID', 'accrualFundID.periodSalaryID.name',
                'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'departmentID', 'accountID',
                'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
                'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
                'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description', 'accountID.code'
              ])
              .orderBy('accrualFundID.payFundID.description')
              .selectAsObject({
                'SUM(ROUND([paySum],2))': 'paySum',
                'accrualFundID.payFundID': 'payFundID',
                'accrualFundID.payFundID.description': 'payFundDescription',
                'accrualFundID.periodSalaryID': 'periodSalaryID',
                'accrualFundID.periodSalaryID.name': 'periodSalary'
              })
            : UB.Repository('hr_accrualFundDt')
              .attrs(['accrualFundID.payFundID', 'accrualFundID.payFundID.description', 'accrualFundID.periodSalaryID', 'accrualFundID.periodSalaryID.name',
                'accrualFundID.employeeNumberID', 'accrualFundID.employeeNumberID.employeeID.fullFIO', 'accrualFundID.employeeNumberID.tabNum',
                'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'departmentID', 'accountID',
                'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
                'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
                'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description', 'accountID.code',
                'SUM(ROUND([paySum],2))'])
              .where('accrualFundID.orgID', '=', orgID)
              .where('accrualFundID.periodCalcID', '=', period.ID)
              .whereIf(params.payElID, 'accrualFundID.payElID', '=', params.payElID)
              .whereIf(params.periodSalaryID, 'accrualFundID.periodSalaryID', '=', params.periodSalaryID)
              .groupBy(['accrualFundID.payFundID', 'accrualFundID.payFundID.description', 'accrualFundID.periodSalaryID', 'accrualFundID.periodSalaryID.name',
                'accrualFundID.employeeNumberID', 'accrualFundID.employeeNumberID.employeeID.fullFIO', 'accrualFundID.employeeNumberID.tabNum',
                'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'departmentID', 'accountID',
                'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
                'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
                'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description', 'accountID.code'
              ])
              .orderBy('accrualFundID.employeeNumberID.employeeID.fullFIO')
              .orderBy('accrualFundID.payFundID.description')
              .selectAsObject({
                'SUM(ROUND([paySum],2))': 'paySum',
                'accrualFundID.payFundID': 'payFundID',
                'accrualFundID.payFundID.description': 'payFundDescription',
                'accrualFundID.periodSalaryID': 'periodSalaryID',
                'accrualFundID.periodSalaryID.name': 'periodSalary',
                'accrualFundID.employeeNumberID': 'employeeNumberID',
                'accrualFundID.employeeNumberID.employeeID.fullFIO': 'fullFIO',
                'accrualFundID.employeeNumberID.tabNum': 'tabNum'
              })
          const accrualDtCopy = params.isTotal
            ? UB.Repository('hr_accrualFundDtCopy')
              .attrs(['accrualFundID.payFundID', 'accrualFundID.payFundID.description', 'accrualFundID.periodSalaryID', 'accrualFundID.periodSalaryID.name',
                'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'departmentID', 'accountID',
                'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
                'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
                'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description', 'accountID.code',
                'SUM(ROUND([paySum],2))'])
              .where('accrualFundID.orgID', '=', orgID)
              .where('accrualFundID.periodCalcID', '=', period.ID)
              .whereIf(params.payElID, 'accrualFundID.payElID', '=', params.payElID)
              .whereIf(params.periodSalaryID, 'accrualFundID.periodSalaryID', '=', params.periodSalaryID)
              .groupBy(['accrualFundID.payFundID', 'accrualFundID.payFundID.description', 'accrualFundID.periodSalaryID', 'accrualFundID.periodSalaryID.name',
                'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'departmentID', 'accountID',
                'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
                'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
                'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description', 'accountID.code'
              ])
              .orderBy('accrualFundID.payFundID.description')
              .selectAsObject({
                'SUM(ROUND([paySum],2))': 'paySum',
                'accrualFundID.payFundID': 'payFundID',
                'accrualFundID.payFundID.description': 'payFundDescription',
                'accrualFundID.periodSalaryID': 'periodSalaryID',
                'accrualFundID.periodSalaryID.name': 'periodSalary'
              })
            : UB.Repository('hr_accrualFundDtCopy')
              .attrs(['accrualFundID.payFundID', 'accrualFundID.payFundID.description', 'accrualFundID.periodSalaryID', 'accrualFundID.periodSalaryID.name',
                'accrualFundID.employeeNumberID', 'accrualFundID.employeeNumberID.employeeID.fullFIO', 'accrualFundID.employeeNumberID.tabNum',
                'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'departmentID', 'accountID',
                'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
                'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
                'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description', 'accountID.code',
                'SUM(ROUND([paySum],2))'])
              .where('accrualFundID.orgID', '=', orgID)
              .where('accrualFundID.periodCalcID', '=', period.ID)
              .whereIf(params.payElID, 'accrualFundID.payElID', '=', params.payElID)
              .whereIf(params.periodSalaryID, 'accrualFundID.periodSalaryID', '=', params.periodSalaryID)
              .groupBy(['accrualFundID.payFundID', 'accrualFundID.payFundID.description', 'accrualFundID.periodSalaryID', 'accrualFundID.periodSalaryID.name',
                'accrualFundID.employeeNumberID', 'accrualFundID.employeeNumberID.employeeID.fullFIO', 'accrualFundID.employeeNumberID.tabNum',
                'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'departmentID', 'accountID',
                'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
                'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
                'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description', 'accountID.code'
              ])
              .orderBy('accrualFundID.employeeNumberID.employeeID.fullFIO')
              .orderBy('accrualFundID.payFundID.description')
              .selectAsObject({
                'SUM(ROUND([paySum],2))': 'paySum',
                'accrualFundID.payFundID': 'payFundID',
                'accrualFundID.payFundID.description': 'payFundDescription',
                'accrualFundID.periodSalaryID': 'periodSalaryID',
                'accrualFundID.periodSalaryID.name': 'periodSalary',
                'accrualFundID.employeeNumberID': 'employeeNumberID',
                'accrualFundID.employeeNumberID.employeeID.fullFIO': 'fullFIO',
                'accrualFundID.employeeNumberID.tabNum': 'tabNum'
              })
          const baseDims = ['accountID.code', 'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description']
          const dimsValue = ['d0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value']
          accrualDt.forEach(row => {
            const existRow = accrualDtCopy.find(o => o.payFundID === row.payFundID && o.periodSalaryID === row.periodSalaryID && (params.isTotal || o.employeeNumberID === row.employeeNumberID) &&
              o.dictFundSourceID === row.dictFundSourceID && o.dictProjectID === row.dictProjectID && o.dictProgClassID === row.dictProgClassID && o.departmentID === row.departmentID &&
              o.accountID === row.accountID && o.d0 === row.d0 && o.d1 === row.d1 && o.d2 === row.d2 && o.d3 === row.d3 && o.d4 === row.d4 && o.d5 === row.d5 && o.d6 === row.d6 &&
              o.d7 === row.d7 && o.d8 === row.d8 && o.d9 === row.d9 && o.d0Value === row.d0Value && o.d1Value === row.d1Value && o.d2Value === row.d2Value && o.d3Value === row.d3Value &&
              o.d4Value === row.d4Value && o.d5Value === row.d5Value && o.d6Value === row.d6Value && o.d7Value === row.d7Value && o.d8Value === row.d8Value && o.d9Value === row.d9Value
            ) || {}
            if (row.paySum && row.paySum !== existRow.paySum) {
              if (isLog && !resAccrualFundDt[row.payFundID]) {
                resAccrualFundDt[row.payFundID] = { paySum: 0, copyPaySum: 0 }
              }
              const additionalArray = []
              baseDims.forEach(dName => {
                if (row[dName]) {
                  additionalArray.push(row[dName])
                }
              })
              const detailData = []
              dimsValue.forEach(dName => {
                if (row[dName]) {
                  detailData.push(row[dName])
                  if (!detailValues[row[dName]]) {
                    detailValues[row[dName]] = row[dName]
                    detailIDs.push(row[dName])
                  }
                }
              })
              reportDtData.push({
                orgID,
                orgName: org.name || '',
                periodCalcID: period.ID,
                periodCalc: period.name,
                periodSalaryID: row.periodSalaryID,
                periodSalary: row.periodSalary,
                employeeNumberID: params.isTotal ? null : row.employeeNumberID,
                tabNum: params.isTotal ? null : row.tabNum,
                fullFIO: params.isTotal ? null : row.fullFIO,
                tableType: params.isTotal ? `Підсумки (Деталізація нарахування на зарплату)` : `Деталізація нарахування на зарплату`,
                listType: 'isAccrualFundDt',
                description: row.payFundDescription,
                payFundID: row.payFundID,
                paySum: row.paySum,
                copyPaySum: existRow.paySum || 0,
                additional: additionalArray.join(', '),
                copyDate: exsistsCopy.copyDate,
                detailData
              })
              if (isLog) {
                resAccrualFundDt[row.payFundID].paySum += row.paySum
                resAccrualFundDt[row.payFundID].copyPaySum += existRow.paySum || 0
              }
              orgMessage = true
            }
            if (row.paySum) {
              existRow.check = true
            }
          })
          accrualDtCopy.forEach(row => {
            if (row.paySum && !row.check) {
              if (isLog && !resAccrualFundDt[row.payFundID]) {
                resAccrualFundDt[row.payFundID] = { paySum: 0, copyPaySum: 0 }
              }
              const additionalArray = []
              baseDims.forEach(dName => {
                if (row[dName]) {
                  additionalArray.push(row[dName])
                }
              })
              const detailData = []
              dimsValue.forEach(dName => {
                if (row[dName]) {
                  detailData.push(row[dName])
                  if (!detailValues[row[dName]]) {
                    detailValues[row[dName]] = row[dName]
                    detailIDs.push(row[dName])
                  }
                }
              })
              reportDtData.push({
                orgID,
                orgName: org.name || '',
                periodCalcID: period.ID,
                periodCalc: period.name,
                periodSalaryID: row.periodSalaryID,
                periodSalary: row.periodSalary,
                employeeNumberID: params.isTotal ? null : row.employeeNumberID,
                tabNum: params.isTotal ? null : row.tabNum,
                fullFIO: params.isTotal ? null : row.fullFIO,
                tableType: params.isTotal ? `Підсумки (Деталізація нарахування на зарплату)` : `Деталізація нарахування на зарплату`,
                listType: 'isAccrualFundDt',
                description: row.payFundDescription,
                payFundID: row.payFundID,
                paySum: 0,
                copyPaySum: row.paySum,
                additional: additionalArray.join(', '),
                copyDate: exsistsCopy.copyDate,
                detailData
              })
              if (isLog) {
                resAccrualFundDt[row.payFundID].copyPaySum += row.paySum
              }
              orgMessage = true
            }
          })
          const detail = UB.Repository('gl_dimValue').attrs(['ID', 'caption']).where('ID', 'in', detailIDs).selectAsObject()
          detail.forEach(row => {
            detailValues[row.ID] = row.caption
          })
          reportDtData.forEach(row => {
            if (row.detailData && row.detailData.length) {
              row.detailData.forEach(d => {
                if (detailValues[d]) {
                  row.additional += `, ${detailValues[d]}`
                }
              })
            }
            delete row.detailData
            if (!params.additional || params.additional === row.additional) {
              reportData.push(row)
            }
          })
          if (isLog) {
            let resSum = 0
            Object.keys(resAccrualFundDt).forEach(payFundID => {
              resAccrualFundDt[payFundID].sum = resAccrualFundDt[payFundID].copyPaySum - resAccrualFundDt[payFundID].paySum
              resSum += resAccrualFundDt[payFundID].sum
            })
          }
        }
        if (!orgMessage) {
          reportData.push({
            orgID,
            orgName: org.name || '',
            periodCalcID: period.ID,
            periodCalc: period.name,
            description: `Розбіжності відсутні`
          })
        }
      }
    }
  })
  ctx.mParams.resultData = JSON.stringify(reportData)
}
