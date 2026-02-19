export interface dxOptions {
  targetusername?: string;
  path?: string;
  apexcodefile?: string;
  query?: string;
  [key: string]: any;
}

export interface looseObject {
  [key: string]: any;
}

export interface tranformationFunction {
  (lines: looseObject[]): looseObject[];
}

export interface migrationStep {
  name: string;
  description?: string;
  query?: string;
  skip?: boolean;
  transformation?: tranformationFunction;
  [key: string]: any;
}
