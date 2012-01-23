import copy
import hashlib
import json
import os
import sys
import traceback
import webob
import webob.exc
import webapp2

from google.appengine.api import memcache
from google.appengine.api import users
from google.appengine.ext import db
from google.appengine.ext.webapp import template

import models

DEBUG = False


def get_file(rel_path):
    return os.path.join(os.path.dirname(__file__), rel_path)

class TilRedirect(webapp2.RequestHandler):
    def get(self):
        self.redirect('/b/22047') 


class AppHandler(webapp2.RequestHandler):
    def get(self):
        login_url = users.create_login_url('__NEXT__')
        logout_url = users.create_logout_url('__NEXT__')
        user = users.get_current_user()
        if user:
            user_name = user.nickname()
        else:
            user_name = ''
           
        self.response.out.write(template.render(
            get_file('templates/index.html'),
            {'debug': DEBUG,
             'body_class': self._body_class,
             'user_name': user_name,
             'login_url': login_url,
             'logout_url': logout_url
            }))

class IndexPage(AppHandler):
    _body_class = 'index'

class AppPage(AppHandler):
    _body_class = ''

class DebugPage(webapp2.RequestHandler):
    def get(self):
        self.response.out.write(template.render(
            get_file('templates/debug.html'), {'debug': DEBUG}))

def json_group(group):
    return {
        'name': group.name,
        'key': str(group.key()),
        'id': str(group.key().id()),
        'item_set': [json_item(i) for i in group.item_set],
        'ordering': group.ordering,
        'anonymous': not group.user
    }

def json_item(item):
    return {
        'id': str(item.key().id()),
        'title': item.title,
        'url': item.url,
        'comment': item.comment
    }

class JSONRequestHandler(webapp2.RequestHandler):
    def json_response(self, obj):
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(obj, indent=4))
        
    def handle_exception(self, ex, debug):
        lines = ''.join(traceback.format_exception(*sys.exc_info()))
        lines = lines.replace('\n', '<br>')
        self.request.accept = ''
        resp = webob.exc.HTTPInternalServerError(detail='%s' % lines)
        resp.content_type = 'text/plain'
        return resp


class APIGroup(JSONRequestHandler):
    def get(self, id_):
        group = models.Group.get_by_id(int(id_))
        self.json_response(json_group(group))

    def post(self):
        params = json.loads(self.request.body)

        group = models.Group()
        setattr(group, 'name', params['name'])
        user = users.get_current_user()
        if user:
            group.user = user
        else:
            edit_hash = hashlib.md5()
            edit_hash.update(os.urandom(1000))
            group.edit_hash = edit_hash.hexdigest()
        group.put()

        resp = json_group(group)
        if group.edit_hash is not None:
            resp['edit_hash'] = group.edit_hash
        self.json_response(resp)

    def put(self, id_, edit_hash=None):
        params = json.loads(self.request.body)
        group = models.Group.get_by_id(int(id_))

        if not can_edit(group, edit_hash):
            raise webob.excHTTPUnauthorized

        if 'name' in params:
            group.name = params['name']
        if 'ordering' in params:
            group.ordering = map(int, params['ordering'])
        group.put()

        self.json_response(json_group(group))

    def delete(self, id_, edit_hash=None):
        group = models.Group.get_by_id(int(id_))
        if not can_edit(group, edit_hash):
            raise webob.exc.HTTPUnauthorized
        group.delete()

        self.json_response('true')


class APIItem(JSONRequestHandler):
    def get(self, id_):
        item = models.Item.get_by_id(int(id_))
        self.json_response(json_item(item))

    def post(self):
        params = json.loads(self.request.body)

        group = db.get(db.Key(params['group']))
        if not can_edit(group, params.get('edit_hash')):
            raise webob.exc.HTTPUnauthorized

        item = models.Item()
        item.title = params['title'] or None
        item.url = params['url'] or None
        item.comment = params['comment'] or None
        item.group = group
        item.put()

        self.json_response(json_item(item))

    def put(self, id_, edit_hash=None):
        params = json.loads(self.request.body)

        item = models.Item.get_by_id(int(id_))
        if not can_edit(item, edit_hash):
            raise webob.exc.HTTPUnauthorized

        if 'title' in params:
            item.title = params['title']
        if 'url' in params:
            item.url = params['url']
        if 'comment' in params:
            item.comment = params['comment']
        item.put()

        self.json_response(json_item(item))

    def delete(self, id_, edit_hash=None):
        item = models.Item.get_by_id(int(id_))
        if not can_edit(item, edit_hash):
            raise webob.exc.HTTPUnauthorized

        item.delete()

        self.json_response('true')

class APIPopularGroups(JSONRequestHandler):
    def get(self):
        group_data = memcache.get('popular') 
        if group_data is None:
            ids = [19021, 17005, 18023, 17010, 18028, 19007]
            if DEBUG:
                ids = [10, 111, 113]
            group_data = [json_group(models.Group.get_by_id(i)) for i in ids]
            memcache.add('popular', group_data, 60)
        self.json_response(group_data)


class APIMyGroups(JSONRequestHandler):
    def get(self):
        user = users.get_current_user()
        if not user:
            raise webob.exc.HTTPUnauthorized
        groups = models.Group.all().filter('user =', user)
        group_data = [json_group(g) for g in groups]
        self.json_response(group_data)


def can_edit(obj, edit_hash):
    user = users.get_current_user()
    if isinstance(obj, models.Item):
        group = obj.group
    elif isinstance(obj, models.Group):
        group = obj
    else:
        raise Exception('Object type not editable')
    if group.user == user or (
        group.edit_hash is not None and group.edit_hash == edit_hash):
        return True
    else:
        return False

class APIEditCheck(JSONRequestHandler):
    def post(self):
        params = json.loads(self.request.body)
        group = models.Group.get_by_id(int(params['id']))
        if can_edit(group, params.get('edit_hash')):
            self.json_response('true')
        else:
            self.json_response('false')

class APIAddToAccount(JSONRequestHandler):
    def post(self):
        params = json.loads(self.request.body)
        group = models.Group.get_by_id(int(params['id']))
        if can_edit(group, params.get('edit_hash')):
            group.user = users.get_current_user()
            group.edit_hash = None
            group.put()
            self.json_response('true')
        else:
            self.json_response('false')

class APIGroupDebug(JSONRequestHandler):
    def get(self, id_=None):
        if id_ is None:
            groups = models.Group.all()
        else:
            groups = [models.Group.get_by_id(int(id_))]

        resp_list = []    
        for group in groups:
            resp = json_group(group)
            resp['edit_hash'] = group.edit_hash
            resp_list.append(resp)
            self.json_response(resp_list)

routes = [
    ('/debug.html', DebugPage),

    ('/api/group', APIGroup),
    ('/api/group/(\d+)', APIGroup),
    ('/api/group/(\d+)/(\w+)', APIGroup),
    ('/api/item', APIItem),
    ('/api/item/(\d+)', APIItem),
    ('/api/item/(\d+)/(\w+)', APIItem),
    ('/api/popular_groups', APIPopularGroups),
    ('/api/my_groups', APIMyGroups),
    ('/api/rpc/group_edit_check', APIEditCheck),
    ('/api/rpc/add_to_account', APIAddToAccount),

    ('/til', TilRedirect),

    ('/', IndexPage),
    ('/.*', AppPage),
    ]
if DEBUG:
    routes = [
    ('/api/groupdebug/(\d+)', APIGroupDebug),
    ('/api/groupdebug', APIGroupDebug)
    ] + routes

app = webapp2.WSGIApplication(routes, debug=DEBUG)

template.register_template_library('templatetags.templatetags')
