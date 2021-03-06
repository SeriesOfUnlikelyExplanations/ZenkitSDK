var assert = require('assert');
var chai = require('chai');
chai.use(require('chai-nock'));
chai.use(require('chai-as-promised'));
var expect = chai.expect;
const nock = require('nock');
var ZenkitSDK = require('../index');

const zenkit = require('./zenkitTestData.js');

describe("Testing the skill", function() {
  this.timeout(4000);
  before(() => {
    nock.cleanAll()
    todoNock = nock('https://todo.zenkit.com')
      .persist()
      .matchHeader('Authorization', 'key')
      .get('/api/v1/users/me/workspacesWithLists')
      .reply(200, zenkit.ZENKIT_WORKSPACE_DATA)
      .get(/^\/api\/v1\/workspaces\/[[0-9]+\/lists$/)
      .reply(200, zenkit.GET_LISTS_IN_WORKSPACE)
      .get(/^\/api\/v1\/lists\/[[0-9]+\/elements$/)
      .reply(200, zenkit.ELEMENTS_DATA)
      .post('/api/v1/lists/1263156/entries/filter')
      .reply(200, zenkit.SHOPPING_ENTRIES_DATA)
      .post('/api/v1/lists/1347812/entries/filter')
      .reply(200, zenkit.CUSTOM_ENTRIES_DATA)
      .post(/^\/api\/v1\/lists\/[[0-9]+\/entries\/filter$/)
      .reply(200, zenkit.TODO_ENTRIES_DATA)
      .post(/^\/api\/v1\/lists\/[[0-9]+\/entries$/)
      .reply(200, zenkit.CREATE_SHOPPING_ENTRY_REPLY);
      
    baseNock = nock('https://base.zenkit.com')
      .persist()
      .matchHeader('Zenkit-API-Key', 'key')
      .get('/api/v1/users/me/workspacesWithLists')
      .reply(200, zenkit.ZENKIT_WORKSPACE_DATA)
      .get(/^\/api\/v1\/workspaces\/[[0-9]+\/lists$/)
      .reply(200, zenkit.GET_LISTS_IN_WORKSPACE)
      .get(/^\/api\/v1\/lists\/[[0-9]+\/elements$/)
      .reply(200, zenkit.ELEMENTS_DATA)
      .post('/api/v1/lists/1263156/entries/filter')
      .reply(200, zenkit.SHOPPING_ENTRIES_DATA)
      .post('/api/v1/lists/1347812/entries/filter')
      .reply(200, zenkit.CUSTOM_ENTRIES_DATA)
      .post(/^\/api\/v1\/lists\/[[0-9]+\/entries\/filter$/)
      .reply(200, zenkit.TODO_ENTRIES_DATA)
      
    nock.emitter.on("no match", (req) => {
      console.log(req.path)
      console.log(req.method)
      assert(false, 'application failure: no match')
    })
  });

  describe("test zenkitSDK", () => {
    it('getWorkspaces - happy path', async () => {
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      const workspaces = await zenkitSDK.getWorkspaces()
      expect(workspaces).to.be.instanceof(Array);
      expect(workspaces).to.have.length(2);
      expect(zenkitSDK.defaultWorkspace).to.be.instanceof(Object);
      expect(zenkitSDK.defaultWorkspace).to.have.property('lists');
      expect(zenkitSDK.defaultWorkspace.id).to.equal(442548);
      expect(zenkitSDK.defaultWorkspaceId).to.equal(442548);
    });
    it('getWorkspaces - No Default', async () => {
      todoNock.interceptors.find(({ path }) => path == '/api/v1/users/me/workspacesWithLists').body = zenkit.ZENKIT_WORKSPACE_DATA_NO_TODO;
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      const workspaces = await zenkitSDK.getWorkspaces()
      expect(workspaces).to.be.instanceof(Array);
      expect(workspaces).to.have.length(1);
      expect(zenkitSDK.defaultWorkspace).to.be.undefined;
      todoNock.interceptors.find(({ path }) => path == '/api/v1/users/me/workspacesWithLists').body = zenkit.ZENKIT_WORKSPACE_DATA;
    });
    it('getWorkspaces - Base app', async () => {
      const zenkitSDK = new ZenkitSDK('key', { appType: 'base' });
      const workspaces = await zenkitSDK.getWorkspaces()
      expect(workspaces).to.be.instanceof(Array);
      expect(workspaces).to.have.length(2);
      expect(zenkitSDK.defaultWorkspace).to.be.instanceof(Object);
      expect(zenkitSDK.defaultWorkspace).to.have.property('lists');
      expect(zenkitSDK.defaultWorkspace.id).to.equal(442026);
      expect(zenkitSDK.defaultWorkspaceId).to.equal(442026);
    });
    it('getWorkspaces - bad appType', async () => {
      expect(function(){
        new ZenkitSDK('key', { keyType: 'Authorization', appType: 'blah' });
      }).to.throw('appType - blah - not supported');
    });
    it('getWorkspaces - bad keyType', async () => {
      expect(function(){
        new ZenkitSDK('key', { keyType: 'blah'});
      }).to.throw('keyType - blah - not supported');
    });
    
    it('setDefaultWorkspace - happy path', async () => {
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      await zenkitSDK.setDefaultWorkspace(442026);
      expect(zenkitSDK.workspaces).to.be.instanceof(Array);
      expect(zenkitSDK.workspaces).to.have.length(2);
      expect(zenkitSDK.defaultWorkspace).to.be.instanceof(Object);
      expect(zenkitSDK.defaultWorkspace).to.have.property('lists');
      expect(zenkitSDK.defaultWorkspace.id).to.equal(442026);
      expect(zenkitSDK.defaultWorkspaceId).to.equal(442026);
    });
    it('setDefaultWorkspace - bad workspaceId', async () => {
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      await expect(zenkitSDK.setDefaultWorkspace(1)).to.be.rejectedWith('Workspace ID - 1 - does not exist')
    });
    
    it('getListsInWorkspace - happy path', async () => {
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      const Lists = await zenkitSDK.getListsInWorkspace();
      expect(Lists).to.be.instanceof(Object);
      expect(Object.keys(Lists)).to.have.length(5);
      expect(Lists[Object.keys(Lists)[0]]).to.have.keys(['id', 'name', 'shortId', 'workspaceId', 'inbox']);
    });
    it('getListsInWorkspace - with provided workspace ID', async () => {
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      const Lists = await zenkitSDK.getListsInWorkspace(442026);
      expect(Lists).to.be.instanceof(Object);
      expect(Object.keys(Lists)).to.have.length(1);
    });
    it('getListsInWorkspace - bad workspace ID', async () => {
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      await expect(zenkitSDK.getListsInWorkspace(1)).to.be.rejectedWith('Workspace ID - 1 - does not exist')
    });
    
    it('getListDetails - happy path', async () => {
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      const List = await zenkitSDK.getListDetails(1067607);
      expect(List).to.be.instanceof(Object);
      expect(List).to.have.all.keys(['id', 'uncompleteId', 'items','titleUuid','stageUuid', 'completeId']);
      expect(List.id).to.equal(1067607);
      expect(List.uncompleteId).to.equal(6155581);
      expect(List.completeId).to.equal(6155582);
      expect(List.items).to.be.instanceof(Array);
      expect(List.items).to.to.have.length(1);
      expect(List.stageUuid).to.equal('e4e56aaa-f1d2-4243-921e-25c87b1060e6');
    });
    it('getListDetails - happy path with getworkpaces first', async () => {
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      await zenkitSDK.getListsInWorkspace();
      const List = await zenkitSDK.getListDetails(1067607);
      expect(List).to.be.instanceof(Object);
      expect(List).to.have.all.keys(['inbox', 'name', 'shortId', 'workspaceId', 'id', 'uncompleteId', 'items','titleUuid','stageUuid', 'completeId']);
      expect(List.id).to.equal(1067607);
      expect(List.uncompleteId).to.equal(6155581);
      expect(List.completeId).to.equal(6155582);
      expect(List.items).to.be.instanceof(Array);
      expect(List.items).to.to.have.length(1);
      expect(List.stageUuid).to.equal('e4e56aaa-f1d2-4243-921e-25c87b1060e6');
      expect(List.inbox).to.equal(true);
      expect(List.name).to.equal('Inbox');
      expect(List.shortId).to.equal('N4uKj7EcZw');
    });
    it('getListDetails - base list', async () => {
      const zenkitSDK = new ZenkitSDK('key', { appType: 'base' });
      await zenkitSDK.getListsInWorkspace();
      const List = await zenkitSDK.getListDetails(1065931);
      expect(List).to.be.instanceof(Object);
      expect(List).to.have.all.keys(['inbox', 'name', 'shortId', 'workspaceId', 'id', 'uncompleteId', 'items','titleUuid','stageUuid', 'completeId']);
      expect(List.id).to.equal(1065931);
      expect(List.uncompleteId).to.equal(6155581);
      expect(List.completeId).to.equal(6155582);
      expect(List.items).to.be.instanceof(Array);
      expect(List.items).to.to.have.length(1);
      expect(List.stageUuid).to.equal('e4e56aaa-f1d2-4243-921e-25c87b1060e6');
      expect(List.inbox).to.equal(false);
      expect(List.name).to.equal('test 1');
      expect(List.shortId).to.equal('c4_XaKEb4k');
    });
    
    it('updateListDetails - happy path', async () => {
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      const params = {
        titleUuid: 'title1',
        uncompleteId: 'uncomplete1',
        completeId: 'complete1',
        stageUuid: 'stage1'
      }
      const List = await zenkitSDK.updateListDetails(1, params);
      expect(List).to.be.instanceof(Object);
      expect(List).to.have.all.keys(['titleUuid', 'uncompleteId','completeId','stageUuid']); 
      expect(List.titleUuid).to.equal('title1');
      expect(List.completeId).to.equal('complete1');
    }); 
    it('updateListDetails - happy path existing list', async () => {
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      await zenkitSDK.getListsInWorkspace();
      const params = {
        titleUuid: 'title1',
        uncompleteId: 'uncomplete1',
        completeId: 'complete1',
        stageUuid: 'stage1'
      }
      const List = await zenkitSDK.updateListDetails(1067607, params);
      expect(List).to.be.instanceof(Object);
      expect(List).to.have.all.keys(['inbox', 'name', 'shortId', 'workspaceId', 'id', 'uncompleteId', 'titleUuid','stageUuid', 'completeId']); 
      expect(List.titleUuid).to.equal('title1');
      expect(List.completeId).to.equal('complete1');
    });
    
    it('createList - happy path', async () => {
      createListNock = nock('https://todo.zenkit.com')
        .post(/^\/api\/v1\/workspaces\/[[0-9]+\/lists$/, (body) => {
            expect(body.name).to.equal('custom list');
            return body
        })
        .reply(200, zenkit.GET_LISTS_IN_WORKSPACE)
        
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      const List = await zenkitSDK.createList('custom list');
      expect(createListNock).to.have.been.requested;
      expect(List).to.be.instanceof(Object);
      expect(List).to.have.all.keys(['inbox', 'name', 'shortId', 'workspaceId', 'id', 'uncompleteId', 'items','titleUuid','stageUuid', 'completeId']);
      expect(List.id).to.equal(1347812);
      expect(List.uncompleteId).to.equal(6155581);
      expect(List.completeId).to.equal(6155582);
      expect(List.items).to.be.instanceof(Array);
      expect(List.items).to.to.have.length(1);
      expect(List.stageUuid).to.equal('e4e56aaa-f1d2-4243-921e-25c87b1060e6');
      expect(List.inbox).to.equal(false);
      expect(List.name).to.equal('custom list');
      expect(List.shortId).to.equal('AqIriYzgs');
    });
    it('deleteList - happy path', async () => {
      deleteNock = nock('https://todo.zenkit.com')
        .delete('/api/v1/lists/12345')
        .reply(200, zenkit.GET_LISTS_IN_WORKSPACE)
        
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      const List = await zenkitSDK.deleteList(12345);
      expect(deleteNock).to.have.been.requested
      deleteNock.remove();
    });
    
    it('addItem - happy path', async () => {
      createItemNock = nock('https://todo.zenkit.com')
        .post(/^\/api\/v1\/lists\/[[0-9]+\/entries$/, (body) => {
          expect(body).to.be.instanceof(Object);
          expect(body).to.have.all.keys(['bdbcc0f2-9dda-4381-8dd7-05b782dd6722_searchText', 
            'bdbcc0f2-9dda-4381-8dd7-05b782dd6722_text', 
            'bdbcc0f2-9dda-4381-8dd7-05b782dd6722_textType', 
            'displayString', 'sortOrder', 'uuid']);
          expect(body.sortOrder).to.equal('lowest');
          expect(body.displayString).to.equal('todo item one');
          expect(body['bdbcc0f2-9dda-4381-8dd7-05b782dd6722_searchText']).to.equal('todo item one');
          expect(body['bdbcc0f2-9dda-4381-8dd7-05b782dd6722_text']).to.equal('todo item one');
          expect(body['bdbcc0f2-9dda-4381-8dd7-05b782dd6722_textType']).to.equal('plain');
          expect(body.uuid.length).to.equal(36);
          return body
        }).reply(200, zenkit.TODO_ENTRIES_DATA)
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      await zenkitSDK.getListDetails(1065931);
      const item = await zenkitSDK.addItem(1065931, 'todo item one');
      expect(createItemNock).to.have.been.requested;
      expect(item).to.be.instanceof(Object);
      expect(item.displayString).to.equal('todo item one');
      expect(item['bdbcc0f2-9dda-4381-8dd7-05b782dd6722_searchText']).to.equal('todo item one');
      expect(item['bdbcc0f2-9dda-4381-8dd7-05b782dd6722_text']).to.equal('todo item one');
    });
    it('addItem - list details not available', async () => {
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      await expect(zenkitSDK.addItem(1065931, 'todo item one')).to.be
        .rejectedWith('Missing list metadata - have you run getListDetails() or updateListDetails()')
    });
    
    it('deleteItem - happy path', async () => {
      deleteNockHappy = nock('https://todo.zenkit.com')
        .post('/api/v1/lists/1234/entries/delete/filter', (body) => {
          expect(body.shouldDeleteAll).to.be.false;
          expect(body.filter).to.be.instanceof(Object);
          expect(body.listEntryUuids).to.be.instanceof(Array);
          expect(body.listEntryUuids).to.contain('testUUID');
          return body
        }).reply(200, {})
        
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      const response = await zenkitSDK.deleteItem(1234, 'testUUID');
      console.log(response);
      expect(deleteNockHappy).to.have.been.requested
      deleteNockHappy.done();
    });
    it('deleteItem - item doesnt exist', async () => {
      deleteNockExist = nock('https://todo.zenkit.com')
        .post('/api/v1/lists/12345/entries/delete/filter', (body) => {
          expect(body.shouldDeleteAll).to.be.false;
          expect(body.filter).to.be.instanceof(Object);
          expect(body.listEntryUuids).to.be.instanceof(Array);
          expect(body.listEntryUuids).to.contain('testUUID');
          return body
        }).reply(404, {"error":{
          "name":"Resource not found",
          "code":"C2",
          "statusCode":404,
          "message":"This collection does not exist or has been deleted.",
          "description":"This collection does not exist or has been deleted."
        }});
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      await expect(zenkitSDK.deleteItem(12345, 'testUUID')).to.be
        .rejectedWith('statusCode=404');
      expect(deleteNockExist).to.have.been.requested;
      deleteNockExist.done();
    });
    it('deleteItem - non-JSON response (unlikely to happen)', async () => {
      deleteNock = nock('https://todo.zenkit.com')
        .post('/api/v1/lists/123456/entries/delete/filter', (body) => {
          expect(body.shouldDeleteAll).to.be.false;
          expect(body.filter).to.be.instanceof(Object);
          expect(body.listEntryUuids).to.be.instanceof(Array);
          expect(body.listEntryUuids).to.contain('testUUID');
          return body
        }).reply(200, 'test');
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      const response = await zenkitSDK.deleteItem(123456, 'testUUID');
      expect(response).to.equal('test');
      deleteNock.done();
    });
    
    it('completeItem - happy path', async () => {
      completeNock = nock('https://todo.zenkit.com')
        .put('/api/v1/lists/1065931/entries/88', (body) => {
          expect(body.updateAction).to.equal('replace');
          expect(body['e4e56aaa-f1d2-4243-921e-25c87b1060e6_categories']).to.be.instanceof(Array);
          expect(body['e4e56aaa-f1d2-4243-921e-25c87b1060e6_categories']).to.contain(6155582); //this is the complete id
          return body
        }).reply(200, zenkit.CREATE_SHOPPING_ENTRY_REPLY);
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      await zenkitSDK.getListDetails(1065931);
      const response = await zenkitSDK.completeItem(1065931, 88);
      expect(response).to.be.instanceof(Object);
      expect(response.id).to.equal(88);
      expect(completeNock).to.have.been.requested;
    });
    it('completeItem - list details not available', async () => {
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      await expect(zenkitSDK.completeItem(1065931, 88)).to.be
        .rejectedWith('Missing list metadata - have you run getListDetails() or updateListDetails()');
    });
    
    it('uncompleteItem - happy path', async () => {
      deleteNock = nock('https://todo.zenkit.com')
        .put('/api/v1/lists/1065931/entries/88', (body) => {
          expect(body.updateAction).to.equal('replace');
          expect(body['e4e56aaa-f1d2-4243-921e-25c87b1060e6_categories']).to.be.instanceof(Array);
          expect(body['e4e56aaa-f1d2-4243-921e-25c87b1060e6_categories']).to.contain(6155581); //this is the complete id
          return body
        }).reply(200, zenkit.CREATE_SHOPPING_ENTRY_REPLY);
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      await zenkitSDK.getListDetails(1065931);
      const response = await zenkitSDK.uncompleteItem(1065931, 88);
      expect(response).to.be.instanceof(Object);
      expect(response.id).to.equal(88);
    });
    it('uncompleteItem - list details not available', async () => {
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      await expect(zenkitSDK.uncompleteItem(1065931, 88)).to.be
        .rejectedWith('Missing list metadata - have you run getListDetails() or updateListDetails()');
    });
    
    it('updateItemTitle - happy path', async () => {
      deleteNock = nock('https://todo.zenkit.com')
        .put('/api/v1/lists/1065931/entries/88', (body) => {
          expect(body.updateAction).to.equal('replace');
          expect(body['bdbcc0f2-9dda-4381-8dd7-05b782dd6722_text']).to.equal('test title'); //this is the complete id
          return body
        }).reply(200, zenkit.CREATE_SHOPPING_ENTRY_REPLY);
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      await zenkitSDK.getListDetails(1065931);
      const response = await zenkitSDK.updateItemTitle(1065931, 88, 'test title');
      expect(response).to.be.instanceof(Object);
      expect(response.id).to.equal(88);
    });
    it('uncompleteItem - list details not available', async () => {
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      await expect(zenkitSDK.updateItemTitle(1065931, 88, 'test title')).to.be
        .rejectedWith('Missing list metadata - have you run getListDetails() or updateListDetails()');
    });
    
  });
});
