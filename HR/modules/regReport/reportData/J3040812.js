const UB = require('@unitybase/ub')
const _ = require('lodash')
const moment = require('moment')
const { generateFileName, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')

module.exports = {
  generateData,
  exportConfig: ['xml'],
  xmlExport
}

function generateData (params = {}) {
  const errorMessages = []
  const data = structureReport()
  prepareData({ data, params })
  prepareParams(params)
  return { data, errorMessages }
}

function prepareParams (params) {

}

const allBodyAttrNames = [
  'HNAME', 'HTIN', 'HKOATUU_S', 'HKOATUU', 'HKOPFG', 'KPKDB', 'KVKDB', 'KPKMB', 'KVKMB', 'R010G4', 'R010G5', 'R010G6', 'R010G7', 'R010G8', 'R010G9', 'R020G4', 'R020G5', 'R020G6', 'R020G7', 'R020G8', 'R020G9', 'R030G4', 'R030G5', 'R030G6', 'R030G7', 'R030G8', 'R030G9', 'R040G4', 'R040G5', 'R040G6', 'R040G7', 'R040G8', 'R040G9', 'R050G4', 'R050G5', 'R050G6', 'R050G7', 'R050G8', 'R050G9', 'R060G4', 'R060G5', 'R060G6', 'R060G7', 'R060G8', 'R060G9', 'R070G4', 'R070G5', 'R070G6', 'R070G7', 'R070G8', 'R070G9', 'R080G4', 'R080G5', 'R080G6', 'R080G7', 'R080G8', 'R080G9', 'R090G4', 'R090G5', 'R090G6', 'R090G7', 'R090G8', 'R090G9', 'R100G4', 'R100G5', 'R100G6', 'R100G7', 'R100G8', 'R100G9', 'R110G4', 'R110G5', 'R110G6', 'R110G7', 'R110G8', 'R110G9', 'R120G4', 'R120G5', 'R120G6', 'R120G7', 'R120G8', 'R120G9', 'R130G4', 'R130G5', 'R130G6', 'R130G7', 'R130G8', 'R130G9', 'R140G4', 'R140G5', 'R140G6', 'R140G7', 'R140G8', 'R140G9', 'R150G4', 'R150G5', 'R150G6', 'R150G7', 'R150G8', 'R150G9', 'R160G4', 'R160G5', 'R160G6', 'R160G7', 'R160G8', 'R160G9', 'R170G4', 'R170G5', 'R170G6', 'R170G7', 'R170G8', 'R170G9', 'R180G4', 'R180G5', 'R180G6', 'R180G7', 'R180G8', 'R180G9', 'R190G4', 'R190G5', 'R190G6', 'R190G7', 'R190G8', 'R190G9', 'R200G4', 'R200G5', 'R200G6', 'R200G7', 'R200G8', 'R200G9', 'R210G4', 'R210G5', 'R210G6', 'R210G7', 'R210G8', 'R210G9', 'R220G4', 'R220G5', 'R220G6', 'R220G7', 'R220G8', 'R220G9', 'R230G4', 'R230G5', 'R230G6', 'R230G7', 'R230G8', 'R230G9', 'R240G4', 'R240G5', 'R240G6', 'R240G7', 'R240G8', 'R240G9', 'R250G4', 'R250G5', 'R250G6', 'R250G7', 'R250G8', 'R250G9', 'R260G4', 'R260G5', 'R260G6', 'R260G7', 'R260G8', 'R260G9', 'R270G4', 'R270G5', 'R270G6', 'R270G7', 'R270G8', 'R270G9', 'R280G4', 'R280G5', 'R280G6', 'R280G7', 'R280G8', 'R280G9', 'R290G4', 'R290G5', 'R290G6', 'R290G7', 'R290G8', 'R290G9', 'R300G4', 'R300G5', 'R300G6', 'R300G7', 'R300G8', 'R300G9', 'R310G4', 'R310G5', 'R310G6', 'R310G7', 'R310G8', 'R310G9', 'R320G4', 'R320G5', 'R320G6', 'R320G7', 'R320G8', 'R320G9', 'R330G4', 'R330G5', 'R330G6', 'R330G7', 'R330G8', 'R330G9', 'R340G4', 'R340G5', 'R340G6', 'R340G7', 'R340G8', 'R340G9', 'R350G4', 'R350G5', 'R350G6', 'R350G7', 'R350G8', 'R350G9', 'R360G4', 'R360G5', 'R360G6', 'R360G7', 'R360G8', 'R360G9', 'R370G4', 'R370G5', 'R370G6', 'R370G7', 'R370G8', 'R370G9', 'R380G4', 'R380G5', 'R380G6', 'R380G7', 'R380G8', 'R380G9', 'R390G4', 'R390G5', 'R390G6', 'R390G7', 'R390G8', 'R390G9', 'R400G4', 'R400G5', 'R400G6', 'R400G7', 'R400G8', 'R400G9', 'R410G4', 'R410G5', 'R410G6', 'R410G7', 'R410G8', 'R410G9', 'R420G4', 'R420G5', 'R420G6', 'R420G7', 'R420G8', 'R420G9', 'R430G4', 'R430G5', 'R430G6', 'R430G7', 'R430G8', 'R430G9', 'R440G4', 'R440G5', 'R440G6', 'R440G7', 'R440G8', 'R440G9', 'R450G4', 'R450G5', 'R450G6', 'R450G7', 'R450G8', 'R450G9', 'R460G4', 'R460G5', 'R460G6', 'R460G7', 'R460G8', 'R460G9', 'R470G4', 'R470G5', 'R470G6', 'R470G7', 'R470G8', 'R470G9', 'R480G4', 'R480G5', 'R480G6', 'R480G7', 'R480G8', 'R480G9', 'R490G4', 'R490G5', 'R490G6', 'R490G7', 'R490G8', 'R490G9', 'R500G4', 'R500G5', 'R500G6', 'R500G7', 'R500G8', 'R500G9', 'R510G4', 'R510G5', 'R510G6', 'R510G7', 'R510G8', 'R510G9', 'R520G4', 'R520G5', 'R520G6', 'R520G7', 'R520G8', 'R520G9', 'R530G4', 'R530G5', 'R530G6', 'R530G7', 'R530G8', 'R530G9', 'R540G4', 'R540G5', 'R540G6', 'R540G7', 'R540G8', 'R540G9', 'R550G4', 'R550G5', 'R550G6', 'R550G7', 'R550G8', 'R550G9', 'R560G4', 'R560G5', 'R560G6', 'R560G7', 'R560G8', 'R560G9', 'R570G4', 'R570G5', 'R570G6', 'R570G7', 'R570G8', 'R570G9', 'R580G4', 'R580G5', 'R580G6', 'R580G7', 'R580G8', 'R580G9', 'R590G4', 'R590G5', 'R590G6', 'R590G7', 'R590G8', 'R590G9', 'R600G4', 'R600G5', 'R600G6', 'R600G7', 'R600G8', 'R600G9', 'R610G4', 'R610G5', 'R610G6', 'R610G7', 'R610G8', 'R610G9', 'R620G4', 'R620G5', 'R620G6', 'R620G7', 'R620G8', 'R620G9', 'R630G4', 'R630G5', 'R630G6', 'R630G7', 'R630G8', 'R630G9', 'R650G4', 'R650G5', 'R650G6', 'R650G7', 'R650G8', 'R650G9', 'HBOS', 'HBUH', 'HFILL'
]

function prepareData ({ data, params }) {
  const { DECLARBODY, DECLARHEAD } = data.DECLAR
  const headKeys = Object.keys(DECLARHEAD)
  const bodyKeys = Object.keys(DECLARBODY)
  _.forEach(params, (value, key) => (headKeys.indexOf(key) > 0 && _.set(DECLARHEAD, key, value)) || true)
  _.forEach(params, (value, key) => (bodyKeys.indexOf(key) > 0 && _.set(DECLARBODY, key, value)) || true)

  DECLARHEAD.C_DOC_TYPE = 0
  DECLARHEAD.C_DOC_CNT = 1
  DECLARHEAD.SOFTWARE = 'A5'

  const dictSprSti = UB.Repository('ac_dictSprSti')
    .attrs(['cReg', 'cRaj', 'hksti'])
    .selectById(params.dictSprStiID || null) || {}
  DECLARHEAD.C_REG = dictSprSti.cReg
  DECLARHEAD.C_RAJ = dictSprSti.cRaj
  DECLARHEAD.C_STI_ORIG = dictSprSti.hksti

  const repVersion = UB.Repository('ac_dictRepVersion')
    .attrs(['code', 'subCode', 'version'])
    .selectById(params.dictRepVersionID || null) || {}
  DECLARHEAD.C_DOC = repVersion.code
  DECLARHEAD.C_DOC_SUB = repVersion.subCode
  DECLARHEAD.C_DOC_VER = Number.parseInt(repVersion.version)

  const repType = UB.Repository('ac_dictRepType')
    .attrs(['periodMonth', 'periodType'])
    .selectById(params.dictRepTypeID || null) || {}
  DECLARHEAD.PERIOD_MONTH = repType.periodMonth
  DECLARHEAD.PERIOD_TYPE = repType.periodType

  const HBUH = UB.Repository('org_employee')
    .attrs(['shortFIO'])
    .selectById(params.HBUH || null) || {}
  DECLARBODY.HBUH = HBUH.shortFIO

  const HBOS = UB.Repository('org_employee')
    .attrs(['shortFIO'])
    .selectById(params.HBOS || null) || {}
  DECLARBODY.HBOS = HBOS.shortFIO
  DECLARHEAD.PERIOD_YEAR = params.PERIOD_YEAR
  DECLARBODY.HZY = String(DECLARHEAD.PERIOD_YEAR)
  const organization = UB.Repository('hr_organization')
    .attrs(['EDRPOUCode', 'name'])
    .where('mi_data_id', '=', params.organizationID || null)
    .where('state', '=', 'ACTIVE')
    .limit(1)
    .selectSingle() || {}
  DECLARHEAD.TIN = organization.EDRPOUCode
  DECLARBODY.HNAME = organization.name
  DECLARBODY.HTIN = organization.EDRPOUCode
  DECLARHEAD.D_FILL = moment().format('DDMMYYYY')
  DECLARHEAD.HFILL = dateService.formatDate(params.HFILL, 'ddmmyyyy')
  params.dateFrom = dateService.firstDayOfYear(new Date(Date.UTC(DECLARHEAD.PERIOD_YEAR, DECLARHEAD.PERIOD_MONTH - 1, 1, 0, 0, 0, 0)))
  params.dateTo = dateService.lastDayOfMonth(new Date(Date.UTC(DECLARHEAD.PERIOD_YEAR, DECLARHEAD.PERIOD_MONTH - 1, 1, 0, 0, 0, 0)))
}

function structureReport () {
  const data = {
    DECLAR: {
      $: {
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:noNamespaceSchemaLocation': 'F2DM01.xsd'
      },
      DECLARHEAD: {
        TIN: undefined,
        C_DOC: undefined,
        C_DOC_SUB: undefined,
        C_DOC_VER: undefined,
        C_DOC_TYPE: undefined,
        C_DOC_CNT: undefined,
        C_REG: undefined,
        C_RAJ: undefined,
        PERIOD_MONTH: undefined,
        PERIOD_TYPE: undefined,
        PERIOD_YEAR: undefined,
        C_STI_ORIG: undefined,
        C_DOC_STAN: undefined,
        $: {
          'xsi:nil': 'true'
        },
        D_FILL: undefined,
        SOFTWARE: undefined
      },
      DECLARBODY: {}
    }
  }
  allBodyAttrNames.forEach(cName => {
    data.DECLAR.DECLARBODY[cName] = null
  })
  return data
}

const cellFormats = [
  {
    names: ['HTIN', 'HNAME', 'HKVED', 'HLOC', 'HFILL', 'HKBOS', 'HBOS'],
    format: {
      type: 'string',
      nillable: false
    }
  },
  {
    names: ['HTIN1', 'HSPODU', 'HTEL', 'HKOPFG', 'HNREG', 'HBANKNAME', 'HBANKACC', 'R044G2S', 'R054G2S', 'HKBUH', 'HBUH'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['HZM', 'HZY', 'H01', 'H02', 'H03'],
    format: {
      type: 'number',
      nillable: false,
      precision: 0
    }
  },
  {
    names: ['HMFO', 'H014G1', 'HNACTL', 'HNACTL1', 'HNACTL2', 'HNACTL3', 'HNACTL4', 'HNACTL5', 'HNACTL6', 'HNACTL7'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    namesFn: attrName => /^R\d*X*G\d*/.test(attrName) && ['R044G2S', 'R054G2S'].indexOf(attrName) < 0,
    format: {
      type: 'number',
      nillable: true,
      precision: 2
    }
  }
]

function xmlExport ({ data }) {
  const { DECLARBODY, DECLARHEAD } = _.get(data, 'data.DECLAR', { })
  if (!(DECLARBODY && DECLARHEAD)) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не корректні дані для вивантаження')}>>>`)
  }
  const attrListHead = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'C_STI_ORIG', 'C_DOC_STAN', 'LINKED_DOCS', 'D_FILL', 'SOFTWARE']

  const firmTypeElementName = data.data.DECLAR.DECLARBODY.H01 === 1 || data.data.DECLAR.DECLARBODY.H01 === 'true'
    ? 'H01' : data.data.DECLAR.DECLARBODY.H02 === 1 || data.data.DECLAR.DECLARBODY.H02 === 'true'
      ? 'H02' : data.data.DECLAR.DECLARBODY.H03 === 1 || data.data.DECLAR.DECLARBODY.H03 === 'true' ? 'H03' : null

  const attrList = allBodyAttrNames

  if (firmTypeElementName) {
    attrList.splice(6, 0, firmTypeElementName)
  }
  const attrListExt = buildAttrsExt(attrList, cellFormats)
  const xmlData = {
    DECLAR: {
      $: JSON.parse(JSON.stringify(data.data.DECLAR.$)),
      DECLARHEAD: createDeclarAt({ declar: data.data.DECLAR.DECLARHEAD, attrList: attrListHead }),
      DECLARBODY: createDeclarExt({ declar: data.data.DECLAR.DECLARBODY, attrListExt })
    }
  }
  const xmlFileName = `${generateFileName(DECLARHEAD)}.xml`
  return { xmlData, xmlFileName }
}
