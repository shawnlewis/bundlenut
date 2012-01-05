jsonRPC = (funcName, data, success) ->
    onSuccess = (data) ->
        success JSON.parse(data)
    $.ajax
        url: '/api/rpc/' + funcName
        type: 'post'
        contentType: 'application/json'
        data: JSON.stringify(data)
        success: onSuccess

max = (array) ->
    Math.max.apply(Math, array)

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
    events:
        'click button[name="go"]': 'submit'
        'keydown input[name="group_name"]': 'submit'

    submit: (e)->
        if e.type == 'keydown' and e.keyCode != 13
            return
        group = new Group
            name: $('input[name="group_name"]').val()
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
        @curItemNum = -1
        @state = 'full'
        @render()
        $(window).resize =>
            doingFix = false
            if not doingFix
                doingFix = true
                setTimeout(
                    =>
                        @sizeFix()
                        doingFix = false
                    ,200)

    sizeFix: =>
        pane_middle = @$('.pane_middle')
        if pane_middle.data().jsp
            pane_middle.data().jsp.destroy()
            hadScrollBar = true

        # fix heights and widths so animations aren't jumpy
        items = $('#items > div')
        items.css('width', '')
        items.css('height', '')
        width = max($(i).width() for i in items)
        items.css('width', width + 'px')
        for i in items
            $(i).css('height', $(i).height() + 'px')

        # place pane
        tab = @$('.tab')
        @$('.pane').css('left', $(window).width() + tab.offset().left + 55)

        if hadScrollBar
            @$('.pane_middle').jScrollPane()

    render: ->
        context = @model.toJSON()
        html = ich.tpl_groupview(context)
        @itemViews = []
        i = 0
        @model.itemSet.each (item) =>
            if not item.isBlank()
                itemView = new ItemView
                    model: item
                    groupView: @
                    num: i
                @itemViews.push(itemView)
                if i < @curItemNum
                    $(html).find('#beforeCurrent').append(itemView.el)
                else if i == @curItemNum
                    $(html).find('#current').replaceWith(
                        $(itemView.el).addClass('selected'))
                else
                    $(html).find('#afterCurrent').append(itemView.el)
                i += 1
        $(@el).html(html)

        if @curItemNum > 0
            @$('#left_arrow').addClass('arrow_on')
        if @curItemNum != -1 and @curItemNum < @itemViews.length - 1
            @$('#right_arrow').addClass('arrow_on')

        @sizeFix()

        if @state == 'single'
            $('.wrapper').hide()

        $(html).find('.pane_middle').jScrollPane()

    events:
        'click .closed .tab #logo': 'full'
        'click .single .tab #logo': 'full'
        'click .full .tab #logo': 'closed'

        'mouseenter .closed .tab': 'single'
        'mouseleave .single .tab': 'closed'

        'click .tab #left_arrow.arrow_on' : 'prevItem'
        'click .tab #right_arrow.arrow_on': 'nextItem'

    setState: (state) ->
        @state = state
        $(@el).removeClass('closed single full')
        $(@el).addClass(state)

    single: ->
        if not @curItemView() or @state == 'single'
            return

        @$('.pane_middle').data().jsp.destroy()

        if @state == 'closed'
            @$('#groupview_content').css('top', '-100%')
            @$('.wrapper').hide()
            @$('#groupview_content').css('top', -@_paneHeight())
            @$('#groupview_content').animate({top: 0}, =>
                @$('.pane_middle').jScrollPane())
        else if @state == 'full'
            @$('.wrapper').slideUp
                complete: =>
                    @$('.pane_middle').jScrollPane()
        @setState('single')

    closed: ->
        el = @$('#groupview_content')
        el.animate({top: -@_paneHeight() + 'px'},
            complete: =>
                # move to -100% so it stays of screen if the user resizes
                el.css('top', '-100%')
        )
        @setState('closed')

    full: ->
        onComplete = =>
            @$('.pane_middle').jScrollPane()
            jsp = @$('.pane_middle').data('jsp')
            if @curItemView
                jsp.scrollTo(0, $(@curItemView().el).position().top)
                
        @$('.pane_middle').data().jsp.destroy()
        if @state == 'closed'
            @$('#groupview_content').css('top', '-100%')
            @$('.wrapper').show()
            @$('#groupview_content').css('top', -@_paneHeight())
            @$('#groupview_content').animate({top: 0}, onComplete)
        else
            $('.wrapper').slideDown(400, onComplete)
        @setState('full')

    _paneHeight: ->
        _.reduce(
            @$('.pane'),
            (x, y) -> x + $(y).height(),
            0)
        
    curItemView: ->
        if @curItemNum == -1 then null else @itemViews[@curItemNum]

    selectItem: (num) ->
        @curItemNum = num
        @render()

    nextItem: ->
        @itemViews[@curItemNum+1].go()

    prevItem: ->
        @itemViews[@curItemNum-1].go()


class ItemView extends Backbone.View
    tagName: 'div'
    className: 'item_view'

    initialize: (options) ->
        @num = options.num
        @groupView = options.groupView
        @render()

    render: ->
        $(@el).html(ich.tpl_itemview(@model.toJSON()))

    events:
        'click': 'clickLink'
        'click': 'clickLink'

    clickLink: (e) ->
        e.preventDefault()
        @go()
        @groupView.closed()

    go: ->
        window.app.frameGo(@model.get('url'))
        @groupView.selectItem(@num)
        

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
        @otherPageEl.load(->$('#loading').addClass('hide'))

    index: ->
        $('body').removeClass().addClass('index')
        @showHome()
        window.router.navigate('')
        @view = new Index(el: @homeContentEl)

    groupEdit: (group) ->
        $('body').removeClass().addClass('groupedit')
        @showHome()
        window.router.navigate('group_edit/' + group.id + '/' + group.get('edit_hash'))
        @view = new GroupEdit
            el: @homeContentEl
            model: group

    groupView: (group) ->
        $('body').removeClass().addClass('groupview')
        @showOther()
        @view = new GroupView
            el: @tocEl
            model: group
        @frameGo('/static/empty.html')
        
    showHome: ->
        $('html').removeClass('show_other')
        @homeEl.removeClass('hide')
        @tocEl.addClass('hide')
        @otherPageEl.addClass('hide')

    showOther: ->
        $('html').addClass('show_other')
        @homeEl.addClass('hide')
        @tocEl.removeClass('hide')
        @otherPageEl.removeClass('hide')

    frameGo: (url) ->
        $('#loading').removeClass('hide')
        @otherPageEl[0].src = url

    
$( ->
    window.app = new App()
    window.router = new Router()
    Backbone.history.start({pushState: true})
)
