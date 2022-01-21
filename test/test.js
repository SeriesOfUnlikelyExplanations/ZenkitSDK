var assert = require('assert');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-as-promised'))
const nock = require('nock');
var ZenkitSDK = require('../index');

const zenkit = require('./zenkitTestData.js');

describe("Testing the skill", function() {
  this.timeout(4000);
  before(() => {
    todoNock = nock('https://todo.zenkit.com')
      .persist()
      .matchHeader('Authorization', 'key')
      .get('/api/v1/users/me/workspacesWithLists')
      .reply(200, zenkit.ZENKIT_WORKSPACE_DATA)
      .get(/\/api\/v1\/workspaces\/[[0-9]+\/lists/)
      .reply(200, zenkit.GET_LISTS_IN_WORKSPACE)
      .get(/\/api\/v1\/lists\/[[0-9]+\/elements/)
      .reply(200, zenkit.ELEMENTS_DATA)
      .post('/api/v1/lists/1263156/entries/filter')
      .reply(200, zenkit.SHOPPING_ENTRIES_DATA)
      .post('/api/v1/lists/1347812/entries/filter')
      .reply(200, zenkit.CUSTOM_ENTRIES_DATA)
      .post(/\/api\/v1\/lists\/[[0-9]+\/entries\/filter/)
      .reply(200, zenkit.TODO_ENTRIES_DATA)
      .post('/api/v1/lists/1263156/entries')
      .reply(200, zenkit.CREATE_SHOPPING_ENTRY_REPLY)
      .post('/api/v1/lists/1347812/entries')
      .reply(200, zenkit.CREATE_SHOPPING_ENTRY_REPLY);
      
    baseNock = nock('https://base.zenkit.com')
      .persist()
      .matchHeader('Zenkit-API-Key', 'key')
      .get('/api/v1/users/me/workspacesWithLists')
      .reply(200, zenkit.ZENKIT_WORKSPACE_DATA)
      .get(/\/api\/v1\/workspaces\/[[0-9]+\/lists/)
      .reply(200, zenkit.GET_LISTS_IN_WORKSPACE)
      .get(/\/api\/v1\/lists\/[[0-9]+\/elements/)
      .reply(200, zenkit.ELEMENTS_DATA)
      .post('/api/v1/lists/1263156/entries/filter')
      .reply(200, zenkit.SHOPPING_ENTRIES_DATA)
      .post('/api/v1/lists/1347812/entries/filter')
      .reply(200, zenkit.CUSTOM_ENTRIES_DATA)
      .post(/\/api\/v1\/lists\/[[0-9]+\/entries\/filter/)
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
    it('setDefaultWorkspace', async () => {
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
    });
    it('getListDetails - happy path with getworkpaces first', async () => {
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      await zenkitSDK.getListsInWorkspace();
      const List = await zenkitSDK.getListDetails(1067607);
      expect(List).to.be.instanceof(Object);
      expect(List).to.have.all.keys(['inbox', 'name', 'shortId', 'workspaceId', 'id', 'uncompleteId', 'items','titleUuid','stageUuid', 'completeId']);
    });
    it('getListDetails - base list', async () => {
      const zenkitSDK = new ZenkitSDK('key', { appType: 'base' });
      await zenkitSDK.getListsInWorkspace();
      const List = await zenkitSDK.getListDetails(1065931);
      expect(List).to.be.instanceof(Object);
      expect(List).to.have.all.keys(['inbox', 'name', 'shortId', 'workspaceId', 'id', 'uncompleteId', 'items','titleUuid','stageUuid', 'completeId']);
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
    
    
    
    xit('Try to trigger Zenkit --> Alexa sync with no to-do workspace', async() => {
      var ctx = context();
      nock('https://todo.zenkit.com:443')
        .post('/api/v1/lists/1225299/entries', (body) => {
            console.log('todo item two created in zenkit');
            expect(body.sortOrder).to.equal('lowest');
            expect(body.displayString).to.equal('todo item two');
            expect(body['bdbcc0f2-9dda-4381-8dd7-05b782dd6722_text']).to.equal('todo item two');
            expect(body['bdbcc0f2-9dda-4381-8dd7-05b782dd6722_searchText']).to.equal('todo item two');
            expect(body['bdbcc0f2-9dda-4381-8dd7-05b782dd6722_textType']).to.equal('plain');
            return body
        })
        .reply(200, zenkit.CREATE_SHOPPING_ENTRY_REPLY)

      zenkitNock.interceptors.find(({ path }) => path == '/api/v1/users/me/workspacesWithLists').body = zenkit.ZENKIT_WORKSPACE_DATA_NO_TODO;

      index.handler(req.SYNC_MESSAGE_RECEIVED, ctx, (err, data) => { })
      await ctx.Promise
        .then(() => {
          console.log('created new item - Success!');
        })
        .catch(err => {
          assert(false, 'application failure:'.concat(err))
        });
      zenkitNock.interceptors.find(({ path }) => path == '/api/v1/users/me/workspacesWithLists').body = zenkit.ZENKIT_WORKSPACE_DATA;
    });
  });
});
