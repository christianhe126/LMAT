const cds = require('@sap/cds');
const https = require('https');
const puppeteer = require('puppeteer');
const path = require('path');
const { parse } = require('node-html-parser');
const { spawn } = require('child_process');
const fs = require('fs');
const { title } = require('process');
const { v4: uuidv4 } = require('uuid');

module.exports = cds.service.impl(async function() {
    const {document, entities, contents, contentTypes, automations } = this.entities;

    this.before('CREATE', entities, async (req) => {
        const maxEntityId = await getMaxId("entityID", entities, req);
        req.data.entityID = `E${(maxEntityId + 1).toString().padStart(3, '0')}`;
    });

    this.after('CREATE', entities, async (req) => {
        console.log("CREATE")
        await cds.run(UPDATE(entities));
    });

    this.on('updateDocument', async (req) => {
        const tx = cds.transaction(req);
        if(!req.data.source || !req.data.documentID)
            return;

        var documentID = req.data.documentID;
        var source = req.data.source;


        await tx.run(DELETE.from(entities))

        const root = parse(source);
        var entityData = {};
        
        var batch = [];
        var entityID = "";
        var maxEntityId = await getMaxId("entityID", entities, req);
        for(const child of root.childNodes.filter(node => node.nodeType === 1)) {
            if(child.tagName === "H1")
            {
                maxEntityId++;
                entityID = `E${(maxEntityId).toString().padStart(3, '0')}`;

                entityData = {
                    document_documentID: documentID,
                    entityID: entityID,
                    title: child.innerHTML,
                    source: child.innerHTML,
                    parentNodeID: null,
                    hierarchyLevel: 0,
                    drillState: "expanded",
                    order: maxEntityId,
                };
                batch.push(entityData);
            }
            /*else
            {
                if(entityID === "")
                    break;

                //var maxEntityId = await getMaxId("entityID", entities, req);
                //childEntityID = `E${(maxEntityId + 1).toString().padStart(3, '0')}`;
                childEntityID = uuidv4();

                entityData = {
                    document_documentID: documentID,
                    entityID: childEntityID,
                    title: child.innerHTML,
                    source: child.innerHTML,
                    parentNodeID: entityID,
                    hierarchyLevel: 1,
                    drillState: "leaf",
                    order: 0,
                };
                
            }*/

            
        };

        console.log(batch);
        try {
            if(batch.length > 0) {
                await tx.run(INSERT.into(entities).entries(batch));
                return batch;
            }
        }
        catch (error) {
            console.log(error.message)
            await tx.rollback();
            req.error(500, `Error creating related contents: ${error.message}`);
        }
        

        
    });

    this.before('UPDATE2', entities, async (req) => {
        const tx = cds.transaction(req);
        if(!req.data.source)
            return;

        // Get Parameters
        var entityID = req.data.entityID;
        var source = req.data.source;
        var documentID = (await tx.run(SELECT.from(entities).where({ entityID: entityID })))[0].document_documentID;

        // Delete all children first
        await DELETE.from(entities)
                .where({ hierarchyLevel: 0});

        // Add children according to html structure
        const root = parse(source);
        var entityData = {};
        var prepared = false;
        var parentID = "";
        for(const child of root.childNodes.filter(node => node.nodeType === 1)) {
            if(child.tagName === "H1")
            {
                var maxEntityId = await getMaxId("entityID", entities, req);
                parentID = `E${(maxEntityId + 1).toString().padStart(3, '0')}`;

                entityData = {
                    document_documentID: documentID,
                    entityID: parentID,
                    title: child.innerHTML,
                    source: "",
                    parentNodeID: null,//entityID,
                    hierarchyLevel: 0,
                    drillState: "expanded",
                    order: maxEntityId,
                };

                try {
                    await tx.run(INSERT.into(entities).entries(entityData));
                }
                catch (error) {
                    console.log(error.message)
                    await tx.rollback();
                    req.error(500, `Error creating related contents: ${error.message}`);
                }
            }
            else
            {
                if(parentID === "")
                    break;

                var maxEntityId = await getMaxId("entityID", entities, req);
                const childEntityID = `E${(maxEntityId + 1).toString().padStart(3, '0')}`;

                entityData = {
                    document_documentID: documentID,
                    entityID: childEntityID,
                    title: child.innerHTML,
                    source: "",
                    parentNodeID: parentID,//entityID,
                    hierarchyLevel: 1,
                    drillState: "leaf",
                    order: maxEntityId,
                };

                try {
                    await tx.run(INSERT.into(entities).entries(entityData));
                }
                catch (error) {
                    console.log(error.message)
                    await tx.rollback();
                    req.error(500, `Error creating related contents: ${error.message}`);
                }
            }
        };

        if(prepared) {
            try {
                await tx.run(INSERT.into(entities).entries(entityData));
            }
            catch (error) {
                console.log(error.message)
                await tx.rollback();
                req.error(500, `Error creating related contents: ${error.message}`);
            }
        }
    });

    this.before('UPDATE', document, async (req) => {
        const tx = cds.transaction(req);
        if(!req.data.source)
            return;

        // Clean text first
        req.data.source = req.data.source.replace(/<\/?div>/gi, "")

        // Get Parameters
        //var entityID = req.data.entityID;
        var source = req.data.source;
        var documentID = req.data.documentID;

        // Delete all children first
        await DELETE.from(entities)
                .where({ hierarchyLevel: 0});

        // Add children according to html structure
        const root = parse(source);

        var maxEntityId = await getMaxId("entityID", entities, req);

        const h1Tags = root.querySelectorAll('h1');
        if(h1Tags.length === 0)
        {
            h1Tags.push({innerHTML: 'Add a "heading 1" to start'});
        }

        h1Tags.forEach(async (element, index) => {
            const innerHTML = element.innerHTML;
            maxEntityId++;
            const childEntityID = `E${(maxEntityId).toString().padStart(3, '0')}`;

            entityData = {
                document_documentID: documentID,
                entityID: childEntityID,
                title: innerHTML,
                source: innerHTML,
                parentNodeID: null,//entityID,
                hierarchyLevel: 0,
                drillState: "leaf",
                order: maxEntityId,
            };
            try {
                await tx.run(INSERT.into(entities).entries(entityData));
            }
            catch (error) {
                console.log(error.message)
                await tx.rollback();
                req.error(500, `Error creating related contents: ${error.message}`);
            }
        });

        return;
        var entityData = {};
        var prepared = false;
        for(const child of root.childNodes.filter(node => node.nodeType === 1)) {
            console.log(child.tagName);
            if(child.tagName === "H1")
            {
                console.log("H1");
                if(prepared) {
                    try {
                        await tx.run(INSERT.into(entities).entries(entityData));
                    }
                    catch (error) {
                        console.log(error.message)
                        await tx.rollback();
                        req.error(500, `Error creating related contents: ${error.message}`);
                    }
                    prepared = false;
                }

                var maxEntityId = await getMaxId("entityID", entities, req);
                const childEntityID = `E${(maxEntityId + 1).toString().padStart(3, '0')}`;

                entityData = {
                    document_documentID: documentID,
                    entityID: childEntityID,
                    title: child.innerHTML,
                    source: "",
                    parentNodeID: null,//entityID,
                    hierarchyLevel: 0,
                    drillState: "leaf",
                    order: maxEntityId,
                };

                prepared = true;
            }
            else
            {
                if(Object.keys(entityData).length === 0)
                {
                    var maxEntityId = await getMaxId("entityID", entities, req);
                    const childEntityID = `E${(maxEntityId + 1).toString().padStart(3, '0')}`;
                    entityData = {
                        document_documentID: documentID,
                        entityID: childEntityID,
                        title: "[No Title]",
                        source: "",
                        parentNodeID: null,//entityID,
                        hierarchyLevel: 0,
                        drillState: "leaf",
                        order: maxEntityId,
                    };
                    prepared = true;
                }
                entityData.source += child.outerHTML;
            }
        };

        if(prepared) {
            try {
                await tx.run(INSERT.into(entities).entries(entityData));
            }
            catch (error) {
                console.log(error.message)
                await tx.rollback();
                req.error(500, `Error creating related contents: ${error.message}`);
            }
        }
    });

    this.on('createDocument', async (req) => {
        const { documentName } = req.data;

        const maxDocumentId = await getMaxId("documentID", document, req);
        const documentID = `P${(maxDocumentId + 1).toString().padStart(3, '0')}`;
        const maxEntityId = await getMaxId("entityID", entities, req);
        const entityID = `E${(maxEntityId + 1).toString().padStart(3, '0')}`;

        const documentData = {
            documentID: documentID,
            name: documentName,
            mainEntity: entityID,
            source: '<H1>Heading 1</H1><p>Each heading represents a slide. Change it to start.</p>'
        };

        try {
            await cds.run(INSERT.into(document).entries(documentData));
            return { success: true, message: "Document created successfully" };
        }
        catch (error) {
            return req.reject(500, `Failed to create document: ${error.message}`);
        }
    });

    this.on('createEntry', async (req) => {
        const tx = cds.transaction(req);

        // Content Data
        if(!req.data.contentID)
        {
            const maxContentID = await getMaxId("contentID", contents, req);
            req.data.contentID = `C${(maxContentID + 1).toString().padStart(3, '0')}`;
            
            const contentData = {
                contentID: req.data.contentID,
                source: req.data.source,
                contentType_contentTypeID: req.data.contentTypeID
            };

            try {
                await tx.run(INSERT.into(contents).entries(contentData));
            }
            catch (error) {
                console.log(error.message);
                req.error(500, `Error creating related contents: ${error.message}`);
            }
        }
        else {
            await tx.run(
                UPDATE(contents)
                    .set({ reused: true })
                    .where({ contentID: req.data.contentID })
            );
        }

        // Entity Data
        const maxEntityId = await getMaxId("entityID", entities, req);
        const entityID = `E${(maxEntityId + 1).toString().padStart(3, '0')}`;
    
        const entityData = {
            document_documentID: req.data.documentID,
            entityID: entityID,
            content_contentID: req.data.contentID,
            parentNodeID: req.data.parentNodeID ? req.data.parentNodeID : null,
            hierarchyLevel: req.data.hierarchyLevel ? req.data.hierarchyLevel : 0,
            drillState: req.data.drillState ? req.data.drillState : "leaf",
            order: maxEntityId,
            source: req.data.source,
            title: req.data.title
        }

        try {
            await tx.run(INSERT.into(entities).entries(entityData));
            await tx.run(UPDATE(entities).set({source: req.data.source}).where({ entityID: entityID }));
            await tx.commit();
            console.log("Created entry successfully")
            return entityID;
        }
        catch (error) {
            console.log(error.message)
            await tx.rollback();
            req.error(500, `Error creating related contents: ${error.message}`);
        }   
    });

    this.on('deleteEntry', async (req) => {
        const { entityID } = req.data;
        const tx = cds.transaction(req);
       
        try {
            await deleteEntityAndChildren(tx, entityID);
            
            await tx.commit();

            return { success: true, message: "Entity and its children deleted successfully" };
        } catch (error) {
            await tx.rollback();
            return req.reject(500, `Failed to delete entity and its children: ${error.message}`);
        }
    });

    async function deleteEntityAndChildren(tx, entityID) {
        // Fetch children of the current entity
        const children = await tx.run(
            SELECT.from(entities).where({ parentNodeID: entityID })
        );

        // Recursively delete each child
        for (const child of children) {
            console.log(`Deleting child entity with ID: ${child.entityID}`);
            await deleteEntityAndChildren(tx, child.entityID);
        }

        // Fetch the contentID associated with the given entityID
        const [entity] = await tx.run(
            SELECT.from(entities)
                .columns('content_contentID')
                .where({ entityID: entityID })
        );

        if (!entity) {
            console.log("Entity not found");
            return false;
        }

        const contentID = entity.content_contentID;

        const _contents = await tx.run(
            SELECT.from(entities).where({ content_contentID: contentID })
        );

        if (_contents.length === 2) {
            await tx.run(
                UPDATE(contents)
                    .set({ reused: null })
                    .where({ contentID: contentID })
            );
        } else if (_contents.length === 1) {
            await tx.run(
                DELETE.from(contents)
                    .where({ contentID: contentID })
            );
            console.log("Content deleted");
        }

        // Delete Entity anyway
        await tx.run(
            DELETE.from(entities)
                .where({ entityID: entityID })
        );
        console.log("Entity deleted");

        return true;
    }

    this.on('syncAllAutomations', async (req) => {
        try {
            const tx = cds.transaction(req);
            const _automations = await tx.run(SELECT.from(automations));
            const browser = await puppeteer.launch({ headless: false });
            const currentDate = new Date().toISOString();
            
            const automationPromises = _automations.map(async (automation) => {
                try {
                    const content = await SELECT.from(contents).where({ contentID: automation.content_contentID });
                    if (content.length === 0) {
                        return req.error(404, "Content not found");
                    }
                    const type = content[0].contentType_contentTypeID;

                    const result = await fetchAutomation(browser, automation, type);
                    console.log(result);
                    await UPDATE(automations).set({ result: result, lastUpdate: currentDate}).where({ content_contentID: automation.content_contentID, tag: automation.tag });
                    return "Success";
                } catch (error) {
                    console.log(error);
                    await UPDATE(automations).set({ result: "Could not retrieve data...",}).where({ content_contentID: automation.content_contentID, tag: automation.tag });
                    return req.error(400, error.message);
                }
            });
    
            const results = await Promise.all(automationPromises);
            console.log(results);
    
            await browser.close();
            return req.reply({ status: 200, message: "Success" });
        }
        catch (error) {
            console.log(error);
            return req.error(500, "Internal Server Error");
        }
    });

    this.on('syncAutomation', async (req) => {
        const tx = cds.transaction(req);
        let contentID = req.data.contentID;
        const currentDate = new Date().toISOString();
    
        if (!contentID) {
            return req.error(400, "Content ID is invalid");
        }
    
        try {
            const content = await SELECT.from(contents).where({ contentID: contentID });
            if (content.length === 0) {
                return req.error(404, "Content not found");
            }
    
            const type = content[0].contentType_contentTypeID;
            const browser = await puppeteer.launch({ headless: false });
            const _automations = await cds.run(SELECT.from(automations).where({ content_contentID: contentID }));
    
            const automationPromises = _automations.map(async (automation) => {
                try {
                    const result = await fetchAutomation(browser, automation, type);
                    console.log(result);
                    await UPDATE(automations).set({ result: result, lastUpdate: currentDate}).where({ content_contentID: contentID, tag: automation.tag });
                    return "Success";
                } catch (error) {
                    console.log(error);
                    await UPDATE(automations).set({ result: "Could not retrieve data...",}).where({ content_contentID: contentID, tag: automation.tag });
                    return req.error(400, error.message);
                }
            });
    
            const results = await Promise.all(automationPromises);
            console.log(results);
    
            await browser.close();
            return req.reply({ status: 200, message: "Success" });
    
        } catch (error) {
            console.log(error);
            return req.error(500, "Internal Server Error");
        }
    });

    this.on('export', async (req) => {
        // Prepare the request data
        const root = parse(req.data.html);
        const tags = root.querySelectorAll('img');

        for (const element of tags) {
            const src = element.getAttribute('src');
            if (/^(https?:\/\/[^\s/$.?#].[^\s]*)$/i.test(src)) {
                const base64Image = await downloadImageAsBase64(src);
                element.setAttribute('src', base64Image);
            }
        }
        req.data.html = root.toString();

        // Call the Python script
        try {
            return call_python(req, path.join(__dirname, '..', 'scripts', 'export.py'));
        } 
        catch (error) {
            console.error('Error:', error);
            req.error({ code: '500', message: 'Internal Server Error' });
        }
    });

    function downloadImageAsBase64(url) {
        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                let data = [];
                response.on('data', (chunk) => {
                    data.push(chunk);
                });
                response.on('end', () => {
                    let buffer = Buffer.concat(data);
                    let base64 = buffer.toString('base64');
                    let mimeType = response.headers['content-type'];
                    let base64Image = `data:${mimeType};base64,${base64}`;
                    resolve(base64Image);
                });
            }).on('error', (err) => {
                console.error('Error downloading the image:', err.message);
                reject(err);
            });
        });
    }

    function call_python(req, scriptPath) {
        return new Promise((resolve, reject) => {
            const pythonExecPath = path.join(__dirname, '..', 'scripts', 'venv1', 'bin', 'python3');
            const pythonProcess = spawn(pythonExecPath, ['-u', scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
            let dataString = '';
    
            pythonProcess.stdin.write(JSON.stringify(req.data));
            pythonProcess.stdin.end();
    
            pythonProcess.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
                dataString += data.toString();
            });
    
            pythonProcess.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
                reject(data.toString());
            });
    
            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        resolve(dataString);
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject(`Process exited with code: ${code}`);
                }
            });
        });
    }
    
    function fileToBase64(filePath) {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    const base64String = data.toString('base64');
                    resolve(base64String);
                }
            });
        });
    }

  async function fetchAutomation(browser, automation, type) {
    const page = await browser.newPage();
    try {
        await page.goto(automation.url, { waitUntil: 'networkidle0' });
        await page.setViewport({ width: 1920, height: 1080 });
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));

        if (type === "T002") {
            const result = await page.evaluate((sel) => {
                const element = document.querySelector(sel);
                return element ? element.innerText : null;
            }, automation.selector);

            if (!result) {
                return Promise.reject(new Error("Element not found or has no text."));
            }

            console.log(result);
            return result;
        } else if (type === "T004") {
            const element = await page.$(automation.selector);
            if (!element) {
                return Promise.reject(new Error("Element not found."));
            }

            const base64 = await element.screenshot({ encoding: 'base64' });
            console.log(base64);
            return base64;
        }

        return Promise.reject(new Error("Unsupported type"));
    } catch (error) {
        console.log(error);
        return Promise.reject(new Error(`${automation.tag}: ${error.message}`));
    } finally {
        await page.close();
    }
}

  this.on('getNewestContent', async (req) => {
    const { contentID } = req.data;

    // Query to find the content with the highest version for a given contentID
    const content = await cds.tx(req).run(
      SELECT.one.from(contents)
            .where({ contentID: contentID })
            .orderBy('version desc')
    );

    const contentType = await cds.tx(req).run(
        SELECT.one.from(contentTypes).where({ contentTypeID: content.contentType_contentTypeID })
    );

    if (contentType) {
        content.contentType = contentType;
    }

    if (!content) {
      req.error(404, `No content found with contentID ${contentID}`);
    }

    return content;
  });

  this.on('getChildren', async (req) => {
    const children = await cds.tx(req).run(
        SELECT.from(entities)
              .where({ parentNodeID: req.data.entityID })
    );
    return children;
  });
});

async function getMaxId(entityKey, entities, req) {
    const tx = cds.transaction(req);
    const [lastEntity] = await tx.run(
        SELECT.from(entities).orderBy({ [entityKey]: 'desc' }).limit(1)
    );
    return lastEntity ? parseInt(lastEntity[entityKey].slice(1)) : 0;
}