class UserView extends Backbone.View
    initialize: (options) ->
        @groups = new bn.models.GroupSet()
        @groups.url = '/api/my_groups'

        $(@el).html ich.tpl_usergroups()
        $('input[name=group_name]').hint()

        bn.setLoginNexts(null, '/')

        @groups.fetch
            success: @render
        @groups.bind('remove', @render)

    render: =>
        groups = @$('.groups').empty()
        @groups.each (group) ->
            group.url = '/api/group/' + group.id
            groups.append((new UserGroupView(model: group)).el)

    events:
        'click button[name="go"]': 'submit'
        'keydown input[name="group_name"]': 'submit'

    submit: (e)->
        if e.type == 'keydown' and e.keyCode != 13
            return

        mpq.track('index-bundle-created')
        e.preventDefault()
        group = new bn.models.Group
            name: @$('input[name="group_name"]').val()
        group.save(
            null,
            success: -> window.app.groupEdit(group)
        )

class UserGroupView extends Backbone.View
    className: 'group_summary'

    initialize: (bla) -> @render()

    render: ->
        context = @model.toJSON()
        context.item_set = @model.itemSet.toJSON()
        $(@el).html(ich.tpl_usergroup(context))

    events:
        'click .delete': 'delete'

    delete: ->
        if confirm('Are you sure you want to delete ' + @model.get('name'))
            @model.destroy()
    

bn.userView =
    UserView: UserView
