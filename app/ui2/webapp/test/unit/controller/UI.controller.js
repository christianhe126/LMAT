/*global QUnit*/

sap.ui.define([
	"ui/controller/UI.controller"
], function (Controller) {
	"use strict";

	QUnit.module("UI Controller");

	QUnit.test("I should test the UI controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
