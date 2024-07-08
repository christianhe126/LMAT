namespace LMAT.db;
using { cuid } from '@sap/cds/common';

entity document{
    key documentID: String;
    name: String;
    entities: Composition of many entities on entities.document = $self;
    source: LargeString;
}

entity entities {
    // Key Attribute
    key entityID : String;

    // Foreign Keys
    document : Association to document;
    content : Association to contents;

    // Attributes
    parentNodeID : String;
    hierarchyLevel : Integer;
    drillState : String;
    order : Integer;

    source: LargeString;
    title: String;
}

entity contents {
    // Primary Key
    key contentID : String;

    // Foreign Keys
    contentType : Association to contentTypes;
    automations : Composition of many automations on automations.content = $self;

    // Attributes
    source : LargeString;
    reused : Boolean;
}

entity contentTypes {
    key contentTypeID : String;
    name : String; 
    description : String;
}

entity automations {
    key content : Association to contents;
    key tag : String;
    url : String;
    selector: String;
    result: String;
    lastUpdate: Timestamp;
}

entity resources {
    key resourceID : Integer; // unique ID - primary key
    contentTypeID : Association to contentTypes; //Association to ContentType;
    content : String; // content of the resource
    version : Integer; // version of the resource
    order : Integer; // order of the resource
}

