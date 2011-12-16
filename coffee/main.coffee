class Group extends Backbone.Model
    urlRoot: '/api/group'

class Index extends Backbone.View
    initialize: ->
        @render()

    events:
        'click #create': "submit"

    render: ->
        $(@el).html ich.tpl_index()

    submit: ->
        group = new Group
            name: $('#group_name').val()
        group.save(
            null,
            success: -> window.app.groupEdit(group)
        )

class GroupEdit extends Backbone.View
    initialize: (options) ->
        @render()

    render: ->
        $(@el).html ich.tpl_groupedit(this.model.toJSON())


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
                group.set('edit_hash': editHash)
                window.app.groupEdit group


class App extends Backbone.Router
    initialize: ->
        @homeEl = $('#home')
        @homeContentEl = $('#content')
        @tocEl = $('#table_of_contents')
        @otherPageEl = $('#other_page')

    index: ->
        @view = new Index(el: @homeContentEl)
        @showHome()

    groupEdit: (group) ->
        window.router.navigate('/group_edit/' + group.id + '/' + group.get('edit_hash'))
        @view = new GroupEdit
            el: @homeContentEl
            model: group
        @showHome()
        
    showHome: ->
        @homeEl.removeClass('hide')
        @tocEl.addClass('hide')
        @otherPageEl.addClass('hide')

    showOther: ->
        @homeEl.addClass('hide')
        @tocEl.removeClass('hide')
        @otherPageEl.removeClass('hide')

    
$(document).ready ->
    window.app = new App()
    window.router = new Router()
    Backbone.history.start(pushState: true)
