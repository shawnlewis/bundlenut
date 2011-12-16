import json

from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

import models


class MainPage(webapp.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write('Hello, webapp World!')


class APIGroup(webapp.RequestHandler):
    def get(self, key):
        # list group
        pass

    def post(self):
        self.response.out.write('response')
        pass

    def put(self, key):
        # edit group
        pass

    def delete(self, key):
        # delete group
        pass


class APIItem(webapp.RequestHandler):
    def get(self, key):
        # list item
        pass

    def post(self):
        # create item
        pass

    def put(self, key):
        # edit item
        pass

    def delete(self, key):
        # delete item
        pass


application = webapp.WSGIApplication(
    [
    ('/', MainPage),

    ('/group', APIGroup),
    ('/group/(\d+)', APIGroup),
    
    ('/item', APIItem),
    ('/item/(\d+)', APIItem)

    ],
    debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
