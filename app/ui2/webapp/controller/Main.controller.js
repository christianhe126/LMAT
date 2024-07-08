sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "../model/utility"
    ],
    function(BaseController, JSONModel, MessageBox, utility) {
      "use strict";
  
      return BaseController.extend("ui.controller.Main", {
        onInit : function (evt) {
			
          var oModel = new JSONModel("./model/Tree.json");
          this.getView().setModel(oModel);

          // var oTree = this.byId("Tree");
          // oTree.setMode("MultiSelect");
		    },
        exportPressed: function() {
                fetch('http://localhost:3000/generate-ppt', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.getView().getModel().getData())})
                  .then(response => response.json())
                  .then(data => {
                    let blob = utility.base64ToBlob(data.base64, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
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

        onTreeCellClick: function (oEvent) {
          var oTable = this.byId("TreeTable");
          var iRowIndex = oEvent.getParameter("rowIndex");
          var iColumnIndex = oEvent.getParameter("cellControl").getParent().getIndex();
          var oRowContext = oEvent.getParameter("rowBindingContext");
      
          if (oRowContext) {
              var oRowData = oRowContext.getObject();
              var oModel = new JSONModel(oRowData);
              oModel.setProperty("/_id", iRowIndex)
              this.getView().setModel(oModel, "selected");
              this.getSplitAppObj().to(this.createId("detailDetail"));
          }
        },

        onSave: function () {
          const selectedID = this.getView().getModel("selected").getProperty("/id");
          var data = this.getView().getModel().getData();
          const index = this.getView().getModel().getData().findIndex(entry => entry.id === selectedID);
          if(index !== -1) {
            data[index] = this.getView().getModel("selected").getData();
          }
          this.getView().setModel(new JSONModel(data));
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
          if (!oNewParent.categories) {
            oNewParent.categories = []; // Initialize the children array.
          }
    
          for (var i = 0; i < aDraggedRowContexts.length; i++) {
            if (oNewParentContext.getPath().indexOf(aDraggedRowContexts[i].getPath()) === 0) {
              // Avoid moving a node into one of its child nodes.
              continue;
            }
    
            // Copy the data to the new parent.
            oNewParent.categories.push(aDraggedRowContexts[i].getProperty());
    
            // Remove the data. The property is simply set to undefined to preserve the tree state (expand/collapse states of nodes).
            oModel.setProperty(aDraggedRowContexts[i].getPath(), undefined, aDraggedRowContexts[i], true);
          }
        },
        getSplitAppObj: function () {
          var result = this.byId("SplitApp");
          if (!result) {
            Log.info("SplitApp object can't be found");
          }
          return result;
        }

        /*
        onDragStart : function (oEvent) {
          var oTree = this.byId("Tree");
          var oBinding = oTree.getBinding("items");
          var oDragSession = oEvent.getParameter("dragSession");
          var oDraggedItem = oEvent.getParameter("target");
          var iDraggedItemIndex = oTree.indexOfItem(oDraggedItem);
          var aSelectedIndices = oTree.getBinding("items").getSelectedIndices();
          var aSelectedItems = oTree.getSelectedItems();
          var aDraggedItemContexts = [];

          if (aSelectedItems.length > 0) {
            // If items are selected, do not allow to start dragging from a item which is not selected.
            if (aSelectedIndices.indexOf(iDraggedItemIndex) === -1) {
              oEvent.preventDefault();
            } else {
              for (var i = 0; i < aSelectedItems.length; i++) {
                aDraggedItemContexts.push(oBinding.getContextByIndex(aSelectedIndices[i]));
              }
            }
          } else {
            aDraggedItemContexts.push(oBinding.getContextByIndex(iDraggedItemIndex));
          }

          oDragSession.setComplexData("hierarchymaintenance", {
            draggedItemContexts: aDraggedItemContexts
          });
        },

        onDrop: function (oEvent) {
          var oTree = this.byId("Tree");
          var oBinding = oTree.getBinding("items");
          var oDragSession = oEvent.getParameter("dragSession");
          var oDroppedItem = oEvent.getParameter("droppedControl");
          var aDraggedItemContexts = oDragSession.getComplexData("hierarchymaintenance").draggedItemContexts;
          var iDroppedIndex = oTree.indexOfItem(oDroppedItem);
          var oNewParentContext = oBinding.getContextByIndex(iDroppedIndex);

          if (aDraggedItemContexts.length === 0 || !oNewParentContext) {
            return;
          }

          var oModel = oTree.getBinding("items").getModel();
          var oNewParent = oNewParentContext.getProperty();

          // In the JSON data of this example the children of a node are inside an array with the name "categories".
          if (!oNewParent.categories) {
            oNewParent.categories = []; // Initialize the children array.
          }

          for (var i = 0; i < aDraggedItemContexts.length; i++) {
            if (oNewParentContext.getPath().indexOf(aDraggedItemContexts[i].getPath()) === 0) {
              // Avoid moving a node into one of its child nodes.
              continue;
            }

            // Copy the data to the new parent.
            oNewParent.categories.push(aDraggedItemContexts[i].getProperty());

            // Remove the data. The property is simply set to undefined to preserve the tree state (expand/collapse states of nodes).
            oModel.setProperty(aDraggedItemContexts[i].getPath(), undefined, aDraggedItemContexts[i], true);
          }
        }
        */

      });
    }
  );
  