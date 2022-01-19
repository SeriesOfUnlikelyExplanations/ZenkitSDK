var assert = require('assert');
var expect = require('chai').expect;
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
      .post('/api/v1/workspaces/442548/lists')
      .reply(200, zenkit.GET_LISTS_IN_WORKSPACE)
      .post('/api/v1/workspaces/442026/lists')
      .reply(200, zenkit.GET_LISTS_IN_WORKSPACE)
      .get('/api/v1/lists/1225299/elements')
      .reply(200, zenkit.ELEMENTS_DATA)
      .get('/api/v1/lists/1263156/elements')
      .reply(200, zenkit.ELEMENTS_DATA)
      .get('/api/v1/lists/1347812/elements')
      .reply(200, zenkit.ELEMENTS_DATA)
      .get('/api/v1/lists/1067607/elements')
      .reply(200, zenkit.ELEMENTS_DATA)
      .post('/api/v1/lists/1225299/entries/filter')
      .reply(200, zenkit.TODO_ENTRIES_DATA)
      .post('/api/v1/lists/1067607/entries/filter')
      .reply(200, zenkit.TODO_ENTRIES_DATA)
      .post('/api/v1/lists/1263156/entries/filter')
      .reply(200, zenkit.SHOPPING_ENTRIES_DATA)
      .post('/api/v1/lists/1347812/entries/filter')
      .reply(200, zenkit.CUSTOM_ENTRIES_DATA)
      .post('/api/v1/lists/1263156/entries')
      .reply(200, zenkit.CREATE_SHOPPING_ENTRY_REPLY)
      .post('/api/v1/lists/1347812/entries')
      .reply(200, zenkit.CREATE_SHOPPING_ENTRY_REPLY);
      
    baseNock = nock('https://base.zenkit.com')
      .persist()
      .matchHeader('Zenkit-API-Key', 'key')
      .get('/api/v1/users/me/workspacesWithLists')
      .reply(200, zenkit.ZENKIT_WORKSPACE_DATA)
      
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
