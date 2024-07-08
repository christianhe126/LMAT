const PptxGenJS = require('pptxgenjs');
const xml2js = require('xml2js');

function createPresentation() {
  let pptx = new PptxGenJS();

  // Create a slide
  let slide = pptx.addSlide();
  slide.addText('Hello World!', { x: 1.5, y: 1.5, fontSize: 18, color: '363636' });

  // Save the presentation
  var base64 = pptx.write("base64");

  return { base64: base64 };
}

function createPresentationFromXML(xmlData) {
    // Create a new presentation
    let pptx = new PptxGenJS();

    xml2js.parseString(xmlData, (err, result) => {
        if (err) throw err;
        
        // Set presentation title (optional, not a slide)
        let presentationTitle = result.Presentation.Title[0];
        pptx.title = presentationTitle;

        //let slide = pptx.addSlide();
        //slide.addText('Hello World!', { x: 1.5, y: 1.5, fontSize: 18, color: '363636' });

        // Add slides from XML
        result.Presentation.Slides[0].Slide.forEach(slide => {
            let pptxSlide = pptx.addSlide();
            if (slide.Title) {
                //pptxSlide.addTitle(slide.Title[0]);
            }
            if (slide.Subtitle) {
                pptxSlide.addText(slide.Subtitle[0], { x: 1.5, y: 1.5, fontSize: 18 });
            }
            if (slide.Header) {
                pptxSlide.addText(slide.Header[0], { x: 1, y: 1, fontSize: 24, bold: true });
            }
            if (slide.Body) {
                pptxSlide.addText(slide.Body[0], { x: 1, y: 2, fontSize: 18 });
            }
            if (slide.Points) {
                let points = slide.Points[0].Point.map(point => ({ text: point }));
                pptxSlide.addText(points, { x: 1.5, y: 3, fontSize: 18, bullet: true });
            }
        });
        
    }); 
    return pptx.write("base64");
  }

module.exports = { createPresentation, createPresentationFromXML };