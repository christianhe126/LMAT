this.on('createEntry', async (req) => {

    // 1. Create Content (optional)
    if(!req.data.contentID) // Only performed when content is not already given as parameter (non-reuse case)
    {
        // Create a new Content and instantiate the req.data.contentID
        req.data.contentID = createNewContent(req.data.contentType)
    }

    // 2. Create Entity
    try {
        // Try to create a new entity with a reference to the given req.data.contentID
        const entityData = {
            entityID: entityID,
            contentID: req.data.contentID,
            ...
        }
        await cds.run(INSERT.into(entities).entries(entityData));
        return entityID;
    }
    catch (error) {
        req.error(500, `Error creating related contents: ${error.message}`);
    }   
});


const puppeteer = require('puppeteer');
...
this.on('getSyncedContent', async (req) => {
    var { type, url, selector } = req.data;
    type = content.contentType.name;
    url = content.url;
    selector = content.selector;

    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.setViewport({ width: 1920, height: 1080 });
    await page.evaluate(() => {
        return new Promise((resolve) => {
            setTimeout(resolve, 5000);
        });
    });

    if(type === "RichText")
    {
        const extractedContent = await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            return element ? element.innerText : 'Element not found';
        }, selector);
        content.source = extractedContent;
        console.log("this is the content", content)
        return content;
    }
    else if(type === "Image")
    {
        try {
            const element = await page.$(selector);
            if(element) {
                await element.screenshot({ path: 'public/screenshot.png' });
            }
        }
        catch (error) {
            console.log(error)
        }
    }
  });
const puppeteer = require('puppeteer');

async function fetchAutomation(automation) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(automation.url, { waitUntil: 'networkidle0' });
    await page.setViewport({ width: 1920, height: 1080 });
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));

    const result = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        return element ? element.innerText : null;
    }, automation.selector);

    return result;
}