sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "sap/m/MessageToast",
        "sap/m/Dialog",
        "sap/m/Button",
        "sap/ui/core/HTML",
        "sap/ui/model/Sorter",
        "sap/ui/model/odata/v2/ODataModel",
        "../model/utility",
        "../model/formatter"
    ],
    function(BaseController, JSONModel, MessageBox, MessageToast, Dialog, Button, HTML, Sorter, ODataModel, utility, formatter) {
      "use strict";
  
      return BaseController.extend("ui.controller.master", {
        formatter: formatter,

        onInit: function() {
            console.log("Master controller initialized")

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("document").attachPatternMatched(this._onDocumentRouteMatched, this);
            //oRouter.getRoute("entityDetails").attachPatternMatched(this._onDocumentRouteMatched, this);
            oRouter.getRoute("default").attachPatternMatched(this._onDefaultRouteMatched, this);
        },

        _onDefaultRouteMatched: function () {
            console.log("Default route matched")
            if (!this.oDialog) {
                this.oDialog = sap.ui.xmlview("ui.view.ProjectDialog");
                this.getView().addDependent(this.oDialog);
            }
            this.oDialog.getController().open(this);
        },

        _onDocumentRouteMatched: function (oEvent) {
            console.log("Document route matched")
            this.documentID = oEvent.getParameter("arguments").documentID;
            console.log("Document ID: " + this.documentID)

            //var oModel = new ODataModel("myModel");
            try {
                this.getView().bindElement({
                    //path: "myModel>/document('" + this.documentID + "')",
                    path: "myModel>/document('" + this.documentID + "')",
                    events: {
                        dataReceived: function (oData) {
                            if (!oData || !oData.getParameter("data")) {
                                console.log("Error: No data received or invalid data.");
                                this._onDefaultRouteMatched();
                                return;
                            }
                            //this.getView().getModel("myModel").setProperty("/document('" + this.documentID + "')" + "/source","");
                            //this.getView().getModel("myModel").submitChanges();
                            /*
                            this.mainEntity = oData.getParameter("data").mainEntity;
                            //this.getView().byId("TreeTable").getBinding("rows").sort(new Sorter("order", false));
                            //this.getView().byId("TreeTable").attachBrowserEvent("dblclick", this.onDblClick);
                            /*this.getOwnerComponent().getRouter().navTo("entityDetails", 
                            { 
                                documentID: this.documentID,
                                entityID: this.mainEntity//oRowData.entityID,
                            });*/
                        }.bind(this),
                        error: function (oError) {
                            console.log("Error: " + oError);
                            this._onDefaultRouteMatched();
                        }.bind(this)
                    }
                });
            }
            catch (error) {
                console.log("Error2", error)
                this._onDefaultRouteMatched();
            }   
        },

        onRowsUpdated: function (oEvent) {
            if(!this.first) {
                var oTable = this.byId("TreeTable");
                oTable.expandToLevel(0);
                this.first = true
            }   
        },

        onAfterRendering: function () {
            
        },

        onTreeCellClick: function (oEvent) {
            return
            var oTable = this.byId("TreeTable");
            oTable.setSelectedIndex(oEvent.getParameter("rowIndex"))

            var iRowIndex = oEvent.getParameter("rowIndex");
            var iColumnIndex = oEvent.getParameter("cellControl").getParent().getIndex();
            var oRowContext = oEvent.getParameter("rowBindingContext");
            this.selectedRow = iRowIndex;
            this.selectedRowPath = oRowContext.getPath();

            if (oRowContext) {
                var oModel = oRowContext.getModel()
                oModel.read(oRowContext.getPath(), {
                  urlParameters: {
                    "$expand": "content($expand=contentType)"
                  },
                  success: function (oRowData, oResponse) { 
                        utility.onRefreshTreeTable(this.byId("TreeTable")); 
                        
                        if(!oRowData.parentNodeID || oRowData.parentNodeID === "null") {
                            this.getOwnerComponent().getRouter().navTo("entityDetails", 
                            { 
                                documentID: this.documentID,
                                entityID: oRowData.mainEntity,
                            });
                        } 
                        else {
                            this.getOwnerComponent().getRouter().navTo("entityDetails", 
                            { 
                                documentID: this.documentID,
                                entityID: oRowData.parentNodeID,
                            });
                        }

                  }.bind(this),
                  error: function (oError) {
                      console.error("Error while reading data", oError);
                  }
                })
                oTable.expand(iRowIndex);
            }
        },

        onDragDrop: async function(oEvent) {
            // Bindings
            var oTreeTable = this.byId("TreeTable");
            var oModel = oTreeTable.getBinding().getModel("myModel");
            var oDraggedRow = oEvent.getParameter("draggedControl");
            var oDroppedRow = oEvent.getParameter("droppedControl");
            var sDropPosition = oEvent.getParameter("dropPosition");

            // Calculate the new parent ID and position based on the drop position
            var source = oDraggedRow.getBindingContext("myModel");
            var destination = oDroppedRow.getBindingContext("myModel");

            // Properties
            const oldOrderID = source.getProperty("order");
            console.log(source.getPath());

            console.log("Model Data before update:", oModel.getProperty(source.getPath()));

            console.log("Dragged Entity ID:", source.getProperty("entityID"));
            console.log("Dropped Entity ID:", destination.getProperty("entityID"));
            console.log("Drop Position:", sDropPosition);
            console.log("Old order:", source.getProperty("order"));
            console.log("Old parent", source.getProperty("parentNodeID"))

            var source_content_type = source.getProperty("content/contentType_contentTypeID")
            var destination_content_type = destination.getProperty("content/contentType_contentTypeID")
            if (destination_content_type !== "T001" && sDropPosition === "On") {
                MessageToast.show("You can only drop entities into chapters.");
                return;
            }

            if(source_content_type === "T001" && sDropPosition === "On") {
                MessageToast.show("You cannot nest chapters.");
                return;
            }

            var newParentId = destination.getProperty("entityID");
            var newHierarchyLevel = destination.getProperty("hierarchyLevel") + 1;
            var newOrderID = 0;
            if (sDropPosition === "After" || sDropPosition === "Before") {
                newParentId = destination.getProperty("parentNodeID"); // Adjust if using a position other than "Between"
                newHierarchyLevel = destination.getProperty("hierarchyLevel");
                newOrderID = destination.getProperty("order") //- (sDropPosition === "Before" ? 1 : 0);
            
                console.log("New Order ID:", newOrderID);

                // Append order for all elements larger than the new order on the same hierarchy level
                var aEntities = Object.values(oModel.getProperty("/"));
                aEntities = aEntities.filter(entity => entity.entityID && entity.parentNodeID === newParentId)

                if(newOrderID > source.getProperty("order")) {
                    aEntities = aEntities.filter(entity => entity.order <= newOrderID && entity.order > source.getProperty("order"))
                    aEntities.forEach(entity => {
                        console.log("Fall 1, -1:", entity.entityID, entity.order)
                        oModel.setProperty("/entities('" + entity.entityID + "')/order", entity.order - 1);
                    })
                }

                if(newOrderID < source.getProperty("order")) {
                    aEntities = aEntities.filter(entity => entity.order >= newOrderID && entity.order < source.getProperty("order"))
                    aEntities.forEach(entity => {
                        console.log("Fall 2. +1:", entity.entityID, entity.order)
                        oModel.setProperty("/entities('" + entity.entityID + "')/order", entity.order + 1);
                    })
                }
            }
            else if (sDropPosition === "On")
            {
                oTreeTable.expand(oDroppedRow.getIndex());
                var aEntities = Object.values(oModel.getProperty("/"));
                console.log("debug4", aEntities)
                aEntities = aEntities.filter(entity => entity.entityID && entity.parentNodeID === newParentId)
                aEntities.sort((a,b) => a.order < b.order)
                if(aEntities.length > 0)
                    newOrderID = aEntities[0].order + 1
            }

            // New Parent gets one child
            //oModel.setProperty(destination.getPath() + "/drillState", "expanded")

            // if old parent looses all childs
            const oldParentNodeID = source.getProperty("parentNodeID")
            if(oldParentNodeID) {
                var res = await oModel.callFunction("/getChildren", {
                    method: "POST",
                    urlParameters: {entityID: oldParentNodeID},
                    success: function (response) {
                        console.log("response", response, response.results.length, oldParentNodeID)
                        if(response.results.length === 0)
                            oModel.setProperty("/entities('" + oldParentNodeID + "')/drillState", "leaf")
                    },
                    error: function (error) {
                        console.error("Error fetching children:", error);
                    }
                })            
            }
            

            console.log("New Parent ID:", newParentId);

            // Update the model with new parent ID based on the drop position
            var sDraggedPath = source.getPath();
            oModel.setProperty(sDraggedPath + "/parentNodeID", newParentId);
            oModel.setProperty(sDraggedPath + "/hierarchyLevel", newHierarchyLevel);
            oModel.setProperty(sDraggedPath + "/order", newOrderID);
            console.log("Model Data after update:", oModel.getProperty(source.getPath()));

            // Submit changes to server
            utility.prepareRefreshTreeTable(this.byId("TreeTable"));
            oModel.submitChanges({
                success: function() { 
                    console.log("Move successful"); 
                },
                error: function() { console.log("Move failed"); }
            });
        },

        addContent: async function (oEvent) {
            var oEntryData = {
                documentID: this.documentID,
                source: "Example Content",
                contentTypeID: "T002",
                drillState: "leaf"
            };
            this.createEntry(oEntryData);
        },

        addSection: async function (oEvent) {
            var oDialog = new Dialog({
                    title: "Create a new Section:",
                    content: [
                        new sap.m.Input("inputField", {
                            width: "100%",
                            placeholder: "New Section"
                        })
                    ],
                    endButton: new Button({
                        text: "OK",
                        press: async function () {
                            var chapterName = sap.ui.getCore().byId("inputField").getValue();
                            var oEntryData = {
                                documentID: this.documentID,
                                title: chapterName,
                                source: "<H1>[Title]</H1><p>Content1</p>",
                                contentTypeID: "T001",
                                drillState: "expanded"
                            };
                            var entity = await this.createEntry(oEntryData);
                            if(!entity || !entity.createEntry)
                                return;

                            var oEntryData = {
                                documentID: this.documentID,
                                source: "Example Content",
                                title: "[Title]",
                                parentNodeID: entity.createEntry,
                                contentTypeID: "T002",
                                hierarchyLevel: 1,
                                drillState: "leaf"
                            };
                            await this.createEntry(oEntryData);
                            var oTreeTable = this.getView().byId("TreeTable");
                            var oBinding = oTreeTable.getBinding("rows");
                            console.log(oBinding.getLength())
                            //this.getView().byId("TreeTable").setSelectedIndex()

                            oDialog.close();
                        }.bind(this)
                    }),
                    beginButton: new Button({
                        text: "Cancel",
                        press: function () {
                            oDialog.close();
                        }
                    }),
                    afterClose: function () {
                        oDialog.destroy();
                    }
            });
    
            this.getView().addDependent(oDialog);
            oDialog.open();
        },

        addNewContent: async function (oEvent) { 
            var oListItem = oEvent.getParameter("listItem");
            var oContext = oListItem.getBindingContext("contentTypes");
            var contentData = oContext.getObject();
            var oModel = this.getView().getModel("myModel");

            var oEntryData = {
                documentID: this.documentID,
                source: "New " + contentData.name,
                contentTypeID: contentData.contentTypeID,
                drillState: "leaf"
            };

            if(contentData.contentTypeID === "T001")
            {
                oEntryData.source = '{"title":"New ' + contentData.name + '"}';
            }
            else if(contentData.contentTypeID === "T002")
            {
                oEntryData.source = "New Content";
            }
            else if(contentData.contentTypeID === "T005")
            {
                try {
                    if (!this.oDialogReuse) {
                        this.oDialogReuse = sap.ui.xmlview("ui.view.reuseDialog");
                        this.oDialogReuse.bind
                        this.getView().addDependent(this.oDialogReuse);
                    }
        
                    var data = await this.oDialogReuse.getController().open();
                    console.log("Data from dialog:", data);
                    oEntryData.contentID = data.contentID;
                    
                } catch (error) {
                    console.log("Dialog was canceled", error);
                    oEvent.getSource().removeSelections(true);
                    return;
                }
            }

            this.createEntry(oEntryData);
            oEvent.getSource().removeSelections(true);
          },

          duplicatePressed: async function(oEvent) {
            var oModel = this.getView().getModel("myModel");
            var oEntryData = {
                documentID: this.documentID,
                contentID: oModel.getProperty(this.selectedRowPath + "/content_contentID"),
                drillState: "leaf"
            };
            this.createEntry(oEntryData);

          },

          createEntry: async function(oEntryData) {
            var oModel = this.getView().getModel("myModel");
            var path = "/createEntry"
            return new Promise((resolve, reject) => {
                oModel.callFunction(path, {
                    method: "POST",
                    urlParameters: oEntryData,
                    success: function (response) {
                        utility.onRefreshTreeTable(this.getView().byId("TreeTable"));
                        this.getOwnerComponent().getRouter().navTo("entityDetails", 
                        {
                            documentID: this.documentID,
                            entityID: response.createEntry,
                        });
                        resolve(response)
                    }.bind(this),
                    error: function (error) {
                        console.error("Error creating entry:", error);
                        reject(error)
                    }
                })
            });
          },

          exportPressed: async function(oEvent) {
            this.name = this.getView().getModel("myModel").getProperty("/document('" + this.documentID + "')/name");
            console.log("Export pressed")
            if (!this.oDialogExport) {
                this.oDialogExport = sap.ui.xmlview("ui.view.ExportDialog");
                this.getView().addDependent(this.oDialogExport);
            }
            this.oDialogExport.getController().open(this);
        },

        onDeletePressed: async function() {
            var oModel = this.getView().getModel("myModel");
            var treeTable = this.getView().byId("TreeTable")

            var selectedIndices = treeTable.getSelectedIndices();

            if (selectedIndices.length === 0) {
                MessageToast.show("Please select at least one entity to delete");
                return;
            }
            var oDialog = new Dialog({
                title: "Info",
                content: new sap.m.Text({ text: "Do you really want to delete the selected element(s)?" }),
                type: "Message",
                endButton: new Button({
                    text: "Yes",
                    press: async function () {
                        for (var i = 0; i < selectedIndices.length; i++) {
                            var oContext = treeTable.getContextByIndex(selectedIndices[i]);
                            var oRowData = oContext.getObject();
                            
                            await new Promise((resolve, reject) => {
                                oModel.callFunction("/deleteEntry", {
                                    method: "POST",
                                    urlParameters: { entityID: oRowData.entityID },
                                    success: function (response) {
                                        resolve(response);
                                    },
                                    error: function (error) {
                                        reject(error);
                                    }
                                });
                            });
                        };

                        utility.onRefreshTreeTable(this.byId("TreeTable"));

                        oDialog.close();
                    }.bind(this)
                }),
                beginButton: new Button({
                    text: "Cancel",
                    press: function () {
                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });

            this.getView().addDependent(oDialog);
            oDialog.open(); 
        },

        onSyncAllPressed: async function() {
            var oModel = this.getView().getModel("myModel")
            var oTreeTable = this.getView().byId("TreeTable");
            oTreeTable.setBusy(true);
            await oModel.callFunction("/syncAllAutomations", {
                method: "POST",
                success: function (response) {
                    console.log(response)
                    utility.onRefreshTreeTable(this.getView().byId("TreeTable"));
                    oTreeTable.setBusy(false);
                    MessageToast.show("Sync successful!");

                }.bind(this),
                error: (oError) => {
                    MessageBox.show(utility.getResponseErrorText(oError));
                    oTreeTable.setBusy(false);
                }
            })
        },

        // DETAILS

        onRichTextEditorReady: function (oEvent) {
            var rte = this.getView().byId("richTextEditor")
            rte.addButtonGroup("table");
            rte.addButtonGroup("styleselect");
            console.log("RTE ready")
        },

        onRichTextEditorChange: async function (oEvent) {
            this.getView().getModel("myModel").setProperty("/document('" + this.documentID + "')" + "/source", oEvent.getSource().getValue());
            this.getView().getModel("myModel").submitChanges();
            var treeTable = this.getView().byId("TreeTable");
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
    });
});