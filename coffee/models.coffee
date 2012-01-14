# Make Backbone.sync pass edit_hash in url for PUT and DELETE operations.
# Stripped out emulateJSON and emulateHTTP and added code at
# "Custom code here."

methodMap =
    'create': 'POST',
    'update': 'PUT',
    'delete': 'DELETE',
    'read'  : 'GET'

getUrl = (object) ->
    if not (object && object.url)
        return null
    return if _.isFunction(object.url) then object.url() else object.url

Backbone.sync = (method, model, options) ->
    type = methodMap[method]

    # Default JSON-request options.
    params = _.extend({
        type:         type,
        dataType:     'json'
    }, options)

    # Ensure that we have a URL.
    if (!params.url)
        params.url = getUrl(model) || urlError()

    # Ensure that we have the appropriate request data.
    if !params.data && model && (method == 'create' || method == 'update')
        params.contentType = 'application/json'
        params.data = JSON.stringify(model.toJSON())

    # Don't process data on a non-GET request.
    if params.type != 'GET'
      params.processData = false

    # Custom code here.
    if params.type == 'PUT' or params.type == 'DELETE'
        if model instanceof Item
            params.url += '/' + model.collection.group.get('edit_hash')
        else if model instanceof Group
            params.url += '/' + model.get('edit_hash')

    # Make the request.
    return $.ajax(params)
        

class Group extends Backbone.Model
    urlRoot: '/api/group'

    initialize: ->
        @parseItemSet()
        @bind('change', @parseItemSet)

    parseItemSet:  =>
        if not @get('item_set')
            return
        # Order data.item_set by data.ordering
        items = {}
        for item in @get('item_set')
            items[item.id] = item
        ordered = []
        for id in @get('ordering')
            ordered.push(items[id])
            delete items[id]
        for item in _.values(items)
            ordered.push(item)

        @itemSet = new ItemSet ordered
        @unset('item_set', silent: true)
        @itemSet.group = @

        @itemSet.bind('change', => @change())
        @itemSet.bind('add', => @change)
        @itemSet.bind('add', @fixOrdering)
        @itemSet.bind('remove', => @change())
        @itemSet.bind('remove', @fixOrdering)

    createItem: (success) ->
        @itemSet.create(
            {group: @get('key')
            edit_hash: @get('edit_hash')},
            {success: success})
        
    fixOrdering: =>
        @set
            ordering: item.id for item in @itemSet.models
            silent: true
        @save()

    setOrdering: (ordering) ->
        @set(
            {ordering: parseInt(i) for i in ordering},
            {silent: true})
        @save()

    # create a blank item at the end of the list if we don't have one.
    clean: (success) ->
        lastIndex = @itemSet.models.length - 1
        if lastIndex == -1 or not @itemSet.models[lastIndex].isBlank()
            @createItem(success)
        else
            success()

class GroupSet extends Backbone.Collection
    model: Group


class Item extends Backbone.Model
    defaults:
        title: ''
        url: ''
        comment: ''

    isBlank: ->
        if not @get('title') and not @get('url') and not @get('comment')
            return true
        return false


class ItemSet extends Backbone.Collection
    model: Item
    url: '/api/item'

bn.models =
    GroupSet: GroupSet
    Group: Group
