sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        ...
        "../model/formatter"
    ],
    function(BaseController, JSONModel, MessageBox, Dialog, Button, 
        HTML, Sorter, utility, formatter) {
      "use strict";
  
      return BaseController.extend("ui.controller.master", {
        formatter: formatter,

        ...
        // CONTROL EVENTS
        onTreeCellClick: function (oEvent) {
            var oRowContext = oEvent.getParameter("rowBindingContext");

            if (oRowContext) {
                var oModel = oRowContext.getModel();
                oModel.read(oRowContext.getPath(), {
                    ...
                    success: function (oRowData, oResponse) {
                        this.getOwnerComponent().getRouter()
                            .navTo("entityDetails", { entityID: oRowData.entityID });
                    }
                    ...
                });
            }
        },

        addNewContent: async function (oEvent) { 
            var oListItem = oEvent.getParameter("listItem");
            var oContext = oListItem.getBindingContext("contentTypes");
            var oModel = this.getView().getModel("myModel");

            ...
            await oModel.callFunction("/createEntry", {
                method: "POST",
                urlParameters: oEntryData,
                success: function (response) {
                    console.log(response);
                }
            });
            ...
        },

        ...
        
    });
});
