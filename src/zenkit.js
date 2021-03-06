const https = require('https');
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
  constructor(key, { keyType = 'Zenkit-API-Key', appType = 'todo', apiScope = 'api/v1' }) {
    if (!['base','todo','hypernotes','project'].includes(appType)) {
      throw(`appType - ${appType} - not supported`);
    }
    if (!['Zenkit-API-Key','Authorization'].includes(keyType)) {
      throw(`keyType - ${keyType} - not supported`);
    }
    this.host = `${appType}.zenkit.com`; // use this to determine which app we are in. This class is primarily modeled after todo, I'd like to modify to support the base and hypernotes app at some point.
    this.apiScope = apiScope;
    this.key = key;
    this.keyType = keyType; // can be 'Zenkit-API-Key' or 'Authorizaion' for oAuth Clients
    this.ListsInWorkspace = {};
  }

  async getWorkspaces() {
    this.workspaces = await this.handleRequest('users/me/workspacesWithLists');
    if (this.host === 'todo.zenkit.com') {
      this.defaultWorkspace = this.workspaces.find(({ resourceTags, lists})  =>
        resourceTags.some(({ appType, tag })  => appType === 'todos' && tag === 'defaultFolder')
        && lists.some(({ resourceTags }) => resourceTags.some(({ appType, tag }) => appType === 'todos' && tag === 'inbox'))
      )
    } else if (this.host === 'base.zenkit.com') {
      this.defaultWorkspace = this.workspaces.find(({ resourceTags, lists})  =>
        resourceTags.some(({ appType, tag })  => appType === 'base' && tag === 'workspace'));
    }
    if (typeof this.defaultWorkspace != 'undefined') {
      this.defaultWorkspaceId = this.defaultWorkspace.id
    }
    return this.workspaces
  }
  
  async setDefaultWorkspace(workspaceId) {
    if (!this.workspaces) {
      await this.getWorkspaces()
    }
    const workspace = this.workspaces.find(({ id }) => id === workspaceId);
    if (typeof workspace == 'undefined') {
      throw(`Workspace ID - ${workspaceId} - does not exist`)
    }
    this.defaultWorkspace = workspace;
    this.defaultWorkspaceId = workspace.id;
    return workspace;
  }

  /**
   * Get all Lists data
   * @return {Promise}
   */
  async getListsInWorkspace(workspaceId=null) {
    if (!this.workspaces) {
      await this.getWorkspaces()
    }
    if (!workspaceId) {
      workspaceId = this.defaultWorkspaceId
    }
    const workspace = this.workspaces.find(({ id }) => id === workspaceId);
    if (typeof workspace === 'undefined') {
      throw(`Workspace ID - ${workspaceId} - does not exist`)
    }
    workspace.lists.forEach(list =>
      this.ListsInWorkspace[list.id] = {
        id: list.id,
        name: list.name,
        shortId: list.shortId,
        workspaceId: list.workspaceId,
        inbox: list.resourceTags.some(resourceTag => resourceTag.appType === 'todos' && resourceTag.tag === 'inbox')
      }
    );
    return this.ListsInWorkspace
  }
  
  /** 
   * Get all metadata about a list and all of it's items
   * @param {string} listId
   * @ return {Promise}
   */
  
  async getListDetails(listId) {
    const [elements, listItems] = await Promise.all([await this.handleRequest('lists/' + listId + '/elements'), this.handleRequest('lists/' + listId + '/entries/filter', 'POST')]);
    if (!(listId in this.ListsInWorkspace)) {
      this.ListsInWorkspace[listId] = {};
    }
    this.ListsInWorkspace[listId].id = listId;
    this.ListsInWorkspace[listId].titleUuid = elements.find(({ resourceTags }) => resourceTags.some(({ appType, tag }) => appType === 'todos' && tag === 'title')).uuid;
    this.ListsInWorkspace[listId].uncompleteId = elements.find(({ resourceTags }) => resourceTags.some(({ appType, tag }) => appType === 'todos' && tag === 'stage'))
      .elementData.predefinedCategories
      .find(({ resourceTags }) => resourceTags.some(({ appType, tag }) => appType === 'todos' && tag === 'todo'))
      .id;
    this.ListsInWorkspace[listId].completeId = elements.find(({ resourceTags }) => resourceTags.some(({ appType, tag }) => appType === 'todos' && tag === 'stage'))
      .elementData.predefinedCategories
      .find(({ resourceTags }) => resourceTags.some(({ appType, tag }) => appType === 'todos' && tag === 'done'))
      .id;
    this.ListsInWorkspace[listId].stageUuid = elements.find(({ resourceTags }) => resourceTags.some(({ appType, tag }) => appType === 'todos' && tag === 'stage')).uuid;
    
    listItems.forEach((item) => {
      item.completed = (item[this.ListsInWorkspace[listId].stageUuid  + '_categories'].includes(this.ListsInWorkspace[listId].completeId));
    });
    this.ListsInWorkspace[listId].items = listItems;
    return this.ListsInWorkspace[listId];
  }
  
  /** 
  * Get all metadata about a list and all of it's items
  * @param {string} listId
  * @ return {Promise}
  */
  
  updateListDetails(listId, { titleUuid, uncompleteId, completeId, stageUuid }) {
    if (!(listId in this.ListsInWorkspace)) {
      this.ListsInWorkspace[listId] = {};
    }
    this.ListsInWorkspace[listId].titleUuid = titleUuid;
    this.ListsInWorkspace[listId].uncompleteId = uncompleteId;
    this.ListsInWorkspace[listId].completeId = completeId;
    this.ListsInWorkspace[listId].stageUuid = stageUuid;
    
    return this.ListsInWorkspace[listId];
  }

  /**
   * Create list
   * @param {int} shortId
   * @param {string, null} stageUuid
   * @return {Promise}
   */
  async createList(listName, workspaceId=null) {
    if (!this.workspaces) {
      await this.getWorkspaces()
    }
    if (!workspaceId) {
      workspaceId = this.defaultWorkspaceId
    }
    const lists = await this.handleRequest('workspaces/' + workspaceId + '/lists', 'POST', {name: listName})
    const list = lists.find(({ name }) => name == listName)
    this.ListsInWorkspace[list.id] = {
        id: list.id,
        name: list.name,
        shortId: list.shortId,
        workspaceId: list.workspaceId,
        inbox: list.resourceTags.some(resourceTag => resourceTag.appType === 'todos' && resourceTag.tag === 'inbox')
      }
    return await this.getListDetails(list.id)
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
  * @param  {String}  itemName
  * @return {Promise}
  */
  async addItem(listId, itemName) {
    if (!(listId in this.ListsInWorkspace) || !('titleUuid' in this.ListsInWorkspace[listId])) {
      throw('Missing list metadata - have you run getListDetails() or updateListDetails()');
    }
    const scope = 'lists/' + listId + '/entries';
    const parameters = {
      uuid: randomUUID(),
      sortOrder: 'lowest',
      displayString: itemName,
      [this.ListsInWorkspace[listId].titleUuid + '_text']: itemName,
      [this.ListsInWorkspace[listId].titleUuid + '_searchText']: itemName,
      [this.ListsInWorkspace[listId].titleUuid + '_textType']: 'plain'
    };
    if (!('items' in this.ListsInWorkspace[listId])) {
      this.ListsInWorkspace[listId].items = [];
    }
    this.ListsInWorkspace[listId].items.push(await this.handleRequest(scope, 'POST', parameters));
    console.log(this.ListsInWorkspace[listId]);
    return this.ListsInWorkspace[listId].items.find(({displayString}) => displayString === itemName)
  }

  /**
  * Delete item from list
  * @param  {int}  listId
  * @param  {String}  itemId
  * @return {Promise}
  */
  async deleteItem(listId, itemId) {
   const scope = 'lists/' + listId + '/entries/delete/filter';
   const parameters = {
     shouldDeleteAll: false,
     filter: {},
     listEntryUuids: [itemId]
   };
   return await this.handleRequest(scope, 'POST', parameters);
  }

  /**
   * update the "complete" status of an item
   * @param  {int}  listId
   * @param  {Int}  itemId
   * @param  {String} stageUuid
   * @param  {Int}  statusId
   * @return {Promise}
   */
  async completeItem(listId, itemId) {
    if (!(listId in this.ListsInWorkspace) || !('stageUuid' in this.ListsInWorkspace[listId])) {
      throw('Missing list metadata - have you run getListDetails() or updateListDetails()');
    }
    const scope = 'lists/' + listId + '/entries/' + itemId;
    const parameters = {
      updateAction: "replace",
      [this.ListsInWorkspace[listId].stageUuid + "_categories"]: [this.ListsInWorkspace[listId].completeId]
    };
    return await this.handleRequest(scope, 'PUT', parameters);
  }
  
  /**
   * update the "complete" status of an item
   * @param  {int}  listId
   * @param  {Int}  itemId
   * @param  {String} stageUuid
   * @param  {Int}  statusId
   * @return {Promise}
   */
  async uncompleteItem(listId, itemId) {
    if (!(listId in this.ListsInWorkspace) || !('stageUuid' in this.ListsInWorkspace[listId])) {
      throw('Missing list metadata - have you run getListDetails() or updateListDetails()');
    }
    const scope = 'lists/' + listId + '/entries/' + itemId;
    const parameters = {
      updateAction: "replace",
      [this.ListsInWorkspace[listId].stageUuid + "_categories"]: [this.ListsInWorkspace[listId].uncompleteId]
    };
    return await this.handleRequest(scope, 'PUT', parameters);
  }

  /**
   * Update Item Title
   * @param  {int}  listId
   * @param  {Int}  itemId
   * @param  {String} titleUuid
   * @param  {String} value
   * @return {Promise}
   */
  async updateItemTitle(listId, itemId, value) {
    if (!(listId in this.ListsInWorkspace) || !('stageUuid' in this.ListsInWorkspace[listId])) {
      throw('Missing list metadata - have you run getListDetails() or updateListDetails()');
    }
    const scope = 'lists/' + listId + '/entries/' + itemId;
    const parameters = {
      updateAction: "replace",
      [this.ListsInWorkspace[listId].titleUuid + '_text']: value
    };
    return await this.handleRequest(scope, 'PUT', parameters);
  }

  /**
   //~ * Handle request
   //~ * @param  {string} scope
   //~ * @param  {string} method
   //~ * @param  {Object} parameters
   //~ * @return {Promise}
   //~ */
  async handleRequest(scope, method = 'GET', parameters = {}) {
    // Define request options
    var options = {
      hostname: this.host,
      port: 443,
      path: `/${this.apiScope}/${scope}`,
      method: method,
      headers: {
        'Cache-Control':'no-cache',
        [this.keyType]: this.key
      }
    }
    console.log(options);
    if (Object.keys(parameters).length) {
      console.log(parameters);
      const paramString = JSON.stringify(parameters);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(paramString)
    }
    
    return new Promise(function(resolve, reject) {
      var req = https.request(options, function(res) {
        var body = [];
        res.on('data', (chunk) => { body.push(chunk); });
        res.on('end', function() {
          try {
            body = JSON.parse(Buffer.concat(body).toString());
          } catch(e) {
            body = Buffer.concat(body).toString();
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            console.log(body);
            return reject(new Error('statusCode=' + res.statusCode));
          }
          resolve(body);
        });
      });
      req.on('error', (e) => { reject(e); });
      if (Object.keys(parameters).length) {
        const paramString = JSON.stringify(parameters);
        req.write(paramString);
      }
      req.end();
    });
  }
}

module.exports = ZenkitSDK;
