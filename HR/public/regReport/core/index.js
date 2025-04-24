
module.exports = {
  generateFileName
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
