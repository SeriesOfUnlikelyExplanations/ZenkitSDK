const https = require('https');
const querystring = require('querystring');
const { randomUUID } = require('crypto');

/**
 * Defines ZenKit client class
 */
class ZenkitSDK {
  /**
   * Constructor
   * @param {String} apiUrl
   * @param {String} key
   */
  constructor(key, keyType = 'Zenkit-API-Key', host = 'todo.zenkit.com', apiScope = 'api/v1' ) {
    this.host = host;
    this.apiScope = apiScope;
    this.key = key;
    this.keyType = keyType; // can be 'Zenkit-API-Key' or 'Authorizaion' for oAuth Clients
  }

  /**
   * Get workspace
   * @return {Promise}
   */
  getTodoWorkspace() {
    return this.handleRequest('users/me/workspacesWithLists')
      .then((body) => {
        // find workspace based on 1) finding the customer's default todo workspace and 2) confirming that an inbox exists in that workspace (which likely means it's not a shared workspace.
        // Another way to do this would be to look at the createdby field and compare against the customer's user id. That would involve another api call to get user details...
        var workspace = body.find(workspace =>
          workspace.resourceTags.some(resourceTag  => resourceTag.appType === 'todos' && resourceTag.tag === 'defaultFolder')
          && workspace.lists.some(list => list.resourceTags.some(resourceTag => resourceTag.appType === 'todos' && resourceTag.tag === 'inbox'))
        )
        if (typeof workspace === 'undefined') {
          console.log('Todo workspace is not present.')
          return null
        }
        return workspace
      });
  }

  /**
   * Get all Lists data
   * @return {Promise}
   */
  getTodoLists(TodoWorkspace) {
        const res = {};
        TodoWorkspace.lists.forEach(list =>
          res[list.name] = {
            id: list.id,
            shortId: list.shortId,
            workspaceId: list.workspaceId,
            inbox: list.resourceTags.some(resourceTag => resourceTag.appType === 'todos' && resourceTag.tag === 'inbox')
          }
        );
        return res
  }
  /**
   * Get all elements for list
   * @param {int} shortId
   * @return {Promise}
   */
  getElements(shortId) {
    return this.handleRequest('lists/' + shortId + '/elements');
  }

  /**
   * Get all elements for list
   * @param {int} shortId
   * @param {string, null} stageUuid
   * @return {Promise}
   */
  getListItems(listId, stageUuid = '') {
    return this.handleRequest('lists/' + listId + '/entries/filter', 'POST')
      .then(function(res) {
        if (stageUuid) {
          res.forEach((item) => {
            item.completed = (item[stageUuid + '_categories_sort'].some(e => e.name === 'Done'));
          });
        }
        return res;
      });
  }

  /**
   * Create list
   * @param {int} shortId
   * @param {string, null} stageUuid
   * @return {Promise}
   */
  createList(listName, workspaceId) {
    const parameters = {
      'name': listName
    };
    return this.handleRequest('workspaces/' + workspaceId + '/lists', 'POST', parameters)
      .then((item) => {
        return {id: item.id,
        shortId: item.shortId,
        workspaceId: item.workspaceId}
      })
  }

  /**
   * Delete list
   * @param {int} shortId
   * @param {string, null} stageUuid
   * @return {Promise}
   */
  deleteList(listId) {
    return this.handleRequest('lists/' + listId, 'DELETE')
  }

  /**
  * Add item to list
  * @param  {int}  listId
  * @param  {String}  titleUuid
  * @param  {String}  value
  * @return {Promise}
  */
  addItem(listId, titleUuid, value) {
    const scope = 'lists/' + listId + '/entries';
    const parameters = {
      'uuid': randomUUID(),
      'sortOrder': 'lowest',
      'displayString': value,
      [titleUuid + '_text']: value,
      [titleUuid + '_searchText']: value,
      [titleUuid + '_textType']: 'plain'
    };
    return this.handleRequest(scope, 'POST', parameters);
  }

  /**
  * Delete item from list
  * @param  {int}  listId
  * @param  {String}  itemUuid
  * @return {Promise}
  */
  deleteItem(listId, itemUuid) {
   const scope = 'lists/' + listId + '/entries/delete/filter';
   const parameters = {
     'shouldDeleteAll': false,
     'filter': {},
     'listEntryUuids': [itemUuid]
   };
   return this.handleRequest(scope, 'POST', parameters);
  }

  /**
   * update the "complete" status of an item
   * @param  {int}  listId
   * @param  {Int}  entryId
   * @param  {String} stageUuid
   * @param  {Int}  statusId
   * @return {Promise}
   */
  updateItemStatus(listId, entryId, stageUuid, statusId ) {
    const scope = 'lists/' + listId + '/entries/' + entryId;
    const parameters = {
      "updateAction": "replace",
      [stageUuid + "_categories"]: [statusId]
    };
    return this.handleRequest(scope, 'PUT', parameters);
  }

  /**
   * Update Item Title
   * @param  {int}  listId
   * @param  {Int}  entryId
   * @param  {String} titleUuid
   * @param  {String} value
   * @return {Promise}
   */
  updateItemTitle(listId, entryId, titleUuid, value) {
    const scope = 'lists/' + listId + '/entries/' + entryId;
    const parameters = {
      "updateAction": "replace",
      [titleUuid + '_text']: value
    };
    return this.handleRequest(scope, 'PUT', parameters);
  }

  /**
   //~ * Handle request
   //~ * @param  {string} scope
   //~ * @param  {string} method
   //~ * @param  {Object} parameters
   //~ * @return {Promise}
   //~ */
  //~ async handleRequest(scope, method = 'GET', parameters = {}) {
    //~ // Define request options
    //~ const options = {
        //~ method: method,
        //~ uri: `${this.apiUrl}/${scope}`,
        //~ headers: {
          //~ [this.keyType]: this.key //Zenkit-API-Key
        //~ }
      //~ }
    //~ if ( ['PUT','POST'].includes(method)) {
      //~ options['body'] = parameters;
      //~ options['json'] = true
    //~ }
    //~ console.log(options);
    //~ const response = request(options);
    //~ return response;
  //~ }
//~ }

  async handleRequest(scope, parameters = {}, queryParameters ={}, method = 'GET') {
    // Define request options
    //~ queryParameters.ie = (new Date()).getTime();
    //~ queryParameters.show_archived = false
    var options = {
      hostname: this.host,
      port: 443,
      path: `/${this.apiScope}/${scope}?${querystring.stringify(queryParameters)}`,
      method: method,
      headers: {
        'Cache-Control':'no-cache',
        [this.keyType]: this.key
      }
    }
    if ( ['PUT','POST'].includes(method)) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(parameters)
    }
    console.log(options);
    return new Promise(function(resolve, reject) {
      var req = https.request(options, function(res) {
        var body = [];
        res.on('data', function(chunk) {
          body.push(chunk);
        });
        res.on('end', function() {
          try {
            body = JSON.parse(Buffer.concat(body).toString());
          } catch(e) {
            try {
              body = Buffer.concat(body).toString();
            } catch(e) {
              reject(e);
            }
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            console.log(body);
            return reject(new Error('statusCode=' + res.statusCode));
          }
          resolve(body);
        });
      });
      req.on('error', function(e) {
        reject(e);
      });
      if ( ['PUT','POST'].includes(method)) {
        req.write(parameters);
      }
      req.end();
    });
  }
}


module.exports = ZenkitSDK;
