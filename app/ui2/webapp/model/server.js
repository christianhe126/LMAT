import PptxGenJS from 'pptxgenjs';

function createPresentation() {
  let pptx = new PptxGenJS();

  // Create a slide
  let slide = pptx.addSlide();
  slide.addText('Hello World!', { x: 1.5, y: 1.5, fontSize: 18, color: '363636' });

  // Save the presentation
  let fileName = 'MyPresentation.pptx';
  pptx.writeFile({ fileName: fileName });

  // Trigger download
  let downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(new Blob([pptx.toBuffer()], { type: 'application/octet-stream' }));
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

/*
sap.ui.define([
    "pptxgenjs"
], function (PptxGenJS) {
    "use strict";

    return {
        generatePPT: function () {
            var pptx = new PptxGenJS();

            var slide = pptx.addSlide();
            slide.addText('Hello World!', { x: 1.5, y: 1.5, fontSize: 18, color: '363636' });

            pptx.writeFile({ fileName: 'MyPresentation.pptx' }).then(function () {
                sap.m.MessageToast.show("Presentation downloaded!");
            });
        }
    };
});

//window.createPresentation = createPresentation;
*/
