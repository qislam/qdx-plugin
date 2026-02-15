import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import * as fs from 'node:fs';
import _ from 'lodash';

import { getAbsolutePath } from '../../utils/util.js';

export type SnippetResult = {
  message: string;
};

export class QdxSnippetCommand extends SfCommand<SnippetResult> {
  public static readonly summary = 'Convert code file to VSCode snippet.';
  public static readonly description = `Convert a code file into a VSCode code snippet and save it to the project's .vscode directory.`;

  public static readonly examples = [
    '<%= config.bin %> qdx snippet -a mySnippet -p src/myFile.cls',
  ];

  public static readonly flags = {
    alias: Flags.string({
      char: 'a',
      required: true,
      summary: 'Alias for the snippet.',
    }),
    path: Flags.string({
      char: 'p',
      required: true,
      summary: 'Path to file that needs to be converted to snippet.',
    }),
  };

  public async run(): Promise<SnippetResult> {
    const { flags } = await this.parse(QdxSnippetCommand);

    const flagAlias = flags.alias as string;
    const flagPath = flags.path as string;

    let qdxSnippets: Record<string, { prefix: string; body: string[] }>;

    this.spinner.start('STARTED');

    if (!fs.existsSync(getAbsolutePath('.vscode'))) {
      this.spinner.stop('snippet command can only be used in VSCode project.');
      return { message: 'Not a VSCode project' };
    }

    const snippetsPath = getAbsolutePath('.vscode/qdx.code-snippets');
    if (fs.existsSync(snippetsPath)) {
      qdxSnippets = JSON.parse(fs.readFileSync(snippetsPath, 'utf-8')) as Record<
        string,
        { prefix: string; body: string[] }
      >;
    } else {
      qdxSnippets = {};
    }

    const filePath = getAbsolutePath(flagPath);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content) content += '$0';
      const key = flagAlias ?? 'q1';
      const body = content.split('\n');
      _.remove(body, (line: string) => line.startsWith('//') || line.trim() === '');
      qdxSnippets[key] = {
        prefix: key,
        body,
      };
    } else {
      this.spinner.stop(flagPath + ' does not exist.');
      return { message: 'File does not exist' };
    }

    fs.writeFileSync(snippetsPath, JSON.stringify(qdxSnippets, null, 4), { encoding: 'utf-8' });
    this.spinner.stop('COMPLETED');

    return { message: 'Snippet created successfully' };
  }
}

export default QdxSnippetCommand;
