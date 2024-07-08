const { SELECT } = cds;
const { json } = require("body-parser");
const { spawn } = require('child_process');
const path = require('path');
//const pptxgen = require("pptxgenjs");
//const PPTX = require('nodejs-pptx');
//const officegen = require('officegen');
const fs = require('fs');
//const PPTXCompose = require('pptx-compose').default;

function call_python(req, scriptPath) {
    return new Promise((resolve, reject) => {
        const pythonExecPath = path.join(__dirname, '..', 'scripts', 'venv1', 'bin', 'python3');
        const pythonProcess = spawn(pythonExecPath, ['-u', scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
        let dataString = '';

        pythonProcess.stdin.write(JSON.stringify(req.data));
        pythonProcess.stdin.end();

        pythonProcess.stdout.on('data', (data) => {
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


module.exports = cds.service.impl(async function() {
    const {document, entities, contents, contentTypes, automations } = this.entities;

    this.on('export', async (req) => {
        const {documentID, fileFormat} = req.data;
        if(fileFormat && fileFormat === 'pptx') {
            try {
                const _document = await SELECT.from(document).where({document_ID: documentID});
                const _entities = _document[0].entities;
                //req.data.entityData = entities;
                //req.data.automationData = ;
                console.log(_entities)

            } 
            catch (error) {
                console.error('Error:', error);
                req.error({ code: '500', message: 'Internal Server Error' });
            }
        } 
    });

    this.on('generate_ppt', async (req) => {
        //req
        return call_python(req, path.join(__dirname, '..', 'scripts', 'exportPPTX.py'));
        const base64String = await fileToBase64("resources/final.pptx")
        return base64String;
        
    });

    this.on('import_ppt', async (req) => {
        try {
            const data = await call_python(req, path.join(__dirname, '..', 'scripts', 'importPPTX.py'));
            return JSON.stringify(data);
        }
        catch (error) {
            console.error('Error:', error);
            req.error({ code: '500', message: 'Internal Server Error' });
        }
    });
});