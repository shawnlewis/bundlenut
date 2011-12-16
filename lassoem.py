import hashlib
import json
import os
import sys
import traceback
import webob
import webob.exc
import webapp2

from google.appengine.ext import db
from google.appengine.ext.webapp import template

import models

DEBUG = True


def get_file(rel_path):
    return os.path.join(os.path.dirname(__file__), rel_path)

class AppPage(webapp2.RequestHandler):
    def get(self):
        self.response.out.write(template.render(
            get_file('templates/index.html'), {'debug': DEBUG}))

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
        'ordering': group.ordering
    }

def json_item(item):
    return {
        'id': str(item.key().id()),
        'title': item.title,
        'url': item.url
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
        edit_hash = hashlib.md5()
        edit_hash.update(os.urandom(1000))
        group.edit_hash = edit_hash.hexdigest()
        group.put()

        resp = json_group(group)
        resp['edit_hash'] = group.edit_hash
        self.json_response(resp)

    def put(self, id_):
        # edit group
        pass

    def delete(self, id_):
        # delete group
        pass

class APIItem(JSONRequestHandler):
    def get(self, id_):
        item = models.Item.get_by_id(int(id_))
        self.json_response(json_item(item))

    def post(self):
        params = json.loads(self.request.body)

        group = db.get(db.Key(params['group']))
        if group.edit_hash != params['edit_hash']:
            raise webob.exc.HTTPUnauthorized

        item = models.Item()
        item.title = params['title'] or None
        item.url = params['url'] or None
        item.group = group
        item.put()

        self.json_response(json_item(item))

    def put(self, key):
        # edit item
        pass

    def delete(self, id_):
        params = json.loads(self.request.body)

        group = db.get(db.Key(params['group']))
        if group.edit_hash != params['edit_hash']:
            raise webob.exc.HTTPUnauthorized

        item = models.Item.get_by_id(int(id_))
        item.delete()

        self.json_response('true')


class APIEditCheck(JSONRequestHandler):
    def post(self):
        params = json.loads(self.request.body)
        group = models.Group.get_by_id(int(params['id']))
        if group.edit_hash == params['edit_hash']:
            self.json_response('true')
        else:
            self.json_response('false')

class APIGroupDebug(JSONRequestHandler):
    def get(self, id_):
        group = models.Group.get_by_id(int(id_))
        resp = json_group(group)
        resp['edit_hash'] = group.edit_hash,
        self.json_response(resp)

routes = [
    ('/debug.html', DebugPage),

    ('/api/group', APIGroup),
    ('/api/group/(\d+)', APIGroup),
    ('/api/item', APIItem),
    ('/api/item/(\d+)', APIItem),
    ('/api/rpc/group_edit_check', APIEditCheck),

    ('/.*', AppPage),
    ]
if DEBUG:
    routes = [
    ('/api/groupdebug/(\d+)', APIGroupDebug)
    ] + routes

app = webapp2.WSGIApplication(routes, debug=DEBUG)

template.register_template_library('templatetags.templatetags')
