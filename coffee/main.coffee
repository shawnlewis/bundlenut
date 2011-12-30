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


class Item extends Backbone.Model
    defaults:
        title: ''
        url: ''
        comment: ''

    isBlank: ->
        if not @get('title') and not @get('url')
            return true
        return false


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
        @model.clean =>
            context = this.model.toJSON()
            context.view_link = '/group_view/' + this.model.id
            $(@el).html ich.tpl_groupedit(context)
            tbody = @$('#items')
            @model.itemSet.each (item) ->
                el = $(new ItemEdit(model: item).el)
                el.attr('data-id', item.id)
                tbody.append(el)

            # last item is always a new blank item, don't allow delete
            tbody.find('td:last').find('.delete').hide()

            tbody.sortable
                update: @sortUpdate

    renderDenied: ->
        $(@el).html ich.tpl_groupeditDenied()

    events:
        'sortupdate #items tbody': 'sortUpdate'

    addItem: ->
        @model.createItem()

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
        @commentField = new EditableField
            el: @$('.comment')
            val: @model.get('comment')
        @commentField.bind('change', @changeComment)

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

    changeComment: (newComment) =>
        @model.set('comment': newComment)
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
        $(@el).removeClass('blank')
        val = @val
        if not @val
            val = 'blank'
            $(@el).addClass('blank')

        $(@el).append('<span class="view">' + val + '</span>')
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
        $(@el).empty()
        if @val
            $(@el).append('<input class="edit" value="' + @val + '" />')
        else
            $(@el).append('<input class="edit" />')
        @$('input')
            .focus()
            .select()
        @delegateEvents
            'blur .edit': 'toViewMode'
            'keydown .edit': 'toViewMode'


class GroupView extends Backbone.View
    initialize: (options) ->
        @currentItemView = null
        @render()
        @state = 'closed'
        @full()
        @currentClosed()

    render: ->
        $(@el).html ich.tpl_groupview(@model.toJSON())
        @model.itemSet.each (item) =>
            itemView = new ItemView
                model: item
                groupView: @
                tagName: 'li'
            @$('#items').append(itemView.el)

    events:
        'click .closed .tab': 'full'
        'mouseover .closed .tab': 'currentOpened'
        'mouseleave .closed .tab': 'currentClosed'

        'click .full .tab': 'closed'

    setState: (state) ->
        @state = state
        @$('.groupview').removeClass('closed single full')
        @$('.groupview').addClass(state)

    single: ->
        if not @curItemView or @state == 'single'
            return

        @delegateEvents(null)
        if @state == 'closed'
            $(@el).animate({top: 0},
                complete: =>
                    @setState('single')
                    @delegateEvents(@events)
            )
        else if @state == 'full'
            @$('.wrapper').slideUp
                complete: =>
                    @setState('single')
                    @delegateEvents(@events)

    currentOpened: ->
        el = @$('.currentview')
        tab = $('.tab')
        el.css('left', (tab.offset().left + tab.outerWidth() - 2) + 'px')
        el.animate(bottom: -el.height() + 'px')

    currentClosed: ->
        el = @$('.currentview')
        el.animate(bottom: 0)

    closed: ->
        el = @$('.groupview')
        @delegateEvents(null)
        el.animate({top: (-el.height() + 30) + 'px'},
            complete: =>
                @setState('closed')
                @delegateEvents(@events)
        )

    full: ->
        el = @$('.groupview')
        @delegateEvents(null)
        if @state == 'closed'
            el.animate({top: 0},
                complete: =>
                    @setState('full')
                    @delegateEvents(@events)
            )
        @currentClosed()

    setCurItemView: (itemView) ->
        @curView = new ItemView
            model: itemView.model
            el: @$('.currentview .current_pane')
            tagName: 'div'

class ItemView extends Backbone.View
    initialize: (options) ->
        @groupView = options.groupView
        @render()

    render: ->
        $(@el).html(ich.tpl_itemview(@model.toJSON()))

    events:
        'click a': 'clickLink'
        'click .comment': 'clickLink'

    clickLink: (e) ->
        e.preventDefault()
        window.app.frameGo(@model.get('url'))
        @groupView.setCurItemView(@)
        @groupView.closed()
        

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
