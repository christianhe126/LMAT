sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/ComboBox",
    "sap/ui/core/Item",
    "../model/formatter",
    "../model/utility",
], function (Controller, JSONModel, Dialog, Button, Label, ComboBox, Item, formatter, utility) {
    "use strict";

    return Controller.extend("ui.controller.reuseDialog", {
        formatter: formatter,

        onInit: function () {
            this.oDialogReuse = this.byId("reuseDialog");
            this.oModel = this.getView().getModel("myModel");
        },

        open: function () {
            return new Promise(function (resolve, reject) {
                this._resolve = resolve;
                this._reject = reject;

                this.oDialogReuse.open();
            }.bind(this));
                
        },

        projectSelectionChange: function (oEvent) {
            var oSelectedItem = oEvent.getSource();
            var oContext = oSelectedItem.getBindingContext("myModel");
            console.log(oContext);
            this.byId("entityComboBox").bindItems({
                path: "myModel>/document('" + oContext.getProperty("documentID") + "')/entities",
                template: new Item({
                    key: "{myModel>content/contentID}",
                    text: {
                        path: 'myModel>content/source', 
                        formatter: formatter.parseTitle.bind(this)
                    }
                })
            });
        },

        onCreate: async function () {
            var oSelectedEntity = this.byId("entityComboBox");
            if (oSelectedEntity) {
                var oEntity = oSelectedEntity.getSelectedKey();

                var result = {"contentID": oEntity};
                this._resolve(result);
                /*console.log(result);
                if (this._fnCallback) {
                    this._fnCallback(result);
                }*/
            } else {
                this._reject("No item selected");
            }
            this.byId("reuseDialog").close();
        },

        onCancel: function () {
            this.byId("exportDialog").close();
        },

        onDialogClose: function () {
            // Clean up if necessary
        }
    });
});
