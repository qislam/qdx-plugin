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

export type ExclusionsMap = Record<string, string[] | string>;
export type YamlBody = Record<string, string[] | string | ExclusionsMap>;

export function yaml2xml(featureYAML: YamlBody, xmlVersion: string): XmlDocument {
  // Build exclusions map: metadata type -> 'all' (whole type excluded) or Set of member names
  const exclusions = new Map<string, 'all' | Set<string>>();
  const exclusionsRaw = featureYAML.Exclusions as ExclusionsMap | undefined;
  if (exclusionsRaw && typeof exclusionsRaw === 'object' && !Array.isArray(exclusionsRaw)) {
    for (const type in exclusionsRaw) {
      const value = exclusionsRaw[type];
      if (value === '*' || (Array.isArray(value) && value.length === 0)) {
        exclusions.set(type, 'all');
      } else if (Array.isArray(value)) {
        exclusions.set(type, new Set(value));
      } else if (typeof value === 'string') {
        exclusions.set(type, new Set([value]));
      }
    }
  }

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
    if (metadataType === 'ManualSteps' || metadataType === 'Version' || metadataType === 'Exclusions') continue;
    const exclusion = exclusions.get(metadataType);
    if (exclusion === 'all') continue;

    const typesElement: XmlElement = {
      type: 'element',
      name: 'types',
      elements: [],
    };

    const rawMembers = featureYAML[metadataType] as string[] | string;
    const members =
      Array.isArray(rawMembers) && exclusion instanceof Set
        ? rawMembers.filter((m) => !exclusion.has(m))
        : rawMembers;

    if (Array.isArray(rawMembers) && exclusion instanceof Set && (members as string[]).length === 0) {
      // All listed members were excluded — skip emitting this types block entirely
      continue;
    }

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
