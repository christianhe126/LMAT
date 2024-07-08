sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "sap/m/Dialog",
        "sap/m/Button",
        "sap/ui/core/HTML",
        "../model/utility"
    ],
    function(BaseController, JSONModel, MessageBox, Dialog, Button, HTML, utility) {
      "use strict";
  
      return BaseController.extend("ui.controller.Main", {
        onInit : function (evt) {

		    },

        autoUpdateContent: function () {
          var oModel = this.getView().getModel();
          var oContext = oModel.bindContext("/getAutoContent(...)");

          console.log(this.getView().getModel("selected").getData())

          const contentTypeName = this.getView().getModel("selected").getProperty("/content/contentType/name")
          const url = this.getView().getModel("selected").getProperty("/content/url")
          const selector = this.getView().getModel("selected").getProperty("/content/selector")

          console.log(contentTypeName, url, selector)

          oContext.setParameter("content", this.getView().getModel("selected").getProperty("/content"));

          oContext.execute().then(() => {
              var contextData = oContext.getBoundContext().getObject();
              console.log("Data received:", contextData);

              this.getView().getModel("selected").setProperty("/content", contextData)
              console.log(this.getView().getModel("selected").getData())
          }).catch(function(oError) {
              console.error("Error:", oError);
          });
          
          
        },

        openPopup: function () {
          var sUrl = "https://www.google.com"; // URL you want to display
          var oHtml = new HTML({
            content: "<iframe src='" + sUrl + "' style='width: 100%; height: 100%; border: 0;'></iframe>"
          });

          var oDialog = new Dialog({
            title: "External Content",
            contentWidth: "800px",
            contentHeight: "600px",
            content: oHtml,
            beginButton: new Button({
              text: "Close",
              press: function () {
                oDialog.close();
              }
            })
          });

          oDialog.open();
        },

        expandAll: function() {
          var oTree = this.getView().byId("TreeTable");
          oTree.expandToLevel(3);
        },

        exportPressed: function() {
          var export_data = JSON.stringify(this.getOwnerComponent().getModel("entities").
          getData().value)
          console.log(export_data)
                fetch('http://localhost:4004/export/generate_ppt', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({data: export_data})
                  })
                  .then(response => {
                    // Check if the request was successful
                    if (!response.ok) {
                        throw new Error('Network response was not ok ' + response.statusText);
                    }
                    return response.text();  // Here we read the response body as text
                  })
                  .then(base64String => {
                    let blob = utility.base64ToBlob(JSON.parse(base64String).value, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
                    const url = URL.createObjectURL(blob);

                    // Create a link and trigger download
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'MyPresentation.pptx';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  })
                  .catch(error => {
                    MessageBox.error("Failed to generate presentation: " + error.message);
                  });
        },

        importPressed: function() {
          fetch('http://localhost:4004/export/import_ppt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          })
          .then(response => {
            // Check if the request was successful
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.text();  // Here we read the response body as text
          })
          .then(data => {
            console.log(data);
          })
          .catch(error => {
            MessageBox.error("Failed to generate presentation: " + error.message);
          });
        },

        onTreeCellClick: function (oEvent) {
          var oTable = this.byId("TreeTable");
          var iRowIndex = oEvent.getParameter("rowIndex");
          var iColumnIndex = oEvent.getParameter("cellControl").getParent().getIndex();
          var oRowContext = oEvent.getParameter("rowBindingContext");
          
          console.log("hi")
          console.log(oRowContext)
          //oRowContext.getModel().setProperty(oRowContext.getPath() + "/content/source", "Test")
          //oRowContext.getModel().submitChanges();

          if (oRowContext) {
              var oModel = oRowContext.getModel()
              oModel.read(oRowContext.getPath(), {
                urlParameters: {
                  "$expand": "content($expand=contentType)"
                },
                success: function (oRowData, oResponse) {
                    var oModel = new JSONModel(oRowData);
                    this.getView().setModel(oModel, "selected");
                    console.log(oRowData)
                    
                    var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                    oRouter.navTo("detailDetail", {
                        productPath: encodeURIComponent(oRowContext.getPath())
                    });
                    /*
                    this.byId("SplitApp").to("detailDetail", {
                      entityID: oRowData.EntityID
                    });*/
                    //this.getSplitAppObj().to(this.createId("detailDetail"));
                }.bind(this),
                error: function (oError) {
                    console.error("Error while reading data", oError);
                }
              })
          }
        },

        resourceListItemSelectionChange: function (oEvent) { 
          var oListItem = oEvent.getParameter("listItem");
          var oContext = oListItem.getBindingContext("contentTypes"); // This is the key part
          var contentData = oContext.getObject();

          var data = this.getOwnerComponent().getModel("entities").getData().value;

          data.push({"parentEntityID": 0, 
                      "resourceID_resourceID": 0, 
                      "content": "New " + contentData.name, 
                      "contentType": contentData.name,
                      "nodes": []
                    });

          this.getOwnerComponent().getModel("entities").setData({value: data});
          oEvent.getSource().removeSelections(true);
        },

        onSave: function () {
          const entityID = this.getView().getModel("selected").getProperty("/entityID");
          var data = this.getOwnerComponent().getModel("entities").getData().value;
          let foundNode = utility.findInTree(entityID, data);
          foundNode = this.getView().getModel("selected").getData();
          this.getOwnerComponent().getModel("entities").setData({value: data});
        },

        onPressDetailBack: function (oEvent) {
          this.getSplitAppObj().backDetail();
        },
        
        moveItemInTree: function (oEvent, sDirection) {
            var oButton = oEvent.getSource();
            var oTree = this.byId("myTree");
            var oModel = oButton.getParent().getModel();
            var aData = oModel.getData();

            // Get the context of the button to find the current item
            var oContext = oButton.getBindingContext();
            var sPath = oContext.getPath();

            // Calculate the index from the path
            var nIndex = parseInt(sPath.split("/").pop(), 10);

            if ((sDirection == 1 && nIndex >= 1) || (sDirection == -1 && nIndex <= aData.length - 1)) {
                // Find the parent path
                var sParentPath = sPath.substring(0, sPath.lastIndexOf('/'));
                var aParentData = sParentPath ? oModel.getProperty(sParentPath) : aData;

                // Swap the items
                var temp = aParentData[nIndex - sDirection];
                aParentData[nIndex - sDirection] = aParentData[nIndex];
                aParentData[nIndex] = temp;
        
                // Refresh the model to update the tree
                oModel.refresh();
            }
        },

        treeItemUpPress: function (oEvent) { 
            this.moveItemInTree(oEvent, 1);
        },

        treeItemDownPress: function (oEvent) { 
            this.moveItemInTree(oEvent, -1);
        },

        onDragStart: function(oEvent) {
          var oTreeTable = this.byId("TreeTable");
          var oDragSession = oEvent.getParameter("dragSession");
          var oDraggedRow = oEvent.getParameter("target");
          var iDraggedRowIndex = oDraggedRow.getIndex();
          var aSelectedIndices = oTreeTable.getSelectedIndices();
          var aDraggedRowContexts = [];
    
          if (aSelectedIndices.length > 0) {
            // If rows are selected, do not allow to start dragging from a row which is not selected.
            if (aSelectedIndices.indexOf(iDraggedRowIndex) === -1) {
              oEvent.preventDefault();
            } else {
              for (var i = 0; i < aSelectedIndices.length; i++) {
                aDraggedRowContexts.push(oTreeTable.getContextByIndex(aSelectedIndices[i]));
              }
            }
          } else {
            aDraggedRowContexts.push(oTreeTable.getContextByIndex(iDraggedRowIndex));
          }
    
          oDragSession.setComplexData("hierarchymaintenance", {
            draggedRowContexts: aDraggedRowContexts
          });
        },
    
        onDrop: function(oEvent) {
          var oTreeTable = this.byId("TreeTable");
          var oDragSession = oEvent.getParameter("dragSession");
          var oDroppedRow = oEvent.getParameter("droppedControl");
          var aDraggedRowContexts = oDragSession.getComplexData("hierarchymaintenance").draggedRowContexts;
          var oNewParentContext = oTreeTable.getContextByIndex(oDroppedRow.getIndex());
    
          if (aDraggedRowContexts.length === 0 || !oNewParentContext) {
            return;
          }
    
          var oModel = oTreeTable.getBinding().getModel();
          var oNewParent = oNewParentContext.getProperty();
    
          // In the JSON data of this example the children of a node are inside an array with the name "categories".
          if (!oNewParent.nodes) {
            oNewParent.nodes = []; // Initialize the children array.
          }
          var shouldExpand = false;
          for (var i = 0; i < aDraggedRowContexts.length; i++) {
            if (oNewParentContext.getPath().indexOf(aDraggedRowContexts[i].getPath()) === 0) {
              // Avoid moving a node into one of its child nodes.
              continue;
            }
    
            // Copy the data to the new parent.
            console.log(aDraggedRowContexts[i].getPath())
            oNewParent.nodes.push(aDraggedRowContexts[i].getProperty());
    
            // Remove the data. The property is simply set to undefined to preserve the tree state (expand/collapse states of nodes).
            oModel.setProperty(aDraggedRowContexts[i].getPath(), undefined, aDraggedRowContexts[i], true);

            shouldExpand = true;
          }
          
          if(shouldExpand) {
            oTreeTable.expand(oDroppedRow.getIndex());
          }
          
        },

        getSplitAppObj: function () {
          var result = this.byId("SplitApp");
          if (!result) {
            Log.info("SplitApp object can't be found");
          }
          return result;
        }
      });
    }
  );
  