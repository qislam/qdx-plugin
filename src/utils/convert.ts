export interface XmlElement {
  type: string;
  name?: string;
  text?: string;
  attributes?: Record<string, string>;
  elements?: XmlElement[];
}

export interface XmlDocument {
  declaration: {
    attributes: Record<string, string>;
  };
  elements: XmlElement[];
}

export type YamlBody = Record<string, string[] | string>;

export function yaml2xml(featureYAML: YamlBody, xmlVersion: string): XmlDocument {
  const featureXML: XmlDocument = {
    declaration: {
      attributes: {
        version: '1.0',
        encoding: 'UTF-8',
      },
    },
    elements: [
      {
        type: 'element',
        name: 'Package',
        attributes: {
          xmlns: 'http://soap.sforce.com/2006/04/metadata',
        },
        elements: [],
      },
    ],
  };

  for (const metadataType in featureYAML) {
    if (metadataType === 'ManualSteps' || metadataType === 'Version') continue;
    const typesElement: XmlElement = {
      type: 'element',
      name: 'types',
      elements: [],
    };

    const members = featureYAML[metadataType];
    if (Array.isArray(members) && members.length > 0) {
      for (const metadataName of members) {
        typesElement.elements!.push({
          type: 'element',
          name: 'members',
          elements: [
            {
              type: 'text',
              text: metadataName,
            },
          ],
        });
      }
      typesElement.elements!.push({
        type: 'element',
        name: 'name',
        elements: [
          {
            type: 'text',
            text: metadataType,
          },
        ],
      });
    } else {
      typesElement.elements!.push({
        type: 'element',
        name: 'members',
        elements: [
          {
            type: 'text',
            text: '*',
          },
        ],
      });
      typesElement.elements!.push({
        type: 'element',
        name: 'name',
        elements: [
          {
            type: 'text',
            text: metadataType,
          },
        ],
      });
    }

    featureXML.elements[0].elements!.push(typesElement);
  }

  featureXML.elements[0].elements!.push({
    type: 'element',
    name: 'version',
    elements: [
      {
        type: 'text',
        text: xmlVersion,
      },
    ],
  });

  return featureXML;
}
