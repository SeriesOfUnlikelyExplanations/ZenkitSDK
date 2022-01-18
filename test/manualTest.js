const ZenkitSDK = require('../index');

run()

async function run() {
  gaiaGps = new ZenkitSDK('k99yec0k-LwQdzwdYt0KYsl94D2Ub0UhrKJLpEdGy', keyType = 'Zenkit-API-Key');
  todoWorkspace = await gaiaGps.getTodoWorkspace()
  //console.log(todoWorkspace);
}
