var assert = require('assert');
var expect = require('chai').expect;
const nock = require('nock');
var ZenkitSDK = require('../index');

const zenkit = require('./zenkitTestData.js');

describe("Testing the skill", function() {
  this.timeout(4000);
  before(() => {
    zenkitNock = nock('https://todo.zenkit.com')
      .persist()
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
      expect(zenkitSDK.defaultWorkspace).to.have.key('lists');
      expect(zenkitSDK.defaultWorkspace.id).to.equal(442548);
      expect(zenkitSDK.defaultWorkspaceId).to.equal(442548);
    });
    it('getWorkspaces - No Default', async () => {
      zenkitNock.interceptors.find(({ path }) => path == '/api/v1/users/me/workspacesWithLists').body = zenkit.ZENKIT_WORKSPACE_DATA_NO_TODO;
      const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
      const workspaces = await zenkitSDK.getWorkspaces()
      expect(workspaces).to.be.instanceof(Array);
      expect(workspaces).to.have.length(1);
      
      expect(zenkitSDK.defaultWorkspace.id).to.equal(442548);
      expect(zenkitSDK.defaultWorkspaceId).to.equal(442548);
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

      nock('https://api.amazonalexa.com')
        .post('/v2/householdlists/todo_list_list_id/items/', (body) => {
          console.log('todo item one created in Alexa');
          expect(body.value).to.equal('todo item one');
          expect(body.status).to.equal('active');
          return body
        })
        .reply(200, { "id": 'todo_list_item_id',
          "value": 'todo item one',
          "status": 'active',
          "createdTime": 'Wed Sep 27 10:46:30 UTC 2017',
          "updatedTime": 'Wed Sep 27 10:46:30 UTC 2017'
        })
        .delete('/v2/householdlists/shopping_list_list_id/items/item_id_two/')
        .reply(200)
        .delete('/v2/householdlists/custom_list_list_id/items/item_id_two/')
        .reply(200);

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
