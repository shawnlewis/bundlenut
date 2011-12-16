class Group extends Backbone.Model
    urlRoot: '/group'

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
        group.save()

        window.view = new GroupEdit
            el: this.el
            model: group

class GroupEdit extends Backbone.View
    initialize: (options) ->
        @render()

    render: ->
        # why won't this render the variable?
        $(@el).html ich.tpl_groupedit(this.model.toJSON())

    
$(document).ready ->
    window.view = new Index(el: $('#main'))
