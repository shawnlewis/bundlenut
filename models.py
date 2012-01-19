from google.appengine.ext import db

class Group(db.Model):
    name = db.StringProperty()
    num_views = db.IntegerProperty(default=0)
    num_unique_views = db.IntegerProperty(default=0)
    edit_hash = db.StringProperty(default=None)
    ordering = db.ListProperty(int)
    user = db.UserProperty()

    
class Item(db.Model):
    title = db.StringProperty()
    url = db.StringProperty()
    comment = db.StringProperty()
    group = db.ReferenceProperty(Group)
