sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "sap/m/Dialog",
        "sap/m/Button",
        "sap/ui/core/HTML",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/core/mvc/XMLView",
        "../model/utility",
        "../model/formatter"
    ],
    function(BaseController, JSONModel, MessageBox, Dialog, Button, HTML, Filter, FilterOperator, XMLView, utility, formatter) {
      "use strict";
  
      return BaseController.extend("ui.controller.detail", {
        formatter: formatter,

        onInit : function (evt) {
            this.getOwnerComponent().getRouter().getRoute("entityDetails").attachPatternMatched(this._onRouteMatched, this);       
        },
        
		_onRouteMatched: async function(oEvent) {
            this.documentID = oEvent.getParameter("arguments").documentID;
            this.entityID = oEvent.getParameter("arguments").entityID;

            /*
            if(this.entityID !== this.master.mainEntity)
            {
                this.getOwnerComponent().getRouter().navTo("entityDetails", 
                { 
                    documentID: this.documentID,
                    entityID: this.master.mainEntity
                });
            }*/

            var oModel = this.getView().getModel("myModel")
            var sPath = "/document('" + this.documentID + "')/entities('" + this.entityID + "')";

            this.getView().bindElement({
                path: sPath,
                events: {
                    dataReceived: (data) => {
                        var context = this.getView().getBindingContext();
                        this.contentID = context.getProperty("content/contentID")
                        var treeTable = sap.ui.getCore().byId("container-ui---master--TreeTable");
                        
                        oModel.read(context.sPath, {
                            urlParameters: {
                              "$expand": "content($expand=contentType)"
                            },
                            success: function (oRowData, oResponse) { 
                                if(oRowData.parentNodeID && oRowData.parentNodeID !== "null") {
                                    this.getOwnerComponent().getRouter().navTo("entityDetails", 
                                    { 
                                        documentID: this.documentID,
                                        entityID: oRowData.parentNodeID,
                                    });
                                    return;
                                }

                                setTimeout(() => {
                                    // Select the right element in the tree table
                                    var rows = treeTable.getBinding("rows");
                                    for (let i = 0; i < rows.getLength(); i++) {
                                        let row = rows.getContextByIndex(i);
                                        if(row.sPath.includes(oRowData.entityID)) {
                                            treeTable.expand(i);
                                            treeTable.setSelectedIndex(i);
                                        }
                                    }  
                                }, 100);
                                

          
                            }.bind(this),
                            error: function (oError) {
                                console.error("Error while reading data", oError);
                            }
                        })
                    },
                    error: function (oEvent) {
                        console.log(oEvent)
                    }
                }
            });
		},

        createInstance: function (viewName) {
            var oView = XMLView.create({
                viewName: viewName
            });
            oView.then(function(oViewInstance) {
                this.getView().byId("contentContainer").addItem(oViewInstance);
                this.contentObject = oViewInstance;
            }.bind(this));
        },

        onRichTextEditorReady: function (oEvent) {
            var rte = this.getView().byId("richTextEditor")
            rte.addButtonGroup("table");
            rte.addButtonGroup("styleselect");
            console.log("RTE ready")
        },

        onRichTextEditorChange: async function (oEvent) {
            var treeTable = sap.ui.getCore().byId("container-ui---master--TreeTable");
            var value = oEvent.getSource().getValue();
            var match = value.match(/<h1[^>]*>(.*?)<\/h1>/gi)
            if(!match)
                return;

            if(this.lastState !== match.join('')) {
                setTimeout(() => {
                    utility.onRefreshTreeTable(treeTable);
                }, 100);
            }
            this.lastState = match.join('');
        },

        onTagLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue();

            if (!sValue.startsWith("$")) {
                oInput.setValue("$" + sValue.replace(/^\$+/, ''));
            }
        },

        onAddAutomationPress: function () {
            const tag = this.byId("automationTagInput").getValue();
            const url = this.byId("urlInput").getValue();
            const selector = this.byId("selectorInput").getValue();

            if(tag === "" || url === "" || selector === "") {
                MessageBox.show("Please fill in all fields");
                return;
            }

            var oContext = this.getView().getBindingContext();
            var sPath = oContext.getPath();
            fetch("http://localhost:4004/odata/v2/browse/" + sPath+ "/content_contentID").then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                const contentID = data.d.content_contentID;

                var oModel = this.getView().getModel("myModel");
                var automationContext = oModel.getProperty("/automations");
                if (!automationContext) {
                    var automationContext = oModel.createEntry("/automations", {
                        properties: {
                            content_contentID: contentID,
                            tag: tag,
                            url: url,
                            selector: selector
                        },
                        error: (oError) => {
                            console.log("Create failed", oError);
                            MessageBox.show("Creation failed: " + utility.getResponseErrorText(oError));
                        }
                    });
                }

                oModel.submitChanges({
                    success: () => { 
                        console.log("Submitted"); 
                        this.byId("automationTagInput").setValue("");
                        this.byId("urlInput").setValue("");
                        this.byId("selectorInput").setValue("");
                        this.getView().getElementBinding().refresh();
                    },
                    error: (error) => { 
                        console.log("Create failed"); 
                        MessageBox.show("Create failed " + error);
                    }
                });
            })     
        },

        onSyncAutomationPress: async function () {
            var oTable = this.byId("automationTable");
            oTable.setBusy(true);

            var oModel = this.getView().getModel("myModel")
            await oModel.callFunction("/syncAutomation", {
                method: "POST",
                urlParameters: {contentID: this.contentID},
                success: function (response) {
                    console.log(response)
                    oModel.refresh();
                    oTable.setBusy(false);

                },
                error: (oError) => {
                    MessageBox.show(utility.getResponseErrorText(oError));
                    oTable.setBusy(false);
                }
            })
        },

        onDeletePress: async function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext("myModel");
            var sPath = oContext.getPath();
            var oModel = this.getView().getModel("myModel");
            oModel.remove(sPath, {
                success: function () {
                    console.log("Deleted");
                    oModel.refresh();
                },
                error: function () {
                    console.log("Delete failed");
                }
            });

            // Remove selection
            this.byId("automationTable").removeSelections();

        },

        removeReuse: async function (oEvent) {
            var oModel = this.getView().getModel("myModel");
            oModel.setProperty("/content/reuse", null);
            console.log("Removed reuse");
        },

        onTitleChange: async function (oEvent) {
            var sourcePath = "/contents('" + this.contentID + "')/source";
            var sTitle = oEvent.getParameter("value");
            var sLargeString = this.getView().getModel("myModel").getProperty(sourcePath);
            console.log(sLargeString);
            var sUpdatedString = this.formatter.serializeTitle(sTitle, sLargeString);
            console.log(sUpdatedString);
            this.getView().getModel("myModel").setProperty(sourcePath, sUpdatedString);
            await this.getView().getModel("myModel").submitChanges();
        },

        onLayoutButtonSelect: async function (oEvent) {
            var selectedIndex = oEvent.getParameter("selectedIndex");
            var oRadioButtonGroup = oEvent.getSource();

            console.log(selectedIndex)
      
            var sourcePath = "/contents('" + this.contentID + "')/source";
            var sLargeString = this.getView().getModel("myModel").getProperty(sourcePath);
            var sUpdatedString = this.formatter.serializeVertical(selectedIndex, sLargeString);
            console.log(sUpdatedString);
            this.getView().getModel("myModel").setProperty(sourcePath, sUpdatedString);
            await this.getView().getModel("myModel").submitChanges();
        },

        onVerticalSelectionChanged: function (oEvent) {
            console.log("selection changed")
            var oList = this.byId("checkBoxSectionType");
            var aItems = oList.getItems();
            oList.setSelectedItem(aItems[0])
        },
        
    });
});