using { LMAT.db as data } from '../db/schema';

service exportService @(path:'/export') {
  entity document as projection on data.document;
  entity entities as projection on data.entities;
  entity contents as projection on data.contents;
  entity contentTypes as projection on data.contentTypes;
  entity automations as projection on data.automations;

  action generate_ppt(entityData: String, automationData: String) returns LargeString;
  action export(documentID: String, fileFormat: String) returns LargeString;
  action import_ppt() returns LargeString;
}