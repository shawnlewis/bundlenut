from google.appengine.ext import db

class Group(db.Model):
    name = db.StringProperty()
    num_views = db.IntegerProperty()
    num_unique_views = db.IntegerProperty()
    edit_hash = db.StringProperty()

    
class Item(db.Model):
    title = db.StringProperty()
    url = db.LinkProperty()
    group = db.ReferenceProperty(Group)
