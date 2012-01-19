class UserView extends Backbone.View
    initialize: (options) ->
        @groups = new bn.models.GroupSet()
        @groups.url = '/api/my_groups'
        @groups.fetch
            success: @render

    render: =>
        $(@el).html ich.tpl_usergroups(groups: @groups.toJSON())
        $('input[name=group_name]').hint()

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

bn.userView =
    UserView: UserView
