ListCollection = new Mongo.Collection("lists");
CategoryCollection = new Mongo.Collection("categories");
ItemCollection = new Mongo.Collection("items");

if (Meteor.isClient) {
  // This code only runs on the client
  Template.body.helpers({
    currentList: function() {
      return ListCollection.findOne(Session.get("currentList"));
    }
  });
  Template.lists.helpers({
    allLists: function() {
      return ListCollection.find({}, {sort: {name: 1}});
    },
    currentList: function() {
      return ListCollection.findOne(Session.get("currentList"));
    }
  });
  Template.list.helpers({
    isCurrent: function() {
      // console.log("listDetail.isCurrent()");
      return this._id == Session.get("currentList");
    },
    addingItems: function() {
      return !!this.addingItems;
    }
  });
  Template.listDetail.helpers({
    myCategories: function() {
      // console.log("listDetail.myCategories()");
      return CategoryCollection.find({ listId: this.list._id});
    }
  });
  Template.category.helpers({
    showForm: function() {
      // console.log("category.showForm()");
      return this.addingItems;
    },
    isEmpty: function() {
      // console.log("category.isEmpty()");
      return ItemCollection.find({ categoryId: this._id }).count() == 0;
    },
    myItems: function() {
      return ItemCollection.find({categoryId: this._id})
    }
  });
  Template.item.helpers({
    inCart: function() {
      // console.log("listDetail.myCategories()");
      return this.inCart;
    }
  });

  Template.body.events({
    "submit .new-list": function (event) {
      // This function is called when the new task form is submitted

      list = { name: event.target.name.value,
               addingItems: false };

      Meteor.call("addList", list);

      // Clear form
      event.target.name.value = "";

      // Prevent default form submit
      return false;
    }
  });

  Template.listDetail.events({
    "submit .new-category": function (event) {
      var category = {name: event.target.name.value,
                      listId: this.list._id,
                      empty: true,
                      addingItems: false}

      Meteor.call("addCategory", category);

      event.target.name.value = "";
      // Prevent default form submit
      return false;
    },
    "click .checkout": function (event) {
      Meteor.call("checkout", this.list);
    }
  });

  Template.lists.events({
    "click .lists-title.minimized": function (event) {
      Session.set("currentList", null);
    }
  });

  Template.list.events({
    "click .delete": function (event) {
      Meteor.call("deleteList", this);
    },
    "click .list-name": function (event) {
      Session.set("currentList", this._id);
    }
  });

  Template.category.events({
    "click .add-item": function (event) {
      Meteor.call("toggleAdding", 'category', this);
    },
    "submit .new-item": function (event) {
      var item = {name: event.target.name.value,
                  measure: event.target.measure.value,
                  quantity: event.target.quantity.value,
                  categoryId: this._id,
                  inCart: false };
      Meteor.call("addItem", item);

      event.target.name.value = event.target.measure.value = event.target.quantity.value = ""
      document.getElementsByClassName('item-name-input')[0].focus()
      return false;
    },
    "click .delete": function (event) {
      Meteor.call("deleteCategory", this);
    }
  });
  Template.item.events({
    "click .delete": function (event) {
      Meteor.call("deleteItem", this);
    },
    "click span.item-name": function (event) {
      Meteor.call("toggleItemStatus", this)
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}

Meteor.methods({
  addList: function (list) {
    Meteor.call("checkAuthorization");
    ListCollection.insert(list);
  },
  deleteList: function (list) {
    Meteor.call("checkAuthorization");
    ListCollection.remove(list);
  },
  checkout: function(list) {
    Meteor.call("checkAuthorization");
    var categoryIds = CategoryCollection.find({ listId: list._id }).map(function (doc){ return doc._id; })
    ItemCollection.remove({ categoryId: { $in: categoryIds }, inCart: true } )
  },
  addCategory: function (category) {
    Meteor.call("checkAuthorization");
    CategoryCollection.insert(category);
  },
  deleteCategory: function (category) {
    Meteor.call("checkAuthorization");
    CategoryCollection.remove(category);
  },
  toggleAdding: function(type, item) {
    Meteor.call("checkAuthorization");
    if(type == "category") {
      CategoryCollection.update({ _id: item._id }, { $set: { addingItems: !item.addingItems } });
    } else if(type == "list") {
      ListCollection.update({ _id: item._id }, { $set: { addingItems: !item.addingItems } });
    }
  },
  addItem: function(item) {
    Meteor.call("checkAuthorization");
    ItemCollection.insert(item);
    CategoryCollection.update({_id: item.categoryId}, { $set: {empty: false} });
  },
  deleteItem: function(item) {
    Meteor.call("checkAuthorization");
    ItemCollection.remove(item);
  },
  toggleItemStatus: function(item) {
    Meteor.call("checkAuthorization");
    ItemCollection.update({ _id: item._id }, { $set: { inCart: !item.inCart} } );
  },
  checkAuthorization: function() {
    var authorized = false;
    emails = ['natehershey@gmail.com', 'becky.hoppe@gmail.com'];
    for(var i=0; i<emails.length; i++) {
      if(emails[i] == Meteor.user().services.google.email) {
        authorized = true;
      }
    }
    if(!authorized) {
      throw new Meteor.Error("not-authorized");
    }
  }
});

// db.lists.update({ "_id": 'FkGLpRhLzRTgJaKgo',"categories.name": 'Produce', "categories.0.items.name": 'Caviar'}, {$set: {"categories.0.items.$.inCart": true}})

// db.lists.update({ _id: 'FkGLpRhLzRTgJaKgo', 'categories.name': 'Produce' },
//                 { $push: { 'categories.$.items': {name: 'Caviar',
//                                                   measure: '12',
//                                                   quantity: 'tons',
//                                                   categoryName: 'Produce',
//                                                   inCart: false }}}
// )
// db.lists.update( { _id: "naQFRdHdiMXgZdkmb", categories.items.name":"Caviar" }, { $pull: { "categories.$.items": {"name":'Caviar'} } } )

// [
//   { name: "Groceries",
//     categories: [
//       { name: 'produce',
//         empty: false,
//         items: [
//           { name: 'apples',
//             quantity: 4
//           },
//           { name: 'bell peppers',
//             quantity: 6
//           },
//           { name: 'lettuce',
//             quantity: 4,
//             measure: 'salads worth'
//           }
//         ]
//       }
//     ]
//   },
  // { name: "Hardware Store",empty: true},
//   { name: "For Becky",
//     empty: true
//   }
// ]