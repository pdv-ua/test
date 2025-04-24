const UB = require('@unitybase/ub')
const exportEndpoints = require('./modules/export/exportEndpoints')
UB.loadLegacyModules(__dirname)

// const cryptoService = require('@ub-d/crypto-service').cryptoService
// App.registerEndpoint('cryptoService', cryptoService, false)
exportEndpoints.initEndpoints()
