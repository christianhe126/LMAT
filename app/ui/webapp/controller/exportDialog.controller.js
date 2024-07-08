sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/ComboBox",
    "sap/ui/core/Item",
    "../model/utility",
], function (Controller, JSONModel, Dialog, Button, Label, ComboBox, Item, utility) {
    "use strict";

    return Controller.extend("ui.controller.exportDialog", {

        onInit: function () {
            this.oDialogExport = this.byId("exportDialog");
            this.oModel = this.getView().getModel("myModel");
            var json = new JSONModel({fileFormats : ["CSV", "XLSX"], layouts : ["Layout 1", "Layout 2"]});
            this.getView().setModel(json);
        },

        open: function (_this) {
            this.oDialogExport.open();
            this.master = _this;
        },
        
        onFileChange: async function (oEvent) {
            var that = this;
            var reader = new FileReader();
            var file = oEvent.getParameter("files")[0];

            reader.onload = async function(e) {
                var raw = e.target.result;
                this.template = await utility.arrayBufferToBase64(raw);
                console.log("Template loaded...")
            }.bind(this);

            reader.onerror = function(e) {
                sap.m.MessageToast.show("error");
            };
            reader.readAsArrayBuffer(file);
        },

        onExport: async function () {
            console.log("Exporting...")
            var sFileFormat = this.byId("fileFormatComboBox").getSelectedKey();

            async function fetchUrl(url) {
                const response = await fetch(url)
                if(!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                const json = await response.json();
                return JSON.stringify(json);
            }

            /*
            const baseUrl = 'http://localhost:4004/browse/entities';
            const expandParams = '$expand=content($expand=contentType)';
            //const url = `${baseUrl}?${expandParams}`;
            const url = "http://localhost:4004/browse/document('" + this.master.documentID + "')?$expand=entities($expand=content($expand=contentType))";
            const entityData = await fetchUrl(url)
            const automationData = await fetchUrl("http://localhost:4004/browse/automations")*/

            var oModel = this.getView().getModel("myModel");
            var source_path = "/document('" + this.master.documentID + "')/source"
            oModel.read(source_path, {
                success: async function (oRowData, oResponse) { 
                    await oModel.callFunction("/export", {
                        method: "POST",
                        urlParameters: {html: oRowData.source, fileFormat: sFileFormat, template: this.template},
                        success: function (base64String) {
                            let blob = utility.base64ToBlob(base64String.export, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
                            
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                                a.href = url;
                                a.download = (this.master.name ? this.master.name : "Presentation") + sFileFormat;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                        }.bind(this),
                        error: function (error) {
                            console.log(error)
                        }
                    })
                    this.byId("exportDialog").close();
                }.bind(this),
                error: function (oError) {
                    console.error("Error while reading data", oError);
                }
            })
        },

        onCancel: function () {
            this.byId("exportDialog").close();
        },

        onDialogClose: function () {
            this.template = null;
            this.byId("fileUploader").clear();
            // Clean up if necessary
        }
    });
});
