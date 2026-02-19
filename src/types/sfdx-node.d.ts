declare module 'sfdx-node' {
  const sfdx: {
    force: {
      apex: {
        execute(options: Record<string, any>): Promise<any>;
      };
      data: {
        soqlQuery(options: Record<string, any>): Promise<any>;
        bulkUpsert(options: Record<string, any>): Promise<any>;
        bulkDelete(options: Record<string, any>): Promise<any>;
        bulkStatus(options: Record<string, any>): Promise<any>;
      };
      schema: {
        sobjectDescribe(options: Record<string, any>): Promise<any>;
      };
    };
  };
  export = sfdx;
}
