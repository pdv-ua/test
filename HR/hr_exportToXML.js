const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const xml2js = require('xml2js')
const iconv = require('iconv-lite')

me.entity.addMethod('export')

me.export = function (ctx) {
  let data = JSON.parse(ctx.mParams.params.data)
  let res = generateXMLBase64(data)
  ctx.mParams.result = JSON.stringify({ dataXML: res, xmlFileName: `${generateFileName(data.DECLAR.DECLARHEAD)}.xml` })
  return true
}

function generateXMLBase64 (data) {
  const xml = generateXML(data)
  const buffer = iconv.encode(xml, 'win1251')
  return Buffer.from(buffer).toString('base64')
}

function generateXML (data) {
  const builder = new xml2js.Builder({
    xmldec: { include: true, encoding: 'windows-1251', version: '1.0', standalone: false }
  })
  return builder.buildObject(data)
}

function generateFileName (params) {
  return [
    zeroFill(params.C_REG, 2),
    zeroFill(params.C_RAJ, 2),
    zeroFill(params.TIN, 10),
    zeroFill(params.C_DOC, 3),
    zeroFill(params.C_DOC_SUB, 3),
    zeroFill(params.C_DOC_VER, 2),
    zeroFill(params.C_DOC_STAN, 1),
    zeroFill(params.C_DOC_TYPE, 2),
    zeroFill(params.C_DOC_CNT, 7),
    zeroFill(params.PERIOD_TYPE, 1),
    zeroFill(params.PERIOD_MONTH, 2),
    zeroFill(params.PERIOD_YEAR, 4),
    zeroFill(params.C_STI_ORIG, 4)
  ].join('')
}

function zeroFill (number = 0, width) {
  if (typeof number === 'object') {
    number = 0
  }
  return ('0000000000' + number).slice(-width)
}
