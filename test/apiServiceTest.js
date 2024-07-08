const cds = require('@sap/cds');
const { expect } = require('chai');

describe('apiService Tests', function() {
  this.timeout(10000); // Set timeout to 10 seconds

  let app;

  before(async () => {
    // Deploy the database schema and data
    //await cds.deploy(__dirname + '/../db').to('sqlite::memory:');
    await cds.deploy(__dirname + '/../db').to('sqlite::memory:');

    
    // Serve the service
    app = await cds.serve('apiService').in(__dirname + '/../srv');
    //service = await cds.serve('apiService');

  });

  it('should return a list of documents', async () => {
    const { data } = await cds.test(app).get('/browse/document');
    expect(data.value).to.be.an('array');
  });

  it('should return a specific document by ID', async () => {
    const { data } = await cds.test(app).get('/browse/document(documentID=1)');
    expect(data).to.have.property('documentID', 1);
  });

  it('should return a list of entities', async () => {
    const { data } = await cds.test(app).get('/browse/entities');
    expect(data.value).to.be.an('array');
  });

  it('should return a specific entity by ID', async () => {
    const { data } = await cds.test(app).get('/browse/entities(entityID=\'entity1\')');
    expect(data).to.have.property('entityID', 'entity1');
  });

  it('should return a list of contents', async () => {
    const { data } = await cds.test(app).get('/browse/contents');
    expect(data.value).to.be.an('array');
  });

  it('should return a specific content by ID', async () => {
    const { data } = await cds.test(app).get('/browse/contents(contentID=\'content1\')');
    expect(data).to.have.property('contentID', 'content1');
  });

  it('should return a list of contentTypes', async () => {
    const { data } = await cds.test(app).get('/browse/contentTypes');
    expect(data.value).to.be.an('array');
  });

  it('should return a list of automations', async () => {
    const { data } = await cds.test(app).get('/browse/automations');
    expect(data.value).to.be.an('array');
  });
});
