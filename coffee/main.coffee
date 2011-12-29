jsonRPC = (funcName, data, success) ->
    onSuccess = (data) ->
        success JSON.parse(data)
    $.ajax
        url: '/api/rpc/' + funcName
        type: 'post'
        contentType: 'application/json'
        data: JSON.stringify(data)
        success: onSuccess

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

    parse: (data) ->
        # Order data.item_set by data.ordering
        items = {}
        for item in data.item_set
            items[item.id] = item
        ordered = []
        for id in data.ordering
            ordered.push(items[id])
            delete items[id]
        for item in _.values(items)
            ordered.push(item)

        @itemSet = new ItemSet ordered
        delete data.item_set
        @itemSet.group = @

        @itemSet.bind('change', => @change())
        @itemSet.bind('add', => @change)
        @itemSet.bind('add', @fixOrdering)
        @itemSet.bind('remove', => @change())
        @itemSet.bind('remove', @fixOrdering)
        super data
        
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


class Item extends Backbone.Model
    defaults:
        title: ''
        url: ''


class ItemSet extends Backbone.Collection
    model: Item
    url: '/api/item'


class Index extends Backbone.View
    initialize: ->
        @render()

    render: ->
        $(@el).html ich.tpl_index()

    events:
        'click #create': 'submit'
        'keydown #group_name': 'submit'

    submit: (e)->
        if e.type == 'keydown' and e.keyCode != 13
            return
        group = new Group
            name: $('#group_name').val()
        group.save(
            null,
            success: -> window.app.groupEdit(group)
        )

class GroupEdit extends Backbone.View
    initialize: (options) ->
        jsonRPC(
            'group_edit_check',
            {'edit_hash': @model.get('edit_hash'),
            'id': @model.id},
            (data) =>
                if data
                    @render()
                else
                    @renderDenied()
        )
        @model.bind('change', @render)

    render: =>
        context = this.model.toJSON()
        context.view_link = '/group_view/' + this.model.id
        $(@el).html ich.tpl_groupedit(context)
        tbody = @$('#items')
        @model.itemSet.each (item) ->
            el = $(new ItemEdit(model: item).el)
            el.attr('data-id', item.id)
            tbody.append(el)
        tbody.sortable
            update: @sortUpdate

    renderDenied: ->
        $(@el).html ich.tpl_groupeditDenied()

    events:
        'click #add_item': 'addItem'
        'sortupdate #items tbody': 'sortUpdate'

    addItem: ->
        @model.itemSet.create
            group: @model.get('key')
            edit_hash: @model.get('edit_hash')

    sortUpdate: =>
        @model.setOrdering($(i).attr('data-id') for i in @$('#items tr'))


class ItemEdit extends Backbone.View
    tagName: 'tr'

    initialize: ->
        @render()

    render: ->
        $(@el).html ich.tpl_itemedit(@model.toJSON())
        @titleField = new EditableField
            el: @$('.title')
            val: @model.get('title')
        @titleField.bind('change', @changeTitle)
        @urlField = new EditableField
            el: @$('.url')
            val: @model.get('url')
        @urlField.bind('change', @changeURL)

    events:
        'click .delete': 'delete'

    delete: ->
        @model.destroy()

    changeTitle: (newTitle) =>
        @model.set('title': newTitle)
        @model.save()

    changeURL: (newURL) =>
        @model.set('url': newURL)
        @model.save()
        

class EditableField extends Backbone.View
    initialize: (options) ->
        @val = options.val
        @inViewMode = false
        @viewMode()

    viewMode: ->
        if @inViewMode
            return
        @inViewMode = true
        $(@el).empty()
        $(@el).append('<span class="view">' + @val + '</span>')
        @delegateEvents
            'click .view': 'editMode'

    toViewMode: (e) ->
        if e.type == 'keydown' and e.keyCode != 13
            return
        @val = @$('.edit').val()
        @trigger('change', @val)
        @viewMode()

    editMode: ->
        if not @inViewMode
            return
        @inViewMode = false
        $(@el)
            .empty()
            .append('<input class="edit" value="' + @val + '" />')
        @$('input')
            .focus()
            .select()
        @delegateEvents
            'blur .edit': 'toViewMode'
            'keydown .edit': 'toViewMode'


class GroupView extends Backbone.View
    initialize: (options) ->
        @render()
        @open()

    render: ->
        $(@el).html ich.tpl_groupview(@model.toJSON())
        @model.itemSet.each (item) =>
            itemView = new ItemView
                model: item
                groupView: @
            @$('#items').append(itemView.el)

    events:
        'click .tab': 'toggle'

    toggle: ->
        if @opened
            @close()
        else
            @open()

    close: ->
        $(@el).animate(bottom: '-30px')
        $(@el).removeClass('open')
        $(@el).addClass('closed')
        @opened = false

    open: ->
        $(@el).animate(bottom: -$(@el).height() + 'px')
        $(@el).addClass('open')
        $(@el).removeClass('closed')
        @opened = true


class ItemView extends Backbone.View
    tagName: 'tr'

    initialize: (options) ->
        @groupView = options.groupView
        @render()

    render: ->
        $(@el).html(ich.tpl_itemview(@model.toJSON()))

    events:
        'click .link': 'clickLink'

    clickLink: ->
        window.app.frameGo(@model.get('url'))
        @groupView.close()
        

class Router extends Backbone.Router
    routes:
        '': 'index'
        'group_edit/:group_id/:edit_hash': 'groupEdit'
        'group_view/:group_id': 'groupView'

    index: ->
        window.app.index()

    groupEdit: (groupID, editHash) ->
        group = new Group({'id': groupID})
        group.fetch
            success: ->
                group.set(edit_hash: editHash)
                window.app.groupEdit group

    groupView: (groupID) ->
        group = new Group({'id': groupID})
        group.fetch
            success: -> window.app.groupView group


class App extends Backbone.Router
    initialize: ->
        @homeEl = $('#home')
        @homeContentEl = $('#content')
        @tocEl = $('#table_of_contents')
        @otherPageEl = $('#other_page')

    index: ->
        console.log('here')
        @showHome()
        window.router.navigate('')
        @view = new Index(el: @homeContentEl)

    groupEdit: (group) ->
        @showHome()
        window.router.navigate('group_edit/' + group.id + '/' + group.get('edit_hash'))
        @view = new GroupEdit
            el: @homeContentEl
            model: group

    groupView: (group) ->
        @showOther()
        @view = new GroupView
            el: @tocEl
            model: group
        @frameGo('/static/empty.html')
        
    showHome: ->
        $('html').removeClass('show_other')
        $('body').removeClass('show_other')
        @homeEl.removeClass('hide')
        @tocEl.addClass('hide')
        @otherPageEl.addClass('hide')

    showOther: ->
        $('html').addClass('show_other')
        $('body').addClass('show_other')
        @homeEl.addClass('hide')
        @tocEl.removeClass('hide')
        @otherPageEl.removeClass('hide')

    frameGo: (url) ->
        @otherPageEl[0].src = url

    
$( ->
    window.app = new App()
    window.router = new Router()
    Backbone.history.start({pushState: true})
)
