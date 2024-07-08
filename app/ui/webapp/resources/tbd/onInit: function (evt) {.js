onInit: function (evt) {
    this.getOwnerComponent().getRouter().getRoute("entityDetails")
        .attachPatternMatched(this._onRouteMatched, this);
}

_onRouteMatched: async function (oEvent) {
    this._entityID = oEvent.getParameter("arguments").entityID;
    var sPath = "/entities('" + this._entityID + "')";
    this.getView().bindElement(sPath);
}