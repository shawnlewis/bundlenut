class Index extends Backbone.View
    initialize: ->
        @popular = new bn.models.GroupSet()
        @popular.url = '/api/popular_groups'
        @popular.fetch
            success: @render
    
    render: =>
        for [div, group] in _.zip($('#popular_bundles > div'), @popular.models)
            if div and group
                new GroupSummary
                    el: div
                    model: group

    events:
        'click button[name="go"]': 'submit'
        'keydown input[name="group_name"]': 'submit'

    submit: (e)->
        if e.type == 'keydown' and e.keyCode != 13
            return
        mpq.track('index-bundle-created')
        e.preventDefault()
        group = new bn.models.Group
            name: $('input[name="group_name"]').val()
        group.save(
            null,
            success: -> window.app.groupEdit(group)
        )

class GroupSummary extends Backbone.View
    initialize: ->
        @render()

    render: ->
        context = @model.toJSON()
        context.item_set = @model.itemSet.toJSON()
        $(@el).html(ich.tpl_groupsummary(context))

    events:
        'click': 'go'

    go: ->
        mpq.track('index-popular-bundle-clicked')
        window.app.groupView(@model)


class Router extends Backbone.Router
    routes:
        '': 'index'
        'e/:group_id/:edit_hash': 'groupEdit'
        'b/:group_id': 'groupView'

    index: ->
        window.app.index()

    groupEdit: (groupID, editHash) ->
        group = new bn.models.Group
            id: groupID
            editHash: editHash
        group.fetch
            success: ->
                window.app.groupEdit group

    groupView: (groupID) ->
        group = new bn.models.Group({'id': groupID})
        group.fetch
            success: -> window.app.groupView group


class App extends Backbone.Router
    initialize: ->
        @homeEl = $('#home')
        @homeContentEl = $('#content')
        @tocEl = $('#table_of_contents')
        @otherPageEl = $('#other_page')
        @ourOtherPageEl = $('#our_other_page')
        @otherPageEl.load(->$('#loading').addClass('hide'))

    index: ->
        $('body').removeClass().addClass('index')
        $('#content').hide()
        @showHome()
        window.router.navigate('')
        document.title = 'Bundlenut'
        if not @indexView
            @indexView = new Index(el: $('#index_content'))
        @view = @indexView

    groupEdit: (group) ->
        $('body').removeClass().addClass('groupedit')
        $('#content').show()
        @showHome()
        window.router.navigate('e/' + group.id + '/' + group.get('edit_hash'))
        document.title = 'Bundlenut - Edit: ' + group.get('name')
        @view = new bn.editor.GroupEdit
            el: @homeContentEl
            model: group

    groupView: (group) ->
        $('body').removeClass().addClass('groupview')
        @showOurOther()
        window.router.navigate('b/' + group.id)
        document.title = 'Bundlenut - Browse: ' + group.get('name')
        @view = new bn.bbrowser.GroupView
            el: @tocEl
            model: group
        
    showHome: ->
        $('html').removeClass('show_other')
        @tocEl.addClass('hide')
        @ourOtherPageEl.addClass('hide')
        @otherPageEl.addClass('hide')
        @homeEl.removeClass('hide')

    showOurOther: ->
        $('html').addClass('show_other')
        @homeEl.addClass('hide')
        @otherPageEl.addClass('hide')
        @tocEl.removeClass('hide')
        @ourOtherPageEl.removeClass('hide')

    showOther: ->
        $('html').addClass('show_other')
        @homeEl.addClass('hide')
        @ourOtherPageEl.addClass('hide')
        @tocEl.removeClass('hide')
        @otherPageEl.removeClass('hide')

    frameGo: (url) ->
        @showOther()
        $('#loading').removeClass('hide')
        @otherPageEl[0].src = url

window.bn = {}

$( ->
    $('#create_group_name').hint()
    
    window.app = new App()
    window.router = new Router()
    Backbone.history.start({pushState: true})
)
