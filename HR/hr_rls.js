/* global RLS */
const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session

RLS.byOrderRegistryOrganization = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.ID) {
    let whereList = mParams.whereList
    if (!whereList) {
      mParams.whereList = {}
      whereList = mParams.whereList
    }
    if (Session.uData.userOrg) {
      if (!Array.isArray(Session.uData.userOrg) || !Session.uData.userOrg.length) {
        Session.uData.userOrg = [0]
      }
      whereList.rlsOrganizationID = {
        expression: '[orderRegistryID.organizationID]',
        condition: 'in',
        value: Session.uData.userOrg
      }
    }
  }
}

RLS.byOrderRegistryOrgAndEmpNum = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.ID) {
    let whereList = mParams.whereList
    if (!whereList) {
      mParams.whereList = {}
      whereList = mParams.whereList
    }

    if (!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')) {
      whereList.limitedAccess = {
        expression: '[employeeNumberID.limitedAccess]',
        condition: 'equal',
        value: 0
      }
    }
    if (Session.uData.userOrg) {
      if (!Array.isArray(Session.uData.userOrg) || !Session.uData.userOrg.length) {
        Session.uData.userOrg = [0]
      }
      whereList.rlsOrganizationID = {
        expression: '[orderRegistryID.organizationID]',
        condition: 'in',
        value: Session.uData.userOrg
      }
    }
  }
}

RLS.byEmpOrderOrganization = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.ID) {
    let whereList = mParams.whereList
    if (!whereList) {
      mParams.whereList = {}
      whereList = mParams.whereList
    }
    if (Session.uData.userOrg) {
      if (!Array.isArray(Session.uData.userOrg) || !Session.uData.userOrg.length) {
        Session.uData.userOrg = [0]
      }
      whereList.rlsOrganizationID = {
        expression: '[organizationID]',
        condition: 'in',
        value: Session.uData.userOrg
      }
      whereList.rlsMasterOrganizationID = {
        expression: '[masterOrganizationID]',
        condition: 'in',
        value: Session.uData.userOrg
      }
      if (mParams.logicalPredicates) {
        const lp = [...mParams.logicalPredicates]
        if (lp.indexOf('([rlsOrganizationID] OR [rlsMasterOrganizationID])') === -1) {
          mParams.logicalPredicates = [...mParams.logicalPredicates, `([rlsOrganizationID] OR [rlsMasterOrganizationID])`]
        }
      } else {
        mParams.logicalPredicates = ['([rlsOrganizationID] OR [rlsMasterOrganizationID])']
      }
    }
  }
}
