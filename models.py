from google.appengine.ext import db

class Group(db.Model):
    name = db.StringProperty()
    num_views = db.IntegerProperty(default=0)
    num_unique_views = db.IntegerProperty(default=0)
    edit_hash = db.StringProperty()
    ordering = db.ListProperty(int)

    
class Item(db.Model):
    title = db.StringProperty()
    url = db.LinkProperty()
    comment = db.StringProperty()
    group = db.ReferenceProperty(Group)
