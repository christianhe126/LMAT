sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../../model/formatter"
], function (Controller, formatter) {
    "use strict";
    
    return Controller.extend("ui.controller.contents.image", {
        formatter: formatter,

        onInit: function () {

        },
                // Image
                onFileChange: function (oEvent) {
                    var oFile = oEvent.getParameter("files")[0];
                    if (oFile) {
                        var reader = new FileReader();
        
                        reader.onload = function (e) {
                            var base64 = e.target.result;
                            var image = this.getView().byId("myImage")
                            image.setSrc(base64);
                            this._uploadImage(base64);
                        }.bind(this);
        
                        reader.readAsDataURL(oFile);
                    }
                },
        
                onUploadPress: function () {
                    var oFileUploader = this.getView().byId("fileUploader");
                    oFileUploader.getFocusDomRef().click();
                },
        
                _uploadImage: async function (base64) {
                    var contentID = this.getView().getBindingContext().getObject().content_contentID;
                    var sPath = "/contents('" + contentID + "')/source";
        
                    var oModel = this.getView().getModel("myModel");
                    oModel.setProperty(sPath, base64);
                    await this.getView().getModel("myModel").submitChanges();
                }
    });
});