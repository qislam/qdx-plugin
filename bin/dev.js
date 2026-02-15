#!/usr/bin/env node

const { execute } = await import('@oclif/core');
await execute({ type: 'esm', development: true, dir: import.meta.url });
