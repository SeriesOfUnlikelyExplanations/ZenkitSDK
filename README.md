# ZenkitSDK
[![Actions Status](https://github.com/SeriesOfUnlikelyExplanations/ZenkitSDK/workflows/Deploy/badge.svg)](https://github.com/SeriesOfUnlikelyExplanations/ZenkitSDK/actions) [![codecov](https://codecov.io/gh/SeriesOfUnlikelyExplanations/ZenkitSDK/branch/main/graph/badge.svg?token=ZSWOVRRYO1)](https://codecov.io/gh/SeriesOfUnlikelyExplanations/ZenkitSDK)

An unofficial NodeJs client to interact with the [Zenkit](https://zenkit.com/) api. It's functionality is limited to what I needed for the [Zenkit-Alexa skill](https://www.amazon.com/Onward-Tools-Zenkit-List-Sync/dp/B087C8XQ3T), but I'll be expanding it as I find more usecases - and I accept pull requests! 


It should be fully working otherwise - please open an issue if you have any questions or run into any problems!

Note that this documentation is specific to the SDK - read through the [api documentation](https://projects.zenkit.com/docs/api/overview/developer-portal) to learn more about the underlying datastructures (not all of that info is replecated here.

## How to use it:
```
  const zenkitSDK = new ZenkitSDK('key', { keyType: 'Authorization' });
```
  This initializes the Zenkit object.
    Key = your api key (either Zenkit-API-Key or Authorization/Oauth)
    options:
      keyType = Can be either Zenkit-API-Key or Authorization. Authorization is for Oauth projects, Zenkit API key can be retrieved from the zenkit website. Defaults to Zenkit-API-Key.
      appType = Can be todo, base, project, or hypernotes. Results will be limited to entries in the workspaces in that app (or shared with them). Defaults to todo. Note that Base, Project, and Hypernotes are still and may not work as expected for all functions.
      apiScope = defaults to api/v1. You shouldn't need to change this.
      
  Functions:
```
    const workspaces = zenkitSDK.getWorkspaces()  
```
      retreives all workspaces in the appType (or shared with it). Returns a promise.

```
    const workspace = setDefaultWorkspace(workspaceId) - workspaceID is required.
```
      Sets the default workspace to a workplaceID you chose. Returns that workspace (as a promise). Will run getWorkspaces() if that hasn't been done already - otherwise it uses cached values.

```      
    const lists = zenkitSDK.getListsInWorkspace(workspaceId) - workspaceID is optional
```
      Retrieves an object with each list in the workspace, with the listId as the key. If workspaceID is ommited, then it uses the default workspace. Will run getWorkspaces() if that hasn't been done already - otherwise it uses cached values. See ListsInWorkspace variable for the keys in each list object.
```
    const list = zenkitSDK.getListDetails(listId) - listId is required (you can use shortID as a substitute if you want).
```
      Makes an api call to get elements and items for the list. See ListsInWorkspace variable for specific values. These values are used by functions below, but likely won't need to be accessd by you. Most (all) of these valuses are specific to the todo appType. Returns a list object (as a promise).
```
    const list = updateListDetails(listId, listMetaData)
```
      Updates list details from cached data. listMetaData is an object can can include the following keys: titleUuid, uncompleteId, completeId, stageUuid
      Returns a list object (as a promise).
    
    (Functions below this line require that you run getListDetails function and only work for the todo appType, unless noted otherwise)
```
    const list = createList(listName, workspaceId) - listName is required. workspaceId is optional (defaults to defaultWorkspace).
```
      creates a list and returns it as a promise. list object will include all list details (see getListDetails). Works for all appTypes, but not all list details will be available. Rejects promise on failure.
```
    deleteList(listId) - listId is required. Works for all appTypes.
```
      Deletes the list. Returns empty object (as a promise) and rejects the promise if list delete fails (or bad list ID is provided).

```
    const item = addItem(listId, itemName) - both params are required.
```
      Creates a new item in the list. Returns that item as a promise.

```
    deleteItem(listId, itemId) - both params are required. Works for all appTypes.
```
      Deletes an item from the list. Returns empty object (as a promise) and rejects the promise if list delete fails (or bad list ID is provided).

```    
    const item = completeItem(listId, itemId) - both params are required.
```
      Completes an item (eg checks it off the list). Returns the updated item object as a promise.

```
    const item = uncompleteItem(listId, entryId) - both params are required.
```
      Uncompletes an item (eg moves it back to todo from checked off/done). Returns the updated item object as a promise.

```
    const item = updateItemTitle(listId, entryId, value) - all three params are required
```
      Updates an items title - Returns the updated item object as a promise.
    
    
  Variables:
    zenkitSDK.workspaces = if getWorkspaces() has been run, then returns an array with metadata about all workspaces (see api documentation for complete list).
    zenkitSDK.defaultWorkspace = if getWorkspaces() has been run, then it returns the default workpspace for that appType. Works for todo and base.
    zenkitSDK.defaultWorkspaceId = if getWorkspaces() has been run, then it returns the ID of the default workpspace for that appType. Works for todo and base.
    zenkitSDK.ListsInWorkspace = if getListsInWorkspace() has been run, then returns an object with each list in the workspace, with the listId as the key. Note that this object is constructed incrementally and each list includes the following keys:
        id - the list id
        name - the list title
        shortId - the shortId for the list
        workspaceId - the workspace ID the list is in
        inbox - if appType is todo and the list is your inbox, then this is true, otherwise false
      if getListDetails(listId) has been run on the list, then the object includes these key/values (note that only the id is redundant, so if you run getListDetails but not getListsInWorkspace, then it won't include all of the keys above). You won't need to directly access these for the most part, but the are available if you want to cache them (for example):
        titleUuid - the element id for the title. This is used by the function to change the title of the list. todo appType
        uncompleteId - the element id for a uncompleted item in the list. This is used by the uncomplete function. todo appType
        completeId - the element id for a completed item in the list. This is used by the complete function. todo appType
        stageUuid - this element is by the complete and uncomplete functions. todo appType
        items - array with an object for each item in the list. Includes metatdata from api documentation + a key "completed" with a bolean value (false if it's uncomplete.
    
    
```
