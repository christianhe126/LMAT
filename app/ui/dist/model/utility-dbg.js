sap.ui.define([
    
], function () {
    "use strict";

    var utility = {};

    utility.base64ToBlob = function (base64, contentType) {
        // Decode Base64 string to binary data
        const byteCharacters = atob(base64);
        const byteArrays = [];

        // Split data into chunks and convert to byte arrays
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        // Create a blob from the byte arrays
        const blob = new Blob(byteArrays, { type: contentType });
        return blob;
    }

    utility.findInTree = function (entityID, nodes) {
        for (let node of nodes) {
            if (node.entityID === entityID) {
                return node;  // Found the node
            }
            if (node.nodes) {
                let found = this.findInTree(entityID, node.nodes);
                if (found) {
                    return found;  // Node was found in children
                }
            }
        }
        return null;  // Node not found
    }

    utility.findHighestEntityID = function(data) {
        let highest = 0; // Initialize the highest entityID variable
    
        // Define a recursive function to traverse the structure
        function traverse(nodes) {
            nodes.forEach(node => {
                if (node && node.entityID > highest) { // Update highest if current node's entityID is larger
                    highest = node.entityID;
                }
                if (node && node.nodes) { // Recursively traverse if there are nested nodes
                    traverse(node.nodes);
                }
            });
        }
    
        traverse(data); // Start the traversal with the initial data
        return highest;
    }

    return utility;
});
