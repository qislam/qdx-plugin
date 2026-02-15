#!/usr/bin/env node

const { execute } = await import('@oclif/core');
await execute({ type: 'esm', dir: import.meta.url });
