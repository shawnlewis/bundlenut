jsonRPC = (funcName, data, success) ->
    onSuccess = (data) ->
        success JSON.parse(data)
    $.ajax
        url: '/api/rpc/' + funcName
        type: 'post'
        contentType: 'application/json'
        data: JSON.stringify(data)
        success: onSuccess
        

class Group extends Backbone.Model
    urlRoot: '/api/group'

    parse: (data) ->
        @itemSet = new ItemSet data.item_set
        @itemSet.each (item) =>
            item.set('group': data['key'])
        delete data.item_set
        @itemSet.bind('change', => @change())
        @itemSet.bind('add', => @change())
        @itemSet.bind('remove', => @change())
        super data

    setEditHash: (editHash) ->
        @set(edit_hash: editHash)
        @itemSet.each (item) =>
            item.set('edit_hash': editHash)

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

    submit: ->
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
        $(@el).html ich.tpl_groupedit(this.model.toJSON())
        @model.itemSet.each (item) ->
            @$('#items').append(new Item(model: item).el)

    renderDenied: ->
        $(@el).html ich.tpl_groupeditDenied()

    events:
        'click #add_item': 'addItem'

    addItem: ->
        @model.itemSet.create
            group: @model.get('key')
            edit_hash: @model.get('edit_hash')


class Item extends Backbone.View
    tagName: 'li'

    initialize: ->
        @render()

    render: ->
        $(@el).html ich.tpl_itemview(@model.toJSON())

    events:
        'click .delete': 'delete'

    delete: ->
        @model.destroy
            data: JSON.stringify(@model.toJSON())


class Router extends Backbone.Router
    routes:
        '': 'index'
        'group_edit/:group_id/:edit_hash': 'groupEdit'

    index: ->
        window.app.index()

    groupEdit: (groupID, editHash) ->
        group = new Group({'id': groupID})
        group.fetch
            success: ->
                group.setEditHash(editHash)
                group.set('edit_hash': editHash)
                window.app.groupEdit group


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
        
    showHome: ->
        @homeEl.removeClass('hide')
        @tocEl.addClass('hide')
        @otherPageEl.addClass('hide')

    showOther: ->
        @homeEl.addClass('hide')
        @tocEl.removeClass('hide')
        @otherPageEl.removeClass('hide')

    
$( ->
    window.app = new App()
    window.router = new Router()
    Backbone.history.start({pushState: true})
)
