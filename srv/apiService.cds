using { LMAT.db as data } from '../db/schema';

service apiService @(path:'/browse') {

    // Entities
    entity document as projection on data.document;
    entity entities as projection on data.entities;
    entity contents as projection on data.contents;
    entity contentTypes as projection on data.contentTypes;
    entity automations as projection on data.automations;

    // GET
    action getChildren(entityID: String) returns array of entities;

    // POST
    action createDocument(documentName: String) returns String;
    action updateDocument(documentID: String, source: String) returns String;
    action createEntry(source: String, title: String, contentTypeID: String, parentNodeID: String, drillState: String, hierarchyLevel: Integer, contentID: String, documentID: String) returns String;
    action deleteEntry(entityID: String) returns String;
    action syncAutomation(contentID: String ) returns String;
    action syncAllAutomations() returns String;
    action export(html: String, automations: String, fileFormat: LargeString, template: LargeString) returns LargeString;
}
