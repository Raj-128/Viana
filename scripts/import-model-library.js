import { importModelLibrary } from '../server/model-library.js';
const result = await importModelLibrary();
console.log(JSON.stringify(result, null, 2));
if (result.unavailable) process.exitCode = 1;
